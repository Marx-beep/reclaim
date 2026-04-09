"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarBoard, type CalendarEvent } from "@/components/calendar/calendar-board";
import { SmartSuggestionsPanel } from "@/components/dashboard/smart-suggestions";
import { EventDetailDrawer } from "@/components/dashboard/event-detail-drawer";
import { QuickCreatePanel } from "@/components/dashboard/quick-create";
import { ScheduleImportPanel } from "@/components/dashboard/schedule-import-panel";
import { apiFetch } from "@/lib/api/client";

type TaskRecord = {
  id: string;
  smartEvent: {
    title: string;
    status: "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "MISSED";
    dueAt: string | null;
  };
};

function toLocalInputValue(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function toIso(input: string) {
  return new Date(input).toISOString();
}

function parseTags(input: string) {
  return input
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function CalendarWorkspacePage() {
  const queryClient = useQueryClient();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [slotStart, setSlotStart] = useState(toLocalInputValue(new Date(Date.now() + 60 * 60_000)));
  const [slotEnd, setSlotEnd] = useState(toLocalInputValue(new Date(Date.now() + 120 * 60_000)));
  const [tagInput, setTagInput] = useState("");
  const [schedulerFeedback, setSchedulerFeedback] = useState<string | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<Array<{ id: string; title: string; startAt: string; endAt: string; metadata?: Record<string, unknown> }>>("/api/events")
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiFetch<TaskRecord[]>("/api/tasks")
  });

  const events: CalendarEvent[] = (eventsQuery.data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    start: item.startAt,
    end: item.endAt,
    extendedProps: item.metadata
  }));

  const selectableTasks = useMemo(
    () => (tasksQuery.data ?? []).filter((item) => !["DONE", "CANCELLED"].includes(item.smartEvent.status)),
    [tasksQuery.data]
  );

  useEffect(() => {
    if (!schedulerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [schedulerOpen]);

  useEffect(() => {
    if (!selectedRange) return;
    setSlotStart(toLocalInputValue(new Date(selectedRange.start)));
    setSlotEnd(toLocalInputValue(new Date(selectedRange.end)));
    setSchedulerOpen(true);
    setSchedulerFeedback(null);
  }, [selectedRange]);

  useEffect(() => {
    const taskIdFromQuery = new URLSearchParams(window.location.search).get("taskId");
    if (!taskIdFromQuery) return;
    setSelectedTaskId(taskIdFromQuery);
  }, []);

  useEffect(() => {
    if (!schedulerOpen || selectableTasks.length === 0) return;
    if (!selectedTaskId || !selectableTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(selectableTasks[0].id);
    }
  }, [schedulerOpen, selectableTasks, selectedTaskId]);

  const scheduleTask = useMutation({
    mutationFn: async () => {
      if (!selectedTaskId) throw new Error("请先选择任务");
      if (!slotStart || !slotEnd) throw new Error("请选择开始和结束时间");
      const startAtIso = toIso(slotStart);
      const endAtIso = toIso(slotEnd);
      if (new Date(endAtIso) <= new Date(startAtIso)) {
        throw new Error("结束时间必须晚于开始时间");
      }

      return apiFetch(`/api/tasks/${selectedTaskId}/schedule`, {
        method: "PATCH",
        body: JSON.stringify({
          startAt: startAtIso,
          endAt: endAtIso,
          tags: parseTags(tagInput),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        })
      });
    },
    onSuccess: async () => {
      setSchedulerFeedback("任务已安排到选定时间段");
      setSchedulerOpen(false);
      setTagInput("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] })
      ]);
    },
    onError: (error: Error) => setSchedulerFeedback(error.message)
  });

  const submitSchedule = (event: FormEvent) => {
    event.preventDefault();
    scheduleTask.mutate();
  };

  return (
    <>
      <div className="mx-auto w-full max-w-[1680px] space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">日历工作台</h2>
          <p className="mt-1 text-sm text-slate-600">在日历里拖拽选择时间段，可直接弹窗选择任务并添加标签。</p>
          {schedulerFeedback ? <div className="mt-2 text-xs text-emerald-700">{schedulerFeedback}</div> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <CalendarBoard events={events} onSelectEvent={setSelectedEvent} onSelectTimeRange={setSelectedRange} />
          </div>

          <div className="space-y-3 xl:sticky xl:top-4 xl:self-start">
            <SmartSuggestionsPanel />
            <QuickCreatePanel selectedRange={selectedRange} />
            <ScheduleImportPanel />
          </div>
        </div>
      </div>

      {schedulerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-slate-900">选择任务并安排时间</h3>
              <p className="text-xs text-slate-600">选定任务后会自动更新到该时间段，并写入标签。</p>
            </div>

            <form onSubmit={submitSchedule} className="space-y-3">
              <label className="block text-xs text-slate-600">
                任务
                <select
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm"
                  value={selectedTaskId}
                  disabled={selectableTasks.length === 0}
                  onChange={(event) => setSelectedTaskId(event.target.value)}
                >
                  <option value="">{selectableTasks.length === 0 ? "暂无可安排任务" : "请选择任务"}</option>
                  {selectableTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.smartEvent.title} {task.smartEvent.dueAt ? `(截止 ${new Date(task.smartEvent.dueAt).toLocaleDateString("zh-CN")})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-xs text-slate-600">
                  开始
                  <input
                    type="datetime-local"
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm"
                    value={slotStart}
                    onChange={(event) => setSlotStart(event.target.value)}
                  />
                </label>
                <label className="block text-xs text-slate-600">
                  结束
                  <input
                    type="datetime-local"
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm"
                    value={slotEnd}
                    onChange={(event) => setSlotEnd(event.target.value)}
                  />
                </label>
              </div>

              <label className="block text-xs text-slate-600">
                标签（逗号分隔）
                <input
                  type="text"
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm"
                  placeholder="例如：深度工作, 客户交付"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                />
              </label>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="h-10 rounded-md border border-slate-300 px-4 text-sm text-slate-700"
                  onClick={() => setSchedulerOpen(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-white"
                  disabled={scheduleTask.isPending || selectableTasks.length === 0}
                >
                  {scheduleTask.isPending ? "安排中..." : "确认安排"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <EventDetailDrawer event={selectedEvent} open={Boolean(selectedEvent)} onClose={() => setSelectedEvent(null)} />
    </>
  );
}
