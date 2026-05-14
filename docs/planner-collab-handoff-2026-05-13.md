# AI Planner 前端协作备注（2026-05-13）

## 本轮目标

将 `apps/planner-prototype` 中完成的 AI Planner 原型，增量接入主前端 `apps/web`，先形成一个可访问、可演示、可继续联调的正式入口 `/planner`，不直接覆盖现有首页或现有 `calendar` 页面。

## 当前落地结果

- 已在主前端新增路由：`/planner`
- 已在主前端左侧导航加入 `AI Planner` 入口
- 原型的核心交互已一并迁入：
  - 动态日程重排
  - “干不下去了”按钮
  - 时间块拖动 / 压缩 / 延长
  - 右侧 AI 建议与重排解释
  - 历史效率分析
  - 一键重新规划
  - 多方案模拟

## 本轮新增修复

本轮继续修了 `/planner` 在主前端中的可用性问题，重点是：

- 调整了全局视觉底色，往更接近 Reclaim 的冷灰蓝 SaaS 风格收拢
- 放大并强化了滚动条样式，提升灰色滚动条的可见性和可抓取性
- 为滚动容器增加 `scrollbar-gutter`，给右侧滚动条保留稳定热区
- 重新整理日历滚动层与拖拽层的结构，降低滚动条与事件拖拽抢鼠标事件的概率
- 重写了 `CalendarGrid` 的日历滚动与预览提示结构，清掉一部分乱码提示文案

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

## 当前访问方式

在仓库根目录运行：

```bat
cd /d "E:\reclaim"
pnpm.cmd --filter @reclaim/web dev
```

然后打开：

- `http://localhost:3000/planner`

## 已验证内容

在工作副本中已验证：

```bat
pnpm.cmd --filter @reclaim/web build
```

说明：

- `build` 已通过
- `typecheck` 目前仍会受 `apps/web/tsconfig.json` 中 `.next/types/**/*.ts` include 规则影响
- 这个 `typecheck` 问题是仓库当前配置问题，不是本轮 `/planner` 集成新增的问题

补充验证（2026-05-13 晚些时候）：

- 使用本地浏览器无头校验过 `http://localhost:3000/planner`，页面样式正常加载
- 本轮未复现此前的 hydration error
- 首屏可见文案中，“Today” 已改为 “今天”
- 滚动容器已补充 `.planner-scroll-shell` 与 `.planner-side-scroll`，并增加更稳定的右侧滚动热区
- 当前仍会看到一条浏览器控制台 404 提示，但未抓到明确失败资源；页面本身返回 200，`/_next/static/css/app/layout.css` 也返回 200

## 当前待推送范围

已检查真实仓库 `E:\reclaim` 的状态。

本轮同步后，当前仍显示待提交的文件是：

- `apps/web/app/globals.css`
- `apps/web/app/planner/page.tsx`
- `apps/web/app/planner/planner-client.tsx`
- `apps/web/lib/planner-prototype/components/CalendarEventBlock.tsx`
- `apps/web/lib/planner-prototype/components/CalendarGrid.tsx`
- `apps/web/lib/planner-prototype/components/RightTaskPanel.tsx`
- `apps/web/lib/planner-prototype/data/mockEvents.ts`
- `docs/planner-collab-handoff-2026-05-13.md`

如果后续又继续同步了 `planner-prototype` 目录下的新改动，建议重新执行一次：

```bat
cd /d E:\reclaim
git status
```

注意：

- `planner-export-web.ps1` 原先的 `Copy-DirectorySafe` 对目录复制有隐蔽问题：
  - 使用了 `Copy-Item -LiteralPath (Join-Path $resolvedSource "*")`
  - 日志会显示目录已复制，但 `planner-prototype` 下的嵌套文件不一定真的同步进 `E:\reclaim`
- 这个问题本轮已修复为先 `Get-ChildItem`，再逐项 `Copy-Item`
- 后续如果再次怀疑同步不完整，优先对 `CalendarGrid.tsx`、`RightTaskPanel.tsx` 之类关键文件做 hash 或内容核对，不要只看脚本日志

## 建议的下一次提交说明

如果要把这轮滚动条 / 视觉修复单独补一次提交，建议 commit message：

```txt
fix(web): improve planner scrollbar usability and visual polish
```

PR / 备注可以说明：

- 修复 `/planner` 右侧滚动条热区过窄、拖动不顺的问题
- 优化日历滚动层与拖拽层结构
- 调整全局色板，统一为更接近 Reclaim 的冷灰蓝风格

## 为什么先独立接入 `/planner`

这次没有直接替换 `apps/web/app/(dashboard)/calendar/page.tsx`，而是先新建 `/planner`，原因是：

1. 现有主前端是 `Next.js`
2. 原型最初是独立的 `Vite + React` 结构
3. 先独立接入更适合协作，不会直接撞坏现有 dashboard / calendar
4. 后续可以根据评审结果再决定是否合并替换正式日历页

## 后续建议顺序

1. 先把 `/planner` 的本轮滚动条与视觉修复再次提交到 GitHub
2. 在浏览器中重新验证右侧灰色滚动条是否已可稳定拖动
3. 继续修复剩余乱码文案，尤其是 `App.tsx`、`RightTaskPanel.tsx`、`CalendarEventBlock.tsx`
4. 再考虑把 `/planner` 与现有真实 API 对接，而不是继续只依赖 mock 数据
5. 最后再决定是否把 `/planner` 逐步并入正式 `calendar` 页面

## 给协作者的提醒

- 这条线当前最核心的演示入口是 `/planner`
- 明早如果有人继续接手，优先检查：
  - 右侧滚动条是否可拖
  - 事件块拖拽是否顺手
  - Lunch / Habit / Focus / Task 是否都按预期可移动
  - 颜色是否仍有暖色残留
  - 页面里是否还有乱码文案
