"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteCashTransaction } from "@/actions/cash-flow";

export function TransactionDeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("이 거래 내역을 삭제하시겠습니까?")) return;
    startTransition(async () => {
      try {
        await deleteCashTransaction(id);
        toast.success("삭제되었습니다");
      } catch (e: any) {
        toast.error(e?.message ?? "삭제 실패");
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
      title="삭제"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
