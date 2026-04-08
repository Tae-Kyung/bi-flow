"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createMoveOut } from "@/actions/move-outs";

interface Props {
  contracts: any[];
}

export function MoveOutForm({ contracts }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      await createMoveOut(formData);
      router.push("/move-outs");
    } catch {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>퇴거 신청</CardTitle></CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>계약 (기업 - 호실)</Label>
            <Select name="contract_id" required>
              <SelectTrigger><SelectValue placeholder="계약 선택" /></SelectTrigger>
              <SelectContent>
                {contracts.map((c: any) => {
                  const spaceNames = (c.contract_spaces ?? [])
                    .map((cs: any) => cs.space?.name)
                    .filter(Boolean)
                    .join(", ") || c.space?.name || "-";
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company?.name} - {spaceNames} ({c.start_date} ~ {c.end_date})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="request_date">신청일</Label>
              <Input id="request_date" name="request_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exit_date">퇴거 예정일</Label>
              <Input id="exit_date" name="exit_date" type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">퇴거 사유</Label>
            <Textarea id="reason" name="reason" rows={3} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>{loading ? "등록 중..." : "퇴거 등록"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
