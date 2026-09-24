import { resolve } from 'node:path'
import { renameSync, rmSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

const projectRoot = import.meta.dirname

// Vite outputs an HTML entry at a path mirroring its source location
// relative to `root`. Keeping `root` at its default (the project root,
// same as vite.marketing.config.ts) is what makes Tailwind's automatic
// content detection work correctly — moving `root` into app/ was tried
// first and silently produced an empty utility-class stylesheet, caught
// by an actual `vite preview` + screenshot check, not assumed away. So
// `app/index.html` builds to dist-app/app/index.html; this plugin moves
// it up to dist-app/index.html once the build finishes. Safe to do since
// its asset tags are root-absolute ("/assets/...", not relative), so the
// file's own location on disk doesn't affect how the browser resolves them.
function flattenAppHtml(): Plugin {
  return {
    name: 'flatten-app-html',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(projectRoot, 'dist-app')
      renameSync(resolve(outDir, 'app/index.html'), resolve(outDir, 'index.html'))
      rmSync(resolve(outDir, 'app'), { recursive: true, force: true })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), flattenAppHtml()],
  server: {
    port: 5174,
  },
  build: {
    outDir: 'dist-app',
    rollupOptions: {
      input: resolve(projectRoot, 'app/index.html'),
    },
  },
})
