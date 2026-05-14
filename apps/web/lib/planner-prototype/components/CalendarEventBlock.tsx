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

const typeColors: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  focus: { bg: "#D2E0AA", border: "#C8DCA0", text: "#5A7050", accent: "#B8C98F" },
  task: { bg: "#ABD7FB", border: "#C5DEF5", text: "#5A7A9A", accent: "#8BBEE5" },
  meeting: { bg: "#FCCEB4", border: "#F0CAB4", text: "#8B6050", accent: "#E5A888" },
  habit: { bg: "#D2E0AA", border: "#C8DCA0", text: "#5A7050", accent: "#B8C98F" },
  break: { bg: "#E8E4E0", border: "#DDD8D2", text: "#7A7570", accent: "#C9C4BE" },
  default: { bg: "#D2E0AA", border: "#C8DCA0", text: "#5A7050", accent: "#B8C98F" }
};

const priorityIndicator: Record<EventPriority, string> = {
  P1: "#E8B89A",
  P2: "#FCCEB4",
  P3: "#ABD7FB",
  P4: "#B8C4CE"
};

const priorityDot: Record<EventPriority, string> = {
  P1: "bg-[var(--color-btn-primary)]",
  P2: "bg-[var(--color-accent-amber)]",
  P3: "bg-[var(--color-accent-blue)]",
  P4: "bg-[var(--color-accent-slate)]"
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
  const colors = typeColors[event.type] || typeColors.default;
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
      className={`group relative h-full w-full cursor-pointer overflow-hidden rounded-lg transition-all duration-200 ${
        isSelected
          ? "ring-2 ring-white shadow-[0_4px_16px_rgba(100,90,82,0.15)]"
          : isRecentChange
            ? "shadow-[0_2px_8px_rgba(100,90,82,0.10)]"
            : isOvertime
              ? "border border-[rgba(249,140,83,0.30)] bg-[var(--color-accent-coral-light)]"
              : "shadow-[0_1px_4px_rgba(100,90,82,0.06)] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(100,90,82,0.12)]"
      } ${isCompleted ? "opacity-50" : ""}`}
      style={{
        backgroundColor: isOvertime ? undefined : colors.bg,
        borderColor: isSelected ? "var(--color-btn-primary)" : isOvertime ? "rgba(249,140,83,0.40)" : colors.border
      }}
    >
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: isOvertime ? "#F98C53" : colors.accent }}
      />

      <div className="flex h-full flex-col justify-between overflow-hidden pl-2.5 pr-2 pt-1.5 pb-1">
        {isShort ? (
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: priorityIndicator[event.priority] }}
            />
            <span className={`truncate text-[11px] font-medium leading-tight ${isOvertime ? "text-[var(--color-accent-coral-dark)]" : ""}`} style={{ color: isOvertime ? undefined : colors.text }}>
              {event.title}
            </span>
          </div>
        ) : (
          <>
            <div className="min-w-0 flex-1 space-y-0.5">
              <span className={`block truncate text-[12px] font-semibold leading-snug ${isUnscheduled ? "italic opacity-70" : ""}`} style={{ color: isOvertime ? undefined : colors.text }}>
                {event.title}
              </span>

              {isMedium && !isUnscheduled && (
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: priorityIndicator[event.priority] }} />
                  <span className="text-[10px] font-medium opacity-70" style={{ color: isOvertime ? undefined : colors.text }}>
                    {startTime} – {endTime}
                  </span>
                </div>
              )}

              {isLong && !isUnscheduled && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priorityIndicator[event.priority] }} />
                    <span className="text-[10px] font-medium" style={{ color: isOvertime ? undefined : colors.text }}>
                      {priorityLabel(event.priority)}
                    </span>
                  </div>
                  <span className="text-[10px] opacity-60" style={{ color: isOvertime ? undefined : colors.text }}>
                    {startTime} – {endTime}
                  </span>
                </div>
              )}
            </div>

            {isLong && !isUnscheduled && (
              <div className="mt-auto flex items-center justify-between border-t pt-1" style={{ borderColor: colors.border }}>
                <span className="text-[10px] font-medium opacity-60" style={{ color: isOvertime ? undefined : colors.text }}>
                  {event.duration}h
                </span>
                {isFixed && (
                  <span className="rounded px-1 py-px text-[9px] font-medium" style={{ backgroundColor: colors.accent + "20", color: colors.accent }}>
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
