"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ContractStatus } from "@/types";

// ─────────────────────────────────────────────
// 조회
// ─────────────────────────────────────────────

export async function getContracts(orgId?: string) {
  const profile = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("contracts")
    .select("*, company:companies(name), contract_spaces(space:spaces(name))")
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

// 기업의 활성 계약 1건 + 배정된 호실 목록
export async function getActiveContractByCompany(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contracts")
    .select("id, start_date, end_date, rent_amount, deposit, contract_spaces(id, space:spaces(id, name, area, floor))")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getContract(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*, company:companies(name, representative, biz_number), contract_spaces(id, space:spaces(id, name, area, floor))")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────
// 기업 페이지 - 계약 및 호실 관리
// ─────────────────────────────────────────────

// 활성 계약이 없을 때: 계약 생성 + 첫 호실 배정
export async function createContractWithSpace(
  companyId: string,
  orgId: string,
  spaceId: string,
  startDate: string,
  endDate: string,
  rentAmount: number,
  deposit: number
) {
  await requireAuth();
  const supabase = await createClient();

  const { data: spaceCheck } = await supabase
    .from("spaces").select("status").eq("id", spaceId).single();
  if (spaceCheck?.status === "occupied") throw new Error("이미 입주 중인 호실입니다.");

  const { data: contract, error: contractErr } = await supabase
    .from("contracts")
    .insert({ org_id: orgId, company_id: companyId, start_date: startDate, end_date: endDate, rent_amount: rentAmount, deposit, status: "active" })
    .select("id").single();
  if (contractErr) throw new Error(contractErr.message);

  const { error: csErr } = await supabase
    .from("contract_spaces").insert({ contract_id: contract.id, space_id: spaceId });
  if (csErr) throw new Error(csErr.message);

  await supabase.from("spaces").update({ status: "occupied" }).eq("id", spaceId);

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/contracts");
  revalidatePath("/spaces");
}

// 기존 계약에 호실 추가
export async function addSpaceToContract(contractId: string, spaceId: string, companyId: string) {
  await requireAuth();
  const supabase = await createClient();

  const { data: spaceCheck } = await supabase
    .from("spaces").select("status").eq("id", spaceId).single();
  if (spaceCheck?.status === "occupied") throw new Error("이미 입주 중인 호실입니다.");

  const { error } = await supabase
    .from("contract_spaces").insert({ contract_id: contractId, space_id: spaceId });
  if (error) throw new Error(error.message);

  await supabase.from("spaces").update({ status: "occupied" }).eq("id", spaceId);

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/contracts");
  revalidatePath("/spaces");
}

// 계약에서 호실 제거
export async function removeSpaceFromContract(
  contractSpaceId: string,
  spaceId: string,
  companyId: string
) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("contract_spaces").delete().eq("id", contractSpaceId);
  if (error) throw new Error(error.message);

  await supabase.from("spaces").update({ status: "vacant" }).eq("id", spaceId);

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/contracts");
  revalidatePath("/spaces");
}

// 계약 상세 정보(기간/금액) 수정
export async function updateContractDetails(
  contractId: string,
  companyId: string,
  startDate: string,
  endDate: string,
  rentAmount: number,
  deposit: number
) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("contracts")
    .update({ start_date: startDate, end_date: endDate, rent_amount: rentAmount, deposit })
    .eq("id", contractId);
  if (error) throw new Error(error.message);

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/contracts");
}

// ─────────────────────────────────────────────
// 계약 페이지 - 생성 / 수정 / 갱신
// ─────────────────────────────────────────────

export async function createContract(formData: FormData) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const orgId = (formData.get("org_id") as string) || profile.org_id;
  const spaceId = formData.get("space_id") as string;
  const companyId = formData.get("company_id") as string;

  if (!orgId) throw new Error("기관을 선택해주세요.");

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      org_id: orgId,
      company_id: companyId,
      start_date: formData.get("start_date") as string,
      end_date: formData.get("end_date") as string,
      rent_amount: Number(formData.get("rent_amount")) || 0,
      deposit: Number(formData.get("deposit")) || 0,
      status: "active",
    })
    .select("id").single();

  if (error) throw error;

  if (spaceId) {
    await supabase.from("contract_spaces").insert({ contract_id: contract.id, space_id: spaceId });
    await supabase.from("spaces").update({ status: "occupied" }).eq("id", spaceId);
  }

  revalidatePath("/contracts");
  revalidatePath("/spaces");
}

export async function updateContract(id: string, formData: FormData) {
  await requireAuth();
  const supabase = await createClient();

  const status = formData.get("status") as ContractStatus;

  const { data: oldContract } = await supabase
    .from("contracts").select("status").eq("id", id).single();

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

  // 계약 종료/해지 시 배정된 모든 호실을 공실로
  if (
    oldContract?.status === "active" &&
    (status === "expired" || status === "terminated")
  ) {
    const { data: contractSpaces } = await supabase
      .from("contract_spaces").select("space_id").eq("contract_id", id);

    if (contractSpaces && contractSpaces.length > 0) {
      const spaceIds = contractSpaces.map((cs) => cs.space_id);
      await supabase.from("spaces").update({ status: "vacant" }).in("id", spaceIds);
    }
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${id}`);
  revalidatePath("/spaces");
}

export async function renewContract(oldContractId: string, formData: FormData) {
  await requireAuth();
  const supabase = await createClient();

  const { data: oldContract, error: fetchError } = await supabase
    .from("contracts").select("*").eq("id", oldContractId).single();

  if (fetchError || !oldContract) throw new Error("기존 계약을 찾을 수 없습니다.");
  if (oldContract.status !== "active") throw new Error("활성 상태의 계약만 연장할 수 있습니다.");

  // 기존 계약 만료
  const { error: expireError } = await supabase
    .from("contracts").update({ status: "expired" }).eq("id", oldContractId);
  if (expireError) throw expireError;

  // 새 계약 생성
  const { data: newContract, error: insertError } = await supabase
    .from("contracts")
    .insert({
      org_id: oldContract.org_id,
      company_id: oldContract.company_id,
      start_date: formData.get("start_date") as string,
      end_date: formData.get("end_date") as string,
      rent_amount: Number(formData.get("rent_amount")) || 0,
      deposit: Number(formData.get("deposit")) || 0,
      status: "active",
      previous_contract_id: oldContractId,
    })
    .select("id").single();
  if (insertError) throw insertError;

  // 기존 계약의 호실 배정을 새 계약으로 복사
  const { data: oldSpaces } = await supabase
    .from("contract_spaces").select("space_id").eq("contract_id", oldContractId);

  if (oldSpaces && oldSpaces.length > 0) {
    await supabase.from("contract_spaces").insert(
      oldSpaces.map((cs) => ({ contract_id: newContract.id, space_id: cs.space_id }))
    );
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${oldContractId}`);
  revalidatePath("/spaces");
}

export async function bulkRenewContracts(
  renewals: { contractId: string; newEndDate: string; newStartDate: string }[]
): Promise<{ renewed: number }> {
  await requireAuth();
  const supabase = await createClient();

  let renewed = 0;
  for (const renewal of renewals) {
    const { data: oldContract, error: fetchError } = await supabase
      .from("contracts").select("*").eq("id", renewal.contractId).single();

    if (fetchError || !oldContract || oldContract.status !== "active") continue;

    // 기존 계약 만료
    await supabase.from("contracts").update({ status: "expired" }).eq("id", renewal.contractId);

    // 새 계약 생성
    const { data: newContract } = await supabase
      .from("contracts")
      .insert({
        org_id: oldContract.org_id,
        company_id: oldContract.company_id,
        start_date: renewal.newStartDate,
        end_date: renewal.newEndDate,
        rent_amount: oldContract.rent_amount,
        deposit: oldContract.deposit,
        status: "active",
        previous_contract_id: renewal.contractId,
      })
      .select("id").single();

    // 호실 배정 복사
    if (newContract) {
      const { data: oldSpaces } = await supabase
        .from("contract_spaces").select("space_id").eq("contract_id", renewal.contractId);

      if (oldSpaces && oldSpaces.length > 0) {
        await supabase.from("contract_spaces").insert(
          oldSpaces.map((cs) => ({ contract_id: newContract.id, space_id: cs.space_id }))
        );
      }
    }

    renewed++;
  }

  revalidatePath("/contracts");
  revalidatePath("/spaces");
  return { renewed };
}
