"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  orgId: string;
  isSuperAdmin: boolean;
  from: string;
  to: string;
  type: string;
  category: string;
  expenseCategories: string[];
  incomeCategories: string[];
}

export function TransactionFilters({
  orgId,
  isSuperAdmin,
  from,
  to,
  type: initialType,
  category: initialCategory,
  expenseCategories,
  incomeCategories,
}: Props) {
  const [type, setType] = useState(initialType);
  const [category, setCategory] = useState(initialCategory);

  const categoryOptions =
    type === "expense"
      ? expenseCategories
      : type === "income"
      ? incomeCategories
      : [...expenseCategories, ...incomeCategories];

  function handleTypeChange(newType: string) {
    setType(newType);
    // type이 바뀌면 현재 선택된 비목이 새 목록에 없을 수 있으므로 초기화
    const nextOptions =
      newType === "expense"
        ? expenseCategories
        : newType === "income"
        ? incomeCategories
        : [...expenseCategories, ...incomeCategories];
    if (!nextOptions.includes(category)) setCategory("");
  }

  const resetHref = `/cash-flow/transactions${isSuperAdmin && orgId ? `?org=${orgId}` : ""}`;

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <form method="get" className="flex items-center gap-2 flex-wrap">
        {isSuperAdmin && orgId && <input type="hidden" name="org" value={orgId} />}
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded border px-2 py-1 text-sm bg-background"
        />
        <span className="text-muted-foreground">~</span>
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded border px-2 py-1 text-sm bg-background"
        />
        <select
          name="type"
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="rounded border px-2 py-1 text-sm bg-background"
        >
          <option value="">전체</option>
          <option value="income">입금만</option>
          <option value="expense">출금만</option>
        </select>
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border px-2 py-1 text-sm bg-background"
        >
          <option value="">비목 전체</option>
          {type !== "income" && expenseCategories.length > 0 && (
            <optgroup label="지출 비목">
              {expenseCategories.map((c) => (
                <option key={`e-${c}`} value={c}>{c}</option>
              ))}
            </optgroup>
          )}
          {type !== "expense" && incomeCategories.length > 0 && (
            <optgroup label="수입 항목">
              {incomeCategories.map((c) => (
                <option key={`i-${c}`} value={c}>{c}</option>
              ))}
            </optgroup>
          )}
        </select>
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground"
        >
          조회
        </button>
        {(from || to || initialType || initialCategory) && (
          <Link
            href={resetHref}
            className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
          >
            초기화
          </Link>
        )}
      </form>
    </div>
  );
}
