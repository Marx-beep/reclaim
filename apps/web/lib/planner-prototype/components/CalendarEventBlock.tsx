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
    background: "#dcfce7",
    border: "#86efac",
    text: "#166534",
    strip: "#22c55e",
    Icon: Sparkles
  },
  task: {
    background: "#dbeafe",
    border: "#93c5fd",
    text: "#1e40af",
    strip: "#3b82f6",
    Icon: CheckSquare
  },
  meeting: {
    background: "#fef3c7",
    border: "#fcd34d",
    text: "#92400e",
    strip: "#f59e0b",
    Icon: Users
  },
  habit: {
    background: "#fce7f3",
    border: "#f9a8d4",
    text: "#9d174d",
    strip: "#ec4899",
    Icon: Repeat
  },
  break: {
    background: "#fee2e2",
    border: "#fca5a5",
    text: "#991b1b",
    strip: "#ef4444",
    Icon: Coffee
  },
  buffer: {
    background: "#e5e7eb",
    border: "#d1d5db",
    text: "#374151",
    strip: "#64748b",
    Icon: Clock3
  }
} as const;

const changeToneClasses: Record<ReplanChangeType, string> = {
  moved: "ring-2 ring-sky-300/80",
  resized: "ring-2 ring-violet-300/80",
  inserted: "ring-2 ring-emerald-300/80",
  completed: "ring-2 ring-emerald-400/70",
  deleted: "ring-2 ring-rose-300/80",
  split: "ring-2 ring-amber-300/80",
  buffered: "ring-2 ring-orange-300/80",
  unscheduled: "ring-2 ring-slate-300/80",
  replanned: "ring-2 ring-indigo-300/80"
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
          ? "固定"
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
          : "bg-white/70 text-slate-700";

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
      className={`group relative overflow-hidden rounded-lg border p-2 text-left text-[12px] shadow-soft transition ${
        isDragging ? "opacity-45" : "hover:-translate-y-[1px] hover:shadow-hover"
      } ${isOptimizing && event.flexible ? "animate-[pulse_1.2s_ease-in-out_infinite]" : ""} ${
        isDone ? "opacity-75" : isUnscheduled ? "opacity-55" : isMuted ? "opacity-35 saturate-[0.75]" : "opacity-100"
      } ${isLocked ? "cursor-not-allowed" : "cursor-grab"} ${event.flexible && !isLocked ? "border-dashed" : ""} ${
        changeType ? `${changeToneClasses[changeType]} animate-[pulse_1.4s_ease-in-out_2]` : ""
      } ${className}`}
      style={{ ...surfaceStyle, ...style }}
      {...(isLocked ? {} : dragAttributes)}
      {...(isLocked ? {} : dragListeners)}
    >
      <span className="absolute inset-y-0 left-0 w-1.5 rounded-l-lg" style={{ backgroundColor: meta.strip }} />

      <div className="pl-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className={`truncate font-medium leading-4 ${isDone ? "line-through" : ""}`}>{event.title}</span>
              {isLocked ? <Lock className="h-3 w-3 shrink-0 opacity-75" /> : null}
              {isOvertime ? <AlertTriangle className="h-3 w-3 shrink-0 opacity-75" /> : null}
            </div>
            <div className="mt-1 text-[11px] opacity-80">{formatEventTimeRange(event)}</div>
          </div>

          {!isOverlay ? (
            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                className="rounded-md bg-white/75 p-1 text-slate-600 shadow-soft transition hover:bg-white"
                onClick={(buttonEvent) => {
                  buttonEvent.stopPropagation();
                  onMarkDone();
                }}
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="rounded-md bg-white/75 p-1 text-slate-600 shadow-soft transition hover:bg-white"
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
                className="rounded-md bg-white/75 p-1 text-slate-600 shadow-soft transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
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
                className="rounded-md bg-white/75 p-1 text-slate-600 shadow-soft transition hover:bg-white"
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

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <div className="inline-flex rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium text-slate-700">
            {priorityLabel(event.priority)}
          </div>
          {statusBadge ? <div className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeTone}`}>{statusBadge}</div> : null}
        </div>

        {changeType ? (
          <div className="mt-1">
            <div className="inline-flex rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
              {changeLabels[changeType]}
            </div>
          </div>
        ) : null}
      </div>

      {!isOverlay && canAdapt ? (
        <button
          type="button"
          aria-label="调整时长"
          onPointerDown={onResizeStart}
          className="absolute inset-x-4 bottom-1 flex h-3 cursor-ns-resize items-center justify-center rounded-full opacity-0 transition group-hover:opacity-100"
        >
          <span className="h-1 w-10 rounded-full bg-slate-500/50" />
        </button>
      ) : null}
    </div>
  );
}
