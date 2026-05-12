"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartColumn, Link2, Settings, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const nav = t("nav");
const items = [
  { href: "/", label: nav.dashboard, icon: Zap },
  { href: "/calendar", label: nav.calendar, icon: CalendarDays },
  { href: "/planner", label: "AI Planner", icon: Sparkles },
  { href: "/links", label: nav.links, icon: Link2 },
  { href: "/analytics", label: nav.analytics, icon: ChartColumn },
  { href: "/settings", label: nav.settings, icon: Settings }
] as Array<{ href: Route; label: string; icon: React.ComponentType<{ className?: string }> }>;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-[288px] shrink-0 px-5 py-6 lg:block">
      <div className="sticky top-6 overflow-hidden rounded-[32px] border border-white/55 bg-[linear-gradient(180deg,rgba(19,39,54,0.97)_0%,rgba(24,51,71,0.96)_46%,rgba(31,60,76,0.95)_100%)] p-5 shadow-[0_28px_70px_rgba(19,39,54,0.34)]">
        <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(255,214,143,0.22),transparent_70%)]" />
        <div className="relative mb-8">
          <div className="text-[11px] uppercase tracking-[0.34em] text-slate-300/80">time design cockpit</div>
          <div className="mt-3 text-2xl font-semibold text-white">AI Planner</div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            把任务、习惯和专注时段收进同一块时间画布里。
          </p>
        </div>

        <div className="relative mb-6 rounded-[24px] border border-white/10 bg-white/6 p-4 text-slate-100 backdrop-blur-sm">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-300/70">Today Focus</div>
          <div className="mt-3 text-3xl font-semibold">4D</div>
          <div className="mt-2 text-sm text-slate-300">Do, Decide, Delegate, Drop</div>
        </div>

        <nav className="relative space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition duration-200",
                active
                  ? "bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0%,rgba(255,223,171,0.18)_100%)] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "text-slate-300 hover:bg-white/8 hover:text-white"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border transition duration-200",
                  active
                    ? "border-white/18 bg-white/12 text-[#ffd89d]"
                    : "border-white/8 bg-black/10 text-slate-300 group-hover:border-white/14 group-hover:bg-white/8 group-hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
        </nav>
      </div>
    </aside>
  );
}
