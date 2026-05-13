# Reclaim AI 风格动态时间管理平台

这是一个本地可运行、可扩展的动态时间管理平台。它不是普通日历，而是围绕“任务、习惯、专注时间、会议、时间安排导入、AI 策略建议、规则重排、用量监控”构建的智能调度系统。

当前版本聚焦单用户 MVP：可以创建任务与事件、查看日历、做四象限任务管理、分析时间分配、导入时间安排、调用 DeepSeek/兼容大模型参与重排，并通过独立运维后台监控系统状态与 API 用量。

## 1. 软件能做什么

核心能力：

- 任务管理：创建自定义任务，不使用固定模板，可设置优先级、截止时间、标签和时间段。
- 日历视图：用 FullCalendar 展示日程，从早上 6 点开始显示，支持选择时间段添加任务/事件。
- 动态重排：任务延迟、提前完成、新增、删除、拖动时间块后，可触发重新排程。
- AI 调度建议：可接入 DeepSeek 或 OpenAI 兼容接口，让大模型生成调度策略建议，再由规则引擎执行。
- 本地规则兜底：未配置 API Key 或模型调用失败时，会自动回退到本地规则重排，避免功能中断。
- 四象限任务视图：仪表盘展示重要紧急、重要不紧急、紧急不重要、不紧急不重要四类任务。
- 时间分析：统计专注、会议、任务、习惯、缓冲、个人时间等占比，辅助优化时间管理。
- 时间安排导入：支持上传图片、PDF、Word 等时间安排内容，解析后导入日历。
- 预约链接：支持基础 scheduling links 能力。
- 运维后台：与用户前端分离，用于查看用户数、作业、系统健康、调度日志、DeepSeek Key 与用量。
- 桌面端分发：可打包 Electron exe，并把 exe 与中文教程放入 `app-use/` 文件夹。

## 2. 技术架构

项目采用 Monorepo：

```text
reclaim/
  apps/
    web/                 Next.js 前端 + BFF API
    desktop/             Electron 桌面壳
  packages/
    database/            Prisma + PostgreSQL
    domain/              SmartEvent 与调度领域模型
    integrations/        Google Calendar / Outlook Calendar 集成
    queue/               BullMQ + Redis 队列
    recurrence/          rrule 重复规则
    temporal/            Temporal 时间处理封装
    config/              环境配置
  services/
    scheduler/           Python FastAPI + OR-Tools/规则调度服务
  infra/
    compose/             Docker Compose 本地基础设施
  scripts/
    windows/             Windows 一键启动、检查、打包、Git 同步脚本
  app-use/               对外分发 exe 与中文教程
```

主要技术栈：

- Monorepo：pnpm workspace + turbo
- Web：Next.js App Router + TypeScript + Tailwind CSS + TanStack Query + FullCalendar
- 数据库：Prisma + PostgreSQL
- 队列：BullMQ + Redis
- 调度服务：Python + FastAPI + OR-Tools + 规则启发式调度
- 日历集成：googleapis + Microsoft Graph JavaScript SDK
- 重复规则：rrule
- 时间处理：Temporal polyfill
- 桌面端：Electron
- AI：DeepSeek/OpenAI 兼容 Chat Completions API

## 3. 运行环境要求

推荐环境：

- Windows 10/11
- Node.js 18+
- Python 3.11+
- Docker Desktop
- Git
- pnpm，若未安装，脚本会尝试通过 corepack 自动启用

新电脑建议先运行：

```bat
scripts\windows\check-env.cmd
```

或：

```bash
npm run maintenance:check
```

## 4. 首次安装与启动

1. 复制环境变量：

```bash
copy .env.example .env
```

Linux/macOS 可用：

```bash
cp .env.example .env
```

2. 安装依赖：

```bash
pnpm install
```

3. 启动 PostgreSQL 与 Redis：

```bash
docker compose -f infra/compose/docker-compose.yml up -d postgres redis
```

4. 初始化数据库：

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

5. 一键启动 Web 与调度服务：

```bat
scripts\windows\start-maintenance.cmd
```

或：

```bash
npm run maintenance:start
```

启动后访问：

- 前端应用：`http://localhost:3000/`
- 运维后台：`http://localhost:3000/ops`
- 调度服务文档：`http://localhost:8000/docs`

默认运维后台口令：

```text
reclaim-admin
```

可以在 `.env` 中修改：

```bash
OPS_ADMIN_PASSWORD=你的新口令
```

## 5. 日常启动、停止与状态检查

启动：

```bat
scripts\windows\start-maintenance.cmd
```

停止：

```bat
scripts\windows\stop-maintenance.cmd
```

查看状态：

```bat
scripts\windows\status-maintenance.cmd
```

npm 命令：

```bash
npm run maintenance:start
npm run maintenance:stop
npm run maintenance:status
```

说明：

- Python 调度服务会在 `services/scheduler/.venv` 虚拟环境中运行。
- 第一次启动会自动创建虚拟环境并安装 Python 依赖。
- `.venv`、`.runtime`、`.env`、构建产物不会上传到 GitHub。

## 6. 使用流程

推荐使用顺序：

1. 打开前端：`http://localhost:3000/`
2. 在仪表盘查看四象限任务，判断哪些任务需要优先处理。
3. 进入日历页：`/calendar`。
4. 点击或框选时间段，创建任务、计划或事件。
5. 为时间记录选择类别标签，例如学习、工作、娱乐、会议、运动、个人、通勤、休息等。
6. 如果任务延迟、拖动时间块或点击“干不下去了”，触发动态重排。
7. 系统优先尝试 AI 策略建议；失败时自动使用本地规则重排。
8. 在分析页查看时间分配、专注时间、会议占比、任务完成情况。
9. 在设置页调整工作时间、可用时间、时间策略。
10. 在运维后台查看系统健康、调度记录、AI 用量和费用估算。

## 7. 页面说明

### 仪表盘 `/`

仪表盘用于四象限任务管理：

- 重要且紧急：立即处理
- 重要不紧急：优先规划
- 紧急不重要：可委派或压缩
- 不紧急不重要：低优先级处理

任务由用户自己创建，不是固定任务。四象限只是任务组织方式。

### 日历 `/calendar`

日历是核心工作台：

- 从早上 6 点开始展示时间轴。
- 支持查看任务、会议、专注时间、习惯、缓冲时间。
- 支持点击或选择时间段创建任务/事件。
- 支持给时间块添加类别标签和个性化标签。
- 支持拖动时间块触发动态重排。

### 预约链接 `/links`

用于创建基础预约链接，后续可扩展为团队会议和外部预约能力。

### 分析 `/analytics`

用于可视化时间使用：

- 时间分类占比
- 专注时间趋势
- 会议时间趋势
- 任务/习惯用时
- 工作与个人时间平衡
- 浅层工作与深度工作对比
- 加班与非工作时间占用

### 设置 `/settings`

用于配置：

- 日历同步
- 可用时间
- 工作时间
- 时间策略
- 锁定策略
- 缓冲策略

### 运维后台 `/ops`

这是维护者使用的独立后台，不属于普通用户前端。

功能包括：

- 用户总数
- 已连接日历数
- 7 天内事件数
- 活跃预约链接数
- 数据库健康状态
- 调度服务健康状态
- Redis/BullMQ 队列状态
- 最近调度作业
- 最近调度决策
- DeepSeek API Key 配置
- AI 调用次数、token 用量、预估费用

## 8. 标签体系

系统区分两类标签：

### 类别标签

类别标签用于时间记录与统计分析。建议覆盖完整时间使用场景：

- 学习
- 工作
- 深度工作
- 会议
- 任务
- 习惯
- 娱乐
- 运动
- 休息
- 睡眠
- 家庭
- 社交
- 通勤
- 旅行
- 吃饭
- 个人事务
- 健康
- 财务
- 创作
- 阅读
- 其他

分析页优先使用类别标签来统计时间分配。

### 个性化标签

个性化标签用于用户自己的组织方式，例如：

- 考研
- 论文
- 项目A
- 客户B
- 复盘
- 英语
- 编程
- 健身

个性化标签不替代类别标签，而是作为更细粒度的补充。

## 9. 动态调度原理

系统采用“两层调度”思路：

### 第一层：规则调度引擎

本地调度服务会处理确定性规则：

- 优先级排序
- 截止时间提前
- 任务延迟后顺延
- 新任务插入
- 删除任务后释放时间
- 低优先级任务后移
- 必要时压缩任务
- 插入缓冲时间
- hard lock 事件不可移动
- 工作时间与非工作时间判断
- 局部重排，而不是每次全量重算

### 第二层：AI 策略建议

大模型不直接改数据库，也不拥有最终执行权。它负责：

- 理解用户输入
- 根据规则给出重排建议
- 解释为什么这样安排
- 生成新的时间块草案

随后系统会交给本地规则引擎或后端 API 执行与校验。

这样的好处是：

- AI 更灵活，可以理解自然语言。
- 规则引擎更稳定，可以保证基本约束不被破坏。
- AI 失败时，本地规则仍能继续工作。
- 调度结果可解释、可测试、可维护。

## 10. DeepSeek / 大模型配置

有两种方式配置。

### 方式一：运维后台配置

打开：

```text
http://localhost:3000/ops
```

进入 `DeepSeek API 配置与用量`：

- 输入 API Key
- 输入模型名，例如 `deepseek-v4-flash`
- 输入接口地址，例如 `https://api.deepseek.com/chat/completions`
- 输入 token 单价，用于估算费用
- 点击保存配置

保存后，`/api/scheduling/replan` 会自动使用该配置。

安全说明：

- 页面只显示脱敏 Key。
- 真实 Key 存在 `.runtime/llm-settings.json`。
- `.runtime` 已加入 `.gitignore`，不会上传 GitHub。

### 方式二：`.env` 配置

```bash
DEEPSEEK_API_KEY=你的DeepSeek密钥
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions
```

也支持 OpenAI 兼容配置：

```bash
OPENAI_API_KEY=你的密钥
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions
```

## 11. 关键 API

### 前端统一重排接口

```http
POST /api/scheduling/replan
```

示例请求：

```json
{
  "type": "task_delayed",
  "taskId": "task_001",
  "delayMinutes": 40,
  "currentSchedule": []
}
```

示例响应：

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

支持的典型触发：

- `task_delayed`：任务超时或延迟
- `task_finished_early`：任务提前完成
- `task_added`：新增任务
- `task_deleted`：删除任务
- `task_moved`：拖动时间块
- `burnout`：用户点击“干不下去了”

### AI 策略建议接口

```http
POST /api/scheduling/llm-replan
```

示例：

```json
{
  "instruction": "请优先保障48小时内截止任务，尽量减少会议打断",
  "fallbackOnError": true
}
```

### 规则维护接口

```http
PUT /api/scheduling/llm-rules
```

示例：

```json
{
  "rules": [
    { "content": "硬锁定事件不可移动", "enabled": true, "weight": 3 },
    { "content": "48小时内截止任务优先级提升", "enabled": true, "weight": 2 },
    { "content": "尽量减少同一天上下文切换", "enabled": true, "weight": 1.5 }
  ]
}
```

### 运维后台 LLM 配置接口

```http
GET /api/admin/llm-settings
POST /api/admin/llm-settings
```

`GET` 返回脱敏配置与用量统计。

`POST` 保存配置：

```json
{
  "apiKey": "sk-xxx",
  "model": "deepseek-v4-flash",
  "apiUrl": "https://api.deepseek.com/chat/completions",
  "inputTokenUsdPerMillion": 0.1,
  "outputTokenUsdPerMillion": 0.2
}
```

### 其他 API

- `/api/auth/*`
- `/api/calendars/connect/google`
- `/api/calendars/connect/outlook`
- `/api/calendars/sync`
- `/api/events`
- `/api/tasks`
- `/api/tasks/[id]/schedule`
- `/api/habits`
- `/api/focus`
- `/api/scheduling/recompute`
- `/api/scheduling/dynamic-replan`
- `/api/scheduling/event-replan`
- `/api/scheduling/event-replan/undo`
- `/api/scheduling/preview`
- `/api/links`
- `/api/analytics/weekly`
- `/api/settings/time-policy`
- `/api/import/time-arrangement`

## 12. 数据与安全说明

不会上传到 GitHub 的内容：

- `.env`
- `.env.local`
- `.runtime/`
- `node_modules/`
- `.next/`
- `.turbo/`
- `services/scheduler/.venv/`
- `apps/desktop/dist/`
- 日志和 pid 文件

真实 API Key 保存位置：

```text
.runtime/llm-settings.json
```

AI 调用用量保存位置：

```text
.runtime/llm-usage.json
```

## 13. 本地 Docker 环境

基础服务：

```bash
docker compose -f infra/compose/docker-compose.yml up -d postgres redis
```

完整服务也可以通过 compose 构建：

```bash
docker compose -f infra/compose/docker-compose.yml up --build
```

默认端口：

- PostgreSQL：`5432`
- Redis：`6379`
- Web：`3000`
- Scheduler：`8000`

## 14. 测试与构建

全量测试：

```bash
pnpm test
```

Web 测试：

```bash
pnpm --filter @reclaim/web test
```

类型检查：

```bash
pnpm typecheck
```

Web 类型检查：

```bash
pnpm --filter @reclaim/web typecheck
```

构建：

```bash
pnpm build
```

Web 构建：

```bash
pnpm --filter @reclaim/web build
```

## 15. EXE 打包与分发

构建 app-use 分发包：

```bat
scripts\windows\build-app-use.cmd
```

或：

```bash
npm run app-use:build
```

执行后会将最新 exe 与中文教程同步到：

```text
app-use/
```

可把整个 `app-use` 文件夹发给别人。

注意：exe 是桌面壳，仍需要本机服务正常启动。若目标电脑首次使用，建议先按 README 完成依赖和环境初始化。

## 16. GitHub 上传与同步

普通推送：

```bash
git add .
git commit -m "你的提交说明"
git push origin main
```

项目提供一键同步脚本：

```bat
scripts\windows\git-sync.cmd
```

或：

```bash
npm run git:sync
```

如果提示未配置 Git 身份：

```bash
git config user.name "你的GitHub用户名"
git config user.email "你的GitHub noreply邮箱"
```

如果 GitHub 443 网络不通：

```powershell
Test-NetConnection github.com -Port 443
```

如果暂存区混入缓存或构建产物：

```bash
git rm -r --cached .turbo .next .runtime apps/desktop/dist services/scheduler/.venv
```

## 17. 常见问题

### 1. 页面打不开

先检查服务状态：

```bat
scripts\windows\status-maintenance.cmd
```

然后重启：

```bat
scripts\windows\stop-maintenance.cmd
scripts\windows\start-maintenance.cmd
```

### 2. 调度服务不可用

打开：

```text
http://localhost:8000/health
```

如果打不开，检查 Python 3.11+ 是否安装，并重新运行启动脚本。

### 3. Redis 队列降级

如果 Redis 版本过低，后台会显示队列 degraded。系统仍可执行直接调度，但 BullMQ 队列能力会降级。推荐使用 `infra/compose/docker-compose.yml` 中的 Redis 7。

### 4. AI 调用失败

检查：

- `/ops` 中是否已保存 DeepSeek API Key
- 模型名是否正确
- 接口地址是否正确
- 余额或额度是否可用
- 网络是否能访问 DeepSeek API

即使 AI 调用失败，系统也会自动回退到本地规则重排。

### 5. 乱码或页面样式异常

建议：

```bat
scripts\windows\stop-maintenance.cmd
scripts\windows\start-maintenance.cmd
```

必要时清理 Next 缓存：

```powershell
Remove-Item -Recurse -Force apps\web\.next
```

然后重新启动。

## 18. 当前版本优势

- 不是简单日历，而是围绕动态重排设计。
- AI 不直接接管系统，降低失控风险。
- 本地规则引擎可兜底，保证稳定性。
- 运维后台与用户前端分离，便于后续运营。
- API Key 可在后台配置，并统计用量与费用。
- 支持虚拟环境运行，换电脑更容易复现。
- 使用 Prisma、BullMQ、FastAPI、FullCalendar 等主流技术，后续扩展空间更大。
- 代码结构按 monorepo 分层，便于维护和继续开发。

## 19. 后续可扩展方向

- 多用户账号体系与权限管理
- 团队日历聚合
- 更完整 Google/Outlook 双向同步
- 更强 OR-Tools 约束求解
- 移动端适配
- 更细的费用统计和 API 限额控制
- 调度策略可视化编辑器
- 课程表/工作排班等更多导入模板

## 20. 许可证与说明

本项目是一个 Reclaim AI 风格的动态时间管理平台 MVP。它没有 fork 或运行时依赖 Cal.com，也不把 Cal.com 作为交付基础。项目使用独立数据模型和调度服务实现，可用于本地学习、原型验证和后续产品化开发。
