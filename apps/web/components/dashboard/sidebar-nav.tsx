"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartColumn, Link2, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const nav = t("nav");
const items = [
  { href: "/", label: nav.dashboard, icon: Zap },
  { href: "/calendar", label: nav.calendar, icon: CalendarDays },
  { href: "/links", label: nav.links, icon: Link2 },
  { href: "/analytics", label: nav.analytics, icon: ChartColumn },
  { href: "/settings", label: nav.settings, icon: Settings }
] as Array<{ href: Route; label: string; icon: React.ComponentType<{ className?: string }> }>;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-60 border-r border-slate-900 bg-slate-950 p-4">
      <div className="mb-6 text-sm font-semibold text-white">reclaim.ai Planner</div>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                active
                  ? "bg-slate-800 font-medium text-white"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
