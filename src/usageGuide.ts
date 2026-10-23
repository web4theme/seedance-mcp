export const USAGE_GUIDE = `# Seedance MCP - Usage Guide (Seedance 2.5 / 2.0)

This MCP server wraps the Volcengine ARK video generation API as three local
stdio tools. Calls require the ARK_API_KEY environment variable.

## Standard workflow

1. Call \`seedance_create_task\` with a prompt (and optional reference media).
   It returns a \`task_id\` immediately and DOES NOT wait for the render.
2. Wait 30-90 seconds.
3. Call \`seedance_check_task\` with that \`task_id\`.
4. Repeat step 3 until status is \`succeeded\`, \`failed\`, \`cancelled\` or \`expired\`.
5. On success, download \`video_url\` promptly: ARK URLs normally expire within
   24 hours, and Seedance 2.5 URLs allow at most 100 downloads.

## Models

| Model ID | Name | Duration | Resolution | References | Notes |
| --- | --- | --- | --- | --- | --- |
| \`doubao-seedance-2-5-260628\` | Seedance 2.5 (default) | 4-30s or -1 | 480p / 720p / 1080p | 30 images + 10 videos + 10 audios | mov output, audio-only, draft mode, edit/extend guidance |
| \`doubao-seedance-2-0-260128\` | Seedance 2.0 | 4-15s or -1 | 480p / 720p / 1080p / 4k | 9 images + 3 videos + 3 audios | mp4 only, audio must pair with image/video |
| \`doubao-seedance-2-0-fast-260128\` | Seedance 2.0 Fast | 4-15s or -1 | 480p / 720p | 9 images + 3 videos + 3 audios | cheaper/faster, mp4 only |
| \`doubao-seedance-2-0-mini-260615\` | Seedance 2.0 Mini | 4-15s or -1 | 480p / 720p | 9 images + 3 videos + 3 audios | lowest cost, mp4 only |

Model IDs are exact. Seedance 2.5 requires the model to be activated on your
account (balance > 200 CNY or a resource pack/savings plan).

## Task types and constraints (Seedance 2.5)

Seedance 2.5 infers the task type from your media and prompt. Misconfiguration
can fail asynchronously, so the server validates the common cases up front.

- Text-to-video: text only. No special constraints.
- First-frame / first-last-frame: one image with role \`first_frame\`
  (optionally a second with \`last_frame\`). \`ratio\` must be \`adaptive\`
  (the output follows the first frame's aspect ratio). Cannot be mixed with
  reference media.
- Omni-reference: at least one \`reference_image\`, \`reference_video\` or
  \`reference_audio\`. \`ratio\` / \`duration\` are free.
- Video edit (\`omni_reference_task_type="edit"\`): requires a
  \`reference_video\` of 4-30s, \`ratio="adaptive"\`, \`duration=-1\`.
  Prompt should contain edit keywords such as 编辑视频 / 增加 / 删除 / 修改.
- Video extend (\`omni_reference_task_type="extend"\`): requires a
  \`reference_video\`, \`ratio="adaptive"\`. Prompt should contain 延长 / 延续 / 续写.
- \`omni_reference_task_type\` defaults to \`auto\`: the model decides among
  reference / edit / extend. Set \`reference\` explicitly to avoid edit/extend
  constraints when you just want a new video from references.

Recommended for generic omni-reference: \`omni_reference_task_type="auto"\`,
\`ratio="adaptive"\`, \`duration=-1\` (or a specific 4-30s value).

## Parameters (\`seedance_create_task\`)

Core:

- \`prompt\` (string): required unless \`draft_task_id\` is set. Reference media as
  \`[Image1]\` / \`[Video1]\` / \`[Audio1]\` or \`@图片1\` / \`@视频1\` / \`@音频1\`,
  1-based, matching your arrays. Chinese prompts: keep under ~500 characters.
- \`model\` (enum, default \`doubao-seedance-2-5-260628\`).
- \`duration\` (integer): \`-1\` for automatic, otherwise 4-30 (2.5) or 4-15
  (2.0 series). MCP default when omitted: 5. Omitted in \`draft_task_id\` mode
  (reused from the draft). \`edit\` mode defaults to -1.
- \`ratio\` (enum, default \`adaptive\`): \`21:9\`, \`16:9\`, \`4:3\`, \`1:1\`,
  \`3:4\`, \`9:16\`, \`adaptive\`. 2.5 frame/edit/extend tasks require
  \`adaptive\`.
- \`resolution\` (enum): default 720p. 2.5: 480p/720p/1080p; 2.0: up to 4k;
  2.0 fast/mini: 480p/720p. Draft creation requires 480p; draft-based final
  requires 1080p (both auto-selected when omitted).
- \`generate_audio\` (boolean, default true): synchronized dialogue/SFX/BGM.
  Put spoken lines in double quotes for better audio.
- \`watermark\` (boolean, default false): adds the "AI generated" mark.
- \`output_format\` (enum, default \`mp4\`): \`mov\` is Seedance 2.5 only and is
  recommended for edit/extend workflows (H.264 + yuv444p + PCM).
- \`return_last_frame\` (boolean, default false): also return the last frame URL.
  Chain it as the next task's \`first_frame\` for continuous shots.
- \`web_search\` (boolean, default false): lets the model search timely facts.
  Text-only input; cannot be combined with reference media.

References:

- \`image_urls\` (array, max 30 on 2.5 / 9 on 2.0): \`{ url, role? }\`.
  \`role\` is \`reference_image\` (default), \`first_frame\` or \`last_frame\`.
  \`url\` accepts public http(s), \`asset://<ASSET_ID>\` or
  \`data:image/<fmt>;base64,...\`. Single image < 30 MB, aspect ratio [0.4, 2.5],
  side length [300, 6000] px.
- \`video_urls\` (array, max 10 on 2.5 / 3 on 2.0): \`{ url, role? }\`, role is
  \`reference_video\`. \`url\` is http(s) or \`asset://\`. Single video 2-30s
  (4-30s for edit), total <= 30s on 2.5; mp4/mov, <= 200 MB, 24-60 fps.
- \`audio_urls\` (array, max 10 on 2.5 / 3 on 2.0): \`{ url, role? }\`, role is
  \`reference_audio\`. \`url\` is http(s), \`asset://\` or
  \`data:audio/<fmt>;base64,...\`. Single audio 2-30s, total <= 30s, <= 15 MB.
  2.5 supports audio-only input; 2.0 requires at least one image or video.

Execution control (Seedance 2.5 / 2.0 series):

- \`priority\` (0-9): higher jumps ahead of queued tasks on the same endpoint.
- \`execution_expires_after\` (3600-259200 seconds, default 172800): tasks that
  run longer become \`expired\`.
- \`callback_url\`: ARK POSTs status updates to this http(s) endpoint.
- \`safety_identifier\` (<= 64 chars): opaque end-user id for abuse detection.

Seedance 2.5 draft mode:

- \`draft=true\`: creates a 480p preview with the same prompt/media/settings.
  Check it with \`seedance_check_task\`; the result has \`draft: true\`.
- \`draft_task_id=<draft task id>\`: renders the final 1080p video from the
  draft. Do NOT pass media, prompt, duration or ratio: they are reused. You may
  re-specify \`resolution\` (only 1080p), \`output_format\`, \`watermark\`,
  \`return_last_frame\`, \`priority\`, \`execution_expires_after\`,
  \`callback_url\` and \`safety_identifier\`.
- Draft task ids are valid for 7 days. Draft and final are billed separately.

Not supported for Seedance 2.5 / 2.0: \`seed\`, \`frames\`, \`camera_fixed\`,
\`service_tier\` (these are Seedance 1.0-only parameters).

## Common error codes

- \`InvalidParameter.TaskTypeMismatch\`: the prompt intent and the requested
  \`omni_reference_task_type\` disagree. Make the prompt match the task type.
- \`InvalidParameter.TaskTypeConstraint\`: parameters violate the inferred task
  type (e.g. edit without \`duration=-1\`, or first-frame with a fixed ratio).
- HTTP 429: rate/concurrency limit. Personal accounts: 180 RPM and 3 concurrent
  tasks; enterprise: 600 RPM and 10 concurrent.

## Important notes

- Generated \`video_url\` / \`last_frame_url\` are signed URLs valid ~24 hours.
  Download promptly. Tasks are queryable for 7 days.
- Media URLs must be publicly reachable. Local paths and intranet URLs do not
  work. \`asset://\` ids refer to ARK preset assets / authorized portraits.
- Raw reference images or videos containing real human faces are rejected.
  Use ARK's preset avatars or authorized portrait assets instead.
- \`web_search=true\` requires text-only input.
- Prompt structure: subject + action/event + scene + visual style + camera +
  sound. Sound notation: music in \`()\`, SFX in \`<>\`, dialogue in \`{}\`,
  subtitles in \`【】\`.
- The MCP never logs or returns your API key. Keep \`ARK_API_KEY\` in your
  client config / shell env, NOT in source control.
`;
