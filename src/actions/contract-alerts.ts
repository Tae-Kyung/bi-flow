"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function checkExpiringContracts() {
  const profile = await requireRole(["super_admin", "org_admin"]);
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const ninetyDaysLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // 90일 내 만료 active 계약 조회
  let contractQuery = supabase
    .from("contracts")
    .select("id, org_id, end_date, company:companies(name), space:spaces(name)")
    .eq("status", "active")
    .gte("end_date", today)
    .lte("end_date", ninetyDaysLater);

  if (profile.role === "org_admin" && profile.org_id) {
    contractQuery = contractQuery.eq("org_id", profile.org_id);
  }

  const { data: contracts, error: contractError } = await contractQuery;
  if (contractError) throw contractError;
  if (!contracts || contracts.length === 0) return { created: 0, skipped: 0 };

  let created = 0;
  let skipped = 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const contract of contracts) {
    const link = `/contracts/${contract.id}`;

    // 7일 내 동일 link 중복 방지
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("link", link)
      .eq("type", "contract_expiring")
      .gte("created_at", sevenDaysAgo);

    if ((count ?? 0) > 0) {
      skipped++;
      continue;
    }

    // 해당 org의 모든 org_admin 조회
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("org_id", contract.org_id)
      .eq("role", "org_admin");

    // super_admin도 포함
    const { data: superAdmins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "super_admin");

    const targetUsers = [
      ...(admins || []),
      ...(superAdmins || []),
    ];

    const uniqueUserIds = [...new Set(targetUsers.map((u) => u.id))];

    const daysLeft = Math.ceil(
      (new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const companyName = (contract.company as any)?.name || "알 수 없음";
    const spaceName = (contract.space as any)?.name || "";

    const notifications = uniqueUserIds.map((userId) => ({
      user_id: userId,
      org_id: contract.org_id,
      type: "contract_expiring" as const,
      title: `계약 만료 ${daysLeft}일 전`,
      message: `${companyName}${spaceName ? ` - ${spaceName}` : ""} 계약이 ${contract.end_date}에 만료됩니다.`,
      link,
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) throw insertError;
    created += uniqueUserIds.length;
  }

  return { created, skipped };
}
