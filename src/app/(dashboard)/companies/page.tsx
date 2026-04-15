import { requireAuth } from "@/lib/auth";
import { getCompanies, getCompanyStatusCounts } from "@/actions/companies";
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
import { ChevronDown, ChevronUp, ChevronsUpDown, Pencil, Plus, Upload } from "lucide-react";
import { DeleteCompanyButton } from "@/components/companies/delete-company-button";

const statusLabels: Record<string, string> = {
  active: "입주",
  graduated: "졸업",
  terminated: "퇴거",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  graduated: "secondary",
  terminated: "destructive",
};

const corporateTypeLabels: Record<string, string> = {
  corporation: "법인",
  individual: "개인",
  pre_startup: "예비창업",
};

const tabs = [
  { key: "", label: "전체" },
  { key: "active", label: "입주" },
  { key: "graduated", label: "졸업" },
  { key: "terminated", label: "퇴거" },
];

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string; order?: string; org?: string }>;
}) {
  const profile = await requireAuth();
  const { status, sort, order, org } = await searchParams;

  const isSuperAdmin = profile.role === "super_admin";
  const canCreate = isSuperAdmin || profile.role === "org_admin";
  const isAdmin = isSuperAdmin || profile.role === "org_admin";
  const colCount = isSuperAdmin ? 11 : 10;

  const [companies, counts, organizations] = await Promise.all([
    getCompanies(isSuperAdmin ? org : undefined, status, sort, order),
    getCompanyStatusCounts(isSuperAdmin ? org : undefined),
    isSuperAdmin ? getOrganizations() : Promise.resolve([]),
  ]);

  function sortHref(field: string) {
    const nextOrder = sort === field && order === "asc" ? "desc" : "asc";
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (org) params.set("org", org);
    params.set("sort", field);
    params.set("order", nextOrder);
    return `/companies?${params.toString()}`;
  }

  function statusHref(statusKey: string) {
    const params = new URLSearchParams();
    if (statusKey) params.set("status", statusKey);
    if (org) params.set("org", org);
    return `/companies${params.toString() ? `?${params.toString()}` : ""}`;
  }

  function orgHref(orgId: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (orgId) params.set("org", orgId);
    return `/companies${params.toString() ? `?${params.toString()}` : ""}`;
  }

  function SortIcon({ field }: { field: string }) {
    if (sort !== field) return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground" />;
    return order === "asc"
      ? <ChevronUp className="ml-1 inline h-3 w-3" />
      : <ChevronDown className="ml-1 inline h-3 w-3" />;
  }

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

      {/* 기관 필터 (super_admin 전용) */}
      {isSuperAdmin && organizations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link href={orgHref("")}>
            <Badge
              variant={!org ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-sm"
            >
              전체 기관
            </Badge>
          </Link>
          {organizations.map((o: any) => (
            <Link key={o.id} href={orgHref(o.id)}>
              <Badge
                variant={org === o.id ? "default" : "outline"}
                className="cursor-pointer px-3 py-1 text-sm"
              >
                {o.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* 상태별 필터 탭 */}
      <div className="flex gap-2">
        {tabs.map((tab) => {
          const isActive = (status || "") === tab.key;
          const count = tab.key ? counts[tab.key] ?? 0 : counts.all ?? 0;
          return (
            <Link key={tab.key} href={statusHref(tab.key)}>
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

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {isSuperAdmin && <TableHead>기관</TableHead>}
              <TableHead>
                <Link href={sortHref("name")} className="flex items-center hover:text-foreground">
                  기업명<SortIcon field="name" />
                </Link>
              </TableHead>
              <TableHead>구분</TableHead>
              <TableHead>사업자등록번호</TableHead>
              <TableHead>
                <Link href={sortHref("representative")} className="flex items-center hover:text-foreground">
                  대표자<SortIcon field="representative" />
                </Link>
              </TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>설립일</TableHead>
              <TableHead>주요 사업내용</TableHead>
              <TableHead>주생산품</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company: any) => (
              <TableRow key={company.id}>
                {isSuperAdmin && (
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {company.organization?.name}
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap">
                  <Link
                    href={`/companies/${company.id}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {company.name}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {company.corporate_type ? (
                    <Badge variant="outline">
                      {corporateTypeLabels[company.corporate_type] || company.corporate_type}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">{company.biz_number}</TableCell>
                <TableCell className="whitespace-nowrap">{company.representative}</TableCell>
                <TableCell className="whitespace-nowrap">{company.phone || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {company.founding_date
                    ? new Date(company.founding_date).toLocaleDateString("ko-KR")
                    : "-"}
                </TableCell>
                <TableCell className="max-w-48 truncate" title={company.business_description || ""}>
                  {company.business_description || "-"}
                </TableCell>
                <TableCell className="max-w-36 truncate" title={company.main_products || ""}>
                  {company.main_products || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[company.status]}>
                    {statusLabels[company.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/companies/${company.id}`}>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    {isAdmin && (
                      <DeleteCompanyButton
                        companyId={company.id}
                        companyName={company.name}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="text-center text-muted-foreground"
                >
                  등록된 입주기업이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
