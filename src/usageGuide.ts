export const USAGE_GUIDE = `# Seedance 2.0 MCP - Usage Guide

This MCP server wraps the Volcengine ARK Seedance 2.0 video generation API as
three local stdio tools. Calls require the ARK_API_KEY environment variable.

## Standard workflow

1. Call \`seedance_create_task\` with your prompt (and any reference media URLs).
   It returns a \`task_id\` immediately and DOES NOT wait for the video to render.
2. Wait 30-90 seconds.
3. Call \`seedance_check_task\` with that \`task_id\`.
4. Repeat step 3 until status is \`succeeded\` or \`failed\`. A 15-second job on the
   standard model typically takes ~2-5 minutes total.
5. If the job succeeded, download the returned \`video_url\` promptly: generated
   URLs from ARK normally expire within 24 hours.

## Models

- \`doubao-seedance-2-0-260128\` (default): standard, highest-quality Seedance 2.0.
- \`doubao-seedance-2-0-fast-260128\`: faster / cheaper variant, lower fidelity.

## Parameters (\`seedance_create_task\`)

- \`prompt\` (string, required): natural-language description. Reference media as
  \`[Image1]\`, \`[Video1]\`, \`[Audio1]\` in 1-based order matching your arrays.
- \`model\` (enum, optional, default \`doubao-seedance-2-0-260128\`).
- \`duration\` (integer, optional, default \`5\`): seconds, range \`[4, 15]\`.
- \`ratio\` (enum, optional, default \`16:9\`): one of \`21:9\`, \`16:9\`, \`4:3\`,
  \`1:1\`, \`3:4\`, \`9:16\`, \`adaptive\`.
- \`resolution\` (enum, optional, default \`720p\`): \`480p\` or \`720p\`.
- \`generate_audio\` (boolean, optional, default \`true\`).
- \`watermark\` (boolean, optional, default \`true\`).
- \`web_search\` (boolean, optional, default \`false\`): prompt enhancement via web
  search. Only allowed when there is NO reference media.
- \`return_last_frame\` (boolean, optional, default \`false\`): also return the last
  frame as an image URL.
- \`image_urls\` (array, optional, max 9): \`{ url, role? }\`. \`role\` defaults to
  \`reference_image\`. Use \`first_frame\` (and optionally \`last_frame\`) for
  image-to-video animation.
- \`video_urls\` (array, optional, max 3): \`{ url, role? }\`. \`role\` defaults to
  \`reference_video\`.
- \`audio_urls\` (array, optional, max 3): \`{ url, role? }\`. \`role\` defaults to
  \`reference_audio\`. Audio MUST be combined with at least one image or video
  reference; pure-text + audio is rejected by Seedance.

## Important notes

- Generated \`video_url\` (and \`last_frame_url\`) are signed URLs that expire,
  typically within 24 hours. Download them as soon as the task succeeds.
- All image / video / audio URLs you pass MUST be publicly reachable from the
  internet. Local file paths and intranet URLs do NOT work.
- A 15-second standard-model job usually needs 2-5 minutes to render. Be patient
  with polling.
- \`web_search=true\` requires text-only input. If you also pass
  \`image_urls\`, \`video_urls\` or \`audio_urls\`, the create call will be rejected.
- The MCP never logs or returns your API key. Keep \`ARK_API_KEY\` in your
  client config / shell env, NOT in source control.
`;
