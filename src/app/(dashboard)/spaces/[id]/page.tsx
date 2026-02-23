import { requireAuth } from "@/lib/auth";
import { getSpace } from "@/actions/spaces";
import { getOrganizations } from "@/actions/organizations";
import { SpaceForm } from "@/components/forms/space-form";
import type { Organization, Space } from "@/types";

export default async function SpaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAuth();
  const { id } = await params;
  const space = (await getSpace(id)) as Space;
  const isSuperAdmin = profile.role === "super_admin";

  let organizations: Organization[] = [];
  if (isSuperAdmin) {
    organizations = (await getOrganizations()) as Organization[];
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">공간 수정</h1>
      <SpaceForm
        space={space}
        organizations={organizations}
        showOrgSelect={isSuperAdmin}
      />
    </div>
  );
}
