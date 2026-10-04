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
