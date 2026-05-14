"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartColumn, Link2, Settings, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "仪表盘", icon: Zap },
  { href: "/calendar", label: "日历", icon: CalendarDays },
  { href: "/planner", label: "AI Planner", icon: Sparkles },
  { href: "/links", label: "预约链接", icon: Link2 },
  { href: "/analytics", label: "分析", icon: ChartColumn },
  { href: "/settings", label: "设置", icon: Settings }
] as Array<{ href: Route; label: string; icon: React.ComponentType<{ className?: string }> }>;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 shrink-0 overflow-hidden lg:block">
      <div className="sticky top-0 flex h-screen flex-col p-4">
        <div className="mb-6 flex-1 overflow-hidden rounded-2xl border border-[rgba(148,163,184,0.18)] bg-white shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
          <div className="px-5 pt-5">
            <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-text-muted)]">导航</div>
            <div className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">Reclaim Planner</div>
            <p className="mt-2 text-sm leading-5 text-[var(--color-text-muted)]">
              把任务、习惯和专注时段收进同一块时间画布里。
            </p>
          </div>

          <div className="mx-4 mt-4 mb-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] p-3">
            <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)]">今日专注</div>
            <div className="mt-2 text-2xl font-semibold text-[var(--color-primary)]">4D</div>
            <div className="mt-1 text-xs text-[var(--color-text-muted)]">Do, Decide, Delegate, Drop</div>
          </div>

          <nav className="px-3 pb-4">
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
                    active
                      ? "bg-[var(--color-primary-lighter)] font-medium text-[var(--color-primary-dark)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-page-subtle)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--color-primary)]" />
                  )}
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150",
                      active
                        ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                        : "bg-transparent text-[var(--color-text-muted)] group-hover:bg-[var(--color-border-subtle)] group-hover:text-[var(--color-text-secondary)]"
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
      </div>
    </aside>
  );
}
