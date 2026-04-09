"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SmartSuggestionsPanel } from "@/components/dashboard/smart-suggestions";
import { QuickCreatePanel } from "@/components/dashboard/quick-create";
import { ScheduleImportPanel } from "@/components/dashboard/schedule-import-panel";
import { apiFetch } from "@/lib/api/client";
import { buildQuadrantBuckets, formatDueAtZh, type QuadrantTask } from "@/lib/dashboard/quadrants";

type TaskRecord = QuadrantTask & { estimateMinutes: number; remainingMinutes: number | null };

type QuadrantKey = "importantUrgent" | "importantNotUrgent" | "urgentNotImportant" | "neither";

const quadrantMeta: Record<QuadrantKey, { title: string; subtitle: string; tone: string }> = {
  importantUrgent: {
    title: "重要且紧急",
    subtitle: "立即处理",
    tone: "border-rose-200 bg-rose-50"
  },
  importantNotUrgent: {
    title: "重要不紧急",
    subtitle: "优先规划",
    tone: "border-sky-200 bg-sky-50"
  },
  urgentNotImportant: {
    title: "紧急不重要",
    subtitle: "可委派/压缩",
    tone: "border-amber-200 bg-amber-50"
  },
  neither: {
    title: "不紧急不重要",
    subtitle: "低优先级",
    tone: "border-slate-200 bg-slate-50"
  }
};

export default function DashboardPage() {
  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiFetch<TaskRecord[]>("/api/tasks")
  });

  const activeTasks = useMemo(
    () => (tasksQuery.data ?? []).filter((item) => !["DONE", "CANCELLED"].includes(item.smartEvent.status)),
    [tasksQuery.data]
  );

  const quadrants = useMemo(() => {
    return buildQuadrantBuckets(activeTasks) as Record<QuadrantKey, TaskRecord[]>;
  }, [activeTasks]);

  const urgentCount = quadrants.importantUrgent.length + quadrants.urgentNotImportant.length;

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">进行中任务</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{activeTasks.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">紧急任务</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{urgentCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">日历排程</div>
          <Link href="/calendar" className="mt-1 inline-flex text-sm font-medium text-primary hover:underline">
            打开日历工作台
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4 md:grid-cols-2 md:auto-rows-fr">
          {(Object.keys(quadrantMeta) as QuadrantKey[]).map((key) => {
            const section = quadrantMeta[key];
            const items = quadrants[key];

            return (
              <section key={key} className={`flex h-[360px] flex-col rounded-xl border p-4 shadow-sm ${section.tone}`}>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
                    <p className="text-xs text-slate-600">{section.subtitle}</p>
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-medium text-slate-700">{items.length}</span>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                  {items.length === 0 ? <div className="rounded-lg bg-white/80 p-3 text-sm text-slate-500">暂无任务</div> : null}
                  {items.map((task) => (
                    <div key={task.id} className="rounded-lg bg-white p-3">
                      <div className="text-sm font-medium text-slate-900">{task.smartEvent.title}</div>
                      <div className="mt-1 text-xs text-slate-600">{formatDueAtZh(task.smartEvent.dueAt)}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{task.smartEvent.priority}</span>
                        <Link href={`/calendar?taskId=${task.id}`} className="text-xs font-medium text-primary hover:underline">
                          选时间安排
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="space-y-3 xl:sticky xl:top-4 xl:self-start">
          <SmartSuggestionsPanel />
          <QuickCreatePanel />
          <ScheduleImportPanel />
        </div>
      </div>
    </div>
  );
}
