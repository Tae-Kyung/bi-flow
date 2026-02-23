import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();

  let orgName: string | undefined;
  if (profile.org_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", profile.org_id)
      .single();
    orgName = data?.name;
  }

  return (
    <div className="flex h-screen">
      <Sidebar role={profile.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header profile={profile} orgName={orgName} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
