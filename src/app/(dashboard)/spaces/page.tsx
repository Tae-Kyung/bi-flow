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
import { ChevronDown, ChevronUp, ChevronsUpDown, Pencil, Plus, Upload } from "lucide-react";
import { SpaceDeleteButton } from "@/components/forms/space-delete-button";

const statusLabels: Record<string, string> = {
  vacant: "공실",
  occupied: "입주",
};

const statusVariants: Record<string, "default" | "secondary"> = {
  vacant: "secondary",
  occupied: "default",
};

export default async function SpacesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; order?: string }>;
}) {
  const profile = await requireAuth();
  const { sort, order } = await searchParams;
  const spaces = await getSpaces(undefined, sort, order);

  const isSuperAdmin = profile.role === "super_admin";
  const canCreate = isSuperAdmin || profile.role === "org_admin";
  const colCount = isSuperAdmin ? 8 : 7;

  function sortHref(field: string) {
    const nextOrder = sort === field && order === "asc" ? "desc" : "asc";
    return `/spaces?sort=${field}&order=${nextOrder}`;
  }

  function SortIcon({ field }: { field: string }) {
    if (sort !== field) return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground" />;
    return order === "asc"
      ? <ChevronUp className="ml-1 inline h-3 w-3" />
      : <ChevronDown className="ml-1 inline h-3 w-3" />;
  }

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
            <TableHead>
              <Link href={sortHref("name")} className="flex items-center hover:text-foreground">
                호실명<SortIcon field="name" />
              </Link>
            </TableHead>
            <TableHead>층</TableHead>
            <TableHead className="text-right">전용면적 (m²)</TableHead>
            <TableHead>설명</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>
              <Link href={sortHref("company")} className="flex items-center hover:text-foreground">
                입주기업<SortIcon field="company" />
              </Link>
            </TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {spaces.map((space: any) => (
            <TableRow key={space.id}>
              {isSuperAdmin && (
                <TableCell className="text-muted-foreground whitespace-nowrap">
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
              <TableCell className="text-muted-foreground">
                {space.description || "-"}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariants[space.status]}>
                  {statusLabels[space.status]}
                </Badge>
              </TableCell>
              <TableCell>
                {space.tenant_company ? (
                  <Link
                    href={`/companies/${space.tenant_company.id}`}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {space.tenant_company.name}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link href={`/spaces/${space.id}`}>
                    <Button variant="ghost" size="icon">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  {canCreate && (
                    <SpaceDeleteButton spaceId={space.id} spaceName={space.name} />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {spaces.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={colCount}
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
