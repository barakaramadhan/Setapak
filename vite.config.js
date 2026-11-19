import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { handleChatRequest } from './server/chatHandler.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        // Supaya /api/chat juga jalan saat `npm run dev` (tanpa Vercel).
        name: 'setapak-chat-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/api/chat')) return next()
            await handleChatRequest(req, res, env)
          })
        },
      },
    ],
  }
})
