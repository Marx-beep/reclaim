interface TimeAllocationBarProps {
  totalMinutes: number;
  categoryMinutes: Record<string, number>;
}

const LEGEND: Array<{ key: string; label: string; color: string }> = [
  { key: "focus", label: "专注", color: "var(--color-event-focus)" },
  { key: "meeting", label: "会议", color: "var(--color-event-meeting)" },
  { key: "task", label: "任务", color: "var(--color-event-task)" },
  { key: "habit", label: "习惯", color: "var(--color-event-habit)" },
  { key: "break", label: "休息", color: "var(--color-event-break)" }
];

function fmt(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? (m > 0 ? `${h}h${m}m` : `${h}h`) : `${m}m`;
}

export function TimeAllocationBar({ totalMinutes, categoryMinutes }: TimeAllocationBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-white px-4 py-2.5 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-40 overflow-hidden rounded-full bg-[var(--color-border-subtle)]">
          <div className="flex h-full">
            {LEGEND.map((item) => {
              const minutes = categoryMinutes[item.key] ?? 0;
              if (minutes === 0) return null;
              const pct = Math.max(1, (minutes / Math.max(totalMinutes, 1)) * 100);
              return (
                <div
                  key={item.key}
                  className="h-full transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                  title={`${item.label}：${fmt(minutes)}`}
                />
              );
            })}
          </div>
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">{fmt(totalMinutes)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {LEGEND.map((item) => {
          const minutes = categoryMinutes[item.key] ?? 0;
          return (
            <div key={item.key} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {item.label} <span className="font-medium text-[var(--color-text-secondary)]">{fmt(minutes)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
