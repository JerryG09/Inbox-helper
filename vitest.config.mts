import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // `server-only` throws outside a React Server build; unit tests exercise server modules directly.
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "test/support/server-only.ts") } },
  test: {
    include: ["test/ui/**/*.test.tsx", "test/reference/**/*.test.ts", "test/domain/**/*.test.ts", "test/import/**/*.test.ts", "test/inbox/**/*.test.ts", "test/live/**/*.test.ts", "test/live/**/*.test.tsx"],
    environment: "jsdom",
  },
});
