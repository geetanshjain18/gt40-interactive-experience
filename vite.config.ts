import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync, readdirSync } from 'node:fs'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), {
    name: 'study-production-assets',
    apply: 'build',
    config: () => ({ publicDir: false }),
    generateBundle() {
      // Keep historical models on disk; ship only this study's active public assets.
      const modelFile = readFileSync('src/config/experience.ts', 'utf8').match(/models\/([^'"}]+\.glb)/)?.[1]
      const configuredModel = modelFile ? `/models/${modelFile}` : undefined
      if (!configuredModel) throw new Error('No configured GLB path')
      const audioFiles = readdirSync('public/audio').filter(p => /\.(ogg|mp3|md)$/i.test(p)).map(p => `audio/${p}`)
      for (const path of [configuredModel.slice(1), 'images/gt40-loading.webp', ...audioFiles]) {
        this.emitFile({ type: 'asset', fileName: path, source: readFileSync(`public/${path}`) })
      }
    },
  }],
})
