"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { updateMoveOutStatus } from "@/actions/move-outs";

const statusLabels: Record<string, string> = {
  requested: "신청",
  inspecting: "시설점검",
  settling: "정산중",
  completed: "완료",
};

const nextStatus: Record<string, { status: string; label: string }> = {
  requested: { status: "inspecting", label: "시설 점검 시작" },
  inspecting: { status: "settling", label: "점검 완료 → 정산" },
  settling: { status: "completed", label: "퇴거 완료" },
};

interface Props {
  moveOut: any;
  canManage: boolean;
}

export function MoveOutDetail({ moveOut, canManage }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inspectionNotes, setInspectionNotes] = useState(moveOut.inspection_notes || "");
  const [depositDeduction, setDepositDeduction] = useState(moveOut.deposit_deduction ?? 0);
  const [deductionReason, setDeductionReason] = useState(moveOut.deduction_reason || "");

  const next = nextStatus[moveOut.status];

  async function handleAdvance() {
    setLoading(true);
    try {
      const extra: Record<string, unknown> = {};
      if (moveOut.status === "inspecting") {
        extra.inspection_notes = inspectionNotes;
        extra.inspection_completed_at = new Date().toISOString();
      }
      if (moveOut.status === "settling") {
        extra.deposit_deduction = depositDeduction;
        extra.deduction_reason = deductionReason;
        extra.deposit_returned_at = new Date().toISOString();
      }
      await updateMoveOutStatus(moveOut.id, next.status as any, extra);
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{moveOut.company?.name}</CardTitle>
            <Badge>{statusLabels[moveOut.status]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div><span className="text-muted-foreground">호실:</span> {moveOut.contract?.space?.name || "-"}</div>
            <div><span className="text-muted-foreground">대표자:</span> {moveOut.company?.representative}</div>
            <div><span className="text-muted-foreground">신청일:</span> {moveOut.request_date}</div>
            <div><span className="text-muted-foreground">퇴거예정일:</span> {moveOut.exit_date || "-"}</div>
            <div><span className="text-muted-foreground">보증금:</span> {Number(moveOut.deposit_amount).toLocaleString()}원</div>
            <div><span className="text-muted-foreground">공제액:</span> {Number(moveOut.deposit_deduction).toLocaleString()}원</div>
          </div>
          {moveOut.reason && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground mb-1">퇴거 사유</p>
                <p className="whitespace-pre-wrap">{moveOut.reason}</p>
              </div>
            </>
          )}
          {moveOut.inspection_notes && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground mb-1">시설 점검 메모</p>
                <p className="whitespace-pre-wrap">{moveOut.inspection_notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {canManage && next && (
        <Card>
          <CardHeader><CardTitle>다음 단계: {next.label}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {moveOut.status === "inspecting" && (
              <div className="space-y-2">
                <Label>시설 점검 메모</Label>
                <Textarea
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="점검 결과를 기록하세요"
                  rows={4}
                />
              </div>
            )}
            {moveOut.status === "settling" && (
              <>
                <div className="space-y-2">
                  <Label>보증금 공제액 (원)</Label>
                  <Input
                    type="number"
                    value={depositDeduction}
                    onChange={(e) => setDepositDeduction(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>공제 사유</Label>
                  <Textarea
                    value={deductionReason}
                    onChange={(e) => setDeductionReason(e.target.value)}
                    rows={2}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  반환 예정액: {(Number(moveOut.deposit_amount) - depositDeduction).toLocaleString()}원
                </p>
              </>
            )}
            <Button onClick={handleAdvance} disabled={loading}>
              {loading ? "처리 중..." : next.label}
            </Button>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={() => router.back()}>목록으로</Button>
    </div>
  );
}
