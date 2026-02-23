import { requireAuth } from "@/lib/auth";
import { getCompany } from "@/actions/companies";
import { getOrganizations } from "@/actions/organizations";
import { CompanyForm } from "@/components/forms/company-form";
import type { Company, Organization } from "@/types";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAuth();
  const { id } = await params;
  const company = (await getCompany(id)) as Company;
  const isSuperAdmin = profile.role === "super_admin";

  let organizations: Organization[] = [];
  if (isSuperAdmin) {
    organizations = (await getOrganizations()) as Organization[];
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">기업 수정</h1>
      <CompanyForm
        company={company}
        organizations={organizations}
        showOrgSelect={isSuperAdmin}
      />
    </div>
  );
}
