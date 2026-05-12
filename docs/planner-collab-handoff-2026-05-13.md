# AI Planner 前端协作备注（2026-05-13）

## 本轮目标

把现有 `apps/planner-prototype` 中完成的 AI Planner 原型，增量并入主前端 `apps/web`，不直接覆盖现有首页和现有日历页，先形成一个可访问、可演示、可后续提 PR 的正式前端入口。

## 当前落地结果

- 已将原型接入主前端新路由：`/planner`
- 已在主前端左侧导航加入 `AI Planner` 入口
- 已保留原型中的核心能力：
  - 动态日程重排
  - “干不下去了”按钮
  - 拖动 / 压缩 / 延长时间块
  - 右侧 AI 解释面板
  - 历史效率分析
  - 一键重新规划
  - 多方案模拟

## 主要改动文件

### 主前端接入

- `apps/web/app/planner/page.tsx`
- `apps/web/components/dashboard/sidebar-nav.tsx`
- `apps/web/package.json`
- `apps/web/tailwind.config.ts`
- `apps/web/app/globals.css`

### 原型源码迁入

- `apps/web/lib/planner-prototype/App.tsx`
- `apps/web/lib/planner-prototype/components/*`
- `apps/web/lib/planner-prototype/data/mockEvents.ts`
- `apps/web/lib/planner-prototype/types/calendar.ts`
- `apps/web/lib/planner-prototype/utils/*`

## 为什么先这样接

这次没有直接替换 `apps/web/app/(dashboard)/calendar/page.tsx`，而是先新建 `/planner`，原因是：

1. 现有主前端是 `Next.js`
2. 原型最初是独立的 `Vite + React` 结构
3. 先独立接入更适合协作，不会一下子撞坏现有 `calendar / dashboard`
4. 后续如果评审通过，再决定是否替换现有正式日历页

## 当前可访问方式

在仓库根目录运行：

```bat
cd /d "E:\No plan\reclaim-main"
pnpm.cmd --filter @reclaim/web dev
```

然后打开：

- `http://localhost:3000/planner`

## 已验证

已通过：

```bat
pnpm.cmd --filter @reclaim/web build
pnpm.cmd --filter @reclaim/web typecheck
```

## 待继续优化项

这几项适合下一轮继续推进：

1. 把 `/planner` 和现有真实 API 对接，而不是只用 mock 数据
2. 决定是否把原型并入现有 `calendar` 页，而不是保留独立入口
3. 继续统一主前端和原型页面的视觉语言，减少“两个系统拼在一起”的感觉
4. 补充与现有任务、习惯、链接、设置接口的双向同步
5. 评估是否保留原型自带侧边栏，还是改为完全复用主站导航

## GitHub 协作状态

目标协作仓库按最早约定应为：

- `Marx-beep/reclaim`

当前阻塞点：

1. 当前工作目录不是一个真实 `.git` 仓库副本
2. GitHub 连接器在本轮会话里启动失败，暂时无法直接发起远端写入

所以本轮已完成的是：

- 代码并入主前端代码树
- 协作备注落盘
- 构建和类型检查通过

待在真实 git 副本中执行的协作步骤：

```bat
git checkout main
git pull origin main
git checkout -b feature/planner-web-integration
git add .
git commit -m "feat(web): integrate ai planner prototype into /planner"
git push origin feature/planner-web-integration
```

然后创建 PR，描述建议写清：

- `/planner` 新路由接入
- AI Planner 原型源码迁入 `apps/web/lib/planner-prototype`
- 主前端导航新增入口
- 当前仍为 mock 驱动原型，未完全替换现有 `calendar`

## 给协作者的建议

如果明天要继续协作，优先顺序建议是：

1. 先在真实 git 仓库里提交这一轮接入
2. 再决定是继续独立维护 `/planner`，还是开始替换正式日历页
3. 如果要演示，优先展示 `/planner`
4. 如果要联调后端，再从 `replan`、`tasks`、`habits` 三条链路开始接接口
