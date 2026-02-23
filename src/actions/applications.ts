"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getApplications(orgId?: string) {
  const profile = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("applications")
    .select("*, organization:organizations(name)")
    .order("created_at", { ascending: false });

  if (profile.role === "tenant") {
    query = query.eq("applicant_id", profile.id);
  } else if (profile.role === "org_admin" && profile.org_id) {
    query = query.eq("org_id", profile.org_id);
  } else if (orgId) {
    query = query.eq("org_id", orgId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getApplication(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*, organization:organizations(name)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createApplication(formData: FormData) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const orgId = formData.get("org_id") as string;
  if (!orgId) throw new Error("기관을 선택해주세요.");

  const { error } = await supabase.from("applications").insert({
    org_id: orgId,
    applicant_id: profile.id,
    company_name: formData.get("company_name") as string,
    biz_number: formData.get("biz_number") as string,
    representative: formData.get("representative") as string,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    desired_area: Number(formData.get("desired_area")) || null,
    desired_period: (formData.get("desired_period") as string) || null,
    purpose: (formData.get("purpose") as string) || null,
  });

  if (error) throw error;
  revalidatePath("/applications");
}

export async function reviewApplication(
  id: string,
  action: "approved" | "rejected",
  rejectReason?: string
) {
  const profile = await requireRole(["super_admin", "org_admin"]);
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("applications")
    .update({
      status: action,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      reject_reason: action === "rejected" ? rejectReason : null,
    })
    .eq("id", id);

  if (updateError) throw updateError;

  // 승인 시: 입주기업 자동 생성
  if (action === "approved") {
    const { data: app } = await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .single();

    if (app) {
      const { error: companyError } = await supabase
        .from("companies")
        .insert({
          org_id: app.org_id,
          name: app.company_name,
          biz_number: app.biz_number,
          representative: app.representative,
          phone: app.phone,
          email: app.email,
        });

      if (companyError) throw companyError;
    }
  }

  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  revalidatePath("/companies");
}
