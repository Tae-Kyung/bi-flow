"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createContract, updateContract } from "@/actions/contracts";
import type { Company, Contract, Organization, Space } from "@/types";

interface Props {
  contract?: Contract;
  companies: Company[];
  spaces: Space[];
  organizations?: Organization[];
  showOrgSelect?: boolean;
}

export function ContractForm({ contract, companies, spaces, organizations, showOrgSelect }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      if (contract) {
        await updateContract(contract.id, formData);
      } else {
        await createContract(formData);
      }
      router.push("/contracts");
    } catch {
      setLoading(false);
    }
  }

  const vacantSpaces = spaces.filter((s) => s.status === "vacant" || s.id === contract?.space_id);

  return (
    <Card>
      <CardHeader><CardTitle>{contract ? "계약 수정" : "계약 생성"}</CardTitle></CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {showOrgSelect && organizations && (
            <div className="space-y-2">
              <Label>기관</Label>
              <Select name="org_id" defaultValue={contract?.org_id}>
                <SelectTrigger><SelectValue placeholder="기관 선택" /></SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>입주기업</Label>
              <Select name="company_id" defaultValue={contract?.company_id} disabled={!!contract}>
                <SelectTrigger><SelectValue placeholder="기업 선택" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>호실</Label>
              <Select name="space_id" defaultValue={contract?.space_id} disabled={!!contract}>
                <SelectTrigger><SelectValue placeholder="호실 선택" /></SelectTrigger>
                <SelectContent>
                  {vacantSpaces.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.area}m²) {s.status === "occupied" ? "[현재]" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">계약 시작일</Label>
              <Input id="start_date" name="start_date" type="date" defaultValue={contract?.start_date} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">계약 종료일</Label>
              <Input id="end_date" name="end_date" type="date" defaultValue={contract?.end_date} required />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rent_amount">월 임대료 (원)</Label>
              <Input id="rent_amount" name="rent_amount" type="number" defaultValue={contract?.rent_amount || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit">보증금 (원)</Label>
              <Input id="deposit" name="deposit" type="number" defaultValue={contract?.deposit || ""} />
            </div>
          </div>
          {contract && (
            <div className="space-y-2">
              <Label>상태</Label>
              <Select name="status" defaultValue={contract.status}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">초안</SelectItem>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="expired">만료</SelectItem>
                  <SelectItem value="terminated">해지</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>{loading ? "저장 중..." : "저장"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
