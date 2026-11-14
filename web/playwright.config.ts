// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  outputDir: "e2e-results",
  use: { baseURL: "http://localhost:3123", viewport: { width: 1400, height: 900 } },
  // No OPENAI_API_KEY in tests: the interpretation panel must show the "add key" message, never a canned answer.
  webServer: { command: "pnpm start -p 3123", port: 3123, reuseExistingServer: true, env: { OPENAI_API_KEY: "" } },
});
