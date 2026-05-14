import { CalendarEvent, EventPriority } from "../types/calendar";
import { formatTime, priorityLabel } from "../utils/calendarUtils";

interface CalendarEventBlockProps {
  event: CalendarEvent;
  isSelected: boolean;
  isRecentChange: boolean;
  onSelect: () => void;
  onMoreAction: () => void;
  onMarkDone: () => void;
  onReschedule: () => void;
  onCannotContinue: () => void;
}

const priorityColors: Record<EventPriority, { bg: string; border: string; text: string; accent: string }> = {
  P1: { bg: "#BDE6D1", border: "#9DD8B8", text: "#111318", accent: "#5DBD82" },
  P2: { bg: "#F7D9DE", border: "#F0C0C8", text: "#111318", accent: "#EB6A67" },
  P3: { bg: "#A8B3F4", border: "#6D7BEF", text: "#111318", accent: "#4F5BEF" },
  P4: { bg: "#FFE4A8", border: "#FFD070", text: "#111318", accent: "#E6B85C" }
};

const priorityIndicator: Record<EventPriority, string> = {
  P1: "#BDE6D1",
  P2: "#F7D9DE",
  P3: "#A8B3F4",
  P4: "#FFE4A8"
};

const priorityDot: Record<EventPriority, string> = {
  P1: "bg-[var(--color-accent-green)]",
  P2: "bg-[var(--color-accent-rose)]",
  P3: "bg-[var(--color-accent-blue)]",
  P4: "bg-[var(--color-accent-amber)]"
};

function buildTitleAttr(event: CalendarEvent): string {
  const p = priorityLabel(event.priority);
  const t = formatTime(event.startHour);
  const endHour = Number((event.startHour + event.duration).toFixed(2));
  return event.title + " | " + p + " | " + t + "-" + formatTime(endHour) + " (" + event.duration + "h)";
}

export function CalendarEventBlock({
  event,
  isSelected,
  isRecentChange,
  onSelect,
  onMoreAction,
  onMarkDone,
  onReschedule,
  onCannotContinue
}: CalendarEventBlockProps) {
  const colors = priorityColors[event.priority] || priorityColors.P4;
  const isCompleted = event.status === "completed";
  const isOvertime = event.status === "overtime";
  const isUnscheduled = event.status === "unscheduled";
  const isFixed = event.fixed || !event.movable;

  const titleAttr = buildTitleAttr(event);
  const startTime = formatTime(event.startHour);
  const endTime = formatTime(Number((event.startHour + event.duration).toFixed(2)));

  const isShort = event.duration <= 0.5;
  const isMedium = event.duration > 0.5 && event.duration <= 1.5;
  const isLong = event.duration > 1.5;

  return (
    <button
      type="button"
      title={titleAttr}
      onClick={onSelect}
      className={`group relative h-full w-full cursor-pointer overflow-hidden transition-all duration-200 ${
        isSelected
          ? "ring-2 ring-white shadow-[0_4px_16px_rgba(17,19,24,0.12)]"
          : isRecentChange
            ? "shadow-[0_2px_8px_rgba(17,19,24,0.08)]"
            : isOvertime
              ? "border border-[rgba(235,106,103,0.35)] bg-[var(--color-accent-coral-light)]"
              : "shadow-[0_1px_3px_rgba(17,19,24,0.06)] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(17,19,24,0.10)]"
      } ${isCompleted ? "opacity-50" : ""}`}
      style={{
        backgroundColor: isOvertime ? undefined : colors.bg,
        borderColor: isSelected ? "var(--color-btn-primary)" : isOvertime ? "rgba(235,106,103,0.45)" : colors.border
      }}
    >
      <div className="flex h-full flex-col justify-start overflow-hidden pl-3.5 pr-3 pt-2.5 pb-2 text-left">
        {isShort ? (
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: priorityIndicator[event.priority] }}
            />
            <span className={`break-words text-[12px] font-bold leading-tight ${isOvertime ? "text-[var(--color-accent-coral-dark)]" : ""}`} style={{ color: isOvertime ? undefined : colors.text }}>
              {event.title}
            </span>
          </div>
        ) : (
          <>
            <div className="min-w-0 flex-1 space-y-0.5">
              <span className={`block break-words text-[12px] font-bold leading-snug ${isUnscheduled ? "italic opacity-70" : ""}`} style={{ color: isOvertime ? undefined : colors.text }}>
                {event.title}
              </span>

              {isMedium && !isUnscheduled && (
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: priorityIndicator[event.priority] }} />
                  <span className="text-[10px] font-bold opacity-70" style={{ color: isOvertime ? undefined : colors.text }}>
                    {startTime} – {endTime}
                  </span>
                </div>
              )}

              {isLong && !isUnscheduled && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priorityIndicator[event.priority] }} />
                    <span className="text-[10px] font-bold" style={{ color: isOvertime ? undefined : colors.text }}>
                      {priorityLabel(event.priority)}
                    </span>
                  </div>
                  <span className="text-[10px] opacity-60 font-bold" style={{ color: isOvertime ? undefined : colors.text }}>
                    {startTime} – {endTime}
                  </span>
                </div>
              )}
            </div>

            {isLong && !isUnscheduled && (
              <div className="mt-auto flex items-center justify-between border-t pt-1" style={{ borderColor: colors.border }}>
                <span className="text-[10px] font-bold opacity-60" style={{ color: isOvertime ? undefined : colors.text }}>
                  {event.duration}h
                </span>
                {isFixed && (
                  <span className="rounded px-1 py-px text-[10px] font-bold" style={{ backgroundColor: colors.accent + "20", color: colors.accent }}>
                    固定
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </button>
  );
}
