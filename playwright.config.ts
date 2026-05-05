import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './scripts',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3117',
    launchOptions: {
      // MapLibre/WebGL + headless on macOS can occasionally hang on screenshots without a software renderer.
      args: ['--disable-gpu', '--use-angle=swiftshader'],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3117',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'steamdeck',
      use: { viewport: { width: 1280, height: 800 } },
    },
  ],
});

