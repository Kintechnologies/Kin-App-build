import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "web",
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Resolve @kin/shared/* imports to their source so tests don't need a build step
      "@kin/shared/system-prompt": path.resolve(
        __dirname,
        "../../packages/shared/src/system-prompt.ts"
      ),
      "@kin/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
});
