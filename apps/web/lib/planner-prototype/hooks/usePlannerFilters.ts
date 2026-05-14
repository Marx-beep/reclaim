import { useState, useCallback, useMemo } from "react";
import type { CalendarEvent, TaskItem } from "../types/calendar";
import type {
  FilterState,
  FilterEventType,
  FilterPriority,
  FilterEnergy,
  FilterDueDate,
  FilterScheduleStatus,
  DEFAULT_FILTER_STATE
} from "../types/filters";
import {
  DEFAULT_FILTER_STATE as DEFAULT_FILTER,
  mapEventTypeToFilterType
} from "../types/filters";

export function usePlannerFilters() {
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const toggleFilter = useCallback((
    category: keyof FilterState,
    value: string
  ) => {
    setFilterState((prev) => {
      const currentValues = prev[category] as string[];
      const exists = currentValues.includes(value);

      return {
        ...prev,
        [category]: exists
          ? currentValues.filter((v) => v !== value)
          : [...currentValues, value]
      };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilterState(DEFAULT_FILTER);
  }, []);

  const filteredEvents = useMemo(
    () => (events: CalendarEvent[]) => filterEvents(events, filterState),
    [filterState]
  );

  const filteredTasks = useMemo(
    () => (tasks: TaskItem[]) => filterTasks(tasks, filterState),
    [filterState]
  );

  return {
    filterState,
    isFilterOpen,
    setIsFilterOpen,
    toggleFilter,
    clearFilters,
    filteredEvents,
    filteredTasks
  };
}

function filterEvents(events: CalendarEvent[], filters: FilterState): CalendarEvent[] {
  if (!isFilterActive(filters)) {
    return events;
  }

  return events.filter((event) => {
    if (!matchEventFilters(event, filters)) {
      return false;
    }
    return true;
  });
}

function filterTasks(tasks: TaskItem[], filters: FilterState): TaskItem[] {
  if (!isFilterActive(filters)) {
    return tasks;
  }

  return tasks.filter((task) => {
    if (!matchTaskFilters(task, filters)) {
      return false;
    }
    return true;
  });
}

function isFilterActive(filters: FilterState): boolean {
  return (
    filters.eventTypes.length > 0 ||
    filters.priorities.length > 0 ||
    filters.energies.length > 0 ||
    filters.dueDates.length > 0 ||
    filters.scheduleStatuses.length > 0
  );
}

function matchEventFilters(event: CalendarEvent, filters: FilterState): boolean {
  if (filters.eventTypes.length > 0) {
    const eventType = mapEventTypeToFilterType(event.type);

    let matched = false;

    if (filters.eventTypes.includes("focus") && eventType === "focus") {
      matched = true;
    }
    if (filters.eventTypes.includes("task") && eventType === "task") {
      matched = true;
    }
    if (filters.eventTypes.includes("meeting") && eventType === "meeting") {
      matched = true;
    }
    if (filters.eventTypes.includes("other") && !["focus", "task", "meeting"].includes(eventType)) {
      matched = true;
    }
    if (filters.eventTypes.includes("locked") && event.fixed) {
      matched = true;
    }
    if (filters.eventTypes.includes("free") && (event.type === "break" || event.type === "buffer")) {
      matched = true;
    }

    if (!matched) {
      return false;
    }
  }

  if (filters.priorities.length > 0) {
    const priority = event.priority || "P3";

    if (!filters.priorities.includes(priority)) {
      return false;
    }
  }

  if (filters.energies.length > 0) {
    const energy = event.energyLevel || "medium";

    if (!filters.energies.includes(energy)) {
      return false;
    }
  }

  if (filters.scheduleStatuses.length > 0) {
    let statusMatched = false;

    if (filters.scheduleStatuses.includes("scheduled") && event.status === "scheduled") {
      statusMatched = true;
    }
    if (filters.scheduleStatuses.includes("unscheduled") && event.status === "unscheduled") {
      statusMatched = true;
    }
    if (filters.scheduleStatuses.includes("locked") && event.fixed) {
      statusMatched = true;
    }
    if (filters.scheduleStatuses.includes("flexible") && event.flexible && !event.fixed) {
      statusMatched = true;
    }

    if (!statusMatched) {
      return false;
    }
  }

  return true;
}

function matchTaskFilters(task: TaskItem, filters: FilterState): boolean {
  if (filters.priorities.length > 0) {
    const priority = task.priority || "P3";

    if (!filters.priorities.includes(priority)) {
      return false;
    }
  }

  if (filters.energies.length > 0) {
    const energy = task.energyLevel || "medium";

    if (!filters.energies.includes(energy)) {
      return false;
    }
  }

  if (filters.dueDates.length > 0) {
    const dueDateMatched = checkDueDateFilter(task.dueDate, filters.dueDates);

    if (!dueDateMatched) {
      return false;
    }
  }

  if (filters.scheduleStatuses.length > 0) {
    let statusMatched = false;

    if (filters.scheduleStatuses.includes("scheduled") && task.status === "scheduled") {
      statusMatched = true;
    }
    if (filters.scheduleStatuses.includes("unscheduled") && task.status === "unscheduled") {
      statusMatched = true;
    }

    if (!statusMatched) {
      return false;
    }
  }

  return true;
}

function checkDueDateFilter(dueDate: string, dueDateFilters: FilterDueDate[]): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const taskDueDate = dueDate ? new Date(dueDate) : null;

  if (taskDueDate) {
    taskDueDate.setHours(0, 0, 0, 0);
  }

  for (const filter of dueDateFilters) {
    switch (filter) {
      case "today":
        if (taskDueDate && isSameDay(taskDueDate, today)) {
          return true;
        }
        break;
      case "thisWeek":
        if (taskDueDate && isThisWeek(taskDueDate, today)) {
          return true;
        }
        break;
      case "overdue":
        if (taskDueDate && taskDueDate < today) {
          return true;
        }
        break;
      case "none":
        if (!taskDueDate || dueDate === "") {
          return true;
        }
        break;
    }
  }

  return false;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isThisWeek(date: Date, today: Date): boolean {
  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(today.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return date >= startOfWeek && date <= endOfWeek;
}
