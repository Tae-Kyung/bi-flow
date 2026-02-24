import { requireAuth } from "@/lib/auth";
import { getContract } from "@/actions/contracts";
import { getCompanies } from "@/actions/companies";
import { getSpaces } from "@/actions/spaces";
import { getOrganizations } from "@/actions/organizations";
import { ContractForm } from "@/components/forms/contract-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  const isAdmin = profile.role === "super_admin" || profile.role === "org_admin";
  const canRenew = isAdmin && contract.status === "active";

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">계약 수정</h1>
        {canRenew && (
          <Link href={`/contracts/${id}/renew`}>
            <Button variant="outline">연장</Button>
          </Link>
        )}
      </div>
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
