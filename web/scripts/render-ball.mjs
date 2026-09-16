import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, options) {
      return original.call(this, type, type.startsWith('webgl') ? { ...options, preserveDrawingBuffer: true } : options);
    };
  });
  await page.goto('http://127.0.0.1:5174/');
  await page.locator('.hero canvas').waitFor();
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.hero canvas');
    return canvas && canvas.width > 0 && canvas.height > 0;
  });
  const image = await page.evaluate(async () => {
    await new Promise((resolve) => {
      let frames = 0;
      const next = () => ++frames >= 45 ? resolve() : requestAnimationFrame(next);
      requestAnimationFrame(next);
    });
    const canvas = document.querySelector('.hero canvas');
    const source = new Image();
    source.src = canvas.toDataURL();
    await source.decode();
    const surface = document.createElement('canvas');
    surface.width = source.width;
    surface.height = source.height;
    const context = surface.getContext('2d');
    context.drawImage(source, 0, 0);
    const { data } = context.getImageData(0, 0, surface.width, surface.height);
    let left = surface.width, right = 0, top = surface.height, bottom = 0;
    for (let row = 0; row < surface.height; row++) {
      for (let column = 0; column < surface.width; column++) {
        const offset = (row * surface.width + column) * 4;
        if (data[offset + 3] > 200 && data[offset] > 40 && data[offset] > data[offset + 1] * 1.5) {
          left = Math.min(left, column);
          right = Math.max(right, column);
          top = Math.min(top, row);
          bottom = Math.max(bottom, row);
        }
      }
    }
    if (right - left < 100 || bottom - top < 100) throw new Error('Ball render is blank or incorrectly framed');
    const size = Math.max(right - left, bottom - top) + 20;
    const output = document.createElement('canvas');
    output.width = output.height = 512;
    output.getContext('2d').drawImage(source, (left + right - size) / 2, (top + bottom - size) / 2, size, size, 0, 0, 512, 512);
    return output.toDataURL('image/png').split(',')[1];
  });
  const destination = new URL('../public/images/', import.meta.url);
  await mkdir(destination, { recursive: true });
  await writeFile(new URL('cricket-ball.png', destination), Buffer.from(image, 'base64'));
  console.log('Rendered 512px cricket-ball.png from the live Three.js scene.');
} finally {
  await browser.close();
}