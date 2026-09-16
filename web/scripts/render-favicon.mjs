import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'msedge' });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5174/about');
  const icon = await page.locator('.brand-logo').evaluate(async (image) => {
    await image.decode();
    const source = document.createElement('canvas');
    source.width = image.naturalWidth;
    source.height = image.naturalHeight;
    const sourceContext = source.getContext('2d');
    sourceContext.drawImage(image, 0, 0);
    const { data } = sourceContext.getImageData(0, 0, source.width, source.height);
    let left = source.width, right = 0, top = source.height, bottom = 0;
    for (let row = 0; row < source.height; row++) {
      for (let column = 0; column < source.width; column++) {
        const offset = (row * source.width + column) * 4;
        if (data[offset + 3] > 200 && Math.min(data[offset], data[offset + 1], data[offset + 2]) < 150) {
          left = Math.min(left, column);
          right = Math.max(right, column);
          top = Math.min(top, row);
          bottom = Math.max(bottom, row);
        }
      }
    }
    if (right <= left || bottom <= top) throw new Error('CAP crest bounds were not found');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    const cropWidth = right - left + 1;
    const cropHeight = bottom - top + 1;
    const scale = 60 / Math.max(cropWidth, cropHeight);
    const width = cropWidth * scale;
    const height = cropHeight * scale;
    context.drawImage(image, left, top, cropWidth, cropHeight, (64 - width) / 2, (64 - height) / 2, width, height);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const directory = new URL('../public/images/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('cap-favicon.png', directory), Buffer.from(icon, 'base64'));
  console.log('Generated 64px CAP favicon from the header crest.');
} finally {
  await browser.close();
}