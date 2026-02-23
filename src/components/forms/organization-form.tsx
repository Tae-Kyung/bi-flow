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
import {
  createOrganization,
  updateOrganization,
} from "@/actions/organizations";
import type { Organization, OrgSettings } from "@/types";

interface Props {
  organization?: Organization;
}

export function OrganizationForm({ organization }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const settings = organization?.settings as OrgSettings | undefined;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      if (organization) {
        await updateOrganization(organization.id, formData);
      } else {
        await createOrganization(formData);
      }
      router.push("/organizations");
    } catch {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {organization ? "기관 수정" : "기관 등록"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">기관명</Label>
            <Input
              id="name"
              name="name"
              defaultValue={organization?.name}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">유형</Label>
            <Select name="type" defaultValue={organization?.type || "bi_center"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bi_center">창업보육센터</SelectItem>
                <SelectItem value="g_tech">G-테크벤처센터</SelectItem>
                <SelectItem value="convergence">융합기술원</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rent_unit_price">면적당 단가 (원/m²)</Label>
              <Input
                id="rent_unit_price"
                name="rent_unit_price"
                type="number"
                defaultValue={settings?.rent_unit_price || 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance_fee_total">관리비 총액 (원/월)</Label>
              <Input
                id="maintenance_fee_total"
                name="maintenance_fee_total"
                type="number"
                defaultValue={settings?.maintenance_fee_total || 0}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="distribution_method">관리비 배분 방식</Label>
              <Select
                name="distribution_method"
                defaultValue={settings?.distribution_method || "area_ratio"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area_ratio">면적 비례</SelectItem>
                  <SelectItem value="equal">균등 배분</SelectItem>
                  <SelectItem value="custom">커스텀</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_issue_day">고지서 발행일</Label>
              <Input
                id="invoice_issue_day"
                name="invoice_issue_day"
                type="number"
                min={1}
                max={28}
                defaultValue={settings?.invoice_issue_day || 1}
              />
            </div>
          </div>

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
