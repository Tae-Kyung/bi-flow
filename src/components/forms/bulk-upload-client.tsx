"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TEMPLATE_COLUMNS,
  TEMPLATE_SAMPLE_DATA,
  mapHeaders,
  getMissingColumns,
  validateRow,
  markFileDuplicates,
  markDbDuplicates,
} from "@/lib/bulk-upload";
import type { ParsedRow } from "@/lib/bulk-upload";
import {
  getExistingBizNumbers,
  bulkCreateCompanies,
} from "@/actions/companies";
import type { Organization } from "@/types";
import { Upload, Download, FileSpreadsheet, ArrowLeft, Check, X } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const DB_TO_KOREAN: Record<string, string> = {
  name: "기업명",
  biz_number: "사업자번호",
  corporate_type: "구분",
  representative: "대표자",
  founding_date: "설립일",
  business_description: "사업내용",
  main_products: "주생산품",
  phone: "연락처",
  email: "이메일",
  address: "주소",
};

// Preview table에 표시할 주요 컬럼
const DATA_COLUMNS = [
  "name",
  "biz_number",
  "corporate_type",
  "representative",
  "founding_date",
  "business_description",
  "main_products",
  "phone",
  "email",
  "address",
] as const;

interface Props {
  organizations?: Organization[];
  showOrgSelect?: boolean;
  defaultOrgId?: string;
}

export function BulkUploadClient({
  organizations,
  showOrgSelect,
  defaultOrgId,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orgId, setOrgId] = useState(defaultOrgId || "");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const validRows = rows.filter(
    (r) => Object.keys(r.errors).length === 0 && !r.isDuplicate
  );
  const errorRows = rows.filter(
    (r) => Object.keys(r.errors).length > 0 || r.isDuplicate
  );
  const selectedRows = rows.filter((r) => r.isSelected);

  // Download template Excel with sample data
  const handleDownloadTemplate = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_COLUMNS,
      ...TEMPLATE_SAMPLE_DATA,
    ]);
    // Set column widths
    ws["!cols"] = TEMPLATE_COLUMNS.map((col) => ({
      wch: col === "주소" ? 30 : col === "주요사업내용" ? 25 : col === "이메일" || col === "담당자 이메일" || col === "홈페이지" ? 28 : 16,
    }));
    XLSX.utils.book_append_sheet(wb, ws, "기업목록");
    XLSX.writeFile(wb, "기업_일괄등록_템플릿.xlsx");
  }, []);

  // Parse uploaded file
  const handleFile = useCallback(
    async (file: File) => {
      const targetOrgId = orgId;
      if (showOrgSelect && !targetOrgId) {
        toast.error("기관을 먼저 선택해주세요.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error("파일 크기가 5MB를 초과합니다.");
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
        toast.error("Excel(.xlsx) 또는 CSV 파일만 지원합니다.");
        return;
      }

      setLoading(true);
      setFileName(file.name);

      try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        if (jsonData.length === 0) {
          toast.error("파일에 데이터가 없습니다.");
          setLoading(false);
          return;
        }

        // Check required columns
        const fileHeaders = Object.keys(jsonData[0]);
        const missing = getMissingColumns(fileHeaders);
        if (missing.length > 0) {
          toast.error(`필수 열이 누락되었습니다: ${missing.join(", ")}`);
          setLoading(false);
          return;
        }

        // Map and validate rows
        const parsed: ParsedRow[] = jsonData.map((raw, i) => {
          const mapped = mapHeaders(raw);
          const { parsed: validData, errors } = validateRow(mapped);
          const hasErrors = Object.keys(errors).length > 0;
          return {
            rowNumber: i + 2, // Excel rows start at 1, +1 for header
            data: mapped,
            parsed: validData,
            errors,
            isDuplicate: false,
            isSelected: !hasErrors,
          };
        });

        // Check file-internal duplicates
        markFileDuplicates(parsed);

        // Check DB duplicates
        const effectiveOrgId = targetOrgId || defaultOrgId || "";
        if (effectiveOrgId) {
          try {
            const existing = await getExistingBizNumbers(effectiveOrgId);
            markDbDuplicates(parsed, new Set(existing));
          } catch {
            toast.error("기존 사업자등록번호 확인 중 오류가 발생했습니다.");
          }
        }

        setRows(parsed);
        setStep("preview");
      } catch {
        toast.error("파일을 읽는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [orgId, showOrgSelect, defaultOrgId]
  );

  // File input handler
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [handleFile]
  );

  // Drag and drop handlers
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Toggle row selection
  const toggleRow = useCallback((rowNumber: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.rowNumber === rowNumber && Object.keys(r.errors).length === 0 && !r.isDuplicate
          ? { ...r, isSelected: !r.isSelected }
          : r
      )
    );
  }, []);

  // Toggle all valid rows
  const toggleAll = useCallback(() => {
    const allSelected = validRows.every((r) => r.isSelected);
    setRows((prev) =>
      prev.map((r) =>
        Object.keys(r.errors).length === 0 && !r.isDuplicate
          ? { ...r, isSelected: !allSelected }
          : r
      )
    );
  }, [validRows]);

  // Submit selected rows
  const handleSubmit = useCallback(async () => {
    const effectiveOrgId = orgId || defaultOrgId || "";
    if (!effectiveOrgId) {
      toast.error("기관을 선택해주세요.");
      return;
    }

    const toInsert = selectedRows
      .map((r) => r.parsed)
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (toInsert.length === 0) {
      toast.error("등록할 기업이 없습니다.");
      return;
    }

    setLoading(true);
    try {
      const result = await bulkCreateCompanies(effectiveOrgId, toInsert);
      toast.success(`${result.inserted}건의 기업이 등록되었습니다.`);
      router.push("/companies");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "등록 중 오류가 발생했습니다."
      );
      setLoading(false);
    }
  }, [orgId, defaultOrgId, selectedRows, router]);

  // Reset to upload step
  const handleReset = useCallback(() => {
    setRows([]);
    setStep("upload");
    setFileName("");
  }, []);

  return (
    <div className="space-y-6">
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>기업 일괄 등록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Org select (super admin only) */}
            {showOrgSelect && organizations && (
              <div className="space-y-2">
                <Label>기관 선택</Label>
                <Select value={orgId} onValueChange={setOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="기관을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Template download */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
              >
                <Download className="mr-2 h-4 w-4" />
                템플릿 다운로드
              </Button>
              <span className="text-sm text-muted-foreground">
                Excel 템플릿을 다운로드하여 기업 정보를 입력하세요
              </span>
            </div>

            {/* File upload area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 transition-colors hover:border-muted-foreground/50 hover:bg-muted/50"
            >
              <Upload className="h-10 w-10 text-muted-foreground/50" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  파일을 드래그하거나 클릭하여 업로드
                </p>
                <p className="text-xs text-muted-foreground">
                  Excel (.xlsx) 또는 CSV 파일 (최대 5MB)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            {loading && (
              <p className="text-center text-sm text-muted-foreground">
                파일을 분석하는 중...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <>
          {/* Summary header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    다시 업로드
                  </Button>
                  <div className="flex items-center gap-2 text-sm">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{fileName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="default">
                    유효 {validRows.length}건
                  </Badge>
                  {errorRows.length > 0 && (
                    <Badge variant="destructive">
                      오류 {errorRows.length}건
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview table */}
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={
                            validRows.length > 0 &&
                            validRows.every((r) => r.isSelected)
                          }
                          onChange={toggleAll}
                          disabled={validRows.length === 0}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead className="w-14">행</TableHead>
                      {DATA_COLUMNS.map((col) => (
                        <TableHead key={col}>
                          {DB_TO_KOREAN[col]}
                        </TableHead>
                      ))}
                      <TableHead className="w-24">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const hasError =
                        Object.keys(row.errors).length > 0 || row.isDuplicate;
                      return (
                        <TableRow
                          key={row.rowNumber}
                          className={
                            hasError ? "bg-destructive/5" : ""
                          }
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={row.isSelected}
                              onChange={() => toggleRow(row.rowNumber)}
                              disabled={hasError}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {row.rowNumber}
                          </TableCell>
                          {DATA_COLUMNS.map((col) => (
                            <TableCell key={col}>
                              <div>
                                <span
                                  className={
                                    row.errors[col]
                                      ? "text-destructive"
                                      : ""
                                  }
                                >
                                  {row.data[col] || "-"}
                                </span>
                                {row.errors[col] && (
                                  <p className="text-xs text-destructive mt-0.5">
                                    {row.errors[col]}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          ))}
                          <TableCell>
                            {hasError ? (
                              <Badge variant="destructive" className="gap-1">
                                <X className="h-3 w-3" />
                                오류
                              </Badge>
                            ) : (
                              <Badge variant="default" className="gap-1">
                                <Check className="h-3 w-3" />
                                유효
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => router.back()}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || selectedRows.length === 0}
            >
              {loading
                ? "등록 중..."
                : `${selectedRows.length}건 등록`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
