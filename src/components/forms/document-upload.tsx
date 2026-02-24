"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { createDocument, deleteDocument } from "@/actions/documents";
import type { DocumentType } from "@/types";

const typeLabels: Record<DocumentType, string> = {
  biz_license: "사업자등록증",
  biz_plan: "사업계획서",
  contract: "계약서",
  other: "기타",
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentRow {
  id: string;
  company_id: string;
  org_id: string;
  type: DocumentType;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
  uploader?: { name: string; email: string } | null;
}

interface Props {
  companyId: string;
  orgId: string;
  documents: DocumentRow[];
  canUpload: boolean;
  canDelete: boolean;
}

export function DocumentUpload({
  companyId,
  orgId,
  documents,
  canUpload,
  canDelete,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DocumentType>("other");
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("파일을 선택해주세요.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "bin";
      const uuid = crypto.randomUUID();
      const storagePath = `${orgId}/${companyId}/${uuid}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      await createDocument({
        companyId,
        orgId,
        type: docType,
        fileName: file.name,
        fileUrl: storagePath,
        fileSize: file.size,
      });

      toast.success("파일이 업로드되었습니다.");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      toast.error("업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(fileUrl: string, fileName: string) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(fileUrl, 60);

      if (error) throw error;

      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = fileName;
      a.click();
    } catch {
      toast.error("다운로드에 실패했습니다.");
    }
  }

  function handleDelete(id: string, fileUrl: string) {
    startTransition(async () => {
      try {
        await deleteDocument(id, fileUrl);
        toast.success("파일이 삭제되었습니다.");
        router.refresh();
      } catch {
        toast.error("삭제에 실패했습니다.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          서류 관리
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canUpload && (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
            <div className="space-y-2">
              <Label>서류 유형</Label>
              <Select
                value={docType}
                onValueChange={(v) => setDocType(v as DocumentType)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="biz_license">사업자등록증</SelectItem>
                  <SelectItem value="biz_plan">사업계획서</SelectItem>
                  <SelectItem value="contract">계약서</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label>파일 선택</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx"
              />
            </div>
            <Button onClick={handleUpload} disabled={uploading}>
              <Upload className="mr-1 h-4 w-4" />
              {uploading ? "업로드 중..." : "업로드"}
            </Button>
          </div>
        )}

        {documents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>파일명</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>크기</TableHead>
                <TableHead>업로드일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    {doc.file_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {typeLabels[doc.type] || doc.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                  <TableCell>
                    {new Date(doc.created_at).toLocaleDateString("ko-KR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleDownload(doc.file_url, doc.file_name)
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id, doc.file_url)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            등록된 서류가 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
