"use client";

import { Plus, CalendarDays, X } from "lucide-react";
import { addDays, format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import type { EventPriority, QuickTaskInput, ScheduleMode } from "../types/calendar";
import { formatTime, priorityLabel } from "../utils/calendarUtils";

interface QuickAddModalProps {
  isOpen: boolean;
  initialSlot: { day: number; startHour: number } | null;
  focusedDayIndex: number;
  weekStart: Date;
  onClose: () => void;
  onAddTask: (task: QuickTaskInput) => void;
}

const priorityOptions: EventPriority[] = ["P1", "P2", "P3", "P4"];
const scheduleModeOptions: Array<{ value: ScheduleMode; title: string; detail: string }> = [
  { value: "flexible", title: "弹性任务", detail: "可参与智能重排" },
  { value: "fixed", title: "固定任务", detail: "锁定时间不移动" }
];

export function QuickAddModal({
  isOpen,
  initialSlot,
  focusedDayIndex,
  weekStart,
  onClose,
  onAddTask
}: QuickAddModalProps) {
  const [title, setTitle] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [priority, setPriority] = useState<EventPriority>("P2");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("flexible");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDurationHours(1);
      setPriority("P2");
      setScheduleMode("flexible");
    }
  }, [isOpen, focusedDayIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    const targetDay = initialSlot?.day ?? focusedDayIndex;
    const targetStartHour = initialSlot?.startHour;

    onAddTask({
      title,
      durationHours,
      priority,
      urgent: priority === "P1",
      energyLevel: priority === "P1" ? "high" : "medium",
      scheduleMode,
      targetDay,
      targetStartHour,
      pinToSlot: !!initialSlot
    });
    setTitle("");
    setDurationHours(1);
    setPriority("P2");
    setScheduleMode("flexible");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-20 pr-8">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={modalRef}
        className="relative z-10 w-[420px] rounded-2xl border border-[var(--color-border-subtle)] bg-white p-6 shadow-[0_8px_32px_rgba(15,23,42,0.15)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">快速添加</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-page-subtle)] hover:text-[var(--color-text-secondary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSubmit();
              }
            }}
            placeholder="输入任务名称，回车添加..."
            autoFocus
            className="w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-lighter)]"
          />

          {initialSlot ? (
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-lighter)] px-3 py-2 text-[12px] text-[var(--color-primary-text)]">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                安排到 {format(addDays(weekStart, initialSlot.day), "M月d日")} {formatTime(initialSlot.startHour)}
              </span>
            </div>
          ) : null}

          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-[var(--color-text-muted)]">
              <span>时长</span>
              <span className="rounded-full bg-[var(--color-primary-lighter)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary-text)]">
                {durationHours.toFixed(durationHours % 1 === 0 ? 0 : 2)} 小时
              </span>
            </div>
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-2">
              <input
                type="range"
                min={0.25}
                max={4}
                step={0.25}
                value={durationHours}
                onChange={(event) => setDurationHours(Number(event.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-border-default)] accent-[var(--color-primary)]"
              />
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                <span>15 分钟</span>
                <span>4 小时</span>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[11px] font-medium text-[var(--color-text-muted)]">优先级</div>
            <div className="flex gap-1">
              {priorityOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPriority(option)}
                  className={`whitespace-nowrap flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
                    priority === option
                      ? "bg-[var(--color-btn-solid)] text-white"
                      : "border border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  {priorityLabel(option)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[11px] font-medium text-[var(--color-text-muted)]">任务类型</div>
            <div className="grid grid-cols-2 gap-2">
              {scheduleModeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setScheduleMode(option.value)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    scheduleMode === option.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-lighter)] text-[var(--color-primary-text)]"
                      : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <div className="text-[12px] font-semibold">{option.title}</div>
                  <div className="mt-0.5 text-[10px] opacity-75">{option.detail}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="w-full rounded-xl bg-[var(--color-btn-primary)] py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(138,136,184,0.30)] transition hover:bg-[var(--color-btn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!title.trim()}
            onClick={handleSubmit}
          >
            <Plus className="mr-1.5 inline h-4 w-4" />
            加入日程
          </button>
        </div>
      </div>
    </div>
  );
}
