import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`CricClubs links are available at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    const section = page.getByRole('region', { name: 'CAP on CricClubs' });
    await expect(section).toBeVisible();
    for (const [name, destination] of [
      ['Register with CAP', 'https://cricclubs.com/CricketAssociationofPeoria/register'],
      ['View scores & matches', 'https://cricclubs.com/CricketAssociationofPeoria/'],
    ]) {
      const link = section.getByRole('link', { name });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', destination);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await section.screenshot({ path: testInfo.outputPath('cricclubs.png') });
    await page.goto('/about');
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: 'Register with CAP' })).toHaveAttribute('href', 'https://cricclubs.com/CricketAssociationofPeoria/register');
    await expect(footer.getByRole('link', { name: 'CricClubs scores & matches' })).toHaveAttribute('href', 'https://cricclubs.com/CricketAssociationofPeoria/');
    expect(errors).toEqual([]);
  });
}