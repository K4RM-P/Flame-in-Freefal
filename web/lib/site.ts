// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Public URLs for the project. The demo video is hosted externally (Space Apps rule); until the team uploads it the
// placeholder below is shown as "coming soon" and never as a broken link (docs/HUMAN_TASKS.md).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://flame-in-freefal.vercel.app");
export const VIDEO_URL = "TODO_VIDEO_URL";
export const hasVideo = () => /^https:\/\//.test(VIDEO_URL);
