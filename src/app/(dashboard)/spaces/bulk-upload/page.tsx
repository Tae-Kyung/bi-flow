import { requireAuth } from "@/lib/auth";
import { getOrganizations } from "@/actions/organizations";
import { SpaceBulkUploadClient } from "@/components/forms/space-bulk-upload-client";
import type { Organization } from "@/types";

export default async function SpaceBulkUploadPage() {
  const profile = await requireAuth();
  const isSuperAdmin = profile.role === "super_admin";

  if (profile.role !== "super_admin" && profile.role !== "org_admin") {
    return (
      <div className="text-center text-muted-foreground py-12">
        권한이 없습니다.
      </div>
    );
  }

  let organizations: Organization[] = [];
  if (isSuperAdmin) {
    organizations = (await getOrganizations()) as Organization[];
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">공간 일괄 등록</h1>
      <SpaceBulkUploadClient
        organizations={organizations}
        showOrgSelect={isSuperAdmin}
        defaultOrgId={profile.org_id || undefined}
      />
    </div>
  );
}
