import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, ArrowUpDown, Receipt, Upload
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getCashTimeSeries,
  getCashExpenseCategories,
  getCashIncomeCategories,
  getCashSummary,
  getOrgsMonthlySnapshot,
  type Granularity,
  type OrgMonthlySnapshot,
} from "@/actions/cash-flow";
import { CashFlowTimeChart } from "@/components/cash-flow/time-chart";
import { ExpenseCategoryCharts, IncomeCategoryCharts } from "@/components/cash-flow/category-charts";
import { GranularityFilter, PeriodFilter } from "@/components/cash-flow/granularity-filter";
import { OrgSelector } from "@/components/cash-flow/org-selector";

function fmtCompact(n: number) {
  if (Math.abs(n) >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 10_000).toLocaleString("ko-KR")}만`;
  return n.toLocaleString("ko-KR");
}

function changeRate(cur: number, prev: number): string | null {
  if (prev === 0) return cur > 0 ? "+100%" : null;
  const pct = ((cur - prev) / prev) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

function OrgMonthlySummaryCard({ data }: { data: OrgMonthlySnapshot[] }) {
  const now = new Date();
  const thisLabel = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastLabel = `${lastDate.getFullYear()}.${String(lastDate.getMonth() + 1).padStart(2, "0")}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">기관별 월간 현금흐름</CardTitle>
          <Badge variant="outline" className="text-xs">
            {lastLabel} vs {thisLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium" rowSpan={2}>기관</th>
                <th className="text-center px-2 py-1.5 font-medium border-b text-muted-foreground" colSpan={3}>{lastLabel}</th>
                <th className="text-center px-2 py-1.5 font-medium border-b" colSpan={3}>{thisLabel}</th>
                <th className="text-center px-2 py-1.5 font-medium border-b text-muted-foreground" rowSpan={2}>증감</th>
              </tr>
              <tr>
                <th className="text-right px-2 py-1.5 text-xs font-normal text-blue-600">입금</th>
                <th className="text-right px-2 py-1.5 text-xs font-normal text-red-500">출금</th>
                <th className="text-right px-2 py-1.5 text-xs font-normal">순흐름</th>
                <th className="text-right px-2 py-1.5 text-xs font-normal text-blue-600">입금</th>
                <th className="text-right px-2 py-1.5 text-xs font-normal text-red-500">출금</th>
                <th className="text-right px-2 py-1.5 text-xs font-normal">순흐름</th>
              </tr>
            </thead>
            <tbody>
              {data.map((org, i) => {
                const chg = changeRate(org.thisMonth.net, org.lastMonth.net);
                return (
                  <tr key={org.orgId} className={`border-b ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                      <Link href={`/cash-flow?org=${org.orgId}`} className="hover:underline text-primary">
                        {org.orgName}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-muted-foreground">
                      {org.lastMonth.count > 0 ? fmtCompact(org.lastMonth.deposit) : "-"}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-muted-foreground">
                      {org.lastMonth.count > 0 ? fmtCompact(org.lastMonth.withdrawal) : "-"}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-muted-foreground">
                      {org.lastMonth.count > 0 ? (
                        <span className={org.lastMonth.net >= 0 ? "text-emerald-600" : "text-red-500"}>
                          {org.lastMonth.net >= 0 ? "+" : ""}{fmtCompact(org.lastMonth.net)}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-blue-600">
                      {org.thisMonth.count > 0 ? fmtCompact(org.thisMonth.deposit) : "-"}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-red-500">
                      {org.thisMonth.count > 0 ? fmtCompact(org.thisMonth.withdrawal) : "-"}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono">
                      {org.thisMonth.count > 0 ? (
                        <span className={org.thisMonth.net >= 0 ? "text-emerald-600" : "text-red-500"}>
                          {org.thisMonth.net >= 0 ? "+" : ""}{fmtCompact(org.thisMonth.net)}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-2 py-2.5 text-center text-xs">
                      {chg ? (
                        <Badge variant={chg.startsWith("+") ? "default" : "destructive"} className="text-xs px-1.5 py-0">
                          {chg}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function formatAmount(n: number) {
  if (Math.abs(n) >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (Math.abs(n) >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}천만`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}백만`;
  return `${n.toLocaleString("ko-KR")}`;
}

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const profile = await requireAuth();
  if (profile.role === "tenant") {
    return <div className="text-sm text-muted-foreground">접근 권한이 없습니다.</div>;
  }

  const params = await searchParams;
  const gran = (params.gran ?? "monthly") as Granularity;
  const from = params.from ?? "";
  const to = params.to ?? "";

  // org 선택
  const supabase = await createClient();
  let orgId = params.org ?? profile.org_id ?? "";

  if (profile.role === "super_admin" && !params.org) {
    // 데이터가 있는 기관 우선, 없으면 첫 번째 기관
    const { data: withData } = await supabase
      .from("cash_transactions")
      .select("org_id")
      .limit(1);
    if (withData?.[0]?.org_id) {
      orgId = withData[0].org_id;
    } else {
      const { data: orgs } = await supabase.from("organizations").select("id").order("name").limit(1);
      orgId = orgs?.[0]?.id ?? "";
    }
  }

  // 조직 목록 (super_admin용)
  let orgs: { id: string; name: string }[] = [];
  if (profile.role === "super_admin") {
    const { data } = await supabase.from("organizations").select("id, name").order("name");
    orgs = data ?? [];
  }

  // 데이터가 있는지 확인
  const { count: txCount, error: countErr } = orgId
    ? await supabase
        .from("cash_transactions")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
    : { count: 0, error: null };

  console.log("[cash-flow] orgId:", orgId, "role:", profile.role, "txCount:", txCount, "err:", countErr?.message);

  if (!orgId || !txCount) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">현금 흐름 분석</h1>
          <Button asChild>
            <Link href="/cash-flow/upload">
              <Upload className="h-4 w-4 mr-2" />
              데이터 업로드
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <ArrowUpDown className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              아직 업로드된 현금출납부 데이터가 없습니다.
            </p>
            <Button asChild>
              <Link href="/cash-flow/upload">현금출납부 TXT 업로드</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 병렬 데이터 조회
  const [summary, timeSeries, expenseCats, incomeCats, monthlySnapshot] = await Promise.all([
    getCashSummary(orgId, from || undefined, to || undefined),
    getCashTimeSeries(orgId, gran, from || undefined, to || undefined),
    getCashExpenseCategories(orgId, from || undefined, to || undefined),
    getCashIncomeCategories(orgId, from || undefined, to || undefined),
    profile.role === "super_admin" ? getOrgsMonthlySnapshot() : Promise.resolve([] as OrgMonthlySnapshot[]),
  ]);

  const kpiCards = [
    {
      title: "총 입금",
      value: formatAmount(summary.totalDeposit),
      sub: `${summary.txCount.toLocaleString()}건`,
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      title: "총 출금",
      value: formatAmount(summary.totalWithdrawal),
      icon: TrendingDown,
      color: "text-red-500",
    },
    {
      title: "순 현금흐름",
      value: `${summary.netFlow >= 0 ? "+" : ""}${formatAmount(summary.netFlow)}`,
      icon: ArrowUpDown,
      color: summary.netFlow >= 0 ? "text-emerald-600" : "text-red-500",
    },
    {
      title: "분석 기간",
      value: summary.dateFrom ? `${summary.dateFrom.slice(0, 7)}` : "-",
      sub: `~ ${summary.dateTo.slice(0, 7)}`,
      icon: Receipt,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">현금 흐름 분석</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 기관 선택 (super admin) */}
          {profile.role === "super_admin" && orgs.length > 0 && (
            <OrgSelector orgs={orgs} current={orgId} />
          )}
          {profile.role === "super_admin" && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/cash-flow/orgs">기관별 현황</Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/cash-flow/upload">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              업로드
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/cash-flow/transactions">거래 내역</Link>
          </Button>
        </div>
      </div>

      {/* 기간·단위 필터 */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodFilter from={from} to={to} />
        <GranularityFilter current={gran} />
        {(from || to) && (
          <Link
            href={`/cash-flow${orgId !== profile.org_id ? `?org=${orgId}` : ""}`}
            className="text-xs text-muted-foreground hover:underline"
          >
            필터 초기화
          </Link>
        )}
      </div>

      {/* KPI 카드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              {card.sub && <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 기관별 월간 현금흐름 요약 (super_admin only) */}
      {profile.role === "super_admin" && monthlySnapshot.length > 0 && (
        <OrgMonthlySummaryCard data={monthlySnapshot} />
      )}

      {/* 시계열 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">입출금 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <CashFlowTimeChart data={timeSeries} />
        </CardContent>
      </Card>

      {/* 비목 분석 */}
      <Tabs defaultValue="expense">
        <TabsList>
          <TabsTrigger value="expense">지출 비목별</TabsTrigger>
          <TabsTrigger value="income">수입 항목별</TabsTrigger>
        </TabsList>

        <TabsContent value="expense">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">지출 비목 분석</CardTitle>
                <Badge variant="secondary">
                  총 {summary.totalWithdrawal.toLocaleString("ko-KR")}원
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ExpenseCategoryCharts data={expenseCats} />
              {/* 비목 상세 테이블 */}
              <div className="mt-6 border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">비목</th>
                      <th className="text-right px-4 py-2 font-medium">건수</th>
                      <th className="text-right px-4 py-2 font-medium">금액</th>
                      <th className="text-right px-4 py-2 font-medium">비중</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseCats.map((cat, i) => {
                      const qs = new URLSearchParams({ type: "expense", category: cat.name });
                      if (profile.role === "super_admin") qs.set("org", orgId);
                      if (from) qs.set("from", from);
                      if (to) qs.set("to", to);
                      return (
                        <tr key={cat.name} className={`border-b cursor-pointer hover:bg-muted/40 transition-colors ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                          <td className="px-4 py-2">
                            <Link href={`/cash-flow/transactions?${qs}`} className="block w-full hover:underline text-primary">
                              {cat.name}
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground">{cat.count}</td>
                          <td className="px-4 py-2 text-right font-mono">
                            {cat.amount.toLocaleString("ko-KR")}
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground">
                            {summary.totalWithdrawal > 0
                              ? `${((cat.amount / summary.totalWithdrawal) * 100).toFixed(1)}%`
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">수입 항목 분석</CardTitle>
                <Badge variant="secondary">
                  총 {summary.totalDeposit.toLocaleString("ko-KR")}원
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <IncomeCategoryCharts data={incomeCats} />
              <div className="mt-6 border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">항목</th>
                      <th className="text-right px-4 py-2 font-medium">건수</th>
                      <th className="text-right px-4 py-2 font-medium">금액</th>
                      <th className="text-right px-4 py-2 font-medium">비중</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeCats.map((cat, i) => {
                      const qs = new URLSearchParams({ type: "income", category: cat.name });
                      if (profile.role === "super_admin") qs.set("org", orgId);
                      if (from) qs.set("from", from);
                      if (to) qs.set("to", to);
                      return (
                        <tr key={cat.name} className={`border-b cursor-pointer hover:bg-muted/40 transition-colors ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                          <td className="px-4 py-2">
                            <Link href={`/cash-flow/transactions?${qs}`} className="block w-full hover:underline text-primary">
                              {cat.name}
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground">{cat.count}</td>
                          <td className="px-4 py-2 text-right font-mono">
                            {cat.amount.toLocaleString("ko-KR")}
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground">
                            {summary.totalDeposit > 0
                              ? `${((cat.amount / summary.totalDeposit) * 100).toFixed(1)}%`
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

