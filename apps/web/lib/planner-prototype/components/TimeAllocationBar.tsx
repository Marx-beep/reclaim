import type { CalendarEvent } from "../types/calendar";
import { WORKING_HOURS_PER_WEEK, formatHours } from "../utils/calendarUtils";

interface TimeAllocationBarProps {
  events: CalendarEvent[];
  compact?: boolean;
}

const segmentMeta = [
  { key: "focus", label: "专注目标", color: "#22c55e" },
  { key: "meeting", label: "团队会议", color: "#3b82f6" },
  { key: "other", label: "其他工作", color: "#64748b" },
  { key: "free", label: "空闲时间", color: "#d1d5db" }
] as const;

export function TimeAllocationBar({ events, compact = false }: TimeAllocationBarProps) {
  const totals = events.reduce(
    (acc, event) => {
      if (event.status === "completed" || event.status === "unscheduled") {
        return acc;
      }

      if (event.type === "focus") {
        acc.focus += event.duration;
      } else if (event.type === "meeting") {
        acc.meeting += event.duration;
      } else {
        acc.other += event.duration;
      }

      return acc;
    },
    { focus: 0, meeting: 0, other: 0 }
  );

  const free = Math.max(WORKING_HOURS_PER_WEEK - totals.focus - totals.meeting - totals.other, 0);
  const segments = [
    { key: "focus", label: "专注目标", color: "#22c55e", value: totals.focus },
    { key: "meeting", label: "团队会议", color: "#3b82f6", value: totals.meeting },
    { key: "other", label: "其他工作", color: "#64748b", value: totals.other },
    { key: "free", label: "空闲时间", color: "#d1d5db", value: free }
  ] as const;

  if (compact) {
    return (
      <div className="rounded-[18px] border border-[#e8ebf3] bg-[#fbfcff] px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-600">
          {segmentMeta.map((segment) => {
            const activeSegment = segments.find((item) => item.key === segment.key)!;

            return (
              <div key={segment.key} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
                <span>
                  {segment.label} <span className="font-semibold text-slate-900">{formatHours(activeSegment.value)}</span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="flex h-full w-full">
            {segments.map((segment) => (
              <div
                key={segment.key}
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${(segment.value / WORKING_HOURS_PER_WEEK) * 100}%`,
                  backgroundColor: segment.color
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#e8ebf3] bg-white px-4 py-3 shadow-soft">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-slate-600">
        {segmentMeta.map((segment) => {
          const activeSegment = segments.find((item) => item.key === segment.key)!;

          return (
            <div key={segment.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
              <span>
                {segment.label} <span className="font-semibold text-slate-900">{formatHours(activeSegment.value)}</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="flex h-full w-full">
          {segments.map((segment) => (
            <div
              key={segment.key}
              className="h-full transition-[width] duration-500"
              style={{
                width: `${(segment.value / WORKING_HOURS_PER_WEEK) * 100}%`,
                backgroundColor: segment.color
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
