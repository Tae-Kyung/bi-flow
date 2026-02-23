import { requireAuth } from "@/lib/auth";
import { getApplications } from "@/actions/applications";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const statusLabels: Record<string, string> = {
  submitted: "접수",
  reviewing: "검토중",
  approved: "승인",
  rejected: "반려",
};
const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  submitted: "outline",
  reviewing: "secondary",
  approved: "default",
  rejected: "destructive",
};

export default async function ApplicationsPage() {
  const profile = await requireAuth();
  const applications = await getApplications();
  const isTenant = profile.role === "tenant";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isTenant ? "내 입주 신청" : "입주 신청 관리"}
        </h1>
        {isTenant && (
          <Link href="/applications/new">
            <Button><Plus className="mr-2 h-4 w-4" />입주 신청</Button>
          </Link>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>기업명</TableHead>
            <TableHead>대표자</TableHead>
            <TableHead>희망면적</TableHead>
            <TableHead>신청일</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app: any) => (
            <TableRow key={app.id}>
              <TableCell>
                <Link href={`/applications/${app.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                  {app.company_name}
                </Link>
              </TableCell>
              <TableCell>{app.representative}</TableCell>
              <TableCell>{app.desired_area ? `${app.desired_area}m²` : "-"}</TableCell>
              <TableCell>{new Date(app.created_at).toLocaleDateString("ko-KR")}</TableCell>
              <TableCell>
                <Badge variant={statusVariants[app.status]}>{statusLabels[app.status]}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {applications.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                입주 신청 내역이 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
