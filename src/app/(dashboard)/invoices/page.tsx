import { requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InvoicesPage() {
  await requireAuth();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">고지서</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-muted-foreground">Phase 3에서 구현 예정</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            고지서 자동 발행, 수납 관리, 미납 알림 기능이 Phase 3에서 추가됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
