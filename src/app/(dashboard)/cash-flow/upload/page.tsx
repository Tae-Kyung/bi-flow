import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CashUploadClient } from "@/components/cash-flow/upload-client";
import { getUploadedFiles } from "@/actions/cash-flow";

export default async function CashUploadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const profile = await requireAuth();
  if (profile.role === "tenant") {
    return <div className="text-sm text-muted-foreground">접근 권한이 없습니다.</div>;
  }

  const params = await searchParams;
  const supabase = await createClient();

  let orgId = profile.org_id ?? "";
  let orgName = "";
  let allOrgs: { id: string; name: string }[] = [];

  if (profile.role === "super_admin") {
    const { data: orgs } = await supabase.from("organizations").select("id, name").order("name");
    allOrgs = orgs ?? [];
    // URL 파라미터 우선, 없으면 첫 번째
    orgId = params.org ?? orgs?.[0]?.id ?? "";
    orgName = allOrgs.find((o) => o.id === orgId)?.name ?? "";
  } else {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();
    orgName = org?.name ?? "";
  }

  const uploadedFiles = orgId ? await getUploadedFiles(orgId) : [];

  // 현재 저장된 데이터의 최신 날짜 조회
  let latestDate = "";
  if (orgId) {
    const { data: latest } = await supabase
      .from("cash_transactions")
      .select("approved_at")
      .eq("org_id", orgId)
      .order("approved_at", { ascending: false })
      .limit(1)
      .single();
    latestDate = latest?.approved_at ?? "";
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/cash-flow" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">현금출납부 업로드</h1>
      </div>

      {/* super_admin 기관 선택 */}
      {profile.role === "super_admin" && allOrgs.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기관 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <form method="get" className="flex gap-2 flex-wrap">
              {allOrgs.map((org) => (
                <button
                  key={org.id}
                  name="org"
                  value={org.id}
                  type="submit"
                  className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                    orgId === org.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {org.name}
                </button>
              ))}
            </form>
          </CardContent>
        </Card>
      )}

      {/* 업로드 시점 안내 */}
      {orgId && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          latestDate
            ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300"
            : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300"
        }`}>
          {latestDate ? (
            <>
              <p className="font-medium">
                현재 저장된 데이터 최신 날짜: <strong>{latestDate}</strong>
              </p>
              <p className="mt-1 text-xs opacity-80">
                이후 날짜의 거래가 포함된 파일을 업로드해 주세요. 이미 저장된 데이터는 자동으로 건너뜁니다.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">저장된 데이터가 없습니다.</p>
              <p className="mt-1 text-xs opacity-80">
                분석을 시작하려면 현금출납부 파일을 업로드해 주세요.
              </p>
            </>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">파일 형식 안내</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li>파일 형식: <strong>XLS/XLSX</strong> (충북대 BI 현금출납부 형식) 또는 TXT (탭구분자, EUC-KR)</li>
            <li>파일명 예: <code className="bg-muted px-1 rounded">충북대BI.xls</code> · <code className="bg-muted px-1 rounded">충북대BI_CASH.txt</code></li>
            <li>컬럼 구성: No, 승인일자, 승인번호, 계정코드, 계정명, 계좌코드, 입금액, 출금액, 잔액, 적요 등</li>
            <li>중복 데이터는 자동으로 건너뛰고 신규 건만 저장됩니다</li>
          </ul>
          <p className="text-xs mt-3 pt-3 border-t">
            업로드 대상 기관: <strong>{orgName}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">파일 업로드</CardTitle>
        </CardHeader>
        <CardContent>
          {orgId ? (
            <CashUploadClient orgId={orgId} uploadedFiles={uploadedFiles} />
          ) : (
            <p className="text-sm text-muted-foreground">기관 정보가 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
