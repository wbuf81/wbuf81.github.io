import fs from 'fs';
import path from 'path';
import { webpSize } from '@/lib/snes/webpSize';

test('reads the real logo dimensions from the WebP header', () => {
  const file = path.join(process.cwd(), 'public/snes/logo/f-zero.webp');
  const [w, h] = webpSize(fs.readFileSync(file))!;
  expect(w).toBeGreaterThan(100);
  expect(h).toBeGreaterThan(40);
});
test('every committed logo has readable dimensions', () => {
  const dir = path.join(process.cwd(), 'public/snes/logo');
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.webp'))) expect(webpSize(fs.readFileSync(path.join(dir, f)))).not.toBeNull();
});
test('returns null for something that is not a WebP', () => {
  expect(webpSize(Buffer.from('not an image at all, sorry'))).toBeNull();
});
