import { cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// Copies the booking app's production build (repo root `build/`, built with homepage=/practice-booking)
// into this site's dist/practice-booking so it is served under the same domain.
const source = new URL('../../build/', import.meta.url);
const destination = new URL('../dist/practice-booking/', import.meta.url);
if (!existsSync(source)) throw new Error('Build the practice booking app first: run "npm run build" in the repo root.');
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });
console.log('Copied practice booking build into web/dist/practice-booking');
