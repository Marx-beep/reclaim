import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ListFilter,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  SlidersHorizontal
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { CalendarEvent } from "../types/calendar";
import type { FilterState } from "../types/filters";
import { getActiveFilterCount, isFilterActive } from "../types/filters";
import { formatPlannerMonth, formatWeekRange } from "../utils/calendarUtils";
import { FilterPanel } from "./FilterPanel";

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
  filterState: FilterState;
  isFilterOpen: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onSelectDate: (date: Date) => void;
  onTogglePanel: () => void;
  onAutoSchedule: () => void;
  onToggleFilter: (category: keyof FilterState, value: string) => void;
  onClearFilters: () => void;
  onToggleFilterPanel: () => void;
}

function chromeButtonClass(active = false) {
  return `inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-[12px] font-medium transition ${
    active
      ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-lighter)] text-[var(--color-primary)]"
      : "border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
  }`;
}

function summaryToneClass(tone: PlannerSummaryCard["tone"]) {
  if (tone === "indigo") {
    return "border-[var(--color-border-default)] bg-[var(--color-primary-lighter)] text-[var(--color-primary)]";
  }
  if (tone === "emerald") {
    return "border-[var(--color-event-focus)]/30 bg-[var(--color-event-focus-light)] text-[var(--color-event-focus-text)]";
  }
  return "border-[var(--color-accent-amber)]/30 bg-[var(--color-accent-amber)]/8 text-[var(--color-accent-amber)]";
}

export function PlannerHeader({
  events,
  weekStart,
  isOptimizing,
  isPanelOpen,
  focusedDayLabel,
  summaryCards,
  filterState,
  isFilterOpen,
  onPrevWeek,
  onNextWeek,
  onToday,
  onSelectDate,
  onTogglePanel,
  onAutoSchedule,
  onToggleFilter,
  onClearFilters,
  onToggleFilterPanel
}: PlannerHeaderProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        if (isFilterOpen) {
          onToggleFilterPanel();
        }
      }
    }
    if (calendarOpen || isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [calendarOpen, isFilterOpen, onToggleFilterPanel]);

  const handleDateChange = (dateStr: string) => {
    const selectedDate = new Date(dateStr + "T00:00:00");
    onSelectDate(selectedDate);
    setCalendarOpen(false);
  };

  const filterActiveCount = getActiveFilterCount(filterState);
  const filterActive = isFilterActive(filterState);

  return (
    <header className="shrink-0 px-4 pb-3 pt-4">
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-white px-5 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button type="button" onClick={onPrevWeek} className={chromeButtonClass()}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={onNextWeek} className={chromeButtonClass()}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="px-2">
              <div className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">{formatPlannerMonth(weekStart)}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">{formatWeekRange(weekStart)}</div>
            </div>

            <div className="relative" ref={calendarRef}>
              <button
                type="button"
                onClick={() => setCalendarOpen(!calendarOpen)}
                className={chromeButtonClass()}
              >
                <Calendar className="h-4 w-4" />
                <span>选择日期</span>
              </button>
              {calendarOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-lg">
                  <input
                    ref={inputRef}
                    type="date"
                    defaultValue={weekStart.toISOString().split("T")[0]}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="rounded-lg border border-[var(--color-border-default)] p-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-lighter)]"
                  />
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-[var(--color-border-subtle)]" />

            <div className="flex items-center gap-2">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-medium ${summaryToneClass(card.tone)}`}
                >
                  <span className="text-[var(--color-text-muted)]">{card.label}</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">{card.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button type="button" onClick={onToday} className={chromeButtonClass()}>
              今天
            </button>
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={onToggleFilterPanel}
                className={`relative ${chromeButtonClass(filterActive)}`}
              >
                <ListFilter className="h-3.5 w-3.5" />
                {filterActiveCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-[9px] font-bold text-white">
                    {filterActiveCount}
                  </span>
                )}
              </button>
              {isFilterOpen && (
                <FilterPanel
                  filterState={filterState}
                  onToggle={onToggleFilter}
                  onClear={onClearFilters}
                  onClose={onToggleFilterPanel}
                />
              )}
            </div>
            <button type="button" onClick={onTogglePanel} className={chromeButtonClass()}>
              {isPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onAutoSchedule}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[var(--color-btn-primary)] px-4 text-[12px] font-semibold text-white shadow-[0_2px_8px_rgba(138,136,184,0.3)] transition hover:bg-[var(--color-btn-primary-hover)]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isOptimizing ? "安排中..." : "智能安排"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
