# seedance-2-mcp

[![npm version](https://img.shields.io/npm/v/seedance-2-mcp.svg)](https://www.npmjs.com/package/seedance-2-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一个开源、本地运行的 **MCP (Model Context Protocol) 服务器**，把火山方舟 (Volcengine ARK)
**Seedance 2.0** 视频生成能力以三个 stdio 工具的形式暴露给 Codex、Claude Desktop、Cursor
等任意 MCP 客户端。

- 纯本地 stdio，**不需要任何云端部署**。
- 由 Node.js + TypeScript 编写，使用官方 [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk)。
- 用户在自己机器上配置 `ARK_API_KEY` 即可调用 Seedance 2.0 的 **文生视频 / 图生视频 / 多模态参考生成**。

---

## 提供的 MCP Tools

| Tool                    | 作用                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| `seedance_usage_guide`  | 返回完整的使用说明 — 标准流程、模型选择、参数表、注意事项。          |
| `seedance_create_task`  | 提交一个 Seedance 2.0 视频生成任务，**立即返回 `task_id`，不阻塞**。 |
| `seedance_check_task`   | 用 `task_id` 查询任务状态，成功后返回 `video_url` 和可选末帧图片。   |

详细参数见 [Tools 详解](#tools-详解)。

---

## 给本地 Agent 的快速接入提示词

如果你正在使用 Codex、Claude Desktop、Cursor 或其他支持 MCP 的本地 Agent，可以直接把本仓库链接发给它，并让它阅读这一段。

```text
你是一个本地开发 Agent。请帮我把这个仓库提供的 seedance-2-mcp 接入到当前 MCP 客户端中。

目标：
1. 读取仓库 README，理解这是一个 stdio MCP server，用于调用火山方舟 Seedance 2.0 视频生成 API。
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
- 生成的 video_url 通常会过期，任务成功后应提示我尽快下载。
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

| 变量            | 必填 | 说明                                                                  |
| --------------- | ---- | --------------------------------------------------------------------- |
| `ARK_API_KEY`   | 是   | 火山方舟 API Key。前往 https://console.volcengine.com/ark 获取。       |
| `ARK_BASE_URL`  | 否   | 默认 `https://ark.cn-beijing.volces.com/api/v3`。海外/代理可覆盖。     |

复制 `.env.example` 到本地 `.env` 仅作开发参考；**真正生效的位置是 MCP 客户端配置里的 `env`**，
因为客户端通过子进程拉起 MCP，会自己注入环境变量。

如果工具调用时未设置 `ARK_API_KEY`，三个工具中调用真实 API 的两个都会返回清晰错误：

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

输入参数：

| 字段                  | 类型     | 默认                          | 说明                                                                                    |
| --------------------- | -------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| `prompt`              | string   | —（必填）                     | 自然语言描述。如有参考素材，在 prompt 中用 `[Image1]` / `[Video1]` / `[Audio1]` 引用。   |
| `model`               | enum     | `doubao-seedance-2-0-260128`  | `doubao-seedance-2-0-260128`（标准版，最高质量）/ `doubao-seedance-2-0-fast-260128`（快速版）。 |
| `duration`            | integer  | `5`                           | 视频时长，单位秒。`[4, 15]`。                                                            |
| `ratio`               | enum     | `16:9`                        | `21:9` / `16:9` / `4:3` / `1:1` / `3:4` / `9:16` / `adaptive`。                           |
| `resolution`          | enum     | `720p`                        | `480p` 或 `720p`。                                                                       |
| `generate_audio`      | boolean  | `true`                        | 是否同时生成同步音频（对白 / 音效 / BGM）。                                              |
| `watermark`           | boolean  | `true`                        | 是否添加平台水印。部分账号可能无法关闭。                                                 |
| `web_search`          | boolean  | `false`                       | 是否对 prompt 启用联网增强；**仅纯文本输入可用，不能与 image/video/audio 同时使用**。    |
| `return_last_frame`   | boolean  | `false`                       | 是否返回末帧图片 URL，用于多段拼接。                                                     |
| `image_urls`          | array    | —                             | 最多 9 项；每项 `{ url, role? }`，`role` ∈ `reference_image` / `first_frame` / `last_frame`，默认 `reference_image`。 |
| `video_urls`          | array    | —                             | 最多 3 项；每项 `{ url, role? }`，`role` ∈ `reference_video`。                            |
| `audio_urls`          | array    | —                             | 最多 3 项；每项 `{ url, role? }`，`role` ∈ `reference_audio`。**必须配合 image 或 video**。 |

校验规则：

- `duration` 必须是 `[4, 15]` 之间的整数。
- `image_urls` ≤ 9，`video_urls` ≤ 3，`audio_urls` ≤ 3。
- 仅纯文本 + `audio_urls` 会被拒绝（Seedance 不支持）。
- `web_search=true` 与任何参考素材同时出现会被拒绝（联网增强只支持纯文本）。

返回：

```jsonc
{
  "task_id": "cgt-2026xxxx-xxxxxx",
  "model": "doubao-seedance-2-0-260128",
  "duration": 5,
  "ratio": "16:9",
  "resolution": "720p",
  "raw": { /* 火山原始响应 */ }
}
```

### `seedance_check_task`

输入 `{ task_id: string }`。可能的状态：

- `running` / `queued` / `pending` — 仍在处理。提示等待 30-90 秒后再调用。
- `succeeded` — 返回 `video_url`，若 `return_last_frame=true` 也会返回 `last_frame_url`。
- `failed` — 返回 `fail_reason`（如有）。
- `cancelled` / `expired` — 任务已取消或已过期。
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

15 秒标准模型任务通常需要 **2-5 分钟**完成；快速版会更短。

---

## 安全说明

- **不要把 `ARK_API_KEY` 写进 git 仓库**。把它放在 MCP 客户端配置（如 `claude_desktop_config.json`、`~/.codex/config.toml`）的 `env` 字段，或者 shell 环境变量里。
- 本工具**不会**在日志或返回值里打印 `ARK_API_KEY`。
- 火山生成的 `video_url` 和 `last_frame_url` 是**带签名的临时 URL**，根据火山官方说明默认 24 小时内有效；任务成功后请尽快下载，避免链接过期。
- 你传入的 `image_urls` / `video_urls` / `audio_urls` 都需要 **公网可访问** 的 HTTPS（或 HTTP）地址；本地路径、内网地址、需要登录的资源无法被火山服务器拉取。
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
│   ├── server.ts         # 注册 McpServer 和三个 tools
│   ├── seedance.ts       # 火山方舟 Seedance 2.0 REST API 客户端
│   ├── schema.ts         # zod 输入 schema
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
