"use client";

type TrendItem = {
  date: string;
  focusMinutes: number;
  meetingMinutes: number;
  taskMinutes: number;
  habitMinutes: number;
  bufferMinutes: number;
  personalMinutes: number;
  otherMinutes: number;
  totalMinutes: number;
};

const segmentOrder = [
  { key: "focusMinutes", color: "#2ca58d" },
  { key: "meetingMinutes", color: "#f97316" },
  { key: "taskMinutes", color: "#3b82f6" },
  { key: "habitMinutes", color: "#8b5cf6" },
  { key: "bufferMinutes", color: "#64748b" },
  { key: "personalMinutes", color: "#e11d48" },
  { key: "otherMinutes", color: "#94a3b8" }
] as const;

export function TimeTrendBars({ title, data }: { title: string; data: TrendItem[] }) {
  const maxMinutes = Math.max(1, ...data.map((item) => item.totalMinutes));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 flex h-56 items-end gap-2 overflow-x-auto pb-2">
        {data.map((item) => (
          <div key={item.date} className="flex min-w-10 flex-col items-center gap-1">
            <div className="flex h-44 w-8 flex-col-reverse overflow-hidden rounded bg-slate-100">
              {segmentOrder.map((segment) => {
                const value = item[segment.key];
                if (value <= 0) return null;
                const height = Math.max(3, (value / maxMinutes) * 176);
                return <div key={segment.key} style={{ height, backgroundColor: segment.color }} />;
              })}
            </div>
            <div className="text-[10px] text-slate-500">{item.date.slice(5)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

