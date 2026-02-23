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

  console.log("[getProfile] getUser result:", {
    userId: user?.id,
    email: user?.email,
    error: userError?.message,
  });

  if (userError || !user) return null;

  const { data, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  console.log("[getProfile] profile query:", {
    found: !!data,
    error: profileError?.message,
  });

  return data;
}

export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
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
