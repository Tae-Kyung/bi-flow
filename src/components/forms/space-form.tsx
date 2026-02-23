"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSpace, updateSpace } from "@/actions/spaces";
import type { Organization, Space } from "@/types";

interface Props {
  space?: Space;
  organizations?: Organization[];
  showOrgSelect?: boolean;
}

export function SpaceForm({ space, organizations, showOrgSelect }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      if (space) {
        await updateSpace(space.id, formData);
      } else {
        await createSpace(formData);
      }
      router.push("/spaces");
    } catch {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{space ? "공간 수정" : "공간 등록"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {showOrgSelect && organizations && (
            <div className="space-y-2">
              <Label htmlFor="org_id">기관</Label>
              <Select name="org_id" defaultValue={space?.org_id}>
                <SelectTrigger>
                  <SelectValue placeholder="기관 선택" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">호실명</Label>
              <Input
                id="name"
                name="name"
                placeholder="예: 301호"
                defaultValue={space?.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor">층</Label>
              <Input
                id="floor"
                name="floor"
                placeholder="예: 3F"
                defaultValue={space?.floor || ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area">전용면적 (m²)</Label>
            <Input
              id="area"
              name="area"
              type="number"
              step="0.01"
              defaultValue={space?.area || ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={space?.description || ""}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "저장 중..." : "저장"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              취소
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
