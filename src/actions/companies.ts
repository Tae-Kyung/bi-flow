"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { CompanyStatus } from "@/types";

export async function getCompanies(orgId?: string, status?: string) {
  const profile = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("companies")
    .select("*, organization:organizations(name)")
    .order("created_at", { ascending: true });

  const filterOrgId = orgId || (profile.role !== "super_admin" ? profile.org_id : null);
  if (filterOrgId) query = query.eq("org_id", filterOrgId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getCompanyStatusCounts() {
  const profile = await requireAuth();
  const supabase = await createClient();

  const statuses = ["active", "graduated", "terminated"] as const;
  const counts: Record<string, number> = {};

  for (const s of statuses) {
    let query = supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("status", s);

    if (profile.role !== "super_admin" && profile.org_id) {
      query = query.eq("org_id", profile.org_id);
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

  const { error } = await supabase.from("companies").insert({
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
    contact_name: (formData.get("contact_name") as string) || null,
    contact_phone: (formData.get("contact_phone") as string) || null,
    contact_email: (formData.get("contact_email") as string) || null,
    office_phone: (formData.get("office_phone") as string) || null,
    fax: (formData.get("fax") as string) || null,
    certification_expiry: (formData.get("certification_expiry") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });

  if (error) throw error;
  revalidatePath("/companies");
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

export async function bulkCreateCompanies(
  orgId: string,
  rows: {
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
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    office_phone?: string;
    fax?: string;
    certification_expiry?: string;
    notes?: string;
  }[]
): Promise<{ inserted: number }> {
  const profile = await requireAuth();
  const supabase = await createClient();

  if (
    profile.role !== "super_admin" &&
    profile.role !== "org_admin"
  ) {
    throw new Error("권한이 없습니다.");
  }

  if (
    profile.role === "org_admin" &&
    profile.org_id !== orgId
  ) {
    throw new Error("다른 기관에 기업을 등록할 수 없습니다.");
  }

  if (rows.length === 0) {
    throw new Error("등록할 기업이 없습니다.");
  }

  const insertData = rows.map((row) => ({
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
  }));

  const { error } = await supabase.from("companies").insert(insertData);

  if (error) throw error;
  revalidatePath("/companies");
  return { inserted: insertData.length };
}

export async function updateCompany(id: string, formData: FormData) {
  await requireAuth();
  const supabase = await createClient();

  const newStatus = (formData.get("status") as CompanyStatus) || "active";

  // 기존 데이터 조회 (graduated_at 설정 여부 판단)
  const { data: existing } = await supabase
    .from("companies")
    .select("graduated_at")
    .eq("id", id)
    .single();

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
    contact_name: (formData.get("contact_name") as string) || null,
    contact_phone: (formData.get("contact_phone") as string) || null,
    contact_email: (formData.get("contact_email") as string) || null,
    office_phone: (formData.get("office_phone") as string) || null,
    fax: (formData.get("fax") as string) || null,
    certification_expiry: (formData.get("certification_expiry") as string) || null,
    notes: (formData.get("notes") as string) || null,
    graduation_notes: (formData.get("graduation_notes") as string) || null,
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
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
}
