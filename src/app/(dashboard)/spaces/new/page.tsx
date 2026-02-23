import { requireAuth } from "@/lib/auth";
import { getOrganizations } from "@/actions/organizations";
import { SpaceForm } from "@/components/forms/space-form";
import type { Organization } from "@/types";

export default async function NewSpacePage() {
  const profile = await requireAuth();
  const isSuperAdmin = profile.role === "super_admin";

  let organizations: Organization[] = [];
  if (isSuperAdmin) {
    organizations = (await getOrganizations()) as Organization[];
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">공간 등록</h1>
      <SpaceForm
        organizations={organizations}
        showOrgSelect={isSuperAdmin}
      />
    </div>
  );
}
