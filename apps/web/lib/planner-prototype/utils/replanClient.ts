import type {
  AiLog,
  CalendarEvent,
  PlannerSettings,
  ReplanAction,
  ReplanChange,
  ReplanRequest,
  ReplanResult,
  TaskItem
} from "../types/calendar";
import {
  PRIORITY_WEIGHT,
  WORK_DAY_END,
  WORK_DAY_START,
  findNextAvailableSlot,
  formatTime,
  generateId,
  getEventEndHour,
  hasConflict,
  snapToQuarterHour,
  sortEventsForDisplay
} from "./calendarUtils";

function cloneEvents(events: CalendarEvent[]) {
  return events.map((event) => ({ ...event }));
}

function cloneTasks(tasks: TaskItem[]) {
  return tasks.map((task) => ({ ...task }));
}

function dayLabel(day: number) {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][day] ?? "当天";
}

function shouldBlock(event: CalendarEvent) {
  return event.status !== "unscheduled";
}

function buildTaskDueDate(day: number, hour: number) {
  return `2026-05-${String(10 + day).padStart(2, "0")} ${formatTime(hour)}`;
}

function eventTimeString(event: Pick<CalendarEvent, "day" | "startHour" | "duration">) {
  return `${dayLabel(event.day)} ${formatTime(event.startHour)}-${formatTime(getEventEndHour(event))}`;
}

function compactFromAction(action: ReplanAction) {
  switch (action.kind) {
    case "complete":
    case "early_complete":
    case "delete":
      return { day: action.focusDay ?? action.day ?? 0, startHour: action.startHour ?? WORK_DAY_START, enabled: true };
    case "resize":
      return {
        day: action.focusDay ?? action.day ?? 0,
        startHour: action.startHour ?? WORK_DAY_START,
        enabled: typeof action.duration === "number" && action.duration < 1.5
      };
    default:
      return { day: action.focusDay ?? action.day ?? 0, startHour: WORK_DAY_START, enabled: false };
  }
}

function chooseLowEnergyTask(tasks: TaskItem[]) {
  return (
    tasks.find((task) => task.status !== "completed" && task.energyLevel === "low" && task.remainingMinutes > 0) ??
    tasks.find((task) => task.status !== "completed" && task.energyLevel === "medium" && task.remainingMinutes > 0) ??
    tasks.find((task) => task.status !== "completed" && task.remainingMinutes > 0) ??
    null
  );
}

function createEventFromTask(task: TaskItem, day: number, startHour: number, duration: number, urgent = false): CalendarEvent {
  return {
    id: generateId("event"),
    title: task.title,
    day,
    startHour,
    duration,
    type: task.energyLevel === "high" ? "focus" : "task",
    priority: urgent ? "P1" : task.priority,
    status: "scheduled",
    movable: true,
    fixed: false,
    flexible: true,
    energyLevel: task.energyLevel,
    aiGenerated: urgent,
    taskId: task.id
  };
}

function insertBuffer(
  events: CalendarEvent[],
  day: number,
  startHour: number,
  settings: PlannerSettings,
  title = "缓冲时间"
) {
  events.push({
    id: generateId("buffer"),
    title,
    day,
    startHour,
    duration: settings.bufferMinutes / 60,
    type: "buffer",
    priority: "P4",
    status: "scheduled",
    movable: false,
    fixed: true,
    flexible: false,
    energyLevel: "low",
    aiGenerated: true
  });
}

function splitLongEvent(event: CalendarEvent, settings: PlannerSettings) {
  const maxHours = settings.maxFocusBlockMinutes / 60;
  if (!settings.allowSplitTasks || event.duration <= maxHours || !event.taskId || !event.flexible) {
    return [event];
  }

  const firstDuration = maxHours;
  const remainderDuration = Number((event.duration - firstDuration - settings.bufferMinutes / 60).toFixed(2));
  if (remainderDuration < 0.5) {
    return [event];
  }

  return [
    { ...event, title: `${event.title} Part 1`, duration: firstDuration },
    {
      ...event,
      id: generateId("split"),
      title: `${event.title} Part 2`,
      startHour: snapToQuarterHour(event.startHour + firstDuration + settings.bufferMinutes / 60),
      duration: remainderDuration,
      aiGenerated: true,
      splitFromId: event.id
    }
  ];
}

function placeEvent(
  event: CalendarEvent,
  scheduled: CalendarEvent[],
  settings: PlannerSettings,
  warnings: string[],
  compactStart?: number
) {
  let targetDay = event.day;
  let targetStart = compactStart ? Math.min(event.startHour, compactStart) : event.startHour;

  while (targetDay < 7) {
    let candidateStart = snapToQuarterHour(Math.max(targetStart, settings.workStart));
    let movedForConflict = false;

    while (candidateStart + event.duration <= settings.workEnd) {
      const candidate = { ...event, day: targetDay, startHour: candidateStart };
      const conflicting = scheduled
        .filter((item) => shouldBlock(item) && item.day === targetDay && item.id !== event.id)
        .filter((item) => hasConflict(candidate, item))
        .sort((a, b) => a.startHour - b.startHour);

      if (conflicting.length === 0) {
        event.day = targetDay;
        event.startHour = candidateStart;
        scheduled.push(event);
        return;
      }

      candidateStart = snapToQuarterHour(getEventEndHour(conflicting[0]));
      movedForConflict = true;
    }

    if (movedForConflict || targetDay !== event.day) {
      warnings.push(`“${event.title}”在 ${dayLabel(targetDay)} 放不下，已继续向后寻找空档。`);
    }

    targetDay += 1;
    targetStart = settings.workStart;
  }

  event.status = "unscheduled";
  warnings.push(`当天剩余时间不足，“${event.title}”已标记为未安排。`);
}

function resolveSchedule(events: CalendarEvent[], settings: PlannerSettings, action: ReplanAction, warnings: string[]) {
  const compact = compactFromAction(action);
  const normalized: CalendarEvent[] = [];

  const fixedEvents = sortEventsForDisplay(events).filter((event) => event.fixed && shouldBlock(event));
  fixedEvents.forEach((event) => normalized.push(event));

  const modePriorityBoost =
    settings.replanMode === "aggressive" ? 100 : settings.replanMode === "balanced" ? 30 : 8;

  const movableEvents = sortEventsForDisplay(events)
    .filter((event) => !event.fixed)
    .flatMap((event) => splitLongEvent(event, settings))
    .sort((a, b) => {
      const priorityDelta = (PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]) * modePriorityBoost;
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      if (settings.replanMode === "conservative") {
        return a.day - b.day || a.startHour - b.startHour;
      }
      return a.day - b.day || a.startHour - b.startHour || b.duration - a.duration;
    });

  for (const event of movableEvents) {
    if (event.status === "completed" || event.status === "unscheduled") {
      normalized.push(event);
      continue;
    }

    const compactStart =
      compact.enabled && event.day === compact.day && event.startHour >= compact.startHour ? compact.startHour : undefined;
    placeEvent(event, normalized, settings, warnings, compactStart);
  }

  return sortEventsForDisplay(normalized);
}

function diffEvents(previous: CalendarEvent[], next: CalendarEvent[]): ReplanChange[] {
  const previousMap = new Map(previous.map((event) => [event.id, event]));
  const nextMap = new Map(next.map((event) => [event.id, event]));
  const changes: ReplanChange[] = [];

  for (const event of next) {
    const prior = previousMap.get(event.id);
    if (!prior) {
      changes.push({
        eventId: event.id,
        title: event.title,
        type: event.aiGenerated && (event.type === "buffer" || event.type === "break") ? "buffered" : "inserted",
        to: eventTimeString(event)
      });
      continue;
    }

    if (prior.status !== "completed" && event.status === "completed") {
      changes.push({ eventId: event.id, title: event.title, type: "completed", from: eventTimeString(prior) });
      continue;
    }

    if (prior.status !== "unscheduled" && event.status === "unscheduled") {
      changes.push({ eventId: event.id, title: event.title, type: "unscheduled", from: eventTimeString(prior) });
      continue;
    }

    const moved = prior.day !== event.day || prior.startHour !== event.startHour;
    const resized = prior.duration !== event.duration;

    if (moved && resized) {
      changes.push({ eventId: event.id, title: event.title, type: "replanned", from: eventTimeString(prior), to: eventTimeString(event) });
    } else if (moved) {
      changes.push({ eventId: event.id, title: event.title, type: "moved", from: eventTimeString(prior), to: eventTimeString(event) });
    } else if (resized) {
      changes.push({ eventId: event.id, title: event.title, type: "resized", from: `${prior.duration}h`, to: `${event.duration}h` });
    }
  }

  for (const event of previous) {
    if (!nextMap.has(event.id)) {
      changes.push({ eventId: event.id, title: event.title, type: "deleted", from: eventTimeString(event) });
    }
  }

  return changes;
}

function bumpTaskStateFromEvents(tasks: TaskItem[], events: CalendarEvent[]) {
  const eventsByTask = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    if (!event.taskId) {
      continue;
    }
    const list = eventsByTask.get(event.taskId) ?? [];
    list.push(event);
    eventsByTask.set(event.taskId, list);
  }

  for (const task of tasks) {
    const taskEvents = (eventsByTask.get(task.id) ?? []).filter((event) => event.status !== "unscheduled");
    const activeMinutes = taskEvents
      .filter((event) => event.status !== "completed")
      .reduce((sum, event) => sum + event.duration * 60, 0);

    if (task.status === "completed") {
      task.remainingMinutes = 0;
      continue;
    }

    if (taskEvents.length === 0) {
      task.status = "unscheduled";
      task.remainingMinutes = Math.max(task.remainingMinutes, 15);
      continue;
    }

    if (activeMinutes <= 0) {
      task.remainingMinutes = 0;
      task.status = "completed";
      continue;
    }

    task.remainingMinutes = Math.max(15, Math.round(activeMinutes));
    task.status = "scheduled";
  }
}

function buildLog(action: ReplanAction, changes: ReplanChange[], warnings: string[]): AiLog {
  const changeLines = changes.slice(0, 6).map((change) => {
    switch (change.type) {
      case "moved":
        return `${change.title} 已移动到 ${change.to ?? "新位置"}`;
      case "resized":
        return `${change.title} 已从 ${change.from ?? "原时长"} 调整到 ${change.to ?? "新时长"}`;
      case "inserted":
        return `新增时间块：${change.title}`;
      case "buffered":
        return `已插入缓冲块：${change.title}`;
      case "completed":
        return `${change.title} 已完成`;
      case "deleted":
        return `${change.title} 已删除`;
      case "unscheduled":
        return `${change.title} 已转为未安排`;
      case "split":
      case "replanned":
      default:
        return `${change.title} 已被 AI 重新安排`;
    }
  });

  const actionLabel = {
    drag: "拖动任务",
    resize: "调整时长",
    complete: "标记完成",
    early_complete: "提前完成",
    overtime: "标记超时",
    give_up: "干不下去了",
    delete: "删除任务",
    add_task: "新增任务",
    add_urgent_task: "新增紧急任务",
    auto_schedule: "自动排程",
    insert_buffer: "插入缓冲",
    rebalance: "重新平衡"
  }[action.kind];

  const summaryBase = {
    drag: "你手动拖动了时间块，我重新检查了冲突，并把后续任务顺延到可行位置。",
    resize: "你调整了任务时长，我按新的长度重新平衡了当天和后续安排。",
    complete: "任务完成后，后续事件已尽量前移，避免浪费空档。",
    early_complete: "任务提前完成后，我释放了剩余时间，并尝试把后续任务提前。",
    overtime: "任务超时后，我为未完成部分续上了时间，并补了一段缓冲。",
    give_up: "你刚才点击了“干不下去了”，我先插入恢复时间，再切换到更轻量的任务。",
    delete: "删除任务后，我回收了空出来的时间，并重新整理了后续安排。",
    add_task: "新任务已放进日历，并根据现有承诺做了本地重排。",
    add_urgent_task: "紧急任务已优先插入最近可用时间，低优先级事项会自动后移。",
    auto_schedule: "我重新检查了整周节奏，把高优先级工作尽量前置，并保留固定承诺。",
    insert_buffer: "缓冲时间已插入，后续节奏已一起调整。",
    rebalance: "我重新平衡了这一天的任务密度。"
  }[action.kind];

  return {
    id: generateId("log"),
    time: new Date().toTimeString().slice(0, 5),
    action: actionLabel,
    summary: summaryBase,
    changes: changeLines,
    warnings
  };
}

function applyAction(events: CalendarEvent[], tasks: TaskItem[], action: ReplanAction, settings: PlannerSettings, warnings: string[]) {
  const target = action.eventId ? events.find((event) => event.id === action.eventId) ?? null : null;

  switch (action.kind) {
    case "drag": {
      if (!target || typeof action.day !== "number" || typeof action.startHour !== "number") {
        return;
      }
      if (target.fixed || !target.movable) {
        warnings.push("固定事件不能被拖动。");
        return;
      }
      if (action.allowOverlap) {
        warnings.push("检测到拖动后存在时间重合，系统已把重合作为冲突输入，并按优先级、重要性和固定约束重新优化。");
      }
      target.day = action.day;
      target.startHour = snapToQuarterHour(action.startHour);
      break;
    }

    case "resize": {
      if (!target || typeof action.duration !== "number") {
        return;
      }
      if (target.fixed || !target.movable) {
        warnings.push("固定事件不能修改时长。");
        return;
      }
      const previous = target.duration;
      target.duration = Math.max(0.25, snapToQuarterHour(action.duration));
      if (target.duration < previous * 0.6) {
        warnings.push(`“${target.title}”已被压缩超过 40%，AI 提醒：可能影响完成质量。`);
      }
      break;
    }

    case "complete": {
      if (!target) {
        return;
      }
      target.status = "completed";
      if (target.taskId) {
        const task = tasks.find((item) => item.id === target.taskId);
        if (task) {
          task.remainingMinutes = 0;
          task.status = "completed";
        }
      }
      action.startHour = getEventEndHour(target);
      break;
    }

    case "early_complete": {
      if (!target) {
        return;
      }
      const completedAt = Math.max(target.startHour + 0.25, action.completedAtHour ?? target.startHour + target.duration * 0.6);
      target.duration = Number((completedAt - target.startHour).toFixed(2));
      target.status = "completed";
      insertBuffer(events, target.day, completedAt, settings, "提前完成缓冲");
      action.startHour = completedAt;
      break;
    }

    case "overtime": {
      if (!target) {
        return;
      }
      const overtimeHours = Math.max(0.25, snapToQuarterHour(action.duration ?? 0.75));
      target.status = "completed";
      events.push({
        ...target,
        id: generateId("resume"),
        title: `${target.title}（继续）`,
        startHour: getEventEndHour(target),
        duration: overtimeHours,
        status: "overtime",
        aiGenerated: true,
        movable: true,
        fixed: false,
        flexible: true
      });
      insertBuffer(events, target.day, getEventEndHour(target) + overtimeHours, settings, "超时后缓冲");
      action.startHour = getEventEndHour(target);
      break;
    }

    case "give_up": {
      if (!target) {
        return;
      }

      const originalMid = target.startHour + target.duration / 2;
      const workedHours = Math.max(0.5, Math.min(target.duration * 0.5, 0.75));
      const remaining = Number(Math.max(0.5, target.duration - workedHours - 0.75).toFixed(2));
      const breakDuration = 0.25;
      const lighterDuration = 0.5;
      const resumeDuration = 0.25;

      target.duration = workedHours;
      target.status = "completed";

      const prefTitle = "休息 / 缓冲";

      const breakStart = snapToQuarterHour(target.startHour + workedHours);
      events.push({
        id: generateId("break"),
        title: prefTitle,
        day: target.day,
        startHour: breakStart,
        duration: breakDuration,
        type: "break",
        priority: "P4",
        status: "scheduled",
        movable: false,
        fixed: true,
        flexible: false,
        energyLevel: "low",
        aiGenerated: true
      });

      const lighterTask = chooseLowEnergyTask(tasks);
      const lighterStart = snapToQuarterHour(breakStart + breakDuration);
      if (lighterTask) {
        events.push({
          ...createEventFromTask(lighterTask, target.day, lighterStart, lighterDuration, false),
          aiGenerated: true,
          fixed: true,
          movable: false
        });
      } else {
        events.push({
          id: generateId("light"),
          title: "轻量任务：整理参考资料",
          day: target.day,
          startHour: lighterStart,
          duration: lighterDuration,
          type: "habit",
          priority: "P4",
          status: "scheduled",
          movable: false,
          fixed: true,
          flexible: false,
          energyLevel: "low",
          aiGenerated: true
        });
      }

      const resumeStart = snapToQuarterHour(lighterStart + lighterDuration);
      events.push({
        ...target,
        id: generateId("resume"),
        title: `${target.title}（继续）`,
        startHour: resumeStart,
        duration: remaining,
        status: "interrupted",
        aiGenerated: true,
        movable: false,
        fixed: true,
        flexible: false
      });
      action.startHour = snapToQuarterHour(target.startHour + workedHours);
      break;
    }

    case "delete": {
      if (!target) {
        return;
      }
      const index = events.findIndex((event) => event.id === target.id);
      if (index >= 0) {
        events.splice(index, 1);
      }
      action.startHour = target.startHour;
      action.day = target.day;
      if (target.taskId) {
        const task = tasks.find((item) => item.id === target.taskId);
        if (task && task.status !== "completed") {
          task.status = "unscheduled";
          task.remainingMinutes = Math.max(task.remainingMinutes, Math.round(target.duration * 60));
        }
      }
      break;
    }

    case "add_task":
    case "add_urgent_task": {
      const title = action.title?.trim();
      if (!title || !action.priority || !action.energyLevel) {
        return;
      }

      const deadlineDay = action.dueDay ?? action.focusDay ?? 1;
      const deadlineHour = action.dueHour ?? 18;
      const duration = action.duration ?? 1;
      const existingTask = action.taskId ? tasks.find((item) => item.id === action.taskId) ?? null : null;

      const task =
        existingTask ??
        ({
          id: action.taskId ?? generateId("task"),
          title,
          priority: action.priority,
          dueDate: buildTaskDueDate(deadlineDay, deadlineHour),
          dueDay: deadlineDay,
          dueHour: deadlineHour,
          estimatedMinutes: Math.round(duration * 60),
          remainingMinutes: Math.round(duration * 60),
          status: "scheduled",
          upNext: action.kind === "add_urgent_task",
          energyLevel: action.energyLevel,
          splittable: action.energyLevel !== "low"
        } satisfies TaskItem);

      task.title = title;
      task.priority = action.priority;
      task.dueDate = buildTaskDueDate(deadlineDay, deadlineHour);
      task.dueDay = deadlineDay;
      task.dueHour = deadlineHour;
      task.estimatedMinutes = Math.round(duration * 60);
      task.remainingMinutes = Math.max(task.remainingMinutes, Math.round(duration * 60));
      task.energyLevel = action.energyLevel;
      task.upNext = task.upNext || action.kind === "add_urgent_task";
      task.splittable = action.energyLevel !== "low";

      if (!existingTask) {
        tasks.push(task);
      }

      events.forEach((event) => {
        if (event.taskId === task.id && event.status === "unscheduled") {
          event.status = "completed";
        }
      });

      const preferredHours = action.kind === "add_urgent_task" ? [9, 10, 11, 13.5, 14.5] : [11, 14, 15.5, 16.5];
      const startDay = action.focusDay ?? 1;
      let chosenDay = startDay;
      let startHour: number | null;
      const isFixed = action.scheduleMode === "fixed";

      if (action.pinToSlot && typeof action.startHour === "number") {
        startHour = snapToQuarterHour(action.startHour);
      } else {
        startHour =
          typeof action.startHour === "number"
            ? findNextAvailableSlot(events, startDay, duration, { preferredHours: [action.startHour] }) ??
              findNextAvailableSlot(events, startDay, duration, { preferredHours })
            : findNextAvailableSlot(events, startDay, duration, { preferredHours });
      }

      if (startHour === null) {
        const lastDay = Math.max(startDay, deadlineDay);
        for (let day = startDay; day <= lastDay; day += 1) {
          const dayPreferredHours =
            day === deadlineDay ? preferredHours.filter((hour) => hour + duration <= deadlineHour) : preferredHours;
          startHour = findNextAvailableSlot(events, day, duration, {
            preferredHours: dayPreferredHours.length > 0 ? dayPreferredHours : preferredHours
          });
          if (startHour !== null) {
            chosenDay = day;
            break;
          }
        }
      }

      if (startHour === null) {
        warnings.push(`“${title}”在截止前没有找到合适空档，已加入未安排列表。`);
        events.push({
          ...createEventFromTask(task, startDay, WORK_DAY_END - duration, duration, action.kind === "add_urgent_task"),
          status: "unscheduled"
        });
        task.status = "unscheduled";
        return;
      }

      const newEvent = createEventFromTask(task, chosenDay, startHour, duration, action.kind === "add_urgent_task");
      if (isFixed) {
        newEvent.fixed = true;
        newEvent.movable = false;
        newEvent.flexible = false;
      }
      events.push(newEvent);
      task.status = "scheduled";
      action.day = chosenDay;
      action.startHour = startHour;
      break;
    }

    case "insert_buffer": {
      if (typeof action.day !== "number" || typeof action.startHour !== "number") {
        return;
      }
      insertBuffer(events, action.day, action.startHour, settings);
      break;
    }

    case "rebalance":
    case "auto_schedule":
    default:
      break;
  }
}

export async function requestScheduleReplan(request: ReplanRequest): Promise<ReplanResult> {
  const events = cloneEvents(request.currentEvents);
  const tasks = cloneTasks(request.currentTasks);
  const warnings: string[] = [];

  applyAction(events, tasks, request.action, request.settings, warnings);
  const resolvedEvents = resolveSchedule(events, request.settings, request.action, warnings);
  bumpTaskStateFromEvents(tasks, resolvedEvents);

  const changes = diffEvents(request.currentEvents, resolvedEvents);
  const latestLog = buildLog(request.action, changes, [...new Set(warnings)]);
  const movedCount = changes.filter((change) =>
    ["moved", "resized", "replanned", "buffered", "inserted"].includes(change.type)
  ).length;

  return {
    events: resolvedEvents,
    tasks,
    changes,
    summary: latestLog.summary,
    warnings: [...new Set(warnings)],
    latestLog,
    movedCount,
    focusDay: request.action.focusDay ?? request.action.day ?? 1
  };
}
