import { requireAuth } from "@/lib/auth";
import { getCompany } from "@/actions/companies";
import { getOrganizations } from "@/actions/organizations";
import { getDocuments } from "@/actions/documents";
import { getActiveContractByCompany } from "@/actions/contracts";
import { getSpaces } from "@/actions/spaces";
import { CompanyForm } from "@/components/forms/company-form";
import { DocumentUpload } from "@/components/forms/document-upload";
import { SpaceMappingCard } from "@/components/forms/space-mapping-card";
import type { Company, Organization, Space } from "@/types";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAuth();
  const { id } = await params;
  const company = (await getCompany(id)) as Company;
  const isSuperAdmin = profile.role === "super_admin";
  const isAdmin = isSuperAdmin || profile.role === "org_admin";

  let organizations: Organization[] = [];
  if (isSuperAdmin) {
    organizations = (await getOrganizations()) as Organization[];
  }

  const [documents, activeContract, allSpaces] = await Promise.all([
    getDocuments(id),
    getActiveContractByCompany(id),
    getSpaces(),
  ]);

  const vacantSpaces = (allSpaces as Space[])
    .filter((s) => s.status === "vacant")
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const canUpload = isAdmin || profile.role === "tenant";
  const canDelete = isAdmin;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">기업 수정</h1>

      {/* 입주 호실 매핑 */}
      <SpaceMappingCard
        companyId={id}
        orgId={company.org_id}
        activeContract={activeContract as any}
        availableSpaces={vacantSpaces}
        canEdit={isAdmin}
      />

      <CompanyForm
        company={company}
        organizations={organizations}
        showOrgSelect={isSuperAdmin}
      />

      <DocumentUpload
        companyId={id}
        orgId={company.org_id}
        documents={documents}
        canUpload={canUpload}
        canDelete={canDelete}
      />
    </div>
  );
}
