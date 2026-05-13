"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/shared/button";
import { Card, CardContent, CardTitle } from "@/components/shared/card";
import { Input } from "@/components/shared/input";
import { apiFetch } from "@/lib/api/client";

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

const actionLabels: Record<"sync" | "recompute" | "analytics-rollup" | "cleanup", string> = {
  sync: "日历同步",
  recompute: "动态重排",
  "analytics-rollup": "统计汇总",
  cleanup: "清理任务"
};

function formatUsd(value: number) {
  return `$${value.toFixed(6)}`;
}

function statusLabel(value?: string) {
  if (!value) return "检查中";
  if (value === "up") return "正常";
  if (value === "degraded") return "降级";
  if (value === "down") return "异常";
  return value;
}

function statusClass(value?: string) {
  if (value === "up") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (value === "degraded") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (value === "down") return "bg-red-50 text-red-700 ring-red-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function sourceLabel(value?: "runtime" | "env" | "none") {
  if (value === "runtime") return "后台保存";
  if (value === "env") return "环境变量";
  return "未配置";
}

function usageStatusLabel(status: "success" | "fallback" | "error") {
  if (status === "success") return "成功";
  if (status === "fallback") return "已回退到本地规则";
  return "失败";
}

function StatCard({ title, value, note }: { title: string; value: string | number; note?: string }) {
  return (
    <Card className="p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
      {note ? <div className="mt-1 text-xs text-slate-500">{note}</div> : null}
    </Card>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function OpsConsole() {
  const router = useRouter();
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
      apiFetch<{ action: keyof typeof actionLabels; warning?: string; jobId?: string; queued?: boolean }>("/api/admin/actions", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: (result) => {
      const label = actionLabels[result.action] ?? result.action;
      if (result.warning) {
        setActionMessage(`${label}：${result.warning}`);
      } else if (result.jobId) {
        setActionMessage(`${label}：已加入队列，作业 ID ${result.jobId}`);
      } else {
        setActionMessage(`${label}：已完成`);
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
      setLlmMessage("配置已保存。后续 AI 重排会自动使用这里的设置。");
      void llm.refetch();
    },
    onError: (error: Error) => setLlmMessage(error.message)
  });

  const h = health.data;
  const o = overview.data;
  const usage = llm.data;

  const healthSummary = useMemo(() => {
    const values = [h?.db, h?.scheduler, h?.queue].filter(Boolean);
    if (values.length === 0) return { label: "检查中", className: statusClass() };
    if (values.includes("down")) return { label: "有异常", className: statusClass("down") };
    if (values.includes("degraded")) return { label: "部分降级", className: statusClass("degraded") };
    return { label: "全部正常", className: statusClass("up") };
  }, [h]);

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
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <div className="text-xs font-medium text-slate-500">Reclaim 运营维护中心</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">后台控制台</h1>
            <p className="mt-1 text-sm text-slate-500">监控系统运行、AI 调度用量和维护作业。这里与用户前端分开。</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${healthSummary.className}`}>{healthSummary.label}</span>
            <Button variant="secondary" onClick={logout}>退出后台</Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="用户总数" value={o?.users ?? 0} note="平台当前用户规模" />
          <StatCard title="已连接日历" value={o?.calendars ?? 0} note="Google / Outlook 等外部日历" />
          <StatCard title="未来 7 天事件" value={o?.upcomingEvents7d ?? 0} note="用于观察排程活跃度" />
          <StatCard title="活跃预约链接" value={o?.linksActive ?? 0} note="正在使用的 scheduling links" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1.45fr]">
          <Card className="p-5">
            <SectionHeader title="系统健康" description="每 15 秒自动刷新。异常或降级时优先检查 Docker、Redis、调度服务。" />
            <CardContent className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div>
                  <div className="font-medium">数据库</div>
                  <div className="text-xs text-slate-500">PostgreSQL / Prisma</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm ring-1 ${statusClass(h?.db)}`}>{statusLabel(h?.db)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div>
                  <div className="font-medium">调度服务</div>
                  <div className="text-xs text-slate-500">FastAPI / OR-Tools / 规则引擎</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm ring-1 ${statusClass(h?.scheduler)}`}>{statusLabel(h?.scheduler)}</span>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">队列服务</div>
                    <div className="text-xs text-slate-500">BullMQ / Redis</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm ring-1 ${statusClass(h?.queue)}`}>{statusLabel(h?.queue)}</span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  模式：{h?.queueDetails?.mode ?? "-"}；Redis：{h?.queueDetails?.redisVersion ?? "-"}
                </div>
                {h?.queueDetails?.reason ? <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">{h.queueDetails.reason}</div> : null}
              </div>
            </CardContent>
          </Card>

          <Card className="p-5">
            <SectionHeader title="DeepSeek API 配置与本地用量" description="这里统计的是本软件实际调用记录，不等于 DeepSeek 官方账户剩余额度。真实余额请到 DeepSeek 控制台查看。" />
            <CardContent className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <StatCard title="配置状态" value={usage?.config.configured ? "已配置" : "未配置"} note={`来源：${sourceLabel(usage?.config.source)}`} />
                <StatCard title="调用次数" value={usage?.totals.calls ?? 0} note={`成功 ${usage?.totals.success ?? 0} / 回退 ${usage?.totals.fallback ?? 0} / 失败 ${usage?.totals.error ?? 0}`} />
                <StatCard title="Token 用量" value={usage?.totals.totalTokens ?? 0} note={`输入 ${usage?.totals.promptTokens ?? 0} / 输出 ${usage?.totals.completionTokens ?? 0}`} />
                <StatCard title="预估费用" value={formatUsd(usage?.totals.estimatedCostUsd ?? 0)} note="按下方单价估算" />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                当前 Key：{usage?.config.maskedKey ?? "未设置"}。本页不会显示完整 Key，也不会把 Key 上传到 GitHub。
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium">API Key</span>
                  <Input type="password" value={apiKey} placeholder="输入新的 DeepSeek API Key；留空则保留当前 Key" onChange={(event) => setApiKey(event.target.value)} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">模型名称</span>
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

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => saveCurrentLlmSettings(false)} disabled={saveLlm.isPending}>保存 API 配置</Button>
                <Button variant="danger" onClick={() => saveCurrentLlmSettings(true)} disabled={saveLlm.isPending}>清除后台 Key</Button>
                {llmMessage ? <span className="text-sm text-slate-600">{llmMessage}</span> : null}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="p-5">
            <SectionHeader title="系统维护操作" description="手动触发同步、重排、统计汇总和清理任务。" />
            <CardContent className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" onClick={() => action.mutate({ action: "sync" })}>同步日历</Button>
              <Button variant="secondary" onClick={() => action.mutate({ action: "recompute" })}>触发动态重排</Button>
              <Button variant="secondary" onClick={() => action.mutate({ action: "analytics-rollup" })}>汇总统计</Button>
              <Button variant="secondary" onClick={() => action.mutate({ action: "cleanup" })}>清理临时数据</Button>
              {actionMessage ? <div className="sm:col-span-2 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{actionMessage}</div> : null}
            </CardContent>
          </Card>

          <Card className="p-5">
            <SectionHeader title="最近 AI 调度调用" description="用于排查 AI 重排是否成功、是否回退到本地规则。" />
            <CardContent className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1 text-sm">
              {(usage?.recent ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-slate-500">暂无 AI 调用记录</div>
              ) : (
                usage?.recent.map((entry) => (
                  <div key={`${entry.at}-${entry.status}-${entry.totalTokens}`} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{usageStatusLabel(entry.status)}</span>
                      <span className="text-xs text-slate-500">{new Date(entry.at).toLocaleString("zh-CN")}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">模型：{entry.model}；Token：{entry.totalTokens}；费用：{formatUsd(entry.estimatedCostUsd)}</div>
                    {entry.reason ? <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">{entry.reason}</div> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="p-5">
            <SectionHeader title="最近重排作业" description="展示后台作业队列中最近产生的重排任务。" />
            <CardContent className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1 text-sm">
              {(jobs.data?.jobs ?? []).length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-4 text-slate-500">暂无作业记录</div> : null}
              {(jobs.data?.jobs ?? []).map((job) => (
                <div key={job.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="font-medium">{job.triggerType}</div>
                  <div className="mt-1 text-xs text-slate-500">状态：{job.status}；ID：{job.id}；时间：{new Date(job.requestedAt).toLocaleString("zh-CN")}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="p-5">
            <SectionHeader title="最近调度决策" description="展示系统为什么移动或保留某个时间块。" />
            <CardContent className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1 text-sm">
              {(jobs.data?.decisions ?? []).length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-4 text-slate-500">暂无决策记录</div> : null}
              {(jobs.data?.decisions ?? []).map((decision) => (
                <div key={decision.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="font-medium">{decision.decisionType} - {decision.smartEventId}</div>
                  <div className="mt-1 text-xs text-slate-500">{decision.reasonText}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
