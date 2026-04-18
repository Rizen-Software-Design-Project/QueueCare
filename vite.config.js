import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',  //Remove this line if you want to deploy to azure  change to ./
  server: {
    proxy: {
      '/appointments': 'http://localhost:3000',
      '/slots': 'http://localhost:3000',
      '/queue': 'http://localhost:3000',
      '/staff': 'http://localhost:3000',
    },
  },
})
