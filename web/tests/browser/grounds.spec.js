import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`Tournament ground links fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about');
    const section = page.getByRole('region', { name: 'Tournament grounds' });
    await expect(section).toBeVisible();
    for (const [name, destination] of [
      ['CAP Ground', 'https://maps.app.goo.gl/CC84sTuJoYLRCMdQ6'],
      ['Mossville Ground', 'https://maps.app.goo.gl/h43GWWLJf64bEfyT9'],
    ]) {
      await expect(section.getByRole('heading', { name, exact: true })).toBeVisible();
      const link = section.getByRole('link', { name: `${name} on Google Maps` });
      await expect(link).toHaveAttribute('href', destination);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await section.screenshot({ path: testInfo.outputPath('grounds.png') });
  });
}