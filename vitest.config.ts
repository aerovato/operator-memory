import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/*/src/**/*.test.ts",
      "packages/*/test/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
    exclude: ["src-*/**", "**/node_modules/**", "**/dist/**"],
    passWithNoTests: true,
  },
});
