import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import {
  checkTaskInputShape,
  createTaskInputShape,
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
export const SERVER_VERSION = "0.1.0";

export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Seedance 2.0 video generation MCP. Always start by calling seedance_usage_guide before your first call. " +
        "Then call seedance_create_task to submit a job and seedance_check_task to poll. " +
        "Generated video URLs expire (~24h) - download promptly.",
    },
  );

  server.registerTool(
    "seedance_usage_guide",
    {
      title: "Seedance 2.0 usage guide",
      description:
        "Returns the canonical usage guide for the Seedance 2.0 MCP: standard create -> wait -> check workflow, model choices, parameter reference, and important caveats. Call this before your first seedance_create_task.",
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
      title: "Create Seedance 2.0 video generation task",
      description:
        "Submit a Seedance 2.0 video generation task to the Volcengine ARK API and return the task_id immediately. Does NOT wait for the video to render - poll seedance_check_task afterwards. Reference media URLs must be publicly reachable.",
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
        const human = [
          `Task submitted. task_id: ${result.id}`,
          "",
          "Next step: wait 30-90 seconds, then call seedance_check_task with this task_id.",
          "A 15-second job on the standard model usually needs 2-5 minutes total.",
        ].join("\n");
        return {
          content: [{ type: "text", text: human }],
          structuredContent: {
            task_id: result.id,
            model: input.model,
            duration: input.duration,
            ratio: input.ratio,
            resolution: input.resolution,
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
      title: "Check Seedance 2.0 task status",
      description:
        "Query the status of a Seedance 2.0 task by task_id. Returns running / succeeded / failed / other. On success returns video_url (and last_frame_url if return_last_frame was true). Generated URLs expire within ~24h - download promptly.",
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
            const lines = [
              `Task ${result.id} succeeded.`,
              result.videoUrl
                ? `video_url: ${result.videoUrl}`
                : "WARNING: succeeded but no video_url was returned by ARK.",
            ];
            if (result.lastFrameUrl) {
              lines.push(`last_frame_url: ${result.lastFrameUrl}`);
            }
            lines.push("");
            lines.push(
              "Reminder: ARK signed URLs typically expire within 24 hours. Download the video promptly.",
            );
            summary = lines.join("\n");
            break;
          }
          case "failed": {
            summary = `Task ${result.id} failed.${
              result.failReason ? ` Reason: ${result.failReason}` : ""
            }`;
            break;
          }
          case "running":
          case "queued":
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
            summary = `Task ${result.id} is in status "${result.status}". This is not one of the standard states (running/succeeded/failed/cancelled/expired); see the structured response for details.`;
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

function validateCreateTaskInput(input: CreateTaskInput): string | null {
  const hasImages = (input.image_urls?.length ?? 0) > 0;
  const hasVideos = (input.video_urls?.length ?? 0) > 0;
  const hasAudios = (input.audio_urls?.length ?? 0) > 0;

  if (hasAudios && !hasImages && !hasVideos) {
    return (
      "Seedance 2.0 does not support pure-text + audio generation. " +
      "Audio references must be paired with at least one image_urls or video_urls item."
    );
  }

  if (input.web_search && (hasImages || hasVideos || hasAudios)) {
    return (
      "web_search=true requires text-only input. " +
      "Remove image_urls / video_urls / audio_urls, or set web_search=false."
    );
  }

  return null;
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
