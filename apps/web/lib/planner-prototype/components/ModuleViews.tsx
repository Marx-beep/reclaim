import type { ReactNode } from "react";
import { Copy, Link2, Plus, RefreshCw, Shield, Target } from "lucide-react";
import { useState } from "react";
import type {
  CalendarConnectionItem,
  CalendarEvent,
  EventPriority,
  FocusPlan,
  HabitItem,
  PlannerSettings,
  QuickTaskInput,
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
    <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[24px] font-semibold text-slate-950">{title}</div>
          <div className="mt-1 max-w-3xl text-[13px] leading-6 text-slate-500">{subtitle}</div>
        </div>
        {badge ? (
          <div className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700">
            {badge}
          </div>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto pr-2">{children}</div>
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[#e8ebf3] bg-white p-4 shadow-soft ${className}`}>{children}</div>;
}

const priorityOptions: EventPriority[] = ["P1", "P2", "P3", "P4"];
const dayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

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

  return (
    <Frame
      title="任务"
      subtitle="这里管理的不是普通待办，而是会被自动排进日历的智能任务对象。优先级、截止时间和 Up Next 会直接改变它们在 Planner 里的落点。"
      badge={`${tasks.filter((task) => task.status === "unscheduled").length} 个未安排`}
    >
      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-950">
            <Plus className="h-4 w-4 text-indigo-600" />
            <span>新增任务</span>
          </div>
          <div className="mt-4 space-y-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：整理答辩逻辑"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <div>
              <div className="mb-2 text-[12px] font-medium text-slate-500">预计时长：{durationHours.toFixed(durationHours % 1 === 0 ? 0 : 2)} 小时</div>
              <input
                type="range"
                min={0.25}
                max={4}
                step={0.25}
                value={durationHours}
                onChange={(event) => setDurationHours(Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPriority(item)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                    priority === item ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {priorityLabel(item)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={dueDay} onChange={(event) => setDueDay(Number(event.target.value))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-[13px]">
                {dayLabels.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </select>
              <select value={String(dueHour)} onChange={(event) => setDueHour(Number(event.target.value))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-[13px]">
                {Array.from({ length: 45 }, (_, index) => 8 + index * 0.25).map((hour) => (
                  <option key={hour} value={hour}>
                    {formatTime(hour)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#4f46e5] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#4338ca]"
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
              添加到任务池
            </button>
          </div>
        </Card>

        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold text-slate-950">{task.title}</div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    截止：{dayLabels[task.dueDay]} {formatTime(task.dueHour)} · 剩余 {task.remainingMinutes} 分钟 · {energyLabel(task.energyLevel)}
                  </div>
                </div>
                <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                  {task.status === "unscheduled" ? "未安排" : task.status === "completed" ? "已完成" : "已安排"}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                    task.upNext ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700"
                  }`}
                  onClick={() => onToggleUpNext(task.id)}
                >
                  {task.upNext ? "Up Next 已开启" : "设为 Up Next"}
                </button>
                {priorityOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onChangePriority(task.id, item)}
                    className={`rounded-full px-2.5 py-1 text-[11px] ${
                      task.priority === item ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-medium text-indigo-700" onClick={() => onScheduleTask(task.id)}>
                  安排进日历
                </button>
                <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700" onClick={() => onOpenTask(task.id)}>
                  打开事件
                </button>
                <button type="button" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700" onClick={() => onMarkDone(task.id)}>
                  标记完成
                </button>
                <button type="button" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-medium text-rose-700" onClick={() => onDeleteTask(task.id)}>
                  删除
                </button>
              </div>
            </Card>
          ))}
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

  return (
    <Frame
      title="习惯"
      subtitle="这里的习惯不是死板重复日程，而是会随着空档自动浮动的 routines。它们会尽量避开高优先级任务，但高优先级习惯也可以挤掉低优先级块。"
      badge={`${habits.reduce((sum, item) => sum + Math.max(item.weeklyTarget - item.completedCount, 0), 0)} 次待完成`}
    >
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <div className="text-[14px] font-semibold text-slate-950">新增习惯</div>
          <div className="mt-4 space-y-3">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：晚间复盘" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px]" />
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#4f46e5] px-4 py-2.5 text-[13px] font-medium text-white"
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
            <button type="button" className="w-full rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-700" onClick={() => onScheduleHabits()}>
              一键安排本周习惯
            </button>
          </div>
        </Card>

        <div className="space-y-4">
          {habits.map((habit) => (
            <Card key={habit.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold text-slate-950">{habit.name}</div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    {habit.frequency} · {habit.durationHours} 小时 · 可安排 {formatTime(habit.preferredStartHour)} - {formatTime(habit.preferredEndHour)}
                  </div>
                </div>
                <button type="button" className={`rounded-full px-3 py-1 text-[11px] font-medium ${habit.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`} onClick={() => onToggleHabit(habit.id)}>
                  {habit.active ? "已启用" : "已暂停"}
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-[12px] text-slate-600">
                <span>本周目标 {habit.weeklyTarget} 次</span>
                <span>已完成 {habit.completedCount} 次</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-medium text-indigo-700" onClick={() => onScheduleHabits(habit.id)}>
                  安排这条习惯
                </button>
              </div>
            </Card>
          ))}
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
  return (
    <Frame
      title="专注时间"
      subtitle="专注时间用于保护深度工作，而不是等会议排完之后看看还剩什么。你可以设置每周目标，系统会尽量把空档保护成可用的专注块。"
      badge={`${focusHours.toFixed(1)} / ${focusPlan.weeklyTargetHours} 小时`}
    >
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <div className="text-[14px] font-semibold text-slate-950">本周专注目标</div>
          <div className="mt-3 text-[28px] font-semibold text-slate-950">
            {focusHours.toFixed(1)} / {focusPlan.weeklyTargetHours} 小时
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min((focusHours / focusPlan.weeklyTargetHours) * 100, 100)}%` }} />
          </div>
          <div className="mt-4">
            <div className="mb-2 text-[12px] font-medium text-slate-500">调整目标：{focusPlan.weeklyTargetHours} 小时</div>
            <input type="range" min={6} max={20} step={1} value={focusPlan.weeklyTargetHours} onChange={(event) => onTargetChange(Number(event.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-600" />
          </div>
          <button type="button" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#4f46e5] px-4 py-2.5 text-[13px] font-medium text-white" onClick={onProtectFocus}>
            <Shield className="h-4 w-4" />
            保护专注时间
          </button>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-950">
            <Target className="h-4 w-4 text-emerald-600" />
            <span>当前洞察</span>
          </div>
          <div className="mt-4 space-y-3 text-[13px] leading-6 text-slate-600">
            <div>系统会优先把专注块放在完整空档中，但不会压过 P1 任务。</div>
            <div>如果会议过多，Planner 会提示“会议正在压缩你的专注时间”，并建议你手动减会议或后移低优先级事项。</div>
            <div>{compressedByMeetings ? "当前检测到会议正在明显压缩专注时长，本周建议至少再补 2 段 90 分钟专注块。" : "当前专注时间仍有保护空间，可以继续填补下午空档。"}</div>
          </div>
        </Card>
      </div>
    </Frame>
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

  return (
    <Frame
      title="智能会议"
      subtitle="这里管理的是可自动找时间、可自动重排的会议对象。重新寻找时间时，系统会尽量保住高优先级任务，并把低优先级块往后挪。"
      badge={`${meetings.filter((item) => item.conflictStatus !== "正常").length} 个待处理冲突`}
    >
      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <div className="text-[14px] font-semibold text-slate-950">新增会议</div>
          <div className="mt-4 space-y-3">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：导师答疑" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px]" />
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#4f46e5] px-4 py-2.5 text-[13px] font-medium text-white"
              onClick={() => {
                if (!title.trim()) return;
                onCreateMeeting({
                  id: `meeting-${Date.now()}`,
                  title,
                  attendees: ["你", "对方"],
                  frequency: "一次性",
                  durationHours: 0.5,
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
              保存会议对象
            </button>
          </div>
        </Card>

        <div className="space-y-4">
          {meetings.map((meeting) => (
            <Card key={meeting.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold text-slate-950">{meeting.title}</div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    {meeting.frequency} · {meeting.attendees.join("、")} · {dayLabels[meeting.scheduledDay]} {formatTime(meeting.scheduledHour)}
                  </div>
                </div>
                <div className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${meeting.conflictStatus === "正常" ? "bg-emerald-50 text-emerald-700" : meeting.conflictStatus === "冲突" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                  {meeting.conflictStatus}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-medium text-indigo-700" onClick={() => onRescheduleMeeting(meeting.id)}>
                  重新寻找时间
                </button>
                <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700" onClick={() => onSkipMeeting(meeting.id)}>
                  跳过本次
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Frame>
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

  return (
    <Frame
      title="预约链接"
      subtitle="预约链接不是静态 URL，而是根据你的可用时间、任务优先级和会议承诺动态开放窗口。高优先级链接可以覆盖 P3/P4 的任务时间。"
      badge={`${links.filter((item) => item.enabled).length} 个已启用链接`}
    >
      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <div className="text-[14px] font-semibold text-slate-950">新增预约链接</div>
          <div className="mt-4 space-y-3">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：项目沟通窗口" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px]" />
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#4f46e5] px-4 py-2.5 text-[13px] font-medium text-white"
              onClick={() => {
                if (!name.trim()) return;
                onCreateLink({
                  id: `link-${Date.now()}`,
                  name,
                  durationHours: 0.5,
                  rangeStartHour: 10,
                  rangeEndHour: 17,
                  priority: "P2",
                  enabled: true,
                  url: `https://planner.local/link/${Date.now()}`
                });
                setName("");
              }}
            >
              <Link2 className="h-4 w-4" />
              保存链接
            </button>
          </div>
        </Card>

        <div className="space-y-4">
          {links.map((link) => (
            <Card key={link.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold text-slate-950">{link.name}</div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    {link.durationHours} 小时 · {formatTime(link.rangeStartHour)} - {formatTime(link.rangeEndHour)} · {priorityLabel(link.priority)}
                  </div>
                  <div className="mt-1 text-[12px] text-slate-500">{link.url}</div>
                </div>
                <div className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${link.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {link.enabled ? "已启用" : "已停用"}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-medium text-indigo-700" onClick={() => onPreviewLink(link.id)}>
                  预览可预约时间
                </button>
                <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700" onClick={() => onCopyLink(link.url)}>
                  <Copy className="mr-1 inline h-3.5 w-3.5" />
                  复制链接
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Frame>
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
  return (
    <Frame
      title="日历同步"
      subtitle="这里模拟多个日历连接与隐私模式。同步后的忙碌时间会进入 Planner 可用性判断，影响任务、习惯、会议和预约链接的开放窗口。"
      badge={`${connections.filter((item) => item.status === "已同步").length} 个已同步`}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {connections.map((connection) => (
          <Card key={connection.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-semibold text-slate-950">{connection.name}</div>
                <div className="mt-1 text-[12px] text-slate-500">最近同步：{connection.lastSynced}</div>
              </div>
              <div className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${connection.status === "已同步" ? "bg-emerald-50 text-emerald-700" : connection.status === "失败" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                {connection.status}
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-2 text-[12px] font-medium text-slate-500">隐私模式</div>
              <div className="flex flex-wrap gap-2">
                {(["显示详情", "仅显示忙碌", "隐藏"] as const).map((item) => (
                  <button key={item} type="button" className={`rounded-full px-3 py-1 text-[11px] ${connection.privacy === item ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`} onClick={() => onChangePrivacy(connection.id, item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700" onClick={() => onToggleConnection(connection.id)}>
                {connection.status === "待授权" ? "连接日历" : "切换状态"}
              </button>
              <button type="button" className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-medium text-indigo-700" onClick={() => onSyncConnection(connection.id)}>
                <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
                手动同步
              </button>
            </div>
          </Card>
        ))}
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
  const taskCompletionRate = Math.round((events.filter((event) => event.type === "task" && event.status === "completed").length / Math.max(events.filter((event) => event.type === "task").length, 1)) * 100);
  const habitCompletionRate = Math.round((habits.reduce((sum, item) => sum + item.completedCount, 0) / Math.max(habits.reduce((sum, item) => sum + item.weeklyTarget, 0), 1)) * 100);
  const replanCount = aiLogs.filter((log) => log.action.includes("重") || log.action.includes("拖动") || log.action.includes("新增")).length;
  const giveUpCount = aiLogs.filter((log) => log.action.includes("干不下去了")).length;
  const highIntensityShare = Math.round((events.filter((event) => event.energyLevel === "high").length / Math.max(events.length, 1)) * 100);

  const cards = [
    { key: "completion", label: "本周任务完成率", value: `${taskCompletionRate}%`, detail: "任务完成率越低，说明自动重排仍在替你保底。" },
    { key: "focus", label: "专注时间总量", value: `${focusHours.toFixed(1)} 小时`, detail: "看看会议是否正在挤压你的高质量工作时间。" },
    { key: "meetings", label: "会议时间总量", value: `${meetingHours.toFixed(1)} 小时`, detail: "会议越多，缓冲和专注保护越重要。" },
    { key: "habits", label: "习惯完成率", value: `${habitCompletionRate}%`, detail: "这是柔性 routine 的达成情况。" },
    { key: "replans", label: "被重排次数", value: `${replanCount}`, detail: "越频繁说明这周变化越大，也越需要智能排程。" },
    { key: "giveup", label: "干不下去了次数", value: `${giveUpCount}`, detail: "它反映了系统是否在适应你的真实状态。" }
  ];

  return (
    <Frame
      title="统计分析"
      subtitle="这里不是简单看图，而是把任务、会议、习惯和重排行为转成时间洞察，帮助你解释这一周为什么会忙、哪里被挤压、下周应该怎么调。"
      badge={`高强度任务占比 ${highIntensityShare}%`}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <button key={card.key} type="button" className="text-left" onClick={() => onExplainMetric(card.label)}>
            <Card className="h-full transition hover:-translate-y-[1px] hover:shadow-hover">
              <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">{card.label}</div>
              <div className="mt-2 text-[24px] font-semibold text-slate-950">{card.value}</div>
              <div className="mt-2 text-[12px] leading-5 text-slate-500">{card.detail}</div>
            </Card>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="text-[14px] font-semibold text-slate-950">时间分配图</div>
          <div className="mt-4 space-y-3">
            {[
              { label: "专注", hours: focusHours, color: "bg-emerald-500" },
              { label: "会议", hours: meetingHours, color: "bg-amber-500" },
              { label: "习惯", hours: events.filter((event) => event.type === "habit").reduce((sum, event) => sum + event.duration, 0), color: "bg-pink-500" },
              { label: "任务", hours: events.filter((event) => event.type === "task").reduce((sum, event) => sum + event.duration, 0), color: "bg-indigo-500" }
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-[12px] text-slate-600">
                  <span>{item.label}</span>
                  <span>{item.hours.toFixed(1)} 小时</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`${item.color} h-full rounded-full`} style={{ width: `${Math.min((item.hours / 16) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-[14px] font-semibold text-slate-950">下周建议</div>
          <div className="mt-4 space-y-3 text-[13px] leading-6 text-slate-600">
            <div>如果会议继续增加，建议先保护两段上午专注块，再决定是否接受更多协作请求。</div>
            <div>“干不下去了”触发偏多时，可以提前插入低负荷任务，降低连续高强度切换。</div>
            <div>本周重排频繁，说明你们的任务和会议对象已经很适合继续往 Reclaim 风格的自动化方向深化。</div>
          </div>
        </Card>
      </div>
    </Frame>
  );
}

export function SettingsView({
  settings,
  onUpdateSettings
}: {
  settings: PlannerSettings;
  onUpdateSettings: (patch: Partial<PlannerSettings>) => void;
}) {
  return (
    <Frame
      title="设置"
      subtitle="这里控制排程策略本身。保守 / 平衡 / 激进会影响后续重排时移动任务的积极程度，而缓冲、拆分和最大连续专注时间会影响事件生成方式。"
      badge={`当前策略：${settings.replanMode === "conservative" ? "保守" : settings.replanMode === "balanced" ? "平衡" : "激进"}`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-[14px] font-semibold text-slate-950">工作时间</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-[12px] text-slate-500">
              开始
              <input type="number" min={6} max={12} value={settings.workStart} onChange={(event) => onUpdateSettings({ workStart: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-900" />
            </label>
            <label className="text-[12px] text-slate-500">
              结束
              <input type="number" min={15} max={22} value={settings.workEnd} onChange={(event) => onUpdateSettings({ workEnd: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-900" />
            </label>
            <label className="text-[12px] text-slate-500">
              午休开始
              <input type="number" min={11} max={14} step={0.25} value={settings.lunchStart} onChange={(event) => onUpdateSettings({ lunchStart: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-900" />
            </label>
            <label className="text-[12px] text-slate-500">
              午休结束
              <input type="number" min={12} max={15} step={0.25} value={settings.lunchEnd} onChange={(event) => onUpdateSettings({ lunchEnd: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-900" />
            </label>
          </div>
        </Card>

        <Card>
          <div className="text-[14px] font-semibold text-slate-950">重排策略</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["conservative", "balanced", "aggressive"] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => onUpdateSettings({ replanMode: mode })} className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${settings.replanMode === mode ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
                {mode === "conservative" ? "保守" : mode === "balanced" ? "平衡" : "激进"}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-3 text-[12px] leading-6 text-slate-600">
            <div>保守：尽量少移动已有任务。</div>
            <div>平衡：为了高优先级任务允许适度重排。</div>
            <div>激进：会更积极地移动低优先级块来保护 P1 / P2。</div>
          </div>
        </Card>

        <Card>
          <div className="text-[14px] font-semibold text-slate-950">连续专注与缓冲</div>
          <div className="mt-4 space-y-4">
            <label className="block text-[12px] text-slate-500">
              缓冲时间：{settings.bufferMinutes} 分钟
              <input type="range" min={10} max={30} step={5} value={settings.bufferMinutes} onChange={(event) => onUpdateSettings({ bufferMinutes: Number(event.target.value) })} className="mt-2 h-2 w-full appearance-none rounded-full bg-slate-200 accent-indigo-600" />
            </label>
            <label className="block text-[12px] text-slate-500">
              最大连续专注时间：{settings.maxFocusBlockMinutes} 分钟
              <input type="range" min={60} max={180} step={15} value={settings.maxFocusBlockMinutes} onChange={(event) => onUpdateSettings({ maxFocusBlockMinutes: Number(event.target.value) })} className="mt-2 h-2 w-full appearance-none rounded-full bg-slate-200 accent-emerald-600" />
            </label>
          </div>
        </Card>

        <Card>
          <div className="text-[14px] font-semibold text-slate-950">其他偏好</div>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 text-[12px] text-slate-600">
              <input type="checkbox" checked={settings.allowSplitTasks} onChange={(event) => onUpdateSettings({ allowSplitTasks: event.target.checked })} />
              允许拆分长任务
            </label>
            <label className="flex items-center gap-2 text-[12px] text-slate-600">
              <input type="checkbox" checked={settings.autoLockTimeBlocks} onChange={(event) => onUpdateSettings({ autoLockTimeBlocks: event.target.checked })} />
              自动锁定固定事件
            </label>
            <label className="block text-[12px] text-slate-500">
              默认任务优先级
              <select value={settings.defaultTaskPriority} onChange={(event) => onUpdateSettings({ defaultTaskPriority: event.target.value as EventPriority })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-900">
                {priorityOptions.map((item) => (
                  <option key={item} value={item}>
                    {priorityLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[12px] text-slate-500">
              低负荷任务偏好
              <input value={settings.lowLoadTaskPreference} onChange={(event) => onUpdateSettings({ lowLoadTaskPreference: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-900" />
            </label>
          </div>
        </Card>
      </div>
    </Frame>
  );
}
