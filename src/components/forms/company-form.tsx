"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCompany, updateCompany } from "@/actions/companies";
import type { Company, CompanyStatus, Organization } from "@/types";

interface Props {
  company?: Company;
  organizations?: Organization[];
  showOrgSelect?: boolean;
}

export function CompanyForm({ company, organizations, showOrgSelect }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(
    company?.status || "active"
  );

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
        <form action={handleSubmit} className="space-y-6">
          {/* === 기관 선택 === */}
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

          {/* === 1. 기업 기본 정보 === */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">기업 기본 정보</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">기업명 *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={company?.name}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="biz_number">사업자등록번호 *</Label>
                  <Input
                    id="biz_number"
                    name="biz_number"
                    placeholder="000-00-00000"
                    defaultValue={company?.biz_number}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="corporate_type">법인/개인 구분</Label>
                  <Select name="corporate_type" defaultValue={company?.corporate_type || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corporation">법인</SelectItem>
                      <SelectItem value="individual">개인</SelectItem>
                      <SelectItem value="pre_startup">예비창업자</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="representative">대표자명 *</Label>
                  <Input
                    id="representative"
                    name="representative"
                    defaultValue={company?.representative}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="founding_date">설립일</Label>
                  <Input
                    id="founding_date"
                    name="founding_date"
                    type="date"
                    defaultValue={company?.founding_date || ""}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_description">주요 사업내용</Label>
                <Textarea
                  id="business_description"
                  name="business_description"
                  placeholder="업태, 종목 및 주요 개발 아이템"
                  defaultValue={company?.business_description || ""}
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="main_products">주생산품</Label>
                  <Input
                    id="main_products"
                    name="main_products"
                    placeholder="핵심 제품군"
                    defaultValue={company?.main_products || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">홈페이지</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    placeholder="https://"
                    defaultValue={company?.website || ""}
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
            </div>
          </div>

          <Separator />

          {/* === 2. 대표자 및 연락처 === */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">대표자 연락처</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">대표 휴대폰</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="010-0000-0000"
                  defaultValue={company?.phone || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">대표 이메일</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={company?.email || ""}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* === 3. 실무담당자 === */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">실무/행정 담당자</h3>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">담당자명</Label>
                  <Input
                    id="contact_name"
                    name="contact_name"
                    defaultValue={company?.contact_name || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">담당자 연락처</Label>
                  <Input
                    id="contact_phone"
                    name="contact_phone"
                    placeholder="010-0000-0000"
                    defaultValue={company?.contact_phone || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">담당자 이메일</Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    placeholder="세금계산서 수신용"
                    defaultValue={company?.contact_email || ""}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="office_phone">사무실 전화</Label>
                  <Input
                    id="office_phone"
                    name="office_phone"
                    placeholder="055-000-0000"
                    defaultValue={company?.office_phone || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fax">팩스</Label>
                  <Input
                    id="fax"
                    name="fax"
                    placeholder="055-000-0000"
                    defaultValue={company?.fax || ""}
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* === 4. 인증 및 특이사항 === */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">인증 및 특이사항</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="certification_expiry">인증 만료일</Label>
                <Input
                  id="certification_expiry"
                  name="certification_expiry"
                  type="date"
                  defaultValue={company?.certification_expiry || ""}
                />
                <p className="text-xs text-muted-foreground">벤처기업 인증, 소상공인 확인서 등</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">비고</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="특별 부담금, 계약 변경 이력 등"
                  defaultValue={company?.notes || ""}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* === 상태 및 졸업 (수정 시만) === */}
          {company && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">입주 상태</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">상태</Label>
                    <Select
                      name="status"
                      defaultValue={company.status}
                      onValueChange={(v) => setSelectedStatus(v as CompanyStatus)}
                    >
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

                  {selectedStatus === "graduated" && (
                    <div className="space-y-2">
                      <Label htmlFor="graduation_notes">졸업 메모</Label>
                      <Textarea
                        id="graduation_notes"
                        name="graduation_notes"
                        placeholder="졸업 사유, 성과 등을 기록하세요."
                        defaultValue={company.graduation_notes || ""}
                        rows={3}
                      />
                      {company.graduated_at && (
                        <p className="text-xs text-muted-foreground">
                          졸업일: {new Date(company.graduated_at).toLocaleDateString("ko-KR")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

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
