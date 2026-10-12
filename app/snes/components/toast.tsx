'use client';

import { useCallback } from 'react';

// One always-mounted polite live region per page, appended to <body> once. Each toast swaps its text.
let region: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Creates the shared live region if it is missing (so it exists before the first toast is announced). */
export function ensureToastRegion(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (region && document.body.contains(region)) return region;
  region = document.createElement('div');
  region.className = 'wb s-live';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  region.appendChild(document.createElement('span'));
  document.body.appendChild(region);
  return region;
}

export function showToast(msg: string): void {
  const r = ensureToastRegion();
  if (!r) return;
  r.firstElementChild!.textContent = msg;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { r.firstElementChild!.textContent = ''; }, 2400);
}

export function useToast(): { show: (msg: string) => void } {
  return { show: useCallback(showToast, []) };
}
