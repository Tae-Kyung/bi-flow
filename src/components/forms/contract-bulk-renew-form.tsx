"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bulkRenewContracts } from "@/actions/contracts";

interface ContractRow {
  id: string;
  companyName: string;
  spaceName: string;
  startDate: string;
  endDate: string;
}

interface Props {
  contracts: ContractRow[];
}

export function ContractBulkRenewForm({ contracts }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 각 계약별 선택 여부 + 새 시작일/종료일
  const [rows, setRows] = useState<
    { id: string; selected: boolean; newStartDate: string; newEndDate: string }[]
  >(
    contracts.map((c) => {
      // 기본값: 기존 종료일 다음날 ~ 1년 후
      const oldEnd = new Date(c.endDate);
      const newStart = new Date(oldEnd);
      newStart.setDate(newStart.getDate() + 1);
      const newEnd = new Date(newStart);
      newEnd.setFullYear(newEnd.getFullYear() + 1);
      newEnd.setDate(newEnd.getDate() - 1);

      const fmt = (d: Date) => d.toISOString().split("T")[0];
      return {
        id: c.id,
        selected: false,
        newStartDate: fmt(newStart),
        newEndDate: fmt(newEnd),
      };
    })
  );

  const selectedCount = rows.filter((r) => r.selected).length;

  const toggleAll = useCallback(() => {
    const allSelected = rows.every((r) => r.selected);
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  }, [rows]);

  const toggleRow = useCallback((id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  }, []);

  const updateDate = useCallback(
    (id: string, field: "newStartDate" | "newEndDate", value: string) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
    },
    []
  );

  async function handleSubmit() {
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) {
      toast.error("갱신할 계약을 선택해주세요.");
      return;
    }

    for (const r of selected) {
      if (!r.newStartDate || !r.newEndDate) {
        toast.error("선택된 모든 계약의 갱신 기간을 입력해주세요.");
        return;
      }
      if (r.newStartDate >= r.newEndDate) {
        toast.error("갱신 시작일은 종료일보다 앞이어야 합니다.");
        return;
      }
    }

    setLoading(true);
    try {
      const result = await bulkRenewContracts(
        selected.map((r) => ({
          contractId: r.id,
          newStartDate: r.newStartDate,
          newEndDate: r.newEndDate,
        }))
      );
      toast.success(`${result.renewed}건의 계약이 갱신되었습니다.`);
      router.push("/contracts");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "갱신 중 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>활성 계약 목록</CardTitle>
            {selectedCount > 0 && (
              <Badge>{selectedCount}건 선택</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every((r) => r.selected)}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>기업명</TableHead>
                  <TableHead>호실</TableHead>
                  <TableHead>현 계약기간</TableHead>
                  <TableHead>새 시작일</TableHead>
                  <TableHead>새 종료일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c, i) => {
                  const row = rows[i];
                  if (!row) return null;
                  return (
                    <TableRow key={c.id} className={row.selected ? "bg-muted/50" : ""}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleRow(c.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{c.companyName}</TableCell>
                      <TableCell>{c.spaceName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {c.startDate} ~ {c.endDate}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={row.newStartDate}
                          onChange={(e) => updateDate(c.id, "newStartDate", e.target.value)}
                          disabled={!row.selected}
                          className="w-36 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={row.newEndDate}
                          onChange={(e) => updateDate(c.id, "newEndDate", e.target.value)}
                          disabled={!row.selected}
                          className="w-36 text-sm"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {contracts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      갱신 가능한 활성 계약이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || selectedCount === 0}
        >
          {loading ? "갱신 중..." : `${selectedCount}건 일괄 갱신`}
        </Button>
      </div>
    </div>
  );
}
