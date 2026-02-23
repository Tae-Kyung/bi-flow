"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { MoveOutStatus } from "@/types";

export async function getMoveOuts(orgId?: string) {
  const profile = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("move_outs")
    .select("*, company:companies(name), contract:contracts(start_date, end_date, space_id, space:spaces(name))")
    .order("created_at", { ascending: false });

  const filterOrgId = orgId || (profile.role !== "super_admin" ? profile.org_id : null);
  if (filterOrgId) query = query.eq("org_id", filterOrgId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getMoveOut(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("move_outs")
    .select("*, company:companies(name, representative), contract:contracts(start_date, end_date, deposit, space_id, space:spaces(name))")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createMoveOut(formData: FormData) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const contractId = formData.get("contract_id") as string;

  // 계약 정보 조회
  const { data: contract } = await supabase
    .from("contracts")
    .select("company_id, org_id, deposit")
    .eq("id", contractId)
    .single();

  if (!contract) throw new Error("계약을 찾을 수 없습니다.");

  const { error } = await supabase.from("move_outs").insert({
    company_id: contract.company_id,
    contract_id: contractId,
    org_id: contract.org_id,
    requested_by: profile.id,
    request_date: formData.get("request_date") as string || new Date().toISOString().split("T")[0],
    exit_date: (formData.get("exit_date") as string) || null,
    reason: (formData.get("reason") as string) || null,
    deposit_amount: contract.deposit || 0,
  });

  if (error) throw error;
  revalidatePath("/move-outs");
}

export async function updateMoveOutStatus(
  id: string,
  status: MoveOutStatus,
  extra?: Record<string, unknown>
) {
  await requireAuth();
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { status, ...extra };

  if (status === "completed") {
    updateData.completed_at = new Date().toISOString();

    // 퇴거 정보 조회
    const { data: moveOut } = await supabase
      .from("move_outs")
      .select("contract_id, company_id")
      .eq("id", id)
      .single();

    if (moveOut) {
      // 계약 상태 → terminated
      const { data: contract } = await supabase
        .from("contracts")
        .select("space_id")
        .eq("id", moveOut.contract_id)
        .single();

      const { error: contractErr } = await supabase
        .from("contracts")
        .update({ status: "terminated" })
        .eq("id", moveOut.contract_id);

      if (contractErr) throw new Error("계약 상태 변경 실패: " + contractErr.message);

      // 호실 상태 → vacant
      if (contract) {
        const { error: spaceErr } = await supabase
          .from("spaces")
          .update({ status: "vacant" })
          .eq("id", contract.space_id);

        if (spaceErr) throw new Error("호실 상태 변경 실패: " + spaceErr.message);
      }

      // 기업 상태 → graduated
      const { error: companyErr } = await supabase
        .from("companies")
        .update({ status: "graduated" })
        .eq("id", moveOut.company_id);

      if (companyErr) throw new Error("기업 상태 변경 실패: " + companyErr.message);
    }
  }

  const { error } = await supabase
    .from("move_outs")
    .update(updateData)
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/move-outs");
  revalidatePath(`/move-outs/${id}`);
  revalidatePath("/contracts");
  revalidatePath("/spaces");
  revalidatePath("/companies");
}
