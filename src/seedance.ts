import {
  MODEL_CAPABILITIES,
  type CreateTaskInput,
  type SeedanceModel,
} from "./schema.js";

const DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

export type ContentItem =
  | { type: "text"; text: string }
  | {
      type: "image_url";
      image_url: { url: string };
      role: "reference_image" | "first_frame" | "last_frame";
    }
  | { type: "video_url"; video_url: { url: string }; role: "reference_video" }
  | { type: "audio_url"; audio_url: { url: string }; role: "reference_audio" }
  | { type: "draft_task"; draft_task: { id: string } };

export type ToolItem = { type: "web_search" };

export interface CreateTaskRequestBody {
  model: string;
  content: ContentItem[];
  ratio?: string;
  resolution?: string;
  duration?: number;
  generate_audio?: boolean;
  watermark?: boolean;
  output_format?: string;
  omni_reference_task_type?: string;
  tools?: ToolItem[];
  return_last_frame?: boolean;
  draft?: boolean;
  priority?: number;
  execution_expires_after?: number;
  callback_url?: string;
  safety_identifier?: string;
}

export interface CreateTaskResponse {
  id: string;
  /** The exact request body sent to ARK, useful for debugging and for echoing effective defaults. */
  request: CreateTaskRequestBody;
  /** Anything else the API returned, kept for transparency. */
  raw: Record<string, unknown>;
}

/**
 * Normalized representation of a video generation task. We keep the raw payload
 * around so the caller can surface unrecognized fields verbatim if needed.
 */
export interface CheckTaskResponse {
  id: string;
  status: string;
  videoUrl?: string;
  lastFrameUrl?: string;
  failReason?: string;
  failCode?: string;
  model?: string;
  duration?: number;
  ratio?: string;
  resolution?: string;
  outputFormat?: string;
  draft?: boolean;
  usage?: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export class SeedanceApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "SeedanceApiError";
    this.status = status;
    this.body = body;
  }
}

function getApiKey(): string {
  const key = process.env.ARK_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error(
      "Missing ARK_API_KEY environment variable. Please set ARK_API_KEY to your Volcengine ARK API key. " +
        "Get one at https://console.volcengine.com/ark.",
    );
  }
  return key.trim();
}

function getBaseUrl(): string {
  const override = process.env.ARK_BASE_URL?.trim();
  if (override && override.length > 0) {
    return override.replace(/\/+$/, "");
  }
  return DEFAULT_BASE_URL;
}

function buildContent(input: CreateTaskInput): ContentItem[] {
  if (input.draft_task_id) {
    return [
      {
        type: "draft_task",
        draft_task: { id: input.draft_task_id.trim() },
      },
    ];
  }

  const items: ContentItem[] = [];
  if (input.prompt && input.prompt.trim().length > 0) {
    items.push({ type: "text", text: input.prompt });
  }

  for (const img of input.image_urls ?? []) {
    items.push({
      type: "image_url",
      image_url: { url: img.url },
      role: img.role ?? "reference_image",
    });
  }
  for (const vid of input.video_urls ?? []) {
    items.push({
      type: "video_url",
      video_url: { url: vid.url },
      role: vid.role ?? "reference_video",
    });
  }
  for (const aud of input.audio_urls ?? []) {
    items.push({
      type: "audio_url",
      audio_url: { url: aud.url },
      role: aud.role ?? "reference_audio",
    });
  }

  return items;
}

/**
 * Resolve the effective request body, applying context-aware defaults:
 * - normal runs default to 5s / 720p / adaptive ratio;
 * - draft creation defaults to 480p;
 * - a draft-based final defaults to 1080p and omits reused params;
 * - video-edit tasks default to duration=-1.
 */
export function buildCreateTaskBody(input: CreateTaskInput): CreateTaskRequestBody {
  const caps = MODEL_CAPABILITIES[input.model as SeedanceModel];
  const isDraftFinal = Boolean(input.draft_task_id);

  const body: CreateTaskRequestBody = {
    model: input.model,
    content: buildContent(input),
  };

  if (isDraftFinal) {
    // duration, ratio, prompt, media, seed, generate_audio and the omni task type
    // are reused from the draft and must not be re-sent.
    body.resolution = input.resolution ?? "1080p";
    body.output_format = input.output_format ?? "mp4";
    body.watermark = input.watermark ?? false;
    body.return_last_frame = input.return_last_frame ?? false;
  } else {
    body.ratio = input.ratio ?? "adaptive";
    body.resolution =
      input.resolution ?? (input.draft ? "480p" : "720p");
    body.duration =
      input.duration ??
      (input.omni_reference_task_type === "edit" ? -1 : 5);
    body.generate_audio = input.generate_audio ?? true;
    body.watermark = input.watermark ?? false;
    body.output_format = input.output_format ?? "mp4";
    body.return_last_frame = input.return_last_frame ?? false;
    if (caps.supportsOmniReferenceTaskType) {
      body.omni_reference_task_type = input.omni_reference_task_type ?? "auto";
    }
    if (caps.supportsDraft) {
      body.draft = input.draft ?? false;
    }
  }

  if (input.web_search) {
    body.tools = [{ type: "web_search" }];
  }
  if (input.priority !== undefined) {
    body.priority = input.priority;
  }
  if (input.execution_expires_after !== undefined) {
    body.execution_expires_after = input.execution_expires_after;
  }
  if (input.callback_url) {
    body.callback_url = input.callback_url;
  }
  if (input.safety_identifier) {
    body.safety_identifier = input.safety_identifier;
  }

  return body;
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractApiErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    const error = obj.error;
    if (error && typeof error === "object") {
      const errObj = error as Record<string, unknown>;
      const msg = errObj.message;
      if (typeof msg === "string" && msg.length > 0) return msg;
    }
    if (typeof error === "string" && error.length > 0) return error;
    const msg = obj.message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  if (typeof body === "string" && body.length > 0) return body;
  return `ARK API request failed with HTTP ${status}`;
}

/**
 * Submit a Seedance video generation task. Returns immediately with a
 * task id; does not wait for completion.
 *
 * Implements POST /api/v3/contents/generations/tasks per the Volcengine ARK
 * video generation API.
 */
export async function createSeedanceTask(
  input: CreateTaskInput,
): Promise<CreateTaskResponse> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  const body = buildCreateTaskBody(input);

  const res = await fetch(`${baseUrl}/contents/generations/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const parsed = await parseJsonSafe(res);

  if (!res.ok) {
    throw new SeedanceApiError(
      extractApiErrorMessage(parsed, res.status),
      res.status,
      parsed,
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new SeedanceApiError(
      "ARK API returned an unexpected non-JSON response",
      res.status,
      parsed,
    );
  }

  const obj = parsed as Record<string, unknown>;
  const id = obj.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new SeedanceApiError(
      "ARK API response did not include a task id",
      res.status,
      parsed,
    );
  }

  return { id, request: body, raw: obj };
}

/**
 * Query a Seedance video generation task by id.
 *
 * Implements GET /api/v3/contents/generations/tasks/{task_id}.
 */
export async function checkSeedanceTask(
  taskId: string,
): Promise<CheckTaskResponse> {
  if (!taskId || taskId.trim().length === 0) {
    throw new Error("task_id is required");
  }
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  const res = await fetch(
    `${baseUrl}/contents/generations/tasks/${encodeURIComponent(taskId.trim())}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  const parsed = await parseJsonSafe(res);

  if (!res.ok) {
    throw new SeedanceApiError(
      extractApiErrorMessage(parsed, res.status),
      res.status,
      parsed,
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new SeedanceApiError(
      "ARK API returned an unexpected non-JSON response",
      res.status,
      parsed,
    );
  }

  const obj = parsed as Record<string, unknown>;
  const id = typeof obj.id === "string" ? obj.id : taskId;
  const status = typeof obj.status === "string" ? obj.status : "unknown";

  const content = obj.content;
  const contentObj =
    content && typeof content === "object"
      ? (content as Record<string, unknown>)
      : {};

  const videoUrl = pickString(
    contentObj.video_url,
    contentObj.videoUrl,
    obj.video_url,
    obj.videoUrl,
  );

  const lastFrameUrl = pickString(
    contentObj.last_frame_url,
    contentObj.lastFrameUrl,
    obj.last_frame_url,
    obj.lastFrameUrl,
  );

  const errorObj =
    obj.error && typeof obj.error === "object"
      ? (obj.error as Record<string, unknown>)
      : undefined;

  const failReason = pickString(
    errorObj?.message,
    typeof obj.error === "string" ? obj.error : undefined,
    obj.fail_reason,
    obj.failReason,
    obj.error_message,
  );

  return {
    id,
    status,
    videoUrl,
    lastFrameUrl,
    failReason,
    failCode: pickString(errorObj?.code),
    model: typeof obj.model === "string" ? obj.model : undefined,
    duration: typeof obj.duration === "number" ? obj.duration : undefined,
    ratio: typeof obj.ratio === "string" ? obj.ratio : undefined,
    resolution: typeof obj.resolution === "string" ? obj.resolution : undefined,
    outputFormat:
      typeof obj.output_format === "string" ? obj.output_format : undefined,
    draft: typeof obj.draft === "boolean" ? obj.draft : undefined,
    usage:
      obj.usage && typeof obj.usage === "object"
        ? (obj.usage as Record<string, unknown>)
        : undefined,
    raw: obj,
  };
}

function pickString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return undefined;
}
