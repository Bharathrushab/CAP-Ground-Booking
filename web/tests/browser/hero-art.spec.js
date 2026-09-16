import { test, expect } from '@playwright/test';

for (const width of [320, 768, 1920]) {
  test(`cricket artwork is framed at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.hero-actions')).toHaveCSS('opacity', '1');
    const hero = await page.locator('.hero').boundingBox();
    const field = await page.locator('.cricket-field').boundingBox();
    expect(field.x).toBeGreaterThanOrEqual(0);
    expect(field.x + field.width).toBeLessThanOrEqual(width);
    expect(field.y).toBeGreaterThanOrEqual(hero.y);
    expect(field.y + field.height).toBeLessThanOrEqual(hero.y + hero.height);
    const pitch = await page.locator('.cricket-pitch').boundingBox();
    for (const end of ['top', 'bottom']) {
      const crease = page.locator(`.crease-${end}`);
      await expect(crease.locator('.bowling-crease')).toBeVisible();
      await expect(crease.locator('.wide-guides')).toBeVisible();
      const popping = await crease.locator('.popping-crease').boundingBox();
      expect(popping.x).toBeLessThan(pitch.x);
      expect(popping.x + popping.width).toBeGreaterThan(pitch.x + pitch.width);
    }
    if (width < 768) {
      const ball = page.locator('.static-ball');
      await expect(ball).toBeVisible();
      await expect.poll(() => ball.evaluate((image) => image.complete && image.naturalWidth)).toBe(512);
      const bounds = await ball.boundingBox();
      for (const selector of ['.hero h1', '.hero-actions']) {
        const content = await page.locator(selector).boundingBox();
        const intersects = bounds.x < content.x + content.width && bounds.x + bounds.width > content.x && bounds.y < content.y + content.height && bounds.y + bounds.height > content.y;
        expect(intersects, `${selector} must not overlap the ball`).toBe(false);
      }
    } else {
      await expect(page.locator('.hero canvas')).toBeVisible();
    }
    await page.screenshot({ path: testInfo.outputPath(`hero-${width}.png`), fullPage: true });
  });
}

test('reduced motion uses the rendered leather ball', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.hero canvas')).toHaveCount(0);
  const ball = page.locator('.static-ball');
  await expect.poll(() => ball.evaluate((image) => image.complete && image.naturalWidth)).toBe(512);
  const redPixels = await ball.evaluate((image) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, 512, 512);
    let count = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] > 200 && data[index] > 70 && data[index] > data[index + 1] * 1.3) count++;
    }
    return count;
  });
  expect(redPixels).toBeGreaterThan(10000);
  await page.screenshot({ path: testInfo.outputPath('hero-reduced-motion.png'), fullPage: true });
});