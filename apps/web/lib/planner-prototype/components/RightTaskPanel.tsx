import { PanelRightClose, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  AiLog,
  CalendarEvent,
  EventPriority,
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

type PanelView = "plan" | "details" | "ai";

const sectionLabels: Record<NavigationSection, string> = {
  Planner: "日历工作台",
  Tasks: "任务",
  Habits: "习惯",
  Focus: "专注时间",
  Meetings: "智能会议",
  Links: "预约链接",
  Sync: "日历同步",
  Analytics: "统计分析",
  Settings: "设置"
};

interface RightTaskPanelProps {
  isOpen: boolean;
  selectedSlot: { day: number; startHour: number } | null;
  activeSection: NavigationSection;
  focusedDayLabel: string;
  focusedDayIndex: number;
  todayTasks: CalendarEvent[];
  allTasks: TaskItem[];
  allEvents: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  linkedTask: TaskItem | null;
  suggestions: PlannerSuggestion[];
  aiLogs: AiLog[];
  latestSummary: string | null;
  latestWarnings: string[];
  focusHours: number;
  meetingHours: number;
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
  if (!selectedSlot) {
    return null;
  }

  const endHour = selectedSlot.startHour + durationHours;
  const startsAfterDeadlineDay = selectedSlot.day > dueDay;
  const endsAfterDeadlineTime = selectedSlot.day === dueDay && endHour > dueHour;

  if (startsAfterDeadlineDay || endsAfterDeadlineTime) {
    return "当前选中的开始时段可能赶不上你设置的截止时间，系统会尝试另找更早空档。";
  }

  return "当前选中的开始时段在截止时间之前，系统会优先尝试把任务放在这里。";
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
    const selectedCandidate = {
      id: "__preview__",
      title: "preview",
      day: selectedSlot.day,
      startHour: selectedSlot.startHour,
      duration: durationHours
    };

    const selectedConflicts = allEvents.some(
      (event) => event.status !== "completed" && event.status !== "unscheduled" && hasConflict(selectedCandidate, event)
    );
    const selectedEndsAt = getEventEndHour(selectedCandidate);
    const selectedBeforeDeadline =
      selectedSlot.day < dueDay || (selectedSlot.day === dueDay && selectedEndsAt <= dueHour);

    if (!selectedConflicts && selectedBeforeDeadline) {
      return {
        day: selectedSlot.day,
        startHour: selectedSlot.startHour,
        endHour: selectedEndsAt,
        note: "系统会优先尝试使用你当前选中的起始时段。"
      };
    }
  }

  const lastDay = Math.max(focusedDayIndex, dueDay);
  for (let day = focusedDayIndex; day <= lastDay; day += 1) {
    const preferredHours =
      day === dueDay
        ? [9, 10, 11, 13.5, 14.5, 16].filter((hour) => hour + durationHours <= dueHour)
        : [9, 10, 11, 13.5, 14.5, 16];
    const slot = findNextAvailableSlot(allEvents, day, durationHours, {
      preferredHours: preferredHours.length > 0 ? preferredHours : undefined
    });
    if (slot !== null) {
      const endHour = slot + durationHours;
      if (day < dueDay || (day === dueDay && endHour <= dueHour)) {
        return {
          day,
          startHour: slot,
          endHour,
          note: day === dueDay ? "这是截止前较稳妥的最后一个空档。" : "AI 预计会优先把它塞进这个可用窗口。"
        };
      }
    }
  }

  return null;
}

export function RightTaskPanel({
  isOpen,
  selectedSlot,
  activeSection,
  focusedDayLabel,
  focusedDayIndex,
  todayTasks,
  allTasks,
  allEvents,
  selectedEvent,
  linkedTask,
  suggestions,
  aiLogs,
  latestSummary,
  latestWarnings,
  focusHours,
  meetingHours,
  onOpen,
  onClose,
  onSelectTask,
  onClearSelectedSlot,
  onSelectSuggestedSlot,
  onAddTask,
  onScheduleTask,
  onMarkDone,
  onApplySuggestion,
  onDismissSuggestion,
  onAutoSchedule,
  onPreviewScenario,
  onApplyScenario
}: RightTaskPanelProps) {
  const [title, setTitle] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [priority, setPriority] = useState<EventPriority>("P2");
  const [dueDay, setDueDay] = useState(focusedDayIndex);
  const [dueHour, setDueHour] = useState(18);
  const [urgent, setUrgent] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<"high" | "medium" | "low">("medium");
  const [panelView, setPanelView] = useState<PanelView>("plan");

  useEffect(() => {
    if (selectedSlot) {
      setDueDay(selectedSlot.day);
      setDueHour(Math.max(selectedSlot.startHour + durationHours, dueHour));
      return;
    }
    setDueDay(focusedDayIndex);
  }, [focusedDayIndex, selectedSlot]);

  useEffect(() => {
    if (selectedEvent) {
      setPanelView("details");
      return;
    }
    if (activeSection !== "Planner") {
      setPanelView("ai");
      return;
    }
    setPanelView("plan");
  }, [activeSection, selectedEvent]);

  const groupedTasks = useMemo(
    () =>
      priorityOptions
        .map((level) => ({
          label: priorityLabel(level),
          level,
          items: todayTasks.filter((task) => task.priority === level && task.status !== "unscheduled")
        }))
        .filter((group) => group.items.length > 0),
    [todayTasks]
  );

  const recommendedWindows = useMemo(
    () => findOpenWindowsForDay(allEvents, focusedDayIndex, 0.5, 4),
    [allEvents, focusedDayIndex]
  );
  const unscheduledTasks = allTasks.filter((task) => task.status === "unscheduled");
  const slotDeadlineHint = compareDeadlineWithSlot(selectedSlot, durationHours, dueDay, dueHour);
  const predictedPlacement = useMemo(
    () => buildPlacementPreview(allEvents, selectedSlot, focusedDayIndex, durationHours, dueDay, dueHour),
    [allEvents, selectedSlot, focusedDayIndex, durationHours, dueDay, dueHour]
  );
  const completedEvents = allEvents.filter((event) => event.status === "completed");
  const overtimeEvents = allEvents.filter((event) => event.status === "overtime");
  const focusScore = Math.min(100, Math.round((focusHours / Math.max(meetingHours + focusHours, 1)) * 100));
  const interruptionCount = aiLogs.filter((log) => log.action.includes("干不下去了")).length;

  if (!isOpen) {
    return (
      <aside className="flex h-full w-[68px] shrink-0 flex-col items-center justify-between border-l border-[#e5e7eb] bg-white px-3 py-5">
        <button
          type="button"
          onClick={onOpen}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          打开
        </button>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 text-center text-[11px] font-medium text-slate-500">
          {todayTasks.length}
          <div className="mt-1">今日</div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-[#e5e7eb] bg-white">
      <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 pr-3">
        <section className="flex items-center justify-between rounded-2xl border border-[#e8ebf3] bg-slate-50 px-4 py-3 shadow-soft">
          <div>
            <div className="text-[12px] font-semibold text-slate-900">{focusedDayLabel}</div>
            <div className="mt-1 text-[12px] text-slate-500">
              {activeSection === "Planner" ? "动态重排工作台" : `${sectionLabels[activeSection]} 已联动到 AI 面板`}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </section>

        <section className="rounded-2xl border border-[#e8ebf3] bg-white p-1 shadow-soft">
          <div className="grid grid-cols-3 gap-1">
            {[
              { key: "plan", label: "计划" },
              { key: "details", label: "详情" },
              { key: "ai", label: "AI" }
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPanelView(item.key as PanelView)}
                className={`rounded-xl px-3 py-2 text-[12px] font-medium transition ${
                  panelView === item.key ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {panelView === "plan" ? (
          <>
            <section className="rounded-2xl border border-[#e8ebf3] bg-[#fbfcff] p-4 shadow-soft">
              <div className="text-[14px] font-semibold text-slate-950">快速添加任务</div>
              <div className="mt-3">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      onAddTask({ title, durationHours, priority, dueDay, dueHour, urgent, energyLevel });
                      setTitle("");
                    }
                  }}
                  placeholder="添加一个任务..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {selectedSlot ? (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-[12px] text-indigo-800">
                  <span>
                    正在安排到 {focusedDayLabel} {formatTime(selectedSlot.startHour)}
                  </span>
                  <button type="button" className="font-medium text-indigo-700 transition hover:text-indigo-900" onClick={onClearSelectedSlot}>
                    清除
                  </button>
                </div>
              ) : null}

              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-[12px] font-medium text-slate-500">
                    <span>时长</span>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] text-indigo-700">
                      {durationHours.toFixed(durationHours % 1 === 0 ? 0 : 2)} 小时
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <input
                      type="range"
                      min={0.25}
                      max={4}
                      step={0.25}
                      value={durationHours}
                      onChange={(event) => setDurationHours(Number(event.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>15 分钟</span>
                      <span>拖动设置时长</span>
                      <span>4 小时</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[12px] font-medium text-slate-500">优先级</div>
                  <div className="flex flex-wrap gap-2">
                    {priorityOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setPriority(option)}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                          priority === option ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {priorityLabel(option)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="mb-2 text-[12px] font-medium text-slate-500">截止日期</div>
                    <select
                      value={String(dueDay)}
                      onChange={(event) => setDueDay(Number(event.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      {dayLabels.map((label, index) => (
                        <option key={label} value={index}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="mb-2 text-[12px] font-medium text-slate-500">截止时刻</div>
                    <select
                      value={String(dueHour)}
                      onChange={(event) => setDueHour(normalizeSliderHour(Number(event.target.value)))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      {dueTimeOptions.map((option) => (
                        <option key={option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[12px] font-medium text-slate-500">能量需求</div>
                  <div className="flex gap-2">
                    {(["high", "medium", "low"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setEnergyLevel(option)}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                          energyLevel === option ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {energyLabel(option)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-600">
                  当前截止：{dayLabels[dueDay]} {formatTime(dueHour)}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-[12px] font-semibold text-slate-900">计划摘要</div>
                  <div className="mt-2 space-y-2 text-[12px] text-slate-600">
                    <div>预计时长：{durationHours.toFixed(durationHours % 1 === 0 ? 0 : 2)} 小时</div>
                    <div>任务强度：{energyLabel(energyLevel)}</div>
                    <div>
                      安排策略：
                      {selectedSlot
                        ? ` 优先尝试从 ${dayLabels[selectedSlot.day]} ${formatTime(selectedSlot.startHour)} 开始`
                        : urgent
                          ? " 作为紧急任务，优先插入最近可用时间"
                          : " 自动寻找截止前的合适空档"}
                    </div>
                  </div>
                  {slotDeadlineHint ? (
                    <div
                      className={`mt-3 rounded-xl px-3 py-2 text-[12px] leading-5 ${
                        slotDeadlineHint.includes("赶不上")
                          ? "border border-amber-100 bg-amber-50 text-amber-800"
                          : "border border-emerald-100 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {slotDeadlineHint}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
                  <div className="text-[12px] font-semibold text-indigo-900">AI 预计落点</div>
                  {predictedPlacement ? (
                    <div className="mt-2 space-y-2 text-[12px] text-indigo-800">
                      <div>
                        预计安排到：{dayLabels[predictedPlacement.day]} {formatTime(predictedPlacement.startHour)} -{" "}
                        {formatTime(predictedPlacement.endHour)}
                      </div>
                      <div className="text-indigo-700">{predictedPlacement.note}</div>
                    </div>
                  ) : (
                    <div className="mt-2 text-[12px] leading-5 text-amber-800">
                      按你现在设置的时长和截止时间，截止前可能没有合适空档。提交后这条任务大概率会进入“未安排”并在 AI 面板里提示风险。
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                  <input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} />
                  作为紧急任务立刻插入
                </label>
              </div>

              <button
                type="button"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#4f46e5] px-4 py-2.5 text-[13px] font-medium text-white shadow-soft transition hover:bg-[#4338ca]"
                onClick={() => {
                  onAddTask({ title, durationHours, priority, dueDay, dueHour, urgent, energyLevel });
                  setTitle("");
                  setDurationHours(1);
                  setPriority("P2");
                  setDueDay(focusedDayIndex);
                  setDueHour(18);
                  setUrgent(false);
                  setEnergyLevel("medium");
                }}
              >
                <Plus className="h-4 w-4" />
                加入日程
              </button>
            </section>

            <section className="rounded-2xl border border-[#e8ebf3] bg-white p-4 shadow-soft">
              <div className="text-[14px] font-semibold text-slate-950">推荐空档</div>
              <div className="mt-3 space-y-2">
                {recommendedWindows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-[12px] leading-5 text-slate-500">
                    {focusedDayLabel} 已经比较满。可以把任务改为“本周处理”，或者使用自动排程腾出更好的专注窗口。
                  </div>
                ) : null}
                {recommendedWindows.map((window) => (
                  <button
                    key={`${window.startHour}-${window.endHour}`}
                    type="button"
                    onClick={() => onSelectSuggestedSlot(window.startHour)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                  >
                    <div>
                      <div className="text-[12px] font-medium text-slate-900">
                        {formatTime(window.startHour)} - {formatTime(window.endHour)}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">适合放短任务、恢复任务或新的专注块。</div>
                    </div>
                    <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                      {window.duration} 小时
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#e8ebf3] bg-white p-4 shadow-soft">
              <div className="text-[14px] font-semibold text-slate-950">{focusedDayLabel} 优先事项</div>
              <div className="mt-3 space-y-4">
                {groupedTasks.length === 0 ? (
                  <div className="text-[12px] text-slate-500">
                    {focusedDayLabel} 暂无优先任务。可以直接点日历空白处，把新任务变成时间块。
                  </div>
                ) : null}
                {groupedTasks.map((group) => (
                  <div key={group.level}>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{group.label}</div>
                    <div className="space-y-2">
                      {group.items.map((task) => (
                        <div key={task.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300 hover:bg-white">
                          <div className={`text-[12px] font-medium text-slate-900 ${task.status === "completed" ? "line-through opacity-60" : ""}`}>{task.title}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <button type="button" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950" onClick={() => onSelectTask(task.id)}>
                              详情
                            </button>
                            <button type="button" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700" onClick={() => onScheduleTask(task.id)}>
                              重新安排
                            </button>
                            <button type="button" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700" onClick={() => onMarkDone(task.id)}>
                              完成
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#e8ebf3] bg-white p-4 shadow-soft">
              <div className="text-[14px] font-semibold text-slate-950">历史效率分析</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] text-slate-500">Estimated vs actual</div>
                  <div className="mt-1 text-[15px] font-semibold text-slate-950">
                    {Math.max(allTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0) - completedEvents.length * 30, 0)} / {allTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)}m
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] text-slate-500">Focus score</div>
                  <div className="mt-1 text-[15px] font-semibold text-slate-950">{focusScore}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] text-slate-500">Interruption count</div>
                  <div className="mt-1 text-[15px] font-semibold text-slate-950">{interruptionCount}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] text-slate-500">Best focus window</div>
                  <div className="mt-1 text-[15px] font-semibold text-slate-950">09:00 - 10:30</div>
                </div>
              </div>
              <div className="mt-3 text-[12px] leading-5 text-slate-500">
                已完成 {completedEvents.length} 个事件，超时块 {overtimeEvents.length} 个。
              </div>
            </section>

            <section className="rounded-2xl border border-[#e8ebf3] bg-white p-4 shadow-soft">
              <div className="text-[14px] font-semibold text-slate-950">一键重新规划</div>
              <div className="mt-2 text-[12px] leading-5 text-slate-500">
                保留固定会议，只移动灵活任务、专注块和习惯块，适合演示动态规划效果。
              </div>
              <button
                type="button"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#4f46e5] px-4 py-2.5 text-[13px] font-medium text-white shadow-soft transition hover:bg-[#4338ca]"
                onClick={onAutoSchedule}
              >
                <Sparkles className="h-4 w-4" />
                一键重新规划
              </button>
            </section>

            <section className="rounded-2xl border border-[#e8ebf3] bg-white p-4 shadow-soft">
              <div className="text-[14px] font-semibold text-slate-950">多方案模拟</div>
              <div className="mt-3 space-y-2">
                {[
                  {
                    key: "balanced" as const,
                    title: "Balanced Plan",
                    description: "兼顾会议、专注和截止日期。"
                  },
                  {
                    key: "deep" as const,
                    title: "Deep Work Plan",
                    description: "优先保护长专注块。"
                  },
                  {
                    key: "deadline" as const,
                    title: "Deadline First Plan",
                    description: "优先把 P1 / P2 任务往前推。"
                  }
                ].map((scenario) => (
                  <div key={scenario.key} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="text-[12px] font-semibold text-slate-900">{scenario.title}</div>
                    <div className="mt-1 text-[11px] leading-5 text-slate-500">{scenario.description}</div>
                    <div className="mt-3 flex gap-2">
                      <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700" onClick={() => onPreviewScenario(scenario.key)}>
                        Preview
                      </button>
                      <button type="button" className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-medium text-indigo-700" onClick={() => onApplyScenario(scenario.key)}>
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {panelView === "details" ? (
          <section className="rounded-2xl border border-[#e8ebf3] bg-white p-4 shadow-soft">
            <div className="text-[14px] font-semibold text-slate-950">当前事件</div>
            {selectedEvent ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {selectedEvent.type === "meeting" ? "固定会议" : selectedEvent.aiGenerated ? "AI 调整块" : "时间块详情"}
                </div>
                <div className="mt-1 text-[16px] font-semibold text-slate-950">{selectedEvent.title}</div>
                <div className="mt-2 text-[12px] text-slate-500">
                  {focusedDayLabel} {formatTime(selectedEvent.startHour)} · {selectedEvent.duration} 小时
                </div>
                <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600">
                  {priorityLabel(selectedEvent.priority)} · {energyLabel(selectedEvent.energyLevel)} ·{" "}
                  {selectedEvent.fixed ? "固定事件" : "可移动"}
                </div>
                {linkedTask ? (
                  <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-[12px] text-indigo-700">
                    关联任务剩余 {linkedTask.remainingMinutes} 分钟，状态：{linkedTask.status}
                  </div>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950" onClick={() => onSelectTask(selectedEvent.id)}>
                    打开抽屉
                  </button>
                  <button type="button" className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-100" onClick={() => onScheduleTask(selectedEvent.id)}>
                    重新安排
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-[12px] text-slate-500">在日历里点一个任务块，这里会显示它的动态重排上下文。</div>
            )}
          </section>
        ) : null}

        {panelView === "ai" ? (
          <section className="rounded-2xl border border-[#e8ebf3] bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-950">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>AI 重排日志</span>
            </div>
            {latestSummary ? <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-[12px] leading-5 text-sky-800">{latestSummary}</div> : null}
            {latestWarnings.length > 0 ? (
              <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-800">
                {latestWarnings.map((warning) => (
                  <div key={warning}>- {warning}</div>
                ))}
              </div>
            ) : null}
            {unscheduledTasks.length > 0 ? (
              <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[12px] leading-5 text-rose-800">
                今日空间不足，以下任务仍未安排：{unscheduledTasks.map((task) => task.title).join("、")}
              </div>
            ) : null}

            <div className="mt-3 space-y-3">
              {aiLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[12px] font-semibold text-slate-900">{log.action}</div>
                    <div className="text-[11px] text-slate-400">{log.time}</div>
                  </div>
                  <div className="mt-1 text-[12px] leading-5 text-slate-600">{log.summary}</div>
                  {log.changes.length > 0 ? (
                    <div className="mt-2 rounded-lg bg-white px-3 py-2 text-[11px] text-slate-600">
                      {log.changes.map((change) => (
                        <div key={change}>- {change}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                  <div className="text-[12px] font-semibold text-indigo-900">{suggestion.title}</div>
                  <div className="mt-1 text-[12px] leading-5 text-slate-600">{suggestion.description}</div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-indigo-700" onClick={() => onApplySuggestion(suggestion)}>
                      应用
                    </button>
                    <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900" onClick={() => onDismissSuggestion(suggestion.id)}>
                      忽略
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
