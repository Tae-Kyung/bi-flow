import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { getOrgsCashSummary } from "@/actions/cash-flow";
import { PeriodFilter } from "@/components/cash-flow/granularity-filter";

function fmt(n: number) {
  if (Math.abs(n) >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (Math.abs(n) >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}천만`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}백만`;
  return n.toLocaleString("ko-KR");
}

export default async function OrgsCashFlowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const profile = await requireAuth();
  if (profile.role !== "super_admin") redirect("/cash-flow");

  const params = await searchParams;
  const from = params.from ?? "";
  const to = params.to ?? "";

  const orgs = await getOrgsCashSummary(from || undefined, to || undefined);

  const totalDeposit = orgs.reduce((s, o) => s + o.totalDeposit, 0);
  const totalWithdrawal = orgs.reduce((s, o) => s + o.totalWithdrawal, 0);
  const totalNet = totalDeposit - totalWithdrawal;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link href="/cash-flow" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">기관별 입출금 현황</h1>
      </div>

      {/* 기간 필터 */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodFilter from={from} to={to} />
        {(from || to) && (
          <Link href="/cash-flow/orgs" className="text-xs text-muted-foreground hover:underline">
            필터 초기화
          </Link>
        )}
      </div>

      {/* 전체 합계 카드 */}
      {orgs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">전체 총 입금</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{fmt(totalDeposit)}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{orgs.length}개 기관</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">전체 총 출금</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{fmt(totalWithdrawal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">전체 순 현금흐름</CardTitle>
              <ArrowUpDown className={`h-4 w-4 ${totalNet >= 0 ? "text-emerald-600" : "text-red-500"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalNet >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {totalNet >= 0 ? "+" : ""}{fmt(totalNet)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 기관별 테이블 */}
      {orgs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <ArrowUpDown className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">데이터가 없습니다. 먼저 현금출납부를 업로드하세요.</p>
            <Link href="/cash-flow/upload" className="text-primary text-sm underline">
              업로드 페이지로
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기관별 상세 현황</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">기관명</th>
                    <th className="text-right px-4 py-3 font-medium">거래 건수</th>
                    <th className="text-right px-4 py-3 font-medium">총 입금</th>
                    <th className="text-right px-4 py-3 font-medium">총 출금</th>
                    <th className="text-right px-4 py-3 font-medium">순 현금흐름</th>
                    <th className="text-right px-4 py-3 font-medium">분석 기간</th>
                    <th className="text-center px-4 py-3 font-medium">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org, i) => (
                    <tr key={org.orgId} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                      <td className="px-4 py-3 font-medium">{org.orgName}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {org.txCount.toLocaleString()}건
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-600">
                        {org.totalDeposit.toLocaleString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-500">
                        {org.totalWithdrawal.toLocaleString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={org.netFlow >= 0 ? "text-emerald-600" : "text-red-500"}>
                          {org.netFlow >= 0 ? "+" : ""}{org.netFlow.toLocaleString("ko-KR")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {org.dateFrom.slice(0, 7)} ~ {org.dateTo.slice(0, 7)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/cash-flow?org=${org.orgId}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`}
                          className="text-xs text-primary underline hover:no-underline"
                        >
                          상세 보기
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 입금 비중 바 */}
      {orgs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기관별 입금 비중</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orgs.map((org) => {
              const pct = totalDeposit > 0 ? (org.totalDeposit / totalDeposit) * 100 : 0;
              return (
                <div key={org.orgId} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{org.orgName}</span>
                    <span className="text-muted-foreground">
                      {fmt(org.totalDeposit)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
