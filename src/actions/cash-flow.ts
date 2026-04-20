"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { parseCashTxt } from "@/lib/parse-cash-txt";
import { revalidatePath } from "next/cache";

// ── 업로드 ─────────────────────────────────────────────
export async function uploadCashFile(formData: FormData) {
  const profile = await requireAuth();
  if (profile.role === "tenant") throw new Error("권한 없음");

  const file = formData.get("file") as File | null;
  const orgId = formData.get("org_id") as string | null;

  if (!file) throw new Error("파일이 없습니다");
  if (!orgId) throw new Error("기관을 선택하세요");

  const buffer = await file.arrayBuffer();
  console.log("[cash-upload] buffer size:", buffer.byteLength, "file:", file.name);

  let rows;
  try {
    rows = parseCashTxt(buffer, file.name);
  } catch (parseErr: any) {
    console.error("[cash-upload] parse error:", parseErr);
    throw new Error(`파싱 오류: ${parseErr?.message}`);
  }

  console.log("[cash-upload] parsed rows:", rows.length);
  if (rows.length === 0) throw new Error("파싱된 데이터가 없습니다 — 파일 형식/인코딩을 확인하세요");

  const supabase = await createClient();

  // 같은 파일명 기존 데이터 삭제 후 재삽입
  const { error: delErr } = await supabase
    .from("cash_transactions")
    .delete()
    .eq("org_id", orgId)
    .eq("file_name", file.name);
  if (delErr) console.warn("[cash-upload] delete warn:", delErr.message);

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map((r) => ({
      ...r,
      org_id: orgId,
      file_name: file.name,
    }));
    const { error } = await supabase.from("cash_transactions").insert(chunk);
    if (error) {
      console.error("[cash-upload] insert error:", error);
      throw new Error(`DB 오류: ${error.message}`);
    }
  }

  revalidatePath("/cash-flow");
  return { count: rows.length };
}

// ── 조회 ─────────────────────────────────────────────
export type Granularity = "daily" | "weekly" | "monthly" | "quarterly";

export interface TimeSeriesPoint {
  period: string;
  deposit: number;
  withdrawal: number;
  net: number;
}

export interface CategoryPoint {
  name: string;
  amount: number;
  count: number;
}

export interface CashSummary {
  totalDeposit: number;
  totalWithdrawal: number;
  netFlow: number;
  txCount: number;
  dateFrom: string;
  dateTo: string;
}

// Supabase 기본 1000행 제한 우회: 매 페이지마다 새 쿼리 생성
async function fetchAll<T>(
  buildQuery: () => any,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function periodKey(date: string, gran: Granularity): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  if (gran === "daily") return date;
  if (gran === "monthly") return `${y}-${m}`;
  if (gran === "quarterly") return `${y}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
  // weekly: ISO week
  const jan1 = new Date(y, 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${y}-W${String(week).padStart(2, "0")}`;
}

export async function getCashTimeSeries(
  orgId: string,
  gran: Granularity,
  from?: string,
  to?: string
): Promise<TimeSeriesPoint[]> {
  const supabase = await createClient();

  const data = await fetchAll<{ approved_at: string; deposit: number; withdrawal: number }>(() => {
    let q = supabase
      .from("cash_transactions")
      .select("approved_at, deposit, withdrawal")
      .eq("org_id", orgId)
      .order("approved_at", { ascending: true });
    if (from) q = q.gte("approved_at", from);
    if (to) q = q.lte("approved_at", to);
    return q;
  });
  if (data.length === 0) return [];

  const map = new Map<string, { deposit: number; withdrawal: number }>();
  for (const row of data) {
    if (!row.approved_at) continue;
    const key = periodKey(row.approved_at, gran);
    const cur = map.get(key) ?? { deposit: 0, withdrawal: 0 };
    cur.deposit += row.deposit ?? 0;
    cur.withdrawal += row.withdrawal ?? 0;
    map.set(key, cur);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({
      period,
      deposit: v.deposit,
      withdrawal: v.withdrawal,
      net: v.deposit - v.withdrawal,
    }));
}

export async function getCashExpenseCategories(
  orgId: string,
  from?: string,
  to?: string
): Promise<CategoryPoint[]> {
  const supabase = await createClient();

  const data = await fetchAll<{ expense_category: string; withdrawal: number }>(() => {
    let q = supabase
      .from("cash_transactions")
      .select("expense_category, withdrawal")
      .eq("org_id", orgId)
      .gt("withdrawal", 0);
    if (from) q = q.gte("approved_at", from);
    if (to) q = q.lte("approved_at", to);
    return q;
  });
  if (data.length === 0) return [];

  const map = new Map<string, { amount: number; count: number }>();
  for (const row of data) {
    const cat = row.expense_category || "기타";
    const cur = map.get(cat) ?? { amount: 0, count: 0 };
    cur.amount += row.withdrawal ?? 0;
    cur.count += 1;
    map.set(cat, cur);
  }

  return Array.from(map.entries())
    .sort(([, a], [, b]) => b.amount - a.amount)
    .map(([name, v]) => ({ name, ...v }));
}

export async function getCashIncomeCategories(
  orgId: string,
  from?: string,
  to?: string
): Promise<CategoryPoint[]> {
  const supabase = await createClient();

  const data = await fetchAll<{ income_category: string; deposit: number }>(() => {
    let q = supabase
      .from("cash_transactions")
      .select("income_category, deposit")
      .eq("org_id", orgId)
      .gt("deposit", 0);
    if (from) q = q.gte("approved_at", from);
    if (to) q = q.lte("approved_at", to);
    return q;
  });
  if (data.length === 0) return [];

  const map = new Map<string, { amount: number; count: number }>();
  for (const row of data) {
    const cat = row.income_category || "기타수입";
    const cur = map.get(cat) ?? { amount: 0, count: 0 };
    cur.amount += row.deposit ?? 0;
    cur.count += 1;
    map.set(cat, cur);
  }

  return Array.from(map.entries())
    .sort(([, a], [, b]) => b.amount - a.amount)
    .map(([name, v]) => ({ name, ...v }));
}

export async function getCashSummary(
  orgId: string,
  from?: string,
  to?: string
): Promise<CashSummary> {
  const supabase = await createClient();

  const data = await fetchAll<{ deposit: number; withdrawal: number; approved_at: string }>(() => {
    let q = supabase
      .from("cash_transactions")
      .select("deposit, withdrawal, approved_at")
      .eq("org_id", orgId);
    if (from) q = q.gte("approved_at", from);
    if (to) q = q.lte("approved_at", to);
    return q;
  });
  if (data.length === 0) return { totalDeposit: 0, totalWithdrawal: 0, netFlow: 0, txCount: 0, dateFrom: "", dateTo: "" };

  let totalDeposit = 0;
  let totalWithdrawal = 0;
  let dateFrom = "";
  let dateTo = "";

  for (const row of data) {
    totalDeposit += row.deposit ?? 0;
    totalWithdrawal += row.withdrawal ?? 0;
    if (row.approved_at) {
      if (!dateFrom || row.approved_at < dateFrom) dateFrom = row.approved_at;
      if (!dateTo || row.approved_at > dateTo) dateTo = row.approved_at;
    }
  }

  return {
    totalDeposit,
    totalWithdrawal,
    netFlow: totalDeposit - totalWithdrawal,
    txCount: data.length,
    dateFrom,
    dateTo,
  };
}

export async function getCashTransactions(
  orgId: string,
  from?: string,
  to?: string,
  category?: string,
  type?: "income" | "expense",
  page = 0,
  pageSize = 50
) {
  const supabase = await createClient();

  let query = supabase
    .from("cash_transactions")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .order("approved_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (from) query = query.gte("approved_at", from);
  if (to) query = query.lte("approved_at", to);
  if (type === "income") query = query.gt("deposit", 0);
  if (type === "expense") query = query.gt("withdrawal", 0);
  if (category && type === "expense") query = query.eq("expense_category", category);
  if (category && type === "income") query = query.eq("income_category", category);
  if (category && !type) query = query.or(`expense_category.eq.${category},income_category.eq.${category}`);

  const { data, error, count } = await query;

  // 동일 필터로 합계 조회 (페이징 없이)
  let sumQuery = supabase
    .from("cash_transactions")
    .select("deposit.sum(), withdrawal.sum()")
    .eq("org_id", orgId);

  if (from) sumQuery = sumQuery.gte("approved_at", from);
  if (to) sumQuery = sumQuery.lte("approved_at", to);
  if (type === "income") sumQuery = sumQuery.gt("deposit", 0);
  if (type === "expense") sumQuery = sumQuery.gt("withdrawal", 0);
  if (category && type === "expense") sumQuery = sumQuery.eq("expense_category", category);
  if (category && type === "income") sumQuery = sumQuery.eq("income_category", category);
  if (category && !type) sumQuery = sumQuery.or(`expense_category.eq.${category},income_category.eq.${category}`);

  const { data: sumData } = await sumQuery.single();
  const sumRow = sumData as Record<string, number> | null;
  const totalDeposit = sumRow?.deposit ?? 0;
  const totalWithdrawal = sumRow?.withdrawal ?? 0;

  return { data: data ?? [], error, totalCount: count ?? 0, totalDeposit, totalWithdrawal };
}

export async function getUploadedFiles(orgId: string) {
  const supabase = await createClient();

  const data = await fetchAll<{ file_name: string; uploaded_at: string; approved_at: string }>(() =>
    supabase
      .from("cash_transactions")
      .select("file_name, uploaded_at, approved_at")
      .eq("org_id", orgId)
      .order("uploaded_at", { ascending: false })
  );

  const map = new Map<string, { file_name: string; uploaded_at: string; count: number; dateFrom: string; dateTo: string }>();
  for (const row of data) {
    const key = row.file_name ?? "";
    const cur = map.get(key) ?? { file_name: key, uploaded_at: row.uploaded_at ?? "", count: 0, dateFrom: "", dateTo: "" };
    cur.count += 1;
    if (row.approved_at) {
      if (!cur.dateFrom || row.approved_at < cur.dateFrom) cur.dateFrom = row.approved_at;
      if (!cur.dateTo || row.approved_at > cur.dateTo) cur.dateTo = row.approved_at;
    }
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
}

export interface OrgCashSummary extends CashSummary {
  orgId: string;
  orgName: string;
}

export async function getOrgsCashSummary(from?: string, to?: string): Promise<OrgCashSummary[]> {
  const supabase = await createClient();

  const { data: orgs } = await supabase.from("organizations").select("id, name").order("name");
  if (!orgs?.length) return [];

  // org_id별 집계
  const data = await fetchAll<{ org_id: string; deposit: number; withdrawal: number; approved_at: string }>(() => {
    let q = supabase
      .from("cash_transactions")
      .select("org_id, deposit, withdrawal, approved_at");
    if (from) q = q.gte("approved_at", from);
    if (to) q = q.lte("approved_at", to);
    return q;
  });
  if (data.length === 0) return [];

  const map = new Map<string, { deposit: number; withdrawal: number; count: number; dateFrom: string; dateTo: string }>();
  for (const row of data) {
    const oid = row.org_id as string;
    const cur = map.get(oid) ?? { deposit: 0, withdrawal: 0, count: 0, dateFrom: "", dateTo: "" };
    cur.deposit += row.deposit ?? 0;
    cur.withdrawal += row.withdrawal ?? 0;
    cur.count += 1;
    if (row.approved_at) {
      if (!cur.dateFrom || row.approved_at < cur.dateFrom) cur.dateFrom = row.approved_at;
      if (!cur.dateTo || row.approved_at > cur.dateTo) cur.dateTo = row.approved_at;
    }
    map.set(oid, cur);
  }

  return orgs
    .filter((o) => map.has(o.id))
    .map((o) => {
      const v = map.get(o.id)!;
      return {
        orgId: o.id,
        orgName: o.name,
        totalDeposit: v.deposit,
        totalWithdrawal: v.withdrawal,
        netFlow: v.deposit - v.withdrawal,
        txCount: v.count,
        dateFrom: v.dateFrom,
        dateTo: v.dateTo,
      };
    })
    .sort((a, b) => b.totalDeposit - a.totalDeposit);
}

export async function deleteCashFile(orgId: string, fileName: string) {
  const profile = await requireAuth();
  if (profile.role === "tenant") throw new Error("권한 없음");

  const supabase = await createClient();
  await supabase
    .from("cash_transactions")
    .delete()
    .eq("org_id", orgId)
    .eq("file_name", fileName);

  revalidatePath("/cash-flow");
}

export async function deleteCashTransaction(id: string) {
  const profile = await requireAuth();
  if (profile.role === "tenant") throw new Error("권한 없음");

  const supabase = await createClient();

  // org_admin은 자신의 org 데이터만 삭제 가능
  let query = supabase.from("cash_transactions").delete().eq("id", id);
  if (profile.role === "org_admin") {
    query = query.eq("org_id", profile.org_id!);
  }

  const { error } = await query;
  if (error) throw new Error(error.message);

  revalidatePath("/cash-flow/transactions");
}

export async function deleteAllCashByOrg(orgId: string) {
  const profile = await requireAuth();
  if (profile.role !== "super_admin") throw new Error("권한 없음");

  const supabase = await createClient();
  const { error } = await supabase
    .from("cash_transactions")
    .delete()
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);

  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/transactions");
  revalidatePath("/cash-flow/upload");
}
