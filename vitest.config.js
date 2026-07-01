import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { transformWithEsbuild } from "vite";
import path from "path";

const jsxInJsPattern = /[\\/](app|components)[\\/].*\.js$/;

export default defineConfig({
  plugins: [
    {
      name: "treat-app-js-files-as-jsx",
      enforce: "pre",
      transform(code, id) {
        if (!jsxInJsPattern.test(id)) return null;
        return transformWithEsbuild(code, id, {
          loader: "jsx",
          jsx: "automatic",
        });
      },
    },
    react(),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["**/*.{ts,tsx,js,jsx}"],
      exclude: [
        "node_modules",
        "dist",
        "coverage",
        ".next", 
        "vite.config.*",
        "next.config.*",
        "test/setup.*",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
