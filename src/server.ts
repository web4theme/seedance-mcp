import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import {
  checkTaskInputShape,
  createTaskInputShape,
  MODEL_CAPABILITIES,
  type CheckTaskInput,
  type CreateTaskInput,
} from "./schema.js";
import {
  checkSeedanceTask,
  createSeedanceTask,
  SeedanceApiError,
} from "./seedance.js";
import { USAGE_GUIDE } from "./usageGuide.js";

export const SERVER_NAME = "seedance-2-mcp";
export const SERVER_VERSION = "0.2.0";

export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Seedance 2.5 / 2.0 video generation MCP. Always start by calling seedance_usage_guide before your first call. " +
        "Then call seedance_create_task to submit a job and seedance_check_task to poll. " +
        "Seedance 2.5 supports 4-30s clips, 1080p/mov output, up to 30 images + 10 videos + 10 audios, audio-only input, draft mode and edit/extend guidance. " +
        "Generated video URLs expire (~24h, 100 downloads max on 2.5) - download promptly.",
    },
  );

  server.registerTool(
    "seedance_usage_guide",
    {
      title: "Seedance 2.5 / 2.0 usage guide",
      description:
        "Returns the canonical usage guide for the Seedance MCP: model comparison, per-model limits, task-type constraints, full parameter reference, draft mode, and important caveats. Call this before your first seedance_create_task.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (): Promise<CallToolResult> => ({
      content: [{ type: "text", text: USAGE_GUIDE }],
    }),
  );

  server.registerTool(
    "seedance_create_task",
    {
      title: "Create Seedance video generation task",
      description:
        "Submit a Seedance 2.5 / 2.0 video generation task to the Volcengine ARK API and return the task_id immediately. Does NOT wait for the video to render - poll seedance_check_task afterwards. Supports text-to-video, first/last-frame, omni-reference (images/videos/audios), video edit/extend guidance and two-step draft mode. Reference media must be publicly reachable http(s) URLs, asset:// ids, or data: base64 URIs.",
      inputSchema: createTaskInputShape,
      annotations: {
        readOnlyHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (input: CreateTaskInput): Promise<CallToolResult> => {
      const validationError = validateCreateTaskInput(input);
      if (validationError) {
        return errorResult(validationError);
      }
      try {
        const result = await createSeedanceTask(input);
        const request = result.request;

        const lines = [`Task submitted. task_id: ${result.id}`, ""];
        lines.push(`model: ${request.model}`);
        lines.push(`resolution: ${request.resolution}`);
        if (request.ratio) lines.push(`ratio: ${request.ratio}`);
        lines.push(`duration: ${formatDuration(request.duration)}`);
        if (request.output_format) {
          lines.push(`output_format: ${request.output_format}`);
        }
        if (request.omni_reference_task_type) {
          lines.push(`task_type: ${request.omni_reference_task_type}`);
        }
        if (request.draft !== undefined) {
          lines.push(`draft: ${request.draft}`);
        }
        lines.push(
          `references: ${input.image_urls?.length ?? 0} image(s), ${
            input.video_urls?.length ?? 0
          } video(s), ${input.audio_urls?.length ?? 0} audio(s)`,
        );
        lines.push("");

        if (request.draft) {
          lines.push(
            "This is a 480p DRAFT preview. Wait 30-90 seconds, then call seedance_check_task.",
          );
          lines.push(
            `If the preview looks right, call seedance_create_task again with draft_task_id="${result.id}" (optionally output_format/watermark) to render the final 1080p video.`,
          );
        } else if (input.draft_task_id) {
          lines.push(
            "This is the final 1080p render based on a draft. Wait 30-90 seconds, then call seedance_check_task.",
          );
          lines.push(
            "The draft is charged separately; prompt, media, duration, ratio and audio settings were reused automatically.",
          );
        } else {
          lines.push(
            "Next step: wait 30-90 seconds, then call seedance_check_task with this task_id.",
          );
          lines.push(
            "Short jobs (5-15s) usually take 2-5 minutes; 30s Seedance 2.5 jobs can take longer.",
          );
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: {
            task_id: result.id,
            model: request.model,
            duration: request.duration,
            ratio: request.ratio,
            resolution: request.resolution,
            output_format: request.output_format,
            draft: request.draft ?? false,
            omni_reference_task_type: request.omni_reference_task_type,
            request,
            raw: result.raw,
          },
        };
      } catch (err) {
        return errorResult(formatApiError(err));
      }
    },
  );

  server.registerTool(
    "seedance_check_task",
    {
      title: "Check Seedance task status",
      description:
        "Query the status of a Seedance task by task_id. Returns queued / running / succeeded / failed / cancelled / expired. On success returns video_url (and last_frame_url if return_last_frame was true) plus duration, resolution, output_format, draft flag and token usage. Generated URLs expire within ~24h (100 downloads max on 2.5) - download promptly.",
      inputSchema: checkTaskInputShape,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input: CheckTaskInput): Promise<CallToolResult> => {
      try {
        const result = await checkSeedanceTask(input.task_id);
        const status = result.status.toLowerCase();
        let summary: string;

        switch (status) {
          case "succeeded": {
            const lines = [`Task ${result.id} succeeded.`];
            const meta = [
              result.model ? `model: ${result.model}` : undefined,
              result.resolution ? `resolution: ${result.resolution}` : undefined,
              result.ratio ? `ratio: ${result.ratio}` : undefined,
              result.duration !== undefined
                ? `duration: ${result.duration}s`
                : undefined,
              result.outputFormat
                ? `output_format: ${result.outputFormat}`
                : undefined,
              result.draft !== undefined ? `draft: ${result.draft}` : undefined,
            ].filter((v): v is string => Boolean(v));
            if (meta.length > 0) lines.push(meta.join(" | "));
            lines.push(
              result.videoUrl
                ? `video_url: ${result.videoUrl}`
                : "WARNING: succeeded but no video_url was returned by ARK.",
            );
            if (result.lastFrameUrl) {
              lines.push(`last_frame_url: ${result.lastFrameUrl}`);
            }
            const completionTokens = result.usage?.completion_tokens;
            if (typeof completionTokens === "number") {
              lines.push(`completion_tokens: ${completionTokens}`);
            }
            if (result.draft) {
              lines.push("");
              lines.push(
                `This is a 480p Draft preview. If it looks right, call seedance_create_task with draft_task_id="${result.id}" to render the final 1080p video.`,
              );
            }
            lines.push("");
            lines.push(
              "Reminder: ARK signed URLs typically expire within 24 hours (Seedance 2.5 allows at most 100 downloads). Download the video promptly.",
            );
            summary = lines.join("\n");
            break;
          }
          case "failed": {
            summary = [
              `Task ${result.id} failed.`,
              result.failCode ? `code: ${result.failCode}` : undefined,
              result.failReason ? `reason: ${result.failReason}` : undefined,
            ]
              .filter((v): v is string => Boolean(v))
              .join("\n");
            break;
          }
          case "queued":
          case "running":
          case "in_queue":
          case "pending": {
            summary = [
              `Task ${result.id} is still ${status}.`,
              "Wait another 30-90 seconds, then call seedance_check_task again.",
            ].join("\n");
            break;
          }
          case "cancelled":
          case "canceled": {
            summary = `Task ${result.id} was cancelled.`;
            break;
          }
          case "expired": {
            summary = `Task ${result.id} has expired. Submit a new task with seedance_create_task.`;
            break;
          }
          default: {
            summary = `Task ${result.id} is in status "${result.status}". This is not one of the standard states (queued/running/succeeded/failed/cancelled/expired); see the structured response for details.`;
          }
        }

        return {
          content: [{ type: "text", text: summary }],
          structuredContent: {
            task_id: result.id,
            status: result.status,
            video_url: result.videoUrl,
            last_frame_url: result.lastFrameUrl,
            fail_reason: result.failReason,
            fail_code: result.failCode,
            model: result.model,
            duration: result.duration,
            ratio: result.ratio,
            resolution: result.resolution,
            output_format: result.outputFormat,
            draft: result.draft,
            usage: result.usage,
            raw: result.raw,
          },
        };
      } catch (err) {
        return errorResult(formatApiError(err));
      }
    },
  );

  return server;
}

export function validateCreateTaskInput(input: CreateTaskInput): string | null {
  const caps = MODEL_CAPABILITIES[input.model];
  const images = input.image_urls ?? [];
  const videos = input.video_urls ?? [];
  const audios = input.audio_urls ?? [];

  if (!input.draft_task_id && (!input.prompt || input.prompt.trim().length === 0)) {
    return "prompt is required (it is only optional when draft_task_id is provided, because the draft's prompt is reused).";
  }

  if (images.length > caps.maxImages) {
    return `${caps.label} accepts at most ${caps.maxImages} image_urls items, got ${images.length}.`;
  }
  if (videos.length > caps.maxVideos) {
    return `${caps.label} accepts at most ${caps.maxVideos} video_urls items, got ${videos.length}.`;
  }
  if (audios.length > caps.maxAudios) {
    return `${caps.label} accepts at most ${caps.maxAudios} audio_urls items, got ${audios.length}.`;
  }

  const firstFrames = images.filter((i) => i.role === "first_frame").length;
  const lastFrames = images.filter((i) => i.role === "last_frame").length;
  const referenceImages = images.filter(
    (i) => !i.role || i.role === "reference_image",
  ).length;
  const isFrameTask = firstFrames > 0 || lastFrames > 0;

  if (firstFrames > 1) {
    return "Only one image may use role 'first_frame'.";
  }
  if (lastFrames > 1) {
    return "Only one image may use role 'last_frame'.";
  }
  if (lastFrames > 0 && firstFrames === 0) {
    return "An image with role 'last_frame' requires a matching image with role 'first_frame'.";
  }
  if (isFrameTask && (referenceImages > 0 || videos.length > 0 || audios.length > 0)) {
    return "First-frame / last-frame generation is mutually exclusive with omni-reference input: do not mix first_frame/last_frame images with reference_image, video_urls or audio_urls. Use reference_image and describe the first/last frame in the prompt if you need both.";
  }
  if (
    isFrameTask &&
    caps.supportsOmniReferenceTaskType &&
    input.ratio !== undefined &&
    input.ratio !== "adaptive"
  ) {
    return "Seedance 2.5 first-frame / last-frame tasks only support ratio='adaptive' (omit ratio to use the default).";
  }

  if (audios.length > 0 && images.length === 0 && videos.length === 0 && !caps.supportsAudioOnly) {
    return `${caps.label} does not support audio-only input. Pair audio_urls with at least one image or video, or switch to doubao-seedance-2-5-260628.`;
  }

  if (input.web_search && (images.length > 0 || videos.length > 0 || audios.length > 0)) {
    return "web_search=true requires text-only input. Remove image_urls / video_urls / audio_urls, or set web_search=false.";
  }

  if (input.duration !== undefined) {
    const d = input.duration;
    if (d !== -1 && (d < caps.durationMin || d > caps.durationMax)) {
      return `${caps.label} duration must be -1 (auto) or an integer in [${caps.durationMin}, ${caps.durationMax}], got ${d}.`;
    }
  }

  if (input.resolution !== undefined && !caps.resolutions.includes(input.resolution)) {
    return `${caps.label} supports resolution ${caps.resolutions.join(
      "/",
    )}, got "${input.resolution}".`;
  }

  if (
    input.output_format !== undefined &&
    !caps.outputFormats.includes(input.output_format)
  ) {
    return `${caps.label} supports output_format ${caps.outputFormats.join(
      "/",
    )}, got "${input.output_format}". 'mov' is Seedance 2.5 only.`;
  }

  const omni = input.omni_reference_task_type ?? "auto";
  if (omni !== "auto") {
    if (!caps.supportsOmniReferenceTaskType) {
      return "omni_reference_task_type is only supported by doubao-seedance-2-5-260628.";
    }
    if (input.draft_task_id) {
      return "omni_reference_task_type is reused from the draft. Do not pass it together with draft_task_id.";
    }
    if ((omni === "edit" || omni === "extend") && videos.length === 0) {
      return `omni_reference_task_type='${omni}' requires at least one video_urls item with role 'reference_video'.`;
    }
    if (
      (omni === "edit" || omni === "extend") &&
      input.ratio !== undefined &&
      input.ratio !== "adaptive"
    ) {
      return `omni_reference_task_type='${omni}' requires ratio='adaptive' (omit ratio to use the default).`;
    }
    if (omni === "edit" && input.duration !== undefined && input.duration !== -1) {
      return "omni_reference_task_type='edit' requires duration=-1 (the output length follows the source video).";
    }
  }

  if (input.draft) {
    if (!caps.supportsDraft) {
      return "draft mode is only supported by doubao-seedance-2-5-260628.";
    }
    if (input.draft_task_id) {
      return "draft=true and draft_task_id cannot be used together. Submit the draft first, then render the final video with draft_task_id.";
    }
    if (input.resolution !== undefined && input.resolution !== "480p") {
      return "Draft videos only support resolution='480p' (omit resolution to use the default).";
    }
  }

  if (input.draft_task_id) {
    if (!caps.supportsDraft) {
      return "draft_task_id is only supported by doubao-seedance-2-5-260628.";
    }
    if (images.length > 0 || videos.length > 0 || audios.length > 0) {
      return "When rendering the final video from a draft (draft_task_id), do not pass image_urls / video_urls / audio_urls. Prompt, media, duration, ratio, seed, generate_audio and the task type are reused from the draft.";
    }
    if (input.web_search) {
      return "web_search cannot be combined with draft_task_id.";
    }
    if (input.resolution !== undefined && input.resolution !== "1080p") {
      return "The final video rendered from a draft only supports resolution='1080p' (omit resolution to use the default).";
    }
  }

  return null;
}

function formatDuration(duration: number | undefined): string {
  if (duration === undefined) return "auto (reused from draft)";
  if (duration === -1) return "auto (-1)";
  return `${duration}s`;
}

function formatApiError(err: unknown): string {
  if (err instanceof SeedanceApiError) {
    return `ARK API error (HTTP ${err.status}): ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function errorResult(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
