import { useEffect, useState } from "react";
import { AlertTriangle, Clock3, Lock, Sparkles, X } from "lucide-react";
import type { CalendarEvent, TaskItem } from "../types/calendar";
import { energyLabel, formatEventTimeRange, formatTime, priorityLabel } from "../utils/calendarUtils";

interface EventDetailModalProps {
  event: CalendarEvent | null;
  linkedTask: TaskItem | null;
  onClose: () => void;
  onAdjustDuration: (eventId: string, nextDuration: number) => void;
  onMarkDone: (eventId: string) => void;
  onReschedule: (eventId: string) => void;
  onCannotContinue: (eventId: string) => void;
  onEarlyComplete: (eventId: string, completedAtHour: number) => void;
  onMarkOvertime: (eventId: string, overtimeHours: number) => void;
  onDelete: (eventId: string) => void;
}

const typeLabels: Record<CalendarEvent["type"], string> = {
  focus: "专注时间",
  task: "任务",
  meeting: "会议",
  habit: "习惯",
  break: "休息 / 午餐",
  buffer: "缓冲"
};

export function EventDetailModal({
  event,
  linkedTask,
  onClose,
  onAdjustDuration,
  onMarkDone,
  onReschedule,
  onCannotContinue,
  onEarlyComplete,
  onMarkOvertime,
  onDelete
}: EventDetailModalProps) {
  const [draftDuration, setDraftDuration] = useState(1);
  const [earlyCompleteAt, setEarlyCompleteAt] = useState(1);
  const [overtimeHours, setOvertimeHours] = useState(0.75);

  useEffect(() => {
    if (!event) {
      return;
    }
    setDraftDuration(event.duration);
    setEarlyCompleteAt(Number((event.startHour + Math.max(0.25, event.duration * 0.65)).toFixed(2)));
    setOvertimeHours(0.75);
  }, [event]);

  if (!event) {
    return null;
  }

  const locked = event.fixed || !event.movable;
  const maxDuration = Number(Math.max(0.25, 19 - event.startHour).toFixed(2));
  const canAdapt = !locked && event.status !== "completed" && event.status !== "unscheduled";

  const commitDurationChange = () => {
    if (!canAdapt || draftDuration === event.duration) {
      return;
    }
    onAdjustDuration(event.id, draftDuration);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/20 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-[430px] flex-col border-l border-slate-200 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.18)]"
        onClick={(eventClick) => eventClick.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{typeLabels[event.type]}</div>
              <h2 className="mt-1 text-[22px] font-semibold text-slate-950">{event.title}</h2>
            </div>
            <button type="button" className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:text-slate-900" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">{priorityLabel(event.priority)}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">{energyLabel(event.energyLevel)}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">
              {locked ? "固定事件" : event.flexible ? "可移动 / 可压缩" : "普通事件"}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-[12px] text-slate-600">
              <Clock3 className="h-4 w-4" />
              <span>{formatEventTimeRange(event)}</span>
            </div>
            <div className="mt-2 text-[12px] text-slate-600">时长：{event.duration} 小时</div>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-slate-600">
              {locked ? <Lock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span>{locked ? "固定承诺，不参与拖动重排" : "灵活时间块，可被 AI 调整"}</span>
            </div>
            {linkedTask ? <div className="mt-2 text-[12px] text-slate-600">任务剩余：{Math.max(linkedTask.remainingMinutes, Math.round(event.duration * 60))} 分钟</div> : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">动态时长</div>
            <div className="mt-2 text-[13px] leading-6 text-slate-600">直接拖动这里的滑块，或在日历里拉时间块底边，系统会把后续安排一起重排。</div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between text-[12px] font-medium text-slate-700">
                <span>{draftDuration.toFixed(draftDuration % 1 === 0 ? 0 : 2)} 小时</span>
                <span>结束于 {formatTime(event.startHour + draftDuration)}</span>
              </div>
              <input
                type="range"
                min={0.25}
                max={maxDuration}
                step={0.25}
                value={draftDuration}
                disabled={!canAdapt}
                onChange={(rangeEvent) => setDraftDuration(Number(rangeEvent.target.value))}
                onMouseUp={commitDurationChange}
                onTouchEnd={commitDurationChange}
                onKeyUp={(rangeEvent) => {
                  if (rangeEvent.key === "ArrowLeft" || rangeEvent.key === "ArrowRight") {
                    commitDurationChange();
                  }
                }}
                className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
              />
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>15 分钟</span>
                <span>最长 {maxDuration.toFixed(maxDuration % 1 === 0 ? 0 : 2)} 小时</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">提前完成 / 标记超时</div>
            <div className="mt-2 text-[13px] leading-6 text-slate-600">这两个动作会直接触发动态重排。提前完成会释放空档并前移后续任务，超时会续上未完成部分并加缓冲。</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[12px] font-medium text-slate-700">提前完成于</div>
                <input
                  type="range"
                  min={event.startHour + 0.25}
                  max={event.startHour + event.duration}
                  step={0.25}
                  value={earlyCompleteAt}
                  disabled={!canAdapt}
                  onChange={(rangeEvent) => setEarlyCompleteAt(Number(rangeEvent.target.value))}
                  className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                />
                <div className="mt-2 text-[12px] text-slate-600">{formatTime(earlyCompleteAt)}</div>
                <button
                  type="button"
                  disabled={!canAdapt}
                  className="mt-3 w-full rounded-xl bg-emerald-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => onEarlyComplete(event.id, earlyCompleteAt)}
                >
                  提前完成
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-2 text-[12px] font-medium text-slate-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>超时续上</span>
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={2}
                  step={0.25}
                  value={overtimeHours}
                  disabled={!canAdapt}
                  onChange={(rangeEvent) => setOvertimeHours(Number(rangeEvent.target.value))}
                  className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                />
                <div className="mt-2 text-[12px] text-slate-600">追加 {overtimeHours} 小时</div>
                <button
                  type="button"
                  disabled={!canAdapt}
                  className="mt-3 w-full rounded-xl bg-rose-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => onMarkOvertime(event.id, overtimeHours)}
                >
                  标记超时
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-amber-200 bg-[linear-gradient(180deg,#fff8eb_0%,#fffdf6_100%)] px-4 py-4 shadow-[0_10px_30px_rgba(245,158,11,0.10)]">
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-amber-700">重点动作</div>
            <div className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-slate-950">干不下去了</div>
            <div className="mt-2 text-[13px] leading-6 text-slate-700">
              当你感到疲惫、卡住或无法专注时，点这个按钮。系统会自动插入恢复时间或轻量任务，再把后续高强度工作后移。
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-amber-100 bg-white/80 p-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">当前任务</div>
                <div className="mt-1 text-[13px] font-medium text-slate-900">
                  {formatTime(event.startHour)} - {formatTime(event.startHour + event.duration)} {event.title}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                  <div className="text-[11px] font-semibold text-amber-900">先降强度</div>
                  <div className="mt-1 text-[11px] leading-5 text-amber-800">把当前任务切成更短的一段，先完成一个小闭环。</div>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                  <div className="text-[11px] font-semibold text-amber-900">再给恢复</div>
                  <div className="mt-1 text-[11px] leading-5 text-amber-800">自动插入休息或轻量任务，先把压力降下来。</div>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                  <div className="text-[11px] font-semibold text-amber-900">点击后看结果</div>
                  <div className="mt-1 text-[11px] leading-5 text-amber-800">触发后会在右侧生成完整恢复方案，而不是现在先预演。</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!canAdapt}
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_100%)] px-4 py-3 text-[15px] font-semibold text-white shadow-[0_16px_36px_rgba(249,115,22,0.28)] transition hover:translate-y-[-1px] hover:shadow-[0_18px_40px_rgba(249,115,22,0.34)] disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => onCannotContinue(event.id)}
            >
              触发并查看恢复方案
            </button>
            <div className="mt-2 text-[11px] text-amber-800">点击后会立刻应用到日历，并在右侧展开更详细的结果说明。</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-emerald-700" onClick={() => onMarkDone(event.id)}>
            标记完成
          </button>
          <button type="button" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-indigo-700" onClick={() => onReschedule(event.id)}>
            重新安排
          </button>
          <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950" onClick={() => onDelete(event.id)}>
            删除
          </button>
          <div className="rounded-xl border border-transparent bg-transparent" />
          <button type="button" className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-100" onClick={onClose}>
            <X className="h-4 w-4" />
            关闭抽屉
          </button>
        </div>
      </div>
    </div>
  );
}
