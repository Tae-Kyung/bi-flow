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
  LogOut,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { CheckExpiringButton } from "@/components/dashboard/check-expiring-button";
import Link from "next/link";

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
    .select("*, company:companies(name), space:spaces(name), org:organizations(name)")
    .eq("status", "active")
    .gte("end_date", today)
    .lte("end_date", thirtyDaysLater)
    .order("end_date", { ascending: true });
  if (orgFilter) expiringQuery.eq("org_id", orgFilter);
  const { data: expiringContracts } = await expiringQuery;

  // === 최근 퇴거 ===
  const recentMoveOutsQuery = supabase
    .from("move_outs")
    .select("id, status, request_date, exit_date, completed_at, company:companies(name), org:organizations(name)")
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
    active: number;
    graduated: number;
    terminated: number;
  }[] = [];
  if (isSuperAdmin) {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .order("name");

    if (orgs) {
      const results = await Promise.all(
        orgs.map(async (org) => {
          const [
            { count: total },
            { count: occ },
            { count: active },
            { count: graduated },
            { count: terminated },
          ] = await Promise.all([
            supabase.from("spaces").select("*", { count: "exact", head: true }).eq("org_id", org.id),
            supabase.from("spaces").select("*", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "occupied"),
            supabase.from("companies").select("*", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "active"),
            supabase.from("companies").select("*", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "graduated"),
            supabase.from("companies").select("*", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "terminated"),
          ]);
          const t = total ?? 0;
          const o = occ ?? 0;
          return {
            name: org.name,
            total: t,
            occupied: o,
            rate: t > 0 ? Math.round((o / t) * 100) : 0,
            active: active ?? 0,
            graduated: graduated ?? 0,
            terminated: terminated ?? 0,
          };
        })
      );
      orgComparison = results;
    }
  }

  // === 기관별 월별 수입지출 현황 ===
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  const pad = (n: number) => String(n).padStart(2, "0");
  // toISOString()은 UTC 변환되어 날짜가 하루 밀리므로, 직접 로컬 날짜 문자열 생성
  const thisMonthStart = `${y}-${pad(m + 1)}-01`;
  const lastMonthYear = m === 0 ? y - 1 : y;
  const lastMonth = m === 0 ? 12 : m;
  const lastMonthStart = `${lastMonthYear}-${pad(lastMonth)}-01`;
  const lastMonthLastDay = new Date(y, m, 0).getDate();
  const lastMonthEnd = `${lastMonthYear}-${pad(lastMonth)}-${pad(lastMonthLastDay)}`;
  const thisMonthLabel = `${y}년 ${m + 1}월`;
  const lastMonthLabel = `${lastMonthYear}년 ${lastMonth}월`;

  // Supabase 기본 1000행 제한 우회: 페이지네이션
  let cashFlowRaw: { org_id: string; approved_at: string; deposit: number; withdrawal: number }[] = [];
  {
    let from = 0;
    const PAGE = 1000;
    while (true) {
      let q = supabase
        .from("cash_transactions")
        .select("org_id, approved_at, deposit, withdrawal")
        .gte("approved_at", lastMonthStart)
        .lte("approved_at", today)
        .range(from, from + PAGE - 1);
      if (orgFilter) q = q.eq("org_id", orgFilter);
      const { data } = await q;
      if (!data || data.length === 0) break;
      cashFlowRaw.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  // org_id별, 기간별 집계
  type MonthStat = { deposit: number; withdrawal: number };
  const cashByOrg = new Map<string, { last: MonthStat; current: MonthStat }>();
  for (const row of cashFlowRaw ?? []) {
    const oid = row.org_id as string;
    if (!cashByOrg.has(oid)) cashByOrg.set(oid, { last: { deposit: 0, withdrawal: 0 }, current: { deposit: 0, withdrawal: 0 } });
    const entry = cashByOrg.get(oid)!;
    const isLastMonth = row.approved_at >= lastMonthStart && row.approved_at <= lastMonthEnd;
    const target = isLastMonth ? entry.last : entry.current;
    target.deposit += row.deposit ?? 0;
    target.withdrawal += row.withdrawal ?? 0;
  }

  // 표시용 데이터: super_admin은 모든 기관, org_admin은 자기 기관
  type OrgCashRow = { orgId: string; orgName: string; last: MonthStat; current: MonthStat };
  let orgCashRows: OrgCashRow[] = [];
  if (isSuperAdmin && orgComparison.length > 0) {
    // orgComparison에서 name 순서 재사용, org id는 별도 조회 필요
    const { data: orgsForCash } = await supabase.from("organizations").select("id, name").order("name");
    orgCashRows = (orgsForCash ?? [])
      .filter((o) => cashByOrg.has(o.id))
      .map((o) => ({
        orgId: o.id,
        orgName: o.name,
        last: cashByOrg.get(o.id)!.last,
        current: cashByOrg.get(o.id)!.current,
      }));
  } else if (orgFilter) {
    const entry = cashByOrg.get(orgFilter);
    const { data: myOrg } = await supabase.from("organizations").select("name").eq("id", orgFilter).single();
    if (entry) orgCashRows = [{ orgId: orgFilter, orgName: myOrg?.name ?? "", last: entry.last, current: entry.current }];
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

      {/* 기업 상태 요약 + 기관별 입주율 비교 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 기업 상태 요약 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기업 상태 요약</CardTitle>
          </CardHeader>
          <CardContent>
            {isSuperAdmin && orgComparison.length > 0 ? (
              <div className="space-y-3">
                {/* 전체 합계 */}
                <div className="grid grid-cols-3 gap-2 text-center pb-3 border-b">
                  <div>
                    <div className="text-xl font-bold text-green-600">{activeCompanyCount ?? 0}</div>
                    <p className="text-xs text-muted-foreground">입주</p>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-600">{graduatedCount ?? 0}</div>
                    <p className="text-xs text-muted-foreground">졸업</p>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-600">{terminatedCompanyCount ?? 0}</div>
                    <p className="text-xs text-muted-foreground">퇴거</p>
                  </div>
                </div>
                {/* 기관별 */}
                {orgComparison.map((org) => (
                  <div key={org.name} className="grid grid-cols-4 items-center gap-2 text-sm">
                    <span className="text-muted-foreground truncate" title={org.name}>{org.name}</span>
                    <span className="text-center font-medium text-green-600">{org.active}</span>
                    <span className="text-center font-medium text-blue-600">{org.graduated}</span>
                    <span className="text-center font-medium text-red-600">{org.terminated}</span>
                  </div>
                ))}
                <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground pt-1 border-t">
                  <span />
                  <span className="text-center">입주</span>
                  <span className="text-center">졸업</span>
                  <span className="text-center">퇴거</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{activeCompanyCount ?? 0}</div>
                  <p className="text-xs text-muted-foreground">입주</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{graduatedCount ?? 0}</div>
                  <p className="text-xs text-muted-foreground">졸업</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{terminatedCompanyCount ?? 0}</div>
                  <p className="text-xs text-muted-foreground">퇴거</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 기관별 입주율 비교 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              기관별 입주율 비교
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {orgComparison.length > 0 ? (
              orgComparison.map((org) => (
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
              ))
            ) : (
              <p className="text-sm text-muted-foreground">기관 데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 30일 내 만료 예정 + 최근 퇴거 */}
      <div className="grid gap-4 md:grid-cols-2">
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
                      <div>
                        <p className="font-medium">
                          {c.company?.name} · {c.space?.name}
                        </p>
                        {isSuperAdmin && c.org?.name && (
                          <p className="text-xs text-muted-foreground">{c.org.name}</p>
                        )}
                      </div>
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
                        {isSuperAdmin && mo.org?.name && (
                          <span>{mo.org.name} · </span>
                        )}
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

      {/* 기관별 월별 수입지출 현황 */}
      {orgCashRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              기관별 수입·지출 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">기관</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground" colSpan={3}>
                      {lastMonthLabel}
                    </th>
                    <th className="w-px bg-border" />
                    <th className="text-right px-4 py-2 font-medium" colSpan={3}>
                      {thisMonthLabel} (현재)
                    </th>
                  </tr>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-1" />
                    <th className="text-right px-4 py-1">수입</th>
                    <th className="text-right px-4 py-1">지출</th>
                    <th className="text-right px-4 py-1">순현금</th>
                    <th className="w-px bg-border" />
                    <th className="text-right px-4 py-1">수입</th>
                    <th className="text-right px-4 py-1">지출</th>
                    <th className="text-right px-4 py-1">순현금</th>
                  </tr>
                </thead>
                <tbody>
                  {orgCashRows.map((row, i) => {
                    const lastNet = row.last.deposit - row.last.withdrawal;
                    const curNet = row.current.deposit - row.current.withdrawal;
                    return (
                      <tr key={row.orgId} className={`border-b ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                        <td className="px-4 py-2 font-medium whitespace-nowrap">
                          <Link
                            href={profile.role === "super_admin" ? `/cash-flow?org=${row.orgId}` : "/cash-flow"}
                            className="hover:underline text-primary"
                          >
                            {row.orgName}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-blue-600 text-xs">
                          {row.last.deposit > 0 ? row.last.deposit.toLocaleString("ko-KR") : "-"}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-red-500 text-xs">
                          {row.last.withdrawal > 0 ? row.last.withdrawal.toLocaleString("ko-KR") : "-"}
                        </td>
                        <td className={`px-4 py-2 text-right font-mono text-xs font-medium ${lastNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {lastNet !== 0 ? (lastNet >= 0 ? "+" : "") + lastNet.toLocaleString("ko-KR") : "-"}
                        </td>
                        <td className="w-px bg-border" />
                        <td className="px-4 py-2 text-right font-mono text-blue-600 text-xs">
                          {row.current.deposit > 0 ? row.current.deposit.toLocaleString("ko-KR") : "-"}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-red-500 text-xs">
                          {row.current.withdrawal > 0 ? row.current.withdrawal.toLocaleString("ko-KR") : "-"}
                        </td>
                        <td className={`px-4 py-2 text-right font-mono text-xs font-medium ${curNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {curNet !== 0 ? (curNet >= 0 ? "+" : "") + curNet.toLocaleString("ko-KR") : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {orgCashRows.length > 1 && (() => {
                  const totLast = orgCashRows.reduce((a, r) => ({ deposit: a.deposit + r.last.deposit, withdrawal: a.withdrawal + r.last.withdrawal }), { deposit: 0, withdrawal: 0 });
                  const totCur = orgCashRows.reduce((a, r) => ({ deposit: a.deposit + r.current.deposit, withdrawal: a.withdrawal + r.current.withdrawal }), { deposit: 0, withdrawal: 0 });
                  const totLastNet = totLast.deposit - totLast.withdrawal;
                  const totCurNet = totCur.deposit - totCur.withdrawal;
                  return (
                    <tfoot className="border-t bg-muted/50 font-medium text-xs">
                      <tr>
                        <td className="px-4 py-2">합계</td>
                        <td className="px-4 py-2 text-right font-mono text-blue-600">{totLast.deposit.toLocaleString("ko-KR")}</td>
                        <td className="px-4 py-2 text-right font-mono text-red-500">{totLast.withdrawal.toLocaleString("ko-KR")}</td>
                        <td className={`px-4 py-2 text-right font-mono font-medium ${totLastNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {(totLastNet >= 0 ? "+" : "") + totLastNet.toLocaleString("ko-KR")}
                        </td>
                        <td className="w-px bg-border" />
                        <td className="px-4 py-2 text-right font-mono text-blue-600">{totCur.deposit.toLocaleString("ko-KR")}</td>
                        <td className="px-4 py-2 text-right font-mono text-red-500">{totCur.withdrawal.toLocaleString("ko-KR")}</td>
                        <td className={`px-4 py-2 text-right font-mono font-medium ${totCurNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {(totCurNet >= 0 ? "+" : "") + totCurNet.toLocaleString("ko-KR")}
                        </td>
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
