"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAllCashByOrg } from "@/actions/cash-flow";

interface Props {
  orgId: string;
  orgName: string;
}

export function DeleteAllCashButton({ orgId, orgName }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`"${orgName}"의 모든 거래 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    startTransition(async () => {
      try {
        await deleteAllCashByOrg(orgId);
        toast.success(`${orgName} 거래 데이터가 모두 삭제되었습니다`);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message ?? "삭제 실패");
      }
    });
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={pending}
    >
      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
      {pending ? "삭제 중..." : "전체 삭제"}
    </Button>
  );
}
