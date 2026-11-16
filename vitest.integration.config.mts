import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Integration tests against a real PostgreSQL in Docker, see test/integration/.
// Run with `pnpm run test:integration`. Docker must be running.
export default defineConfig({
  resolve: {
    // Same @/ imports as the app, see "paths" in tsconfig.json
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    exclude: ["node_modules", ".next"],
    globalSetup: ["./test/integration/global-setup.ts"],
    setupFiles: ["./test/integration/setup-env.ts"],
    // All test files share one database, so they run one after another
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
