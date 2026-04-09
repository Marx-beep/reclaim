"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardTitle } from "@/components/shared/card";
import { apiFetch } from "@/lib/api/client";
import { t } from "@/lib/i18n";
import { DonutBreakdown } from "@/components/analytics/donut-breakdown";
import { TimeTrendBars } from "@/components/analytics/time-trend-bars";

type AnalyticsResponse = {
  focusMinutes: number;
  meetingMinutes: number;
  taskCreated: number;
  taskCompleted: number;
  utilization: number;
  overtimeMinutes: number;
  completionRate: number;
  meetingCount: number;
  categoryTotals: {
    focusMinutes: number;
    meetingMinutes: number;
    taskMinutes: number;
    habitMinutes: number;
    bufferMinutes: number;
    personalMinutes: number;
    otherMinutes: number;
  };
  focusVsShallow: {
    focusMinutes: number;
    shallowMinutes: number;
    focusRatio: number;
  };
  breakdown: Array<{
    key: string;
    label: string;
    color: string;
    minutes: number;
    percent: number;
  }>;
  trend: Array<{
    date: string;
    focusMinutes: number;
    meetingMinutes: number;
    taskMinutes: number;
    habitMinutes: number;
    bufferMinutes: number;
    personalMinutes: number;
    otherMinutes: number;
    totalMinutes: number;
  }>;
  insights: Array<{
    id: string;
    level: "info" | "warn";
    title: string;
    detail: string;
  }>;
};

function toHours(minutes: number) {
  return Math.round((minutes / 60) * 10) / 10;
}

export default function AnalyticsPage() {
  const copy = t("analytics");
  const [rangeDays, setRangeDays] = useState<7 | 14>(14);

  const analytics = useQuery({
    queryKey: ["analytics-weekly", rangeDays],
    queryFn: () => apiFetch<AnalyticsResponse>(`/api/analytics/weekly?days=${rangeDays}`)
  });

  const data = analytics.data;

  const habitTaskTrend = useMemo(
    () =>
      (data?.trend ?? []).map((item) => ({
        date: item.date,
        total: item.taskMinutes + item.habitMinutes
      })),
    [data?.trend]
  );

  const habitTaskMax = Math.max(1, ...habitTaskTrend.map((item) => item.total));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{copy.title}</h2>
        <div className="flex items-center gap-2">
          <button
            className={`rounded-full px-3 py-1 text-sm ${rangeDays === 7 ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
            onClick={() => setRangeDays(7)}
          >
            {copy.range7}
          </button>
          <button
            className={`rounded-full px-3 py-1 text-sm ${rangeDays === 14 ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
            onClick={() => setRangeDays(14)}
          >
            {copy.range14}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardTitle>{copy.deepWork}</CardTitle>
          <CardContent className="text-3xl font-semibold">{toHours(data?.focusMinutes ?? 0)}h</CardContent>
        </Card>
        <Card>
          <CardTitle>{copy.meetings}</CardTitle>
          <CardContent className="text-3xl font-semibold">{toHours(data?.meetingMinutes ?? 0)}h</CardContent>
        </Card>
        <Card>
          <CardTitle>{copy.taskCompletion}</CardTitle>
          <CardContent className="text-3xl font-semibold">{Math.round((data?.completionRate ?? 0) * 100)}%</CardContent>
        </Card>
        <Card>
          <CardTitle>{copy.utilization}</CardTitle>
          <CardContent className="text-3xl font-semibold">{Math.round((data?.utilization ?? 0) * 100)}%</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DonutBreakdown title={copy.breakdownTitle} items={data?.breakdown ?? []} />
        <TimeTrendBars title={copy.trendTitle} data={data?.trend ?? []} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardTitle>{copy.habitsTasksTitle}</CardTitle>
          <CardContent>
            <div className="mt-2 flex h-44 items-end gap-2 overflow-x-auto">
              {habitTaskTrend.map((item) => (
                <div key={item.date} className="flex min-w-9 flex-col items-center gap-1">
                  <div
                    className="w-7 rounded bg-indigo-500/70"
                    style={{
                      height: Math.max(4, (item.total / habitTaskMax) * 160)
                    }}
                  />
                  <span className="text-[10px] text-slate-500">{item.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardTitle>{copy.focusVsShallowTitle}</CardTitle>
          <CardContent className="space-y-3">
            <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.round((data?.focusVsShallow.focusRatio ?? 0) * 100)}%` }}
              />
            </div>
            <div className="text-sm text-slate-600">
              专注：{toHours(data?.focusVsShallow.focusMinutes ?? 0)}h / 浅层：{toHours(data?.focusVsShallow.shallowMinutes ?? 0)}h
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardTitle>{copy.meetingsTitle}</CardTitle>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <div>会议总次数：{data?.meetingCount ?? 0}</div>
            <div>会议总时长：{toHours(data?.meetingMinutes ?? 0)}h</div>
            <div>缓冲时间：{toHours(data?.categoryTotals.bufferMinutes ?? 0)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardTitle>{copy.workLifeTitle}</CardTitle>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <div>
              {copy.personalHours}：{toHours(data?.categoryTotals.personalMinutes ?? 0)}h
            </div>
            <div>
              {copy.overtimeHours}：{toHours(data?.overtimeMinutes ?? 0)}h
            </div>
            <div>
              {copy.vacationHours}：{toHours(data?.categoryTotals.personalMinutes ?? 0)}h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardTitle>{copy.insightsTitle}</CardTitle>
          <CardContent className="space-y-2 text-sm">
            {(data?.insights ?? []).map((insight) => (
              <div key={insight.id} className="rounded border border-slate-200 p-2">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${insight.level === "warn" ? "bg-amber-500" : "bg-sky-500"}`}
                  />
                  <div className="font-medium text-slate-900">{insight.title}</div>
                </div>
                <div className="text-slate-600">{insight.detail}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

