import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { handleChatRequest } from './server/chatHandler.js'
import { readFileSync } from 'node:fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        // Service worker untuk mode offline: daftar file hasil build disisipkan otomatis.
        name: 'setapak-sw',
        apply: 'build',
        generateBundle(_options, bundle) {
          const aset = Object.keys(bundle)
            .filter((f) => /\.(js|css|woff2?|ttf|svg)$/.test(f))
            .map((f) => '/' + f)
          const sumber = readFileSync('scripts/sw.template.js', 'utf8')
            .replace('__VERSION__', String(Date.now()))
            .replace('__ASSETS__', JSON.stringify(aset))
          this.emitFile({ type: 'asset', fileName: 'sw.js', source: sumber })
        },
      },
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
