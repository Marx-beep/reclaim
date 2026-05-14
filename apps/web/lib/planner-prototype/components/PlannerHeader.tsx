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
      ? "border-sky-200 bg-sky-50 text-sky-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
      : "border-slate-200/90 bg-white/85 text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
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
      <div className="rounded-[24px] border border-[#dfe6f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">计划台</div>
              <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                本周视图
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2">
                <button type="button" onClick={onPrevWeek} className={chromeButtonClass()}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={onNextWeek} className={chromeButtonClass()}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-[20px] border border-white/70 bg-white/80 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <div className="text-[28px] font-semibold tracking-[-0.03em] text-slate-950">{formatPlannerMonth(weekStart)}</div>
                <div className="mt-0.5 text-[12px] font-medium text-slate-500">{formatWeekRange(weekStart)}</div>
              </div>

              <span className="rounded-full border border-slate-200/90 bg-white/75 px-3 py-1.5 text-[12px] font-medium text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
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
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#0f172a_0%,#334155_55%,#2563eb_100%)] px-4 text-[13px] font-medium text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)] transition hover:brightness-[1.03]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isOptimizing ? "正在重排..." : "智能重排"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${summaryToneClass(card.tone)}`}
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
