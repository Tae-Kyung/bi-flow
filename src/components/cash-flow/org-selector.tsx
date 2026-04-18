"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  orgs: { id: string; name: string }[];
  current: string;
}

export function OrgSelector({ orgs, current }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params.toString());
    next.set("org", e.target.value);
    router.push(`/cash-flow?${next.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={onChange}
      className="rounded-md border px-2 py-1.5 text-sm bg-background"
    >
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
