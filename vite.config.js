import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/QueueCare/',  //Remove this line if you want to deploy to azure  change to ./
  test: {
    environment: 'jsdom',
    setupFiles: ["./src/tests/vitest.setup.js"],
    globals: true,
  },
})
