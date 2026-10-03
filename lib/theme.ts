export type ThemeMode = 'light' | 'auto' | 'dark';
export const THEME_KEY = 'wb-theme';

export function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function applyMode(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  try {
    if (mode === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
}

// Runs in <head> before first paint, so a saved theme never flashes.
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
