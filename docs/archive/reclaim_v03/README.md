# Reclaim 动态重排功能包 v04

本功能包是一个可直接运行的 Python 单文件版本，用于演示和接入 Reclaim 项目的动态重排能力。

## 文件说明

| 文件 | 说明 |
| --- | --- |
| `handbook_v04.docx` | 正式运行手册，包含前端接入、后端接口、数据结构、规则逻辑和验收清单。 |
| `reclaim_replan_v04_single.py` | 可运行的单文件 Python 应用，包含规则引擎、命令行模式、HTTP API 和浏览器测试页。 |
| `demo_request.json` | 示例输入，请求“写论文延迟 40 分钟”的重排。 |
| `demo_response_v04_single.json` | 示例输出，可用于对照运行结果。 |

## 环境要求

- Python 3.10 或更高版本。
- 不需要安装第三方库，只使用 Python 标准库。

## 在 VS Code 中运行

1. 用 VS Code 打开本目录：

```text
E:\CodexOfficeAssistant\outputs\reclaim_v03
```

2. 打开终端：

```powershell
cd E:\CodexOfficeAssistant\outputs\reclaim_v03
```

3. 运行内置 demo：

```powershell
python .\reclaim_replan_v04_single.py --demo
```

如果 `python` 不可用，可以尝试：

```powershell
py .\reclaim_replan_v04_single.py --demo
```

## 使用 JSON 文件运行

```powershell
python .\reclaim_replan_v04_single.py --input .\demo_request.json --output .\demo_response_myrun.json
```

运行后会生成 `demo_response_myrun.json`。

## 启动本地 HTTP 服务

```powershell
python .\reclaim_replan_v04_single.py --serve --port 8765
```

启动后访问：

```text
http://127.0.0.1:8765
```

页面左侧可以编辑请求 JSON，右侧会显示重排结果。

## HTTP 接口

### 健康检查

```http
GET /api/health
```

### 获取示例请求

```http
GET /api/demo
```

### 执行重排

```http
POST /api/scheduling/replan
Content-Type: application/json; charset=utf-8
```

请求体示例：

```json
{
  "schedule": [
    {
      "id": "paper",
      "title": "写论文",
      "start": "2026-05-11T09:00:00",
      "end": "2026-05-11T11:00:00",
      "priority": "A",
      "status": "in_progress",
      "deadline": "2026-05-11T18:00:00",
      "project": "毕业论文"
    }
  ],
  "event": {
    "type": "task_delayed",
    "taskId": "paper",
    "delayMinutes": 40
  }
}
```

响应包含：

```json
{
  "ok": true,
  "newSchedule": [],
  "messages": [],
  "explanation": "",
  "versionId": "",
  "undoToken": "",
  "undoExpiresAt": ""
}
```

### 撤销重排

```http
POST /api/scheduling/replan/undo
Content-Type: application/json; charset=utf-8
```

请求体：

```json
{
  "undoToken": "上一次重排返回的 undoToken"
}
```

也可以使用：

```json
{
  "versionId": "上一次重排返回的 versionId"
}
```

## 支持的事件类型

| 事件类型 | 说明 |
| --- | --- |
| `task_delayed` | 任务超时未完成。 |
| `task_finished_early` | 任务提前完成。 |
| `task_moved` | 用户拖动任务时间块。 |
| `task_resized` | 用户拉长或压缩任务时长。 |
| `task_added` | 新增任务。 |
| `task_deleted` | 删除任务。 |
| `burnout` | 用户点击“干不下去了”。 |

## 核心规则

- S 级硬约束任务不可自动移动、压缩、拆分、顺延或删除。
- 工作任务只能排在工作日 9:00-12:00、14:00-18:00。
- 硬截止任务不得晚于 `deadline` 完成。
- 冲突释放顺序优先影响 C 级，其次 B 级，最后才考虑 A 级。
- 单个工作任务或拆分子任务不得小于 10 分钟。
- 连续工作任务之间默认保留 10 分钟缓冲。
- 每日普通缓冲总量最多 60 分钟。

## 中文乱码处理

如果 PowerShell 显示中文乱码，先运行：

```powershell
chcp 65001
```

然后重新执行 Python 命令。文件本身使用 UTF-8 编码。

## 快速验收

运行：

```powershell
python .\reclaim_replan_v04_single.py --input .\demo_request.json --output .\demo_response_check.json
```

打开输出文件，确认：

- `ok` 为 `true`。
- `newSchedule` 中包含“写论文（第 1 部分）”“写论文（第 2 部分）”“缓冲时间”。
- S 级任务“组会”仍保持 `14:00-15:00` 不变。
