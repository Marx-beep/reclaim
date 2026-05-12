import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  Clock3,
  HelpCircle,
  Link2,
  RefreshCw,
  Repeat,
  Settings,
  Users
} from "lucide-react";
import type { ComponentType } from "react";
import type { NavigationSection } from "../types/calendar";

const navItems: Array<{
  key: NavigationSection;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: "Planner", label: "日历工作台", icon: CalendarDays },
  { key: "Tasks", label: "任务", icon: CheckSquare },
  { key: "Habits", label: "习惯", icon: Repeat },
  { key: "Focus", label: "专注时间", icon: Clock3 },
  { key: "Meetings", label: "智能会议", icon: Users },
  { key: "Links", label: "预约链接", icon: Link2 },
  { key: "Sync", label: "日历同步", icon: RefreshCw },
  { key: "Analytics", label: "统计分析", icon: BarChart3 },
  { key: "Settings", label: "设置", icon: Settings }
];

interface SidebarProps {
  activeSection: NavigationSection;
  badges: Partial<Record<NavigationSection, string>>;
  syncHealthy: boolean;
  onResetPlanner: () => void;
  onSelectSection: (label: NavigationSection) => void;
  onOpenHelp: () => void;
  onOpenProfile: () => void;
}

export function Sidebar({
  activeSection,
  badges,
  syncHealthy,
  onResetPlanner,
  onSelectSection,
  onOpenHelp,
  onOpenProfile
}: SidebarProps) {
  return (
    <aside className="flex h-full w-16 shrink-0 flex-col items-center border-r border-white/5 bg-[#111827] py-3 text-[#9ca3af]">
      <button
        type="button"
        onClick={onResetPlanner}
        title="回到日历工作台"
        className="mb-7 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.05] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:bg-white/[0.09]"
      >
        <span className="h-3 w-3 rounded-[4px] bg-[#6366f1]" />
        <span className="h-3 w-3 rounded-[4px] bg-[#f472b6]" />
        <span className="h-3 w-3 rounded-[4px] bg-[#facc15]" />
        <span className="h-3 w-3 rounded-[4px] bg-[#34d399]" />
      </button>

      <nav className="flex flex-1 flex-col items-center gap-2.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.key;
          const badge = badges[item.key];

          return (
            <div key={item.key} className="group relative">
              <button
                type="button"
                onClick={() => onSelectSection(item.key)}
                className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition ${
                  active
                    ? "bg-[#374151] text-white shadow-[0_8px_20px_rgba(15,23,42,0.22)]"
                    : "text-[#9ca3af] hover:bg-[#1f2937] hover:text-white"
                }`}
                title={item.label}
              >
                {active ? <span className="absolute -left-2 h-6 w-1 rounded-full bg-indigo-400" /> : null}
                <Icon className="h-[18px] w-[18px]" />
                {item.key === "Sync" ? (
                  <span
                    className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[#111827] ${
                      syncHealthy ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                ) : null}
                {badge ? (
                  <span className="absolute -right-2 -top-2 min-w-[16px] rounded-full bg-indigo-500 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">
                    {badge}
                  </span>
                ) : null}
              </button>

              <div className="pointer-events-none absolute left-[54px] top-1/2 z-20 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900/95 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)] group-hover:block">
                {item.label}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onOpenHelp}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-[#9ca3af] transition hover:bg-[#1f2937] hover:text-white"
          title="帮助"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-semibold text-white transition hover:bg-white/[0.12]"
          title="工作区信息"
        >
          SP
        </button>
      </div>
    </aside>
  );
}
