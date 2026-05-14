"use client";

import { addDays, startOfWeek } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { CalendarGrid } from "./components/CalendarGrid";
import { EventDetailModal } from "./components/EventDetailModal";
import { FilterEmptyState } from "./components/FilterEmptyState";
import { InfoModal } from "./components/InfoModal";
import {
  AnalyticsView,
  FocusView,
  HabitsView,
  LinksView,
  MeetingsView,
  SettingsView,
  SyncView,
  TasksView
} from "./components/ModuleViews";
import { PlannerHeader, type PlannerSummaryCard } from "./components/PlannerHeader";
import { RightTaskPanel } from "./components/RightTaskPanel";
import { Sidebar } from "./components/Sidebar";
import { Toast } from "./components/Toast";
import {
  initialAiLogs,
  initialSuggestions,
  mockConnections,
  mockEvents,
  mockFocusPlan,
  mockHabits,
  mockMeetings,
  mockSchedulingLinks,
  mockTasks,
  plannerSettings
} from "./data/mockEvents";
import type {
  AiLog,
  CalendarConnectionItem,
  CalendarEvent,
  EventPriority,
  FocusPlan,
  GiveUpFeedback,
  HabitItem,
  NavigationSection,
  PlannerSettings,
  PlannerSuggestion,
  QuickTaskInput,
  ReplanAction,
  ReplanChangeType,
  ReplanResult,
  SchedulingLinkItem,
  SmartMeetingItem,
  TaskItem
} from "./types/calendar";
import {
  TODAY_INDEX,
  WORK_DAY_END,
  findNextAvailableSlot,
  findTaskByEvent,
  formatHours,
  formatTime,
  formatWeekRange,
  generateId,
  sortEventsForDisplay
} from "./utils/calendarUtils";
import { requestScheduleReplan } from "./utils/replanClient";
import { usePlannerFilters } from "./hooks/usePlannerFilters";

interface ToastState {
  id: number;
  message: string;
}

const sectionLabels: Record<NavigationSection, string> = {
  Planner: "日程规划",
  Tasks: "任务",
  Habits: "习惯",
  Focus: "专注时间",
  Meetings: "智能会议",
  Links: "预约链接",
  Sync: "日历同步",
  Analytics: "统计分析",
  Settings: "设置"
};

function buildContextualSuggestions(
  events: CalendarEvent[],
  focusedDayIndex: number,
  selectedEvent: CalendarEvent | null
): PlannerSuggestion[] {
  const dayEvents = events.filter(
    (event) => event.day === focusedDayIndex && event.status !== "completed" && event.status !== "unscheduled"
  );
  const suggestions: PlannerSuggestion[] = [];

  const firstFlexible = dayEvents.find((event) => event.flexible && !event.fixed);
  if (firstFlexible) {
    suggestions.push({
      id: `focus-slot-${firstFlexible.id}`,
      title: "把高价值任务放进整块时间",
      description: `“${firstFlexible.title}”更适合放进整块时间，减少碎片化切换。`,
      action: { kind: "focus_slot", day: focusedDayIndex, startHour: 14 }
    });
  }

  const denseMeetings = dayEvents.filter((event) => event.type === "meeting").length >= 2;
  if (denseMeetings) {
    suggestions.push({
      id: `buffer-day-${focusedDayIndex}`,
      title: "会议后补一段缓冲",
      description: "今天的会议密度偏高，建议插入15分钟恢复块，避免后续专注任务直接撞上会议疲劳。",
      action: { kind: "insert_buffer", day: focusedDayIndex, startHour: 15.25 }
    });
  }

  if (selectedEvent && selectedEvent.flexible && selectedEvent.status !== "completed") {
    suggestions.push({
      id: `selected-${selectedEvent.id}`,
      title: "围绕当前事项重排",
      description: `选中了“${selectedEvent.title}”。现在可以拖动、压缩、延长，或点“干不下去了”触发自适应重排。`,
      action: { kind: "rebalance", targetEventId: selectedEvent.id }
    });
  }

  return suggestions;
}

export default function App() {
  const [events, setEvents] = useState<CalendarEvent[]>(mockEvents);
  const [tasks, setTasks] = useState<TaskItem[]>(mockTasks);
  const [habits, setHabits] = useState<HabitItem[]>(mockHabits);
  const [focusPlan, setFocusPlan] = useState<FocusPlan>(mockFocusPlan);
  const [meetings, setMeetings] = useState<SmartMeetingItem[]>(mockMeetings);
  const [links, setLinks] = useState<SchedulingLinkItem[]>(mockSchedulingLinks);
  const [connections, setConnections] = useState<CalendarConnectionItem[]>(mockConnections);
  const [settings, setSettings] = useState<PlannerSettings>({ ...plannerSettings });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [suggestions] = useState<PlannerSuggestion[]>(initialSuggestions);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLog[]>(initialAiLogs);
  const [latestSummary, setLatestSummary] = useState<string | null>(initialAiLogs[0]?.summary ?? null);
  const [latestWarnings, setLatestWarnings] = useState<string[]>([]);
  const [giveUpFeedback, setGiveUpFeedback] = useState<GiveUpFeedback | null>(null);
  const [recentChangeMap, setRecentChangeMap] = useState<Record<string, ReplanChangeType>>({});
  const [activeSection, setActiveSection] = useState<NavigationSection>("Planner");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [requestedPanelView, setRequestedPanelView] = useState<"plan" | "details" | "ai" | null>(null);
  const [requestedPanelViewToken, setRequestedPanelViewToken] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; startHour: number } | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [focusedDayIndex, setFocusedDayIndex] = useState(TODAY_INDEX);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const {
    filterState,
    isFilterOpen,
    setIsFilterOpen,
    toggleFilter,
    clearFilters,
    filteredEvents,
    filteredTasks
  } = usePlannerFilters();

  const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  const displayEvents = filteredEvents(events);
  const displayTasks = filteredTasks(tasks);

  const selectedEvent = useMemo(
    () => (selectedEventId ? displayEvents.find((event) => event.id === selectedEventId) ?? null : null),
    [displayEvents, selectedEventId]
  );
  const linkedTask = useMemo(() => findTaskByEvent(tasks, selectedEvent), [selectedEvent, tasks]);
  const focusedDayTasks = useMemo(
    () =>
      displayEvents.filter(
        (event) =>
          event.day === focusedDayIndex
      ),
    [displayEvents, focusedDayIndex]
  );
  const focusedDayLabel = dayNames[focusedDayIndex] ?? "本日";
  const focusHours = useMemo(
    () =>
      events
        .filter((event) => event.type === "focus" && event.status !== "completed" && event.status !== "unscheduled")
        .reduce((sum, event) => sum + event.duration, 0),
    [events]
  );
  const meetingHours = useMemo(
    () =>
      events
        .filter((event) => event.type === "meeting" && event.status !== "completed" && event.status !== "unscheduled")
        .reduce((sum, event) => sum + event.duration, 0),
    [events]
  );

  const visibleSuggestions = useMemo(() => {
    const contextual = buildContextualSuggestions(events, focusedDayIndex, selectedEvent);
    const combined = [...contextual, ...suggestions];
    return combined.filter((suggestion, index) => {
      const firstIndex = combined.findIndex((item) => item.id === suggestion.id);
      return firstIndex === index && !dismissedSuggestionIds.includes(suggestion.id);
    });
  }, [dismissedSuggestionIds, events, focusedDayIndex, selectedEvent, suggestions]);

  const summaryCards = useMemo<PlannerSummaryCard[]>(() => {
    const activeEvents = events.filter((event) => event.status !== "completed" && event.status !== "unscheduled");
    const flexibleCount = activeEvents.filter((event) => event.flexible).length;

    return [
      {
        label: "当前聚焦",
        value: focusedDayLabel,
        detail: "推荐空档和智能建议都围绕这一天展开",
        tone: "indigo"
      },
      {
        label: "专注时长",
        value: formatHours(focusHours),
        detail: `已保护 ${focusPlan.protectedEventIds.length} 个专注块，目标 ${focusPlan.weeklyTargetHours}h`,
        tone: "emerald"
      },
      {
        label: "会议占用",
        value: `${meetingHours.toFixed(meetingHours % 1 === 0 ? 0 : 1)}h`,
        detail: `${flexibleCount} 个灵活事项参与自动安排`,
        tone: "amber"
      }
    ];
  }, [events, focusHours, focusPlan.protectedEventIds.length, focusPlan.weeklyTargetHours, focusedDayLabel, meetingHours]);

  const sidebarBadges = useMemo(
    () => ({
      Tasks: `${tasks.filter((task) => task.status === "unscheduled").length}`,
      Habits: `${habits.reduce((sum, item) => sum + Math.max(item.weeklyTarget - item.completedCount, 0), 0)}`,
      Focus: focusHours > 0 ? focusHours.toFixed(1) : "",
      Meetings: `${meetings.filter((meeting) => meeting.conflictStatus !== "正常").length || ""}`
    }),
    [focusHours, habits, meetings, tasks]
  );

  const syncHealthy = useMemo(
    () => connections.every((connection) => connection.status === "已同步"),
    [connections]
  );

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (Object.keys(recentChangeMap).length === 0) {
      return;
    }
    const timeout = window.setTimeout(() => setRecentChangeMap({}), 3200);
    return () => window.clearTimeout(timeout);
  }, [recentChangeMap]);

  const showToast = (message: string) => setToast({ id: Date.now(), message });
  const requestPanelView = (view: "plan" | "details" | "ai") => {
    setRequestedPanelView(view);
    setRequestedPanelViewToken((current) => current + 1);
  };
  const buildGiveUpFeedback = (sourceEvent: CalendarEvent, result: ReplanResult): GiveUpFeedback => {
    const currentSegment = result.events.find((event) => event.id === sourceEvent.id) ?? sourceEvent;
    const resumeTitle = `${sourceEvent.title}（继续）`;
    const breakBlock =
      result.events.find(
        (event) =>
          event.day === sourceEvent.day &&
          event.type === "break" &&
          event.aiGenerated &&
          Math.abs(event.startHour - (currentSegment.startHour + currentSegment.duration)) < 0.01
      ) ?? null;
    const resumeBlock =
      result.events.find(
        (event) => event.day === sourceEvent.day && event.title === resumeTitle && event.status === "interrupted"
      ) ?? null;
    const lightBlock =
      result.events.find(
        (event) =>
          event.day === sourceEvent.day &&
          event.id !== sourceEvent.id &&
          event.title !== resumeTitle &&
          event.type !== "break" &&
          (!breakBlock || event.startHour >= breakBlock.startHour + breakBlock.duration) &&
          (!resumeBlock || event.startHour < resumeBlock.startHour)
      ) ?? null;

    const originalEndHour = sourceEvent.startHour + sourceEvent.duration;
    const currentEndHour = currentSegment.startHour + currentSegment.duration;
    const changes = result.latestLog.changes.slice(0, 6);
    const affectedTaskCount = result.changes.filter((change) =>
      ["moved", "resized", "replanned", "buffered", "inserted"].includes(change.type)
    ).length;

    return {
      sourceEventId: sourceEvent.id,
      sourceTitle: sourceEvent.title,
      day: sourceEvent.day,
      dayLabel: dayNames[sourceEvent.day] ?? "当天",
      originalStartHour: sourceEvent.startHour,
      originalEndHour,
      originalFocusMinutes: Math.round(sourceEvent.duration * 60),
      immediateFocusMinutes: Math.round(currentSegment.duration * 60),
      recoveryMinutes: Math.round((breakBlock?.duration ?? 0) * 60),
      lightTaskMinutes: Math.round((lightBlock?.duration ?? 0) * 60),
      resumedAtHour: resumeBlock?.startHour ?? originalEndHour,
      affectedTaskCount,
      steps: [
        {
          id: "focus",
          label: "先收一小段",
          title: currentSegment.title,
          detail: "先保留一段更容易完成的小闭环，避免继续硬顶整块高强度任务。",
          startHour: sourceEvent.startHour,
          endHour: currentEndHour,
          tone: "focus"
        },
        ...(breakBlock
          ? [
              {
                id: "recovery",
                label: "恢复一下",
                title: breakBlock.title,
                detail: "强制插入一个明确的恢复点，先把注意力和压力拉下来。",
                startHour: breakBlock.startHour,
                endHour: breakBlock.startHour + breakBlock.duration,
                tone: "recovery" as const
              }
            ]
          : []),
        ...(lightBlock
          ? [
              {
                id: "light",
                label: "切轻任务",
                title: lightBlock.title,
                detail: "改做更轻的事，维持推进感，但不继续消耗同一类高能量注意力。",
                startHour: lightBlock.startHour,
                endHour: lightBlock.startHour + lightBlock.duration,
                tone: "light" as const
              }
            ]
          : []),
        ...(resumeBlock
          ? [
              {
                id: "resume",
                label: "稍后续做",
                title: resumeBlock.title,
                detail: "主任务没有消失，只是被延后到更容易重新进入状态的时段。",
                startHour: resumeBlock.startHour,
                endHour: resumeBlock.startHour + resumeBlock.duration,
                tone: "resume" as const
              }
            ]
          : [])
      ],
      changes,
      warnings: result.warnings
    };
  };

  const pushAiLog = (action: string, summary: string, changes: string[] = [], warnings: string[] = []) => {
    const log: AiLog = {
      id: generateId("log"),
      time: new Date().toTimeString().slice(0, 5),
      action,
      summary,
      changes,
      warnings
    };
    setAiLogs((current) => [log, ...current].slice(0, 10));
    setLatestSummary(summary);
    setLatestWarnings(warnings);
  };

  const runReplan = async (
    action: ReplanAction,
    successMessage: string,
    options?: { removeTaskId?: string }
  ): Promise<ReplanResult> => {
    const result = await requestScheduleReplan({
      currentEvents: events,
      currentTasks: tasks,
      action,
      settings
    });

    setEvents(result.events);
    setTasks(options?.removeTaskId ? result.tasks.filter((task) => task.id !== options.removeTaskId) : result.tasks);
    setAiLogs((current) => [result.latestLog, ...current].slice(0, 10));
    setLatestSummary(result.summary);
    setLatestWarnings(result.warnings);
    if (action.kind !== "give_up") {
      setGiveUpFeedback(null);
    }
    setRecentChangeMap(
      result.changes.reduce<Record<string, ReplanChangeType>>((acc, change) => {
        acc[change.eventId] = change.type;
        return acc;
      }, {})
    );
    setFocusedDayIndex(result.focusDay);
    setDismissedSuggestionIds([]);

    if (selectedEventId && !result.events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(null);
    }

    showToast(successMessage);
    return result;
  };

  const getLinkedScheduledEvent = (taskId: string) =>
    events.find((event) => event.taskId === taskId && event.status !== "completed" && event.status !== "unscheduled") ?? null;

  const handleEventMove = (eventId: string, day: number, startHour: number) => {
    void runReplan(
      {
        kind: "drag",
        eventId,
        day,
        startHour,
        focusDay: day
      },
      `已拖动到 ${dayNames[day]} ${formatTime(startHour)}`
    );
  };

  const handleAdjustDuration = (eventId: string, nextDuration: number) => {
    const target = events.find((event) => event.id === eventId);
    if (!target) {
      return;
    }
    void runReplan(
      {
        kind: "resize",
        eventId,
        duration: Math.min(nextDuration, WORK_DAY_END - target.startHour),
        startHour: target.startHour,
        focusDay: target.day
      },
      `已把时长改为 ${nextDuration} 小时`
    );
  };

  const handleMarkDone = (eventId: string) => {
    const target = events.find((event) => event.id === eventId);
    if (!target) {
      return;
    }
    void runReplan(
      {
        kind: "complete",
        eventId,
        focusDay: target.day,
        startHour: target.startHour
      },
      "任务已完成，后续日程已更新"
    );
  };

  const handleEarlyComplete = (eventId: string, completedAtHour: number) => {
    const target = events.find((event) => event.id === eventId);
    if (!target) {
      return;
    }
    void runReplan(
      {
        kind: "early_complete",
        eventId,
        completedAtHour,
        focusDay: target.day,
        startHour: completedAtHour
      },
      "已提前完成，并尽量把后续安排前移"
    );
  };

  const handleMarkOvertime = (eventId: string, overtimeHours: number) => {
    const target = events.find((event) => event.id === eventId);
    if (!target) {
      return;
    }
    void runReplan(
      {
        kind: "overtime",
        eventId,
        duration: overtimeHours,
        focusDay: target.day,
        startHour: target.startHour
      },
      "已标记超时，AI 正在续上并重排"
    );
  };

  const handleDelete = (eventId: string) => {
    const target = events.find((event) => event.id === eventId);
    if (!target) {
      return;
    }
    void runReplan(
      {
        kind: "delete",
        eventId,
        focusDay: target.day,
        day: target.day,
        startHour: target.startHour
      },
      "任务已删除，空出来的时间已重新利用"
    );
  };

  const handleCannotContinue = async (eventId: string) => {
    const target = events.find((event) => event.id === eventId);
    if (!target) {
      return;
    }
    const result = await runReplan(
      {
        kind: "give_up",
        eventId,
        focusDay: target.day,
        startHour: target.startHour
      },
      "已插入恢复时间，并切到更轻量的任务"
    );
    setGiveUpFeedback(buildGiveUpFeedback(target, result));
  };

  const runGiveUpAndShowFeedback = (eventId: string) => {
    void handleCannotContinue(eventId);
    setSelectedEventId(null);
    setIsPanelOpen(true);
    requestPanelView("ai");
  };

  const handleReschedule = (eventId: string) => {
    const target = events.find((event) => event.id === eventId);
    if (!target) {
      return;
    }
    const slot = findNextAvailableSlot(events, target.day, target.duration, {
      excludeId: target.id,
      preferredHours: [9, 10, 11, 14, 15.5]
    });
    void runReplan(
      {
        kind: "drag",
        eventId,
        day: target.day,
        startHour: slot ?? target.startHour,
        focusDay: target.day
      },
      "已尝试把任务挪到更合理的时段"
    );
  };

  const handleAddTask = (task: QuickTaskInput) => {
    const trimmed = task.title.trim();
    if (!trimmed) {
      showToast("请先输入任务标题");
      return;
    }

    void runReplan(
      {
        kind: task.urgent || task.priority === "P1" ? "add_urgent_task" : "add_task",
        title: trimmed,
        duration: task.durationHours,
        priority: task.priority,
        dueDay: task.dueDay,
        dueHour: task.dueHour,
        energyLevel: task.energyLevel,
        focusDay: selectedSlot?.day ?? focusedDayIndex,
        day: selectedSlot?.day ?? focusedDayIndex,
        startHour: selectedSlot?.startHour
      },
      task.urgent || task.priority === "P1" ? "紧急任务已插入日历" : "新任务已加入日程"
    );

    setSelectedSlot(null);
    setIsPanelOpen(true);
  };

  const handleApplySuggestion = (suggestion: PlannerSuggestion) => {
    if (suggestion.action.kind === "focus_slot") {
      const target = selectedEvent ?? events.find((event) => event.flexible && event.status !== "completed");
      if (!target) {
        return;
      }
      void runReplan(
        {
          kind: "drag",
          eventId: target.id,
          day: suggestion.action.day,
          startHour: suggestion.action.startHour,
          focusDay: suggestion.action.day
        },
        "已应用建议：把任务放进更完整的窗口"
      );
    } else if (suggestion.action.kind === "insert_buffer") {
      void runReplan(
        {
          kind: "insert_buffer",
          day: suggestion.action.day,
          startHour: suggestion.action.startHour,
          focusDay: suggestion.action.day
        },
        "已插入缓冲时间"
      );
    } else if (suggestion.action.kind === "urgent") {
      void runReplan(
        {
          kind: "add_urgent_task",
          title: suggestion.action.title,
          duration: 1,
          priority: "P1",
          dueDay: focusedDayIndex,
          dueHour: 18,
          energyLevel: "high",
          focusDay: focusedDayIndex
        },
        "紧急任务已优先插入"
      );
    } else {
      void runReplan(
        {
          kind: "auto_schedule",
          focusDay: focusedDayIndex
        },
        "已重新平衡当天和整周安排"
      );
    }

    setDismissedSuggestionIds((current) => [...current, suggestion.id]);
  };

  const handleAutoSchedule = async () => {
    if (isOptimizing) {
      return;
    }

    showToast("正在智能安排日程...");
    setIsOptimizing(true);

    let aiSuccess = false;

    try {
      const response = await fetch("/api/scheduling/recompute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: "MANUAL",
          useLlmAdvisor: true,
          instruction: "请重新优化整周日程安排，将高优先级任务前置，保证截止时间，避免冲突，并保留固定承诺。",
          fallbackOnError: true,
          windowStart: weekStart.toISOString(),
          windowEnd: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
      });

      const contentType = response.headers.get("content-type") || "";
      const errorText = await response.text().catch(() => "");

      if (!response.ok || !contentType.includes("application/json")) {
        console.warn("⚠️ API 返回异常:", {
          status: response.status,
          contentType,
          isHtml: errorText.includes("<!DOCTYPE"),
          preview: errorText.slice(0, 300)
        });
        throw new Error(`API ${response.status}: ${contentType.includes("text/html") ? "服务端错误" : errorText.slice(0, 200)}`);
      }

      const data = JSON.parse(errorText);
      console.log("✅ AI 智能安排成功:", data);

      if (data.ok && data.result?.events && Array.isArray(data.result.events)) {
        const mappedEvents = data.result.events.map((event: Record<string, unknown>) => ({
          id: event.id as string,
          title: event.title as string,
          type: (event.type as CalendarEvent["type"]) || "task",
          day: Math.max(0, Math.min(6, (event.day as number) ?? 0)),
          startHour: Number(event.startHour) ?? 9,
          duration: Number(event.duration) ?? 1,
          priority: (event.priority as CalendarEvent["priority"]) || "P2",
          status: ((event.status as string) === "completed" ? "completed" : "scheduled") as CalendarEvent["status"],
          movable: !(event.fixed as boolean),
          fixed: !!(event.fixed as boolean),
          flexible: !(event.fixed as boolean),
          energyLevel: (event.energyLevel as CalendarEvent["energyLevel"]) || "medium",
          aiGenerated: true
        }));

        setEvents(mappedEvents);
        showToast(`✅ AI 智能安排完成！已优化 ${mappedEvents.length} 个事件`);
        aiSuccess = true;
      } else {
        console.warn("AI 返回格式异常:", data);
      }
    } catch (error) {
      console.error("⚠️ AI 调用失败:", error instanceof Error ? error.message : error);
    }

    if (!aiSuccess) {
      try {
        showToast("🔄 使用智能算法优化日程...");
        await runReplanLocal();
      } catch (localError) {
        console.error("❌ 本地算法也失败:", localError);
        showToast("❌ 安排失败，请刷新页面重试");
      }
    }

    setIsOptimizing(false);
  };

  const runReplanLocal = async () => {
    return new Promise<void>((resolve, reject) => {
      window.setTimeout(async () => {
        try {
          const result = await runReplan(
            {
              kind: "auto_schedule",
              focusDay: focusedDayIndex
            },
            "✨ 日程优化完成"
          );

          console.log("📊 本地算法结果:", {
            eventsCount: result.events.length,
            changesCount: result.changes.length,
            summary: result.summary
          });

          if (result.changes.length > 0) {
            showToast(`✨ 已重新排列 ${result.changes.length} 个事件块`);
          } else {
            showToast("✨ 当前日程已是最优状态");
          }

          resolve();
        } catch (err) {
          console.error("❌ runReplan 执行失败:", err);
          reject(err);
        }
      }, 400);
    });
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestionIds((current) => [...current, suggestionId]);
  };

  const handleSelectSection = (label: NavigationSection) => {
    setActiveSection(label);
    setSelectedSlot(null);
    showToast(label === "Planner" ? "已切回完整周计划" : `已切换到 ${sectionLabels[label]}`);
  };

  const handleResetPlanner = () => {
    setActiveSection("Planner");
    setFocusedDayIndex(TODAY_INDEX);
    setSelectedSlot(null);
    setIsPanelOpen(true);
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
    showToast("计划视图已重置");
  };

  const handleOpenSlot = (day: number, startHour: number) => {
    setSelectedSlot({ day, startHour });
    setFocusedDayIndex(day);
    setIsPanelOpen(true);
    showToast(`已选择 ${dayNames[day]} ${formatTime(startHour)}`);
  };

  const handleCreateTaskObject = (input: QuickTaskInput) => {
    const title = input.title.trim();
    if (!title) {
      showToast("请先输入任务标题");
      return;
    }

    const nextTask: TaskItem = {
      id: generateId("task"),
      title,
      priority: input.priority,
      dueDate: `2026-05-${String(10 + input.dueDay).padStart(2, "0")} ${formatTime(input.dueHour)}`,
      dueDay: input.dueDay,
      dueHour: input.dueHour,
      estimatedMinutes: Math.round(input.durationHours * 60),
      remainingMinutes: Math.round(input.durationHours * 60),
      status: "unscheduled",
      upNext: false,
      energyLevel: input.energyLevel,
      splittable: input.energyLevel !== "low"
    };
    setTasks((current) => [nextTask, ...current]);
    pushAiLog(
      "添加任务",
      `"${title}"已加入，会在截止前被安排进日程。`,
      [`${input.priority} · ${dayNames[input.dueDay]} ${formatTime(input.dueHour)}截止`]
    );
    showToast("任务已加入");
  };

  const handleScheduleTaskFromPool = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }
    const linked = getLinkedScheduledEvent(taskId);
    if (linked) {
      handleReschedule(linked.id);
      return;
    }
    void runReplan(
      {
        kind: task.priority === "P1" || task.upNext ? "add_urgent_task" : "add_task",
        taskId: task.id,
        title: task.title,
        duration: Math.max(task.remainingMinutes, 30) / 60,
        priority: task.priority,
        dueDay: task.dueDay,
        dueHour: task.dueHour,
        energyLevel: task.energyLevel,
        focusDay: focusedDayIndex
      },
      `已把“${task.title}”安排进日历`
    );
  };

  const handleMarkTaskDone = (taskId: string) => {
    const linked = getLinkedScheduledEvent(taskId);
    if (linked) {
      handleMarkDone(linked.id);
      return;
    }
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status: "completed", remainingMinutes: 0 } : task))
    );
    pushAiLog("标记任务完成", "任务在任务池中被直接标记完成。", [`任务 ID：${taskId}`]);
    showToast("任务已完成");
  };

  const handleDeleteTaskItem = (taskId: string) => {
    const linked = getLinkedScheduledEvent(taskId);
    if (linked) {
      void runReplan(
        {
          kind: "delete",
          eventId: linked.id,
          focusDay: linked.day,
          day: linked.day,
          startHour: linked.startHour
        },
        "任务和日历事件已删除",
        { removeTaskId: taskId }
      );
      return;
    }

    setTasks((current) => current.filter((task) => task.id !== taskId));
    pushAiLog("删除任务对象", "该任务已从任务池中移除。");
    showToast("任务已删除");
  };

  const handleToggleTaskUpNext = (taskId: string) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask) {
      return;
    }
    const nextUpNext = !currentTask.upNext;
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) {
          return task;
        }
        return { ...task, upNext: nextUpNext };
      })
    );
    pushAiLog(
      "优先任务",
      nextUpNext
        ? `"${currentTask.title}"已标记为优先，下次智能安排会优先放入空档。`
        : `"${currentTask.title}"已取消优先，恢复常规排序。`
    );
    showToast("优先状态已更新");
  };

  const handleChangeTaskPriority = (taskId: string, priority: EventPriority) => {
    let taskTitle = "";
    const nextEvents = events.map((event) => {
      if (event.taskId === taskId) {
        return { ...event, priority };
      }
      return event;
    });
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) {
          return task;
        }
        taskTitle = task.title;
        return { ...task, priority };
      })
    );
    setEvents(nextEvents);
    pushAiLog(
      "调整优先级",
      `"${taskTitle}"已改为 ${priority}。${priority === "P1" || priority === "P2" ? "会优先安排到更好的空档。" : "会让位给更高优先级事项。"}`
    );
    showToast("优先级已更新");
  };

  const handleOpenTaskFromPool = (taskId: string) => {
    const linked = getLinkedScheduledEvent(taskId);
    if (!linked) {
      showToast("先点击安排将任务放到日历里");
      return;
    }
    setSelectedEventId(linked.id);
    setIsPanelOpen(true);
  };

  const handleCreateHabit = (habit: HabitItem) => {
    setHabits((current) => [habit, ...current]);
    pushAiLog("添加习惯", `"${habit.name}"已添加，后续可一键安排进本周日程`);
    showToast("习惯已添加");
  };

  const handleToggleHabit = (habitId: string) => {
    let nextState = false;
    let habitName = "";
    setHabits((current) =>
      current.map((habit) => {
        if (habit.id !== habitId) {
          return habit;
        }
        nextState = !habit.active;
        habitName = habit.name;
        return { ...habit, active: !habit.active };
      })
    );
    pushAiLog("切换习惯", nextState ? `"${habitName}"已启用，会参与自动安排` : `"${habitName}"已暂停，不再占用日程`);
    showToast("习惯状态已更新");
  };

  const handleScheduleHabits = (habitId?: string) => {
    const targetHabits = habits.filter((habit) => habit.active && (!habitId || habit.id === habitId));
    if (targetHabits.length === 0) {
      showToast("没有可安排的习惯");
      return;
    }

    const nextEvents = [...events];
    const habitChanges: string[] = [];
    const nextHabits = habits.map((habit) => ({ ...habit }));

    for (const habit of targetHabits) {
      const targetCount = habitId ? 1 : Math.max(habit.weeklyTarget - habit.completedCount, 1);
      let scheduled = 0;

      for (let day = 0; day < 7 && scheduled < targetCount; day += 1) {
        const slot = findNextAvailableSlot(nextEvents, day, habit.durationHours, {
          preferredHours: [habit.preferredStartHour, Math.min(habit.preferredStartHour + 1, habit.preferredEndHour)]
        });
        if (slot === null || slot + habit.durationHours > habit.preferredEndHour) {
          continue;
        }
        nextEvents.push({
          id: generateId("habit-event"),
          title: habit.name,
          day,
          startHour: slot,
          duration: habit.durationHours,
          type: "habit",
          priority: habit.priority,
          status: "scheduled",
          movable: true,
          fixed: false,
          flexible: true,
          energyLevel: "low",
          aiGenerated: true
        });
        scheduled += 1;
        habitChanges.push(`“${habit.name}”安排在 ${dayNames[day]} ${formatTime(slot)}`);
      }

      const target = nextHabits.find((item) => item.id === habit.id);
      if (target) {
        target.completedCount = Math.min(target.weeklyTarget, target.completedCount + scheduled);
      }
    }

    setHabits(nextHabits);
    setEvents(sortEventsForDisplay(nextEvents));
    pushAiLog(
      "安排习惯",
      "习惯已安排到日程，会尽量不影响高优先级任务",
      habitChanges
    );
    showToast("习惯已安排");
  };

  const handleUpdateFocusTarget = (hours: number) => {
    setFocusPlan((current) => ({ ...current, weeklyTargetHours: hours }));
    pushAiLog("更新专注目标", `每周目标已调整为 ${hours} 小时，后续保护专注时间时会按这个目标补齐。`);
  };

  const handleProtectFocus = () => {
    const needHours = Math.max(0, focusPlan.weeklyTargetHours - focusHours);
    if (needHours <= 0) {
      pushAiLog("保护专注时间", "本周专注目标已达成，无需额外添加");
      showToast("专注目标已达成");
      return;
    }

    const nextEvents = [...events];
    const protectedIds: string[] = [];
    let remaining = needHours;

    for (let day = 0; day < 7 && remaining > 0; day += 1) {
      const duration = Math.min(1.5, remaining);
      const slot = findNextAvailableSlot(nextEvents, day, duration, { preferredHours: [9, 10, 14, 15.5] });
      if (slot === null) {
        continue;
      }
      const id = generateId("focus");
      nextEvents.push({
        id,
        title: "受保护专注时间",
        day,
        startHour: slot,
        duration,
        type: "focus",
        priority: "P2",
        status: "scheduled",
        movable: true,
        fixed: false,
        flexible: true,
        energyLevel: "high",
        aiGenerated: true
      });
      protectedIds.push(id);
      remaining -= duration;
    }

    setFocusPlan((current) => ({
      ...current,
      protectedHours: current.protectedHours + (needHours - remaining),
      protectedEventIds: [...current.protectedEventIds, ...protectedIds]
    }));
    setEvents(sortEventsForDisplay(nextEvents));
    const warnings =
      meetingHours >= 8 ? ["会议正在压缩你的专注时间，建议减少低价值会议或把协作移到下午。"] : [];
    pushAiLog(
      "保护专注时间",
      remaining > 0 ? "我先补上了一部分专注块，但会议密度较高，剩余目标需要继续腾空间。" : "专注时间已补入日程，并尽量避开高优先级会议",
      protectedIds.map((id) => `新增专注块 ${id}`),
      warnings
    );
    showToast("专注时间已添加");
  };

  const handleCreateMeeting = (meeting: SmartMeetingItem) => {
    setMeetings((current) => [meeting, ...current]);
    pushAiLog("添加会议", `已添加“${meeting.title}”，点击重新安排可放到“重新安排”日历里。`);
    showToast("会议已添加");
  };

  const handleRescheduleMeeting = (meetingId: string) => {
    const meeting = meetings.find((item) => item.id === meetingId);
    if (!meeting) {
      return;
    }

    const linkedEvent = meeting.linkedEventId
      ? events.find((event) => event.id === meeting.linkedEventId) ?? null
      : null;

    if (linkedEvent) {
      const slot = findNextAvailableSlot(events, linkedEvent.day, linkedEvent.duration, {
        excludeId: linkedEvent.id,
        preferredHours: [10, 11, 14, 15.5]
      });
      if (slot === null) {
        pushAiLog("会议重排", `“${meeting.title}”暂时没有合适的空档，建议跳过本次或释放低优先级任务。`, [], ["当前没有合适空档"]);
        showToast("没有找到合适的会议时间");
        return;
      }
      void runReplan(
        {
          kind: "drag",
          eventId: linkedEvent.id,
          day: linkedEvent.day,
          startHour: slot,
          focusDay: linkedEvent.day
        },
        `已为“${meeting.title}”重新安排`
      );
      return;
    }

    const slot = findNextAvailableSlot(events, meeting.scheduledDay, meeting.durationHours, {
      preferredHours: [meeting.scheduledHour, 10, 14]
    });
    if (slot === null) {
      setMeetings((current) =>
        current.map((item) => (item.id === meetingId ? { ...item, conflictStatus: "冲突" } : item))
      );
      pushAiLog("会议重排", `“${meeting.title}”与高优先级事项冲突，暂无法安排。`, [], ["会议与固定承诺冲突"]);
      showToast("会议暂时无法安排");
      return;
    }

    const eventId = generateId("meeting-event");
    setEvents((current) =>
      sortEventsForDisplay([
        ...current,
        {
          id: eventId,
          title: meeting.title,
          day: meeting.scheduledDay,
          startHour: slot,
          duration: meeting.durationHours,
          type: "meeting",
          priority: meeting.priority,
          status: "scheduled",
          movable: false,
          fixed: true,
          flexible: false,
          energyLevel: "medium",
          aiGenerated: true
        }
      ])
    );
    setMeetings((current) =>
      current.map((item) =>
        item.id === meetingId
          ? { ...item, linkedEventId: eventId, scheduledHour: slot, conflictStatus: "正常" }
          : item
      )
    );
    pushAiLog("安排会议", `"“${meeting.title}”已放到日历，不影响高优先级任务。`, [`安排在 ${dayNames[meeting.scheduledDay]} ${formatTime(slot)}`]);
    showToast("会议已添加");
  };

  const handleSkipMeeting = (meetingId: string) => {
    const meeting = meetings.find((item) => item.id === meetingId);
    if (!meeting) {
      return;
    }
    if (meeting.linkedEventId) {
      setEvents((current) => current.filter((event) => event.id !== meeting.linkedEventId));
    }
    setMeetings((current) =>
      current.map((item) =>
        item.id === meetingId ? { ...item, linkedEventId: undefined, conflictStatus: "待安排" } : item
      )
    );
    pushAiLog("跳过会议", `“${meeting.title}”已跳过，空出的时间会回到可用池。`);
    showToast("已跳过本次会议");
  };

  const handleCreateLink = (link: SchedulingLinkItem) => {
    setLinks((current) => [link, ...current]);
    pushAiLog("添加链接", `已创建预约链接：“${link.name}”，可继续预览可预约时间。`);
    showToast("预约链接已创建");
  };

  const handlePreviewLink = (linkId: string) => {
    const link = links.find((item) => item.id === linkId);
    if (!link) {
      return;
    }
    const previews: string[] = [];
    for (let day = 0; day < 7; day += 1) {
      const slot = findNextAvailableSlot(events, day, link.durationHours, {
        preferredHours: [link.rangeStartHour, link.rangeStartHour + 1, link.rangeStartHour + 2].filter(
          (hour) => hour < link.rangeEndHour
        )
      });
      if (slot !== null && slot + link.durationHours <= link.rangeEndHour) {
        previews.push(`${dayNames[day]} ${formatTime(slot)} - ${formatTime(slot + link.durationHours)}`);
      }
      if (previews.length >= 4) {
        break;
      }
    }
    pushAiLog(
      "预览链接",
      `已生成可用时间，必要时会被更高优先级事项覆盖。`,
      previews.length > 0 ? previews : ["当前没有明显可预约窗口"]
    );
    showToast("可用时间已生成");
  };

  const handleCopyLink = (url: string) => {
    pushAiLog("复制链接", `链接已复制，可发送给外部参与者 ${url}。你可以把它发给外部参与者。`);
    showToast("模拟复制成功");
  };

  const handleToggleConnection = (connectionId: string) => {
    let connectionName = "";
    let nextStatus: "已同步" | "待授权" | "失败" = "已同步";
    setConnections((current) =>
      current.map((connection) => {
        if (connection.id !== connectionId) {
          return connection;
        }
        connectionName = connection.name;
        nextStatus = connection.status === "待授权" ? "已同步" : connection.status === "已同步" ? "失败" : "已同步";
        return {
          ...connection,
          status: nextStatus,
          lastSynced: nextStatus === "已同步" ? "2026-05-12 10:20" : connection.lastSynced
        };
      })
    );
    pushAiLog("日历同步", nextStatus === "已同步" ? (`"${connectionName}"已连接，忙碌时间会影响可用窗口判断`) : (`"${connectionName}"当前不是健康同步状态`));
    showToast("同步状态已更新");
  };

  const handleSyncConnection = (connectionId: string) => {
    let connectionName = "";
    setConnections((current) =>
      current.map((connection) => {
        if (connection.id !== connectionId) {
          return connection;
        }
        connectionName = connection.name;
        return { ...connection, status: "已同步", lastSynced: "2026-05-12 10:28" };
      })
    );
    pushAiLog(
      "同步日历",
      `已同步“${connectionName}”。忙碌时间会影响后续安排。`
    );
    showToast("同步完成");
  };

  const handleChangeConnectionPrivacy = (
    connectionId: string,
    value: CalendarConnectionItem["privacy"]
  ) => {
    let connectionName = "";
    setConnections((current) =>
      current.map((connection) => {
        if (connection.id !== connectionId) {
          return connection;
        }
        connectionName = connection.name;
        return { ...connection, privacy: value };
      })
    );
    pushAiLog("更新隐私", `“${connectionName}”已设为“${value}”，外部可见性已更新。`);
  };

  const handleExplainMetric = (metric: string) => {
    const map: Record<string, string> = {
      本周任务完成率: "完成率偏低通常意味着本周变动较多，动态重排承担了不少缓冲作用。",
      专注时间总量: "专注时间不足通常说明会议或碎任务正在蚕食成块的工作窗口。",
      会议时间总量: "会议时间偏高时，建议优先保护上午的深度工作时间。",
      习惯完成率: "习惯完成率低，往往代表 固定习惯 的优先级还不够高。",
      被重排次数: "重排次数越高，越能说明动态规划正在持续优化你的日程。",
      干不下去了次数: "这个次数高，说明系统需要继续学习你的精力节奏。"
    };
    pushAiLog("分析指标说明", map[metric] ?? `已查看指标“${metric}”的解释。`);
    showToast("解释已写入助手面板");
  };

  const handleUpdateSettings = (patch: Partial<PlannerSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    if (patch.replanMode) {
      pushAiLog(
        "更新策略",
        patch.replanMode === "conservative"
          ? "已切换为保守策略，会尽量少移动已有安排。"
          : patch.replanMode === "balanced"
            ? "已切换为平衡策略，会适度调整低优先级事项。"
            : "已切换为激进策略，会更灵活地重排日程。"
      );
    } else {
      pushAiLog("更新设置", "排程设置已修改，后续的自动重排会按新规则运行。");
    }
    showToast("设置已更新");
  };

  const handlePreviewScenario = (scenario: "balanced" | "deep" | "deadline") => {
    const summaryMap = {
      balanced: "Balanced Plan 平衡方案会保持现有结构，只做温和调整。",
      deep: "Deep Work Plan 深度方案会优先保护上午和下午的长专注块。",
      deadline: "Deadline First Plan 截止方案会把高优先级任务往前推，并压缩低优先级事项。"
    };
    pushAiLog("预览方案", summaryMap[scenario]);
    setIsPanelOpen(true);
    showToast("方案预览已生成");
  };

  const handleApplyScenario = (scenario: "balanced" | "deep" | "deadline") => {
    const nextMode =
      scenario === "balanced" ? "balanced" : scenario === "deep" ? "conservative" : "aggressive";
    setSettings((current) => ({ ...current, replanMode: nextMode }));
    pushAiLog(
      "应用方案",
      scenario === "balanced"
        ? "已应用 Balanced Plan，并开始智能重排。"
        : scenario === "deep"
          ? "已应用 Deep Work Plan，并开始智能重排。"
          : "已应用 Deadline First Plan，并开始智能重排。"
    );
    handleAutoSchedule();
  };

  const compressedByMeetings = meetingHours >= 8;

  const renderMainContent = () => {
    switch (activeSection) {
      case "Planner":
        return (
          <>
            <PlannerHeader
              events={events}
              weekStart={weekStart}
              isOptimizing={isOptimizing}
              isPanelOpen={isPanelOpen}
              focusedDayLabel={focusedDayLabel}
              summaryCards={summaryCards}
              filterState={filterState}
              isFilterOpen={isFilterOpen}
              onPrevWeek={() => setWeekStart((current) => addDays(current, -7))}
              onNextWeek={() => setWeekStart((current) => addDays(current, 7))}
              onToday={() => {
                setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
                setFocusedDayIndex(TODAY_INDEX);
                showToast("已跳回当前规划周");
              }}
              onSelectDate={(date) => {
                const newWeekStart = startOfWeek(date, { weekStartsOn: 0 });
                setWeekStart(newWeekStart);
                const diffMs = date.getTime() - newWeekStart.getTime();
                const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                setFocusedDayIndex(Math.max(0, Math.min(6, diffDays)));
                showToast(`已跳转到 ${formatWeekRange(newWeekStart)}`);
              }}
              onTogglePanel={() => setIsPanelOpen((current) => !current)}
              onAutoSchedule={handleAutoSchedule}
              onToggleFilter={toggleFilter}
              onClearFilters={clearFilters}
              onToggleFilterPanel={() => setIsFilterOpen((current) => !current)}
            />
            <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
              {displayEvents.length === 0 && events.length > 0 ? (
                <FilterEmptyState onClearFilters={clearFilters} />
              ) : (
                <CalendarGrid
                  events={displayEvents}
                  weekStart={weekStart}
                  isOptimizing={isOptimizing}
                  activeSection={activeSection}
                  focusedDayIndex={focusedDayIndex}
                  selectedSlot={selectedSlot}
                  recentChangeMap={recentChangeMap}
                  onFocusedDayChange={(day) => {
                    setFocusedDayIndex(day);
                    setSelectedSlot(null);
                  }}
                  onEventSelect={setSelectedEventId}
                  onEmptySlotSelect={handleOpenSlot}
                  onEventMove={handleEventMove}
                  onEventResize={handleAdjustDuration}
                  onMarkDone={handleMarkDone}
                  onReschedule={handleReschedule}
                  onCannotContinue={runGiveUpAndShowFeedback}
                  onMoreAction={(eventId) => {
                    setSelectedEventId(eventId);
                    setIsPanelOpen(true);
                    showToast("已打开事件详情");
                  }}
                />
              )}
            </div>
          </>
        );
      case "Tasks":
        return (
          <TasksView
            tasks={tasks}
            defaultPriority={settings.defaultTaskPriority}
            onCreateTask={handleCreateTaskObject}
            onScheduleTask={handleScheduleTaskFromPool}
            onMarkDone={handleMarkTaskDone}
            onDeleteTask={handleDeleteTaskItem}
            onToggleUpNext={handleToggleTaskUpNext}
            onChangePriority={handleChangeTaskPriority}
            onOpenTask={handleOpenTaskFromPool}
          />
        );
      case "Habits":
        return (
          <HabitsView
            habits={habits}
            onCreateHabit={handleCreateHabit}
            onToggleHabit={handleToggleHabit}
            onScheduleHabits={handleScheduleHabits}
          />
        );
      case "Focus":
        return (
          <FocusView
            focusPlan={focusPlan}
            focusHours={focusHours}
            compressedByMeetings={compressedByMeetings}
            onTargetChange={handleUpdateFocusTarget}
            onProtectFocus={handleProtectFocus}
          />
        );
      case "Meetings":
        return (
          <MeetingsView
            meetings={meetings}
            onCreateMeeting={handleCreateMeeting}
            onRescheduleMeeting={handleRescheduleMeeting}
            onSkipMeeting={handleSkipMeeting}
          />
        );
      case "Links":
        return (
          <LinksView
            links={links}
            onCreateLink={handleCreateLink}
            onPreviewLink={handlePreviewLink}
            onCopyLink={handleCopyLink}
          />
        );
      case "Sync":
        return (
          <SyncView
            connections={connections}
            onToggleConnection={handleToggleConnection}
            onSyncConnection={handleSyncConnection}
            onChangePrivacy={handleChangeConnectionPrivacy}
          />
        );
      case "Analytics":
        return (
          <AnalyticsView events={events} habits={habits} aiLogs={aiLogs} onExplainMetric={handleExplainMetric} />
        );
      case "Settings":
        return <SettingsView settings={settings} onUpdateSettings={handleUpdateSettings} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[var(--color-bg-page)] text-[var(--color-text-primary)]">
      <div className="flex h-full">
        <Sidebar
          activeSection={activeSection}
          badges={sidebarBadges}
          syncHealthy={syncHealthy}
          onResetPlanner={handleResetPlanner}
          onSelectSection={handleSelectSection}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
        />

        <main className="flex min-w-0 flex-1 flex-col bg-[var(--color-bg-page)]">{renderMainContent()}</main>

        <RightTaskPanel
          isOpen={isPanelOpen}
          selectedSlot={selectedSlot}
          activeSection={activeSection}
          focusedDayLabel={focusedDayLabel}
          focusedDayIndex={focusedDayIndex}
          weekStart={weekStart}
          todayTasks={focusedDayTasks}
          allTasks={tasks}
          allEvents={events}
          selectedEvent={selectedEvent}
          linkedTask={linkedTask}
          suggestions={visibleSuggestions}
          aiLogs={aiLogs}
          latestSummary={latestSummary}
          latestWarnings={latestWarnings}
          giveUpFeedback={giveUpFeedback}
          focusHours={focusHours}
          meetingHours={meetingHours}
          requestedView={requestedPanelView}
          requestedViewToken={requestedPanelViewToken}
          onOpen={() => setIsPanelOpen(true)}
          onClose={() => setIsPanelOpen(false)}
          onSelectTask={setSelectedEventId}
          onClearSelectedSlot={() => setSelectedSlot(null)}
          onSelectSuggestedSlot={(startHour) => handleOpenSlot(focusedDayIndex, startHour)}
          onAddTask={handleAddTask}
          onScheduleTask={handleReschedule}
          onMarkDone={handleMarkDone}
          onApplySuggestion={handleApplySuggestion}
          onDismissSuggestion={handleDismissSuggestion}
          onAutoSchedule={handleAutoSchedule}
          onPreviewScenario={handlePreviewScenario}
          onApplyScenario={handleApplyScenario}
        />
      </div>

      <EventDetailModal
        event={selectedEvent}
        linkedTask={linkedTask}
        onClose={() => setSelectedEventId(null)}
        onAdjustDuration={handleAdjustDuration}
        onMarkDone={(eventId) => {
          handleMarkDone(eventId);
          setSelectedEventId(null);
          setIsPanelOpen(true);
          requestPanelView("ai");
        }}
        onReschedule={(eventId) => {
          handleReschedule(eventId);
          setSelectedEventId(null);
          setIsPanelOpen(true);
          requestPanelView("ai");
        }}
        onCannotContinue={runGiveUpAndShowFeedback}
        onEarlyComplete={(eventId, completedAtHour) => {
          handleEarlyComplete(eventId, completedAtHour);
          setSelectedEventId(null);
          setIsPanelOpen(true);
          requestPanelView("ai");
        }}
        onMarkOvertime={(eventId, overtimeHours) => {
          handleMarkOvertime(eventId, overtimeHours);
          setSelectedEventId(null);
          setIsPanelOpen(true);
          requestPanelView("ai");
        }}
        onDelete={(eventId) => {
          handleDelete(eventId);
          setSelectedEventId(null);
          setIsPanelOpen(true);
          requestPanelView("ai");
        }}
      />

      <InfoModal
        open={helpOpen}
        title="计划帮助"
        subtitle="这轮原型重点在动态重排"
        lines={[
          "拖动任务、拉长或压缩时长、标记超时、提前完成、删除任务，都会触发同一个本地重排器。",
          "点击“干不下去了”后，系统会自动插入休息、轻量任务和续做块，并在右侧 AI 面板解释原因。",
          "左侧每个入口都是真实对象管理区，操作会影响日历、AI 日志或后续排程策略。"
        ]}
        onClose={() => setHelpOpen(false)}
      />

      <InfoModal
        open={profileOpen}
        title="工作区信息"
        subtitle="Smart Planner / AI Calendar Planner"
        lines={[
          `当前模块：${sectionLabels[activeSection]}`,
          `当前聚焦：${focusedDayLabel}`,
          `本周已排入 ${events.filter((event) => event.status !== "unscheduled").length} 个时间块，未安排任务 ${tasks.filter((task) => task.status === "unscheduled").length} 个。`
        ]}
        onClose={() => setProfileOpen(false)}
      />

      <Toast message={toast?.message ?? null} />
    </div>
  );
}
