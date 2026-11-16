// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Public URLs for the project. The demo video is hosted externally (Space Apps rule); until the team uploads it the
// placeholder below is shown as "coming soon" and never as a broken link (docs/HUMAN_TASKS.md).
import { LIVE_URL } from "./team";

/** Canonical site URL (OpenGraph, sitemap, share links in reports): the submitted production site unless overridden. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? LIVE_URL;
export const VIDEO_URL = "TODO_VIDEO_URL";
export const hasVideo = () => /^https:\/\//.test(VIDEO_URL);
