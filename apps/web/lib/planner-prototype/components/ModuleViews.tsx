import type { ReactNode } from "react";
import { Copy, Link2, Plus, RefreshCw, Shield, Target, Check, Eye, Clock, Users, Calendar as CalendarIcon, Lightbulb, AlertCircle, Timer, UploadCloud, FileText } from "lucide-react";
import { useState } from "react";
import type {
  CalendarConnectionItem,
  CalendarEvent,
  EventPriority,
  FocusPlan,
  HabitItem,
  PlannerSettings,
  QuickTaskInput,
  ScheduleMode,
  SchedulingLinkItem,
  SmartMeetingItem,
  TaskItem
} from "../types/calendar";
import { energyLabel, formatTime, priorityLabel } from "../utils/calendarUtils";

function Frame({
  title,
  subtitle,
  badge,
  children
}: {
  title: string;
  subtitle: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col px-6 pb-6 pt-5">
      <div className="mb-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[20px] font-semibold text-slate-950">{title}</div>
            <div className="mt-1 max-w-3xl text-[12px] leading-5 text-slate-400">{subtitle}</div>
          </div>
          {badge ? (
            <div className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-btn-primary-light)] px-3 py-1 text-[11px] font-medium text-[var(--color-btn-primary-text)]">
              {badge}
            </div>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto pr-2">{children}</div>
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[#E4E6EE] bg-white p-4 shadow-soft ${className}`}>{children}</div>;
}

const priorityOptions: EventPriority[] = ["P1", "P2", "P3", "P4"];
const dayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const PRIORITY_DOT: Record<EventPriority, string> = {
  P1: "bg-[#5DBD82]",
  P2: "bg-[#EB6A67]",
  P3: "bg-[#A8B3F4]",
  P4: "bg-[#FFE4A8]"
};

const STATUS_CONFIG: Record<TaskItem["status"], { label: string; dot: string; badge: string; badgeBg: string }> = {
  unscheduled: { label: "待安排", dot: "bg-[#A8B3F4]", badge: "待安排", badgeBg: "bg-[#EEF0FF] text-[#4F5BEF]" },
  scheduled: { label: "已安排", dot: "bg-[#5DBD82]", badge: "已安排", badgeBg: "bg-[#CBEEDD] text-[#123524]" },
  completed: { label: "已完成", dot: "bg-[#8A8D99]", badge: "已完成", badgeBg: "bg-[#F0F1F5] text-[#8A8D99]" }
};

function TaskCard({
  task,
  onScheduleTask,
  onMarkDone,
  onDeleteTask,
  onToggleUpNext,
  onChangePriority,
  onOpenTask
}: {
  task: TaskItem;
  onScheduleTask: (taskId: string) => void;
  onMarkDone: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleUpNext: (taskId: string) => void;
  onChangePriority: (taskId: string, priority: EventPriority) => void;
  onOpenTask: (taskId: string) => void;
}) {
  const status = STATUS_CONFIG[task.status];
  const isDone = task.status === "completed";
  const isOverdue = task.status === "unscheduled" && new Date().getDay() > task.dueDay;

  return (
    <div className={`group rounded-xl border bg-white px-4 py-3 transition hover:shadow-[0_2px_8px_rgba(17,19,24,0.06)] ${isDone ? "opacity-60" : "border-[#E4E6EE]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
            <span className={`text-[14px] font-medium text-slate-800 truncate ${isDone ? "line-through" : ""}`}>{task.title}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className={`h-1 w-1 shrink-0 rounded-full ${status.dot}`} />
              {isOverdue ? <span className="text-rose-500">已逾期</span> : status.label}
            </span>
            <span>截止：{dayLabels[task.dueDay]} {formatTime(task.dueHour)}</span>
            <span>{task.estimatedMinutes} 分钟</span>
            <span>{energyLabel(task.energyLevel)}</span>
            <span>P{task.priority.charAt(1)}</span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.badgeBg}`}>
          {isOverdue && task.status === "unscheduled" ? "已逾期" : status.badge}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        {task.status === "unscheduled" ? (
          <>
            <button
              type="button"
              onClick={() => onScheduleTask(task.id)}
              className="rounded-lg bg-[var(--color-btn-primary)] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[var(--color-btn-primary-hover)]"
            >
              安排到日程
            </button>
            <button
              type="button"
              onClick={() => onMarkDone(task.id)}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-100"
            >
              标记完成
            </button>
          </>
        ) : task.status === "scheduled" ? (
          <>
            <button
              type="button"
              onClick={() => onMarkDone(task.id)}
              className="rounded-lg bg-[var(--color-btn-primary)] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[var(--color-btn-primary-hover)]"
            >
              标记完成
            </button>
            <button
              type="button"
              onClick={() => onOpenTask(task.id)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              查看日程
            </button>
          </>
        ) : (
          <span className="text-[11px] text-slate-400">任务已完成</span>
        )}
        <div className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onDeleteTask(task.id)}
            className="rounded-lg border border-rose-200 bg-white px-2 py-1.5 text-[11px] font-medium text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

const FREQUENCY_LABEL: Record<HabitItem["frequency"], string> = {
  "每天": "每天",
  "工作日": "仅工作日",
  "每周三次": "每周三次"
};

const FREQUENCY_DOT: Record<HabitItem["frequency"], string> = {
  "每天": "bg-emerald-400",
  "工作日": "bg-amber-400",
  "每周三次": "bg-purple-400"
};

function HabitCard({
  habit,
  onToggleHabit,
  onScheduleHabits
}: {
  habit: HabitItem;
  onToggleHabit: (habitId: string) => void;
  onScheduleHabits: (habitId?: string) => void;
}) {
  const progress = Math.min((habit.completedCount / habit.weeklyTarget) * 100, 100);
  const remaining = Math.max(habit.weeklyTarget - habit.completedCount, 0);
  const isDone = habit.completedCount >= habit.weeklyTarget;

  return (
    <div className={`group rounded-2xl border bg-white p-4 shadow-soft transition hover:-translate-y-[1px] hover:shadow-hover ${habit.active ? "border-[#e8ebf3]" : "border-dashed border-slate-200 opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${FREQUENCY_DOT[habit.frequency]}`} />
            <span className="text-[15px] font-semibold text-slate-950">{habit.name}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
            <span>{FREQUENCY_LABEL[habit.frequency]}</span>
            <span>约 {habit.durationHours} 小时</span>
            <span className="flex items-center gap-1">
              推荐
              <span className="font-medium text-slate-700">{formatTime(habit.preferredStartHour)}–{formatTime(habit.preferredEndHour)}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDone && <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">已完成</span>}
          <button
            type="button"
            onClick={() => onToggleHabit(habit.id)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              habit.active
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
            }`}
          >
            {habit.active ? "已启用" : "已暂停"}
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>本周进度</span>
          <span className={isDone ? "font-medium text-emerald-600" : "text-slate-700"}>
            {habit.completedCount} / {habit.weeklyTarget} 次
            {isDone ? " ✓" : remaining > 0 ? `（还差 ${remaining} 次）` : ""}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${isDone ? "bg-emerald-400" : habit.completedCount > 0 ? "bg-[var(--color-primary)]" : "bg-slate-300"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onScheduleHabits(habit.id)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-btn-primary)] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[var(--color-btn-primary-hover)]"
        >
          安排本周时间
        </button>
        <button
          type="button"
          onClick={() => onScheduleHabits()}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        >
          全部安排
        </button>
      </div>
    </div>
  );
}

type TaskFilter = "all" | "unscheduled" | "scheduled" | "high_priority" | "completed";

export function TasksView({
  tasks,
  defaultPriority,
  onCreateTask,
  onScheduleTask,
  onMarkDone,
  onDeleteTask,
  onToggleUpNext,
  onChangePriority,
  onOpenTask
}: {
  tasks: TaskItem[];
  defaultPriority: EventPriority;
  onCreateTask: (input: QuickTaskInput) => void;
  onScheduleTask: (taskId: string) => void;
  onMarkDone: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleUpNext: (taskId: string) => void;
  onChangePriority: (taskId: string, priority: EventPriority) => void;
  onOpenTask: (taskId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [priority, setPriority] = useState<EventPriority>(defaultPriority);
  const [dueDay, setDueDay] = useState(3);
  const [dueHour, setDueHour] = useState(18);
  const [filter, setFilter] = useState<TaskFilter>("all");

  const unscheduledCount = tasks.filter((t) => t.status === "unscheduled").length;
  const scheduledCount = tasks.filter((t) => t.status === "scheduled").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const p1Count = tasks.filter((t) => t.priority === "P1").length;
  const p2Count = tasks.filter((t) => t.priority === "P2").length;
  const totalCount = tasks.length;
  const scheduledRatio = totalCount > 0 ? Math.round((scheduledCount / totalCount) * 100) : 0;
  const highPriorityCount = p1Count + p2Count;

  const statItems = [
    { label: "待安排", value: unscheduledCount, unit: "个", color: "#A8B3F4", bg: "#EEF0FF" },
    { label: "已安排", value: scheduledCount, unit: "个", color: "#5DBD82", bg: "#CBEEDD" },
    { label: "已完成", value: completedCount, unit: "个", color: "#6CC48D", bg: "#EDFAF3" },
    { label: "高优先级", value: highPriorityCount, unit: "个", color: "#EB6A67", bg: "#FDF2F2" }
  ];

  const getSuggestion = () => {
    if (totalCount === 0) return null;
    if (unscheduledCount > 0 && highPriorityCount > 0) {
      return { text: `还有 ${unscheduledCount} 个任务待安排，建议优先处理 P1/P2 高优先级任务。`, type: "warning" };
    }
    if (unscheduledCount > 0) {
      return { text: `还有 ${unscheduledCount} 个任务待安排，建议尽快安排截止日期。`, type: "info" };
    }
    if (completedCount > 0 && completedCount === totalCount) {
      return { text: "所有任务都已完成，继续保持！", type: "success" };
    }
    return { text: "本周任务已全部安排，继续推进吧。", type: "success" };
  };

  const suggestion = getSuggestion();

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "unscheduled") return task.status === "unscheduled";
    if (filter === "scheduled") return task.status === "scheduled";
    if (filter === "high_priority") return task.priority === "P1" || task.priority === "P2";
    if (filter === "completed") return task.status === "completed";
    return true;
  });

  const filterTabs: { key: TaskFilter; label: string; count?: number }[] = [
    { key: "all", label: "全部", count: totalCount },
    { key: "unscheduled", label: "待安排", count: unscheduledCount },
    { key: "scheduled", label: "已安排", count: scheduledCount },
    { key: "high_priority", label: "高优先级", count: highPriorityCount },
    { key: "completed", label: "已完成", count: completedCount }
  ];

  return (
    <Frame
      title="任务"
      subtitle="设置任务的预计时长、截止时间和优先级，系统会帮你安排到合适时段。"
      badge={unscheduledCount > 0 ? `${unscheduledCount} 个待安排` : "全部已安排"}
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="grid shrink-0 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Card>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
              <Plus className="h-4 w-4 text-[var(--color-btn-primary)]" />
              <span>快速添加任务</span>
            </div>
            <div className="mt-4 space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="任务名称，例如：整理答辩逻辑"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-lighter)]"
              />

              <div>
                <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>预计时长</span>
                  <span className="rounded-full bg-[var(--color-primary-lighter)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary-text)]">
                    {durationHours < 1 ? `${durationHours * 60} 分钟` : `${durationHours % 1 === 0 ? durationHours : durationHours.toFixed(1)} 小时`}
                  </span>
                </div>
                <input
                  type="range" min={0.25} max={4} step={0.25} value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[var(--color-primary)]"
                />
              </div>

              <div className="flex gap-1.5">
                {priorityOptions.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
                      priority === p
                        ? "bg-[var(--color-btn-solid)] text-white"
                        : "border border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)]"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${priority === p ? "bg-white" : PRIORITY_DOT[p]}`} />
                    {p}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} className="rounded-lg border border-slate-200 px-2 py-2 text-[12px] outline-none transition focus:border-[var(--color-primary)]">
                  {dayLabels.map((label, index) => (
                    <option key={label} value={index}>{label}</option>
                  ))}
                </select>
                <select value={String(dueHour)} onChange={(e) => setDueHour(Number(e.target.value))} className="rounded-lg border border-slate-200 px-2 py-2 text-[12px] outline-none transition focus:border-[var(--color-primary)]">
                  {Array.from({ length: 45 }, (_, i) => 8 + i * 0.25).map((hour) => (
                    <option key={hour} value={hour}>{formatTime(hour)}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-btn-primary)] py-2 text-[13px] font-medium text-white transition hover:bg-[var(--color-btn-primary-hover)]"
                onClick={() => {
                  if (!title.trim()) return;
                  onCreateTask({
                    title,
                    durationHours,
                    priority,
                    dueDay,
                    dueHour,
                    urgent: priority === "P1",
                    energyLevel: priority === "P1" ? "high" : "medium"
                  });
                  setTitle("");
                  setDurationHours(1);
                  setPriority(defaultPriority);
                }}
              >
                <Plus className="h-4 w-4" />
                添加到日程
              </button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#111318]">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-[#FFF8E6]">
                <div className="h-2 w-2 rounded-sm bg-[#E6B85C]" />
              </div>
              <span>今日任务重点</span>
            </div>

            {totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <div className="text-[13px] text-slate-400">暂无任务</div>
                <div className="mt-1 text-[11px] text-slate-400">在左侧添加任务后，这里将显示重点</div>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {statItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg p-2.5 text-center"
                      style={{ backgroundColor: item.bg }}
                    >
                      <div className="text-[10px] font-medium text-slate-500">{item.label}</div>
                      <div className="mt-0.5 text-[20px] font-bold" style={{ color: item.color }}>{item.value}</div>
                      <div className="text-[10px] text-slate-400">{item.unit}</div>
                    </div>
                  ))}
                </div>

                {suggestion && (
                  <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
                    suggestion.type === "warning" ? "bg-[#FFF8E6] text-[#8A6D30] border border-[#FFE4A8]" :
                    suggestion.type === "success" ? "bg-[#EDFAF3] text-[#2D6B4A] border border-[#9DD8B8]" :
                    "bg-[#EEF0FF] text-[#4F5BEF] border border-[#C4CCF5]"
                  }`}>
                    <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      suggestion.type === "warning" ? "bg-[#E6B85C]" :
                      suggestion.type === "success" ? "bg-[#6CC48D]" :
                      "bg-[#8B9DC3]"
                    }`} />
                    {suggestion.text}
                  </div>
                )}

                {scheduledCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
                        <span>安排进度</span>
                        <span className="font-medium">{scheduledCount} / {totalCount}（{scheduledRatio}%）</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#F0F1F5]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#6CC48D] to-[#5DBD82] transition-all duration-500"
                          style={{ width: `${scheduledRatio}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="mt-auto min-h-0 flex-1 overflow-auto">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[14px] font-semibold text-slate-800">任务列表</div>
            <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                    filter === tab.key
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`ml-1 ${filter === tab.key ? "text-[var(--color-primary)]" : "text-slate-400"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] py-10 text-center">
              <div className="text-[14px] font-medium text-slate-400">暂无{filter === "all" ? "任务" : filter === "unscheduled" ? "待安排任务" : filter === "scheduled" ? "已安排任务" : filter === "high_priority" ? "高优先级任务" : "已完成任务"}</div>
              <div className="mt-1 text-[12px] text-slate-400">{filter === "all" ? "在上方填写信息，快速添加第一个任务" : "尝试切换筛选条件查看其他任务"}</div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onScheduleTask={onScheduleTask}
                  onMarkDone={onMarkDone}
                  onDeleteTask={onDeleteTask}
                  onToggleUpNext={onToggleUpNext}
                  onChangePriority={onChangePriority}
                  onOpenTask={onOpenTask}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Frame>
  );
}

export function HabitsView({
  habits,
  onCreateHabit,
  onToggleHabit,
  onScheduleHabits
}: {
  habits: HabitItem[];
  onCreateHabit: (habit: HabitItem) => void;
  onToggleHabit: (habitId: string) => void;
  onScheduleHabits: (habitId?: string) => void;
}) {
  const [name, setName] = useState("");
  const remainingCount = habits.reduce((sum, item) => sum + Math.max(item.weeklyTarget - item.completedCount, 0), 0);
  const completedCount = habits.reduce((sum, item) => sum + item.completedCount, 0);
  const totalTarget = habits.reduce((sum, item) => sum + item.weeklyTarget, 0);
  const activeHabits = habits.filter((h) => h.active).length;
  const totalDuration = habits.reduce((sum, item) => sum + item.durationHours * item.weeklyTarget, 0);
  const completionRatio = totalTarget > 0 ? Math.round((completedCount / totalTarget) * 100) : 0;

  const statItems = [
    { label: "本周完成", value: completedCount, unit: "次", sub: `/ ${totalTarget} 次目标`, color: "#A8B3F4", bg: "#EEF0FF" },
    { label: "进行中", value: activeHabits, unit: "个", sub: "活跃习惯", color: "#6CC48D", bg: "#EDFAF3" },
    { label: "待完成", value: remainingCount, unit: "次", sub: "待完成", color: "#E6B85C", bg: "#FFF8E6" },
    { label: "周投入", value: totalDuration.toFixed(1), unit: "小时", sub: "/ 周", color: "#A8B3F4", bg: "#EEF0FF" }
  ];

  const getSuggestion = () => {
    if (habits.length === 0) return null;
    if (remainingCount > 0) {
      return { text: `本周还有 ${remainingCount} 次习惯待完成，建议优先安排固定时间段。`, type: "warning" };
    }
    if (completedCount > 0 && completedCount === totalTarget) {
      return { text: "本周目标已全部达成，继续保持！", type: "success" };
    }
    return { text: "习惯安排进展顺利，继续保持节奏。", type: "success" };
  };

  const suggestion = getSuggestion();

  return (
    <Frame
      title="习惯"
      subtitle="设定每周目标，系统会在可用时段自动安排固定习惯。"
      badge={remainingCount > 0 ? `${remainingCount} 次待完成` : "本周目标已达成"}
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="grid shrink-0 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Card>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-950">
              <Plus className="h-4 w-4 text-[var(--color-btn-primary)]" />
              <span>添加新习惯</span>
            </div>
            <div className="mt-4 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="习惯名称，例如：晨间阅读"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-lighter)]"
              />
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-btn-primary)] py-2.5 text-[13px] font-medium text-white transition hover:bg-[var(--color-btn-primary-hover)]"
                onClick={() => {
                  if (!name.trim()) return;
                  onCreateHabit({
                    id: `habit-${Date.now()}`,
                    name,
                    frequency: "工作日",
                    durationHours: 0.5,
                    preferredStartHour: 16,
                    preferredEndHour: 18,
                    weeklyTarget: 3,
                    completedCount: 0,
                    priority: "P3",
                    active: true
                  });
                  setName("");
                }}
              >
                <Plus className="h-4 w-4" />
                保存习惯
              </button>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-[13px] font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                onClick={() => onScheduleHabits()}
              >
                全部安排
              </button>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#111318]">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-[#FFF8E6]">
                  <div className="h-2.5 w-2.5 rounded-sm bg-[#FFE4A8]" />
                </div>
                <span>习惯概览</span>
              </div>
              {habits.length > 0 && (
                <span className="text-[11px] text-slate-400">共 {habits.length} 个习惯</span>
              )}
            </div>

            {habits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="text-[13px] text-slate-400">暂无习惯数据</div>
                <div className="mt-1 text-[11px] text-slate-400">在左侧添加习惯后，这里将显示概览</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3">
                  {statItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl p-3 text-center transition hover:-translate-y-0.5"
                      style={{ backgroundColor: item.bg }}
                    >
                      <div className="text-[10px] font-medium text-slate-500">{item.label}</div>
                      <div className="mt-1 text-[22px] font-bold" style={{ color: item.color }}>{item.value}</div>
                      <div className="mt-0.5 text-[10px] text-slate-400">{item.unit}{item.sub}</div>
                    </div>
                  ))}
                </div>

                {suggestion && (
                  <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
                    suggestion.type === "warning" ? "bg-[#FAF7F0] text-[#8B7B60] border border-[#E8DCC8]" :
                    "bg-[#F0F4ED] text-[#6B7B6A] border border-[#C4D0B8]"
                  }`}>
                    <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      suggestion.type === "warning" ? "bg-[#C4A882]" : "bg-[#8A9A7B]"
                    }`} />
                    {suggestion.text}
                  </div>
                )}

                {totalTarget > 0 && (
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-500">
                      <span>本周完成进度</span>
                      <span className="font-medium">{completedCount} / {totalTarget} ({completionRatio}%)</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#F0F1F5]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#A8B3F4] to-[#6D7BEF] transition-all duration-500"
                        style={{ width: `${completionRatio}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        <div className="mt-auto min-h-0 flex-1 overflow-auto space-y-3">
          <div className="text-[12px] font-medium text-slate-500">习惯列表</div>
          {habits.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-page-subtle)] py-12 text-center">
              <div className="text-[15px] font-medium text-slate-400">暂无习惯</div>
              <div className="mt-1 text-[13px] text-slate-400">在左侧填写习惯名称，快速添加第一个习惯</div>
            </div>
          ) : (
            habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggleHabit={onToggleHabit}
                onScheduleHabits={onScheduleHabits}
              />
            ))
          )}
        </div>
      </div>
    </Frame>
  );
}

export function FocusView({
  focusPlan,
  focusHours,
  compressedByMeetings,
  onTargetChange,
  onProtectFocus
}: {
  focusPlan: FocusPlan;
  focusHours: number;
  compressedByMeetings: boolean;
  onTargetChange: (hours: number) => void;
  onProtectFocus: () => void;
}) {
  const target = focusPlan.weeklyTargetHours;
  const gap = Math.max(0, target - focusHours);
  const pct = Math.min(Math.round((focusHours / target) * 100), 100);
  const isBehind = focusHours < target;
  const dailyAvg = (focusHours / 7).toFixed(1);

  return (
    <Frame
      title="专注时间"
      subtitle="为深度工作预留时间，避免重要任务被会议和临时事项挤占。"
      badge={isBehind ? `还差 ${gap.toFixed(1)} 小时` : "目标已达成"}
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="grid shrink-0 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#111318]">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-[#EDFAF3]">
                  <Target className="h-3 w-3 text-[#6CC48D]" />
                </div>
                <span>本周专注目标</span>
              </div>
              <div className={`rounded-full px-2.5 py-1 text-center ${isBehind ? "bg-[#FFF8E6]" : "bg-[#EDFAF3]"}`}>
                <span className={`text-[13px] font-bold tabular-nums ${isBehind ? "text-[#E6B85C]" : "text-[#6CC48D]"}`}>{pct}%</span>
              </div>
            </div>

            <div className="mb-4 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-[36px] font-bold tabular-nums text-[var(--color-event-focus)]">{focusHours.toFixed(1)}</span>
                <span className="text-sm text-[#8A8D99]">/ {target} 小时</span>
              </div>
              <div className="mt-1 text-[11px] text-[#8A8D99]">
                {isBehind ? `距离目标还差 ${gap.toFixed(1)} 小时` : "目标已达成"}
              </div>
            </div>

            <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-[#F0F1F5]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isBehind ? "bg-gradient-to-r from-[#FFE4A8] to-[#E6B85C]" : "bg-gradient-to-r from-[#6CC48D] to-[#5DBD82]"}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">每周目标</span>
                <span className="font-medium text-slate-700">{target} 小时</span>
              </div>
              <input
                type="range" min={6} max={20} step={1}
                value={target}
                onChange={(event) => onTargetChange(Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[var(--color-event-focus)]"
              />
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>6h</span>
                <span>20h</span>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-btn-primary)] py-2.5 text-[13px] font-medium text-white transition hover:bg-[var(--color-btn-primary-hover)]"
              onClick={onProtectFocus}
            >
              <Shield className="h-4 w-4" />
              更新专注安排
            </button>
          </Card>

          <div className="space-y-4">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-950">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-[#EDFAF3]">
                    <div className="h-2.5 w-2.5 rounded-sm bg-[#6CC48D]" />
                  </div>
                  <span>专注概览</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#EDFAF3" }}>
                  <div className="text-[10px] text-[#8A8D99]">本周专注</div>
                  <div className="mt-1 text-[22px] font-bold text-[#5DBD82]">{focusHours.toFixed(1)}</div>
                  <div className="text-[9px] text-[#8A8D99]">小时</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#FFF8E6" }}>
                  <div className="text-[10px] text-[#8A8D99]">已保护</div>
                  <div className="mt-1 text-[22px] font-bold text-[#E6B85C]">{focusPlan.protectedHours.toFixed(1)}</div>
                  <div className="text-[9px] text-[#8A8D99]">小时</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#EDFAF3" }}>
                  <div className="text-[10px] text-[#8A8D99]">日均专注</div>
                  <div className="mt-1 text-[22px] font-bold text-[#6CC48D]">{dailyAvg}</div>
                  <div className="text-[9px] text-[#8A8D99]">小时/天</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#EEF0FF" }}>
                  <div className="text-[10px] text-[#8A8D99]">目标差距</div>
                  <div className={`mt-1 text-[22px] font-bold ${isBehind ? "text-[#EB6A67]" : "text-[#6CC48D]"}`}>{isBehind ? gap.toFixed(1) : "0"}</div>
                  <div className="text-[9px] text-[#8A8D99]">小时</div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#111318]">
                <Target className="h-4 w-4 text-[var(--color-accent-green)]" />
                <span>当前洞察</span>
              </div>
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: compressedByMeetings ? "#F7D9DE" : "#9DD8B8", backgroundColor: compressedByMeetings ? "#FDF2F2" : "#EDFAF3" }}>
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${compressedByMeetings ? "bg-[#EB6A67]" : "bg-[#6CC48D]"}`} />
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: compressedByMeetings ? "#7A2522" : "#123524" }}>
                      {compressedByMeetings ? "会议正在压缩专注时长" : "专注时间有充足的保护空间"}
                    </div>
                    <div className="mt-1 text-[11px]" style={{ color: compressedByMeetings ? "#B85552" : "#3D8B5E" }}>
                      {compressedByMeetings
                        ? "检测到会议占用了较多完整空档，建议减少低优先级会议或手动锁定上午的连续时段。"
                        : "当前日程中仍有足够的完整空档可供保护为专注时间。"}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-[#E4E6EE] p-3" style={{ backgroundColor: "#FAFBFC" }}>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#4B5563]">
                    <Clock className="h-3.5 w-3.5 text-[#8A8D99]" />
                    推荐保护时段
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      { label: "09:00–11:00", desc: "2h · 上午黄金段" },
                      { label: "14:00–16:00", desc: "2h · 午后清醒期" },
                      { label: "19:00–21:00", desc: "2h · 晚间无干扰" }
                    ].map((slot) => (
                      <span key={slot.label} className="inline-flex items-center gap-1 rounded-lg border border-[#9DD8B8]/30 bg-[#EDFAF3] px-2.5 py-1 text-[11px] font-medium text-[#123524]">
                        {slot.label}
                        <span className="text-[9px] opacity-60">{slot.desc}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-950">
                <Lightbulb className="h-4 w-4 text-[#C4A882]" />
                <span>下一步建议</span>
              </div>
              <div className="mt-3 space-y-2">
                {isBehind ? (
                  <>
                    <div className="flex items-start gap-2 text-[11px] text-slate-600">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C4A882]" />
                      <span>距离目标还差约 {gap.toFixed(1)} 小时，建议安排至少 {Math.ceil(gap / 1.5)} 段 90 分钟专注块。</span>
                    </div>
                    <div className="flex items-start gap-2 text-[11px] text-slate-600">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C4A882]" />
                      <span>优先保护上午 9:00–11:00 的连续时段，这是一天中精力最充沛的时间。</span>
                    </div>
                    <div className="flex items-start gap-2 text-[11px] text-slate-600">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C4A882]" />
                      <span>减少碎片化会议，将短会合并为长会，释放更多完整空档。</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2 text-[11px] text-slate-600">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8A9A7B]" />
                      <span>已达成本周目标，可继续保护更多深度工作时间。</span>
                    </div>
                    <div className="flex items-start gap-2 text-[11px] text-slate-600">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8A9A7B]" />
                      <span>建议保持当前节奏，将每天上午设为固定专注时段。</span>
                    </div>
                    <div className="flex items-start gap-2 text-[11px] text-slate-600">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8A9A7B]" />
                      <span>本周日均专注 {dailyAvg} 小时，保持这个效率。</span>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {focusPlan.protectedEventIds.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-950">
                  <Shield className="h-4 w-4 text-[#C4A882]" />
                  <span>已保护专注块</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  共 {focusPlan.protectedEventIds.length} 个专注块，已保护 {focusPlan.protectedHours.toFixed(1)} 小时专注时间
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Frame>
  );
}

const STATUS_MAP: Record<SmartMeetingItem["conflictStatus"], { label: string; bg: string; text: string; dot: string }> = {
  "正常": { label: "时间合适", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "冲突": { label: "存在冲突", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  "待安排": { label: "可优化", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" }
};

const FREQ_LABEL: Record<SmartMeetingItem["frequency"], string> = {
  "一次性": "单次",
  "每周": "每周重复",
  "每两周": "双周重复"
};

function MeetingCard({ meeting, onReschedule, onSkip }: {
  meeting: SmartMeetingItem;
  onReschedule: () => void;
  onSkip: () => void;
}) {
  const st = STATUS_MAP[meeting.conflictStatus];
  return (
    <Card className="group relative overflow-visible transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${st.dot}`} />
            <span className="truncate text-[15px] font-semibold text-slate-950">{meeting.title}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />{FREQ_LABEL[meeting.frequency]}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />{meeting.attendees.join("、")}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
              <CalendarIcon className="h-3 w-3" />{dayLabels[meeting.scheduledDay]} {formatTime(meeting.scheduledHour)}
            </span>
            <span className="text-slate-400">约 {meeting.durationHours * 60} 分钟</span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${st.bg} ${st.text}`}>
          {st.label}
        </span>
      </div>
      <div className="mt-4 flex gap-2 opacity-100 transition-opacity group-hover:opacity-100">
        <button type="button" className="rounded-lg bg-[#D4DAFA] border border-[#A8B3F4] px-3 py-1.5 text-[11px] font-medium text-[#2D3582] transition-colors hover:bg-[#A8B3F4] hover:text-white" onClick={onReschedule}>
          重新安排时间
        </button>
        <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50" onClick={onSkip}>
          跳过这一次
        </button>
      </div>
    </Card>
  );
}

export function MeetingsView({
  meetings,
  onCreateMeeting,
  onRescheduleMeeting,
  onSkipMeeting
}: {
  meetings: SmartMeetingItem[];
  onCreateMeeting: (meeting: SmartMeetingItem) => void;
  onRescheduleMeeting: (meetingId: string) => void;
  onSkipMeeting: (meetingId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [freq, setFreq] = useState<SmartMeetingItem["frequency"]>("一次性");
  const [dur, setDur] = useState(0.5);

  const conflictCount = meetings.filter((m) => m.conflictStatus !== "正常").length;
  const normalCount = meetings.filter((m) => m.conflictStatus === "正常").length;
  const totalDuration = meetings.reduce((sum, m) => sum + m.durationHours, 0);
  const pendingCount = meetings.filter((m) => m.conflictStatus === "待安排").length;

  const getHealthStatus = () => {
    if (meetings.length === 0) return { text: "暂无会议数据", type: "empty" };
    if (conflictCount === 0 && normalCount === meetings.length) {
      return { text: "所有会议时间安排合理，无需调整", type: "success" };
    }
    if (conflictCount > 0) {
      return { text: `有 ${conflictCount} 个会议存在时间冲突，建议重新安排`, type: "warning" };
    }
    if (pendingCount > 0) {
      return { text: `有 ${pendingCount} 个会议待安排，系统将自动寻找合适时段`, type: "info" };
    }
    return { text: "会议整体状态正常", type: "success" };
  };

  const healthStatus = getHealthStatus();

  return (
    <Frame
      title="智能会议"
      subtitle="自动协调参会人时间、检测日程冲突，并在需要时智能调整会议位置。"
      badge={conflictCount > 0 ? `${conflictCount} 个需要关注` : "一切正常"}
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="grid shrink-0 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Card>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-950">
              <Plus className="h-4 w-4 text-[var(--color-btn-primary)]" />
              新增会议
            </div>
            <div className="mt-4 space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="会议名称，例如：团队周会" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20" />
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">重复频率</label>
                <select value={freq} onChange={(e) => setFreq(e.target.value as SmartMeetingItem["frequency"])} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                  <option value="一次性">单次</option>
                  <option value="每周">每周</option>
                  <option value="每两周">每两周</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">预计时长</label>
                <select value={String(dur)} onChange={(e) => setDur(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                  {[0.25, 0.5, 1, 1.5, 2].map((d) => (
                    <option key={d} value={d}>{d === 0.25 ? "15 分钟" : d === 0.5 ? "30 分钟" : `${d} 小时`}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-btn-primary)] px-4 py-2.5 text-[13px] font-medium text-white transition-opacity disabled:opacity-40"
                disabled={!title.trim()}
                onClick={() => {
                  if (!title.trim()) return;
                  onCreateMeeting({
                    id: `meeting-${Date.now()}`,
                    title,
                    attendees: ["你", "对方"],
                    frequency: freq,
                    durationHours: dur,
                    priority: "P2",
                    scheduledDay: 2,
                    scheduledHour: 15.5,
                    conflictStatus: "待安排",
                    active: true
                  });
                  setTitle("");
                }}
              >
                <Plus className="h-4 w-4" />
                创建会议
              </button>
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#111318]">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-[#EEF0FF]">
                    <div className="h-2.5 w-2.5 rounded-sm bg-[#A8B3F4]" />
                  </div>
                  <span>会议概览</span>
                </div>
              </div>

              {meetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className="text-[13px] text-slate-400">暂无会议数据</div>
                  <div className="mt-1 text-[11px] text-slate-400">在左侧添加会议后，这里将显示概览</div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#EEF0FF" }}>
                      <div className="text-[10px] text-[#8A8D99]">会议总数</div>
                      <div className="mt-1 text-[22px] font-bold text-[#6D7BEF]">{meetings.length}</div>
                      <div className="text-[9px] text-[#8A8D99]">个</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#EDFAF3" }}>
                      <div className="text-[10px] text-[#8A8D99]">时间合适</div>
                      <div className="mt-1 text-[22px] font-bold text-[#6CC48D]">{normalCount}</div>
                      <div className="text-[9px] text-[#8A8D99]">个正常</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#FFF8E6" }}>
                      <div className="text-[10px] text-[#8A8D99]">需要关注</div>
                      <div className={`mt-1 text-[22px] font-bold ${conflictCount > 0 ? "text-[#EB6A67]" : "text-[#8A8D99]"}`}>{conflictCount}</div>
                      <div className="text-[9px] text-[#8A8D99]">个冲突</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#EEF0FF" }}>
                      <div className="text-[10px] text-[#8A8D99]">总时长</div>
                      <div className="mt-1 text-[22px] font-bold text-[#A8B3F4]">{totalDuration.toFixed(1)}</div>
                      <div className="text-[9px] text-[#8A8D99]">小时/周</div>
                    </div>
                  </div>

                  <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] ${
                    healthStatus.type === "success" ? "bg-[#EDFAF3] text-[#123524] border border-[#9DD8B8]" :
                    healthStatus.type === "warning" ? "bg-[#FFF8E6] text-[#8A6D30] border border-[#FFE4A8]" :
                    healthStatus.type === "info" ? "bg-[#EEF0FF] text-[#4F5BEF] border border-[#C4CCF5]" :
                    "bg-[#F0F1F5] text-[#8A8D99] border border-[#E4E6EE]"
                  }`}>
                    <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      healthStatus.type === "success" ? "bg-[#8A9A7B]" :
                      healthStatus.type === "warning" ? "bg-[#C4A882]" :
                      healthStatus.type === "info" ? "bg-[#8B9DC3]" :
                      "bg-slate-400"
                    }`} />
                    {healthStatus.text}
                  </div>
                </>
              )}
            </Card>

            {meetings.length > 0 && meetings.map((m) => (
              <MeetingCard key={m.id} meeting={m} onReschedule={() => onRescheduleMeeting(m.id)} onSkip={() => onSkipMeeting(m.id)} />
            ))}

            {meetings.length === 0 && (
              <Card className="border-dashed border-slate-200">
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F4ED]">
                    <CalendarIcon className="h-5 w-5 text-[#8A9A7B]" />
                  </div>
                  <div className="mt-3 text-[13px] font-medium text-slate-600">暂无会议</div>
                  <div className="mt-1 text-[11px] text-slate-400">在左侧填写会议信息，创建第一个会议</div>
                </div>
              </Card>
            )}

            {meetings.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-950">
                  <Lightbulb className="h-4 w-4 text-[#C4A882]" />
                  <span>优化建议</span>
                </div>
                <div className="mt-3 space-y-2">
                  {conflictCount === 0 && meetings.length > 0 ? (
                    <>
                      <div className="flex items-start gap-2 text-[11px] text-slate-600">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8A9A7B]" />
                        <span>所有会议时间安排合理，无需调整。</span>
                      </div>
                      <div className="flex items-start gap-2 text-[11px] text-slate-600">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8A9A7B]" />
                        <span>建议将固定例会设为「每周重复」，系统会自动安排。</span>
                      </div>
                    </>
                  ) : conflictCount > 0 ? (
                    <>
                      <div className="flex items-start gap-2 text-[11px] text-slate-600">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C4A882]" />
                        <span>有 {conflictCount} 个会议存在时间冲突，点击「重新安排时间」可让系统自动寻找合适时段。</span>
                      </div>
                      <div className="flex items-start gap-2 text-[11px] text-slate-600">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C4A882]" />
                        <span>对于临时会议，可使用「跳过这一次」跳过本周安排。</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start gap-2 text-[11px] text-slate-600">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B9DC3]" />
                      <span>暂无会议建议，添加会议后系统会自动分析。</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Frame>
  );
}

const PRIORITY_LINK_LABEL: Record<EventPriority, string> = {
  P1: "P1 最高",
  P2: "P2 高",
  P3: "P3 中",
  P4: "P4 低"
};

function CopyToast({ visible }: { visible: boolean }) {
  return (
    <div className={`pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-[#D4C4A8] bg-[#FAF7F0] px-4 py-2.5 shadow-lg transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
      <div className="flex items-center gap-2 text-[13px] font-medium text-[#8B7B60]">
        <Check className="h-4 w-4 text-[#8A9A7B]" />
        链接已复制到剪贴板
      </div>
    </div>
  );
}

function LinkCard({ link, onPreview, onCopy }: {
  link: SchedulingLinkItem;
  onPreview: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <CopyToast visible={copied} />
      <Card className="group overflow-visible transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${link.enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
              <span className="truncate text-[15px] font-semibold text-slate-950">{link.name}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${link.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {link.enabled ? "已启用" : "已停用"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Timer className="h-3 w-3" />{link.durationHours} 小时
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />{formatTime(link.rangeStartHour)} - {formatTime(link.rangeEndHour)}
              </span>
              <span className="inline-flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{PRIORITY_LINK_LABEL[link.priority]}
              </span>
            </div>
            <div className="mt-1.5 truncate text-[11px] text-slate-400">{link.url}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="flex items-center justify-center gap-1.5 rounded-lg border border-[rgba(138,136,184,0.22)] bg-white px-3 py-2 text-[11px] font-medium text-slate-600 transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]" onClick={handleCopy}>
            <Copy className={`h-3.5 w-3.5 transition-colors ${copied ? "text-[#8A9A7B]" : ""}`} />
            {copied ? "已复制" : "复制链接"}
          </button>
          <button type="button" className="flex items-center justify-center gap-1.5 rounded-lg bg-[#D4DAFA] border border-[#A8B3F4] px-3 py-2 text-[11px] font-medium text-[#2D3582] transition-colors hover:bg-[#A8B3F4] hover:text-white" onClick={onPreview}>
            <Eye className="h-3.5 w-3.5" />
            预览时间
          </button>
        </div>
      </Card>
    </>
  );
}

export function LinksView({
  links,
  onCreateLink,
  onPreviewLink,
  onCopyLink
}: {
  links: SchedulingLinkItem[];
  onCreateLink: (link: SchedulingLinkItem) => void;
  onPreviewLink: (linkId: string) => void;
  onCopyLink: (url: string) => void;
}) {
  const [name, setName] = useState("");
  const [dur, setDur] = useState(0.5);
  const [start, setStart] = useState(10);
  const [end, setEnd] = useState(17);
  const [priority, setPriority] = useState<EventPriority>("P2");

  const enabledLinks = links.filter((l) => l.enabled).length;
  const totalLinks = links.length;
  const totalHours = links.reduce((sum, l) => sum + l.durationHours * ((l.rangeEndHour - l.rangeStartHour)), 0);

  return (
    <Frame
      title="预约链接"
      subtitle="创建不同场景的预约入口，让别人只能预约你真正空闲、且不会影响重要安排的时间。"
      badge={`${links.filter((item) => item.enabled).length} 个已启用`}
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="grid shrink-0 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Card>
            <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-950">
              <Link2 className="h-4 w-4 text-[var(--color-btn-primary)]" />
              新建预约链接
            </div>
            <div className="mt-4 space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="链接名称，例如：快速沟通" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">时长</label>
                  <select value={String(dur)} onChange={(e) => setDur(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 px-2 py-2 text-[12px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                    {[0.25, 0.5, 1, 1.5, 2].map((d) => (
                      <option key={d} value={d}>{d === 0.25 ? "15 分钟" : d === 0.5 ? "30 分钟" : `${d} 小时`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">优先级</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as EventPriority)} className="w-full rounded-xl border border-slate-200 px-2 py-2 text-[12px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                    <option value="P2">P2 高</option>
                    <option value="P3">P3 中</option>
                    <option value="P4">P4 低</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">可预约时段</label>
                <div className="flex items-center gap-1.5">
                  <select value={start} onChange={(e) => setStart(Number(e.target.value))} className="flex-1 rounded-xl border border-slate-200 px-2 py-2 text-[12px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{formatTime(h)}</option>
                    ))}
                  </select>
                  <span className="text-[12px] text-slate-400">至</span>
                  <select value={end} onChange={(e) => setEnd(Number(e.target.value))} className="flex-1 rounded-xl border border-slate-200 px-2 py-2 text-[12px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{formatTime(h)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--color-btn-primary)] px-4 py-2.5 text-[13px] font-medium text-white transition-opacity disabled:opacity-40"
                disabled={!name.trim()}
                onClick={() => {
                  if (!name.trim()) return;
                  onCreateLink({
                    id: `link-${Date.now()}`,
                    name,
                    durationHours: dur,
                    rangeStartHour: start,
                    rangeEndHour: end,
                    priority,
                    enabled: true,
                    url: `https://planner.local/link/${Date.now()}`
                  });
                  setName("");
                }}
              >
                <Plus className="h-4 w-4" />
                创建链接
              </button>
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#111318]">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-[#EEF0FF]">
                    <div className="h-2.5 w-2.5 rounded-sm bg-[#A8B3F4]" />
                  </div>
                  <span>预约概览</span>
                </div>
              </div>

              {links.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className="text-[13px] text-slate-400">暂无预约链接</div>
                  <div className="mt-1 text-[11px] text-slate-400">在左侧创建链接后，这里将显示概览</div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#EEF0FF" }}>
                      <div className="text-[10px] text-[#8A8D99]">链接总数</div>
                      <div className="mt-1 text-[22px] font-bold text-[#6D7BEF]">{totalLinks}</div>
                      <div className="text-[9px] text-[#8A8D99]">个</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#EDFAF3" }}>
                      <div className="text-[10px] text-[#8A8D99]">已启用</div>
                      <div className="mt-1 text-[22px] font-bold text-[#6CC48D]">{enabledLinks}</div>
                      <div className="text-[9px] text-[#8A8D99]">个</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#FFF8E6" }}>
                      <div className="text-[10px] text-[#8A8D99]">可用时段</div>
                      <div className="mt-1 text-[22px] font-bold text-[#E6B85C]">{totalHours.toFixed(1)}</div>
                      <div className="text-[9px] text-[#8A8D99]">小时/天</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#EEF0FF" }}>
                      <div className="text-[10px] text-[#8A8D99]">已停用</div>
                      <div className="mt-1 text-[22px] font-bold text-[#A8B3F4]">{totalLinks - enabledLinks}</div>
                      <div className="text-[9px] text-[#8A8D99]">个</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#C4CCF5] bg-[#EEF0FF] px-3 py-2 text-[11px] text-[#4F5BEF]">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A8B3F4]" />
                    {enabledLinks > 0 ? `有 ${enabledLinks} 个预约链接正在接受他人预约` : "暂无启用的预约链接"}
                  </div>
                </>
              )}
            </Card>

            {links.length > 0 && links.map((link) => (
              <LinkCard key={link.id} link={link} onPreview={() => onPreviewLink(link.id)} onCopy={() => onCopyLink(link.url)} />
            ))}

            {links.length === 0 && (
              <Card className="border-dashed border-[#E4E6EE]">
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF]">
                    <Link2 className="h-5 w-5 text-[#A8B3F4]" />
                  </div>
                  <div className="mt-3 text-[13px] font-medium text-slate-600">暂无预约链接</div>
                  <div className="mt-1 text-[11px] text-slate-400">在左侧填写信息，创建第一个预约链接</div>
                </div>
              </Card>
            )}

            <Card>
              <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-950">
                <Lightbulb className="h-4 w-4 text-[#C4A882]" />
                <span>使用建议</span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2 text-[11px] text-slate-600">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8A9A7B]" />
                  <span>为不同场景创建专属预约入口：深度沟通建议 1 小时，快速同步建议 15-30 分钟。</span>
                </div>
                <div className="flex items-start gap-2 text-[11px] text-slate-600">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8A9A7B]" />
                  <span>高优先级链接（如客户会议）可覆盖低优先级任务时间，系统优先保护。</span>
                </div>
                <div className="flex items-start gap-2 text-[11px] text-slate-600">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8A9A7B]" />
                  <span>复制链接后可发送给同事或客户，对方可选择你设定的空闲时段进行预约。</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Frame>
  );
}

const SYNC_STATUS_MAP: Record<CalendarConnectionItem["status"], { label: string; dot: string; bg: string; text: string }> = {
  "已同步": { label: "已同步", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  "待授权": { label: "待授权", dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  "失败": { label: "同步失败", dot: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-700" }
};

const PRIVACY_OPTIONS = ["显示完整信息", "仅显示忙闲", "不参与排程"] as const;
type PrivacyOption = typeof PRIVACY_OPTIONS[number];

const PRIVACY_MAP: Record<CalendarConnectionItem["privacy"], PrivacyOption> = {
  "显示详情": "显示完整信息",
  "仅显示忙碌": "仅显示忙闲",
  "隐藏": "不参与排程"
};

const PRIVACY_REVERSE: Record<PrivacyOption, CalendarConnectionItem["privacy"]> = {
  "显示完整信息": "显示详情",
  "仅显示忙闲": "仅显示忙碌",
  "不参与排程": "隐藏"
};

function formatLastSynced(lastSynced: string): string {
  try {
    const date = new Date(lastSynced);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} 小时前`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return "昨天";
    if (diffDay < 7) return `${diffDay} 天前`;
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  } catch {
    return lastSynced;
  }
}

function TimeArrangementImportCard() {
  const [file, setFile] = useState<File | null>(null);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("fixed");
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    parsedCount?: number;
    createdCount?: number;
    importEngine?: string;
    aiExplanation?: string;
    message?: string;
  } | null>(null);

  const canUpload = Boolean(file) && !isUploading;

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setResult(null);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai");
      body.append("autoCreate", previewOnly ? "false" : "true");
      body.append("scheduleMode", scheduleMode);

      const response = await fetch("/api/import/time-arrangement", {
        method: "POST",
        body
      });
      const data = (await response.json()) as {
        parsedCount?: number;
        createdCount?: number;
        importEngine?: string;
        aiExplanation?: string;
        message?: string;
      };

      if (!response.ok) {
        setResult({ message: data.message || "导入失败，请检查文件内容是否包含清晰的时间安排。" });
        return;
      }

      setResult(data);
    } catch (error) {
      setResult({ message: error instanceof Error ? error.message : "导入失败，请稍后重试。" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="border-[#B8D7FF] bg-gradient-to-br from-white via-[#F8FBFF] to-[#EEF5FF]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF3FF] text-[#2563EB]">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-slate-950">时间安排导入</div>
            <div className="mt-1 max-w-2xl text-[12px] leading-5 text-slate-500">
              上传课程表、排班表、图片、PDF、Word 或文本文件。系统会先调用后台大模型解析时间块，再自动写入日历；如果模型不可用，会回退本地规则解析。
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-medium text-slate-500">
              {["图片/OCR", "PDF", "Word docx", "TXT", "DeepSeek 解析", "自动填充日历"].map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white px-2 py-1">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full shrink-0 space-y-2 lg:w-[360px]">
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-[#B8D7FF] bg-white px-3 py-3 text-[12px] text-slate-600 transition hover:border-[#2563EB] hover:text-slate-950">
            <FileText className="h-4 w-4 text-[#2563EB]" />
            <span className="min-w-0 flex-1 truncate">{file ? file.name : "选择图片、PDF、Word 或文本文件"}</span>
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "fixed" as const, title: "????", detail: "??/???????" },
              { value: "flexible" as const, title: "????", detail: "??/???????" }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setScheduleMode(option.value)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  scheduleMode === option.value
                    ? "border-[#2563EB] bg-[#EAF3FF] text-[#1D4ED8]"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                <div className="text-[12px] font-semibold">{option.title}</div>
                <div className="mt-0.5 text-[10px] opacity-75">{option.detail}</div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[11px] text-slate-500">
              <input
                type="checkbox"
                checked={previewOnly}
                onChange={(event) => setPreviewOnly(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              仅预览，不写入日历
            </label>
            <button
              type="button"
              disabled={!canUpload}
              onClick={handleUpload}
              className="rounded-xl bg-[#111827] px-4 py-2 text-[12px] font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isUploading ? "识别中..." : previewOnly ? "识别预览" : "识别并导入"}
            </button>
          </div>
          {result ? (
            <div className={`rounded-xl px-3 py-2 text-[11px] leading-5 ${result.message ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
              {result.message ? (
                result.message
              ) : (
                <>
                  已识别 {result.parsedCount ?? 0} 个时间块，已写入 {result.createdCount ?? 0} 个事件。
                  {result.importEngine ? <span> 引擎：{result.importEngine}</span> : null}
                  {result.aiExplanation ? <div className="mt-1 text-emerald-600">{result.aiExplanation}</div> : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function SyncView({
  connections,
  onToggleConnection,
  onSyncConnection,
  onChangePrivacy
}: {
  connections: CalendarConnectionItem[];
  onToggleConnection: (connectionId: string) => void;
  onSyncConnection: (connectionId: string) => void;
  onChangePrivacy: (connectionId: string, value: CalendarConnectionItem["privacy"]) => void;
}) {
  const syncedCount = connections.filter((item) => item.status === "已同步").length;
  const pendingCount = connections.filter((item) => item.status === "待授权").length;
  const failedCount = connections.filter((item) => item.status === "失败").length;

  return (
    <Frame
      title="日历同步"
      subtitle="将你的日历连接到 Planner，系统会读取你的忙碌时间，在安排任务和会议时自动规避冲突。"
      badge={`${syncedCount} 个已连接`}
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <TimeArrangementImportCard />

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#111318]">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-[#EDFAF3]">
                <div className="h-2.5 w-2.5 rounded-sm bg-[#6CC48D]" />
              </div>
              <span>同步概览</span>
            </div>
          </div>

          {connections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="text-[13px] text-[#8A8D99]">暂无日历连接</div>
              <div className="mt-1 text-[11px] text-[#8A8D99]">点击下方卡片连接你的日历</div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#EDFAF3" }}>
                <div className="text-[10px] text-[#8A8D99]">已连接</div>
                <div className="mt-1 text-[22px] font-bold text-[#6CC48D]">{syncedCount}</div>
                <div className="text-[9px] text-[#8A8D99]">个日历</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#FFF8E6" }}>
                <div className="text-[10px] text-[#8A8D99]">待授权</div>
                <div className={`mt-1 text-[22px] font-bold ${pendingCount > 0 ? "text-[#E6B85C]" : "text-[#8A8D99]"}`}>{pendingCount}</div>
                <div className="text-[9px] text-[#8A8D99]">个待连接</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#FDF2F2" }}>
                <div className="text-[10px] text-[#8A8D99]">同步失败</div>
                <div className={`mt-1 text-[22px] font-bold ${failedCount > 0 ? "text-[#EB6A67]" : "text-[#8A8D99]"}`}>{failedCount}</div>
                <div className="text-[9px] text-[#8A8D99]">个</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#EEF0FF" }}>
                <div className="text-[10px] text-[#8A8D99]">隐私模式</div>
                <div className="mt-1 text-[11px] font-medium text-[#A8B3F4]">可配置</div>
                <div className="text-[9px] text-[#8A8D99]">保护细节</div>
              </div>
            </div>
          )}
        </Card>

        <div className="grid shrink-0 gap-4 md:grid-cols-2">
          {connections.length === 0 && (
            <Card className="col-span-2 border-dashed border-[#E4E6EE]">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF0FF]">
                  <CalendarIcon className="h-6 w-6 text-[#A8B3F4]" />
                </div>
                <div className="mt-3 text-[14px] font-medium text-[#4B5563]">暂无日历连接</div>
                <div className="mt-1 text-[12px] text-slate-400">连接日历后，系统可以读取你的忙碌时间并自动规避冲突</div>
              </div>
            </Card>
          )}
          {connections.map((connection) => {
            const st = SYNC_STATUS_MAP[connection.status];
            const privacyLabel = PRIVACY_MAP[connection.privacy];
            const isPaused = connection.status !== "待授权";

            return (
              <Card key={connection.id} className="group relative overflow-visible transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${st.dot}`} />
                      <span className="truncate text-[15px] font-semibold text-slate-950">{connection.name}</span>
                    </div>
                    <div className="mt-1 text-[12px] text-slate-500">
                      {connection.provider} · 同步于 {formatLastSynced(connection.lastSynced)}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${st.bg} ${st.text}`}>
                    {st.label}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-[12px] font-medium text-slate-500">隐私模式</div>
                  <div className="inline-flex min-w-[280px] rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                    {PRIVACY_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`whitespace-nowrap flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all ${privacyLabel === option ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                        onClick={() => onChangePrivacy(connection.id, PRIVACY_REVERSE[option])}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600 transition-colors hover:border-rose-300 hover:text-rose-600"
                    onClick={() => onToggleConnection(connection.id)}
                  >
                    {connection.status === "待授权" ? "连接日历" : isPaused ? "暂停同步" : "恢复同步"}
                  </button>
                  <button
                    type="button"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#D4DAFA] border border-[#A8B3F4] px-3 py-2 text-[11px] font-medium text-[#2D3582] transition-colors hover:bg-[#A8B3F4] hover:text-white"
                    onClick={() => onSyncConnection(connection.id)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    立即同步
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

        {connections.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-950">
              <Shield className="h-4 w-4 text-[#A09AB8]" />
              <span>隐私说明</span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-2 text-[11px] text-slate-600">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8A9A7B]" />
                <span><strong>显示完整信息：</strong>对方可以看到你的日程标题、地点和详情。适合内部团队协作。</span>
              </div>
              <div className="flex items-start gap-2 text-[11px] text-slate-600">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C4A882]" />
                <span><strong>仅显示忙闲：</strong>仅暴露空闲时间段，日程细节保密。适合与外部客户预约。</span>
              </div>
              <div className="flex items-start gap-2 text-[11px] text-slate-600">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A09AB8]" />
                <span><strong>不参与排程：</strong>该日历不参与任何自动安排，用于私人时间或特殊事项。</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Frame>
  );
}

export function AnalyticsView({
  events,
  habits,
  aiLogs,
  onExplainMetric
}: {
  events: CalendarEvent[];
  habits: HabitItem[];
  aiLogs: { action: string }[];
  onExplainMetric: (metric: string) => void;
}) {
  const focusHours = events.filter((event) => event.type === "focus" && event.status !== "unscheduled").reduce((sum, event) => sum + event.duration, 0);
  const meetingHours = events.filter((event) => event.type === "meeting" && event.status !== "unscheduled").reduce((sum, event) => sum + event.duration, 0);
  const taskHours = events.filter((event) => event.type === "task" && event.status !== "unscheduled").reduce((sum, event) => sum + event.duration, 0);
  const habitHours = events.filter((event) => event.type === "habit" && event.status !== "unscheduled").reduce((sum, event) => sum + event.duration, 0);
  const totalHours = events.filter((event) => event.status !== "unscheduled").reduce((sum, event) => sum + event.duration, 0);
  const taskCount = events.filter((event) => event.type === "task").length;
  const taskCompletedCount = events.filter((event) => event.type === "task" && event.status === "completed").length;
  const taskCompletionRate = Math.round((taskCompletedCount / Math.max(taskCount, 1)) * 100);
  const habitTotalTarget = habits.reduce((sum, item) => sum + item.weeklyTarget, 0);
  const habitTotalDone = habits.reduce((sum, item) => sum + item.completedCount, 0);
  const habitCompletionRate = Math.round((habitTotalDone / Math.max(habitTotalTarget, 1)) * 100);
  const replanCount = aiLogs.filter((log) => log.action.includes("重") || log.action.includes("拖动") || log.action.includes("新增")).length;
  const giveUpCount = aiLogs.filter((log) => log.action.includes("干不下去了")).length;
  const highIntensityShare = Math.round((events.filter((event) => event.energyLevel === "high").length / Math.max(events.length, 1)) * 100);
  const unscheduledCount = events.filter((event) => event.status === "unscheduled").length;
  const completedCount = events.filter((event) => event.status === "completed").length;
  const scheduledCount = events.filter((event) => event.status === "scheduled").length;
  const avgDailyHours = totalHours / 7;

  const cards = [
    { key: "task-completion", label: "任务完成率", value: `${taskCompletionRate}%`, sub: `${taskCompletedCount}/${taskCount} 个`, color: taskCompletionRate >= 70 ? "#5DBD82" : taskCompletionRate >= 40 ? "#E6B85C" : "#EB6A67" },
    { key: "focus-time", label: "专注时间", value: `${focusHours.toFixed(1)}`, sub: "小时", color: "#6CC48D" },
    { key: "meeting-time", label: "会议时间", value: `${meetingHours.toFixed(1)}`, sub: "小时", color: "#A8B3F4" },
    { key: "habit-completion", label: "习惯达成率", value: `${habitCompletionRate}%`, sub: habitTotalTarget > 0 ? `${habitTotalDone}/${habitTotalTarget}` : "未设置", color: "#E6B85C" },
    { key: "daily-avg", label: "日均安排", value: `${avgDailyHours.toFixed(1)}`, sub: "小时/天", color: "#6D7BEF" },
    { key: "completed", label: "已完成", value: `${completedCount}`, sub: "项", color: "#5DBD82" }
  ];

  const TIME_BARS = [
    { label: "专注", hours: focusHours, color: "#6CC48D" },
    { label: "会议", hours: meetingHours, color: "#A8B3F4" },
    { label: "习惯", hours: habitHours, color: "#E6B85C" },
    { label: "任务", hours: taskHours, color: "#6D7BEF" }
  ];

  const insights: { condition: boolean; icon: ReactNode; color: string; bg: string; border: string; text: string }[] = [
    {
      condition: meetingHours > focusHours,
      icon: <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#E6B85C" }} />,
      color: "#8A6D30", bg: "#FFF8E6", border: "#FFE4A8",
      text: "会议时间超过专注时间，深度工作时段可能被挤压。"
    },
    {
      condition: habitCompletionRate < 50 && habitTotalTarget > 0,
      icon: <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#A8B3F4" }} />,
      color: "#4F5BEF", bg: "#EEF0FF", border: "#C4CCF5",
      text: "习惯完成率偏低，可适当减少每周目标数量或调整时段。"
    },
    {
      condition: replanCount > 5,
      icon: <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#EB6A67" }} />,
      color: "#7A2522", bg: "#FDF2F2", border: "#F7D9DE",
      text: "本周重排次数较多，日程变动较频繁，建议减少临时插入。"
    },
    {
      condition: giveUpCount > 3,
      icon: <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#EB6A67" }} />,
      color: "#7A2522", bg: "#FDF2F2", border: "#F7D9DE",
      text: "放弃次数较多，部分任务可能过于困难或时间不足。"
    },
    {
      condition: focusHours > meetingHours && focusHours >= 10,
      icon: <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#6CC48D" }} />,
      color: "#123524", bg: "#EDFAF3", border: "#9DD8B8",
      text: "专注时间充足，深度工作效率较高。"
    },
    {
      condition: taskCompletionRate >= 80,
      icon: <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#6CC48D" }} />,
      color: "#123524", bg: "#EDFAF3", border: "#9DD8B8",
      text: "任务完成率高，本周执行力较强。"
    },
    {
      condition: meetingHours <= focusHours && habitCompletionRate >= 50 && replanCount <= 5 && totalHours > 0,
      icon: <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#6CC48D" }} />,
      color: "#123524", bg: "#EDFAF3", border: "#9DD8B8",
      text: "整体安排较为平衡，专注时间充足，习惯达成良好。"
    }
  ];
  const visibleInsights = insights.filter((i) => i.condition);

  const recommendations = [
    { condition: meetingHours > focusHours && totalHours > 0, text: "建议将部分会议调整为线上或缩短时长，保护专注块。" },
    { condition: habitCompletionRate < 60 && habitTotalTarget > 0, text: "习惯目标可能偏高，建议减少每周次数或缩短单次时长。" },
    { condition: focusHours < 10 && totalHours > 0, text: "专注时间偏少，建议锁定每天上午 9:00-11:00 为深度工作时段。" },
    { condition: unscheduledCount > 3, text: `还有 ${unscheduledCount} 个任务待安排，建议尽快安排截止日期。` },
    { condition: taskCount > 10 && taskCompletionRate < 50, text: "任务数量较多，建议按优先级筛选，优先完成 P1/P2。" },
    { condition: totalHours === 0, text: "暂无日程数据，请添加任务、会议或习惯开始追踪。" }
  ].filter((r) => r.condition);

  return (
    <Frame
      title="统计分析"
      subtitle="回顾本周的时间分配和完成情况，了解哪些安排被保护了、哪些被挤压了。"
      badge={totalHours > 0 ? `本周共 ${totalHours.toFixed(1)} 小时` : "暂无日程数据"}
    >
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto">
        <div className="grid grid-cols-6 gap-2">
          {cards.map((card) => (
            <button key={card.key} type="button" className="text-left" onClick={() => onExplainMetric(card.label)}>
              <Card className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
                <div className="text-[10px] font-medium text-slate-500">{card.label}</div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-[18px] font-bold leading-none" style={{ color: card.color }}>{card.value}</span>
                  <span className="text-[11px] text-slate-400">{card.sub}</span>
                </div>
              </Card>
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <Card>
            <div className="text-[14px] font-semibold text-[#111318]">时间分配</div>
            <div className="mt-4 space-y-4">
              {TIME_BARS.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between text-[12px] text-[#4B5563]">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </span>
                    <span className="font-medium">{item.hours.toFixed(1)} 小时</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#F0F1F5]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${totalHours > 0 ? Math.min((item.hours / totalHours) * 100, 100) : 0}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {totalHours > 0 && (
              <div className="mt-4 border-t border-[#E4E6EE] pt-3">
                <div className="text-[11px] font-medium text-[#8A8D99]">本周概况</div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#8A8D99]">
                  <span>高能量占比 {highIntensityShare}%</span>
                  <span>·</span>
                  <span>重排 {replanCount} 次</span>
                  <span>·</span>
                  <span>放弃 {giveUpCount} 次</span>
                  <span>·</span>
                  <span>待安排 {unscheduledCount} 项</span>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <div className="text-[14px] font-semibold text-[#111318]">洞察与建议</div>
            <div className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-[#4B5563]">
              {totalHours === 0 ? (
                <p className="text-[#8A8D99]">暂无本周数据，请先添加任务、会议或习惯。</p>
              ) : visibleInsights.length === 0 ? (
                <p className="text-[#8A8D99]">本周数据一切正常，没有发现明显问题。</p>
              ) : visibleInsights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-lg p-2.5" style={{ backgroundColor: insight.bg, border: `1px solid ${insight.border}` }}>
                  {insight.icon}
                  <span>{insight.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {recommendations.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[#111318]">
              <Lightbulb className="h-4 w-4 text-[#E6B85C]" />
              下周行动建议
            </div>
            <div className="mt-3 space-y-2">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[12px] leading-relaxed text-[#4B5563]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E6B85C]" />
                  <span>{rec.text}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {totalHours > 0 && (
          <Card>
            <div className="text-[14px] font-semibold text-[#111318]">趋势分析</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#E4E6EE] bg-[#FAFBFC] p-3">
                <div className="text-[10px] font-medium uppercase tracking-wide text-[#8A8D99]">任务状态分布</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#4B5563]">
                      <span className="h-2 w-2 rounded-full bg-[#6CC48D]" />
                      <span>已完成 {completedCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#4B5563]">
                      <span className="h-2 w-2 rounded-full bg-[#E6B85C]" />
                      <span>已安排 {scheduledCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#4B5563]">
                      <span className="h-2 w-2 rounded-full bg-[#8A8D99]" />
                      <span>待安排 {unscheduledCount}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#E4E6EE] bg-[#FAFBFC] p-3">
                <div className="text-[10px] font-medium uppercase tracking-wide text-[#8A8D99]">时间类型占比</div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#4B5563]">专注 vs 会议</span>
                    <span className="font-medium" style={{ color: focusHours > meetingHours ? "#6CC48D" : "#EB6A67" }}>
                      {totalHours > 0 ? Math.round((focusHours / totalHours) * 100) : 0}% vs {totalHours > 0 ? Math.round((meetingHours / totalHours) * 100) : 0}%
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8A8D99]">
                    {focusHours > meetingHours ? "专注时间更多，深度工作有保障" : "会议占比较多，需注意保护专注时间"}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#E4E6EE] bg-[#FAFBFC] p-3">
                <div className="text-[10px] font-medium uppercase tracking-wide text-[#8A8D99]">执行健康度</div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#4B5563]">完成率</span>
                    <span className="font-medium" style={{ color: taskCompletionRate >= 70 ? "#6CC48D" : "#EB6A67" }}>
                      {taskCompletionRate}%
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8A8D99]">
                    {taskCompletionRate >= 80 ? "执行力强，继续保持" : taskCompletionRate >= 50 ? "中等水平，可适当优化" : "完成率偏低，建议调整计划"}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="bg-gradient-to-br from-[#FAF7F0]/50 to-white">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8A9A7B]/10">
              <Target className="h-5 w-5 text-[#8A9A7B]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-slate-950">本周总结</div>
              <div className="mt-2 space-y-2 text-[12px] leading-relaxed text-slate-500">
                {totalHours === 0 ? (
                  <p>暂无日程数据。添加任务、会议或习惯后，这里将展示你的周度数据总结。</p>
                ) : (
                  <>
                    <p>本周共安排 <span className="font-semibold text-slate-700">{totalHours.toFixed(1)} 小时</span>，日均 <span className="font-semibold text-slate-700">{avgDailyHours.toFixed(1)} 小时</span>。</p>
                    <p>完成任务 <span className="font-semibold text-slate-700">{taskCompletedCount}/{taskCount} 个</span>，完成率 <span className="font-semibold text-slate-700">{taskCompletionRate}%</span>。</p>
                    <p>专注时间 <span className="font-semibold text-slate-700">{focusHours.toFixed(1)} 小时</span>，会议时间 <span className="font-semibold text-slate-700">{meetingHours.toFixed(1)} 小时</span>。</p>
                    {habitTotalTarget > 0 && (
                      <p>习惯达成 <span className="font-semibold text-slate-700">{habitTotalDone}/{habitTotalTarget} 次</span>，达成率 <span className="font-semibold text-slate-700">{habitCompletionRate}%</span>。</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Frame>
  );
}

function formatHourDecimal(h: number): string {
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseTimeToDecimal(h: number, m: number): number {
  return h + m / 60;
}

const REPLAN_MODES = [
  { value: "conservative" as const, label: "保守", desc: "尽量不移动已安排事项" },
  { value: "balanced" as const, label: "平衡", desc: "在保证重要事项的前提下适度调整" },
  { value: "aggressive" as const, label: "积极", desc: "优先保障高优先级事项，必要时重排低优先级任务" }
];

const COLOR_STYLE_OPTIONS = [
  { value: "柔和" as const, label: "柔和色", desc: "低饱和度，颜色更温和" },
  { value: "高对比" as const, label: "高对比", desc: "颜色更鲜明，适合深色背景" }
];

export function SettingsView({
  settings,
  onUpdateSettings
}: {
  settings: PlannerSettings;
  onUpdateSettings: (patch: Partial<PlannerSettings>) => void;
}) {
  const workStartH = Math.floor(settings.workStart);
  const workStartM = Math.round((settings.workStart - workStartH) * 60);
  const workEndH = Math.floor(settings.workEnd);
  const workEndM = Math.round((settings.workEnd - workEndH) * 60);
  const lunchStartH = Math.floor(settings.lunchStart);
  const lunchStartM = Math.round((settings.lunchStart - lunchStartH) * 60);
  const lunchEndH = Math.floor(settings.lunchEnd);
  const lunchEndM = Math.round((settings.lunchEnd - lunchEndH) * 60);

  const updateWorkStart = (h: number, m: number) => onUpdateSettings({ workStart: parseTimeToDecimal(h, m) });
  const updateWorkEnd = (h: number, m: number) => onUpdateSettings({ workEnd: parseTimeToDecimal(h, m) });
  const updateLunchStart = (h: number, m: number) => onUpdateSettings({ lunchStart: parseTimeToDecimal(h, m) });
  const updateLunchEnd = (h: number, m: number) => onUpdateSettings({ lunchEnd: parseTimeToDecimal(h, m) });

  return (
    <Frame
      title="设置"
      subtitle="根据你的工作习惯调整排程规则，系统会在安排任务、会议和专注时间时自动遵循这些设置。"
      badge={`当前策略：${REPLAN_MODES.find((m) => m.value === settings.replanMode)?.label ?? settings.replanMode}`}
    >
      <div className="grid gap-4 lg:grid-cols-2">

        <Card>
          <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-950">
            <Clock className="h-4 w-4 text-[var(--color-btn-primary)]" />
            工作时间
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <label className="w-16 shrink-0 text-[12px] text-slate-500">开始时间</label>
              <select value={workStartH} onChange={(e) => updateWorkStart(Number(e.target.value), workStartM)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}</option>)}
              </select>
              <span className="text-slate-400">:</span>
              <select value={workStartM} onChange={(e) => updateWorkStart(workStartH, Number(e.target.value))} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                {Array.from({ length: 60 }, (_, m) => m).map((m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-16 shrink-0 text-[12px] text-slate-500">结束时间</label>
              <select value={workEndH} onChange={(e) => updateWorkEnd(Number(e.target.value), workEndM)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}</option>)}
              </select>
              <span className="text-slate-400">:</span>
              <select value={workEndM} onChange={(e) => updateWorkEnd(workEndH, Number(e.target.value))} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                {Array.from({ length: 60 }, (_, m) => m).map((m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-16 shrink-0 text-[12px] text-slate-500">午休开始</label>
              <select value={lunchStartH} onChange={(e) => updateLunchStart(Number(e.target.value), lunchStartM)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}</option>)}
              </select>
              <span className="text-slate-400">:</span>
              <select value={lunchStartM} onChange={(e) => updateLunchStart(lunchStartH, Number(e.target.value))} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                {Array.from({ length: 60 }, (_, m) => m).map((m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-16 shrink-0 text-[12px] text-slate-500">午休结束</label>
              <select value={lunchEndH} onChange={(e) => updateLunchEnd(Number(e.target.value), lunchEndM)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}</option>)}
              </select>
              <span className="text-slate-400">:</span>
              <select value={lunchEndM} onChange={(e) => updateLunchEnd(lunchEndH, Number(e.target.value))} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                {Array.from({ length: 60 }, (_, m) => m).map((m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-950">
            <RefreshCw className="h-4 w-4 text-[var(--color-btn-primary)]" />
            重排策略
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {REPLAN_MODES.map((mode) => (
              <button key={mode.value} type="button" onClick={() => onUpdateSettings({ replanMode: mode.value })} className={`rounded-xl px-4 py-2 text-[12px] font-medium transition ${settings.replanMode === mode.value ? "bg-[var(--color-btn-solid)] text-white" : "border border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"}`}>
                {mode.label}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2 text-[12px] leading-relaxed text-slate-500">
            {REPLAN_MODES.map((mode) => (
              <div key={mode.value} className={`flex items-start gap-2 rounded-lg p-2 ${settings.replanMode === mode.value ? "bg-[var(--color-bg-page-subtle)]" : ""}`}>
                <span className={`mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${settings.replanMode === mode.value ? "bg-[var(--color-btn-solid)]" : "bg-slate-300"}`} />
                <span>
                  <span className="font-medium text-slate-700">{mode.label}：</span>
                  {mode.desc}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-950">
            <Target className="h-4 w-4 text-[var(--color-btn-primary)]" />
            连续专注与缓冲
          </div>
          <div className="mt-4 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-[12px] text-slate-500">
                <span>缓冲时间</span>
                <span className="font-medium text-slate-700">{settings.bufferMinutes} 分钟</span>
              </div>
              <input type="range" min={10} max={30} step={5} value={settings.bufferMinutes} onChange={(event) => onUpdateSettings({ bufferMinutes: Number(event.target.value) })} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200" style={{ accentColor: "var(--color-brand)" }} />
              <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
                <span>10 分钟</span>
                <span>20 分钟</span>
                <span>30 分钟</span>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-[12px] text-slate-500">
                <span>最大连续专注时长</span>
                <span className="font-medium text-slate-700">{settings.maxFocusBlockMinutes} 分钟</span>
              </div>
              <input type="range" min={60} max={180} step={15} value={settings.maxFocusBlockMinutes} onChange={(event) => onUpdateSettings({ maxFocusBlockMinutes: Number(event.target.value) })} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200" style={{ accentColor: "var(--color-brand)" }} />
              <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
                <span>1 小时</span>
                <span>2 小时</span>
                <span>3 小时</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-950">
            <Shield className="h-4 w-4 text-[var(--color-btn-primary)]" />
            其他偏好
          </div>
          <div className="mt-4 space-y-4">
            <label className="flex cursor-pointer items-center gap-3 text-[13px] text-slate-700">
              <input type="checkbox" checked={settings.allowSplitTasks} onChange={(e) => onUpdateSettings({ allowSplitTasks: e.target.checked })} className="h-4 w-4 rounded accent-[var(--color-brand)]" />
              <div>
                <div className="font-medium">允许拆分长任务</div>
                <div className="text-[11px] text-slate-400">超过 3 小时的任务可拆分为多个短块</div>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-[13px] text-slate-700">
              <input type="checkbox" checked={settings.autoLockTimeBlocks} onChange={(e) => onUpdateSettings({ autoLockTimeBlocks: e.target.checked })} className="h-4 w-4 rounded accent-[var(--color-brand)]" />
              <div>
                <div className="font-medium">自动锁定固定事件</div>
                <div className="text-[11px] text-slate-400">已在日历上的事件不会被自动移动</div>
              </div>
            </label>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-slate-500">默认任务优先级</label>
              <select value={settings.defaultTaskPriority} onChange={(e) => onUpdateSettings({ defaultTaskPriority: e.target.value as EventPriority })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20">
                {priorityOptions.map((item) => <option key={item} value={item}>{priorityLabel(item)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-slate-500">低负荷任务偏好</label>
              <div className="grid grid-cols-3 gap-2">
                {(settings.lowLoadTaskPreference || "").split(",").concat(["", "", ""]).slice(0, 3).map((val, i) => (
                  <input
                    key={i}
                    value={val}
                    placeholder={`偏好 ${i + 1}`}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20"
                    onChange={(e) => {
                      const parts = (settings.lowLoadTaskPreference || "").split(",").concat(["", "", ""]).slice(0, 3);
                      parts[i] = e.target.value;
                      onUpdateSettings({ lowLoadTaskPreference: parts.filter(Boolean).join(",") });
                    }}
                  />
                ))}
              </div>
              <div className="mt-1.5 text-[11px] text-slate-400">填写你希望在低负荷时段安排的任务类型，空白格会被忽略</div>
            </div>
          </div>
        </Card>

      </div>
    </Frame>
  );
}
