# seedance-2-mcp

[![npm version](https://img.shields.io/npm/v/seedance-2-mcp.svg)](https://www.npmjs.com/package/seedance-2-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An open-source, locally run **MCP (Model Context Protocol) server** that exposes the **Seedance 2.5 / Seedance 2.0 series** video generation capabilities of Volcengine ARK (火山方舟) to any MCP client — Codex, Claude Desktop, Cursor, and more — as three stdio tools.

- Pure local stdio, **no cloud deployment required**.
- Written in Node.js + TypeScript using the official [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk).
- Supports Seedance 2.5's **4-30s durations, 1080p / mov output, up to 30 reference images + 10 reference videos + 10 reference audio clips, audio-only input, Draft mode, video editing / extension guidance**, while remaining compatible with Seedance 2.0 / Fast / Mini.

---

## Provided MCP Tools

| Tool                   | Purpose                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `seedance_usage_guide` | Returns the full usage guide — model comparison, per-model limits, task-type constraints, parameter tables, Draft mode, and caveats. |
| `seedance_create_task` | Submits a Seedance video generation task and **immediately returns a `task_id` (non-blocking)**.    |
| `seedance_check_task`  | Queries status by `task_id`; on success returns `video_url`, duration / resolution / format / usage metadata. |

See [Tools in detail](#tools-in-detail) for the full parameter reference.

---

## Supported Models

| Model ID                      | Name             | Duration        | Resolutions                 | Max reference assets            | Special capabilities                          |
| ----------------------------- | ---------------- | --------------- | --------------------------- | ------------------------------- | --------------------------------------------- |
| `doubao-seedance-2-5-260628`  | Seedance 2.5     | `4-30s` or `-1` | `480p` / `720p` / `1080p`    | 30 images + 10 videos + 10 audio | mov output, audio-only, Draft, edit/extend    |
| `doubao-seedance-2-0-260128`  | Seedance 2.0     | `4-15s` or `-1` | `480p` / `720p` / `1080p` / `4k` | 9 images + 3 videos + 3 audio  | 4k output                                    |
| `doubao-seedance-2-0-fast-260128` | Seedance 2.0 Fast | `4-15s` or `-1` | `480p` / `720p`              | 9 images + 3 videos + 3 audio  | Faster / cheaper                             |
| `doubao-seedance-2-0-mini-260615` | Seedance 2.0 Mini | `4-15s` or `-1` | `480p` / `720p`              | 9 images + 3 videos + 3 audio  | Lowest cost                                   |

> Seedance 2.5 requires the model to be enabled on your account (account balance > 200 CNY, or a purchased resource package / savings plan).

---

## Quick Integration Prompt for Local Agents

If you are using Codex, Claude Desktop, Cursor, or any other MCP-capable local agent, you can send it this repository link and ask it to read this section.

```text
You are a local development agent. Please help me integrate the seedance-2-mcp from this repository into my current MCP client.

Goals:
1. Read the repository README and understand that this is a stdio MCP server for calling the Volcengine ARK Seedance 2.5 / 2.0 video generation API.
2. Prefer the npx approach: command = "npx", args = ["-y", "seedance-2-mcp"].
3. If the npm package is not yet available, or I explicitly want to run from source, clone this repository, run npm install && npm run build, and configure the MCP command as "node" with args = ["<absolute repo path>/dist/index.js"].
4. Only ask me for or confirm ARK_API_KEY — never write a real API key into the repository, README, example files, or git.
5. Automatically modify the corresponding MCP configuration based on the client I am currently using:
   - Codex: edit ~/.codex/config.toml
   - Claude Desktop: edit claude_desktop_config.json
   - Cursor or other clients: use their supported stdio MCP configuration format
6. After configuration, remind me to restart or refresh the MCP client, then call seedance_usage_guide first, and generate videos following the create -> wait -> check flow.
7. If Node.js >= 18 is not installed locally, or npx is unavailable, point out the missing piece and give a minimal install suggestion.

Important constraints:
- stdout is the MCP JSON-RPC channel — do not let the server print debug logs to stdout.
- ARK_API_KEY must only be placed in the MCP client's env configuration or in local environment variables.
- Generated video_urls usually expire (about 24 hours; Seedance 2.5 allows up to 100 downloads), so remind me to download promptly after the task succeeds.
```

You can also tell your agent directly:

> Read this repository and follow the "Quick Integration Prompt for Local Agents" in the README to configure the Seedance MCP for me. I will provide the `ARK_API_KEY`.

---

## Installation

### 1. Via `npx` (recommended - no manual install)

Use directly in your MCP client configuration:

```
npx -y seedance-2-mcp
```

The latest version is downloaded (or served from cache) on every launch.

### 2. Global install

```bash
npm install -g seedance-2-mcp
```

Then use `seedance-2-mcp` in your client configuration.

### 3. Run from source (developers)

```bash
git clone https://github.com/seedance/seedance-2-mcp.git
cd seedance-2-mcp
npm install
npm run build
node dist/index.js
```

Requires **Node.js >= 18** (relies on the native `fetch`).

---

## Environment Variables

| Variable         | Required | Description                                                            |
| ---------------- | -------- | ---------------------------------------------------------------------- |
| `ARK_API_KEY`    | Yes      | Volcengine ARK API key. Get one at https://console.volcengine.com/ark. |
| `ARK_BASE_URL`   | No       | Default `https://ark.cn-beijing.volces.com/api/v3`. Override for overseas / proxy setups. |

Copy `.env.example` to a local `.env` for development reference only; **the place where it actually takes effect is the `env` block in your MCP client configuration**, because the client launches MCP as a subprocess and injects its own environment variables.

If `ARK_API_KEY` is not set when a tool is called, the tools that hit the real API return a clear error:

> `Missing ARK_API_KEY environment variable. Please set ARK_API_KEY to your Volcengine ARK API key.`

---

## Client Configuration Examples

### Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.seedance-2-mcp]
command = "npx"
args = ["-y", "seedance-2-mcp"]
env = { "ARK_API_KEY" = "your_key_here" }
```

### Claude Desktop (`claude_desktop_config.json`)

macOS path: `~/Library/Application Support/Claude/claude_desktop_config.json`
Windows path: `%APPDATA%\Claude\claude_desktop_config.json`

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

### Cursor / other MCP clients

Generic configuration for any client that supports stdio MCP:

```json
{
  "command": "npx",
  "args": ["-y", "seedance-2-mcp"],
  "env": { "ARK_API_KEY": "your_key_here" }
}
```

---

## Tools in detail

### `seedance_usage_guide`

No arguments. Returns the full usage guide in Markdown. **It is recommended to call it once before the first `seedance_create_task` call.**

### `seedance_create_task`

Submits a video generation task and **immediately returns a `task_id`**.

#### Parameter table

| Field                       | Type     | Default                          | Description                                                                                                                                   |
| --------------------------- | -------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `prompt`                    | string   | — (required except in `draft_task_id` mode) | Natural-language description. Reference assets with `[Image1]` / `[Video1]` / `[Audio1]` (or `@图片1` / `@视频1` / `@音频1`) using 1-based sequential order. |
| `model`                     | enum     | `doubao-seedance-2-5-260628`     | See [Supported models](#supported-models) above.                                                                                              |
| `duration`                  | integer  | `5`                              | Seconds. 2.5: `[4, 30]`; 2.0 series: `[4, 15]`; `-1` lets the model decide. `draft_task_id` mode reuses the draft's duration; `edit` mode defaults to and requires `-1`. |
| `ratio`                     | enum     | `adaptive`                       | `21:9` / `16:9` / `4:3` / `1:1` / `3:4` / `9:16` / `adaptive`. For 2.5, first-frame, first+last-frame, edit, and extend tasks only support `adaptive`. |
| `resolution`                | enum     | `720p`                           | 2.5: `480p` / `720p` / `1080p`; 2.0: up to `4k`; fast/mini: `480p` / `720p`. Draft creation auto-uses `480p`; final output from a draft auto-uses `1080p`. |
| `generate_audio`            | boolean  | `true`                           | Whether to generate synchronized audio (dialogue / effects / BGM). `draft_task_id` mode reuses the draft's setting.                            |
| `watermark`                 | boolean  | `false`                          | Whether to add the `AI generated` watermark (consistent with the official API default).                                                        |
| `output_format`             | enum     | `mp4`                            | `mp4` or `mov` (`mov` is 2.5 only; H.264 + yuv444p + PCM, suited for color grading / compositing).                                             |
| `omni_reference_task_type`  | enum     | `auto`                           | 2.5 only. `auto` / `reference` / `edit` / `extend`, used for pre-submission task-type constraint validation.                                    |
| `draft`                     | boolean  | `false`                          | 2.5 only. `true` generates a 480p draft to validate the effect first.                                                                          |
| `draft_task_id`             | string   | —                                | 2.5 only. Uses a successfully generated draft task ID to produce the final 1080p output; do not pass reference assets in this mode.             |
| `web_search`                | boolean  | `false`                          | Whether to enable web search; **only available with text-only input, cannot be combined with image/video/audio**.                              |
| `return_last_frame`         | boolean  | `false`                          | Whether to return the last-frame image URL, for multi-segment stitching.                                                                       |
| `image_urls`                | array    | —                                | Up to 30 items (2.5) / 9 items (2.0). Each item `{ url, role? }`, `role` ∈ `reference_image` / `first_frame` / `last_frame`. `url` accepts http(s), `asset://`, `data:image/...;base64,...`. |
| `video_urls`                | array    | —                                | Up to 10 items (2.5) / 3 items (2.0). Each item `{ url, role? }`, `role` is `reference_video`. `url` accepts http(s) or `asset://`.             |
| `audio_urls`                | array    | —                                | Up to 10 items (2.5) / 3 items (2.0). Each item `{ url, role? }`, `role` is `reference_audio`. 2.5 supports audio-only; 2.0 requires images or videos alongside. |
| `priority`                  | integer  | `0`                              | Queue priority `[0, 9]`; higher means more urgent.                                                                                             |
| `execution_expires_after`   | integer  | `172800`                         | Task timeout in seconds `[3600, 259200]`; the task becomes `expired` after timing out.                                                          |
| `callback_url`              | string   | —                                | ARK status callback URL (http/https); the callback body matches the task query API.                                                            |
| `safety_identifier`         | string   | —                                | End-user identifier (≤ 64 chars); a hashed user ID is recommended.                                                                            |

#### Task types and constraints (Seedance 2.5)

Seedance 2.5 automatically determines the task type from the input assets and prompt. The MCP server validates beforehand as follows to reduce async errors:

| Task type        | Trigger                                                                                     | Key constraints                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Text-to-video    | Text only                                                                                   | None                                                                                          |
| First frame / first+last frame | Images with `role` = `first_frame` (optionally `last_frame`)                        | `ratio` must be `adaptive`; cannot be combined with reference images / videos / audio          |
| Reference-to-video | At least one `reference_image` / `reference_video` / `reference_audio`                  | No special restrictions on `ratio` / `duration`                                               |
| Video editing    | `omni_reference_task_type="edit"` or a reference video with editing intent                  | Must have a `reference_video` (4-30s); `ratio=adaptive`; `duration=-1`                         |
| Video extension  | `omni_reference_task_type="extend"` or a reference video with extension intent              | Must have a `reference_video`; `ratio=adaptive`                                               |

#### Draft mode

```text
1) create_task { prompt, model: "...2-5-260628", draft: true }        → 480p draft task
2) check_task  { task_id }                                            → preview video_url
3) create_task { model: "...2-5-260628", draft_task_id: "<draft task_id>" } → 1080p final output
```

Draft task IDs are valid for 7 days; draft and final output are billed separately. The final stage automatically reuses the prompt, assets, duration, aspect ratio, and audio settings from the draft — **do not pass reference assets again**.

#### Response

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
  "request": { /* the full request body actually sent to Volcengine */ },
  "raw": { /* raw Volcengine response */ }
}
```

### `seedance_check_task`

Input: `{ task_id: string }`. Possible statuses:

- `queued` / `running` / `pending` — still processing. Wait 30-90 seconds before checking again.
- `succeeded` — returns `video_url` (and `last_frame_url` if `return_last_frame=true`), along with `duration`, `ratio`, `resolution`, `output_format`, `draft`, `usage.completion_tokens`.
- `failed` — returns `error.code` (`fail_code`) and `error.message` (`fail_reason`).
- `cancelled` / `expired` — task was cancelled or timed out.
- Anything else — the `status` and raw payload are passed through as-is.

---

## Typical call flow

```text
client → seedance_usage_guide                                  ← read the rules
client → seedance_create_task { prompt, ... }                  ← submit a task
                                                ↓
                                        task_id: cgt-...
                                                ↓
client → seedance_check_task { task_id }                       ← poll after 30-90s
                                ↓
                        status: running         (keep waiting)
                                ↓
                        status: succeeded       ← returns video_url
                                ↓
                download video_url immediately (expires in ~24h)
```

A few typical inputs:

```jsonc
// 1. Text-to-video (2.5, 20s, 1080p)
{ "prompt": "One continuous shot, rainy neon street at night...", "duration": 20, "resolution": "1080p" }

// 2. First-frame to video (2.5 keeps the first frame's aspect ratio automatically)
{
  "prompt": "A girl slowly opens her eyes, looking into the camera",
  "image_urls": [{ "url": "https://example.com/first.png", "role": "first_frame" }]
}

// 3. Full-modality reference (multiple images + video + audio)
{
  "prompt": "Follow the character in [Image1] and the camera movement in [Video1]...",
  "image_urls": [{ "url": "https://example.com/char.png" }],
  "video_urls": [{ "url": "https://example.com/camera.mp4" }],
  "audio_urls": [{ "url": "https://example.com/voice.mp3" }],
  "duration": -1
}

// 4. Video editing (2.5)
{
  "prompt": "Replace the background of [Video1] with a snowy mountain",
  "video_urls": [{ "url": "https://example.com/src.mp4" }],
  "omni_reference_task_type": "edit"
}

// 5. Draft → final output (2.5)
{ "prompt": "A girl holding a fox...", "draft": true }
{ "draft_task_id": "cgt-2026xxxx-xxxxxx" }
```

A standard 30-second model task usually takes several minutes; the fast model / shorter clips are quicker.

---

## Security notes

- **Never commit `ARK_API_KEY` to the git repository.** Put it in the `env` field of your MCP client configuration (e.g., `claude_desktop_config.json`, `~/.codex/config.toml`), or in shell environment variables.
- This tool **never** prints `ARK_API_KEY` in logs or return values.
- The `video_url` and `last_frame_url` returned by Volcengine are **signed temporary URLs**, valid for about 24 hours by default; Seedance 2.5 video URLs can be downloaded at most 100 times. Download promptly after the task succeeds.
- Task records are kept for 7 days; draft task IDs are valid for 7 days.
- The `image_urls` / `video_urls` / `audio_urls` you pass must be **publicly accessible** (or use `asset://` asset IDs); local paths, intranet addresses, and resources requiring login cannot be fetched by Volcengine's servers.
- Seedance 2.5 / 2.0 does not support uploading reference images / videos containing real people's faces; use platform-provided virtual personas or properly licensed real-person assets.
- Please comply with the Volcengine ARK and Seedance model terms of use. Do not generate illegal, minor-inappropriate, or infringing content.

---

## Development

```bash
npm install
npm run typecheck
npm run dev          # run src/index.ts directly with tsx
npm run build        # output to dist/
npm start            # node dist/index.js
```

Debugging a stdio MCP server is recommended with:

```bash
npx -y @modelcontextprotocol/inspector npx -y seedance-2-mcp
```

Or with the local source:

```bash
npx -y @modelcontextprotocol/inspector node dist/index.js
```

---

## Project structure

```
.
├── src/
│   ├── index.ts          # stdio MCP entrypoint (with shebang)
│   ├── server.ts         # registers McpServer, the three tools, pre-submission validation
│   ├── seedance.ts       # Volcengine ARK Seedance REST API client and request body builder
│   ├── schema.ts         # zod input schemas, model capability table
│   └── usageGuide.ts     # text returned by seedance_usage_guide
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

## License

[MIT](LICENSE) © seedance-2-mcp contributors

This project is **not officially affiliated** with ByteDance, Volcengine, or Volcengine ARK.
"Seedance", "Doubao", "火山方舟" and other names are trademarks of their respective owners.
