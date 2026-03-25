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
import {
  createContractWithSpace,
  addSpaceToContract,
  removeSpaceFromContract,
  updateContractDetails,
} from "@/actions/contracts";
import { DoorOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Space } from "@/types";

interface ContractSpace {
  id: string;
  space: { id: string; name: string; area: number; floor: string | null } | null;
}

interface ActiveContract {
  id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit: number;
  contract_spaces: ContractSpace[];
}

interface Props {
  companyId: string;
  orgId: string;
  activeContract: ActiveContract | null;
  availableSpaces: Space[];
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
  const [loading, setLoading] = useState(false);

  // 모드: null=보기, "edit"=계약정보 수정, "add"=호실 추가, "create"=최초 계약 생성
  const [mode, setMode] = useState<"edit" | "add" | "create" | null>(null);

  // 계약 정보 편집 폼
  const [editForm, setEditForm] = useState({
    startDate: activeContract?.start_date ?? "",
    endDate: activeContract?.end_date ?? "",
    rentAmount: String(activeContract?.rent_amount ?? 0),
    deposit: String(activeContract?.deposit ?? 0),
  });

  // 호실 추가 / 최초 생성 폼
  const [spaceForm, setSpaceForm] = useState({
    spaceId: "",
    startDate: "",
    endDate: "",
    rentAmount: "0",
    deposit: "0",
  });

  const assignedSpaceIds = (activeContract?.contract_spaces ?? [])
    .map((cs) => cs.space?.id)
    .filter(Boolean) as string[];

  const addableSpaces = availableSpaces.filter((s) => !assignedSpaceIds.includes(s.id));

  function openEdit() {
    setEditForm({
      startDate: activeContract?.start_date ?? "",
      endDate: activeContract?.end_date ?? "",
      rentAmount: String(activeContract?.rent_amount ?? 0),
      deposit: String(activeContract?.deposit ?? 0),
    });
    setMode("edit");
  }

  function openAdd() {
    setSpaceForm({ spaceId: "", startDate: "", endDate: "", rentAmount: "0", deposit: "0" });
    setMode("add");
  }

  function openCreate() {
    setSpaceForm({ spaceId: "", startDate: "", endDate: "", rentAmount: "0", deposit: "0" });
    setMode("create");
  }

  async function handleSaveEdit() {
    if (!editForm.startDate || !editForm.endDate) {
      toast.error("계약 시작일과 종료일을 입력해주세요."); return;
    }
    if (editForm.startDate >= editForm.endDate) {
      toast.error("계약 시작일은 종료일보다 앞이어야 합니다."); return;
    }
    setLoading(true);
    try {
      await updateContractDetails(
        activeContract!.id, companyId,
        editForm.startDate, editForm.endDate,
        Number(editForm.rentAmount) || 0, Number(editForm.deposit) || 0,
      );
      toast.success("계약 정보가 수정되었습니다.");
      setMode(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally { setLoading(false); }
  }

  async function handleAddSpace() {
    if (!spaceForm.spaceId) { toast.error("호실을 선택해주세요."); return; }
    setLoading(true);
    try {
      await addSpaceToContract(activeContract!.id, spaceForm.spaceId, companyId);
      toast.success("호실이 추가되었습니다.");
      setMode(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!spaceForm.spaceId) { toast.error("호실을 선택해주세요."); return; }
    if (!spaceForm.startDate || !spaceForm.endDate) {
      toast.error("계약 시작일과 종료일을 입력해주세요."); return;
    }
    if (spaceForm.startDate >= spaceForm.endDate) {
      toast.error("계약 시작일은 종료일보다 앞이어야 합니다."); return;
    }
    setLoading(true);
    try {
      await createContractWithSpace(
        companyId, orgId, spaceForm.spaceId,
        spaceForm.startDate, spaceForm.endDate,
        Number(spaceForm.rentAmount) || 0, Number(spaceForm.deposit) || 0,
      );
      toast.success("계약 및 호실 배정이 완료되었습니다.");
      setMode(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally { setLoading(false); }
  }

  async function handleRemoveSpace(cs: ContractSpace) {
    if (!cs.space) return;
    if (!confirm(`${cs.space.name} 호실 배정을 해제하시겠습니까?`)) return;
    setLoading(true);
    try {
      await removeSpaceFromContract(cs.id, cs.space.id, companyId);
      toast.success("호실 배정이 해제되었습니다.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally { setLoading(false); }
  }

  const spaceCount = activeContract?.contract_spaces.length ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <DoorOpen className="h-4 w-4" />
          입주 호실
          {spaceCount > 0 && (
            <Badge variant="secondary" className="ml-1">{spaceCount}</Badge>
          )}
        </CardTitle>
        {canEdit && mode === null && activeContract && (
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="h-3 w-3 mr-1" />계약 수정
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── 활성 계약 없음 ── */}
        {!activeContract && mode === null && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">배정된 계약이 없습니다.</p>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={openCreate} disabled={availableSpaces.length === 0}>
                <Plus className="h-3 w-3 mr-1" />계약 및 호실 배정
              </Button>
            )}
          </div>
        )}

        {/* ── 최초 계약 생성 폼 ── */}
        {mode === "create" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">계약 및 호실 배정</span>
              <Button variant="ghost" size="sm" onClick={() => setMode(null)} disabled={loading}><X className="h-3 w-3" /></Button>
            </div>
            <SpaceSelect value={spaceForm.spaceId} options={availableSpaces} onChange={(v) => setSpaceForm({ ...spaceForm, spaceId: v })} />
            <DateFields
              startDate={spaceForm.startDate} endDate={spaceForm.endDate}
              onStartChange={(v) => setSpaceForm({ ...spaceForm, startDate: v })}
              onEndChange={(v) => setSpaceForm({ ...spaceForm, endDate: v })}
            />
            <AmountFields
              rentAmount={spaceForm.rentAmount} deposit={spaceForm.deposit}
              onRentChange={(v) => setSpaceForm({ ...spaceForm, rentAmount: v })}
              onDepositChange={(v) => setSpaceForm({ ...spaceForm, deposit: v })}
            />
            <ActionButtons loading={loading} onSave={handleCreate} onCancel={() => setMode(null)} />
          </div>
        )}

        {/* ── 활성 계약 있음 ── */}
        {activeContract && (
          <>
            {/* 계약 정보 보기 / 편집 */}
            {mode === "edit" ? (
              <div className="rounded-lg border p-4 space-y-4">
                <DateFields
                  startDate={editForm.startDate} endDate={editForm.endDate}
                  onStartChange={(v) => setEditForm({ ...editForm, startDate: v })}
                  onEndChange={(v) => setEditForm({ ...editForm, endDate: v })}
                />
                <AmountFields
                  rentAmount={editForm.rentAmount} deposit={editForm.deposit}
                  onRentChange={(v) => setEditForm({ ...editForm, rentAmount: v })}
                  onDepositChange={(v) => setEditForm({ ...editForm, deposit: v })}
                />
                <ActionButtons loading={loading} onSave={handleSaveEdit} onCancel={() => setMode(null)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <div>계약기간: <span className="text-foreground">{activeContract.start_date} ~ {activeContract.end_date}</span></div>
                {activeContract.rent_amount > 0 && (
                  <div>월 임대료: <span className="text-foreground">{activeContract.rent_amount.toLocaleString()}원</span></div>
                )}
                {activeContract.deposit > 0 && (
                  <div>보증금: <span className="text-foreground">{activeContract.deposit.toLocaleString()}원</span></div>
                )}
              </div>
            )}

            {/* 배정된 호실 목록 */}
            {activeContract.contract_spaces.length === 0 && mode !== "add" && (
              <p className="text-sm text-muted-foreground">배정된 호실이 없습니다.</p>
            )}
            <div className="space-y-2">
              {activeContract.contract_spaces.map((cs) => (
                <div key={cs.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="default">입주 중</Badge>
                    <span className="font-semibold">{cs.space?.name ?? "-"}</span>
                    {cs.space?.floor && <span className="text-sm text-muted-foreground">{cs.space.floor}층</span>}
                    {cs.space?.area != null && cs.space.area > 0 && (
                      <span className="text-sm text-muted-foreground">{cs.space.area}m²</span>
                    )}
                  </div>
                  {canEdit && mode === null && (
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveSpace(cs)} disabled={loading} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* 호실 추가 폼 */}
            {mode === "add" && (
              <div className="rounded-lg border border-dashed p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">호실 추가</span>
                  <Button variant="ghost" size="sm" onClick={() => setMode(null)} disabled={loading}><X className="h-3 w-3" /></Button>
                </div>
                <SpaceSelect value={spaceForm.spaceId} options={addableSpaces} onChange={(v) => setSpaceForm({ ...spaceForm, spaceId: v })} />
                <ActionButtons loading={loading} onSave={handleAddSpace} onCancel={() => setMode(null)} />
              </div>
            )}

            {/* 호실 추가 버튼 */}
            {canEdit && mode === null && addableSpaces.length > 0 && (
              <Button variant="outline" size="sm" onClick={openAdd}>
                <Plus className="h-3 w-3 mr-1" />호실 추가
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── 공통 서브 컴포넌트 ──────────────────────

function SpaceSelect({
  value, options, onChange,
}: {
  value: string;
  options: { id: string; name: string; area: number; floor?: string | null }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>호실 선택</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="호실을 선택하세요" /></SelectTrigger>
        <SelectContent>
          {options.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}{s.area > 0 ? ` (${s.area}m²)` : ""}
            </SelectItem>
          ))}
          {options.length === 0 && (
            <SelectItem value="__none__" disabled>선택 가능한 공실이 없습니다</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function DateFields({
  startDate, endDate, onStartChange, onEndChange,
}: {
  startDate: string; endDate: string;
  onStartChange: (v: string) => void; onEndChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>계약 시작일</Label>
        <Input type="date" value={startDate} onChange={(e) => onStartChange(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>계약 종료일</Label>
        <Input type="date" value={endDate} onChange={(e) => onEndChange(e.target.value)} />
      </div>
    </div>
  );
}

function AmountFields({
  rentAmount, deposit, onRentChange, onDepositChange,
}: {
  rentAmount: string; deposit: string;
  onRentChange: (v: string) => void; onDepositChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>월 임대료 (원)</Label>
        <Input type="number" value={rentAmount} onChange={(e) => onRentChange(e.target.value)} placeholder="0" />
      </div>
      <div className="space-y-2">
        <Label>보증금 (원)</Label>
        <Input type="number" value={deposit} onChange={(e) => onDepositChange(e.target.value)} placeholder="0" />
      </div>
    </div>
  );
}

function ActionButtons({
  loading, onSave, onCancel,
}: {
  loading: boolean; onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <Button onClick={onSave} disabled={loading}>{loading ? "저장 중..." : "저장"}</Button>
      <Button variant="outline" onClick={onCancel} disabled={loading}>취소</Button>
    </div>
  );
}
