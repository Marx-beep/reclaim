"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardTitle } from "@/components/shared/card";
import { PageHeader } from "@/components/dashboard/page-header";
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
  categoryTagTotals: Record<string, number>;
  categoryTagBreakdown: Array<{
    key: string;
    label: string;
    minutes: number;
    percent: number;
  }>;
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
      <PageHeader
        title={copy.title}
        actions={
          <>
            <button
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${rangeDays === 7 ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-page-subtle)]"}`}
              onClick={() => setRangeDays(7)}
            >
              {copy.range7}
            </button>
            <button
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${rangeDays === 14 ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-page-subtle)]"}`}
              onClick={() => setRangeDays(14)}
            >
              {copy.range14}
            </button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <DonutBreakdown title={copy.breakdownTitle} items={data?.breakdown ?? []} />
        <TimeTrendBars title={copy.trendTitle} data={data?.trend ?? []} />
      </div>

      <Card>
        <CardTitle>类别标签时间记录</CardTitle>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(data?.categoryTagBreakdown ?? []).length === 0 ? (
              <div className="text-sm text-[var(--color-text-muted)]">暂无类别标签记录</div>
            ) : (
              (data?.categoryTagBreakdown ?? []).map((item) => (
                <div key={item.key} className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] p-2.5">
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">{item.label}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">{toHours(item.minutes)}h</div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border-subtle)]">
                    <div className="h-full rounded-full bg-[var(--color-event-task)]" style={{ width: `${Math.round(item.percent * 100)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardTitle>{copy.habitsTasksTitle}</CardTitle>
          <CardContent>
            <div className="mt-2 flex h-44 items-end gap-2 overflow-x-auto">
              {habitTaskTrend.map((item) => (
                <div key={item.date} className="flex min-w-9 flex-col items-center gap-1">
                  <div
                    className="w-7 rounded bg-[var(--color-primary-light)]"
                    style={{
                      height: Math.max(4, (item.total / habitTaskMax) * 160)
                    }}
                  />
                  <span className="text-[10px] text-[var(--color-text-muted)]">{item.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardTitle>{copy.focusVsShallowTitle}</CardTitle>
          <CardContent className="space-y-3">
            <div className="h-4 w-full overflow-hidden rounded-full bg-[var(--color-border-subtle)]">
              <div
                className="h-full rounded-full bg-[var(--color-event-focus)]"
                style={{ width: `${Math.round((data?.focusVsShallow.focusRatio ?? 0) * 100)}%` }}
              />
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">
              专注：{toHours(data?.focusVsShallow.focusMinutes ?? 0)}h / 浅层：{toHours(data?.focusVsShallow.shallowMinutes ?? 0)}h
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>{copy.meetingsTitle}</CardTitle>
          <CardContent className="space-y-2 text-sm text-[var(--color-text-secondary)]">
            <div>会议总次数：{data?.meetingCount ?? 0}</div>
            <div>会议总时长：{toHours(data?.meetingMinutes ?? 0)}h</div>
            <div>缓冲时间：{toHours(data?.categoryTotals.bufferMinutes ?? 0)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardTitle>{copy.workLifeTitle}</CardTitle>
          <CardContent className="space-y-2 text-sm text-[var(--color-text-secondary)]">
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
          <CardContent className="space-y-2">
            {(data?.insights ?? []).map((insight) => (
              <div key={insight.id} className="rounded-lg border border-[var(--color-border-subtle)] p-2.5">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${insight.level === "warn" ? "bg-[var(--color-accent-amber)]" : "bg-[var(--color-event-task)]"}`}
                  />
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">{insight.title}</div>
                </div>
                <div className="text-sm text-[var(--color-text-secondary)]">{insight.detail}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
