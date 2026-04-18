"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import type { CategoryPoint } from "@/actions/cash-flow";

const EXPENSE_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  "#6b7280", "#0ea5e9", "#d946ef",
];

const INCOME_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#f97316", "#6b7280",
];

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border bg-background p-2 shadow text-xs">
      <p className="font-semibold">{d.name}</p>
      <p>{Number(d.value).toLocaleString("ko-KR")}원</p>
      <p className="text-muted-foreground">{d.payload.count}건</p>
    </div>
  );
};

interface PieProps {
  data: CategoryPoint[];
  colors: string[];
}

function CategoryPie({ data, colors }: PieProps) {
  if (!data.length) return (
    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
      데이터 없음
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={2}
          label={({ name, percent }) =>
            (percent ?? 0) > 0.04 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ""
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface BarProps {
  data: CategoryPoint[];
  colors: string[];
  label: string;
}

function CategoryBar({ data, colors, label }: BarProps) {
  if (!data.length) return null;
  const top = data.slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={top}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 72, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v) => [`${Number(v).toLocaleString("ko-KR")}원`, label]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="amount" name={label} radius={[0, 3, 3, 0]} maxBarSize={22}>
          {top.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExpenseCategoryCharts({ data }: { data: CategoryPoint[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2 text-center">비목 구성 (도넛)</p>
        <CategoryPie data={data} colors={EXPENSE_COLORS} />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2 text-center">비목별 금액</p>
        <CategoryBar data={data} colors={EXPENSE_COLORS} label="지출" />
      </div>
    </div>
  );
}

export function IncomeCategoryCharts({ data }: { data: CategoryPoint[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2 text-center">수입 구성 (도넛)</p>
        <CategoryPie data={data} colors={INCOME_COLORS} />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2 text-center">항목별 금액</p>
        <CategoryBar data={data} colors={INCOME_COLORS} label="수입" />
      </div>
    </div>
  );
}
