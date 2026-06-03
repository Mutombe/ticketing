import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pin the dev port so the origin is always http://localhost:5178
  // (must match an Authorized JavaScript origin in Google Cloud Console).
  server: { port: 5178, strictPort: true },
})
