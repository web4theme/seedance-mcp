import type { CreateTaskInput } from "./schema.js";

const DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

export type ContentItem =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string }; role: "reference_image" | "first_frame" | "last_frame" }
  | { type: "video_url"; video_url: { url: string }; role: "reference_video" }
  | { type: "audio_url"; audio_url: { url: string }; role: "reference_audio" };

export type ToolItem = { type: "web_search" };

export interface CreateTaskRequestBody {
  model: string;
  content: ContentItem[];
  ratio?: string;
  resolution?: string;
  duration?: number;
  generate_audio?: boolean;
  watermark?: boolean;
  tools?: ToolItem[];
  return_last_frame?: boolean;
}

export interface CreateTaskResponse {
  id: string;
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
  const items: ContentItem[] = [{ type: "text", text: input.prompt }];

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

export function buildCreateTaskBody(input: CreateTaskInput): CreateTaskRequestBody {
  return {
    model: input.model,
    content: buildContent(input),
    ratio: input.ratio,
    resolution: input.resolution,
    duration: input.duration,
    generate_audio: input.generate_audio,
    watermark: input.watermark,
    tools: input.web_search ? [{ type: "web_search" }] : undefined,
    return_last_frame: input.return_last_frame,
  };
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
    const msg = obj.message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  if (typeof body === "string" && body.length > 0) return body;
  return `ARK API request failed with HTTP ${status}`;
}

/**
 * Submit a Seedance 2.0 video generation task. Returns immediately with a
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

  return { id, raw: obj };
}

/**
 * Query a Seedance 2.0 video generation task by id.
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

  // Different SDK versions surface results in slightly different places; be
  // lenient and probe the most common shapes.
  const content =
    (obj.content as Record<string, unknown> | undefined) ??
    (obj.result as Record<string, unknown> | undefined) ??
    {};

  const videoUrl = pickString(
    content.video_url,
    content.videoUrl,
    obj.video_url,
    obj.videoUrl,
  );

  const lastFrameUrl = pickString(
    content.last_frame_url,
    content.lastFrameUrl,
    obj.last_frame_url,
    obj.lastFrameUrl,
  );

  const failReason = pickString(
    obj.fail_reason,
    obj.failReason,
    obj.error_message,
    (obj.error as Record<string, unknown> | undefined)?.message,
  );

  return {
    id,
    status,
    videoUrl,
    lastFrameUrl,
    failReason,
    raw: obj,
  };
}

function pickString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return undefined;
}
