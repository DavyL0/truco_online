import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from "kimi-plugin-inspect-react"

const gameServerOrigin = `http://127.0.0.1:${process.env.GAME_SERVER_PORT || 3311}`

export default defineConfig({
  base: "./",
  plugins: [inspectAttr(), react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": gameServerOrigin,
      "/texture": gameServerOrigin,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/client"),
    },
  },
})
