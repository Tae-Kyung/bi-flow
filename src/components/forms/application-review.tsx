"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { reviewApplication } from "@/actions/applications";
import type { Application } from "@/types";

const statusLabels: Record<string, string> = {
  submitted: "접수",
  reviewing: "검토중",
  approved: "승인",
  rejected: "반려",
};

interface Props {
  application: Application;
  canReview: boolean;
}

export function ApplicationReview({ application, canReview }: Props) {
  const router = useRouter();
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReview(action: "approved" | "rejected") {
    setLoading(true);
    try {
      await reviewApplication(application.id, action, rejectReason || undefined);
      router.push("/applications");
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{application.company_name}</CardTitle>
            <Badge>{statusLabels[application.status]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div><span className="text-muted-foreground">대표자:</span> {application.representative}</div>
            <div><span className="text-muted-foreground">사업자등록번호:</span> {application.biz_number}</div>
            <div><span className="text-muted-foreground">연락처:</span> {application.phone || "-"}</div>
            <div><span className="text-muted-foreground">이메일:</span> {application.email || "-"}</div>
            <div><span className="text-muted-foreground">희망 면적:</span> {application.desired_area ? `${application.desired_area}m²` : "-"}</div>
            <div><span className="text-muted-foreground">희망 기간:</span> {application.desired_period || "-"}</div>
          </div>
          {application.purpose && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">사업 목적</p>
                <p className="text-sm whitespace-pre-wrap">{application.purpose}</p>
              </div>
            </>
          )}
          {application.reject_reason && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">반려 사유</p>
                <p className="text-sm text-destructive">{application.reject_reason}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {canReview && (
        <Card>
          <CardHeader><CardTitle>검토</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>반려 사유 (반려 시 필수)</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="반려 사유를 입력하세요"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleReview("approved")} disabled={loading}>
                승인
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReview("rejected")}
                disabled={loading || !rejectReason.trim()}
              >
                반려
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={() => router.back()}>목록으로</Button>
    </div>
  );
}
