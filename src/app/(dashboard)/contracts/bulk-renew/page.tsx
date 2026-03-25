import { requireRole } from "@/lib/auth";
import { getContracts } from "@/actions/contracts";
import { ContractBulkRenewForm } from "@/components/forms/contract-bulk-renew-form";

export default async function ContractBulkRenewPage() {
  await requireRole(["super_admin", "org_admin"]);

  const contracts = await getContracts();
  const activeContracts = (contracts as any[])
    .filter((c) => c.status === "active")
    .map((c) => ({
      id: c.id,
      companyName: c.company?.name || "-",
      spaceName: (c.contract_spaces as any[])?.map((cs: any) => cs.space?.name).filter(Boolean).join(", ") || "-",
      startDate: c.start_date,
      endDate: c.end_date,
    }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">계약 일괄 갱신</h1>
      <p className="text-sm text-muted-foreground">
        갱신할 계약을 선택하고 새 계약 기간을 입력하세요. 기존 계약은 만료 처리되고 새 계약이 생성됩니다.
      </p>
      <ContractBulkRenewForm contracts={activeContracts} />
    </div>
  );
}
