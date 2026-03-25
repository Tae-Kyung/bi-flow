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
import { addCompanySpace, updateCompanySpaceContract, removeCompanySpace } from "@/actions/contracts";
import { DoorOpen, Pencil, Plus, Trash2, X } from "lucide-react";
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
  activeContracts: ActiveContract[];
  availableSpaces: Space[]; // vacant 호실 목록
  canEdit: boolean;
}

interface SpaceFormState {
  spaceId: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  deposit: string;
}

function emptyForm(): SpaceFormState {
  return { spaceId: "", startDate: "", endDate: "", rentAmount: "0", deposit: "0" };
}

function validateForm(form: SpaceFormState): string | null {
  if (!form.spaceId) return "호실을 선택해주세요.";
  if (!form.startDate || !form.endDate) return "계약 시작일과 종료일을 입력해주세요.";
  if (form.startDate >= form.endDate) return "계약 시작일은 종료일보다 앞이어야 합니다.";
  return null;
}

export function SpaceMappingCard({
  companyId,
  orgId,
  activeContracts,
  availableSpaces,
  canEdit,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 편집 중인 계약 ID (null이면 편집 없음)
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  // 새 호실 추가 폼 표시 여부
  const [addingNew, setAddingNew] = useState(false);

  // 편집 폼 상태
  const [editForm, setEditForm] = useState<SpaceFormState>(emptyForm());
  // 추가 폼 상태
  const [addForm, setAddForm] = useState<SpaceFormState>(emptyForm());

  // 이미 배정된 space_id 목록
  const assignedSpaceIds = activeContracts
    .map((c) => c.space?.id)
    .filter(Boolean) as string[];

  // 추가 시 선택 가능한 호실: 이미 배정된 호실 제외한 공실
  const addableSpaces = availableSpaces.filter((s) => !assignedSpaceIds.includes(s.id));

  function startEdit(contract: ActiveContract) {
    setEditingContractId(contract.id);
    setEditForm({
      spaceId: contract.space?.id ?? "",
      startDate: contract.start_date,
      endDate: contract.end_date,
      rentAmount: String(contract.rent_amount),
      deposit: String(contract.deposit),
    });
    setAddingNew(false);
  }

  function cancelEdit() {
    setEditingContractId(null);
    setEditForm(emptyForm());
  }

  function startAdd() {
    setAddingNew(true);
    setAddForm(emptyForm());
    setEditingContractId(null);
  }

  function cancelAdd() {
    setAddingNew(false);
    setAddForm(emptyForm());
  }

  async function handleSaveEdit(contract: ActiveContract) {
    const err = validateForm(editForm);
    if (err) { toast.error(err); return; }

    setLoading(true);
    try {
      await updateCompanySpaceContract(
        contract.id,
        companyId,
        contract.space?.id ?? "",
        editForm.spaceId,
        editForm.startDate,
        editForm.endDate,
        Number(editForm.rentAmount) || 0,
        Number(editForm.deposit) || 0,
      );
      toast.success("호실 정보가 수정되었습니다.");
      setEditingContractId(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    const err = validateForm(addForm);
    if (err) { toast.error(err); return; }

    setLoading(true);
    try {
      await addCompanySpace(
        companyId,
        orgId,
        addForm.spaceId,
        addForm.startDate,
        addForm.endDate,
        Number(addForm.rentAmount) || 0,
        Number(addForm.deposit) || 0,
      );
      toast.success("호실이 추가되었습니다.");
      setAddingNew(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(contract: ActiveContract) {
    if (!contract.space) return;
    if (!confirm(`${contract.space.name} 호실 배정을 해제하시겠습니까?`)) return;

    setLoading(true);
    try {
      await removeCompanySpace(contract.id, contract.space.id, companyId);
      toast.success("호실 배정이 해제되었습니다.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <DoorOpen className="h-4 w-4" />
          입주 호실
          {activeContracts.length > 0 && (
            <Badge variant="secondary" className="ml-1">{activeContracts.length}</Badge>
          )}
        </CardTitle>
        {canEdit && !addingNew && editingContractId === null && (
          <Button variant="outline" size="sm" onClick={startAdd} disabled={addableSpaces.length === 0}>
            <Plus className="h-3 w-3 mr-1" />
            호실 추가
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 배정된 호실 목록 */}
        {activeContracts.length === 0 && !addingNew && (
          <p className="text-sm text-muted-foreground">배정된 호실이 없습니다.</p>
        )}

        {activeContracts.map((contract) => {
          const isEditing = editingContractId === contract.id;
          // 편집 시 선택 가능한 호실: 이 계약의 현재 호실 + 다른 기업에 배정 안 된 공실
          const editableSpaces = [
            ...(contract.space
              ? [{ id: contract.space.id, name: contract.space.name, area: contract.space.area, floor: contract.space.floor, status: "occupied" as const }]
              : []),
            ...availableSpaces.filter((s) => s.id !== contract.space?.id),
          ];

          return (
            <div key={contract.id} className="rounded-lg border p-4 space-y-3">
              {!isEditing ? (
                /* 보기 모드 */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="default">입주 중</Badge>
                      <span className="font-semibold text-lg">{contract.space?.name ?? "-"}</span>
                      {contract.space?.floor && (
                        <span className="text-sm text-muted-foreground">{contract.space.floor}층</span>
                      )}
                      {contract.space?.area != null && contract.space.area > 0 && (
                        <span className="text-sm text-muted-foreground">{contract.space.area}m²</span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(contract)} disabled={loading}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(contract)} disabled={loading} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <div>계약기간: <span className="text-foreground">{contract.start_date} ~ {contract.end_date}</span></div>
                    {contract.rent_amount > 0 && (
                      <div>월 임대료: <span className="text-foreground">{contract.rent_amount.toLocaleString()}원</span></div>
                    )}
                    {contract.deposit > 0 && (
                      <div>보증금: <span className="text-foreground">{contract.deposit.toLocaleString()}원</span></div>
                    )}
                  </div>
                </div>
              ) : (
                /* 편집 모드 */
                <SpaceForm
                  form={editForm}
                  onChange={setEditForm}
                  spaceOptions={editableSpaces}
                  currentSpaceId={contract.space?.id}
                  loading={loading}
                  onSave={() => handleSaveEdit(contract)}
                  onCancel={cancelEdit}
                />
              )}
            </div>
          );
        })}

        {/* 새 호실 추가 폼 */}
        {addingNew && (
          <div className="rounded-lg border border-dashed p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">새 호실 추가</span>
              <Button variant="ghost" size="sm" onClick={cancelAdd} disabled={loading}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <SpaceForm
              form={addForm}
              onChange={setAddForm}
              spaceOptions={addableSpaces}
              loading={loading}
              onSave={handleAdd}
              onCancel={cancelAdd}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SpaceFormProps {
  form: SpaceFormState;
  onChange: (form: SpaceFormState) => void;
  spaceOptions: { id: string; name: string; area: number; floor: string | null; status?: string }[];
  currentSpaceId?: string;
  loading: boolean;
  onSave: () => void;
  onCancel: () => void;
}

function SpaceForm({ form, onChange, spaceOptions, currentSpaceId, loading, onSave, onCancel }: SpaceFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>호실 선택</Label>
        <Select value={form.spaceId} onValueChange={(v) => onChange({ ...form, spaceId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="호실을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {spaceOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {s.area > 0 && ` (${s.area}m²)`}
                {s.id === currentSpaceId ? " [현재]" : ""}
              </SelectItem>
            ))}
            {spaceOptions.length === 0 && (
              <SelectItem value="__none__" disabled>선택 가능한 공실이 없습니다</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>계약 시작일</Label>
          <Input type="date" value={form.startDate} onChange={(e) => onChange({ ...form, startDate: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>계약 종료일</Label>
          <Input type="date" value={form.endDate} onChange={(e) => onChange({ ...form, endDate: e.target.value })} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>월 임대료 (원)</Label>
          <Input type="number" value={form.rentAmount} onChange={(e) => onChange({ ...form, rentAmount: e.target.value })} placeholder="0" />
        </div>
        <div className="space-y-2">
          <Label>보증금 (원)</Label>
          <Input type="number" value={form.deposit} onChange={(e) => onChange({ ...form, deposit: e.target.value })} placeholder="0" />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={onSave} disabled={loading}>
          {loading ? "저장 중..." : "저장"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          취소
        </Button>
      </div>
    </div>
  );
}
