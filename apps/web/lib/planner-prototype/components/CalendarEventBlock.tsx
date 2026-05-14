import type { DraggableAttributes } from "@dnd-kit/core";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import {
  AlertTriangle,
  Check,
  CheckSquare,
  Clock3,
  Coffee,
  GripHorizontal,
  Lock,
  MoreHorizontal,
  Repeat,
  Sparkles,
  Users
} from "lucide-react";
import type { CalendarEvent, ReplanChangeType } from "../types/calendar";
import { formatEventTimeRange, priorityLabel } from "../utils/calendarUtils";

interface CalendarEventBlockProps {
  event: CalendarEvent;
  className?: string;
  style?: CSSProperties;
  isDragging?: boolean;
  isOverlay?: boolean;
  isOptimizing?: boolean;
  isMuted?: boolean;
  changeType?: ReplanChangeType;
  dragAttributes?: DraggableAttributes;
  dragListeners?: Record<string, unknown>;
  onClick: () => void;
  onMarkDone: () => void;
  onReschedule: () => void;
  onCannotContinue: () => void;
  onResizeStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onMoreAction: () => void;
}

const eventStyles = {
  focus: {
    background: "#e5f7f2",
    border: "#93ddcd",
    text: "#0f766e",
    strip: "#14b8a6",
    Icon: Sparkles
  },
  task: {
    background: "#eaf1ff",
    border: "#b7ccff",
    text: "#1d4ed8",
    strip: "#3b82f6",
    Icon: CheckSquare
  },
  meeting: {
    background: "#fff5df",
    border: "#f6d089",
    text: "#9a6700",
    strip: "#f59e0b",
    Icon: Users
  },
  habit: {
    background: "#f1f5f9",
    border: "#cbd5e1",
    text: "#475569",
    strip: "#94a3b8",
    Icon: Repeat
  },
  break: {
    background: "#fff6ea",
    border: "#f7d7a8",
    text: "#b45309",
    strip: "#fb923c",
    Icon: Coffee
  },
  buffer: {
    background: "#eef4ff",
    border: "#c7d7fe",
    text: "#334155",
    strip: "#64748b",
    Icon: Clock3
  }
} as const;

const changeToneClasses: Record<ReplanChangeType, string> = {
  moved: "ring-2 ring-sky-300/80",
  resized: "ring-2 ring-violet-300/80",
  inserted: "ring-2 ring-emerald-300/80 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]",
  completed: "ring-2 ring-emerald-400/70",
  deleted: "ring-2 ring-rose-300/80",
  split: "ring-2 ring-amber-300/80",
  buffered: "ring-2 ring-orange-300/80 shadow-[0_0_0_3px_rgba(251,146,60,0.12)]",
  unscheduled: "ring-2 ring-slate-300/80",
  replanned: "ring-2 ring-indigo-300/80 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
};

const changeLabels: Record<ReplanChangeType, string> = {
  moved: "已移动",
  resized: "已改时长",
  inserted: "已新增",
  completed: "已完成",
  deleted: "已删除",
  split: "已拆分",
  buffered: "已插入缓冲",
  unscheduled: "未安排",
  replanned: "AI 已调整"
};

export function CalendarEventBlock({
  event,
  className = "",
  style,
  isDragging = false,
  isOverlay = false,
  isOptimizing = false,
  isMuted = false,
  changeType,
  dragAttributes,
  dragListeners,
  onClick,
  onMarkDone,
  onReschedule,
  onCannotContinue,
  onResizeStart,
  onMoreAction
}: CalendarEventBlockProps) {
  const meta = eventStyles[event.type];
  const Icon = meta.Icon;
  const isLocked = event.fixed || !event.movable;
  const isDone = event.status === "completed";
  const isInterrupted = event.status === "interrupted";
  const isOvertime = event.status === "overtime";
  const isUnscheduled = event.status === "unscheduled";
  const isCompact = event.duration <= 0.75;
  const isTiny = event.duration <= 0.5;
  const isAiAdjusted =
    event.aiGenerated || changeType === "inserted" || changeType === "buffered" || changeType === "replanned";

  const surfaceStyle = isDone
    ? { backgroundColor: "#ecfdf5", borderColor: "#86efac", color: "#166534" }
    : isUnscheduled
      ? { backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#475569" }
      : { backgroundColor: meta.background, borderColor: meta.border, color: meta.text };

  const statusBadge = isDone
    ? "已完成"
    : isOvertime
      ? "超时中"
      : isInterrupted
        ? "已拆分"
        : isLocked
          ? "锁定"
          : event.flexible
            ? "可调整"
            : null;

  const statusBadgeTone = isDone
    ? "bg-emerald-100 text-emerald-700"
    : isOvertime
      ? "bg-rose-100 text-rose-700"
      : isInterrupted
        ? "bg-amber-100 text-amber-700"
        : isLocked
          ? "bg-slate-200 text-slate-700"
          : "bg-white/75 text-slate-700";

  const canAdapt = !isLocked && event.status !== "completed" && event.status !== "unscheduled";

  return (
    <div
      data-event-block="true"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(eventKey) => {
        if (eventKey.key === "Enter" || eventKey.key === " ") {
          eventKey.preventDefault();
          onClick();
        }
      }}
      className={`group relative overflow-hidden rounded-[14px] border px-2.5 py-2 text-left text-[11px] shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition ${
        isDragging ? "cursor-grabbing opacity-50 shadow-[0_12px_28px_rgba(15,23,42,0.16)]" : "hover:-translate-y-[1px] hover:shadow-[0_12px_26px_rgba(15,23,42,0.10)]"
      } ${isOptimizing && event.flexible ? "animate-[pulse_1.2s_ease-in-out_infinite]" : ""} ${
        isDone ? "opacity-75" : isUnscheduled ? "opacity-55" : isMuted ? "opacity-35 saturate-[0.75]" : "opacity-100"
      } ${isLocked ? "cursor-not-allowed" : "cursor-grab"} ${event.flexible && !isLocked ? "border-dashed" : ""} ${
        changeType ? `${changeToneClasses[changeType]} animate-[pulse_1.4s_ease-in-out_2]` : ""
      } ${isAiAdjusted && !isDone && !isUnscheduled ? "shadow-[0_14px_30px_rgba(37,99,235,0.14)]" : ""} backdrop-blur-[1px] select-none touch-none ${className}`}
      style={{ ...surfaceStyle, ...style }}
      {...(isLocked ? {} : dragAttributes)}
      {...(isLocked ? {} : dragListeners)}
    >
      <span className="absolute inset-y-0 left-0 w-1.5 rounded-l-[14px]" style={{ backgroundColor: meta.strip }} />

      <div className="pl-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className={`truncate text-[11px] font-semibold leading-4 ${isDone ? "line-through" : ""}`}>{event.title}</span>
              {isLocked ? <Lock className="h-3 w-3 shrink-0 opacity-75" /> : null}
              {isOvertime ? <AlertTriangle className="h-3 w-3 shrink-0 opacity-75" /> : null}
            </div>
            <div className="mt-0.5 text-[10px] opacity-80">{formatEventTimeRange(event)}</div>
          </div>

          {!isOverlay && !isCompact ? (
            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                className="rounded-md bg-white/85 p-1 text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition hover:bg-white"
                onClick={(buttonEvent) => {
                  buttonEvent.stopPropagation();
                  onMarkDone();
                }}
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="rounded-md bg-white/85 p-1 text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition hover:bg-white"
                onClick={(buttonEvent) => {
                  buttonEvent.stopPropagation();
                  onReschedule();
                }}
              >
                <GripHorizontal className="h-3 w-3" />
              </button>
              <button
                type="button"
                disabled={!canAdapt}
                className="rounded-md bg-amber-50/95 p-1 text-amber-700 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={(buttonEvent) => {
                  buttonEvent.stopPropagation();
                  onCannotContinue();
                }}
                title="干不下去了"
              >
                <Coffee className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="rounded-md bg-white/85 p-1 text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition hover:bg-white"
                onClick={(buttonEvent) => {
                  buttonEvent.stopPropagation();
                  onMoreAction();
                }}
              >
                <MoreHorizontal className="h-3 w-3" />
              </button>
            </div>
          ) : null}
        </div>

        {!isTiny ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <div className="inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-medium text-slate-700">
              {priorityLabel(event.priority)}
            </div>
            {statusBadge ? <div className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium ${statusBadgeTone}`}>{statusBadge}</div> : null}
            {isAiAdjusted ? (
              <div className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-semibold text-sky-700">
                AI 重排
              </div>
            ) : null}
          </div>
        ) : null}

        {changeType && !isCompact ? (
          <div className="mt-1">
            <div className="inline-flex rounded-full bg-white/85 px-2 py-0.5 text-[9px] font-semibold text-slate-700">
              {changeLabels[changeType]}
            </div>
          </div>
        ) : null}
      </div>

      {!isOverlay && canAdapt && !isTiny ? (
        <button
          type="button"
          aria-label="调整时长"
          onPointerDown={onResizeStart}
          className="absolute inset-x-3 bottom-1 flex h-3.5 cursor-ns-resize items-center justify-center rounded-full opacity-0 transition group-hover:opacity-100"
        >
          <span className="h-1 w-8 rounded-full bg-slate-500/45" />
        </button>
      ) : null}
    </div>
  );
}
