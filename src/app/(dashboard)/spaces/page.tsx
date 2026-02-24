import { requireAuth } from "@/lib/auth";
import { getSpaces } from "@/actions/spaces";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload } from "lucide-react";

const statusLabels: Record<string, string> = {
  vacant: "공실",
  occupied: "입주",
};

const statusVariants: Record<string, "default" | "secondary"> = {
  vacant: "secondary",
  occupied: "default",
};

export default async function SpacesPage() {
  const profile = await requireAuth();
  const spaces = await getSpaces();

  const isSuperAdmin = profile.role === "super_admin";
  const canCreate = isSuperAdmin || profile.role === "org_admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">공간 관리</h1>
        {canCreate && (
          <div className="flex items-center gap-2">
            <Link href="/spaces/bulk-upload">
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                일괄 등록
              </Button>
            </Link>
            <Link href="/spaces/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                공간 등록
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {isSuperAdmin && <TableHead>기관</TableHead>}
            <TableHead>호실명</TableHead>
            <TableHead>층</TableHead>
            <TableHead className="text-right">전용면적 (m²)</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {spaces.map((space: any) => (
            <TableRow key={space.id}>
              {isSuperAdmin && (
                <TableCell className="text-muted-foreground">
                  {space.organization?.name}
                </TableCell>
              )}
              <TableCell>
                <Link
                  href={`/spaces/${space.id}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {space.name}
                </Link>
              </TableCell>
              <TableCell>{space.floor || "-"}</TableCell>
              <TableCell className="text-right">{space.area}</TableCell>
              <TableCell>
                <Badge variant={statusVariants[space.status]}>
                  {statusLabels[space.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {spaces.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={isSuperAdmin ? 5 : 4}
                className="text-center text-muted-foreground"
              >
                등록된 공간이 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
