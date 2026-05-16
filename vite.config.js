import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const aliases = {
  "#lib": path.resolve(__dirname, "src/lib"),
  "#utils": path.resolve(__dirname, "src/utils"),
  "#hooks": path.resolve(__dirname, "src/hooks"),
};

export default defineConfig({
  plugins: [react(), tsconfigPaths()],

  resolve: {
    alias: aliases,
  },

  test: {
    projects: [
      {
        test: {
          name: "frontend",
          globals: true,
          environment: "jsdom",
          include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
          exclude: ["src/appointment-booking/**"],
          setupFiles: ["./src/tests/setup.js"],
          env: {
            VITE_API_BASE: "http://localhost:5000",
            OPENAI_API_KEY: "test-placeholder",
          },
          alias: aliases,
        },
      },

      {
        test: {
          name: "backend",
          globals: true,
          environment: "node",
          include: ["src/appointment-booking/tests/**/*.{test,spec}.js"],
          alias: aliases,
        },
      },
    ],

    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",

      include: ["src/components/**", "src/queueApi.js", "src/appointment-booking/**"],

      exclude: [
        "src/main.jsx",
        "src/App.jsx",
        "src/tests/**",
        "**/*.css",
        "src/appointment-booking/firebase.js", "src/appointment-booking/routes/ai_server.js", "src/appointment-booking/routes/notify_server.js", "src/appointment-booking/routes/queue_server.js", "src/appointment-booking/routes/schedule_server.js", "src/appointment-booking/routes/staff_server.js",
      ],

      clean: true,
      all: false,
    },
  },
});