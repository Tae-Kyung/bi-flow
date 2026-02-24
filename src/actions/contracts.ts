"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ContractStatus } from "@/types";

export async function getContracts(orgId?: string) {
  const profile = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("contracts")
    .select("*, company:companies(name), space:spaces(name)")
    .order("created_at", { ascending: false });

  const filterOrgId = orgId || (profile.role !== "super_admin" ? profile.org_id : null);
  if (filterOrgId) query = query.eq("org_id", filterOrgId);

  if (profile.role === "tenant" && profile.company_id) {
    query = query.eq("company_id", profile.company_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getContract(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*, company:companies(name, representative, biz_number), space:spaces(name, area, floor)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createContract(formData: FormData) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const orgId = (formData.get("org_id") as string) || profile.org_id;
  const spaceId = formData.get("space_id") as string;
  const companyId = formData.get("company_id") as string;

  if (!orgId) throw new Error("기관을 선택해주세요.");

  const { error } = await supabase.from("contracts").insert({
    org_id: orgId,
    company_id: companyId,
    space_id: spaceId,
    start_date: formData.get("start_date") as string,
    end_date: formData.get("end_date") as string,
    rent_amount: Number(formData.get("rent_amount")) || 0,
    deposit: Number(formData.get("deposit")) || 0,
    status: "active",
  });

  if (error) throw error;

  // 호실 상태를 occupied로 변경
  await supabase
    .from("spaces")
    .update({ status: "occupied" })
    .eq("id", spaceId);

  revalidatePath("/contracts");
  revalidatePath("/spaces");
}

export async function updateContract(id: string, formData: FormData) {
  await requireAuth();
  const supabase = await createClient();

  const status = formData.get("status") as ContractStatus;

  const { data: oldContract } = await supabase
    .from("contracts")
    .select("space_id, status")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("contracts")
    .update({
      start_date: formData.get("start_date") as string,
      end_date: formData.get("end_date") as string,
      rent_amount: Number(formData.get("rent_amount")) || 0,
      deposit: Number(formData.get("deposit")) || 0,
      status,
    })
    .eq("id", id);

  if (error) throw error;

  // 계약 종료/해지 시 호실 상태를 vacant으로
  if (
    oldContract &&
    oldContract.status === "active" &&
    (status === "expired" || status === "terminated")
  ) {
    await supabase
      .from("spaces")
      .update({ status: "vacant" })
      .eq("id", oldContract.space_id);
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${id}`);
  revalidatePath("/spaces");
}

export async function renewContract(oldContractId: string, formData: FormData) {
  await requireAuth();
  const supabase = await createClient();

  // 1. 기존 계약 조회 + active 검증
  const { data: oldContract, error: fetchError } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", oldContractId)
    .single();

  if (fetchError || !oldContract) throw new Error("기존 계약을 찾을 수 없습니다.");
  if (oldContract.status !== "active") throw new Error("활성 상태의 계약만 연장할 수 있습니다.");

  // 2. 기존 계약을 expired로 직접 업데이트 (updateContract 우회 → 공간 상태 변경 없음)
  const { error: expireError } = await supabase
    .from("contracts")
    .update({ status: "expired" })
    .eq("id", oldContractId);

  if (expireError) throw expireError;

  // 3. 새 계약 생성 (same company_id, space_id, org_id + previous_contract_id)
  const { error: insertError } = await supabase.from("contracts").insert({
    org_id: oldContract.org_id,
    company_id: oldContract.company_id,
    space_id: oldContract.space_id,
    start_date: formData.get("start_date") as string,
    end_date: formData.get("end_date") as string,
    rent_amount: Number(formData.get("rent_amount")) || 0,
    deposit: Number(formData.get("deposit")) || 0,
    status: "active",
    previous_contract_id: oldContractId,
  });

  if (insertError) throw insertError;

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${oldContractId}`);
  revalidatePath("/spaces");
}
