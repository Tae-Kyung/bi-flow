"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCompany, updateCompany } from "@/actions/companies";
import type { Company, Organization } from "@/types";

interface Props {
  company?: Company;
  organizations?: Organization[];
  showOrgSelect?: boolean;
}

export function CompanyForm({ company, organizations, showOrgSelect }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      if (company) {
        await updateCompany(company.id, formData);
      } else {
        await createCompany(formData);
      }
      router.push("/companies");
    } catch {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{company ? "기업 수정" : "기업 등록"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {showOrgSelect && organizations && (
            <div className="space-y-2">
              <Label htmlFor="org_id">기관</Label>
              <Select name="org_id" defaultValue={company?.org_id}>
                <SelectTrigger>
                  <SelectValue placeholder="기관 선택" />
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

          <div className="space-y-2">
            <Label htmlFor="name">기업명</Label>
            <Input
              id="name"
              name="name"
              defaultValue={company?.name}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="biz_number">사업자등록번호</Label>
              <Input
                id="biz_number"
                name="biz_number"
                placeholder="000-00-00000"
                defaultValue={company?.biz_number}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="representative">대표자명</Label>
              <Input
                id="representative"
                name="representative"
                defaultValue={company?.representative}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={company?.phone || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={company?.email || ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">주소</Label>
            <Input
              id="address"
              name="address"
              defaultValue={company?.address || ""}
            />
          </div>

          {company && (
            <div className="space-y-2">
              <Label htmlFor="status">상태</Label>
              <Select name="status" defaultValue={company.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">활동</SelectItem>
                  <SelectItem value="graduated">졸업</SelectItem>
                  <SelectItem value="terminated">해지</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "저장 중..." : "저장"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              취소
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
