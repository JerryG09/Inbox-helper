import { defineConfig, devices } from "@playwright/test";

// Contract §2: Chromium, 1x device scale, 1440px desktop / 390px mobile (+320/768 regression).
export default defineConfig({
  testDir: "test/visual",
  outputDir: "test-results",
  reporter: [["list"]],
  workers: 1, // parity report is merged in one process
  use: { ...devices["Desktop Chrome"], deviceScaleFactor: 1, baseURL: "http://127.0.0.1:3100" },
  webServer: {
    command: "npx next start -p 3100 -H 127.0.0.1",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
