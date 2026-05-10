# Reclaim 风格动态时间管理平台（MVP）

这是一个可本地运行的全栈动态调度系统：Next.js + Prisma + BullMQ + FastAPI (OR-Tools)。

## 快速启动

1. 复制环境变量

```bash
cp .env.example .env
```

2. 安装依赖

```bash
pnpm install
```

3. 启动基础设施

```bash
docker compose -f infra/compose/docker-compose.yml up -d postgres redis
```

4. 初始化数据库

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

5. 一键启动（Windows）

```bat
scripts\\windows\\start-maintenance.cmd
```

建议先执行环境自检（新电脑尤其建议）：

```bat
scripts\\windows\\check-env.cmd
```

或：

```bash
npm run maintenance:check
```

说明：
- 调度服务会自动在 `services/scheduler/.venv` 中运行（首次启动自动创建并安装依赖）。
- 启动脚本会自动探测 `pnpm`；若未安装会尝试通过 `corepack` 自动激活。
- 因此换一台电脑时，只要安装 Node.js 18+ 与 Python 3.11+，同样可一键启动。

启动后：
- 前端：`http://localhost:3000/`
- 运维后台（独立页面）：`http://localhost:3000/ops`
- 调度服务文档：`http://localhost:8000/docs`

## LLM 策略建议重排（可选）

如需让大模型先给“重排策略建议”，再由本地调度器执行，请配置：

```bash
OPENAI_API_KEY=你的密钥
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions
```

调用接口：

```bash
POST /api/scheduling/llm-replan
{
  "instruction": "请优先保障48小时内截止任务，尽量减少会议打断",
  "fallbackOnError": true
}
```

先维护你的调度规则（LLM 会学习这些规则）：

```bash
PUT /api/scheduling/llm-rules
{
  "rules": [
    { "content": "硬锁定事件不可移动", "enabled": true, "weight": 3 },
    { "content": "48小时内截止任务优先级提升", "enabled": true, "weight": 2 },
    { "content": "尽量减少同一天上下文切换", "enabled": true, "weight": 1.5 }
  ]
}
```

如果你想在通用重排接口直接启用 LLM 参与：

```bash
POST /api/scheduling/recompute
{
  "useLlmAdvisor": true,
  "instruction": "按规则稳定计划，再推进高优任务"
}
```

## 目录结构（Monorepo）

- `apps/web`：前端 + BFF API
- `apps/desktop`：桌面壳（Electron）
- `packages/*`：数据库、领域、集成、队列、时间与重复规则
- `services/scheduler`：Python FastAPI 调度服务
- `infra/compose`：本地 Docker 基础设施
- `scripts/windows`：一键运维脚本
- `app-use`：对外分发说明文档

## 关键页面

- 仪表盘（四象限任务视图）：`/`
- 日历工作台（框选时间段后弹窗安排任务+标签）：`/calendar`
- 预约链接：`/links`
- 分析：`/analytics`
- 设置：`/settings`
- 运维后台：`/ops`

## 关键 API

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
- `/api/scheduling/llm-replan`
- `/api/scheduling/llm-rules`
- `/api/scheduling/preview`
- `/api/links`
- `/api/analytics/weekly`
- `/api/settings/time-policy`
- 时间安排导入：`/api/import/time-arrangement`

## 中文使用教程

- [app-use/中文软件使用教程.md](./app-use/中文软件使用教程.md)

## EXE 一键更新

```bat
scripts\windows\build-app-use.cmd
```

或：

```bash
npm run app-use:build
```

执行后会自动重建 web + desktop，并把最新 EXE 和教程同步到 `app-use/`。

## 推送到 GitHub 常见问题

如果提示未配置 Git 身份：

```bash
git config user.name "你的GitHub用户名"
git config user.email "你的GitHub noreply邮箱"
```

如果暂存区混入缓存/产物：

```bash
git rm -r --cached .turbo .next .runtime apps/desktop/dist services/scheduler/Python
```

然后重新提交并推送。

## 一键自动修复并推送（Windows）

已内置脚本自动处理以下问题：
- 连接 `github.com:443` 不稳定时自动重试检测
- 远端分支领先导致 `fetch first / non-fast-forward` 时自动拉取并合并后再推送

直接运行：

```bat
scripts\windows\git-sync.cmd
```

或：

```bash
npm run git:sync
```
