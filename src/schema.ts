import { z } from "zod";

export const SEEDANCE_MODELS = [
  "doubao-seedance-2-5-260628",
  "doubao-seedance-2-0-260128",
  "doubao-seedance-2-0-fast-260128",
  "doubao-seedance-2-0-mini-260615",
] as const;

export type SeedanceModel = (typeof SEEDANCE_MODELS)[number];

export const DEFAULT_MODEL: SeedanceModel = "doubao-seedance-2-5-260628";

export const RATIOS = [
  "21:9",
  "16:9",
  "4:3",
  "1:1",
  "3:4",
  "9:16",
  "adaptive",
] as const;

export const RESOLUTIONS = ["480p", "720p", "1080p", "4k"] as const;

export const OUTPUT_FORMATS = ["mp4", "mov"] as const;

export const OMNI_REFERENCE_TASK_TYPES = [
  "auto",
  "reference",
  "edit",
  "extend",
] as const;

export const IMAGE_ROLES = [
  "reference_image",
  "first_frame",
  "last_frame",
] as const;

export const VIDEO_ROLES = ["reference_video"] as const;

export const AUDIO_ROLES = ["reference_audio"] as const;

export interface ModelCapabilities {
  label: string;
  maxImages: number;
  maxVideos: number;
  maxAudios: number;
  durationMin: number;
  durationMax: number;
  resolutions: readonly string[];
  outputFormats: readonly string[];
  supportsOmniReferenceTaskType: boolean;
  supportsDraft: boolean;
  supportsAudioOnly: boolean;
}

/**
 * Per-model limits, taken from the Volcengine ARK "创建视频生成任务" API docs.
 * Keep these in sync with https://console.volcengine.com/ark/region:cn-beijing/docs/create-video-generation-task-api
 */
export const MODEL_CAPABILITIES: Record<SeedanceModel, ModelCapabilities> = {
  "doubao-seedance-2-5-260628": {
    label: "Seedance 2.5",
    maxImages: 30,
    maxVideos: 10,
    maxAudios: 10,
    durationMin: 4,
    durationMax: 30,
    resolutions: ["480p", "720p", "1080p"],
    outputFormats: ["mp4", "mov"],
    supportsOmniReferenceTaskType: true,
    supportsDraft: true,
    supportsAudioOnly: true,
  },
  "doubao-seedance-2-0-260128": {
    label: "Seedance 2.0",
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
    durationMin: 4,
    durationMax: 15,
    resolutions: ["480p", "720p", "1080p", "4k"],
    outputFormats: ["mp4"],
    supportsOmniReferenceTaskType: false,
    supportsDraft: false,
    supportsAudioOnly: false,
  },
  "doubao-seedance-2-0-fast-260128": {
    label: "Seedance 2.0 Fast",
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
    durationMin: 4,
    durationMax: 15,
    resolutions: ["480p", "720p"],
    outputFormats: ["mp4"],
    supportsOmniReferenceTaskType: false,
    supportsDraft: false,
    supportsAudioOnly: false,
  },
  "doubao-seedance-2-0-mini-260615": {
    label: "Seedance 2.0 Mini",
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
    durationMin: 4,
    durationMax: 15,
    resolutions: ["480p", "720p"],
    outputFormats: ["mp4"],
    supportsOmniReferenceTaskType: false,
    supportsDraft: false,
    supportsAudioOnly: false,
  },
};

function mediaUrl(kind: "image" | "video" | "audio") {
  const allowsData = kind !== "video";
  return z.string().refine(
    (u) => {
      if (u.startsWith("http://") || u.startsWith("https://")) return true;
      if (/^asset:\/\/[A-Za-z0-9._-]+$/.test(u)) return true;
      if (allowsData && u.startsWith(`data:${kind}/`)) return true;
      return false;
    },
    {
      message: allowsData
        ? `Must be an http(s) URL, an asset://<ASSET_ID> reference, or a data:${kind}/...;base64,... URI`
        : "Must be an http(s) URL or an asset://<ASSET_ID> reference",
    },
  );
}

const callbackUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
    message: "callback_url must be an http(s) URL",
  });

export const imageItemSchema = z.object({
  url: mediaUrl("image"),
  role: z.enum(IMAGE_ROLES).optional(),
});

export const videoItemSchema = z.object({
  url: mediaUrl("video"),
  role: z.enum(VIDEO_ROLES).optional(),
});

export const audioItemSchema = z.object({
  url: mediaUrl("audio"),
  role: z.enum(AUDIO_ROLES).optional(),
});

export const createTaskInputShape = {
  prompt: z
    .string()
    .min(1, "prompt cannot be empty")
    .optional()
    .describe(
      "Natural-language description of the desired video. Reference media as [Image1] / [Video1] / [Audio1] (or @图片1 / @视频1 / @音频1) in 1-based order matching your arrays. Required unless draft_task_id is provided (the draft's prompt is then reused).",
    ),
  model: z
    .enum(SEEDANCE_MODELS)
    .default(DEFAULT_MODEL)
    .describe(
      "Model id. doubao-seedance-2-5-260628 (Seedance 2.5, default) supports 4-30s, 1080p, mov, 30 images + 10 videos + 10 audios, audio-only, draft mode and edit/extend guidance. doubao-seedance-2-0-260128 (standard), doubao-seedance-2-0-fast-260128 (fast/cheaper) and doubao-seedance-2-0-mini-260615 (lowest cost) support 4-15s and up to 9 images + 3 videos + 3 audios.",
    ),
  duration: z
    .number()
    .int()
    .min(-1)
    .max(30)
    .refine((v) => v === -1 || v >= 4, {
      message: "duration must be -1 (auto) or an integer >= 4",
    })
    .optional()
    .describe(
      "Video length in seconds. Seedance 2.5: [4, 30] or -1 (model picks). Seedance 2.0 series: [4, 15] or -1. MCP default is 5 when omitted; omitting it in draft_task mode reuses the draft's duration. Video-edit tasks require -1 (defaults to -1 for omni_reference_task_type=edit).",
    ),
  ratio: z
    .enum(RATIOS)
    .optional()
    .describe(
      "Aspect ratio. MCP default is 'adaptive' (recommended). Seedance 2.5 first-frame/last-frame, video-edit and video-extend tasks only accept 'adaptive'.",
    ),
  resolution: z
    .enum(RESOLUTIONS)
    .optional()
    .describe(
      "Output resolution. Default 720p. Seedance 2.5 supports 480p/720p/1080p (1080p is 10-bit HEVC); Seedance 2.0 standard adds 4k; 2.0 fast/mini support 480p/720p. Draft creation requires 480p; the final video based on a draft requires 1080p (both are chosen automatically when omitted).",
    ),
  generate_audio: z
    .boolean()
    .optional()
    .describe(
      "Whether to generate synchronized audio (dialogue, SFX, BGM). Default true. Ignored in draft_task mode, where it is reused from the draft.",
    ),
  watermark: z
    .boolean()
    .optional()
    .describe(
      "Whether to add the 'AI generated' watermark. Default false, matching the ARK API.",
    ),
  output_format: z
    .enum(OUTPUT_FORMATS)
    .optional()
    .describe(
      "Output container. 'mp4' (default, best compatibility) or 'mov' (Seedance 2.5 only; high color fidelity for grading/editing).",
    ),
  omni_reference_task_type: z
    .enum(OMNI_REFERENCE_TASK_TYPES)
    .optional()
    .describe(
      "Seedance 2.5 only. Guides the task type so parameter constraints are checked synchronously: 'auto' (default, model decides), 'reference', 'edit' (requires a reference_video, duration=-1, ratio=adaptive) or 'extend' (requires a reference_video, ratio=adaptive).",
    ),
  draft: z
    .boolean()
    .optional()
    .describe(
      "Seedance 2.5 only. true creates a 480p preview (draft) video. Inspect it with seedance_check_task, then submit the final 1080p video by passing the draft task id as draft_task_id.",
    ),
  draft_task_id: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Seedance 2.5 only. Task id of a succeeded draft video. Creates the final 1080p video from it. Do NOT pass prompt media (image_urls/video_urls/audio_urls); duration, ratio, prompt and audio settings are reused from the draft automatically.",
    ),
  web_search: z
    .boolean()
    .optional()
    .describe(
      "Enable the web_search tool so the model can look up timely facts. Default false. Text-only input: cannot be combined with image/video/audio references.",
    ),
  return_last_frame: z
    .boolean()
    .optional()
    .describe(
      "Return the last frame as an image URL alongside the video URL. Default false. Useful for chaining segments.",
    ),
  image_urls: z
    .array(imageItemSchema)
    .max(30, "image_urls accepts at most 30 items")
    .optional()
    .describe(
      "Reference images: up to 30 for Seedance 2.5, 9 for Seedance 2.0 series. Each item is { url, role? }, url is http(s), asset://<ASSET_ID> or data:image/...;base64,.... role defaults to 'reference_image'. Use exactly one 'first_frame' (plus optionally one 'last_frame') for image-to-video; first/last-frame roles cannot be mixed with reference media.",
    ),
  video_urls: z
    .array(videoItemSchema)
    .max(10, "video_urls accepts at most 10 items")
    .optional()
    .describe(
      "Reference videos: up to 10 for Seedance 2.5, 3 for Seedance 2.0 series. Each item is { url, role? }; url must be http(s) or asset://; role defaults to 'reference_video'. For Seedance 2.5, a single reference video must be 4-30s for edit tasks / 2-30s otherwise, and all reference videos together must not exceed 30s.",
    ),
  audio_urls: z
    .array(audioItemSchema)
    .max(10, "audio_urls accepts at most 10 items")
    .optional()
    .describe(
      "Reference audios: up to 10 for Seedance 2.5, 3 for Seedance 2.0 series. Each item is { url, role? }; url is http(s), asset:// or data:audio/...;base64,.... role defaults to 'reference_audio'. Seedance 2.5 allows audio-only input; Seedance 2.0 requires at least one image or video.",
    ),
  priority: z
    .number()
    .int()
    .min(0)
    .max(9)
    .optional()
    .describe(
      "Queue priority, 0-9 (higher runs first among queued tasks on the same endpoint). Supported by Seedance 2.5 / 2.0 series.",
    ),
  execution_expires_after: z
    .number()
    .int()
    .min(3600)
    .max(259200)
    .optional()
    .describe(
      "Task timeout in seconds, [3600, 259200]. Default 172800 (48h). Tasks not finished in time become 'expired'.",
    ),
  callback_url: callbackUrl
    .optional()
    .describe(
      "HTTPS endpoint that ARK will POST task status updates to (payload matches the query-task API).",
    ),
  safety_identifier: z
    .string()
    .max(64)
    .optional()
    .describe(
      "Opaque end-user identifier (<=64 chars), e.g. a hashed user id, used for abuse detection.",
    ),
};

export const createTaskInputSchema = z.object(createTaskInputShape);
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const checkTaskInputShape = {
  task_id: z
    .string()
    .min(1, "task_id cannot be empty")
    .describe("Seedance task id returned by seedance_create_task (e.g. cgt-...)."),
};

export const checkTaskInputSchema = z.object(checkTaskInputShape);
export type CheckTaskInput = z.infer<typeof checkTaskInputSchema>;
