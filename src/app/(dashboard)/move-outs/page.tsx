import { requireAuth } from "@/lib/auth";
import { getMoveOuts } from "@/actions/move-outs";
import { getOrganizations } from "@/actions/organizations";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { MoveOutDeleteButton } from "@/components/move-outs/move-out-delete-button";

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

export default async function MoveOutsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const profile = await requireAuth();
  const { org } = await searchParams;

  const isSuperAdmin = profile.role === "super_admin";
  const canCreate = isSuperAdmin || profile.role === "org_admin";

  const [moveOuts, organizations] = await Promise.all([
    getMoveOuts(isSuperAdmin ? org : undefined),
    isSuperAdmin ? getOrganizations() : Promise.resolve([]),
  ]);

  const canDelete = isSuperAdmin || profile.role === "org_admin";
  const colCount = (isSuperAdmin ? 6 : 5) + (canDelete ? 1 : 0);

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

      {/* 기관 필터 (super_admin 전용) */}
      {isSuperAdmin && organizations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link href="/move-outs">
            <Badge
              variant={!org ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-sm"
            >
              전체
            </Badge>
          </Link>
          {organizations.map((o: any) => (
            <Link key={o.id} href={`/move-outs?org=${o.id}`}>
              <Badge
                variant={org === o.id ? "default" : "outline"}
                className="cursor-pointer px-3 py-1 text-sm"
              >
                {o.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {isSuperAdmin && <TableHead>기관</TableHead>}
            <TableHead>기업명</TableHead>
            <TableHead>호실</TableHead>
            <TableHead>신청일</TableHead>
            <TableHead>퇴거예정일</TableHead>
            <TableHead>상태</TableHead>
            {canDelete && <TableHead className="w-10" />}
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
                {isSuperAdmin && (
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {m.organization?.name}
                  </TableCell>
                )}
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
                {canDelete && (
                  <TableCell>
                    <MoveOutDeleteButton id={m.id} />
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {moveOuts.length === 0 && (
            <TableRow>
              <TableCell colSpan={colCount} className="text-center text-muted-foreground">퇴거 내역이 없습니다.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
