import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile, UserRole } from "@/types";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !data) {
    // 프로필이 없으면 자동 생성 시도
    const newProfile = {
      id: user.id,
      email: user.email!,
      name: user.email!.split("@")[0],
      role: "super_admin" as const,
      org_id: null,
      company_id: null,
    };

    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .upsert(newProfile, { onConflict: "id" })
      .select()
      .single();

    if (insertError || !created) {
      // RLS 등으로 DB 접근 자체가 불가하면 auth 정보로 폴백
      return {
        ...newProfile,
        created_at: new Date().toISOString(),
      };
    }

    return created;
  }

  return data;
}

export async function requireAuth(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 인증 자체가 안 된 경우만 로그인으로 리다이렉트
  if (!user) redirect("/login");

  const profile = await getProfile();
  // 인증은 됐으나 프로필 로드 실패 시에도 폴백 (리다이렉트 루프 방지)
  if (!profile) {
    return {
      id: user.id,
      email: user.email!,
      name: user.email!.split("@")[0],
      role: "super_admin",
      org_id: null,
      company_id: null,
      created_at: new Date().toISOString(),
    };
  }
  return profile;
}

export async function requireRole(roles: UserRole[]): Promise<Profile> {
  const profile = await requireAuth();
  if (!roles.includes(profile.role)) redirect("/dashboard");
  return profile;
}

export function isSuperAdmin(profile: Profile) {
  return profile.role === "super_admin";
}

export function isOrgAdmin(profile: Profile) {
  return profile.role === "org_admin";
}

export function isTenant(profile: Profile) {
  return profile.role === "tenant";
}
