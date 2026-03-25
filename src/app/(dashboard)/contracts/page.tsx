import { requireAuth } from "@/lib/auth";
import { getContracts } from "@/actions/contracts";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw } from "lucide-react";

const statusLabels: Record<string, string> = {
  draft: "초안",
  active: "활성",
  expired: "만료",
  terminated: "해지",
};
const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  active: "default",
  expired: "secondary",
  terminated: "destructive",
};

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default async function ContractsPage() {
  const profile = await requireAuth();
  const contracts = await getContracts();
  const canCreate = profile.role === "super_admin" || profile.role === "org_admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">계약 관리</h1>
        {canCreate && (
          <div className="flex items-center gap-2">
            <Link href="/contracts/bulk-renew">
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                일괄 갱신
              </Button>
            </Link>
            <Link href="/contracts/new">
              <Button><Plus className="mr-2 h-4 w-4" />계약 생성</Button>
            </Link>
          </div>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>기업명</TableHead>
            <TableHead>호실</TableHead>
            <TableHead>계약기간</TableHead>
            <TableHead>만료까지</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((c: any) => {
            const days = c.status === "active" ? daysUntil(c.end_date) : null;
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/contracts/${c.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                    {c.company?.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {(c.contract_spaces as any[])?.map((cs: any) => cs.space?.name).filter(Boolean).join(", ") || "-"}
                </TableCell>
                <TableCell className="text-sm">
                  {c.start_date} ~ {c.end_date}
                </TableCell>
                <TableCell>
                  {days !== null && (
                    <span className={days <= 30 ? "font-semibold text-destructive" : ""}>
                      {days > 0 ? `${days}일` : "만료됨"}
                    </span>
                  )}
                  {days === null && "-"}
                </TableCell>
                <TableCell className="flex items-center gap-1">
                  <Badge variant={statusVariants[c.status]}>{statusLabels[c.status]}</Badge>
                  {c.previous_contract_id && (
                    <Badge variant="outline">연장</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {contracts.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">등록된 계약이 없습니다.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
