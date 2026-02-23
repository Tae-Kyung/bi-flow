import { requireRole } from "@/lib/auth";
import { getOrganization } from "@/actions/organizations";
import { OrganizationForm } from "@/components/forms/organization-form";
import type { Organization } from "@/types";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["super_admin"]);
  const { id } = await params;
  const organization = (await getOrganization(id)) as Organization;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">기관 수정</h1>
      <OrganizationForm organization={organization} />
    </div>
  );
}
