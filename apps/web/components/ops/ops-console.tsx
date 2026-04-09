"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardTitle } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { apiFetch } from "@/lib/api/client";
import { t } from "@/lib/i18n";

type Health = {
  db: string;
  scheduler: string;
  queue: string;
  queueDetails: {
    mode: "auto" | "enabled" | "disabled";
    redisVersion: string | null;
    bullmqEnabled: boolean;
    reason: string | null;
  };
};

type JobsResponse = {
  jobs: Array<{ id: string; status: string; triggerType: string; requestedAt: string }>;
  decisions: Array<{ id: string; smartEventId: string; decisionType: string; reasonText: string; createdAt: string }>;
};

type Overview = {
  users: number;
  calendars: number;
  upcomingEvents7d: number;
  openTasks: number;
  linksActive: number;
  rescheduleJobs24h: number;
  decisions24h: number;
};

export function OpsConsole() {
  const router = useRouter();
  const copy = t("admin");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const health = useQuery({
    queryKey: ["ops-health"],
    queryFn: () => apiFetch<Health>("/api/admin/health"),
    refetchInterval: 15_000
  });

  const overview = useQuery({
    queryKey: ["ops-overview"],
    queryFn: () => apiFetch<Overview>("/api/admin/overview"),
    refetchInterval: 20_000
  });

  const jobs = useQuery({
    queryKey: ["ops-jobs"],
    queryFn: () => apiFetch<JobsResponse>("/api/admin/jobs"),
    refetchInterval: 20_000
  });

  const action = useMutation({
    mutationFn: (payload: { action: "sync" | "recompute" | "analytics-rollup" | "cleanup" }) =>
      apiFetch("/api/admin/actions", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: (result: any) => {
      if (result.warning) {
        setActionMessage(`${result.action}: ${result.warning}`);
      } else if (result.jobId) {
        setActionMessage(`${result.action}: 已入队 (${result.jobId})`);
      } else {
        setActionMessage(`${result.action}: 已完成`);
      }
      void health.refetch();
      void overview.refetch();
      void jobs.refetch();
    },
    onError: (error: Error) => {
      setActionMessage(error.message);
    }
  });

  const h = health.data;
  const o = overview.data;

  const logout = async () => {
    await fetch("/api/ops/logout", { method: "POST" });
    router.replace("/ops/login");
    router.refresh();
  };

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Ops Console</h1>
            <p className="mt-1 text-sm text-slate-300">独立运维入口：用于用户规模、作业状态、系统健康监控。</p>
          </div>
          <Button variant="secondary" onClick={logout}>
            退出
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardTitle>用户总数</CardTitle>
          <CardContent className="text-2xl font-semibold">{o?.users ?? 0}</CardContent>
        </Card>
        <Card>
          <CardTitle>已连日历</CardTitle>
          <CardContent className="text-2xl font-semibold">{o?.calendars ?? 0}</CardContent>
        </Card>
        <Card>
          <CardTitle>7天内事件</CardTitle>
          <CardContent className="text-2xl font-semibold">{o?.upcomingEvents7d ?? 0}</CardContent>
        </Card>
        <Card>
          <CardTitle>活跃预约链接</CardTitle>
          <CardContent className="text-2xl font-semibold">{o?.linksActive ?? 0}</CardContent>
        </Card>
      </div>

      <Card>
        <CardTitle>{copy.title}</CardTitle>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded border p-3">
            <div className="text-xs uppercase text-slate-500">{copy.database}</div>
            <div className="text-lg font-semibold">{h?.db ?? copy.checking}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs uppercase text-slate-500">{copy.scheduler}</div>
            <div className="text-lg font-semibold">{h?.scheduler ?? copy.checking}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs uppercase text-slate-500">{copy.queue}</div>
            <div className="text-lg font-semibold">{h?.queue ?? copy.checking}</div>
            <div className="text-xs text-slate-500">
              模式={h?.queueDetails?.mode ?? "-"} | Redis={h?.queueDetails?.redisVersion ?? "-"}
            </div>
            {h?.queueDetails?.reason ? <div className="mt-1 text-xs text-amber-700">{h.queueDetails.reason}</div> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardTitle>{copy.operations}</CardTitle>
        <CardContent className="grid gap-2 md:grid-cols-4">
          <Button variant="secondary" onClick={() => action.mutate({ action: "sync" })}>
            {copy.runSync}
          </Button>
          <Button variant="secondary" onClick={() => action.mutate({ action: "recompute" })}>
            {copy.queueRecompute}
          </Button>
          <Button variant="secondary" onClick={() => action.mutate({ action: "analytics-rollup" })}>
            {copy.queueAnalytics}
          </Button>
          <Button variant="secondary" onClick={() => action.mutate({ action: "cleanup" })}>
            {copy.queueCleanup}
          </Button>
          {actionMessage ? <div className="md:col-span-4 text-sm text-slate-600">{actionMessage}</div> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>{copy.recentJobs}</CardTitle>
          <CardContent className="space-y-2 text-sm">
            {(jobs.data?.jobs ?? []).map((job) => (
              <div key={job.id} className="rounded border p-2">
                <div className="font-medium">{job.id}</div>
                <div className="text-xs text-slate-500">
                  {job.status} | {job.triggerType} | {new Date(job.requestedAt).toLocaleString("zh-CN")}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardTitle>{copy.recentDecisions}</CardTitle>
          <CardContent className="space-y-2 text-sm">
            {(jobs.data?.decisions ?? []).map((decision) => (
              <div key={decision.id} className="rounded border p-2">
                <div className="font-medium">
                  {decision.decisionType} - {decision.smartEventId}
                </div>
                <div className="text-xs text-slate-500">{decision.reasonText}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
