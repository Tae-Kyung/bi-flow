import { requireAuth } from "@/lib/auth";
import { getApplication } from "@/actions/applications";
import { ApplicationReview } from "@/components/forms/application-review";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAuth();
  const { id } = await params;
  const application = await getApplication(id);
  const canReview =
    (profile.role === "super_admin" || profile.role === "org_admin") &&
    (application.status === "submitted" || application.status === "reviewing");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">입주 신청 상세</h1>
      <ApplicationReview application={application} canReview={canReview} />
    </div>
  );
}
