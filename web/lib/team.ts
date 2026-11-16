// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Team and challenge identity, shown in the footer, About and Credits.
export const TEAM = ["Anujan", "Karm", "Aaron", "Xuliang"] as const;
export const TEAM_CITY = "Toronto";
export const CHALLENGE_NAME = "Flame in Freefall";
// Space Apps root (the exact 2026 challenge page could not be checked from the build sandbox; see docs/HUMAN_TASKS.md).
export const CHALLENGE_URL = "https://www.spaceappschallenge.org/";
// The submitted production site (the Vercel project with the OpenAI key). A second Vercel project,
// flame-in-freefal.vercel.app, also deploys main but has no key, so it runs in offline mode.
export const LIVE_URL = "https://emberatlas-five.vercel.app";
