"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/shared/button";
import { Card, CardContent, CardTitle } from "@/components/shared/card";
import { Input } from "@/components/shared/input";
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

type LlmUsage = {
  config: {
    configured: boolean;
    maskedKey: string | null;
    source: "runtime" | "env" | "none";
    model: string;
    apiUrl: string;
    inputTokenUsdPerMillion: number;
    outputTokenUsdPerMillion: number;
  };
  totals: {
    calls: number;
    success: number;
    fallback: number;
    error: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
  recent: Array<{
    at: string;
    provider: string;
    model: string;
    status: "success" | "fallback" | "error";
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    reason?: string;
  }>;
};

function formatUsd(value: number) {
  return `$${value.toFixed(6)}`;
}

function statusText(status: "success" | "fallback" | "error") {
  if (status === "success") return "成功";
  if (status === "fallback") return "已回退";
  return "失败";
}

export function OpsConsole() {
  const router = useRouter();
  const copy = t("admin");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [llmMessage, setLlmMessage] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("deepseek-v4-flash");
  const [apiUrl, setApiUrl] = useState("https://api.deepseek.com/chat/completions");
  const [inputPrice, setInputPrice] = useState("0");
  const [outputPrice, setOutputPrice] = useState("0");

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

  const llm = useQuery({
    queryKey: ["ops-llm-settings"],
    queryFn: () => apiFetch<LlmUsage>("/api/admin/llm-settings"),
    refetchInterval: 20_000
  });

  useEffect(() => {
    if (!llm.data) return;
    setModel(llm.data.config.model);
    setApiUrl(llm.data.config.apiUrl);
    setInputPrice(String(llm.data.config.inputTokenUsdPerMillion));
    setOutputPrice(String(llm.data.config.outputTokenUsdPerMillion));
  }, [llm.data]);

  const action = useMutation({
    mutationFn: (payload: { action: "sync" | "recompute" | "analytics-rollup" | "cleanup" }) =>
      apiFetch<{ action: string; warning?: string; jobId?: string }>("/api/admin/actions", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: (result) => {
      if (result.warning) {
        setActionMessage(`${result.action}: ${result.warning}`);
      } else if (result.jobId) {
        setActionMessage(`${result.action}: 已加入队列 (${result.jobId})`);
      } else {
        setActionMessage(`${result.action}: 已完成`);
      }
      void health.refetch();
      void overview.refetch();
      void jobs.refetch();
    },
    onError: (error: Error) => setActionMessage(error.message)
  });

  const saveLlm = useMutation({
    mutationFn: (payload: {
      apiKey?: string;
      clearApiKey?: boolean;
      model: string;
      apiUrl: string;
      inputTokenUsdPerMillion: number;
      outputTokenUsdPerMillion: number;
    }) =>
      apiFetch<LlmUsage>("/api/admin/llm-settings", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      setApiKey("");
      setLlmMessage("DeepSeek 配置已保存，后续重排会自动使用该配置。");
      void llm.refetch();
    },
    onError: (error: Error) => setLlmMessage(error.message)
  });

  const h = health.data;
  const o = overview.data;
  const usage = llm.data;

  const logout = async () => {
    await fetch("/api/ops/logout", { method: "POST" });
    router.replace("/ops/login");
    router.refresh();
  };

  const saveCurrentLlmSettings = (clearApiKey = false) => {
    saveLlm.mutate({
      apiKey: apiKey.trim() || undefined,
      clearApiKey,
      model,
      apiUrl,
      inputTokenUsdPerMillion: Number(inputPrice || 0),
      outputTokenUsdPerMillion: Number(outputPrice || 0)
    });
  };

  return (
    <div className="min-h-screen space-y-4 bg-slate-50 p-4 text-slate-950">
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">运营后台</h1>
            <p className="mt-1 text-sm text-slate-300">独立维护入口，用于监控用户规模、系统健康、调度作业与大模型用量。</p>
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
          <CardTitle>已连接日历</CardTitle>
          <CardContent className="text-2xl font-semibold">{o?.calendars ?? 0}</CardContent>
        </Card>
        <Card>
          <CardTitle>7 天内事件</CardTitle>
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
        <CardTitle>DeepSeek API 配置与用量</CardTitle>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded border p-3">
              <div className="text-xs text-slate-500">配置状态</div>
              <div className="text-lg font-semibold">{usage?.config.configured ? "已配置" : "未配置"}</div>
              <div className="text-xs text-slate-500">
                来源={usage?.config.source ?? "-"} | Key={usage?.config.maskedKey ?? "未设置"}
              </div>
            </div>
            <div className="rounded border p-3">
              <div className="text-xs text-slate-500">调用次数</div>
              <div className="text-lg font-semibold">{usage?.totals.calls ?? 0}</div>
              <div className="text-xs text-slate-500">
                成功 {usage?.totals.success ?? 0} / 回退 {usage?.totals.fallback ?? 0} / 失败 {usage?.totals.error ?? 0}
              </div>
            </div>
            <div className="rounded border p-3">
              <div className="text-xs text-slate-500">Token 用量</div>
              <div className="text-lg font-semibold">{usage?.totals.totalTokens ?? 0}</div>
              <div className="text-xs text-slate-500">
                输入 {usage?.totals.promptTokens ?? 0} / 输出 {usage?.totals.completionTokens ?? 0}
              </div>
            </div>
            <div className="rounded border p-3">
              <div className="text-xs text-slate-500">预估费用</div>
              <div className="text-lg font-semibold">{formatUsd(usage?.totals.estimatedCostUsd ?? 0)}</div>
              <div className="text-xs text-slate-500">按下方单价估算</div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">API Key</span>
              <Input
                type="password"
                value={apiKey}
                placeholder="输入新的 DeepSeek API Key；留空则保留当前 key"
                onChange={(event) => setApiKey(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">模型</span>
              <Input value={model} onChange={(event) => setModel(event.target.value)} />
            </label>
            <label className="space-y-1 text-sm lg:col-span-2">
              <span className="font-medium">接口地址</span>
              <Input value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">输入 Token 单价（美元/百万）</span>
              <Input type="number" min="0" step="0.000001" value={inputPrice} onChange={(event) => setInputPrice(event.target.value)} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">输出 Token 单价（美元/百万）</span>
              <Input type="number" min="0" step="0.000001" value={outputPrice} onChange={(event) => setOutputPrice(event.target.value)} />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => saveCurrentLlmSettings(false)} disabled={saveLlm.isPending}>
              保存配置
            </Button>
            <Button variant="danger" onClick={() => saveCurrentLlmSettings(true)} disabled={saveLlm.isPending}>
              清除后台 Key
            </Button>
            {llmMessage ? <span className="self-center text-sm text-slate-600">{llmMessage}</span> : null}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">最近 AI 调度调用</div>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1 text-sm">
              {(usage?.recent ?? []).length === 0 ? (
                <div className="rounded border p-3 text-slate-500">暂无调用记录</div>
              ) : (
                usage?.recent.map((entry) => (
                  <div key={`${entry.at}-${entry.status}-${entry.totalTokens}`} className="rounded border p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{statusText(entry.status)}</span>
                      <span className="text-xs text-slate-500">{new Date(entry.at).toLocaleString("zh-CN")}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {entry.model} | tokens {entry.totalTokens} | {formatUsd(entry.estimatedCostUsd)}
                    </div>
                    {entry.reason ? <div className="mt-1 line-clamp-2 text-xs text-amber-700">{entry.reason}</div> : null}
                  </div>
                ))
              )}
            </div>
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
          {actionMessage ? <div className="text-sm text-slate-600 md:col-span-4">{actionMessage}</div> : null}
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
