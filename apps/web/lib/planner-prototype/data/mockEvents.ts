import type {
  AiLog,
  CalendarConnectionItem,
  CalendarEvent,
  FocusPlan,
  HabitItem,
  PlannerSettings,
  PlannerSuggestion,
  SchedulingLinkItem,
  SmartMeetingItem,
  TaskItem
} from "../types/calendar";

export const plannerSettings: PlannerSettings = {
  workStart: 8,
  workEnd: 19,
  lunchStart: 12,
  lunchEnd: 13,
  bufferMinutes: 15,
  replanMode: "balanced",
  maxFocusBlockMinutes: 90,
  allowSplitTasks: true,
  autoLockTimeBlocks: true,
  defaultTaskPriority: "P2",
  calendarColorStyle: "柔和",
  lowLoadTaskPreference: "整理资料"
};

export const mockTasks: TaskItem[] = [
  { id: "task-research", title: "写论文初稿", priority: "P1", dueDate: "2026-05-13 18:00", dueDay: 3, dueHour: 18, estimatedMinutes: 180, remainingMinutes: 180, status: "scheduled", upNext: true, energyLevel: "high", splittable: true },
  { id: "task-slides", title: "准备答辩演示", priority: "P1", dueDate: "2026-05-14 17:00", dueDay: 4, dueHour: 17, estimatedMinutes: 120, remainingMinutes: 120, status: "scheduled", upNext: false, energyLevel: "medium", splittable: true },
  { id: "task-finance", title: "整理财务笔记", priority: "P2", dueDate: "2026-05-12 17:30", dueDay: 2, dueHour: 17.5, estimatedMinutes: 90, remainingMinutes: 90, status: "scheduled", upNext: false, energyLevel: "medium", splittable: true },
  { id: "task-outline", title: "撰写提案大纲", priority: "P2", dueDate: "2026-05-14 16:00", dueDay: 4, dueHour: 16, estimatedMinutes: 90, remainingMinutes: 90, status: "scheduled", upNext: false, energyLevel: "high", splittable: true },
  { id: "task-review", title: "复盘会议纪要", priority: "P3", dueDate: "2026-05-13 15:00", dueDay: 3, dueHour: 15, estimatedMinutes: 45, remainingMinutes: 45, status: "scheduled", upNext: false, energyLevel: "low", splittable: false },
  { id: "task-format", title: "检查格式与引用", priority: "P3", dueDate: "2026-05-15 14:00", dueDay: 5, dueHour: 14, estimatedMinutes: 30, remainingMinutes: 30, status: "unscheduled", upNext: false, energyLevel: "low", splittable: false },
  { id: "task-messages", title: "回复关键消息", priority: "P3", dueDate: "2026-05-12 11:00", dueDay: 2, dueHour: 11, estimatedMinutes: 30, remainingMinutes: 30, status: "unscheduled", upNext: false, energyLevel: "low", splittable: false },
  { id: "task-admin", title: "行政收尾事项", priority: "P4", dueDate: "2026-05-16 16:00", dueDay: 6, dueHour: 16, estimatedMinutes: 45, remainingMinutes: 45, status: "scheduled", upNext: false, energyLevel: "low", splittable: false }
];

export const mockHabits: HabitItem[] = [
  { id: "habit-review", name: "晨间回顾", frequency: "工作日", durationHours: 0.5, preferredStartHour: 8, preferredEndHour: 10, weeklyTarget: 5, completedCount: 2, priority: "P2", active: true },
  { id: "habit-walk", name: "午后走动", frequency: "每天", durationHours: 0.25, preferredStartHour: 15, preferredEndHour: 17, weeklyTarget: 5, completedCount: 1, priority: "P3", active: true },
  { id: "habit-gym", name: "运动重置", frequency: "每周三次", durationHours: 0.75, preferredStartHour: 17, preferredEndHour: 19, weeklyTarget: 3, completedCount: 1, priority: "P2", active: true }
];

export const mockFocusPlan: FocusPlan = {
  weeklyTargetHours: 12,
  protectedHours: 7.5,
  protectedEventIds: ["ev-06", "ev-13", "ev-20", "ev-26"]
};

export const mockMeetings: SmartMeetingItem[] = [
  { id: "meeting-standup", title: "团队站会", attendees: ["小林", "Ada", "Chen"], frequency: "每周", durationHours: 0.5, priority: "P2", scheduledDay: 1, scheduledHour: 11, conflictStatus: "正常", active: true, linkedEventId: "ev-07" },
  { id: "meeting-product", title: "产品同步会", attendees: ["产品经理", "设计", "前端"], frequency: "每周", durationHours: 1, priority: "P2", scheduledDay: 2, scheduledHour: 10.25, conflictStatus: "正常", active: true, linkedEventId: "ev-14" },
  { id: "meeting-client", title: "客户评审", attendees: ["客户", "导师", "我"], frequency: "一次性", durationHours: 1, priority: "P1", scheduledDay: 3, scheduledHour: 11.25, conflictStatus: "正常", active: true, linkedEventId: "ev-21" }
];

export const mockSchedulingLinks: SchedulingLinkItem[] = [
  { id: "link-intro", name: "项目介绍会", durationHours: 0.5, rangeStartHour: 10, rangeEndHour: 17, priority: "P2", enabled: true, url: "https://planner.local/link/project-intro" },
  { id: "link-urgent", name: "紧急沟通窗口", durationHours: 0.5, rangeStartHour: 9, rangeEndHour: 18, priority: "P1", enabled: true, url: "https://planner.local/link/urgent" }
];

export const mockConnections: CalendarConnectionItem[] = [
  { id: "sync-google", name: "Google Calendar", provider: "Google", status: "已同步", privacy: "显示详情", lastSynced: "2026-05-12 09:12" },
  { id: "sync-outlook", name: "Outlook Calendar", provider: "Outlook", status: "待授权", privacy: "仅显示忙碌", lastSynced: "未连接" },
  { id: "sync-personal", name: "个人日历", provider: "Internal", status: "已同步", privacy: "仅显示忙碌", lastSynced: "2026-05-12 08:54" },
  { id: "sync-class", name: "课程日历", provider: "Internal", status: "失败", privacy: "隐藏", lastSynced: "2026-05-11 20:10" }
];

export const mockEvents: CalendarEvent[] = [
  { id: "ev-01", title: "晨间回顾", type: "habit", day: 0, startHour: 8, duration: 0.5, priority: "P3", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-02", title: "清理收件箱", type: "task", day: 0, startHour: 9, duration: 0.75, priority: "P3", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false, taskId: "task-messages" },
  { id: "ev-03", title: "周计划重置", type: "focus", day: 0, startHour: 10.25, duration: 1.5, priority: "P2", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "high", aiGenerated: false },
  { id: "ev-04", title: "午餐", type: "break", day: 0, startHour: 12, duration: 1, priority: "P4", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-05", title: "日历缓冲", type: "buffer", day: 0, startHour: 14, duration: 0.5, priority: "P4", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-06", title: "深度工作：研究笔记", type: "focus", day: 1, startHour: 9, duration: 1.5, priority: "P1", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "high", aiGenerated: false, taskId: "task-research" },
  { id: "ev-07", title: "团队站会", type: "meeting", day: 1, startHour: 11, duration: 0.5, priority: "P2", status: "scheduled", movable: false, fixed: true, flexible: false, energyLevel: "medium", aiGenerated: false },
  { id: "ev-08", title: "午餐", type: "break", day: 1, startHour: 12, duration: 1, priority: "P4", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-09", title: "整理财务笔记", type: "task", day: 1, startHour: 13.5, duration: 1.25, priority: "P2", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "medium", aiGenerated: false, taskId: "task-finance" },
  { id: "ev-10", title: "准备答辩演示", type: "task", day: 1, startHour: 15, duration: 1.5, priority: "P1", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "medium", aiGenerated: false, taskId: "task-slides" },
  { id: "ev-11", title: "恢复缓冲", type: "buffer", day: 1, startHour: 16.75, duration: 0.5, priority: "P4", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-12", title: "晚间收尾", type: "habit", day: 1, startHour: 18, duration: 0.5, priority: "P3", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-13", title: "专注冲刺", type: "focus", day: 2, startHour: 8.5, duration: 1.5, priority: "P1", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "high", aiGenerated: false, taskId: "task-research" },
  { id: "ev-14", title: "产品同步会", type: "meeting", day: 2, startHour: 10.25, duration: 1, priority: "P2", status: "scheduled", movable: false, fixed: true, flexible: false, energyLevel: "medium", aiGenerated: false },
  { id: "ev-15", title: "复盘会议纪要", type: "task", day: 2, startHour: 11.5, duration: 0.75, priority: "P3", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false, taskId: "task-review" },
  { id: "ev-16", title: "午餐", type: "break", day: 2, startHour: 12, duration: 1, priority: "P4", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-18", title: "连续会议缓冲", type: "buffer", day: 2, startHour: 14, duration: 0.25, priority: "P4", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-19", title: "运动重置", type: "habit", day: 2, startHour: 17.5, duration: 0.75, priority: "P3", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "medium", aiGenerated: false },
  { id: "ev-20", title: "策略专注块", type: "focus", day: 3, startHour: 9.25, duration: 1.5, priority: "P2", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "high", aiGenerated: false },
  { id: "ev-21", title: "客户评审", type: "meeting", day: 3, startHour: 11.25, duration: 1, priority: "P1", status: "scheduled", movable: false, fixed: true, flexible: false, energyLevel: "medium", aiGenerated: false },
  { id: "ev-22", title: "午餐", type: "break", day: 3, startHour: 12, duration: 1, priority: "P4", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-23", title: "撰写跟进简报", type: "task", day: 3, startHour: 13.75, duration: 1, priority: "P2", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "medium", aiGenerated: false },
  { id: "ev-24", title: "导师辅导", type: "meeting", day: 3, startHour: 15, duration: 0.75, priority: "P2", status: "scheduled", movable: false, fixed: true, flexible: false, energyLevel: "medium", aiGenerated: false },
  { id: "ev-25", title: "行政收尾", type: "task", day: 3, startHour: 16.25, duration: 0.75, priority: "P4", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false, taskId: "task-admin" },
  { id: "ev-26", title: "受保护专注块", type: "focus", day: 4, startHour: 8.75, duration: 1.5, priority: "P1", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "high", aiGenerated: false },
  { id: "ev-27", title: "设计评审", type: "meeting", day: 4, startHour: 10.75, duration: 1, priority: "P2", status: "scheduled", movable: false, fixed: true, flexible: false, energyLevel: "medium", aiGenerated: false },
  { id: "ev-28", title: "午餐", type: "break", day: 4, startHour: 12, duration: 1, priority: "P4", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-29", title: "检查格式与引用", type: "task", day: 4, startHour: 13.5, duration: 1, priority: "P3", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false, taskId: "task-format" },
  { id: "ev-30", title: "习惯打卡", type: "habit", day: 4, startHour: 16, duration: 0.5, priority: "P3", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-31", title: "周指标整理", type: "task", day: 5, startHour: 9.5, duration: 1, priority: "P3", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-32", title: "午餐", type: "break", day: 5, startHour: 12, duration: 1, priority: "P4", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-33", title: "收尾零散事项", type: "task", day: 5, startHour: 14, duration: 1.5, priority: "P4", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-34", title: "个人规划", type: "habit", day: 6, startHour: 10, duration: 0.75, priority: "P4", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false },
  { id: "ev-35", title: "长距离散步", type: "break", day: 6, startHour: 13.5, duration: 1, priority: "P4", status: "scheduled", movable: true, fixed: false, flexible: true, energyLevel: "low", aiGenerated: false }
];

export const initialSuggestions: PlannerSuggestion[] = [
  { id: "sg-1", title: "保护下午深度工作", description: "今天下午还有完整空档，把高强度任务放到 14:00 后能减少上下文切换。", action: { kind: "focus_slot", day: 1, startHour: 14 } },
  { id: "sg-2", title: "连续会议后补缓冲", description: "周二上午会议较密，11:15 后插入 15 分钟缓冲会更稳。", action: { kind: "insert_buffer", day: 2, startHour: 11.25 } },
  { id: "sg-3", title: "把低优先级任务后移", description: "把收尾事项推到周五下午，可以继续给 P1 / P2 任务让出更好的工作时间。", action: { kind: "rebalance" } }
];

export const initialAiLogs: AiLog[] = [
  {
    id: "log-seed",
    time: "08:00",
    action: "系统初始化",
    summary: "已载入本周示例日程。当前原型会在拖动、改时长、超时、提前完成和模块侧操作后自动写入 AI 日志。",
    changes: ["已加载 35 个时间块", "已建立任务、习惯、会议和同步对象"],
    warnings: []
  }
];
