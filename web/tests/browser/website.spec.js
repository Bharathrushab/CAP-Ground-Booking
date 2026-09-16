test('WebGL failure retains the static illustration and navigation', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    window.webglAttempts = 0;
    HTMLCanvasElement.prototype.getContext = function (type, ...options) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) { window.webglAttempts++; return null; }
      return original.call(this, type, ...options);
    };
  });
  await page.goto('/');
  await page.waitForFunction(() => window.webglAttempts > 0);
  await expect(page.locator('.static-ball')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore leagues', exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content', exact: true })).toBeFocused();
});
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { bodyText } from '../../src/lib/content.js';

test('desktop home renders a moving, nonblank cricket scene', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cricket Association');
  const canvas = page.locator('.hero canvas');
  await expect(canvas).toBeVisible();
  await page.evaluate(() => new Promise((resolve) => {
    let frames = 0;
    const next = () => ++frames >= 30 ? resolve() : requestAnimationFrame(next);
    requestAnimationFrame(next);
  }));
  const first = await canvas.screenshot();
  const colors = await page.evaluate(async (base64) => {
    const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
    const image = await createImageBitmap(blob);
    const surface = new OffscreenCanvas(image.width, image.height);
    const context = surface.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(Math.floor(image.width * 0.55), 0, Math.floor(image.width * 0.4), image.height).data;
    let redPixels = 0;
    for (let index = 0; index < pixels.length; index += 4) if (pixels[index] > pixels[index + 1] * 1.3 && pixels[index] > 70) redPixels++;
    return redPixels;
  }, first.toString('base64'));
  expect(colors).toBeGreaterThan(1000);
  await page.mouse.move(1200, 260);
  await page.evaluate(() => new Promise((resolve) => {
    let frames = 0;
    const next = () => ++frames >= 30 ? resolve() : requestAnimationFrame(next);
    requestAnimationFrame(next);
  }));
  const second = await canvas.screenshot();
  expect(first.equals(second)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('desktop-home.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('mobile routes fit the viewport and use the static hero', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.static-ball')).toBeVisible();
  await expect(page.locator('.hero canvas')).toHaveCount(0);
  await expect(page.locator('.hero-actions')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: testInfo.outputPath('mobile-home.png'), fullPage: true });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  for (const route of ['/leagues', '/tournaments', '/announcements', '/rules', '/laws', '/laws/36', '/rules/cap-womens-premier-league-2026', '/about', '/admin', '/admin/rules', '/admin/announcements/new']) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow, route).toBeLessThanOrEqual(1);
  }
});

test('Laws search, categories and source links work', async ({ page }, testInfo) => {
  await page.goto('/laws');
  await expect(page.locator('.law-list>a')).toHaveCount(42);
  await page.getByRole('textbox', { name: 'Search Laws' }).fill('lbw');
  await expect(page.locator('.law-list>a')).toHaveCount(1);
  await page.locator('.law-list>a').click();
  await expect(page.getByRole('heading', { name: 'Leg before wicket', exact: true })).toBeVisible();
  await expect(page.locator('.law-summary a[target="_blank"]')).toHaveAttribute('href', /^https:\/\/www\.lords\.org/);
  await page.goto('/laws');
  await page.getByRole('button', { name: '6. Unfair play' }).click();
  await expect(page.locator('.law-list>a')).toHaveCount(2);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('laws-desktop.png'), fullPage: true });
});

test('preview CMS supports create, edit, publish, persistence and delete', async ({ page }, testInfo) => {
  await page.goto('/admin/announcements/new');
  await page.getByLabel('Title', { exact: true }).fill('Captain briefing');
  await page.getByLabel('URL slug', { exact: true }).fill('captain-briefing');
  await page.getByLabel('Summary', { exact: true }).fill('A test announcement for captains.');
  await page.locator('[contenteditable="true"]').fill('Meet at CAP Ground for the briefing.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/announcements\/captain-briefing$/);
  await page.reload();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Captain briefing');
  await page.getByRole('combobox', { name: 'Visibility', exact: true }).selectOption('published');
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.editor-preview')).toContainText('Meet at CAP Ground');
  await page.screenshot({ path: testInfo.outputPath('cms-editor.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Preview saved');
  await page.goto('/announcements/captain-briefing');
  await expect(page.getByRole('heading', { name: 'Captain briefing', exact: true })).toBeVisible();
  await page.goto('/admin/announcements');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Captain briefing', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Captain briefing', exact: true })).toHaveCount(0);
});

test('rules retain tables and print layout, reduced motion skips WebGL', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.hero canvas')).toHaveCount(0);
  await page.goto('/rules/cap-womens-premier-league-2026');
  await expect(page.locator('.prose h2')).not.toHaveCount(0);
  await expect(page.locator('.prose table')).not.toHaveCount(0);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.site-header')).not.toBeVisible();
  await page.pdf({ path: testInfo.outputPath('womens-rules.pdf'), format: 'A4', printBackground: true });
});

test('imported rules survive a rich-editor save and reload', async ({ page }) => {
  const sources = JSON.parse(readFileSync(new URL('../../src/data/imported-rules.json', import.meta.url), 'utf8'));
  const source = sources.find((record) => record.id === 'cap-womens-premier-league-2026');
  await page.goto(`/admin/rules/${source.id}`);
  await expect(page.locator('.editor-content table')).not.toHaveCount(0);
  await page.getByRole('combobox', { name: 'Visibility', exact: true }).selectOption('draft');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Preview saved');
  await page.reload();
  await expect(page.locator('.editor-content table')).not.toHaveCount(0);
  const saved = await page.evaluate((id) => JSON.parse(localStorage.getItem('cap-website-preview-v1')).rules.find((record) => record.id === id), source.id);
  expect(bodyText(saved.body).replace(/\s+/g, '')).toBe(bodyText(source.body).replace(/\s+/g, ''));
});