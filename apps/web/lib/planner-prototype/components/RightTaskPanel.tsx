import { PanelRightClose, Plus, Sparkles, Clock, CheckCircle2, AlertTriangle, RefreshCw, MessageSquare, CalendarDays } from "lucide-react";
import { addDays, format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AiLog,
  CalendarEvent,
  EventPriority,
  GiveUpFeedback,
  NavigationSection,
  PlannerSuggestion,
  QuickTaskInput,
  TaskItem
} from "../types/calendar";
import {
  energyLabel,
  findNextAvailableSlot,
  findOpenWindowsForDay,
  formatTime,
  getEventEndHour,
  hasConflict,
  priorityLabel
} from "../utils/calendarUtils";

type PanelView = "plan" | "ai";

const sectionLabels: Record<NavigationSection, string> = {
  Planner: "日程规划",
  Tasks: "任务",
  Habits: "习惯",
  Focus: "专注时间",
  Meetings: "会议",
  Links: "预约链接",
  Sync: "日历同步",
  Analytics: "统计分析",
  Settings: "设置"
};

const panelIcons: Record<string, React.ReactNode> = {
  "创建": <Plus className="h-3.5 w-3.5" />,
  "安排": <CheckCircle2 className="h-3.5 w-3.5" />,
  "跳过": <RefreshCw className="h-3.5 w-3.5" />,
  "重排": <RefreshCw className="h-3.5 w-3.5" />,
  "更新": <RefreshCw className="h-3.5 w-3.5" />,
  "切换": <RefreshCw className="h-3.5 w-3.5" />,
  "复制": <CheckCircle2 className="h-3.5 w-3.5" />,
  "分析": <MessageSquare className="h-3.5 w-3.5" />,
  "干不下去了": <AlertTriangle className="h-3.5 w-3.5" />
};

function getLogIcon(action: string): React.ReactNode {
  const key = Object.keys(panelIcons).find((k) => action.includes(k));
  return key ? panelIcons[key] : <Clock className="h-3.5 w-3.5" />;
}

function getLogAccent(action: string): { dot: string; bg: string; border: string; text: string } {
  if (action.includes("干不下去了")) return { dot: "bg-[var(--color-accent-amber)]", bg: "bg-[var(--color-accent-amber)]/8", border: "border-[var(--color-accent-amber)]/20", text: "text-[var(--color-accent-amber)]" };
  if (action.includes("会议")) return { dot: "bg-[var(--color-event-meeting)]", bg: "bg-[var(--color-event-meeting-light)]", border: "border-[var(--color-event-meeting)]/20", text: "text-[var(--color-event-meeting)]" };
  if (action.includes("任务") || action.includes("习惯")) return { dot: "bg-[var(--color-event-task)]", bg: "bg-[var(--color-event-task-light)]", border: "border-[var(--color-event-task)]/20", text: "text-[var(--color-event-task)]" };
  if (action.includes("专注")) return { dot: "bg-[var(--color-event-focus)]", bg: "bg-[var(--color-event-focus-light)]", border: "border-[var(--color-event-focus)]/20", text: "text-[var(--color-event-focus-text)]" };
  return { dot: "bg-[var(--color-text-muted)]", bg: "bg-[var(--color-bg-page-subtle)]", border: "border-[var(--color-border-subtle)]", text: "text-[var(--color-text-secondary)]" };
}

interface RightTaskPanelProps {
  isOpen: boolean;
  selectedSlot: { day: number; startHour: number } | null;
  activeSection: NavigationSection;
  focusedDayLabel: string;
  focusedDayIndex: number;
  weekStart: Date;
  todayTasks: CalendarEvent[];
  allTasks: TaskItem[];
  allEvents: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  linkedTask: TaskItem | null;
  suggestions: PlannerSuggestion[];
  aiLogs: AiLog[];
  latestSummary: string | null;
  latestWarnings: string[];
  giveUpFeedback: GiveUpFeedback | null;
  focusHours: number;
  meetingHours: number;
  requestedView?: PanelView | null;
  requestedViewToken?: number;
  onOpen: () => void;
  onClose: () => void;
  onSelectTask: (eventId: string) => void;
  onClearSelectedSlot: () => void;
  onSelectSuggestedSlot: (startHour: number) => void;
  onAddTask: (task: QuickTaskInput) => void;
  onScheduleTask: (eventId: string) => void;
  onMarkDone: (eventId: string) => void;
  onApplySuggestion: (suggestion: PlannerSuggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
  onAutoSchedule: () => void;
  onPreviewScenario: (scenario: "balanced" | "deep" | "deadline") => void;
  onApplyScenario: (scenario: "balanced" | "deep" | "deadline") => void;
}

const priorityOptions: EventPriority[] = ["P1", "P2", "P3", "P4"];
const dayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const giveUpStepToneClasses: Record<GiveUpFeedback["steps"][number]["tone"], string> = {
  focus: "border-[var(--color-event-focus)]/30 bg-[var(--color-event-focus-light)]",
  recovery: "border-[var(--color-accent-amber)]/30 bg-[var(--color-accent-amber)]/8",
  light: "border-[var(--color-event-focus)]/30 bg-[var(--color-event-focus-light)]",
  resume: "border-[var(--color-primary)]/30 bg-[var(--color-primary-lighter)]"
};
const dueTimeOptions = Array.from({ length: (19 - 8) * 4 + 1 }, (_, index) => {
  const value = 8 + index * 0.25;
  return { value, label: formatTime(value) };
});

function normalizeSliderHour(value: number) {
  return Math.round(value * 4) / 4;
}

function compareDeadlineWithSlot(
  selectedSlot: { day: number; startHour: number } | null,
  durationHours: number,
  dueDay: number,
  dueHour: number
) {
  if (!selectedSlot) return null;
  const endHour = selectedSlot.startHour + durationHours;
  const startsAfterDeadlineDay = selectedSlot.day > dueDay;
  const endsAfterDeadlineTime = selectedSlot.day === dueDay && endHour > dueHour;
  if (startsAfterDeadlineDay || endsAfterDeadlineTime) {
    return { tone: "warn" as const, message: "当前选中的时段可能赶不上截止时间，系统会另找更早空档。" };
  }
  return { tone: "ok" as const, message: "当前时段在截止前，系统会优先使用这里。" };
}

function buildPlacementPreview(
  allEvents: CalendarEvent[],
  selectedSlot: { day: number; startHour: number } | null,
  focusedDayIndex: number,
  durationHours: number,
  dueDay: number,
  dueHour: number
) {
  if (selectedSlot) {
    const selectedCandidate = { id: "__preview__", title: "preview", day: selectedSlot.day, startHour: selectedSlot.startHour, duration: durationHours };
    const selectedConflicts = allEvents.some((event) => event.status !== "completed" && event.status !== "unscheduled" && hasConflict(selectedCandidate, event));
    const selectedEndsAt = getEventEndHour(selectedCandidate);
    const selectedBeforeDeadline = selectedSlot.day < dueDay || (selectedSlot.day === dueDay && selectedEndsAt <= dueHour);
    if (!selectedConflicts && selectedBeforeDeadline) {
      return { day: selectedSlot.day, startHour: selectedSlot.startHour, endHour: selectedEndsAt, note: "系统会优先使用当前选中的时段。" };
    }
  }
  const lastDay = Math.max(focusedDayIndex, dueDay);
  for (let day = focusedDayIndex; day <= lastDay; day += 1) {
    const preferredHours = day === dueDay
      ? [9, 10, 11, 13.5, 14.5, 16].filter((hour) => hour + durationHours <= dueHour)
      : [9, 10, 11, 13.5, 14.5, 16];
    const slot = findNextAvailableSlot(allEvents, day, durationHours, { preferredHours: preferredHours.length > 0 ? preferredHours : undefined });
    if (slot !== null) {
      const endHour = slot + durationHours;
      if (day < dueDay || (day === dueDay && endHour <= dueHour)) {
        return { day, startHour: slot, endHour, note: day === dueDay ? "截止前较稳妥的最后一个空档。" : "已找到最近可用窗口。" };
      }
    }
  }
  return null;
}

export function RightTaskPanel({
  isOpen, selectedSlot, activeSection, focusedDayLabel, focusedDayIndex, weekStart,
  todayTasks, allTasks, allEvents, selectedEvent, linkedTask,
  suggestions, aiLogs, latestSummary, latestWarnings, giveUpFeedback,
  focusHours, meetingHours, requestedView, requestedViewToken,
  onOpen, onClose, onSelectTask, onClearSelectedSlot, onSelectSuggestedSlot,
  onAddTask, onScheduleTask, onMarkDone, onApplySuggestion, onDismissSuggestion,
  onAutoSchedule, onPreviewScenario, onApplyScenario
}: RightTaskPanelProps) {
  const [title, setTitle] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [priority, setPriority] = useState<EventPriority>("P2");
  const [dueDay, setDueDay] = useState(focusedDayIndex);
  const [dueHour, setDueHour] = useState(18);
  const [dueMinute, setDueMinute] = useState(() => Math.round((dueHour % 1) * 60));
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const timePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDueMinute(Math.round((dueHour % 1) * 60));
  }, [dueHour]);

  const dueHourInt = Math.floor(dueHour);
  const setDueTime = (h: number, m: number) => {
    setDueHour(h + m / 60);
    setDueMinute(m);
  };

  useEffect(() => {
    if (!timePickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (timePickerRef.current && !timePickerRef.current.contains(e.target as Node)) {
        setTimePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [timePickerOpen]);

  const [urgent, setUrgent] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<"high" | "medium" | "low">("medium");
  const [panelView, setPanelView] = useState<PanelView>("plan");
  const [showAllLogs, setShowAllLogs] = useState(false);

  useEffect(() => {
    if (selectedSlot) {
      setDueDay(selectedSlot.day);
      setDueHour(Math.max(selectedSlot.startHour + durationHours, dueHour));
    } else {
      setDueDay(focusedDayIndex);
    }
  }, [focusedDayIndex, selectedSlot]);

  useEffect(() => {
    if (selectedEvent) { return; }
    if (activeSection !== "Planner") { setPanelView("ai"); return; }
    setPanelView("plan");
  }, [activeSection, selectedEvent]);

  useEffect(() => {
    if (!requestedView) return;
    setPanelView(requestedView);
  }, [requestedView, requestedViewToken]);

  const groupedTasks = useMemo(() =>
    priorityOptions
      .map((level) => ({ label: priorityLabel(level), level, items: todayTasks.filter((task) => task.priority === level) }))
      .filter((group) => group.items.length > 0),
    [todayTasks]
  );

  const recommendedWindows = useMemo(() => findOpenWindowsForDay(allEvents, focusedDayIndex, 0.5, 4), [allEvents, focusedDayIndex]);
  const unscheduledTasks = allTasks.filter((task) => task.status === "unscheduled");
  const slotDeadlineHint = compareDeadlineWithSlot(selectedSlot, durationHours, dueDay, dueHour);
  const predictedPlacement = useMemo(() => buildPlacementPreview(allEvents, selectedSlot, focusedDayIndex, durationHours, dueDay, dueHour), [allEvents, selectedSlot, focusedDayIndex, durationHours, dueDay, dueHour]);
  const completedEvents = allEvents.filter((event) => event.status === "completed");
  const overtimeEvents = allEvents.filter((event) => event.status === "overtime");
  const focusScore = Math.min(100, Math.round((focusHours / Math.max(meetingHours + focusHours, 1)) * 100));

  const visibleLogs = showAllLogs ? aiLogs : aiLogs.slice(0, 3);

  if (!isOpen) {
    return (
      <aside className="flex h-full w-[72px] shrink-0 flex-col items-center justify-between border-l border-[var(--color-border-default)] bg-white px-3 py-5">
        <button type="button" onClick={onOpen} className="rounded-2xl border border-[var(--color-border-default)] bg-white px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-lighter)] hover:text-[var(--color-primary-text)]">
          展开
        </button>
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] px-2 py-3 text-center shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">{todayTasks.length}</div>
          <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">今日</div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-page)]">
      <div className="planner-side-scroll flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 pr-3">
        <section className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] px-4 py-3 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]">当前聚焦</div>
            <div className="mt-1 text-[16px] font-semibold text-[var(--color-text-primary)]">{focusedDayLabel}</div>
            <div className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              {activeSection === "Planner" ? "已关联到日程规划" : `${sectionLabels[activeSection]}`}
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-secondary)]">
            <PanelRightClose className="h-4 w-4" />
          </button>
        </section>

        <section className="flex rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] p-1">
          {[{ key: "plan", label: "计划" }, { key: "ai", label: "助手" }].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPanelView(item.key as PanelView)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                panelView === item.key
                  ? "bg-[var(--color-btn-solid)] text-white"
                  : "text-[var(--color-text-muted)] hover:bg-white hover:text-[var(--color-text-secondary)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </section>

        {panelView === "plan" ? (
          <>
            <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] p-4 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
              <div className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">快速添加</div>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onAddTask({ title, durationHours, priority, dueDay, dueHour, urgent, energyLevel });
                    setTitle("");
                  }
                }}
                placeholder="输入任务名称，回车添加..."
                className="w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-lighter)]"
              />

              {selectedSlot ? (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-lighter)] px-3 py-2 text-[12px] text-[var(--color-primary-text)]">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    安排到 {focusedDayLabel} {formatTime(selectedSlot.startHour)}
                  </span>
                  <button type="button" className="font-medium hover:opacity-75" onClick={onClearSelectedSlot}>清除</button>
                </div>
              ) : null}

              <div className="mt-3 space-y-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-[var(--color-text-muted)]">
                    <span>时长</span>
                    <span className="rounded-full bg-[var(--color-primary-lighter)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary-text)]">{durationHours.toFixed(durationHours % 1 === 0 ? 0 : 2)} 小时</span>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-2">
                    <input type="range" min={0.25} max={4} step={0.25} value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-border-default)] accent-[var(--color-primary)]" />
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                      <span>15 分钟</span>
                      <span>4 小时</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="mb-1.5 text-[11px] font-medium text-[var(--color-text-muted)]">截止日期</div>
                    <input
                      type="date"
                      value={format(addDays(weekStart, dueDay), "yyyy-MM-dd")}
                      min={format(weekStart, "yyyy-MM-dd")}
                      max={format(addDays(weekStart, 13), "yyyy-MM-dd")}
                      onChange={(e) => {
                        const selected = new Date(e.target.value + "T00:00:00");
                        const diffMs = selected.getTime() - weekStart.getTime();
                        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                        setDueDay(Math.max(0, Math.min(6, diffDays)));
                      }}
                      className="w-full rounded-xl border border-[var(--color-border-default)] bg-white px-2 py-2 text-[12px] text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-lighter)]"
                    />
                  </div>
                  <div className="relative" ref={timePickerRef}>
                    <div className="mb-1.5 text-[11px] font-medium text-[var(--color-text-muted)]">截止时刻</div>
                    <button
                      type="button"
                      onClick={() => setTimePickerOpen(!timePickerOpen)}
                      className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2 text-[12px] text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-lighter)]"
                    >
                      <span className="tabular-nums">{String(dueHourInt).padStart(2, "0")}:{String(dueMinute).padStart(2, "0")}</span>
                      <Clock className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                    </button>
                    {timePickerOpen && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-[var(--color-border-subtle)] bg-white p-3 shadow-lg">
                        <div className="space-y-2.5">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                              <span>时</span>
                              <span className="tabular-nums font-medium text-slate-700">{String(dueHourInt).padStart(2, "0")} 时</span>
                            </div>
                            <input
                              type="range" min={0} max={23} step={1}
                              value={dueHourInt}
                              onChange={(e) => setDueTime(Number(e.target.value), dueMinute)}
                              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[var(--color-primary)]"
                            />
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                              <span>分</span>
                              <span className="tabular-nums font-medium text-slate-700">{String(dueMinute).padStart(2, "0")} 分</span>
                            </div>
                            <input
                              type="range" min={0} max={59} step={1}
                              value={dueMinute}
                              onChange={(e) => setDueTime(dueHourInt, Number(e.target.value))}
                              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="mt-2 border-t border-[var(--color-border-subtle)] pt-2 text-center text-[11px] tabular-nums font-semibold text-[var(--color-primary)]">
                          {String(dueHourInt).padStart(2, "0")}:{String(dueMinute).padStart(2, "0")}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-[11px] font-medium text-[var(--color-text-muted)]">优先级</div>
                  <div className="flex gap-1">
                    {priorityOptions.map((option) => (
                      <button key={option} type="button" onClick={() => setPriority(option)} className={`whitespace-nowrap flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${priority === option ? "bg-[var(--color-btn-solid)] text-white" : "border border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"}`}>
                        {priorityLabel(option)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-[11px] font-medium text-[var(--color-text-muted)]">精力需求</div>
                  <div className="flex gap-1.5">
                    {(["high", "medium", "low"] as const).map((option) => (
                      <button key={option} type="button" onClick={() => setEnergyLevel(option)} className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition ${energyLevel === option ? "bg-[var(--color-btn-primary)] text-white" : "border border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"}`}>
                        {energyLabel(option)}
                      </button>
                    ))}
                  </div>
                </div>

                {slotDeadlineHint && (
                  <div className={`rounded-xl px-3 py-2 text-[11px] leading-relaxed ${slotDeadlineHint.tone === "warn" ? "border border-[var(--color-accent-amber)]/30 bg-[var(--color-accent-amber)]/8 text-[var(--color-accent-amber)]" : "border border-[var(--color-event-focus)]/30 bg-[var(--color-event-focus-light)] text-[var(--color-event-focus-text)]"}`}>
                    {slotDeadlineHint.message}
                  </div>
                )}

                <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-[12px] text-[var(--color-text-secondary)]">
                  <input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} className="accent-[var(--color-primary)]" />
                  标记为紧急，立刻插入最近空档
                </label>

                <button
                  type="button"
                  className="w-full rounded-xl bg-[var(--color-btn-primary)] py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(138,136,184,0.30)] transition hover:bg-[var(--color-btn-primary-hover)]"
                  onClick={() => {
                    onAddTask({ title, durationHours, priority, dueDay, dueHour, urgent, energyLevel });
                    setTitle(""); setDurationHours(1); setPriority("P2"); setDueDay(focusedDayIndex); setDueHour(18); setUrgent(false); setEnergyLevel("medium");
                  }}
                >
                  <Plus className="mr-1.5 inline h-4 w-4" />
                  加入日程
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-white p-4">
              <div className="mb-2.5 text-[13px] font-semibold text-[var(--color-text-primary)]">{focusedDayLabel} 优先事项</div>
              <div className="space-y-3">
                {groupedTasks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] px-3 py-4 text-[12px] text-[var(--color-text-muted)]">
                    暂无优先任务。点击日历空白处可直接添加时间块。
                  </div>
                ) : groupedTasks.map((group) => (
                  <div key={group.level}>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{group.label}</div>
                    <div className="space-y-1.5">
                      {group.items.map((task) => (
                        <div key={task.id} className="group flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] px-3 py-2 transition hover:border-[var(--color-border-default)] hover:bg-white">
                          <div className={`min-w-0 flex-1 text-[12px] font-medium text-[var(--color-text-primary)] ${task.status === "completed" ? "line-through opacity-50" : ""}`}>
                            <span className="truncate">{task.title}</span>
                          </div>
                          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button type="button" onClick={() => onScheduleTask(task.id)} className="rounded-lg border border-[var(--color-border-subtle)] bg-white px-2 py-1 text-[10px] font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">安排</button>
                            <button type="button" onClick={() => onMarkDone(task.id)} className="rounded-lg border border-[var(--color-border-subtle)] bg-white px-2 py-1 text-[10px] font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-event-focus)] hover:text-[var(--color-event-focus)]">完成</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-white p-4">
              <div className="mb-2.5 text-[13px] font-semibold text-[var(--color-text-primary)]">可用空档</div>
              <div className="space-y-1.5">
                {recommendedWindows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] px-3 py-3 text-[12px] text-[var(--color-text-muted)]">
                    当天空档不足，可使用智能安排或调整任务时长。
                  </div>
                ) : recommendedWindows.map((window) => (
                  <button key={`${window.startHour}-${window.endHour}`} type="button" onClick={() => onSelectSuggestedSlot(window.startHour)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] px-3 py-2.5 text-left transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-lighter)]">
                    <div>
                      <div className="text-[12px] font-medium text-[var(--color-text-primary)]">{formatTime(window.startHour)} - {formatTime(window.endHour)}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{window.duration} 小时可用</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)] shadow-sm">{window.duration}h</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-white p-4">
              <div className="mb-2.5 text-[13px] font-semibold text-[var(--color-text-primary)]">今日概览</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] px-3 py-2.5">
                  <div className="text-[10px] text-[var(--color-text-muted)]">专注评分</div>
                  <div className="mt-1 text-[18px] font-semibold text-[var(--color-event-focus)]">{focusScore}</div>
                </div>
                <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] px-3 py-2.5">
                  <div className="text-[10px] text-[var(--color-text-muted)]">已完成</div>
                  <div className="mt-1 text-[18px] font-semibold text-[var(--color-text-primary)]">{completedEvents.length}</div>
                </div>
              </div>
              {overtimeEvents.length > 0 && (
                <div className="mt-2 rounded-xl border border-[var(--color-accent-rose)]/20 bg-[var(--color-accent-rose)]/5 px-3 py-2 text-[11px] text-[var(--color-accent-rose)]">
                  有 {overtimeEvents.length} 个时间块超时，请留意。
                </div>
              )}
            </section>

            <button
              type="button"
              onClick={onAutoSchedule}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-lighter)] py-3 text-[13px] font-semibold text-[var(--color-primary-text)] shadow-[0_2px_8px_rgba(138,136,184,0.20)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
            >
              <Sparkles className="h-4 w-4" />
              智能安排
            </button>
          </>
        ) : null}

        {panelView === "ai" ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text-primary)]">
              <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
              <span>日程助手</span>
            </div>

            {giveUpFeedback ? (
              <div className={`rounded-2xl border p-4 ${giveUpStepToneClasses.focus}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="inline-flex rounded-full bg-[var(--color-accent-amber)]/15 px-2.5 py-1 text-[10px] font-semibold text-[var(--color-accent-amber)]">恢复方案已应用</div>
                    <div className="mt-2 text-[14px] font-semibold text-[var(--color-text-primary)]">"{giveUpFeedback.sourceTitle}" 已调整为更易完成的节奏</div>
                  </div>
                  <div className="shrink-0 rounded-2xl border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-right shadow-sm">
                    <div className="text-[10px] text-[var(--color-text-muted)]">{giveUpFeedback.dayLabel}</div>
                    <div className="text-[20px] font-bold text-[var(--color-text-primary)]">{giveUpFeedback.affectedTaskCount}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">个块联动</div>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    点击后实际变成
                  </div>
                  {giveUpFeedback.steps.map((step) => (
                    <div key={step.id} className={`rounded-xl border p-2.5 ${giveUpStepToneClasses[step.tone]}`}>
                      <div className="text-[10px] font-medium text-[var(--color-text-muted)]">{step.label}</div>
                      <div className="mt-0.5 text-[12px] font-semibold text-[var(--color-text-primary)]">{step.title}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">{step.detail}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-2.5 py-2">
                    <div className="text-[10px] text-[var(--color-text-muted)]">高强度</div>
                    <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">{giveUpFeedback.originalFocusMinutes}→{giveUpFeedback.immediateFocusMinutes}m</div>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-2.5 py-2">
                    <div className="text-[10px] text-[var(--color-text-muted)]">恢复时间</div>
                    <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">{giveUpFeedback.recoveryMinutes} 分钟</div>
                  </div>
                </div>
              </div>
            ) : null}

            {latestSummary && <div className="rounded-xl border border-[var(--color-event-task)]/20 bg-[var(--color-event-task-light)] px-3 py-2 text-[12px] text-[var(--color-event-task)]">{latestSummary}</div>}
            {latestWarnings.length > 0 && <div className="rounded-xl border border-[var(--color-accent-amber)]/30 bg-[var(--color-accent-amber)]/8 px-3 py-2 text-[12px] text-[var(--color-accent-amber)]">{latestWarnings.map((w) => <div key={w}>· {w}</div>)}</div>}
            {unscheduledTasks.length > 0 && <div className="rounded-xl border border-[var(--color-accent-rose)]/20 bg-[var(--color-accent-rose)]/5 px-3 py-2 text-[12px] text-[var(--color-accent-rose)]">以下任务仍未安排：{unscheduledTasks.map((t) => t.title).join("、")}</div>}

            {aiLogs.length > 0 && (
              <div className="space-y-2">
                <div className="text-[12px] font-medium text-[var(--color-text-muted)]">最近记录</div>
                {visibleLogs.map((log) => {
                  const accent = getLogAccent(log.action);
                  return (
                    <div key={log.id} className={`rounded-xl border p-3 ${accent.bg} ${accent.border}`}>
                      <div className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${accent.dot}/20 ${accent.text}`}>
                          {getLogIcon(log.action)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold text-[var(--color-text-primary)]">{log.action}</div>
                          <div className="text-[11px] text-[var(--color-text-secondary)]">{log.summary}</div>
                        </div>
                        <div className="shrink-0 text-[10px] text-[var(--color-text-muted)]">{log.time}</div>
                      </div>
                      {log.changes.length > 0 && (
                        <div className="mt-2 rounded-lg bg-white/80 px-2.5 py-1.5 text-[11px] text-[var(--color-text-secondary)]">
                          {log.changes.map((c) => <div key={c}>· {c}</div>)}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!showAllLogs && aiLogs.length > 3 && (
                  <button type="button" onClick={() => setShowAllLogs(true)} className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] py-2 text-[12px] text-[var(--color-text-muted)] transition hover:border-[var(--color-border-default)] hover:text-[var(--color-text-secondary)]">
                    查看全部 {aiLogs.length} 条记录
                  </button>
                )}
                {showAllLogs && aiLogs.length > 3 && (
                  <button type="button" onClick={() => setShowAllLogs(false)} className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] py-2 text-[12px] text-[var(--color-text-muted)] transition hover:border-[var(--color-border-default)] hover:text-[var(--color-text-secondary)]">
                    收起记录
                  </button>
                )}
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="text-[12px] font-medium text-[var(--color-text-muted)]">智能建议</div>
                {suggestions.map((suggestion) => (
                  <div key={suggestion.id} className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-lighter)] p-3">
                    <div className="text-[12px] font-semibold text-[var(--color-primary-text)]">{suggestion.title}</div>
                    <div className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{suggestion.description}</div>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => onApplySuggestion(suggestion)} className="rounded-lg bg-[var(--color-btn-primary)] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[var(--color-btn-primary-hover)]">应用</button>
                      <button type="button" onClick={() => onDismissSuggestion(suggestion.id)} className="rounded-lg border border-[var(--color-border-subtle)] bg-white px-3 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-border-default)] hover:text-[var(--color-text-secondary)]">忽略</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </aside>
  );
}
