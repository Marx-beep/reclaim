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
  { key: "Meetings", label: "会议", icon: Users },
  { key: "Links", label: "预约链接", icon: Link2 },
  { key: "Sync", label: "日历同步", icon: RefreshCw },
  { key: "Analytics", label: "分析洞察", icon: BarChart3 },
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
    <aside className="flex h-full w-[74px] shrink-0 flex-col items-center border-r border-[#dbe4f0] bg-[linear-gradient(180deg,#f8fbff_0%,#f1f5f9_100%)] py-3 text-slate-500">
      <button
        type="button"
        onClick={onResetPlanner}
        title="回到日历工作台"
        className="mb-7 grid grid-cols-2 gap-1 rounded-[22px] border border-white/80 bg-white/90 p-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-[1px]"
      >
        <span className="h-3 w-3 rounded-[4px] bg-[#0f172a]" />
        <span className="h-3 w-3 rounded-[4px] bg-[#2563eb]" />
        <span className="h-3 w-3 rounded-[4px] bg-[#7dd3fc]" />
        <span className="h-3 w-3 rounded-[4px] bg-[#cbd5e1]" />
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
                    ? "border border-sky-100 bg-white text-slate-950 shadow-[0_12px_24px_rgba(37,99,235,0.12)]"
                    : "text-slate-400 hover:bg-white/90 hover:text-slate-800"
                }`}
                title={item.label}
              >
                {active ? <span className="absolute -left-3 h-6 w-1 rounded-full bg-sky-500" /> : null}
                <Icon className="h-[18px] w-[18px]" />
                {item.key === "Sync" ? (
                  <span
                    className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white ${
                      syncHealthy ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                ) : null}
                {badge ? (
                  <span className="absolute -right-2 -top-2 min-w-[16px] rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">
                    {badge}
                  </span>
                ) : null}
              </button>

              <div className="pointer-events-none absolute left-[58px] top-1/2 z-20 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.12)] group-hover:block">
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
          className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/90 hover:text-slate-800"
          title="帮助"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-slate-950"
          title="工作区信息"
        >
          工
        </button>
      </div>
    </aside>
  );
}
