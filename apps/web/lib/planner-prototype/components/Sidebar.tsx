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
  Users,
  Sparkles
} from "lucide-react";
import type { ComponentType } from "react";
import type { NavigationSection } from "../types/calendar";

const navItems: Array<{
  key: NavigationSection;
  label: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: "Planner", label: "日历工作台", hint: "动态排程", icon: CalendarDays },
  { key: "Tasks", label: "任务", hint: "优先级池", icon: CheckSquare },
  { key: "Habits", label: "习惯", hint: "重复安排", icon: Repeat },
  { key: "Focus", label: "专注时间", hint: "深度工作", icon: Clock3 },
  { key: "Meetings", label: "会议", hint: "智能会议", icon: Users },
  { key: "Links", label: "预约链接", hint: "对外预约", icon: Link2 },
  { key: "Sync", label: "日历同步", hint: "多日历", icon: RefreshCw },
  { key: "Analytics", label: "分析洞察", hint: "时间分布", icon: BarChart3 },
  { key: "Settings", label: "设置", hint: "策略规则", icon: Settings }
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
    <aside className="flex h-full w-[232px] shrink-0 flex-col border-r border-slate-900/70 bg-[#111827] text-slate-200 shadow-[18px_0_40px_rgba(15,23,42,0.12)]">
      <button
        type="button"
        onClick={onResetPlanner}
        className="flex items-center gap-3 border-b border-white/10 px-5 py-5 text-left transition hover:bg-white/[0.04]"
        title="回到日历工作台"
      >
        <span className="grid h-10 w-10 shrink-0 grid-cols-2 gap-1 rounded-2xl bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
          <span className="rounded-[5px] bg-[#fb7185]" />
          <span className="rounded-[5px] bg-[#60a5fa]" />
          <span className="rounded-[5px] bg-[#fbbf24]" />
          <span className="rounded-[5px] bg-[#a78bfa]" />
        </span>
        <span className="min-w-0">
          <span className="block text-[17px] font-bold leading-tight tracking-[-0.03em] text-white">Reclaim Planner</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <Sparkles className="h-3 w-3 text-sky-300" /> AI 动态调度
          </span>
        </span>
      </button>

      <nav className="planner-side-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.key;
          const badge = badges[item.key];

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectSection(item.key)}
              className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                active
                  ? "bg-white text-slate-950 shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
                  : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
              }`}
              title={item.label}
            >
              <span
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                  active ? "bg-slate-950 text-white" : "bg-white/[0.06] text-slate-300 group-hover:bg-white/[0.1] group-hover:text-white"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.key === "Sync" ? (
                  <span
                    className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[#111827] ${
                      syncHealthy ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{item.label}</span>
                <span className={`block truncate text-[11px] ${active ? "text-slate-500" : "text-slate-500 group-hover:text-slate-400"}`}>{item.hint}</span>
              </span>
              {badge ? (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-slate-100 text-slate-700" : "bg-sky-400 text-slate-950"}`}>
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 px-3 py-4">
        <button
          type="button"
          onClick={onOpenHelp}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
          title="帮助"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
          <span className="text-[13px] font-semibold">帮助</span>
        </button>
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.06] px-3 py-3 text-left transition hover:bg-white/[0.1]"
          title="工作区信息"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 to-indigo-300 text-[13px] font-bold text-slate-950">我</span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-white">个人工作区</span>
            <span className="block text-[11px] text-slate-400">单用户 MVP</span>
          </span>
        </button>
      </div>
    </aside>
  );
}
