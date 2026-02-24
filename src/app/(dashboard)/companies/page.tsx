import { requireAuth } from "@/lib/auth";
import { getCompanies, getCompanyStatusCounts } from "@/actions/companies";
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
import { Plus, Upload } from "lucide-react";

const statusLabels: Record<string, string> = {
  active: "활동",
  graduated: "졸업",
  terminated: "해지",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  graduated: "secondary",
  terminated: "destructive",
};

const tabs = [
  { key: "", label: "전체" },
  { key: "active", label: "활동" },
  { key: "graduated", label: "졸업" },
  { key: "terminated", label: "해지" },
];

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const profile = await requireAuth();
  const { status } = await searchParams;
  const companies = await getCompanies(undefined, status);
  const counts = await getCompanyStatusCounts();

  const isSuperAdmin = profile.role === "super_admin";
  const canCreate = isSuperAdmin || profile.role === "org_admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">입주기업 관리</h1>
        {canCreate && (
          <div className="flex items-center gap-2">
            <Link href="/companies/bulk-upload">
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                일괄 등록
              </Button>
            </Link>
            <Link href="/companies/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                기업 등록
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 상태별 필터 탭 */}
      <div className="flex gap-2">
        {tabs.map((tab) => {
          const isActive = (status || "") === tab.key;
          const count = tab.key ? counts[tab.key] ?? 0 : counts.all ?? 0;
          return (
            <Link
              key={tab.key}
              href={
                tab.key ? `/companies?status=${tab.key}` : "/companies"
              }
            >
              <Badge
                variant={isActive ? "default" : "outline"}
                className="cursor-pointer px-3 py-1 text-sm"
              >
                {tab.label} {count}
              </Badge>
            </Link>
          );
        })}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {isSuperAdmin && <TableHead>기관</TableHead>}
            <TableHead>기업명</TableHead>
            <TableHead>사업자등록번호</TableHead>
            <TableHead>대표자</TableHead>
            <TableHead>연락처</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company: any) => (
            <TableRow key={company.id}>
              {isSuperAdmin && (
                <TableCell className="text-muted-foreground">
                  {company.organization?.name}
                </TableCell>
              )}
              <TableCell>
                <Link
                  href={`/companies/${company.id}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {company.name}
                </Link>
              </TableCell>
              <TableCell>{company.biz_number}</TableCell>
              <TableCell>{company.representative}</TableCell>
              <TableCell>{company.phone || "-"}</TableCell>
              <TableCell>
                <Badge variant={statusVariants[company.status]}>
                  {statusLabels[company.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {companies.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={isSuperAdmin ? 6 : 5}
                className="text-center text-muted-foreground"
              >
                등록된 입주기업이 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
