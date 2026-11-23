import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Coverage floor for the code the unit tests are meant to cover in full: the rules in
// domain/ and the Server Actions (NF7). The rest is reported, not enforced, because the
// pages are tested by hand and the database code by the integration tests.
const UNIT_FLOOR = { lines: 95, branches: 95, functions: 95, statements: 95 };

export default defineConfig({
  resolve: {
    // Same @/ imports as the app, see "paths" in tsconfig.json
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // Integration tests need Docker and run with `pnpm run test:integration`
    exclude: ["node_modules", ".next", "**/*.integration.test.ts"],
    // Only with `pnpm run test:coverage`, which CI runs. See docs/test-metrics.md
    coverage: {
      provider: "v8",
      include: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "domain/**/*.ts", "lib/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.integration.test.ts", "components/ui/**"],
      reporter: ["text-summary", "text", "html", "json-summary"],
      thresholds: {
        "domain/**": UNIT_FLOOR,
        "app/actions/**": UNIT_FLOOR,
      },
    },
  },
});
