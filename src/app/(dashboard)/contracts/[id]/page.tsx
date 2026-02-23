import { requireAuth } from "@/lib/auth";
import { getContract } from "@/actions/contracts";
import { getCompanies } from "@/actions/companies";
import { getSpaces } from "@/actions/spaces";
import { getOrganizations } from "@/actions/organizations";
import { ContractForm } from "@/components/forms/contract-form";
import type { Company, Contract, Organization, Space } from "@/types";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAuth();
  const { id } = await params;
  const contract = (await getContract(id)) as Contract;
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
      <h1 className="text-2xl font-bold">계약 수정</h1>
      <ContractForm
        contract={contract}
        companies={companies}
        spaces={spaces}
        organizations={organizations}
        showOrgSelect={isSuperAdmin}
      />
    </div>
  );
}
