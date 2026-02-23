import { requireAuth } from "@/lib/auth";
import { getMoveOut } from "@/actions/move-outs";
import { MoveOutDetail } from "@/components/forms/move-out-detail";

export default async function MoveOutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAuth();
  const { id } = await params;
  const moveOut = await getMoveOut(id);
  const canManage = profile.role === "super_admin" || profile.role === "org_admin";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">퇴거 상세</h1>
      <MoveOutDetail moveOut={moveOut} canManage={canManage} />
    </div>
  );
}
