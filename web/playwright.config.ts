// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:3123", viewport: { width: 1400, height: 900 } },
  webServer: { command: "pnpm start -p 3123", port: 3123, reuseExistingServer: true, env: { DEMO_MODE: "1" } },
});
