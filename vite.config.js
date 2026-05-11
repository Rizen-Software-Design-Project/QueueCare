import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    env: {
      VITE_API_BASE: 'http://localhost:5000',
      OPENAI_API_KEY: 'test-placeholder',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      include: [
        'src/components/Welcome.jsx',
        'src/components/Dashboard.jsx',
        'src/components/PatientDashboard.jsx',
        'src/components/DashboardPanels.jsx',
        'src/components/DashboardHelpers.jsx',
        'src/queueApi.js',
        'src/appointment-booking/middleware/errorHandler.js',
        'src/appointment-booking/middleware/notFound.js',
        'src/appointment-booking/routes/appointmentRoutes.js',
        'src/appointment-booking/servers/app.js',
      ],
    },
  },
});