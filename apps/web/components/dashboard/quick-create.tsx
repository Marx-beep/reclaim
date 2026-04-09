"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardTitle } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { apiFetch } from "@/lib/api/client";
import { t } from "@/lib/i18n";

function isoAfter(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function toLocalInputValue(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function minutesBetween(startAt: string, endAt: string) {
  const minutes = Math.floor((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000);
  return Math.max(15, minutes);
}

type ManualType = "PLAN" | "EVENT";

export function QuickCreatePanel({ selectedRange }: { selectedRange?: { start: string; end: string } | null }) {
  const queryClient = useQueryClient();
  const copy = t("dashboard");
  const [taskTitle, setTaskTitle] = useState("准备下周冲刺计划");
  const [habitTitle, setHabitTitle] = useState("每日复盘 30 分钟");
  const [manualType, setManualType] = useState<ManualType>("PLAN");
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualStartAt, setManualStartAt] = useState(toLocalInputValue(new Date(Date.now() + 60 * 60_000)));
  const [manualEndAt, setManualEndAt] = useState(toLocalInputValue(new Date(Date.now() + 120 * 60_000)));
  const [manualDueAt, setManualDueAt] = useState(toLocalInputValue(new Date(Date.now() + 24 * 60 * 60_000)));
  const [manualPriority, setManualPriority] = useState<"P1" | "P2" | "P3" | "P4">("P2");
  const [manualHint, setManualHint] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRange) return;
    setManualStartAt(toLocalInputValue(new Date(selectedRange.start)));
    setManualEndAt(toLocalInputValue(new Date(selectedRange.end)));
    setManualHint(copy.manualRangeHint);
  }, [selectedRange, copy.manualRangeHint]);

  const createTask = useMutation({
    mutationFn: () =>
      apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle,
          estimateMinutes: 60,
          startAt: isoAfter(30),
          endAt: isoAfter(90),
          dueAt: isoAfter(24 * 60),
          timezone: "Asia/Shanghai",
          priority: "P2"
        })
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] })
  });

  const createHabit = useMutation({
    mutationFn: () =>
      apiFetch("/api/habits", {
        method: "POST",
        body: JSON.stringify({
          title: habitTitle,
          startAt: isoAfter(120),
          endAt: isoAfter(150),
          timezone: "Asia/Shanghai",
          rrule: "FREQ=DAILY;INTERVAL=1",
          minDurationMinutes: 30,
          priority: "P3"
        })
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] })
  });

  const createFocus = useMutation({
    mutationFn: () =>
      apiFetch("/api/focus", {
        method: "POST",
        body: JSON.stringify({
          title: "自动专注时间",
          startAt: isoAfter(180),
          durationMinutes: 90,
          timezone: "Asia/Shanghai",
          priority: "P2"
        })
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] })
  });

  const onTaskSubmit = (event: FormEvent) => {
    event.preventDefault();
    createTask.mutate();
  };

  const onHabitSubmit = (event: FormEvent) => {
    event.preventDefault();
    createHabit.mutate();
  };

  const createManualPlan = useMutation({
    mutationFn: async () => {
      const startAt = new Date(manualStartAt);
      const endAt = new Date(manualEndAt);
      if (!manualTitle.trim()) throw new Error("请输入计划名称");
      if (endAt <= startAt) throw new Error("结束时间必须晚于开始时间");

      return apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: manualTitle.trim(),
          description: manualDescription.trim() || undefined,
          estimateMinutes: minutesBetween(startAt.toISOString(), endAt.toISOString()),
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          dueAt: new Date(manualDueAt || manualEndAt).toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          priority: manualPriority
        })
      });
    },
    onSuccess: async () => {
      setManualHint(copy.manualCreated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] })
      ]);
    },
    onError: (error: Error) => setManualHint(error.message)
  });

  const createManualEvent = useMutation({
    mutationFn: async () => {
      const startAt = new Date(manualStartAt);
      const endAt = new Date(manualEndAt);
      if (!manualTitle.trim()) throw new Error("请输入事件名称");
      if (endAt <= startAt) throw new Error("结束时间必须晚于开始时间");

      return apiFetch("/api/events", {
        method: "POST",
        body: JSON.stringify({
          type: "MEETING",
          title: manualTitle.trim(),
          description: manualDescription.trim() || undefined,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          priority: manualPriority,
          flexibility: "FIXED",
          lockState: "BUSY"
        })
      });
    },
    onSuccess: async () => {
      setManualHint(copy.manualCreated);
      await queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error: Error) => setManualHint(error.message)
  });

  const onManualSubmit = (event: FormEvent) => {
    event.preventDefault();
    setManualHint(null);
    if (manualType === "PLAN") {
      createManualPlan.mutate();
      return;
    }
    createManualEvent.mutate();
  };

  return (
    <Card>
      <CardTitle>{copy.quickCreate}</CardTitle>
      <CardContent className="space-y-4">
        <form onSubmit={onTaskSubmit} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="text-xs font-medium uppercase text-slate-500">{copy.task}</div>
          <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
          <Button type="submit" variant="secondary" className="w-full">
            {copy.addTask}
          </Button>
        </form>

        <form onSubmit={onHabitSubmit} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="text-xs font-medium uppercase text-slate-500">{copy.habit}</div>
          <Input value={habitTitle} onChange={(event) => setHabitTitle(event.target.value)} />
          <Button type="submit" variant="secondary" className="w-full">
            {copy.addHabit}
          </Button>
        </form>

        <Button className="w-full" onClick={() => createFocus.mutate()}>
          {copy.generateFocus}
        </Button>

        <div className="border-t border-slate-200 pt-3">
          <details>
            <summary className="cursor-pointer text-xs font-medium uppercase text-slate-500">{copy.manualCreate}</summary>
            <form onSubmit={onManualSubmit} className="mt-3 space-y-2">
              <label className="block text-xs text-slate-600">
                {copy.manualType}
                <select
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
                  value={manualType}
                  onChange={(event) => setManualType(event.target.value as ManualType)}
                >
                  <option value="PLAN">{copy.manualPlan}</option>
                  <option value="EVENT">{copy.manualEvent}</option>
                </select>
              </label>

              <label className="block text-xs text-slate-600">
                {copy.manualTitle}
                <Input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} />
              </label>

              <label className="block text-xs text-slate-600">
                {copy.manualDescription}
                <textarea
                  className="mt-1 min-h-16 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  value={manualDescription}
                  onChange={(event) => setManualDescription(event.target.value)}
                />
              </label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-xs text-slate-600">
                  {copy.manualStart}
                  <Input type="datetime-local" value={manualStartAt} onChange={(event) => setManualStartAt(event.target.value)} />
                </label>
                <label className="block text-xs text-slate-600">
                  {copy.manualEnd}
                  <Input type="datetime-local" value={manualEndAt} onChange={(event) => setManualEndAt(event.target.value)} />
                </label>
              </div>

              {manualType === "PLAN" ? (
                <label className="block text-xs text-slate-600">
                  {copy.manualDue}
                  <Input type="datetime-local" value={manualDueAt} onChange={(event) => setManualDueAt(event.target.value)} />
                </label>
              ) : null}

              <label className="block text-xs text-slate-600">
                {copy.manualPriority}
                <select
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
                  value={manualPriority}
                  onChange={(event) => setManualPriority(event.target.value as "P1" | "P2" | "P3" | "P4")}
                >
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                  <option value="P4">P4</option>
                </select>
              </label>

              <Button
                type="submit"
                className="w-full"
                disabled={createManualPlan.isPending || createManualEvent.isPending}
              >
                {createManualPlan.isPending || createManualEvent.isPending
                  ? copy.manualCreating
                  : manualType === "PLAN"
                    ? copy.manualCreatePlan
                    : copy.manualCreateEvent}
              </Button>
            </form>

            {manualHint ? <div className="mt-2 text-xs text-slate-600">{manualHint}</div> : null}
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
