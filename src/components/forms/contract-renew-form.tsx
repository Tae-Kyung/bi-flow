"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { renewContract } from "@/actions/contracts";
import type { Contract } from "@/types";

interface Props {
  contract: Contract;
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function ContractRenewForm({ contract }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      await renewContract(contract.id, formData);
      router.push("/contracts");
    } catch {
      setLoading(false);
    }
  }

  const defaultStartDate = addDays(contract.end_date, 1);

  return (
    <Card>
      <CardHeader><CardTitle>계약 연장</CardTitle></CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          {/* 기존 계약 정보 (read-only) */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">기존 계약 정보</h3>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div>
                <span className="text-muted-foreground">기업명: </span>
                <span className="font-medium">{contract.company?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">호실: </span>
                <span className="font-medium">
                  {(contract.contract_spaces as any[])?.map((cs: any) => cs.space?.name).filter(Boolean).join(", ") || "-"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">계약기간: </span>
                <span className="font-medium">{contract.start_date} ~ {contract.end_date}</span>
              </div>
              <div>
                <span className="text-muted-foreground">월 임대료: </span>
                <span className="font-medium">{contract.rent_amount.toLocaleString()}원</span>
              </div>
              <div>
                <span className="text-muted-foreground">보증금: </span>
                <span className="font-medium">{contract.deposit.toLocaleString()}원</span>
              </div>
            </div>
          </div>

          {/* 새 계약 조건 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">새 계약 조건</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">계약 시작일</Label>
                <Input id="start_date" name="start_date" type="date" defaultValue={defaultStartDate} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">계약 종료일</Label>
                <Input id="end_date" name="end_date" type="date" required />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rent_amount">월 임대료 (원)</Label>
                <Input id="rent_amount" name="rent_amount" type="number" defaultValue={contract.rent_amount} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit">보증금 (원)</Label>
                <Input id="deposit" name="deposit" type="number" defaultValue={contract.deposit} />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>{loading ? "처리 중..." : "연장 확인"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
