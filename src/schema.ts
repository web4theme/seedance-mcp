import { z } from "zod";

export const SEEDANCE_MODELS = [
  "doubao-seedance-2-0-260128",
  "doubao-seedance-2-0-fast-260128",
] as const;

export const RATIOS = [
  "21:9",
  "16:9",
  "4:3",
  "1:1",
  "3:4",
  "9:16",
  "adaptive",
] as const;

export const RESOLUTIONS = ["480p", "720p"] as const;

export const IMAGE_ROLES = [
  "reference_image",
  "first_frame",
  "last_frame",
] as const;

export const VIDEO_ROLES = ["reference_video"] as const;

export const AUDIO_ROLES = ["reference_audio"] as const;

const httpUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
    message: "URL must start with http:// or https://",
  });

export const imageItemSchema = z.object({
  url: httpUrl,
  role: z.enum(IMAGE_ROLES).optional(),
});

export const videoItemSchema = z.object({
  url: httpUrl,
  role: z.enum(VIDEO_ROLES).optional(),
});

export const audioItemSchema = z.object({
  url: httpUrl,
  role: z.enum(AUDIO_ROLES).optional(),
});

export const createTaskInputShape = {
  prompt: z
    .string()
    .min(1, "prompt cannot be empty")
    .describe(
      "Natural-language description of the desired video. Reference images / videos / audios with [Image1], [Video1], [Audio1] in 1-based order if you provided any.",
    ),
  model: z
    .enum(SEEDANCE_MODELS)
    .default("doubao-seedance-2-0-260128")
    .describe(
      "Seedance 2.0 model id. doubao-seedance-2-0-260128 is the standard, highest-quality model. doubao-seedance-2-0-fast-260128 trades quality for latency.",
    ),
  duration: z
    .number()
    .int()
    .min(4)
    .max(15)
    .default(5)
    .describe("Video length in seconds. Must be an integer in [4, 15]."),
  ratio: z
    .enum(RATIOS)
    .default("16:9")
    .describe(
      "Aspect ratio. Use 9:16 for vertical short-video, 16:9 for landscape. 'adaptive' lets the model pick the best fit when reference media is provided.",
    ),
  resolution: z
    .enum(RESOLUTIONS)
    .default("720p")
    .describe("Output resolution. 720p is recommended; 480p is faster/cheaper."),
  generate_audio: z
    .boolean()
    .default(true)
    .describe(
      "Whether to generate synchronized audio (dialogue, SFX, music). Set false for silent video.",
    ),
  watermark: z
    .boolean()
    .default(true)
    .describe(
      "Whether to add the platform watermark. Some accounts cannot disable this.",
    ),
  web_search: z
    .boolean()
    .default(false)
    .describe(
      "Enable prompt enhancement via web search. Text-only input is required when this is true.",
    ),
  return_last_frame: z
    .boolean()
    .default(false)
    .describe(
      "Return the last frame as an image URL alongside the video URL. Useful for chaining segments.",
    ),
  image_urls: z
    .array(imageItemSchema)
    .max(9, "image_urls accepts at most 9 items")
    .optional()
    .describe(
      "Up to 9 reference images. Each item is { url, role? }. role defaults to 'reference_image'. Use 'first_frame' (and optionally 'last_frame') for image-to-video animation.",
    ),
  video_urls: z
    .array(videoItemSchema)
    .max(3, "video_urls accepts at most 3 items")
    .optional()
    .describe(
      "Up to 3 reference videos. Each item is { url, role? }. role defaults to 'reference_video'.",
    ),
  audio_urls: z
    .array(audioItemSchema)
    .max(3, "audio_urls accepts at most 3 items")
    .optional()
    .describe(
      "Up to 3 reference audios. Each item is { url, role? }. role defaults to 'reference_audio'. Audio MUST be paired with at least one image or video reference.",
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
