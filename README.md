# seedance-2-mcp

[![npm version](https://img.shields.io/npm/v/seedance-2-mcp.svg)](https://www.npmjs.com/package/seedance-2-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一个开源、本地运行的 **MCP (Model Context Protocol) 服务器**，把火山方舟 (Volcengine ARK)
**Seedance 2.5 / Seedance 2.0 系列** 视频生成能力以三个 stdio 工具的形式暴露给 Codex、
Claude Desktop、Cursor 等任意 MCP 客户端。

- 纯本地 stdio，**不需要任何云端部署**。
- 由 Node.js + TypeScript 编写，使用官方 [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk)。
- 支持 Seedance 2.5 的 **4-30 秒时长、1080p / mov 输出、30 张参考图 + 10 段参考视频 + 10 段参考音频、纯音频输入、样片（Draft）模式、视频编辑 / 延长引导**，同时兼容 Seedance 2.0 / Fast / Mini。

---

## 提供的 MCP Tools

| Tool                   | 作用                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `seedance_usage_guide` | 返回完整使用说明 — 模型对比、各模型限制、任务类型约束、参数表、样片模式、注意事项。       |
| `seedance_create_task` | 提交一个 Seedance 视频生成任务，**立即返回 `task_id`，不阻塞**。                           |
| `seedance_check_task`  | 用 `task_id` 查询状态，成功后返回 `video_url`、时长 / 分辨率 / 格式 / 用量等元数据。       |

详细参数见 [Tools 详解](#tools-详解)。

---

## 支持的模型

| Model ID                      | 名称           | 时长            | 分辨率                    | 参考素材上限                | 特殊能力                           |
| ----------------------------- | -------------- | --------------- | ------------------------- | --------------------------- | ---------------------------------- |
| `doubao-seedance-2-5-260628`  | Seedance 2.5   | `4-30s` 或 `-1` | `480p` / `720p` / `1080p` | 30 图 + 10 视频 + 10 音频   | mov 输出、纯音频、样片、编辑/延长  |
| `doubao-seedance-2-0-260128`  | Seedance 2.0   | `4-15s` 或 `-1` | `480p` / `720p` / `1080p` / `4k` | 9 图 + 3 视频 + 3 音频 | 4k 输出                          |
| `doubao-seedance-2-0-fast-260128` | Seedance 2.0 Fast | `4-15s` 或 `-1` | `480p` / `720p`       | 9 图 + 3 视频 + 3 音频      | 更快 / 更便宜                      |
| `doubao-seedance-2-0-mini-260615` | Seedance 2.0 Mini | `4-15s` 或 `-1` | `480p` / `720p`       | 9 图 + 3 视频 + 3 音频      | 成本最低                           |

> Seedance 2.5 需要账号已开通该模型（余额 > 200 元，或已购买资源包 / 节省计划）。

---

## 给本地 Agent 的快速接入提示词

如果你正在使用 Codex、Claude Desktop、Cursor 或其他支持 MCP 的本地 Agent，可以直接把本仓库链接发给它，并让它阅读这一段。

```text
你是一个本地开发 Agent。请帮我把这个仓库提供的 seedance-2-mcp 接入到当前 MCP 客户端中。

目标：
1. 读取仓库 README，理解这是一个 stdio MCP server，用于调用火山方舟 Seedance 2.5 / 2.0 视频生成 API。
2. 优先使用 npx 方式接入：command = "npx"，args = ["-y", "seedance-2-mcp"]。
3. 如果 npm 包暂不可用，或我明确想从源码运行，请 clone 本仓库，执行 npm install && npm run build，并将 MCP command 配为 "node"，args 配为 ["<仓库绝对路径>/dist/index.js"]。
4. 只向我索要或确认 ARK_API_KEY，不要把真实 API Key 写进仓库、README、示例文件或 git。
5. 根据我当前使用的客户端自动修改对应 MCP 配置：
   - Codex：修改 ~/.codex/config.toml
   - Claude Desktop：修改 claude_desktop_config.json
   - Cursor 或其他客户端：使用它们支持的 stdio MCP 配置格式
6. 配置完成后，提醒我重启或刷新 MCP 客户端，然后先调用 seedance_usage_guide，再按 create -> wait -> check 的流程生成视频。
7. 如果本机没有 Node.js >= 18 或 npx 不可用，请先指出缺失项，并给出最小安装建议。

重要约束：
- stdout 是 MCP JSON-RPC 通道，不要让 server 在 stdout 打调试日志。
- ARK_API_KEY 只能放在 MCP 客户端 env 配置或本机环境变量里。
- 生成的 video_url 通常会过期（约 24 小时，2.5 最多下载 100 次），任务成功后应提示我尽快下载。
```

你也可以直接对 Agent 说：

> 阅读这个仓库并按 README 里的“给本地 Agent 的快速接入提示词”帮我配置 Seedance MCP。我会提供 `ARK_API_KEY`。

---

## 安装

### 1. 通过 `npx`（推荐 - 无需手动安装）

MCP 客户端的配置里直接用：

```
npx -y seedance-2-mcp
```

每次启动会下载（或复用缓存）最新版本。

### 2. 全局安装

```bash
npm install -g seedance-2-mcp
```

之后在客户端配置里使用 `seedance-2-mcp` 即可。

### 3. 从源码运行（开发者）

```bash
git clone https://github.com/seedance/seedance-2-mcp.git
cd seedance-2-mcp
npm install
npm run build
node dist/index.js
```

要求 **Node.js >= 18**（依赖原生 `fetch`）。

---

## 环境变量

| 变量           | 必填 | 说明                                                              |
| -------------- | ---- | ----------------------------------------------------------------- |
| `ARK_API_KEY`  | 是   | 火山方舟 API Key。前往 https://console.volcengine.com/ark 获取。   |
| `ARK_BASE_URL` | 否   | 默认 `https://ark.cn-beijing.volces.com/api/v3`。海外/代理可覆盖。 |

复制 `.env.example` 到本地 `.env` 仅作开发参考；**真正生效的位置是 MCP 客户端配置里的 `env`**，
因为客户端通过子进程拉起 MCP，会自己注入环境变量。

如果工具调用时未设置 `ARK_API_KEY`，调用真实 API 的工具会返回清晰错误：

> `Missing ARK_API_KEY environment variable. Please set ARK_API_KEY to your Volcengine ARK API key.`

---

## 客户端配置示例

### Codex（`~/.codex/config.toml`）

```toml
[mcp_servers.seedance-2-mcp]
command = "npx"
args = ["-y", "seedance-2-mcp"]
env = { "ARK_API_KEY" = "your_key_here" }
```

### Claude Desktop（`claude_desktop_config.json`）

macOS 路径：`~/Library/Application Support/Claude/claude_desktop_config.json`
Windows 路径：`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "seedance-2-mcp": {
      "command": "npx",
      "args": ["-y", "seedance-2-mcp"],
      "env": {
        "ARK_API_KEY": "your_key_here"
      }
    }
  }
}
```

### Cursor / 其他 MCP 客户端

任何支持 stdio MCP 的客户端通用配置：

```json
{
  "command": "npx",
  "args": ["-y", "seedance-2-mcp"],
  "env": { "ARK_API_KEY": "your_key_here" }
}
```

---

## Tools 详解

### `seedance_usage_guide`

无参数。返回 Markdown 格式的完整使用说明。**建议在首次调用 `seedance_create_task` 之前先调用一次。**

### `seedance_create_task`

提交一个视频生成任务，**立即返回 `task_id`**。

#### 参数表

| 字段                        | 类型    | 默认                             | 说明                                                                                                                                                    |
| --------------------------- | ------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prompt`                    | string  | —（除 `draft_task_id` 模式外必填） | 自然语言描述。用 `[Image1]` / `[Video1]` / `[Audio1]`（或 `@图片1` / `@视频1` / `@音频1`）按 1 起始顺序引用素材。                                        |
| `model`                     | enum    | `doubao-seedance-2-5-260628`     | 见上方[支持的模型](#支持的模型)。                                                                                                                        |
| `duration`                  | integer | `5`                              | 秒。2.5：`[4, 30]`；2.0 系列：`[4, 15]`；`-1` 由模型自动决定。`draft_task_id` 模式自动复用样片时长；`edit` 模式默认且必须为 `-1`。                        |
| `ratio`                     | enum    | `adaptive`                       | `21:9` / `16:9` / `4:3` / `1:1` / `3:4` / `9:16` / `adaptive`。2.5 首帧、首尾帧、编辑、延长任务仅支持 `adaptive`。                                       |
| `resolution`                | enum    | `720p`                           | 2.5：`480p` / `720p` / `1080p`；2.0：最高 `4k`；fast/mini：`480p` / `720p`。样片创建自动用 `480p`，基于样片的成片自动用 `1080p`。                        |
| `generate_audio`            | boolean | `true`                           | 是否生成同步音频（对白 / 音效 / BGM）。`draft_task_id` 模式复用样片设置。                                                                                |
| `watermark`                 | boolean | `false`                          | 是否添加 `AI 生成` 水印（与官方 API 默认一致）。                                                                                                        |
| `output_format`             | enum    | `mp4`                            | `mp4` 或 `mov`（`mov` 仅 2.5，H.264 + yuv444p + PCM，适合调色 / 合成）。                                                                                |
| `omni_reference_task_type`  | enum    | `auto`                           | 仅 2.5。`auto` / `reference` / `edit` / `extend`，用于前置校验任务类型约束。                                                                             |
| `draft`                     | boolean | `false`                          | 仅 2.5。`true` 生成 480p 样片，用于先验证效果。                                                                                                          |
| `draft_task_id`             | string  | —                                | 仅 2.5。用已成功的样片任务 ID 生成最终 1080p 成片；此时不要传参考素材。                                                                                  |
| `web_search`                | boolean | `false`                          | 是否启用联网搜索；**仅纯文本输入可用，不能与 image/video/audio 同时使用**。                                                                              |
| `return_last_frame`         | boolean | `false`                          | 是否返回末帧图片 URL，用于多段拼接。                                                                                                                     |
| `image_urls`                | array   | —                                | 最多 30 项（2.5）/ 9 项（2.0）。每项 `{ url, role? }`，`role` ∈ `reference_image` / `first_frame` / `last_frame`。`url` 支持 http(s)、`asset://`、`data:image/...;base64,...`。 |
| `video_urls`                | array   | —                                | 最多 10 项（2.5）/ 3 项（2.0）。每项 `{ url, role? }`，`role` 为 `reference_video`。`url` 支持 http(s) 或 `asset://`。                                     |
| `audio_urls`                | array   | —                                | 最多 10 项（2.5）/ 3 项（2.0）。每项 `{ url, role? }`，`role` 为 `reference_audio`。2.5 支持纯音频；2.0 必须搭配图片或视频。                              |
| `priority`                  | integer | `0`                              | 排队优先级 `[0, 9]`，数值越大越优先。                                                                                                                    |
| `execution_expires_after`   | integer | `172800`                         | 任务超时秒数 `[3600, 259200]`，超时后状态变为 `expired`。                                                                                                |
| `callback_url`              | string  | —                                | ARK 状态回调地址（http/https），回调体与查询任务 API 一致。                                                                                              |
| `safety_identifier`         | string  | —                                | 终端用户标识（≤ 64 字符），建议传哈希后的用户 ID。                                                                                                       |

#### 任务类型与约束（Seedance 2.5）

Seedance 2.5 会结合输入素材和提示词自动判定任务类型。MCP 会在提交前做如下校验，减少异步报错：

| 任务类型       | 触发条件                                                | 关键约束                                                        |
| -------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| 文生视频       | 仅文本                                                  | 无                                                              |
| 首帧 / 首尾帧  | 图片 `role` 为 `first_frame`（可选 `last_frame`）        | `ratio` 必须为 `adaptive`；不能与参考图 / 视频 / 音频混用       |
| 参考生视频     | 至少一个 `reference_image` / `reference_video` / `reference_audio` | `ratio` / `duration` 无特殊限制                       |
| 视频编辑       | `omni_reference_task_type="edit"` 或有编辑意图的参考视频 | 必须有 `reference_video`（4-30s）；`ratio=adaptive`；`duration=-1` |
| 视频延长       | `omni_reference_task_type="extend"` 或延长意图的参考视频 | 必须有 `reference_video`；`ratio=adaptive`                      |

#### 样片（Draft）模式

```text
1) create_task { prompt, model: "...2-5-260628", draft: true }        → 480p 样片任务
2) check_task  { task_id }                                            → 预览 video_url
3) create_task { model: "...2-5-260628", draft_task_id: "<样片 task_id>" } → 1080p 成片
```

样片任务 ID 有效期为 7 天；样片和成片分别计费。成片阶段会自动复用提示词、素材、时长、宽高比、音频设置，**禁止再次传入参考素材**。

#### 返回

```jsonc
{
  "task_id": "cgt-2026xxxx-xxxxxx",
  "model": "doubao-seedance-2-5-260628",
  "duration": 10,
  "ratio": "adaptive",
  "resolution": "720p",
  "output_format": "mp4",
  "draft": false,
  "omni_reference_task_type": "auto",
  "request": { /* 实际发送给火山的完整请求体 */ },
  "raw": { /* 火山原始响应 */ }
}
```

### `seedance_check_task`

输入 `{ task_id: string }`。可能的状态：

- `queued` / `running` / `pending` — 仍在处理。提示等待 30-90 秒后再调用。
- `succeeded` — 返回 `video_url`，若 `return_last_frame=true` 也会返回 `last_frame_url`，并附带 `duration`、`ratio`、`resolution`、`output_format`、`draft`、`usage.completion_tokens`。
- `failed` — 返回 `error.code`（`fail_code`）与 `error.message`（`fail_reason`）。
- `cancelled` / `expired` — 任务已取消或已超时。
- 其他 — 原样回传 `status` 与原始 payload。

---

## 典型调用流程

```text
client → seedance_usage_guide                                  ← 阅读规则
client → seedance_create_task { prompt, ... }                  ← 提交任务
                                                ↓
                                        task_id: cgt-...
                                                ↓
client → seedance_check_task { task_id }                       ← 30-90s 后轮询
                                ↓
                        status: running         （继续等待）
                                ↓
                        status: succeeded       ← 返回 video_url
                                ↓
                立刻下载 video_url（约 24h 内会过期）
```

几个典型入参：

```jsonc
// 1. 文生视频（2.5，20 秒，1080p）
{ "prompt": "一镜到底，雨夜霓虹街道...", "duration": 20, "resolution": "1080p" }

// 2. 首帧生视频（2.5 自动保持首帧宽高比）
{
  "prompt": "女孩缓缓睁开眼，看向镜头",
  "image_urls": [{ "url": "https://example.com/first.png", "role": "first_frame" }]
}

// 3. 全模态参考（多图 + 视频 + 音频）
{
  "prompt": "参考 [Image1] 的角色和 [Video1] 的运镜...",
  "image_urls": [{ "url": "https://example.com/char.png" }],
  "video_urls": [{ "url": "https://example.com/camera.mp4" }],
  "audio_urls": [{ "url": "https://example.com/voice.mp3" }],
  "duration": -1
}

// 4. 视频编辑（2.5）
{
  "prompt": "把 [Video1] 的背景换成雪山",
  "video_urls": [{ "url": "https://example.com/src.mp4" }],
  "omni_reference_task_type": "edit"
}

// 5. 样片 → 成片（2.5）
{ "prompt": "女孩抱着狐狸...", "draft": true }
{ "draft_task_id": "cgt-2026xxxx-xxxxxx" }
```

30 秒标准模型任务通常需要数分钟完成；快速版 / 短片会更短。

---

## 安全说明

- **不要把 `ARK_API_KEY` 写进 git 仓库**。把它放在 MCP 客户端配置（如 `claude_desktop_config.json`、`~/.codex/config.toml`）的 `env` 字段，或者 shell 环境变量里。
- 本工具**不会**在日志或返回值里打印 `ARK_API_KEY`。
- 火山生成的 `video_url` 和 `last_frame_url` 是**带签名的临时 URL**，默认 24 小时内有效；Seedance 2.5 的视频 URL 最多下载 100 次。任务成功后请尽快下载。
- 任务记录保留 7 天；样片任务 ID 有效期 7 天。
- 你传入的 `image_urls` / `video_urls` / `audio_urls` 都需要**公网可访问**（或使用 `asset://` 素材 ID）；本地路径、内网地址、需要登录的资源无法被火山服务器拉取。
- Seedance 2.5 / 2.0 不支持直接上传含真人人脸的参考图 / 视频，请使用平台预置虚拟人像或已授权真人素材。
- 请遵守火山方舟与 Seedance 模型的使用条款，不要生成违法、未成年人不当或侵权内容。

---

## 开发

```bash
npm install
npm run typecheck
npm run dev          # 用 tsx 直接跑 src/index.ts
npm run build        # 输出到 dist/
npm start            # node dist/index.js
```

调试 stdio MCP 推荐：

```bash
npx -y @modelcontextprotocol/inspector npx -y seedance-2-mcp
```

或本地源码：

```bash
npx -y @modelcontextprotocol/inspector node dist/index.js
```

---

## 项目结构

```
.
├── src/
│   ├── index.ts          # stdio MCP 入口（带 shebang）
│   ├── server.ts         # 注册 McpServer、三个 tools、提交前校验
│   ├── seedance.ts       # 火山方舟 Seedance REST API 客户端与请求体构建
│   ├── schema.ts         # zod 输入 schema、模型能力表
│   └── usageGuide.ts     # seedance_usage_guide 返回的文本
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

## 协议

[MIT](LICENSE) © seedance-2-mcp contributors

本项目与字节跳动、火山引擎、Volcengine ARK 均**无官方关联**。
"Seedance"、"Doubao"、"火山方舟" 等名称版权归各自持有人所有。
