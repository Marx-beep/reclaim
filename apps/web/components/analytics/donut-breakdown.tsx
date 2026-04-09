"use client";

type BreakdownItem = {
  key: string;
  label: string;
  color: string;
  minutes: number;
  percent: number;
};

export function DonutBreakdown({
  title,
  items
}: {
  title: string;
  items: BreakdownItem[];
}) {
  const totalMinutes = items.reduce((sum, item) => sum + item.minutes, 0);
  const nonZeroItems = items.filter((item) => item.minutes > 0);

  let cursor = 0;
  const gradient = nonZeroItems
    .map((item) => {
      const start = cursor;
      const end = cursor + item.percent * 100;
      cursor = end;
      return `${item.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    })
    .join(", ");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
        <div className="flex items-center justify-center">
          <div
            className="relative h-44 w-44 rounded-full"
            style={{
              background: gradient ? `conic-gradient(${gradient})` : "#e2e8f0"
            }}
          >
            <div className="absolute inset-[22%] flex items-center justify-center rounded-full bg-white text-center">
              <div>
                <div className="text-xl font-semibold text-slate-900">{Math.round(totalMinutes / 60)}h</div>
                <div className="text-xs text-slate-500">总安排时长</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-700">{item.label}</span>
              </div>
              <div className="text-slate-500">
                {Math.round(item.minutes)}m ({Math.round(item.percent * 100)}%)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

