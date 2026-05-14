# Reclaim Planner 动态时间管理平台

Reclaim Planner 是一个本地可运行的动态时间管理平台。它不是普通日历，而是一个围绕任务、习惯、专注时间、会议、预约链接、时间安排导入、AI 策略建议和规则重排构建的智能调度系统。

当前版本是单用户 MVP，适合本地使用、产品原型验证、继续二次开发和演示分发。

## 当前状态

已经实现：

- 中文界面
- 类 Reclaim 的 Planner 工作台
- 深色左侧导航与浅色日历工作区
- 四象限任务仪表盘
- 日历视图
- 手动添加任务、计划、事件
- 点击/选择时间段创建任务
- 类别标签与个性化标签
- 时间使用分析
- 时间安排导入接口
- 预约链接基础能力
- DeepSeek / OpenAI 兼容大模型调度建议
- 本地规则重排兜底
- 独立运维后台
- AI Key 配置与用量统计
- Python FastAPI 调度服务
- Docker 本地基础设施
- Windows 一键启动脚本
- Electron exe 打包与 app-use 分发目录

主要入口：

```text
前端应用：http://localhost:3000
新版 Planner：http://localhost:3000/planner
运维后台：http://localhost:3000/ops
调度服务：http://localhost:8000/docs
```

默认运维口令：

```text
reclaim-admin
```

可以在 `.env` 中通过 `OPS_ADMIN_PASSWORD` 修改。

## 一分钟启动

在 Windows 上推荐使用脚本启动。

```bat
scripts\windows\start-maintenance.cmd
```

停止服务：

```bat
scripts\windows\stop-maintenance.cmd
```

查看状态：

```bat
scripts\windows\status-maintenance.cmd
```

如果是第一次在新电脑运行，请先检查环境：

```bat
scripts\windows\check-env.cmd
```

## 首次安装

推荐环境：

- Windows 10/11
- Git
- Node.js 18+
- pnpm
- Docker Desktop
- Python 3.11+

安装步骤：

```bash
copy .env.example .env
pnpm install
docker compose -f infra/compose/docker-compose.yml up -d postgres redis
pnpm db:generate
pnpm db:migrate
pnpm db:seed
scripts\windows\start-maintenance.cmd
```

如果没有 pnpm，可以先尝试：

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## 软件怎么用

### 1. 打开主界面

访问：

```text
http://localhost:3000
```

主界面用于查看任务总览、日历、分析、设置等页面。

### 2. 使用新版 Planner

访问：

```text
http://localhost:3000/planner
```

新版 Planner 是当前重点工作台，包含：

- 深色左侧导航
- 中央周视图日历
- 右侧任务与 AI 建议面板
- 任务、习惯、专注、会议、预约链接、同步、分析、设置模块
- 拖动时间块、调整时长、重排、恢复方案等交互

如果浏览器显示旧样式，请强制刷新：

```text
Ctrl + F5
```

### 3. 创建任务和事件

可以通过以下方式创建：

- 在快速创建区域输入任务
- 在日历中点击时间段
- 在任务池中创建自定义任务
- 通过导入时间安排生成事件

任务不是固定模板，用户可以自由创建。

### 4. 使用标签

系统区分两类标签。

类别标签用于统计时间记录，例如：

```text
学习、工作、深度工作、会议、任务、习惯、娱乐、运动、休息、睡眠、家庭、社交、通勤、旅行、吃饭、个人事务、健康、财务、创作、阅读、其他
```

个性化标签用于用户自己的组织方式，例如：

```text
论文、考研、项目A、客户B、英语、编程、健身、复盘
```

分析页优先使用类别标签统计时间分配。

### 5. 触发动态重排

以下行为可以触发重排：

- 任务延迟
- 任务提前完成
- 新增任务
- 删除任务
- 拖动时间块
- 点击“干不下去了”
- 手动调用重排 API

系统会优先调用 AI 生成调度策略建议，然后交给本地规则引擎校验和执行。如果 AI 不可用，会自动使用本地规则兜底。

## 核心功能

### 动态日历

日历从早上 6 点开始显示，更适合学习、工作、课程和日常计划。

支持的时间块类型：

```text
任务、习惯、专注时间、会议、缓冲时间、预约占位、个人时间、PTO/OOO
```

支持的锁定状态：

```text
FREE、BUSY、SOFT_LOCKED、HARD_LOCKED
```

### 四象限任务

仪表盘用于展示四象限任务：

```text
重要且紧急
重要不紧急
紧急不重要
不紧急不重要
```

四象限用于帮助判断处理顺序，不限制用户创建任务。

### 时间分析

分析页面提供：

- 深度工作时长
- 会议时长
- 任务完成率
- 时间利用率
- 时间分类构成
- 时间分配趋势
- 习惯与任务投入
- 专注 vs 浅层工作
- 工作生活平衡

### 时间安排导入

接口名称为“时间安排”，支持后续扩展图片、PDF、Word 等内容识别。

相关 API：

```http
POST /api/import/time-arrangement
```

设计目标：上传课程表、排班表、时间安排截图、PDF 或 Word 后，系统识别时间块并加入日历。

### 预约链接

预约链接用于让别人选择你的可用时间。例如：

- 咨询预约
- 会议预约
- 项目沟通
- 面试安排

当前是基础 MVP，后续可以扩展为团队预约、外部访客页面、Google/Outlook 写回等能力。

## AI 调度设计

本项目不让大模型直接控制数据库，也不让它绕过规则直接改日历。

采用两阶段：

```text
用户变化 -> AI 策略建议 -> 本地规则/调度引擎执行 -> 返回时间块与解释
```

这样设计的原因：

- AI 适合理解自然语言和复杂偏好
- 规则引擎适合保证时间约束稳定
- OR-Tools / 启发式规则适合做可验证排程
- AI 失败时系统仍能工作
- 调度原因可以记录和解释

## DeepSeek 配置

打开运维后台：

```text
http://localhost:3000/ops
```

在后台配置：

- API Key
- 模型名称
- API URL
- 输入 token 单价
- 输出 token 单价

推荐 DeepSeek 兼容配置：

```text
API URL：https://api.deepseek.com/chat/completions
Model：deepseek-chat 或 deepseek-v4-flash
```

也可以通过 `.env` 配置：

```bash
DEEPSEEK_API_KEY=你的密钥
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions
```

真实 Key 会保存在：

```text
.runtime/llm-settings.json
```

调用用量会记录在：

```text
.runtime/llm-usage.json
```

`.runtime` 已加入 `.gitignore`，不会上传到 GitHub。

## 关键 API

### 动态重排 API

```http
POST /api/scheduling/replan
```

请求示例：

```json
{
  "type": "task_delayed",
  "taskId": "task_001",
  "delayMinutes": 40,
  "currentSchedule": []
}
```

响应示例：

```json
{
  "newSchedule": [
    {
      "start": "11:00",
      "end": "11:40",
      "title": "继续写论文"
    },
    {
      "start": "11:40",
      "end": "12:10",
      "title": "做PPT"
    },
    {
      "start": "12:10",
      "end": "12:20",
      "title": "缓冲时间"
    }
  ],
  "explanation": "写论文延迟后，系统将后续任务顺延，并插入缓冲时间。",
  "source": "ai"
}
```

### LLM 重排 API

```http
POST /api/scheduling/llm-replan
```

### 调度规则 API

```http
GET /api/scheduling/llm-rules
PUT /api/scheduling/llm-rules
```

### 事件级重排 API

```http
POST /api/scheduling/event-replan
POST /api/scheduling/event-replan/undo
```

### 运维后台 AI 配置 API

```http
GET /api/admin/llm-settings
POST /api/admin/llm-settings
```

### 常用业务 API

```text
/api/events
/api/tasks
/api/tasks/[id]/schedule
/api/habits
/api/focus
/api/links
/api/analytics/weekly
/api/settings/time-policy
/api/import/time-arrangement
```

## 运维后台

运维后台与普通用户前端分离。

访问：

```text
http://localhost:3000/ops
```

主要用于：

- 查看系统健康
- 查看数据库状态
- 查看 Redis / BullMQ 状态
- 查看调度服务状态
- 查看用户数量
- 查看连接日历数量
- 查看事件数量
- 查看预约链接数量
- 查看最近调度作业
- 查看最近调度决策
- 配置 DeepSeek API Key
- 查看 AI 调用次数、token 用量和预估费用

## 项目结构

```text
reclaim/
  apps/
    web/                 Next.js 前端和 BFF API
    desktop/             Electron 桌面端壳
  packages/
    database/            Prisma 数据库层
    domain/              SmartEvent 领域模型
    integrations/        Google / Outlook 集成
    queue/               BullMQ 队列
    recurrence/          rrule 重复规则
    temporal/            Temporal 时间工具
    config/              环境配置
  services/
    scheduler/           Python FastAPI 调度服务
  infra/
    compose/             Docker Compose
  scripts/
    windows/             一键启动、停止、检查、打包、同步脚本
  docs/                  项目文档
  app-use/               对外分发目录
```

## 技术栈

- Monorepo：pnpm workspace + turbo
- 前端：Next.js App Router + TypeScript + Tailwind CSS + TanStack Query
- 日历：FullCalendar
- UI：shadcn/ui 风格组件 + 自定义 Planner UI
- 数据库：Prisma + PostgreSQL
- 队列：BullMQ + Redis
- 日历集成：googleapis + Microsoft Graph JavaScript SDK
- 重复规则：rrule
- 时间处理：Temporal polyfill
- 调度服务：Python + FastAPI + OR-Tools / 启发式规则
- 桌面端：Electron
- AI：DeepSeek / OpenAI 兼容 Chat Completions API

## 数据模型

核心抽象是 SmartEvent。

SmartEvent 统一表示：

```text
TASK、HABIT、FOCUS、MEETING、BUFFER、LINK_HOLD、PTO
```

关键字段：

```text
id、type、title、description、startAt、endAt、timezone、priority、status、flexibility、lockState、source、recurrenceRule、dueAt、energyProfile、calendarId、isAllDay、metadata
```

关联模型包括：

```text
User、Account、CalendarConnection、ExternalCalendar、ExternalEventMirror、Task、Habit、FocusBlock、MeetingTemplate、SchedulingLink、BufferRule、AvailabilityRule、WorkHourRule、TimePolicy、SchedulingConstraint、SchedulingDecision、RescheduleJob、AnalyticsSnapshot、AuditLog
```

## 本地基础设施

启动 PostgreSQL 和 Redis：

```bash
docker compose -f infra/compose/docker-compose.yml up -d postgres redis
```

完整 compose：

```bash
docker compose -f infra/compose/docker-compose.yml up --build
```

默认端口：

```text
PostgreSQL：5432
Redis：6379
Web：3000
Scheduler：8000
```

## 测试与构建

Web 类型检查：

```bash
pnpm --filter @reclaim/web typecheck
```

Web 测试：

```bash
pnpm --filter @reclaim/web test
```

Web 构建：

```bash
pnpm --filter @reclaim/web build
```

全仓命令：

```bash
pnpm typecheck
pnpm test
pnpm build
```

## EXE 打包

生成对外分发文件夹：

```bat
scripts\windows\build-app-use.cmd
```

或：

```bash
npm run app-use:build
```

输出目录：

```text
app-use/
```

其中包含：

```text
Reclaim-Time-Manager-0.1.0-x64.exe
中文软件使用教程.md
```

注意：exe 是桌面壳。目标电脑仍需要本地服务和依赖环境正常，或者需要提前按 README 初始化。

## GitHub 同步

普通方式：

```bash
git add .
git commit -m "你的提交说明"
git push origin main
```

项目脚本：

```bat
scripts\windows\git-sync.cmd
```

如果提示 Git 身份未配置：

```bash
git config user.name "你的 GitHub 用户名"
git config user.email "你的 GitHub 邮箱"
```

如果推送失败，先检查网络：

```powershell
Test-NetConnection github.com -Port 443
```

## 常见问题

### 页面还是旧样式

请强制刷新：

```text
Ctrl + F5
```

或者清理缓存并重启：

```powershell
scripts\windows\stop-maintenance.cmd
Remove-Item -Recurse -Force apps\web\.next
scripts\windows\start-maintenance.cmd
```

### 页面打不开

检查服务：

```bat
scripts\windows\status-maintenance.cmd
```

重启服务：

```bat
scripts\windows\stop-maintenance.cmd
scripts\windows\start-maintenance.cmd
```

### 调度服务打不开

访问：

```text
http://localhost:8000/health
```

如果不可用，重新运行启动脚本。脚本会使用 `services/scheduler/.venv` 虚拟环境。

### AI 调用失败

检查：

- 运维后台是否保存 API Key
- 模型名是否正确
- API URL 是否正确
- 网络是否能访问 DeepSeek
- 账号余额或额度是否正常

AI 失败时会自动回退本地规则重排。

### Redis 队列降级

如果 Redis 版本过低，后台可能显示队列 degraded。直接调度仍可用，但异步队列会降级。推荐使用 compose 中的 Redis 7。

## 不会上传到 GitHub 的内容

```text
.env
.env.local
.runtime/
node_modules/
.next/
.turbo/
services/scheduler/.venv/
apps/desktop/dist/
*.log
*.pid
```

## 产品优势

- 核心是动态调度，不是普通日历皮肤。
- AI 做策略建议，规则引擎负责执行，稳定性更高。
- DeepSeek Key 可在后台配置，并能统计用量。
- 前端应用与运维后台分离，适合后续运营。
- 支持本地规则兜底，不依赖 AI 才能运行。
- 支持虚拟环境，方便换电脑运行。
- Monorepo 分层清晰，便于继续维护和扩展。
- 保留 Google Calendar、Outlook Calendar、BullMQ、Prisma、FastAPI、OR-Tools 的扩展基础。

## 后续规划

- 将 `/planner` 原型数据完全切换为数据库真实数据
- 完善 Google / Outlook 双向同步
- 增强 OR-Tools 约束求解
- 增加团队协作与成员权限
- 增强课程表、排班表、PDF、Word、图片识别导入
- 完善桌面端离线启动体验
- 增加更多时间分析维度和成本控制
- 增加移动端适配

## 说明

本项目是 Reclaim AI 风格的动态时间管理平台 MVP。项目没有 fork Cal.com，也不把 Cal.com 作为运行时依赖。当前代码以独立数据模型、独立调度接口和独立本地服务实现，适合继续产品化开发。
