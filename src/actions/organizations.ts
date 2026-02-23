"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { OrgSettings, OrgType } from "@/types";

export async function getOrganizations() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getOrganization(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createOrganization(formData: FormData) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const type = formData.get("type") as OrgType;
  const settings: OrgSettings = {
    rent_unit_price: Number(formData.get("rent_unit_price")) || 0,
    maintenance_fee_total: Number(formData.get("maintenance_fee_total")) || 0,
    distribution_method:
      (formData.get("distribution_method") as OrgSettings["distribution_method"]) ||
      "area_ratio",
    invoice_issue_day: Number(formData.get("invoice_issue_day")) || 1,
  };

  const { error } = await supabase
    .from("organizations")
    .insert({ name, type, settings });

  if (error) throw error;
  revalidatePath("/organizations");
}

export async function updateOrganization(id: string, formData: FormData) {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const type = formData.get("type") as OrgType;
  const settings: OrgSettings = {
    rent_unit_price: Number(formData.get("rent_unit_price")) || 0,
    maintenance_fee_total: Number(formData.get("maintenance_fee_total")) || 0,
    distribution_method:
      (formData.get("distribution_method") as OrgSettings["distribution_method"]) ||
      "area_ratio",
    invoice_issue_day: Number(formData.get("invoice_issue_day")) || 1,
  };

  const { error } = await supabase
    .from("organizations")
    .update({ name, type, settings })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/organizations");
  revalidatePath(`/organizations/${id}`);
}
