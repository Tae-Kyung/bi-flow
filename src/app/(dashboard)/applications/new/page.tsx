import { requireAuth } from "@/lib/auth";
import { getOrganizations } from "@/actions/organizations";
import { ApplicationForm } from "@/components/forms/application-form";
import type { Organization } from "@/types";

export default async function NewApplicationPage() {
  const profile = await requireAuth();

  let organizations: Organization[] = [];
  if (profile.role === "super_admin") {
    organizations = (await getOrganizations()) as Organization[];
  } else if (profile.org_id) {
    // org_admin/tenant는 자기 기관만
    organizations = [{ id: profile.org_id, name: "", type: "bi_center", settings: {} as any, created_at: "", updated_at: "" }];
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">입주 신청</h1>
      <ApplicationForm
        organizations={organizations}
        showOrgSelect={profile.role === "super_admin"}
        defaultOrgId={profile.org_id || undefined}
      />
    </div>
  );
}
