"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignCompanySpace } from "@/actions/contracts";
import { DoorOpen, Pencil } from "lucide-react";
import type { Space } from "@/types";

interface ActiveContract {
  id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit: number;
  space: { id: string; name: string; area: number; floor: string | null } | null;
}

interface Props {
  companyId: string;
  orgId: string;
  activeContract: ActiveContract | null;
  availableSpaces: Space[];  // vacant 호실 목록
  canEdit: boolean;
}

export function SpaceMappingCard({
  companyId,
  orgId,
  activeContract,
  availableSpaces,
  canEdit,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentSpaceId = activeContract?.space?.id ?? "";
  const [selectedSpaceId, setSelectedSpaceId] = useState(currentSpaceId);
  const [startDate, setStartDate] = useState(activeContract?.start_date ?? "");
  const [endDate, setEndDate] = useState(activeContract?.end_date ?? "");
  const [rentAmount, setRentAmount] = useState(String(activeContract?.rent_amount ?? 0));
  const [deposit, setDeposit] = useState(String(activeContract?.deposit ?? 0));

  // 현재 입주 중인 호실도 선택 목록에 포함
  const spaceOptions = [
    ...(activeContract?.space
      ? [{ id: activeContract.space.id, name: activeContract.space.name, area: activeContract.space.area, floor: activeContract.space.floor, status: "occupied" as const }]
      : []),
    ...availableSpaces.filter((s) => s.id !== activeContract?.space?.id),
  ];

  async function handleSave() {
    if (!selectedSpaceId) {
      toast.error("호실을 선택해주세요.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("계약 시작일과 종료일을 입력해주세요.");
      return;
    }
    if (startDate >= endDate) {
      toast.error("계약 시작일은 종료일보다 앞이어야 합니다.");
      return;
    }

    setLoading(true);
    try {
      await assignCompanySpace(
        companyId,
        orgId,
        selectedSpaceId,
        startDate,
        endDate,
        Number(rentAmount) || 0,
        Number(deposit) || 0
      );
      toast.success("호실 배정이 완료되었습니다.");
      setEditing(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setSelectedSpaceId(currentSpaceId);
    setStartDate(activeContract?.start_date ?? "");
    setEndDate(activeContract?.end_date ?? "");
    setRentAmount(String(activeContract?.rent_amount ?? 0));
    setDeposit(String(activeContract?.deposit ?? 0));
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <DoorOpen className="h-4 w-4" />
          입주 호실
        </CardTitle>
        {canEdit && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3 mr-1" />
            {activeContract?.space ? "호실 변경" : "호실 배정"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!editing ? (
          /* 현재 상태 표시 */
          activeContract?.space ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="default">입주 중</Badge>
                <span className="font-semibold text-lg">{activeContract.space.name}</span>
                {activeContract.space.floor && (
                  <span className="text-sm text-muted-foreground">{activeContract.space.floor}층</span>
                )}
                {activeContract.space.area > 0 && (
                  <span className="text-sm text-muted-foreground">{activeContract.space.area}m²</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <div>계약기간: <span className="text-foreground">{activeContract.start_date} ~ {activeContract.end_date}</span></div>
                {activeContract.rent_amount > 0 && (
                  <div>월 임대료: <span className="text-foreground">{activeContract.rent_amount.toLocaleString()}원</span></div>
                )}
                {activeContract.deposit > 0 && (
                  <div>보증금: <span className="text-foreground">{activeContract.deposit.toLocaleString()}원</span></div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">배정된 호실이 없습니다.</p>
          )
        ) : (
          /* 편집 폼 */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>호실 선택</Label>
              <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="호실을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {spaceOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.area > 0 && ` (${s.area}m²)`}
                      {s.id === activeContract?.space?.id ? " [현재]" : ""}
                    </SelectItem>
                  ))}
                  {spaceOptions.length === 0 && (
                    <SelectItem value="" disabled>공실이 없습니다</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>계약 시작일</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>계약 종료일</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>월 임대료 (원)</Label>
                <Input
                  type="number"
                  value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>보증금 (원)</Label>
                <Input
                  type="number"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "저장 중..." : "저장"}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={loading}>
                취소
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
