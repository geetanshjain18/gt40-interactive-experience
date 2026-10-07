import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://localhost:5173',
    launchOptions: {
      args: [
        '--enable-unsafe-webgl',
        '--use-gl=swiftshader',
        '--disable-gpu-vsync',
        '--enable-webgl',
        '--enable-webgl2',
        '--ignore-gpu-blocklist',
        '--disable-web-security',
      ],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30000,
  },
})
