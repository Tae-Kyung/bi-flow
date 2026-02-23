import { requireRole } from "@/lib/auth";
import { getContracts } from "@/actions/contracts";
import { MoveOutForm } from "@/components/forms/move-out-form";

export default async function NewMoveOutPage() {
  await requireRole(["super_admin", "org_admin"]);
  const contracts = await getContracts();
  const activeContracts = contracts.filter((c: any) => c.status === "active");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">퇴거 등록</h1>
      <MoveOutForm contracts={activeContracts} />
    </div>
  );
}
