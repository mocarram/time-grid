import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}", "tests/integration/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/index.ts",
        "src/**/*.d.ts",
        "src/ui/primitives/**",
        "src/data/**",
      ],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
        "src/domain/**/*.ts": {
          lines: 95,
          branches: 95,
          functions: 95,
          statements: 95,
        },
        "src/infrastructure/**/*.ts": {
          lines: 90,
          branches: 85,
          functions: 90,
          statements: 90,
        },
        "src/application/**/*.ts": {
          lines: 85,
          branches: 80,
          functions: 85,
          statements: 85,
        },
      },
    },
  },
});
