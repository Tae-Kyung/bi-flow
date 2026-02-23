import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile, UserRole } from "@/types";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

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
