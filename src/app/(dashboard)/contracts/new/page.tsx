import { requireRole } from "@/lib/auth";
import { getOrganizations } from "@/actions/organizations";
import { getCompanies } from "@/actions/companies";
import { getSpaces } from "@/actions/spaces";
import { ContractForm } from "@/components/forms/contract-form";
import type { Company, Organization, Space } from "@/types";

export default async function NewContractPage() {
  const profile = await requireRole(["super_admin", "org_admin"]);
  const isSuperAdmin = profile.role === "super_admin";

  const [companies, spaces] = await Promise.all([
    getCompanies() as Promise<Company[]>,
    getSpaces() as Promise<Space[]>,
  ]);

  let organizations: Organization[] = [];
  if (isSuperAdmin) {
    organizations = (await getOrganizations()) as Organization[];
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">계약 생성</h1>
      <ContractForm
        companies={companies}
        spaces={spaces}
        organizations={organizations}
        showOrgSelect={isSuperAdmin}
      />
    </div>
  );
}
