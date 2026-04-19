import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getCashTransactions, getCashExpenseCategories, getCashIncomeCategories } from "@/actions/cash-flow";
import { TransactionDeleteButton } from "@/components/cash-flow/transaction-delete-button";
import { TransactionFilters } from "@/components/cash-flow/transaction-filters";

const EXPENSE_BADGE: Record<string, string> = {
  인건비: "destructive",
  "회의·업무추진비": "secondary",
  여비: "outline",
  운영비: "secondary",
  연구수당: "outline",
  기업지원비: "secondary",
  시설보수비: "outline",
  "집기·비품": "secondary",
  부가세: "outline",
  세금: "outline",
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const profile = await requireAuth();
  if (profile.role === "tenant") {
    return <div className="text-sm text-muted-foreground">접근 권한이 없습니다.</div>;
  }

  const params = await searchParams;
  const from = params.from ?? "";
  const to = params.to ?? "";
  const type = (params.type ?? "") as "income" | "expense" | "";
  const category = params.category ?? "";
  const page = parseInt(params.page ?? "0");

  const supabase = await createClient();

  // 기관 목록 (super_admin만 필요)
  let allOrgs: { id: string; name: string }[] = [];
  let orgId = profile.org_id ?? "";
  let orgName = "";

  if (profile.role === "super_admin") {
    const { data: orgs } = await supabase.from("organizations").select("id, name").order("name");
    allOrgs = orgs ?? [];
    orgId = params.org ?? orgs?.[0]?.id ?? "";
    orgName = allOrgs.find((o) => o.id === orgId)?.name ?? "";
  } else {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();
    orgName = org?.name ?? "";
  }

  const { data: transactions } = await getCashTransactions(
    orgId,
    from || undefined,
    to || undefined,
    category || undefined,
    type || undefined,
    page
  );

  // 분류 목록 (지출/수입 비목)
  const [expenseCats, incomeCats] = orgId
    ? await Promise.all([getCashExpenseCategories(orgId), getCashIncomeCategories(orgId)])
    : [[], []];
  const expenseCategories = expenseCats.map((c) => c.name);
  const incomeCategories = incomeCats.map((c) => c.name);
  const categoryOptions = type === "expense" ? expenseCategories : type === "income" ? incomeCategories : [...expenseCategories, ...incomeCategories];

  // 현재 필터 파라미터에서 org를 포함한 URLSearchParams 생성 헬퍼
  function buildParams(overrides: Record<string, string>) {
    const base: Record<string, string> = {};
    if (orgId && profile.role === "super_admin") base.org = orgId;
    if (from) base.from = from;
    if (to) base.to = to;
    if (type) base.type = type;
    if (category) base.category = category;
    return new URLSearchParams({ ...base, ...overrides }).toString();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cash-flow" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">거래 내역</h1>
          <p className="text-sm text-muted-foreground">
            {[
              orgName,
              from || to ? `${from || ""}~${to || ""}` : "전체 기간",
              type === "expense" ? "지출" : type === "income" ? "수입" : "",
              category,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {/* super_admin 기관 선택 */}
      {profile.role === "super_admin" && allOrgs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">기관 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <form method="get" className="flex gap-2 flex-wrap">
              {/* 필터 파라미터 유지 */}
              {from && <input type="hidden" name="from" value={from} />}
              {to && <input type="hidden" name="to" value={to} />}
              {type && <input type="hidden" name="type" value={type} />}
              {category && <input type="hidden" name="category" value={category} />}
              {allOrgs.map((org) => (
                <button
                  key={org.id}
                  name="org"
                  value={org.id}
                  type="submit"
                  className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                    orgId === org.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {org.name}
                </button>
              ))}
            </form>
          </CardContent>
        </Card>
      )}

      {/* 필터 */}
      <TransactionFilters
        orgId={orgId}
        isSuperAdmin={profile.role === "super_admin"}
        from={from}
        to={to}
        type={type}
        category={category}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            거래 내역{" "}
            <span className="font-normal text-muted-foreground">
              ({transactions.length}건{transactions.length === 50 ? " · 다음 페이지 있음" : ""})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!orgId ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              기관을 선택해 주세요
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium whitespace-nowrap">날짜</th>
                    <th className="text-left px-4 py-2 font-medium whitespace-nowrap">계정명</th>
                    <th className="text-left px-4 py-2 font-medium whitespace-nowrap">적요</th>
                    <th className="text-left px-4 py-2 font-medium whitespace-nowrap">분류</th>
                    <th className="text-right px-4 py-2 font-medium whitespace-nowrap">입금</th>
                    <th className="text-right px-4 py-2 font-medium whitespace-nowrap">출금</th>
                    <th className="text-right px-4 py-2 font-medium whitespace-nowrap">잔액</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: any, i: number) => (
                    <tr key={tx.id} className={`border-b ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                        {tx.approved_at}
                      </td>
                      <td
                        className="px-4 py-2 whitespace-nowrap max-w-32 truncate"
                        title={tx.acct_name}
                      >
                        {tx.acct_name?.split("/")?.[0] ?? tx.acct_name}
                      </td>
                      <td className="px-4 py-2 max-w-64 truncate" title={tx.description}>
                        {tx.description}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {tx.expense_category && (
                          <Badge
                            variant={(EXPENSE_BADGE[tx.expense_category] as any) ?? "outline"}
                            className="text-xs"
                          >
                            {tx.expense_category}
                          </Badge>
                        )}
                        {tx.income_category && (
                          <Badge variant="secondary" className="text-xs">
                            {tx.income_category}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-blue-600">
                        {tx.deposit > 0 ? tx.deposit.toLocaleString("ko-KR") : ""}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-red-500">
                        {tx.withdrawal > 0 ? tx.withdrawal.toLocaleString("ko-KR") : ""}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                        {tx.balance > 0 ? tx.balance.toLocaleString("ko-KR") : ""}
                      </td>
                      <td className="px-2 py-2">
                        <TransactionDeleteButton id={tx.id} />
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                        거래 내역이 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      {orgId && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 0 && (
            <Link
              href={`/cash-flow/transactions?${buildParams({ page: String(page - 1) })}`}
              className="rounded border px-3 py-1 hover:bg-muted"
            >
              이전
            </Link>
          )}
          <span className="text-muted-foreground">페이지 {page + 1}</span>
          {transactions.length === 50 && (
            <Link
              href={`/cash-flow/transactions?${buildParams({ page: String(page + 1) })}`}
              className="rounded border px-3 py-1 hover:bg-muted"
            >
              다음
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
