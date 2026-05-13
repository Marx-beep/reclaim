import {
  ChevronLeft,
  ChevronRight,
  ListFilter,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  SlidersHorizontal
} from "lucide-react";
import type { CalendarEvent } from "../types/calendar";
import { formatPlannerMonth, formatWeekRange } from "../utils/calendarUtils";
import { TimeAllocationBar } from "./TimeAllocationBar";

export interface PlannerSummaryCard {
  label: string;
  value: string;
  detail: string;
  tone: "indigo" | "emerald" | "amber";
}

interface PlannerHeaderProps {
  events: CalendarEvent[];
  weekStart: Date;
  isOptimizing: boolean;
  isPanelOpen: boolean;
  focusedDayLabel: string;
  summaryCards: PlannerSummaryCard[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onWeekAction: () => void;
  onTogglePanel: () => void;
  onAutoSchedule: () => void;
}

function chromeButtonClass(active = false) {
  return `inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-medium transition ${
    active
      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
  }`;
}

function summaryToneClass(tone: PlannerSummaryCard["tone"]) {
  if (tone === "indigo") {
    return "border-indigo-100 bg-indigo-50/80 text-indigo-700";
  }
  if (tone === "emerald") {
    return "border-emerald-100 bg-emerald-50/80 text-emerald-700";
  }
  return "border-amber-100 bg-amber-50/80 text-amber-700";
}

export function PlannerHeader({
  events,
  weekStart,
  isOptimizing,
  isPanelOpen,
  focusedDayLabel,
  summaryCards,
  onPrevWeek,
  onNextWeek,
  onToday,
  onWeekAction,
  onTogglePanel,
  onAutoSchedule
}: PlannerHeaderProps) {
  return (
    <header className="shrink-0 px-4 pb-3 pt-4">
      <div className="rounded-[22px] border border-[#e6eaf2] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold tracking-[0.12em] text-slate-400">Planner</div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={onPrevWeek} className={chromeButtonClass()}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={onNextWeek} className={chromeButtonClass()}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-2">
                <div className="text-[28px] font-semibold tracking-[-0.03em] text-slate-950">{formatPlannerMonth(weekStart)}</div>
                <div className="mt-0.5 text-[12px] font-medium text-slate-500">{formatWeekRange(weekStart)}</div>
              </div>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-medium text-slate-600">
                当前聚焦：{focusedDayLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={onToday} className={chromeButtonClass()}>
              今天
            </button>
            <button type="button" onClick={onWeekAction} className={chromeButtonClass(true)}>
              周视图
            </button>
            <button type="button" className={chromeButtonClass()}>
              <ListFilter className="h-3.5 w-3.5" />
              筛选
            </button>
            <button type="button" className={chromeButtonClass()}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              排序
            </button>
            <button type="button" onClick={onTogglePanel} className={chromeButtonClass()}>
              {isPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onAutoSchedule}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#4f46e5] px-4 text-[13px] font-medium text-white transition hover:bg-[#4338ca]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isOptimizing ? "正在重排..." : "自动排程"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium ${summaryToneClass(card.tone)}`}
            >
              <span>{card.label}</span>
              <span className="text-slate-950">{card.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <TimeAllocationBar events={events} compact />
        </div>
      </div>
    </header>
  );
}
