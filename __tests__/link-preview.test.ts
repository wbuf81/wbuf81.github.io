import { metadata } from '@/app/layout';

// The card LinkedIn and messaging apps show for wesleybard.com reads the site description, so it speaks in
// the homepage intro's voice (Wes, 4 Oct 2026) and says the same thing everywhere it is declared.
const DESCRIPTION =
  "I work in compliance, and before that I spent 12 years as an engineer. These days I'm all in on building with AI agents.";

test('the link preview describes Wes in the intro’s words, the same in every card', () => {
  expect(metadata.description).toBe(DESCRIPTION);
  expect(metadata.openGraph?.description).toBe(DESCRIPTION);
  expect(metadata.twitter?.description).toBe(DESCRIPTION);
});

// LinkedIn keeps an image by its address, so a redrawn card needs a new one: bump ?v= whenever
// public/og-image.png changes. Both cards point at the same version.
test('the homepage card image carries a version, the same in every card', () => {
  const og = (metadata.openGraph?.images as { url: string }[])[0].url;
  expect(og).toMatch(/^\/og-image\.png\?v=\d+$/);
  expect(metadata.twitter?.images).toEqual([og]);
});
