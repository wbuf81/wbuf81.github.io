/** @jest-environment jsdom */
import { ensureToastRegion, showToast } from '../app/snes/components/toast';

test('the same message twice is announced twice: cleared, then set again a moment later', () => {
  jest.useFakeTimers();
  try {
    const region = ensureToastRegion()!;
    showToast('Removed from your Top 8');
    expect(region.textContent).toBe('Removed from your Top 8');
    showToast('Removed from your Top 8');
    expect(region.textContent).toBe('');
    jest.advanceTimersByTime(50);
    expect(region.textContent).toBe('Removed from your Top 8');
    showToast('Added to your Top 8 · 1/8');
    expect(region.textContent).toBe('Added to your Top 8 · 1/8');
  } finally {
    jest.useRealTimers();
  }
});
