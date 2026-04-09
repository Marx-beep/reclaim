# Reclaim 风格动态时间管理平台（MVP）

这是一个可本地运行的全栈动态调度系统：Next.js + Prisma + BullMQ + FastAPI(OR-Tools)。

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
scripts\windows\start-maintenance.cmd
```

启动后：
- 前端：`http://localhost:3000/`
- 运维后台（独立页面）：`http://localhost:3000/ops`
- 调度服务文档：`http://localhost:8000/docs`

## 关键页面

- 仪表盘：`/`
- 日历：`/calendar`
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
- `/api/habits`
- `/api/focus`
- `/api/scheduling/recompute`
- `/api/scheduling/preview`
- `/api/links`
- `/api/analytics/weekly`
- `/api/settings/time-policy`
- 时间安排导入：`/api/import/time-arrangement`
  - 兼容旧路径：`/api/import/schedule`

## 运维说明

- 队列模式：`QUEUE_MODE=auto|enabled|disabled`
- Redis 版本较低时会自动降级为 `degraded`，不会导致后台 500。
- Ops 登录页：`/ops/login`
  - 密码来自 `.env` 的 `OPS_ADMIN_PASSWORD`

## Windows 脚本

- 启动：`scripts\windows\start-maintenance.cmd`
- 停止：`scripts\windows\stop-maintenance.cmd`
- 状态：`scripts\windows\status-maintenance.cmd`

## EXE 打包

```bat
pnpm.cmd --filter @reclaim/desktop dist:win
```

产物目录：`apps/desktop/dist/`

## 中文使用教程

见 [app-use/中文软件使用教程.md](./app-use/中文软件使用教程.md)

## Git 提交/推送常见问题

如果提交时报错需要配置 `user.name` / `user.email`，执行：

```bash
git config user.name "你的GitHub用户名"
git config user.email "你的邮箱或GitHub noreply 邮箱"
```

如果之前把缓存文件（如 `.turbo`）加进暂存区，执行：

```bash
git rm -r --cached .turbo .next .runtime apps/desktop/dist
```

然后重新提交。
