"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteSpace } from "@/actions/spaces";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  spaceId: string;
  spaceName: string;
}

export function SpaceDeleteButton({ spaceId, spaceName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`"${spaceName}" 호실을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) return;
    setLoading(true);
    try {
      await deleteSpace(spaceId);
      toast.success(`${spaceName} 호실이 삭제되었습니다.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={loading}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
