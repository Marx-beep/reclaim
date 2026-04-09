"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardTitle } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { apiFetch } from "@/lib/api/client";
import { t } from "@/lib/i18n";

function toLocalInputValue(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function toIso(input: string) {
  return new Date(input).toISOString();
}

function defaultTimeWindow(minutesFromNowStart: number, minutesFromNowEnd: number) {
  return {
    startAt: toLocalInputValue(new Date(Date.now() + minutesFromNowStart * 60_000)),
    endAt: toLocalInputValue(new Date(Date.now() + minutesFromNowEnd * 60_000))
  };
}

type HabitPreset = "DAILY" | "WEEKDAY" | "WEEKLY";

function habitRuleFromPreset(preset: HabitPreset) {
  if (preset === "WEEKDAY") return "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
  if (preset === "WEEKLY") return "FREQ=WEEKLY;INTERVAL=1";
  return "FREQ=DAILY;INTERVAL=1";
}

export function QuickCreatePanel({ selectedRange }: { selectedRange?: { start: string; end: string } | null }) {
  const queryClient = useQueryClient();
  const copy = t("dashboard");

  const initialTaskWindow = defaultTimeWindow(60, 120);
  const initialHabitWindow = defaultTimeWindow(120, 150);

  const [taskTitle, setTaskTitle] = useState("准备下周冲刺计划");
  const [taskStartAt, setTaskStartAt] = useState(initialTaskWindow.startAt);
  const [taskEndAt, setTaskEndAt] = useState(initialTaskWindow.endAt);
  const [taskDueAt, setTaskDueAt] = useState(toLocalInputValue(new Date(Date.now() + 24 * 60 * 60_000)));
  const [taskPriority, setTaskPriority] = useState<"P1" | "P2" | "P3" | "P4">("P2");

  const [habitTitle, setHabitTitle] = useState("每日复盘 30 分钟");
  const [habitStartAt, setHabitStartAt] = useState(initialHabitWindow.startAt);
  const [habitEndAt, setHabitEndAt] = useState(initialHabitWindow.endAt);
  const [habitPreset, setHabitPreset] = useState<HabitPreset>("DAILY");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRange) return;
    const start = new Date(selectedRange.start);
    const end = new Date(selectedRange.end);
    setTaskStartAt(toLocalInputValue(start));
    setTaskEndAt(toLocalInputValue(end));
    setHabitStartAt(toLocalInputValue(start));
    setHabitEndAt(toLocalInputValue(end));
    setFeedback(copy.manualRangeHint);
  }, [selectedRange, copy.manualRangeHint]);

  const createTask = useMutation({
    mutationFn: async () => {
      const startAtIso = toIso(taskStartAt);
      const endAtIso = toIso(taskEndAt);
      if (new Date(endAtIso) <= new Date(startAtIso)) {
        throw new Error("任务结束时间必须晚于开始时间");
      }

      return apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle,
          estimateMinutes: Math.max(15, Math.round((new Date(endAtIso).getTime() - new Date(startAtIso).getTime()) / 60_000)),
          startAt: startAtIso,
          endAt: endAtIso,
          dueAt: toIso(taskDueAt),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          priority: taskPriority
        })
      });
    },
    onSuccess: async () => {
      setFeedback("任务已创建并触发自动排程");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] })
      ]);
    },
    onError: (error: Error) => setFeedback(error.message)
  });

  const createHabit = useMutation({
    mutationFn: async () => {
      const startAtIso = toIso(habitStartAt);
      const endAtIso = toIso(habitEndAt);
      if (new Date(endAtIso) <= new Date(startAtIso)) {
        throw new Error("习惯结束时间必须晚于开始时间");
      }

      return apiFetch("/api/habits", {
        method: "POST",
        body: JSON.stringify({
          title: habitTitle,
          startAt: startAtIso,
          endAt: endAtIso,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          rrule: habitRuleFromPreset(habitPreset),
          minDurationMinutes: Math.max(15, Math.round((new Date(endAtIso).getTime() - new Date(startAtIso).getTime()) / 60_000)),
          priority: "P3"
        })
      });
    },
    onSuccess: async () => {
      setFeedback("习惯已创建并写入日历");
      await queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error: Error) => setFeedback(error.message)
  });

  const createFocus = useMutation({
    mutationFn: () =>
      apiFetch("/api/focus", {
        method: "POST",
        body: JSON.stringify({
          title: "自动专注时间",
          startAt: toIso(taskEndAt),
          durationMinutes: 90,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          priority: "P2"
        })
      }),
    onSuccess: () => {
      setFeedback("专注时间已生成");
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error: Error) => setFeedback(error.message)
  });

  const onTaskSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    createTask.mutate();
  };

  const onHabitSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    createHabit.mutate();
  };

  return (
    <Card>
      <CardTitle>{copy.quickCreate}</CardTitle>
      <CardContent className="space-y-4">
        <form onSubmit={onTaskSubmit} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="text-xs font-medium uppercase text-slate-500">{copy.task}</div>
          <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-600">
              {copy.manualStart}
              <Input type="datetime-local" value={taskStartAt} onChange={(event) => setTaskStartAt(event.target.value)} />
            </label>
            <label className="text-xs text-slate-600">
              {copy.manualEnd}
              <Input type="datetime-local" value={taskEndAt} onChange={(event) => setTaskEndAt(event.target.value)} />
            </label>
          </div>

          <label className="block text-xs text-slate-600">
            {copy.manualDue}
            <Input type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} />
          </label>

          <label className="block text-xs text-slate-600">
            {copy.manualPriority}
            <select
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
              value={taskPriority}
              onChange={(event) => setTaskPriority(event.target.value as "P1" | "P2" | "P3" | "P4")}
            >
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
            </select>
          </label>

          <Button type="submit" variant="secondary" className="w-full" disabled={createTask.isPending}>
            {createTask.isPending ? copy.manualCreating : copy.addTask}
          </Button>
        </form>

        <form onSubmit={onHabitSubmit} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="text-xs font-medium uppercase text-slate-500">{copy.habit}</div>
          <Input value={habitTitle} onChange={(event) => setHabitTitle(event.target.value)} />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-600">
              {copy.manualStart}
              <Input type="datetime-local" value={habitStartAt} onChange={(event) => setHabitStartAt(event.target.value)} />
            </label>
            <label className="text-xs text-slate-600">
              {copy.manualEnd}
              <Input type="datetime-local" value={habitEndAt} onChange={(event) => setHabitEndAt(event.target.value)} />
            </label>
          </div>

          <label className="block text-xs text-slate-600">
            习惯频率
            <select
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
              value={habitPreset}
              onChange={(event) => setHabitPreset(event.target.value as HabitPreset)}
            >
              <option value="DAILY">每天</option>
              <option value="WEEKDAY">工作日</option>
              <option value="WEEKLY">每周</option>
            </select>
          </label>

          <Button type="submit" variant="secondary" className="w-full" disabled={createHabit.isPending}>
            {createHabit.isPending ? copy.manualCreating : copy.addHabit}
          </Button>
        </form>

        <Button className="w-full" onClick={() => createFocus.mutate()} disabled={createFocus.isPending}>
          {createFocus.isPending ? copy.manualCreating : copy.generateFocus}
        </Button>

        {feedback ? <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">{feedback}</div> : null}
      </CardContent>
    </Card>
  );
}
