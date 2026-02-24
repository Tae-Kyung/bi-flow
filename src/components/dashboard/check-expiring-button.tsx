"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { checkExpiringContracts } from "@/actions/contract-alerts";

export function CheckExpiringButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await checkExpiringContracts();
        toast.success(
          `만료 알림 ${result.created}건 발송, ${result.skipped}건 스킵`
        );
      } catch {
        toast.error("알림 발송에 실패했습니다.");
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      <Bell className="mr-1 h-3 w-3" />
      {isPending ? "발송 중..." : "만료 알림 발송"}
    </Button>
  );
}
