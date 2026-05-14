import { addDays, format, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarEventBlock } from "./CalendarEventBlock";
import { TimeAllocationBar } from "./TimeAllocationBar";
import { useEffect, useRef, useState } from "react";
import type { CalendarEvent, ReplanChangeType } from "../types/calendar";

const HOUR_HEIGHT = 88;
const SLOT_COUNT = 24;
const HOURS = Array.from({ length: SLOT_COUNT }, (_, i) => i);
const TIME_AXIS_WIDTH = 56;

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function snapToGridSlot(hour: number): number {
  return Math.floor(hour * 4) / 4;
}

function ceilToGridSlot(hour: number): number {
  return Math.ceil(hour * 4) / 4;
}

interface CalendarGridProps {
  events: CalendarEvent[];
  weekStart: Date;
  isOptimizing: boolean;
  activeSection: string;
  focusedDayIndex: number;
  selectedSlot: { day: number; startHour: number } | null;
  recentChangeMap: Record<string, ReplanChangeType>;
  onFocusedDayChange: (day: number) => void;
  onEventSelect: (eventId: string) => void;
  onEmptySlotSelect: (day: number, startHour: number) => void;
  onOpenQuickAdd: (day: number, startHour: number) => void;
  onEventMove: (eventId: string, newDay: number, newStartHour: number) => void;
  onEventResize: (eventId: string, newDuration: number) => void;
  onMarkDone: (eventId: string) => void;
  onReschedule: (eventId: string) => void;
  onCannotContinue: (eventId: string) => void;
  onMoreAction: (eventId: string) => void;
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
  onOpenQuickAdd,
  onEventMove,
  onEventResize,
  onMarkDone,
  onReschedule,
  onCannotContinue,
  onMoreAction
}: CalendarGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ eventId: string; type: "move" | "resize"; startDay: number; startHour: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ day: number; hour: number; duration?: number } | null>(null);

  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const dayEventMap: Record<number, CalendarEvent[]> = {};
  for (const event of events) {
    if (event.status === "completed" || event.status === "unscheduled") continue;
    if (!dayEventMap[event.day]) dayEventMap[event.day] = [];
    dayEventMap[event.day].push(event);

    if (process.env.NODE_ENV === 'development') {
      if (event.day < 0 || event.day > 6) {
        console.warn(`[CalendarGrid] 事件 "${event.title}" (${event.id}) 的 day 值 ${event.day} 超出范围 [0-6]`);
      }
      if (event.startHour < 0 || event.startHour > 24) {
        console.warn(`[CalendarGrid] 事件 "${event.title}" (${event.id}) 的 startHour 值 ${event.startHour} 超出范围 [0-24]`);
      }
      if (event.duration <= 0) {
        console.warn(`[CalendarGrid] 事件 "${event.title}" (${event.id}) 的 duration 值 ${event.duration} 无效（应为正数）`);
      }
    }
  }

  const totalMinutes = events
    .filter((e) => e.status !== "unscheduled")
    .reduce((sum, e) => sum + e.duration * 60, 0);

  const categoryMinutes: Record<string, number> = {};
  for (const event of events) {
    if (event.status === "unscheduled") continue;
    const key = event.type;
    categoryMinutes[key] = (categoryMinutes[key] ?? 0) + event.duration * 60;
  }

  const getSlotY = (hour: number) => hour * HOUR_HEIGHT;
  const getSlotHour = (y: number) => y / HOUR_HEIGHT;

  useEffect(() => {
    setSelectedEventId(null);
  }, [events]);

  const handleGridMouseDown = (day: number, hour: number) => {
    const eventAtSlot = dayEventMap[day]?.find((e) => {
      const eventEnd = e.startHour + e.duration;
      return hour >= e.startHour && hour < eventEnd;
    });
    if (eventAtSlot) {
      setSelectedEventId(eventAtSlot.id);
      onEventSelect(eventAtSlot.id);
    } else {
      setSelectedEventId(null);
      onEventSelect("");
      onEmptySlotSelect(day, hour);
      onOpenQuickAdd(day, hour);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState || !scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - TIME_AXIS_WIDTH;
    const y = e.clientY - rect.top + scrollRef.current.scrollTop;
    if (x < 0) return;
    const day = Math.floor((x / (rect.width - TIME_AXIS_WIDTH)) * 7);
    const hour = getSlotHour(y);
    const snappedHour = Math.round(hour * 4) / 4;
    setDragPreview({ day: Math.min(Math.max(day, 0), 6), hour: snappedHour });
  };

  const handleMouseUp = () => {
    if (dragState && dragPreview) {
      if (dragState.type === "move") {
        onEventMove(dragState.eventId, dragPreview.day, dragPreview.hour);
      } else {
        const duration = Math.max(0.25, dragPreview.hour - dragState.startHour);
        onEventResize(dragState.eventId, duration);
      }
    }
    setDragState(null);
    setDragPreview(null);
  };

  const totalGridHeight = SLOT_COUNT * HOUR_HEIGHT;

  return (
      <div className="flex flex-col gap-4">
      <TimeAllocationBar totalMinutes={totalMinutes} categoryMinutes={categoryMinutes} />

      <div className="flex flex-col rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
        <div className="grid shrink-0 grid-cols-[56px_repeat(7,1fr)] border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)]">
          <div className="border-r border-[var(--color-border-subtle)]" />
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today);
            const isFocused = i === focusedDayIndex;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onFocusedDayChange(i)}
                className={`flex flex-col items-center justify-center border-r border-[var(--color-border-subtle)] py-1.5 text-center transition-colors ${
                  isFocused ? "bg-[var(--color-primary-lighter)]" : isToday ? "bg-[var(--color-event-focus-light)]" : "hover:bg-[var(--color-bg-page-subtle)]"
                } ${i === 6 ? "border-r-0" : ""}`}
              >
                <span className={`text-[10px] font-medium ${isFocused || isToday ? "text-[var(--color-primary)]" : "opacity-60 text-[var(--color-text-muted)]"}`}>
                  {format(day, "EEE", { locale: zhCN })}
                </span>
                <span className={`mt-0.5 text-sm font-semibold leading-none ${isFocused || isToday ? "text-[var(--color-primary)]" : isToday ? "text-[var(--color-event-focus)]" : "opacity-70 text-[var(--color-text-secondary)]"}`}>
                  {format(day, "d")}
                </span>
                {isToday && <span className="mt-0.5 h-1 w-1 rounded-full bg-[var(--color-event-focus)]" />}
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden" style={{ height: Math.min(totalGridHeight, window.innerHeight - 200) }}>
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto overflow-x-hidden"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div style={{ height: totalGridHeight + HOUR_HEIGHT * 2, minWidth: "100%", display: "flex", alignItems: "stretch" }}>
              <div
                style={{
                  width: TIME_AXIS_WIDTH,
                  flexShrink: 0,
                  height: totalGridHeight + HOUR_HEIGHT * 2,
                  overflow: "hidden",
                  backgroundColor: "var(--color-bg-page-subtle)",
                  paddingBottom: HOUR_HEIGHT * 2
                }}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{
                      height: HOUR_HEIGHT,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: 8,
                      borderBottom: h === 12 ? "1px solid var(--color-border-subtle)" : "1px solid var(--color-border-subtle)",
                      boxSizing: "border-box"
                    }}
                  >
                    <span className="text-[10px] leading-none opacity-55 text-[var(--color-text-muted)]">{formatHour(h)}</span>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, minWidth: 0, position: "relative", height: totalGridHeight + HOUR_HEIGHT * 2, paddingBottom: HOUR_HEIGHT * 2 }}>
                <div
                  className="absolute inset-0 grid grid-cols-7"
                  style={{ gridTemplateRows: `repeat(${SLOT_COUNT}, ${HOUR_HEIGHT}px)` }}
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).closest('[data-event-block]')) return;

                    const gridRect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - gridRect.left;
                    const y = e.clientY - gridRect.top + e.currentTarget.parentElement!.scrollTop;

                    const dayIndex = Math.min(6, Math.max(0, Math.floor((x / gridRect.width) * 7)));
                    const hour = Math.min(23, Math.max(0, y / HOUR_HEIGHT));

                    handleGridMouseDown(dayIndex, hour);
                  }}
                >
                  {Array.from({ length: 7 }).map((_, dayIndex) =>
                    HOURS.map((hour) => (
                      <div
                        key={`${dayIndex}-${hour}`}
                        className={`border-b border-r border-[var(--color-border-subtle)] ${
                          selectedSlot?.day === dayIndex && Math.abs(selectedSlot.startHour - hour) < 0.5
                            ? "bg-[var(--color-primary-lighter)]/50"
                            : "hover:bg-slate-50/50"
                        } ${dayIndex === 6 ? "border-r-0" : ""}`}
                        style={{ borderColor: "#E8ECF0" }}
                      />
                    ))
                  )}
                </div>

                {dragPreview && (
                  <div
                    className="pointer-events-none absolute z-10 rounded border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    style={{
                      left: `${(dragPreview.day / 7) * 100}%`,
                      top: `${getSlotY(dragPreview.hour)}px`,
                      width: `${100 / 7}%`,
                      height: dragState?.type === "resize" ? `${(dragPreview.hour - (dragState?.startHour ?? 0)) * HOUR_HEIGHT}px` : `${HOUR_HEIGHT}px`
                    }}
                  />
                )}

                {Object.entries(dayEventMap).map(([dayStr, dayEvents]) => {
                  const day = parseInt(dayStr);

                  const eventSlots = dayEvents.map((event) => ({
                    event,
                    start: snapToGridSlot(event.startHour),
                    end: ceilToGridSlot(event.startHour + event.duration)
                  }));

                  const overlapGroups: number[][] = [];
                  const assigned = new Set<number>();

                  for (let i = 0; i < eventSlots.length; i++) {
                    if (assigned.has(i)) continue;
                    const group = [i];
                    assigned.add(i);
                    for (let j = i + 1; j < eventSlots.length; j++) {
                      if (assigned.has(j)) continue;
                      if (
                        eventSlots[i].start < eventSlots[j].end &&
                        eventSlots[j].start < eventSlots[i].end
                      ) {
                        group.push(j);
                        assigned.add(j);
                      }
                    }
                    overlapGroups.push(group);
                  }

                  const columnMap: Record<number, number> = {};
                  overlapGroups.forEach((group) => {
                    group.forEach((idx, col) => {
                      columnMap[idx] = col;
                    });
                  });

                  const STACK_OFFSET = 0;

                  return dayEvents.map((event, idx) => {
                    const slotStart = snapToGridSlot(event.startHour);
                    const slotEnd = ceilToGridSlot(event.startHour + event.duration);
                    const baseTop = getSlotY(slotStart);
                    const timeHeight = getSlotY(slotEnd - slotStart);
                    const isSelected = selectedEventId === event.id;

                    const MIN_HEIGHT = 32;
                    const height = Math.max(timeHeight, MIN_HEIGHT);

                    const currentGroup = overlapGroups.find((g) => g.includes(idx)) ?? [idx];
                    const stackIndex = currentGroup.indexOf(idx);
                    let top = baseTop + stackIndex * STACK_OFFSET;

                    if (event.aiGenerated && (event.type === "break" || event.type === "habit")) {
                      top = Math.max(0, top - 16);
                    }

                    const dayPct = 100 / 7;
                    const marginPct = 1.2;

                    const clampedDay = Math.max(0, Math.min(6, day));
                    const leftPos = clampedDay * dayPct + marginPct / 2;
                    const widthPct = Math.min(dayPct - marginPct, 100 - leftPos);

                    return (
                      <div
                        key={event.id}
                        className="absolute overflow-hidden"
                        style={{
                          left: `${Math.max(0, leftPos)}%`,
                          width: `${Math.max(1, widthPct)}%`,
                          top: `${top}px`,
                          height: `${height}px`,
                          zIndex: isSelected ? 10 : 5 + stackIndex,
                          maxWidth: `${dayPct}%`
                        }}
                        onMouseDown={(e) => {
                          if (event.fixed) return;
                          e.stopPropagation();
                          setDragState({ eventId: event.id, type: "move", startDay: day, startHour: event.startHour });
                        }}
                      >
                        <CalendarEventBlock
                          event={event}
                          isSelected={isSelected}
                          isRecentChange={Boolean(recentChangeMap[event.id])}
                          onSelect={() => {
                            setSelectedEventId(event.id);
                            onEventSelect(event.id);
                          }}
                          onMoreAction={() => onMoreAction(event.id)}
                          onMarkDone={() => onMarkDone(event.id)}
                          onReschedule={() => onReschedule(event.id)}
                          onCannotContinue={() => onCannotContinue(event.id)}
                        />
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
