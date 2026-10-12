'use client';

// One always-mounted polite live region per page, appended to <body> once. Each toast swaps its text.
let region: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let again: ReturnType<typeof setTimeout> | null = null;
// A screen reader ignores a live region whose text didn't change, so a repeat is cleared and set again this much later.
const REPEAT_GAP = 50;

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
  const span = r.firstElementChild!;
  if (timer) clearTimeout(timer);
  if (again) { clearTimeout(again); again = null; }
  const hide = () => { timer = setTimeout(() => { span.textContent = ''; }, 2400); };
  if (span.textContent === msg) {
    span.textContent = '';
    again = setTimeout(() => { again = null; span.textContent = msg; hide(); }, REPEAT_GAP);
    return;
  }
  span.textContent = msg;
  hide();
}
