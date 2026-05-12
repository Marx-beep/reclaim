import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { isSameDay } from "date-fns";
import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { CalendarEvent, NavigationSection, ReplanChangeType } from "../types/calendar";
import {
  HOUR_HEIGHT,
  WORK_DAY_START,
  buildHeaderDays,
  clampStartHour,
  hasConflict,
  snapToQuarterHour
} from "../utils/calendarUtils";
import { CalendarEventBlock } from "./CalendarEventBlock";

interface CalendarGridProps {
  events: CalendarEvent[];
  weekStart: Date;
  isOptimizing: boolean;
  activeSection: NavigationSection;
  focusedDayIndex: number;
  selectedSlot: { day: number; startHour: number } | null;
  recentChangeMap: Record<string, ReplanChangeType>;
  onFocusedDayChange: (day: number) => void;
  onEventSelect: (eventId: string) => void;
  onEmptySlotSelect: (day: number, startHour: number) => void;
  onEventMove: (eventId: string, day: number, startHour: number) => void;
  onEventResize: (eventId: string, nextDuration: number) => void;
  onMarkDone: (eventId: string) => void;
  onReschedule: (eventId: string) => void;
  onCannotContinue: (eventId: string) => void;
  onMoreAction: (eventId: string) => void;
}

interface EventLayout {
  width: number;
  left: number;
}

interface PreviewSlot {
  day: number;
  startHour: number;
  duration: number;
  mode: "move" | "resize";
}

interface ResizeSession {
  eventId: string;
  startY: number;
  baseDuration: number;
  startHour: number;
  day: number;
}

const HOURS = Array.from({ length: 11 }, (_, index) => WORK_DAY_START + index);
const TOTAL_HEIGHT = HOUR_HEIGHT * HOURS.length;

function formatHourLabel(hour: number) {
  const suffix = hour >= 12 ? "pm" : "am";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}${suffix}`;
}

function getCurrentTimeHour() {
  const now = new Date();
  return clampStartHour(now.getHours() + now.getMinutes() / 60, 0);
}

function buildDayLayouts(events: CalendarEvent[]) {
  const layouts = new Map<string, EventLayout>();
  const sorted = [...events].sort((a, b) => a.startHour - b.startHour || b.duration - a.duration);
  const laneEnds: number[] = [];
  const laneMap = new Map<string, number>();

  for (const event of sorted) {
    let lane = laneEnds.findIndex((endHour) => endHour <= event.startHour);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(event.startHour + event.duration);
    } else {
      laneEnds[lane] = event.startHour + event.duration;
    }
    laneMap.set(event.id, lane);
  }

  for (const event of sorted) {
    const overlapCount = Math.min(
      3,
      Math.max(1, sorted.filter((candidate) => candidate.id !== event.id && hasConflict(event, candidate)).length + 1)
    );
    const width = 100 / overlapCount;
    const lane = laneMap.get(event.id) ?? 0;
    const normalizedLane = Math.min(lane, overlapCount - 1);

    layouts.set(event.id, {
      width: overlapCount === 1 ? 100 : width,
      left: overlapCount === 1 ? 0 : normalizedLane * width
    });
  }

  return layouts;
}

function shouldMuteEvent(activeSection: NavigationSection, event: CalendarEvent) {
  if (activeSection === "Planner") {
    return false;
  }

  if (activeSection === "Tasks") {
    return !["task", "focus", "habit"].includes(event.type);
  }
  if (activeSection === "Habits") {
    return event.type !== "habit";
  }
  if (activeSection === "Focus") {
    return event.type !== "focus";
  }
  if (activeSection === "Meetings") {
    return event.type !== "meeting";
  }
  if (activeSection === "Links") {
    return !["task", "meeting"].includes(event.type);
  }
  if (activeSection === "Sync") {
    return !event.fixed;
  }
  if (activeSection === "Analytics") {
    return !["task", "focus", "meeting", "habit"].includes(event.type);
  }
  if (activeSection === "Settings") {
    return event.type !== "buffer";
  }

  return false;
}

function EventCard({
  event,
  layout,
  isOptimizing,
  isMuted,
  changeType,
  onSelect,
  onMarkDone,
  onReschedule,
  onCannotContinue,
  onResizeStart,
  onMoreAction
}: {
  event: CalendarEvent;
  layout: EventLayout;
  isOptimizing: boolean;
  isMuted: boolean;
  changeType?: ReplanChangeType;
  onSelect: () => void;
  onMarkDone: () => void;
  onReschedule: () => void;
  onCannotContinue: () => void;
  onResizeStart: (pointerEvent: ReactPointerEvent<HTMLButtonElement>) => void;
  onMoreAction: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    disabled: event.fixed || !event.movable || event.status === "unscheduled"
  });

  return (
    <div
      ref={setNodeRef}
      className="absolute px-1"
      style={{
        top: (event.startHour - WORK_DAY_START) * HOUR_HEIGHT,
        height: event.duration * HOUR_HEIGHT,
        left: `${layout.left}%`,
        width: `calc(${layout.width}% - 2px)`,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 40 : 10
      }}
    >
      <CalendarEventBlock
        event={event}
        className="h-full"
        isDragging={isDragging}
        isOptimizing={isOptimizing}
        isMuted={isMuted}
        changeType={changeType}
        dragAttributes={attributes}
        dragListeners={listeners}
        onClick={onSelect}
        onMarkDone={onMarkDone}
        onReschedule={onReschedule}
        onCannotContinue={onCannotContinue}
        onResizeStart={onResizeStart}
        onMoreAction={onMoreAction}
      />
    </div>
  );
}

function DayColumn({
  dayIndex,
  events,
  isOptimizing,
  isToday,
  isFocusedDay,
  showCurrentTimeLine,
  selectedSlot,
  previewSlot,
  activeSection,
  recentChangeMap,
  onEventSelect,
  onEmptySlotSelect,
  onEventMarkDone,
  onEventReschedule,
  onEventCannotContinue,
  onEventResizeStart,
  onEventMoreAction
}: {
  dayIndex: number;
  events: CalendarEvent[];
  isOptimizing: boolean;
  isToday: boolean;
  isFocusedDay: boolean;
  showCurrentTimeLine: boolean;
  selectedSlot: { day: number; startHour: number } | null;
  previewSlot: PreviewSlot | null;
  activeSection: NavigationSection;
  recentChangeMap: Record<string, ReplanChangeType>;
  onEventSelect: (eventId: string) => void;
  onEmptySlotSelect: (day: number, startHour: number) => void;
  onEventMarkDone: (eventId: string) => void;
  onEventReschedule: (eventId: string) => void;
  onEventCannotContinue: (eventId: string) => void;
  onEventResizeStart: (event: CalendarEvent, pointerEvent: ReactPointerEvent<HTMLButtonElement>) => void;
  onEventMoreAction: (eventId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}`
  });
  const layouts = useMemo(() => buildDayLayouts(events), [events]);
  const currentTimeHour = getCurrentTimeHour();

  return (
    <div
      ref={setNodeRef}
      onClick={(clickEvent) => {
        const target = clickEvent.target as HTMLElement;
        if (target.closest("[data-event-block='true']")) {
          return;
        }
        const rect = clickEvent.currentTarget.getBoundingClientRect();
        const offsetY = clickEvent.clientY - rect.top;
        const nextHour = clampStartHour(snapToQuarterHour(WORK_DAY_START + offsetY / HOUR_HEIGHT), 1);
        onEmptySlotSelect(dayIndex, nextHour);
      }}
      className={`relative border-l border-[#edf0f5] ${
        dayIndex === 0 || dayIndex === 6 ? "bg-[#fafafa]" : "bg-white"
      } ${isOver ? "bg-indigo-50/45" : ""} ${isFocusedDay ? "ring-1 ring-inset ring-indigo-200" : ""}`}
      style={{ height: TOTAL_HEIGHT }}
    >
      {HOURS.map((hour) => (
        <div key={hour} className="h-[72px] border-t border-[#edf0f5]" />
      ))}

      {showCurrentTimeLine ? (
        <div className="pointer-events-none absolute left-0 right-0 z-20" style={{ top: (currentTimeHour - WORK_DAY_START) * HOUR_HEIGHT }}>
          <div className="relative h-px bg-rose-500">
            <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-white bg-rose-500" />
          </div>
        </div>
      ) : null}

      {selectedSlot && selectedSlot.day === dayIndex ? (
        <div
          className="pointer-events-none absolute left-1 right-1 z-[5] rounded-xl border border-indigo-300 bg-indigo-100/75 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
          style={{
            top: (selectedSlot.startHour - WORK_DAY_START) * HOUR_HEIGHT + 4,
            height: HOUR_HEIGHT - 8
          }}
        >
          <div className="px-3 py-2 text-[11px] font-medium text-indigo-700">已选时间段</div>
        </div>
      ) : null}

      {previewSlot && previewSlot.day === dayIndex ? (
        <div
          className="pointer-events-none absolute left-1 right-1 z-[6] rounded-xl border border-dashed border-indigo-400 bg-indigo-100/55"
          style={{
            top: (previewSlot.startHour - WORK_DAY_START) * HOUR_HEIGHT + 4,
            height: previewSlot.duration * HOUR_HEIGHT - 8
          }}
        >
          <div className="px-3 py-2 text-[11px] font-medium text-indigo-700">
            {previewSlot.mode === "resize" ? "松手后调整时长" : "松手后重新排程"}
          </div>
        </div>
      ) : null}

      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          layout={layouts.get(event.id) ?? { width: 100, left: 0 }}
          isOptimizing={isOptimizing}
          isMuted={shouldMuteEvent(activeSection, event)}
          changeType={recentChangeMap[event.id]}
          onSelect={() => onEventSelect(event.id)}
          onMarkDone={() => onEventMarkDone(event.id)}
          onReschedule={() => onEventReschedule(event.id)}
          onCannotContinue={() => onEventCannotContinue(event.id)}
          onResizeStart={(pointerEvent) => onEventResizeStart(event, pointerEvent)}
          onMoreAction={() => onEventMoreAction(event.id)}
        />
      ))}

      {isToday ? <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500/0 via-indigo-500/35 to-indigo-500/0" /> : null}
    </div>
  );
}

export function CalendarGrid({
  events,
  weekStart,
  isOptimizing,
  activeSection,
  focusedDayIndex,
  selectedSlot,
  recentChangeMap,
  onFocusedDayChange,
  onEventSelect,
  onEmptySlotSelect,
  onEventMove,
  onEventResize,
  onMarkDone,
  onReschedule,
  onCannotContinue,
  onMoreAction
}: CalendarGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewSlot, setPreviewSlot] = useState<PreviewSlot | null>(null);
  const [resizeSession, setResizeSession] = useState<ResizeSession | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const headerDays = useMemo(() => buildHeaderDays(weekStart), [weekStart]);
  const activeEvent = activeId ? events.find((event) => event.id === activeId) ?? null : null;
  const now = new Date();
  const todayColumnIndex = headerDays.findIndex((day) => isSameDay(day.date, now));

  const eventsByDay = useMemo(
    () =>
      Array.from({ length: 7 }, (_, dayIndex) =>
        events.filter((event) => event.day === dayIndex).sort((a, b) => a.startHour - b.startHour || a.duration - b.duration)
      ),
    [events]
  );

  const dayLoads = useMemo(
    () =>
      eventsByDay.map((dayEvents) =>
        dayEvents
          .filter((event) => event.status !== "completed" && event.status !== "unscheduled")
          .reduce((sum, event) => sum + event.duration, 0)
      ),
    [eventsByDay]
  );

  useEffect(() => {
    if (!resizeSession) {
      return;
    }

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const rawDuration = resizeSession.baseDuration + (pointerEvent.clientY - resizeSession.startY) / HOUR_HEIGHT;
      const snappedDuration = Math.max(0.25, snapToQuarterHour(rawDuration));
      const nextDuration = Math.min(snappedDuration, 19 - resizeSession.startHour);
      setPreviewSlot({
        day: resizeSession.day,
        startHour: resizeSession.startHour,
        duration: nextDuration,
        mode: "resize"
      });
    };

    const handlePointerUp = () => {
      if (previewSlot?.mode === "resize") {
        onEventResize(resizeSession.eventId, previewSlot.duration);
      }
      setResizeSession(null);
      setPreviewSlot(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onEventResize, previewSlot, resizeSession]);

  const handleDragStart = (event: DragStartEvent) => {
    if (resizeSession) {
      return;
    }
    setActiveId(String(event.active.id));
  };

  const handleDragMove = ({ active, delta, over }: DragMoveEvent) => {
    if (resizeSession) {
      return;
    }

    const dragged = events.find((event) => event.id === String(active.id));
    if (!dragged) {
      setPreviewSlot(null);
      return;
    }

    const dayMatch = typeof over?.id === "string" ? over.id.match(/^day-(\d)$/) : null;
    const nextDay = dayMatch ? Number(dayMatch[1]) : dragged.day;
    const nextHour = clampStartHour(snapToQuarterHour(dragged.startHour + delta.y / HOUR_HEIGHT), dragged.duration);
    setPreviewSlot({ day: nextDay, startHour: nextHour, duration: dragged.duration, mode: "move" });
  };

  const handleDragEnd = ({ active, delta, over }: DragEndEvent) => {
    if (resizeSession) {
      return;
    }

    const dragged = events.find((event) => event.id === String(active.id));
    if (!dragged) {
      setActiveId(null);
      setPreviewSlot(null);
      return;
    }

    const dayMatch = typeof over?.id === "string" ? over.id.match(/^day-(\d)$/) : null;
    const nextDay = dayMatch ? Number(dayMatch[1]) : dragged.day;
    const nextHour = clampStartHour(snapToQuarterHour(dragged.startHour + delta.y / HOUR_HEIGHT), dragged.duration);
    onEventMove(dragged.id, nextDay, nextHour);
    setActiveId(null);
    setPreviewSlot(null);
  };

  const handleResizeStart = (event: CalendarEvent, pointerEvent: ReactPointerEvent<HTMLButtonElement>) => {
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    setActiveId(null);
    setResizeSession({
      eventId: event.id,
      startY: pointerEvent.clientY,
      baseDuration: event.duration,
      startHour: event.startHour,
      day: event.day
    });
    setPreviewSlot({
      day: event.day,
      startHour: event.startHour,
      duration: event.duration,
      mode: "resize"
    });
  };

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
      <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-[#edf0f5]">
        <div className="h-[60px] border-r border-[#edf0f5] bg-[#fafbfe]" />
        {headerDays.map((day) => {
          const isToday = isSameDay(day.date, now);
          const load = dayLoads[day.index] ?? 0;
          return (
            <button
              key={day.index}
              type="button"
              onClick={() => onFocusedDayChange(day.index)}
              className={`flex h-[60px] flex-col items-start justify-center border-l border-[#edf0f5] px-4 text-left ${
                day.index === 0 || day.index === 6 ? "bg-[#fafafa]" : "bg-white"
              } ${focusedDayIndex === day.index ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}
            >
              <div className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{day.dayLabel}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-[14px] font-medium ${isToday ? "text-[#2563eb]" : "text-slate-900"}`}>{day.dateLabel}</span>
                {isToday ? (
                  <span className="rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-semibold text-[#2563eb]">Today</span>
                ) : null}
              </div>
              <div className="mt-2 flex w-full items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-indigo-500 transition-[width]" style={{ width: `${Math.min((load / 8) * 100, 100)}%` }} />
                </div>
                <span className="text-[10px] font-medium text-slate-400">{load.toFixed(load % 1 === 0 ? 0 : 1)}h</span>
              </div>
            </button>
          );
        })}
      </div>

      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
        <div className="grid min-h-0 grid-cols-[56px_repeat(7,minmax(0,1fr))] overflow-auto">
          <div className="relative border-r border-[#edf0f5] bg-[#fafbfe]" style={{ height: TOTAL_HEIGHT }}>
            {HOURS.map((hour) => (
              <div key={hour} className="relative h-[72px] border-t border-[#edf0f5] px-2 pt-1.5 text-right text-[11px] font-medium text-slate-400">
                {formatHourLabel(hour)}
              </div>
            ))}
            <div className="absolute bottom-0 right-2 translate-y-1/2 text-[11px] font-medium text-slate-400">{formatHourLabel(19)}</div>
          </div>

          {eventsByDay.map((dayEvents, index) => (
            <DayColumn
              key={index}
              dayIndex={index}
              events={dayEvents}
              isOptimizing={isOptimizing}
              isToday={index === todayColumnIndex}
              isFocusedDay={index === focusedDayIndex}
              showCurrentTimeLine={index === todayColumnIndex}
              selectedSlot={selectedSlot}
              previewSlot={previewSlot}
              activeSection={activeSection}
              recentChangeMap={recentChangeMap}
              onEventSelect={onEventSelect}
              onEmptySlotSelect={onEmptySlotSelect}
              onEventMarkDone={onMarkDone}
              onEventReschedule={onReschedule}
              onEventCannotContinue={onCannotContinue}
              onEventResizeStart={handleResizeStart}
              onEventMoreAction={onMoreAction}
            />
          ))}
        </div>

        <DragOverlay>
          {activeEvent ? (
            <div className="w-[240px]">
              <CalendarEventBlock
                event={activeEvent}
                isOverlay
                onClick={() => undefined}
                onMarkDone={() => undefined}
                onReschedule={() => undefined}
                onCannotContinue={() => undefined}
                onResizeStart={() => undefined}
                onMoreAction={() => undefined}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
