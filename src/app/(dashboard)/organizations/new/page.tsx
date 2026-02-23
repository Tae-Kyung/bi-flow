import { requireRole } from "@/lib/auth";
import { OrganizationForm } from "@/components/forms/organization-form";

export default async function NewOrganizationPage() {
  await requireRole(["super_admin"]);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">기관 등록</h1>
      <OrganizationForm />
    </div>
  );
}
