import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Production build for the marketing site — deployed as its own Vercel
// project on the bare domain. Entry is the default `index.html` /
// `src/main.tsx`, which never imports wagmi/viem/RainbowKit.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist-marketing',
  },
})
