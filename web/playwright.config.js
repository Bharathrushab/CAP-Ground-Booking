import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5174', channel: 'msedge', headless: true, screenshot: 'only-on-failure' },
  reporter: 'list',
});