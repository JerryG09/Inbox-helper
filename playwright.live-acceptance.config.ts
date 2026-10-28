import { defineConfig, devices } from "@playwright/test";

// AI-01 GENUINE provider acceptance (opt-in, paid, bounded): `npx playwright test -c playwright.live-acceptance.config.ts`.
// Uses the developer's own ANTHROPIC_API_KEY from .env.local (never overridden or printed). Not part of test:visual.
// Server stdout (content-free call metadata) is written to test-results/live-acceptance-server.log.
export default defineConfig({
  testDir: "test/live-acceptance",
  outputDir: "test-results/live-acceptance",
  reporter: [["list"]],
  workers: 1,
  timeout: 180_000,
  use: { ...devices["Desktop Chrome"], deviceScaleFactor: 1, baseURL: "http://127.0.0.1:3110", acceptDownloads: true },
  webServer: {
    command: "mkdir -p test-results && npx next start -p 3110 -H 127.0.0.1 > test-results/live-acceptance-server.log 2>&1",
    url: "http://127.0.0.1:3110",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { INBOX_PROCESSING_MODE: "anthropic", ANTHROPIC_MODEL: "claude-haiku-5-5" },
  },
});
