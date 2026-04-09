import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  DoorOpen,
  Factory,
  FileText,
  ClipboardList,
  LogOut,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { CheckExpiringButton } from "@/components/dashboard/check-expiring-button";

export default async function DashboardPage() {
  const profile = await requireAuth();
  const supabase = await createClient();

  const isSuperAdmin = profile.role === "super_admin";
  const orgFilter =
    !isSuperAdmin && profile.org_id ? profile.org_id : null;

  // === 기본 통계 ===
  const { count: orgCount } = await supabase
    .from("organizations")
    .select("*", { count: "exact", head: true });

  const spacesQuery = supabase
    .from("spaces")
    .select("*", { count: "exact", head: true });
  if (orgFilter) spacesQuery.eq("org_id", orgFilter);
  const { count: spaceCount } = await spacesQuery;

  const occupiedQuery = supabase
    .from("spaces")
    .select("*", { count: "exact", head: true })
    .eq("status", "occupied");
  if (orgFilter) occupiedQuery.eq("org_id", orgFilter);
  const { count: occupiedCount } = await occupiedQuery;

  const occupancyRate =
    spaceCount && spaceCount > 0
      ? Math.round(((occupiedCount ?? 0) / spaceCount) * 100)
      : 0;

  // === 기업 상태별 수 ===
  const activeQuery = supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");
  if (orgFilter) activeQuery.eq("org_id", orgFilter);
  const { count: activeCompanyCount } = await activeQuery;

  const graduatedQuery = supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("status", "graduated");
  if (orgFilter) graduatedQuery.eq("org_id", orgFilter);
  const { count: graduatedCount } = await graduatedQuery;

  const terminatedQuery = supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("status", "terminated");
  if (orgFilter) terminatedQuery.eq("org_id", orgFilter);
  const { count: terminatedCompanyCount } = await terminatedQuery;

  // === 계약 현황 ===
  // 기업당 1개의 활성 계약만 카운트 (company_id 기준 중복 제거)
  let activeContractQuery = supabase
    .from("contracts")
    .select("company_id")
    .eq("status", "active");
  if (orgFilter) activeContractQuery = activeContractQuery.eq("org_id", orgFilter);
  const { data: activeContractRows } = await activeContractQuery;
  const activeContractCount = new Set(activeContractRows?.map((r) => r.company_id)).size;

  // 30일 내 만료 예정 계약
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const expiringQuery = supabase
    .from("contracts")
    .select("*, company:companies(name), space:spaces(name)")
    .eq("status", "active")
    .gte("end_date", today)
    .lte("end_date", thirtyDaysLater)
    .order("end_date", { ascending: true });
  if (orgFilter) expiringQuery.eq("org_id", orgFilter);
  const { data: expiringContracts } = await expiringQuery;

  // === 최근 입주 신청 ===
  const recentAppsQuery = supabase
    .from("applications")
    .select("id, company_name, status, created_at, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(5);
  if (orgFilter) recentAppsQuery.eq("org_id", orgFilter);
  const { data: recentApps } = await recentAppsQuery;

  // === 최근 퇴거 ===
  const recentMoveOutsQuery = supabase
    .from("move_outs")
    .select("id, status, request_date, exit_date, completed_at, company:companies(name)")
    .order("created_at", { ascending: false })
    .limit(5);
  if (orgFilter) recentMoveOutsQuery.eq("org_id", orgFilter);
  const { data: recentMoveOuts } = await recentMoveOutsQuery;

  // === 기관별 비교 (Super Admin) ===
  let orgComparison: {
    name: string;
    total: number;
    occupied: number;
    rate: number;
  }[] = [];
  if (isSuperAdmin) {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .order("name");

    if (orgs) {
      const results = await Promise.all(
        orgs.map(async (org) => {
          const { count: total } = await supabase
            .from("spaces")
            .select("*", { count: "exact", head: true })
            .eq("org_id", org.id);
          const { count: occ } = await supabase
            .from("spaces")
            .select("*", { count: "exact", head: true })
            .eq("org_id", org.id)
            .eq("status", "occupied");
          const t = total ?? 0;
          const o = occ ?? 0;
          return {
            name: org.name,
            total: t,
            occupied: o,
            rate: t > 0 ? Math.round((o / t) * 100) : 0,
          };
        })
      );
      orgComparison = results;
    }
  }

  // === KPI 카드 데이터 ===
  const kpiCards = [
    ...(isSuperAdmin
      ? [{ title: "기관", value: orgCount ?? 0, icon: Building2 }]
      : []),
    {
      title: "입주율",
      value: `${occupancyRate}%`,
      sub: `${occupiedCount ?? 0} / ${spaceCount ?? 0}실`,
      icon: TrendingUp,
    },
    { title: "입주기업", value: activeCompanyCount ?? 0, icon: Factory },
    { title: "활성 계약", value: activeContractCount ?? 0, icon: FileText },
  ];

  const appStatusLabels: Record<string, string> = {
    submitted: "신청",
    reviewing: "검토중",
    approved: "승인",
    rejected: "반려",
  };

  const moveOutStatusLabels: Record<string, string> = {
    requested: "신청",
    inspecting: "시설점검",
    settling: "정산중",
    completed: "완료",
  };

  const statusVariant = (status: string) => {
    if (status === "approved" || status === "completed") return "default" as const;
    if (status === "rejected") return "destructive" as const;
    return "secondary" as const;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>

      {/* KPI 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              {"sub" in card && card.sub && (
                <p className="text-xs text-muted-foreground mt-1">
                  {card.sub}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 기업 상태 요약 + 계약 만료 예정 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 기업 상태 요약 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기업 상태 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {activeCompanyCount ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">입주</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {graduatedCount ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">졸업</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {terminatedCompanyCount ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">퇴거</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 계약 만료 예정 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">30일 내 만료 예정</CardTitle>
            <div className="flex items-center gap-2">
              {(isSuperAdmin || profile.role === "org_admin") && (
                <CheckExpiringButton />
              )}
              {(expiringContracts?.length ?? 0) > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {expiringContracts?.length}건
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {expiringContracts && expiringContracts.length > 0 ? (
              <div className="space-y-2">
                {expiringContracts.map((c: any) => {
                  const daysLeft = Math.ceil(
                    (new Date(c.end_date).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        {c.company?.name} - {c.space?.name}
                      </span>
                      <Badge
                        variant={daysLeft <= 7 ? "destructive" : "secondary"}
                      >
                        D-{daysLeft}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                만료 예정 계약이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 최근 입주/퇴거 타임라인 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 최근 입주 신청 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" />
              최근 입주 신청
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentApps && recentApps.length > 0 ? (
              <div className="space-y-3">
                {recentApps.map((app: any) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-medium">{app.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <Badge variant={statusVariant(app.status)}>
                      {appStatusLabels[app.status] || app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                최근 입주 신청이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>

        {/* 최근 퇴거 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LogOut className="h-4 w-4" />
              최근 퇴거
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentMoveOuts && recentMoveOuts.length > 0 ? (
              <div className="space-y-3">
                {recentMoveOuts.map((mo: any) => (
                  <div
                    key={mo.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-medium">{mo.company?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        퇴거예정일: {mo.exit_date || "-"}
                      </p>
                    </div>
                    <Badge variant={statusVariant(mo.status)}>
                      {moveOutStatusLabels[mo.status] || mo.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                최근 퇴거 내역이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 기관별 비교 (Super Admin only) */}
      {isSuperAdmin && orgComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              기관별 입주율 비교
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {orgComparison.map((org) => (
              <div key={org.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{org.name}</span>
                  <span className="text-muted-foreground">
                    {org.occupied}/{org.total}실 ({org.rate}%)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted">
                  <div
                    className="h-3 rounded-full bg-primary transition-all"
                    style={{ width: `${org.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
