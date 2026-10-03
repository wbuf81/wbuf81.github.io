import { viewport } from '@/app/layout';

// Visitors must be able to pinch-zoom (WCAG 1.4.4): no maximum scale, no user-scalable lock.
test('the page can be zoomed on a phone', () => {
  expect(viewport).not.toHaveProperty('userScalable', false);
  expect(viewport.maximumScale ?? 5).toBeGreaterThanOrEqual(5);
});
