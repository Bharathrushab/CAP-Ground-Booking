import { test, expect } from '@playwright/test';

const LEAGUES = [
  'CAP Indoor League', 'CAP Spring League', 'CAP Premier League', 'CAP Champions League',
  'CAP Fall League', 'CAP Super 6', "CAP Women's Premier League", "CAP Women's Fall League",
];

for (const width of [390, 1440]) {
  test(`Leagues we run lists all CAP leagues at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about');
    const section = page.getByRole('region', { name: 'Leagues we run' });
    await expect(section).toBeVisible();
    for (const league of LEAGUES) {
      await expect(section.getByText(league, { exact: true })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await section.screenshot({ path: testInfo.outputPath('leagues-we-run.png') });
  });
}
