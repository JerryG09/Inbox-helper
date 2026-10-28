import { defineConfig, devices } from "@playwright/test";

// Contract §2: Chromium, 1x device scale, 1440px desktop / 390px mobile (+320/768 regression).
// AI-01: a second project runs the app in Anthropic mode against a local fake upstream (no paid tokens, fake key).
export default defineConfig({
  testDir: "test/visual",
  outputDir: "test-results",
  reporter: [["list"]],
  workers: 1, // parity report is merged in one process
  use: { ...devices["Desktop Chrome"], deviceScaleFactor: 1 },
  projects: [
    { name: "simulated", testIgnore: /live-.*\.spec\.ts/, use: { baseURL: "http://127.0.0.1:3100" } },
    { name: "live-fake-upstream", testMatch: /live-.*\.spec\.ts/, use: { baseURL: "http://127.0.0.1:3101" } },
  ],
  webServer: [
    {
      command: "npx next start -p 3100 -H 127.0.0.1",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 120_000,
      env: { INBOX_PROCESSING_MODE: "simulated" },
    },
    {
      command: "node test/support/fake-anthropic.mjs",
      url: "http://127.0.0.1:3199/__calls",
      reuseExistingServer: false,
    },
    {
      command: "npx next start -p 3101 -H 127.0.0.1",
      url: "http://127.0.0.1:3101",
      reuseExistingServer: false,
      timeout: 120_000,
      // Process env takes precedence over .env.local, so the real key is never used by tests.
      env: { INBOX_PROCESSING_MODE: "anthropic", ANTHROPIC_API_KEY: "sk-ant-fake-e2e-not-a-real-key", ANTHROPIC_MODEL: "claude-haiku-5-5", ANTHROPIC_BASE_URL: "http://127.0.0.1:3199" },
    },
  ],
});
