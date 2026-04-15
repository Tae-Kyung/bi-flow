"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { CompanyStatus } from "@/types";

export async function getCompanies(
  orgId?: string,
  status?: string,
  sortBy?: string,
  sortOrder?: string
) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const allowedSortFields = ["name", "representative", "created_at"];
  const column = allowedSortFields.includes(sortBy ?? "") ? sortBy! : "created_at";
  const ascending = sortOrder !== "desc";

  let query = supabase
    .from("companies")
    .select("*, organization:organizations(name)")
    .order(column, { ascending });

  const filterOrgId = orgId || (profile.role !== "super_admin" ? profile.org_id : null);
  if (filterOrgId) query = query.eq("org_id", filterOrgId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getCompanyStatusCounts(orgId?: string) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const statuses = ["active", "graduated", "terminated"] as const;
  const counts: Record<string, number> = {};

  const filterOrgId = orgId || (profile.role !== "super_admin" ? profile.org_id : null);

  for (const s of statuses) {
    let query = supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("status", s);

    if (filterOrgId) {
      query = query.eq("org_id", filterOrgId);
    }

    const { count } = await query;
    counts[s] = count ?? 0;
  }

  counts.all = Object.values(counts).reduce((a, b) => a + b, 0);
  return counts;
}

export async function getCompany(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*, organization:organizations(name)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createCompany(formData: FormData) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const orgId =
    (formData.get("org_id") as string) || profile.org_id;

  if (!orgId) throw new Error("기관을 선택해주세요.");

  const extraContactsRaw = formData.get("extra_contacts") as string;
  let extra_contacts = [];
  try {
    extra_contacts = extraContactsRaw ? JSON.parse(extraContactsRaw) : [];
  } catch {
    extra_contacts = [];
  }

  const { data: company, error } = await supabase.from("companies").insert({
    org_id: orgId,
    name: formData.get("name") as string,
    biz_number: formData.get("biz_number") as string,
    representative: formData.get("representative") as string,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    address: (formData.get("address") as string) || null,
    corporate_type: (formData.get("corporate_type") as string) || null,
    founding_date: (formData.get("founding_date") as string) || null,
    business_description: (formData.get("business_description") as string) || null,
    main_products: (formData.get("main_products") as string) || null,
    website: (formData.get("website") as string) || null,
    move_in_date: (formData.get("move_in_date") as string) || null,
    contact_name: (formData.get("contact_name") as string) || null,
    contact_phone: (formData.get("contact_phone") as string) || null,
    contact_email: (formData.get("contact_email") as string) || null,
    office_phone: (formData.get("office_phone") as string) || null,
    fax: (formData.get("fax") as string) || null,
    certification_expiry: (formData.get("certification_expiry") as string) || null,
    notes: (formData.get("notes") as string) || null,
    extra_contacts: extra_contacts.length > 0 ? extra_contacts : [],
  }).select("id").single();

  if (error) throw error;

  // 계약 정보가 있으면 계약 자동 생성
  const spaceId = formData.get("contract_space_id") as string;
  const contractStart = formData.get("contract_start_date") as string;
  const contractEnd = formData.get("contract_end_date") as string;

  if (company && spaceId && contractStart && contractEnd) {
    const { error: contractError } = await supabase.from("contracts").insert({
      org_id: orgId,
      company_id: company.id,
      space_id: spaceId,
      start_date: contractStart,
      end_date: contractEnd,
      rent_amount: Number(formData.get("contract_rent_amount")) || 0,
      deposit: Number(formData.get("contract_deposit")) || 0,
      status: "active",
    });

    if (!contractError) {
      await supabase
        .from("spaces")
        .update({ status: "occupied" })
        .eq("id", spaceId);
    }
  }

  revalidatePath("/companies");
  revalidatePath("/contracts");
  revalidatePath("/spaces");
}

export async function getExistingBizNumbers(orgId: string): Promise<string[]> {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("companies")
    .select("biz_number")
    .eq("org_id", orgId);

  if (error) throw error;
  return (data || []).map((row: { biz_number: string }) => row.biz_number);
}

type BulkRow = {
  name: string;
  biz_number: string;
  representative: string;
  corporate_type?: string;
  founding_date?: string;
  business_description?: string;
  main_products?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  space_name?: string;
  move_in_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_name_2?: string;
  contact_phone_2?: string;
  contact_email_2?: string;
  contact_name_3?: string;
  contact_phone_3?: string;
  contact_email_3?: string;
  office_phone?: string;
  fax?: string;
  certification_expiry?: string;
  notes?: string;
};

/**
 * 기업 1건 등록 (일괄 등록에서 클라이언트가 1건씩 호출)
 * 새 DB 컬럼(move_in_date, extra_contacts)은 마이그레이션 적용 여부와 무관하게 안전하게 처리
 */
export async function createOneCompany(
  orgId: string,
  row: BulkRow,
  spaceId?: string
): Promise<{ contracted: boolean }> {
  const profile = await requireAuth();
  const supabase = await createClient();

  if (profile.role !== "super_admin" && profile.role !== "org_admin") {
    throw new Error("권한이 없습니다.");
  }
  if (profile.role === "org_admin" && profile.org_id !== orgId) {
    throw new Error("다른 기관에 기업을 등록할 수 없습니다.");
  }

  // 추가 담당자 처리
  const extra: { name: string; phone: string; email: string }[] = [];
  if (row.contact_name_2) {
    extra.push({ name: row.contact_name_2, phone: row.contact_phone_2 || "", email: row.contact_email_2 || "" });
  }
  if (row.contact_name_3) {
    extra.push({ name: row.contact_name_3, phone: row.contact_phone_3 || "", email: row.contact_email_3 || "" });
  }

  // 기본 컬럼 (마이그레이션 없이도 동작)
  const baseInsert: Record<string, unknown> = {
    org_id: orgId,
    name: row.name,
    biz_number: row.biz_number,
    representative: row.representative,
    corporate_type: row.corporate_type || null,
    founding_date: row.founding_date || null,
    business_description: row.business_description || null,
    main_products: row.main_products || null,
    website: row.website || null,
    phone: row.phone || null,
    email: row.email || null,
    address: row.address || null,
    contact_name: row.contact_name || null,
    contact_phone: row.contact_phone || null,
    contact_email: row.contact_email || null,
    office_phone: row.office_phone || null,
    fax: row.fax || null,
    certification_expiry: row.certification_expiry || null,
    notes: row.notes || null,
  };

  // 신규 컬럼 - 값이 있을 때만 포함 (마이그레이션 미적용 시 빈 값은 생략)
  if (row.move_in_date) baseInsert.move_in_date = row.move_in_date;
  if (extra.length > 0) baseInsert.extra_contacts = extra;

  const { data: company, error } = await supabase
    .from("companies")
    .insert(baseInsert)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // 계약 자동 생성
  let contracted = false;
  if (company && spaceId && row.contract_start_date && row.contract_end_date) {
    const { error: cErr } = await supabase.from("contracts").insert({
      org_id: orgId,
      company_id: company.id,
      space_id: spaceId,
      start_date: row.contract_start_date,
      end_date: row.contract_end_date,
      rent_amount: 0,
      deposit: 0,
      status: "active",
    });
    if (!cErr) {
      await supabase.from("spaces").update({ status: "occupied" }).eq("id", spaceId);
      contracted = true;
    }
  }

  return { contracted };
}

export async function bulkCreateCompanies(
  orgId: string,
  rows: BulkRow[]
): Promise<{ inserted: number; contracted: number }> {
  const profile = await requireAuth();
  const supabase = await createClient();

  if (profile.role !== "super_admin" && profile.role !== "org_admin") {
    throw new Error("권한이 없습니다.");
  }
  if (profile.role === "org_admin" && profile.org_id !== orgId) {
    throw new Error("다른 기관에 기업을 등록할 수 없습니다.");
  }
  if (rows.length === 0) throw new Error("등록할 기업이 없습니다.");

  // 호실명 → space_id 매핑
  const spaceNameCache = new Map<string, string>();
  const uniqueSpaceNames = [...new Set(rows.map((r) => r.space_name).filter(Boolean))] as string[];
  if (uniqueSpaceNames.length > 0) {
    const { data: spaces } = await supabase
      .from("spaces")
      .select("id, name")
      .eq("org_id", orgId)
      .in("name", uniqueSpaceNames);
    (spaces || []).forEach((s: { id: string; name: string }) => spaceNameCache.set(s.name, s.id));
  }

  let inserted = 0;
  let contracted = 0;

  for (const row of rows) {
    const spaceId = row.space_name ? spaceNameCache.get(row.space_name) : undefined;
    try {
      const result = await createOneCompany(orgId, row, spaceId);
      inserted++;
      if (result.contracted) contracted++;
    } catch {
      // 개별 실패는 건너뜀
    }
  }

  revalidatePath("/companies");
  revalidatePath("/contracts");
  revalidatePath("/spaces");
  return { inserted, contracted };
}

export async function updateCompany(id: string, formData: FormData) {
  const profile = await requireAuth();
  const supabase = await createClient();

  // 기존 데이터 조회 (graduated_at 설정 여부 및 이전 상태 판단)
  const { data: existing } = await supabase
    .from("companies")
    .select("graduated_at, status, org_id")
    .eq("id", id)
    .single();

  // status 기본값은 기존 상태 유지 (active 강제 복원 방지)
  const newStatus = (formData.get("status") as CompanyStatus) || existing?.status || "active";

  const extraContactsRaw = formData.get("extra_contacts") as string;
  let extra_contacts = [];
  try {
    extra_contacts = extraContactsRaw ? JSON.parse(extraContactsRaw) : [];
  } catch {
    extra_contacts = [];
  }

  const updateData: Record<string, unknown> = {
    name: formData.get("name") as string,
    biz_number: formData.get("biz_number") as string,
    representative: formData.get("representative") as string,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    address: (formData.get("address") as string) || null,
    status: newStatus,
    corporate_type: (formData.get("corporate_type") as string) || null,
    founding_date: (formData.get("founding_date") as string) || null,
    business_description: (formData.get("business_description") as string) || null,
    main_products: (formData.get("main_products") as string) || null,
    website: (formData.get("website") as string) || null,
    move_in_date: (formData.get("move_in_date") as string) || null,
    contact_name: (formData.get("contact_name") as string) || null,
    contact_phone: (formData.get("contact_phone") as string) || null,
    contact_email: (formData.get("contact_email") as string) || null,
    office_phone: (formData.get("office_phone") as string) || null,
    fax: (formData.get("fax") as string) || null,
    certification_expiry: (formData.get("certification_expiry") as string) || null,
    notes: (formData.get("notes") as string) || null,
    graduation_notes: (formData.get("graduation_notes") as string) || null,
    extra_contacts,
  };

  // graduated 상태로 변경 시 graduated_at 자동 설정
  if (newStatus === "graduated" && !existing?.graduated_at) {
    updateData.graduated_at = new Date().toISOString();
  } else if (newStatus !== "graduated") {
    updateData.graduated_at = null;
  }

  const { error } = await supabase
    .from("companies")
    .update(updateData)
    .eq("id", id);

  if (error) throw error;

  // 졸업/해지 상태 전환 시: 활성 계약 종료 + 호실 공실 처리 + 퇴거 기록 자동 생성
  // (이미 비활성 상태여도 잔여 활성 계약이 있으면 정리)
  const isDeactivating = newStatus === "graduated" || newStatus === "terminated";
  if (isDeactivating) {
    const orgId = existing?.org_id;
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    const { data: activeContracts } = await supabase
      .from("contracts")
      .select("id, deposit")
      .eq("company_id", id)
      .eq("status", "active");

    if (activeContracts && activeContracts.length > 0) {
      const contractIds = activeContracts.map((c) => c.id);

      // 계약 종료
      await supabase
        .from("contracts")
        .update({ status: "terminated" })
        .in("id", contractIds);

      // 배정된 호실 공실 처리
      const { data: contractSpaces } = await supabase
        .from("contract_spaces")
        .select("space_id")
        .in("contract_id", contractIds);

      if (contractSpaces && contractSpaces.length > 0) {
        const spaceIds = contractSpaces.map((cs) => cs.space_id);
        await supabase.from("spaces").update({ status: "vacant" }).in("id", spaceIds);
      }

      // 퇴거관리 기록 자동 생성 (직접 처리 이력 보존, 보증금 정산은 별도 확인 필요)
      if (orgId) {
        await supabase.from("move_outs").insert(
          activeContracts.map((c) => ({
            company_id: id,
            contract_id: c.id,
            org_id: orgId,
            requested_by: profile.id,
            request_date: today,
            exit_date: today,
            status: "completed",
            reason: "직접 처리 (보증금 정산 미확인)",
            deposit_amount: c.deposit || 0,
            completed_at: now,
          }))
        );
      }
    } else if (orgId) {
      // active 계약은 없지만, move_out 기록이 없는 terminated 계약에 대해 퇴거 기록 생성
      // (계약이 별도 경로로 먼저 종료된 경우 보완)
      const { data: terminatedContracts } = await supabase
        .from("contracts")
        .select("id, deposit")
        .eq("company_id", id)
        .eq("status", "terminated");

      if (terminatedContracts && terminatedContracts.length > 0) {
        const contractIds = terminatedContracts.map((c) => c.id);

        // 이미 move_out 기록이 있는 계약은 제외
        const { data: existingMoveOuts } = await supabase
          .from("move_outs")
          .select("contract_id")
          .in("contract_id", contractIds);

        const existingContractIds = new Set((existingMoveOuts || []).map((m: any) => m.contract_id));
        const missingContracts = terminatedContracts.filter((c) => !existingContractIds.has(c.id));

        if (missingContracts.length > 0) {
          await supabase.from("move_outs").insert(
            missingContracts.map((c) => ({
              company_id: id,
              contract_id: c.id,
              org_id: orgId,
              requested_by: profile.id,
              request_date: today,
              exit_date: today,
              status: "completed",
              reason: "직접 처리 (보증금 정산 미확인)",
              deposit_amount: c.deposit || 0,
              completed_at: now,
            }))
          );
        }
      }
    }
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  revalidatePath("/contracts");
  revalidatePath("/spaces");
}

export async function deleteCompany(companyId: string) {
  const profile = await requireAuth();
  if (profile.role !== "super_admin" && profile.role !== "org_admin") {
    throw new Error("권한이 없습니다.");
  }

  const supabase = await createClient();

  // active 계약에 연결된 호실을 먼저 vacant으로 변경
  const { data: activeContracts } = await supabase
    .from("contracts")
    .select("space_id")
    .eq("company_id", companyId)
    .eq("status", "active");

  if (activeContracts && activeContracts.length > 0) {
    const spaceIds = activeContracts.map((c) => c.space_id).filter(Boolean);
    if (spaceIds.length > 0) {
      await supabase.from("spaces").update({ status: "vacant" }).in("id", spaceIds);
    }
  }

  // 기업 삭제 (contracts, documents, invoices 등은 CASCADE로 자동 삭제)
  const { error } = await supabase.from("companies").delete().eq("id", companyId);
  if (error) throw new Error(error.message);

  revalidatePath("/companies");
  revalidatePath("/contracts");
  revalidatePath("/spaces");
}
