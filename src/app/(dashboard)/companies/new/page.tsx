import { requireAuth } from "@/lib/auth";
import { getOrganizations } from "@/actions/organizations";
import { getSpaces } from "@/actions/spaces";
import { CompanyForm } from "@/components/forms/company-form";
import type { Organization, Space } from "@/types";

export default async function NewCompanyPage() {
  const profile = await requireAuth();
  const isSuperAdmin = profile.role === "super_admin";

  let organizations: Organization[] = [];
  if (isSuperAdmin) {
    organizations = (await getOrganizations()) as Organization[];
  }

  const spaces = (await getSpaces()) as Space[];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">기업 등록</h1>
      <CompanyForm
        organizations={organizations}
        spaces={spaces}
        showOrgSelect={isSuperAdmin}
      />
    </div>
  );
}
