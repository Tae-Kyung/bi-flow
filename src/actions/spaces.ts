"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getSpaces(orgId?: string) {
  const profile = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("spaces")
    .select("*, organization:organizations(name)")
    .order("created_at", { ascending: true });

  const filterOrgId = orgId || (profile.role !== "super_admin" ? profile.org_id : null);
  if (filterOrgId) query = query.eq("org_id", filterOrgId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getSpace(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spaces")
    .select("*, organization:organizations(name)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createSpace(formData: FormData) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const orgId =
    (formData.get("org_id") as string) || profile.org_id;

  if (!orgId) throw new Error("기관을 선택해주세요.");

  const { error } = await supabase.from("spaces").insert({
    org_id: orgId,
    name: formData.get("name") as string,
    area: Number(formData.get("area")) || 0,
    floor: (formData.get("floor") as string) || null,
    description: (formData.get("description") as string) || null,
  });

  if (error) throw error;
  revalidatePath("/spaces");
}

export async function updateSpace(id: string, formData: FormData) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("spaces")
    .update({
      name: formData.get("name") as string,
      area: Number(formData.get("area")) || 0,
      floor: (formData.get("floor") as string) || null,
      description: (formData.get("description") as string) || null,
    })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/spaces");
  revalidatePath(`/spaces/${id}`);
}
