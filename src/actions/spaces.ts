"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getSpaces(orgId?: string, sortBy?: string, sortOrder?: string) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const ascending = sortOrder !== "desc";

  // 호실명은 DB 레벨 정렬, 입주기업은 조인 후 메모리 정렬
  const dbSortColumn = sortBy === "name" ? "name" : "created_at";

  let query = supabase
    .from("spaces")
    .select("*, organization:organizations(name), contract_spaces(contract:contracts(id, status, company:companies(id, name)))")
    .order(dbSortColumn, { ascending: sortBy === "name" ? ascending : true });

  const filterOrgId = orgId || (profile.role !== "super_admin" ? profile.org_id : null);
  if (filterOrgId) query = query.eq("org_id", filterOrgId);

  const { data, error } = await query;
  if (error) throw error;

  // contract_spaces → active 계약의 입주기업 정보 추가
  let result = (data || []).map((space: any) => {
    const activeCs = space.contract_spaces?.find((cs: any) => cs.contract?.status === "active");
    return {
      ...space,
      tenant_company: activeCs?.contract?.company || null,
      contract_spaces: undefined,
    };
  });

  // 입주기업명 정렬 (메모리)
  if (sortBy === "company") {
    result = result.sort((a: any, b: any) => {
      const nameA = a.tenant_company?.name ?? "";
      const nameB = b.tenant_company?.name ?? "";
      return ascending
        ? nameA.localeCompare(nameB, "ko")
        : nameB.localeCompare(nameA, "ko");
    });
  }

  return result;
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

export async function getExistingSpaceNames(orgId: string): Promise<string[]> {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("spaces")
    .select("name")
    .eq("org_id", orgId);

  if (error) throw error;
  return (data || []).map((row: { name: string }) => row.name);
}

export async function bulkCreateSpaces(
  orgId: string,
  rows: {
    name: string;
    area: number;
    floor?: string;
    description?: string;
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
    throw new Error("다른 기관에 공간을 등록할 수 없습니다.");
  }

  if (rows.length === 0) {
    throw new Error("등록할 공간이 없습니다.");
  }

  const insertData = rows.map((row) => ({
    org_id: orgId,
    name: row.name,
    area: row.area,
    floor: row.floor || null,
    description: row.description || null,
  }));

  const { error } = await supabase.from("spaces").insert(insertData);

  if (error) throw error;
  revalidatePath("/spaces");
  return { inserted: insertData.length };
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

export async function deleteSpace(id: string) {
  await requireAuth();
  const supabase = await createClient();

  // 입주 중인 호실은 삭제 불가
  const { data: space } = await supabase
    .from("spaces")
    .select("status, name")
    .eq("id", id)
    .single();

  if (space?.status === "occupied") {
    throw new Error(`${space.name} 호실은 현재 입주 중으로 삭제할 수 없습니다.`);
  }

  const { error } = await supabase.from("spaces").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/spaces");
}
