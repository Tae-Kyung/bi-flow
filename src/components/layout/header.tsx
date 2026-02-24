"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";
import type { Profile } from "@/types";

const roleLabels: Record<string, string> = {
  super_admin: "총괄 관리자",
  org_admin: "기관 담당자",
  tenant: "입주기업",
};

export function Header({
  profile,
  orgName,
}: {
  profile: Profile;
  orgName?: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div className="flex items-center gap-3">
        {orgName && (
          <span className="text-sm text-muted-foreground">{orgName}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <Badge variant="secondary">{roleLabels[profile.role]}</Badge>
        <span className="text-sm">{profile.name || profile.email}</span>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
