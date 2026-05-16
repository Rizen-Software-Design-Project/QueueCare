import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tsconfigPaths()],

  resolve: {
    alias: {
      "#lib": path.resolve(__dirname, "src/lib"),
      "#utils": path.resolve(__dirname, "src/utils"),
      "#hooks": path.resolve(__dirname, "src/hooks"),
    },
  },

  test: {
    projects: [
      {
        test: {
          name: "frontend",
          globals: true,
          environment: "jsdom",
          include: ["src/**/*.{test,spec}.{js,jsx}"],
          exclude: ["src/appointment-booking/tests/**"],
          setupFiles: ["./src/tests/setup.js"],

          env: {
            VITE_API_BASE: "http://localhost:5000",
            OPENAI_API_KEY: "test-placeholder",
          },

          alias: {
            "#hooks": path.resolve(__dirname, "src/hooks"),
            "#utils": path.resolve(__dirname, "src/utils"),
            "#lib": path.resolve(__dirname, "src/lib"),
          },
        },
      },

      {
        test: {
          name: "backend",
          globals: true,
          environment: "node",
          include: ["src/appointment-booking/tests/**/*.{test,spec}.js"],

          alias: {
            "#hooks": path.resolve(__dirname, "src/hooks"),
            "#utils": path.resolve(__dirname, "src/utils"),
            "#lib": path.resolve(__dirname, "src/lib"),
          },
        },
      },
    ],

    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{js,jsx}"],
      exclude: ["src/main.jsx", "src/App.jsx", "src/hooks/**", "src/utils/**", "src/tests/vitest.setup.js", "src/appointment-booking/tests/**", "src/appointment-booking/routes/ai_server.js","src/appointment-booking/routes/notify_server.js","src/appointment-booking/routes/queue_server.js", "src/appointment-booking/routes/schedule_server.js", "src/appointment-booking/routes/staff_server.js"],
      clean: true,
      all: true,
    },
  },
});