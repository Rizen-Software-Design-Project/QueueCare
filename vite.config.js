import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    proxy: {
      "/appointments": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/queue": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/staff": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/notify": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ["./src/tests/setup.js"],
    globals: true,
  },
});
