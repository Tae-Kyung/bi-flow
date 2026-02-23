import { requireRole } from "@/lib/auth";
import { getOrganizations } from "@/actions/organizations";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import type { Organization, OrgSettings } from "@/types";

const orgTypeLabels: Record<string, string> = {
  bi_center: "창업보육센터",
  g_tech: "G-테크벤처센터",
  convergence: "융합기술원",
};

const distributionLabels: Record<string, string> = {
  area_ratio: "면적 비례",
  equal: "균등 배분",
  custom: "커스텀",
};

export default async function OrganizationsPage() {
  await requireRole(["super_admin"]);
  const organizations = (await getOrganizations()) as Organization[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">기관 관리</h1>
        <Link href="/organizations/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            기관 등록
          </Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>기관명</TableHead>
            <TableHead>유형</TableHead>
            <TableHead className="text-right">면적당 단가 (원)</TableHead>
            <TableHead className="text-right">관리비 총액 (원)</TableHead>
            <TableHead>배분 방식</TableHead>
            <TableHead>고지서 발행일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org) => {
            const settings = org.settings as OrgSettings;
            return (
              <TableRow key={org.id}>
                <TableCell>
                  <Link
                    href={`/organizations/${org.id}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {org.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {orgTypeLabels[org.type] || org.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {settings.rent_unit_price?.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {settings.maintenance_fee_total?.toLocaleString()}
                </TableCell>
                <TableCell>
                  {distributionLabels[settings.distribution_method] ||
                    settings.distribution_method}
                </TableCell>
                <TableCell>매월 {settings.invoice_issue_day}일</TableCell>
              </TableRow>
            );
          })}
          {organizations.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                등록된 기관이 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
