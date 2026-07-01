import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/nutrition-calculator/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    maxWorkers: 1,
    fileParallelism: false,
    pool: "vmThreads",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
