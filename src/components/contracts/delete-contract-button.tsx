"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteContract } from "@/actions/contracts";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  contractId: string;
  companyName?: string;
}

export function DeleteContractButton({ contractId, companyName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const label = companyName ? `"${companyName}" 계약` : "이 계약";
    if (!confirm(`${label}을 삭제하시겠습니까?\n\n관련된 퇴거 기록도 함께 삭제됩니다.\n삭제 후 복구할 수 없습니다.`)) return;
    setLoading(true);
    try {
      await deleteContract(contractId);
      toast.success("계약이 삭제되었습니다.");
      router.push("/contracts");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <Button
      variant="destructive"
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      계약 삭제
    </Button>
  );
}
