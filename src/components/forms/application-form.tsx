"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createApplication } from "@/actions/applications";
import type { Organization } from "@/types";

interface Props {
  organizations: Organization[];
  showOrgSelect: boolean;
  defaultOrgId?: string;
}

export function ApplicationForm({ organizations, showOrgSelect, defaultOrgId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    if (!showOrgSelect && defaultOrgId) {
      formData.set("org_id", defaultOrgId);
    }
    setLoading(true);
    try {
      await createApplication(formData);
      router.push("/applications");
    } catch {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>입주 신청서</CardTitle></CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {showOrgSelect && (
            <div className="space-y-2">
              <Label>기관</Label>
              <Select name="org_id">
                <SelectTrigger><SelectValue placeholder="기관 선택" /></SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="company_name">기업명</Label>
            <Input id="company_name" name="company_name" required />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="biz_number">사업자등록번호</Label>
              <Input id="biz_number" name="biz_number" placeholder="000-00-00000" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="representative">대표자명</Label>
              <Input id="representative" name="representative" required />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">연락처</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" name="email" type="email" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="desired_area">희망 면적 (m²)</Label>
              <Input id="desired_area" name="desired_area" type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desired_period">희망 입주 기간</Label>
              <Input id="desired_period" name="desired_period" placeholder="예: 1년" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purpose">사업 목적</Label>
            <Textarea id="purpose" name="purpose" rows={3} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>{loading ? "제출 중..." : "신청서 제출"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
