import { test, expect } from '@playwright/test';

test('browser tab uses the CAP crest on direct routes', async ({ page }) => {
  for (const route of ['/', '/leagues', '/admin']) {
    await page.goto(route);
    const icon = page.locator('link[rel="icon"]');
    await expect(icon).toHaveAttribute('type', 'image/png');
    await expect(icon).toHaveAttribute('href', '/images/cap-favicon.png');
    const dimensions = await icon.evaluate(async (link) => {
      const image = new Image();
      image.src = link.href;
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    });
    expect(dimensions).toEqual([64, 64]);
  }
});

for (const width of [320, 768, 1440]) {
  test(`CAP crest loads in shared branding at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about');
    for (const selector of ['.brand-logo', '.footer-logo']) {
      const logo = page.locator(selector);
      await logo.scrollIntoViewIfNeeded();
      await expect(logo).toBeVisible();
      await expect(logo).toHaveAttribute('alt', 'CAP crest');
      await expect.poll(() => logo.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.locator('.brand').scrollIntoViewIfNeeded();
    const brand = await page.locator('.brand').boundingBox();
    const control = await page.locator(width <= 700 ? '.mobile-menu' : '.nav').boundingBox();
    expect(brand.x + brand.width).toBeLessThanOrEqual(control.x);
    await page.screenshot({ path: testInfo.outputPath(`branding-${width}.png`), fullPage: true });
    await page.locator('.brand').click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('.brand-logo')).toBeVisible();
  });
}