import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
import { configDefaults } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      '#lib':   path.resolve(__dirname, 'src/lib'),
      '#utils': path.resolve(__dirname, 'src/utils'),
      '#hooks': path.resolve(__dirname, 'src/hooks'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ["./src/tests/setup.js"],
    globals: true,
    exclude: [...configDefaults.exclude, "src/appointment booking/**"],
    coverage: {
      reporter: ['text', 'json-summary'],
    },
  },
});
