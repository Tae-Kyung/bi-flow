"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import {
  Building2,
  DoorOpen,
  Factory,
  LayoutDashboard,
  FileText,
  ClipboardList,
  LogOut as LogOutIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    label: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "org_admin", "tenant"],
  },
  {
    label: "기관 관리",
    href: "/organizations",
    icon: Building2,
    roles: ["super_admin"],
  },
  {
    label: "공간 관리",
    href: "/spaces",
    icon: DoorOpen,
    roles: ["super_admin", "org_admin"],
  },
  {
    label: "입주기업",
    href: "/companies",
    icon: Factory,
    roles: ["super_admin", "org_admin"],
  },
  {
    label: "입주 신청",
    href: "/applications",
    icon: ClipboardList,
    roles: ["super_admin", "org_admin", "tenant"],
  },
  {
    label: "계약 관리",
    href: "/contracts",
    icon: FileText,
    roles: ["super_admin", "org_admin", "tenant"],
  },
  {
    label: "퇴거 관리",
    href: "/move-outs",
    icon: LogOutIcon,
    roles: ["super_admin", "org_admin"],
  },
];

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="text-lg font-bold">
          BI-Flow
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
