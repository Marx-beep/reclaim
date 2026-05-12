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
import { formatWeekRange } from "../utils/calendarUtils";
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
  return `inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[10px] border px-3 text-[13px] font-medium transition ${
    active
      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
  }`;
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
    <header className="shrink-0 px-6 pb-4 pt-5">
      <div className="rounded-[18px] border border-[#e6eaf2] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-semibold leading-6 text-slate-950">Planner</h1>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                {focusedDayLabel}
              </span>
            </div>
            <div className="mt-2 text-[14px] font-medium text-slate-700">{formatWeekRange(weekStart)}</div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={onPrevWeek} className={chromeButtonClass()}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={onNextWeek} className={chromeButtonClass()}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
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
              className="inline-flex h-[34px] items-center gap-2 rounded-[10px] bg-[#4f46e5] px-3.5 text-[13px] font-medium text-white transition hover:bg-[#4338ca]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isOptimizing ? "Optimizing..." : "Auto Schedule"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-[14px] border px-4 py-3 ${
                card.tone === "indigo"
                  ? "border-indigo-100 bg-indigo-50/70"
                  : card.tone === "emerald"
                    ? "border-emerald-100 bg-emerald-50/70"
                    : "border-amber-100 bg-amber-50/70"
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">{card.label}</div>
              <div className="mt-1 text-[18px] font-semibold text-slate-950">{card.value}</div>
              <div className="mt-1 text-[12px] leading-5 text-slate-500">{card.detail}</div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <TimeAllocationBar events={events} />
        </div>
      </div>
    </header>
  );
}
