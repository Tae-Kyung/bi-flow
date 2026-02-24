import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getContract } from "@/actions/contracts";
import { ContractRenewForm } from "@/components/forms/contract-renew-form";
import type { Contract } from "@/types";

export default async function ContractRenewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["super_admin", "org_admin"]);
  const { id } = await params;
  const contract = (await getContract(id)) as Contract;

  if (contract.status !== "active") {
    redirect(`/contracts/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">계약 연장</h1>
      <ContractRenewForm contract={contract} />
    </div>
  );
}
