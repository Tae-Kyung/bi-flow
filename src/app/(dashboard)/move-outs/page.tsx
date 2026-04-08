import { requireAuth } from "@/lib/auth";
import { getMoveOuts } from "@/actions/move-outs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const statusLabels: Record<string, string> = {
  requested: "신청",
  inspecting: "시설점검",
  settling: "정산중",
  completed: "완료",
};
const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  requested: "outline",
  inspecting: "secondary",
  settling: "secondary",
  completed: "default",
};

export default async function MoveOutsPage() {
  const profile = await requireAuth();
  const moveOuts = await getMoveOuts();
  const canCreate = profile.role === "super_admin" || profile.role === "org_admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">퇴거 관리</h1>
        {canCreate && (
          <Link href="/move-outs/new">
            <Button><Plus className="mr-2 h-4 w-4" />퇴거 등록</Button>
          </Link>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>기업명</TableHead>
            <TableHead>호실</TableHead>
            <TableHead>신청일</TableHead>
            <TableHead>퇴거예정일</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {moveOuts.map((m: any) => {
            const spaceNames = (m.contract?.contract_spaces ?? [])
              .map((cs: any) => cs.space?.name)
              .filter(Boolean)
              .join(", ") || "-";
            const isAutoProcessed = m.reason?.includes("직접 처리");
            return (
              <TableRow key={m.id}>
                <TableCell>
                  <Link href={`/move-outs/${m.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                    {m.company?.name}
                  </Link>
                </TableCell>
                <TableCell>{spaceNames}</TableCell>
                <TableCell>{m.request_date}</TableCell>
                <TableCell>{m.exit_date || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariants[m.status]}>{statusLabels[m.status]}</Badge>
                    {isAutoProcessed && (
                      <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">직접처리</Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {moveOuts.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">퇴거 내역이 없습니다.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
