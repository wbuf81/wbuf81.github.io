/* Display faces for the Time Machine only: VT323 for LED dates and tape labels, UnifrakturMaguntia for the masthead. */
/* The files are in app/fonts/ (scripts/fonts/fetch-fonts.py); see app/layout.tsx for why they aren't fetched from Google. */
import localFont from 'next/font/local';
export const vt323 = localFont({ src: '../fonts/vt323.woff2', weight: '400', display: 'swap', preload: false, variable: '--font-vt323', fallback: ['ui-monospace', 'Menlo', 'monospace'] });
export const fraktur = localFont({ src: '../fonts/unifraktur-maguntia.woff2', weight: '400', display: 'swap', preload: false, variable: '--font-fraktur', fallback: ['Georgia', 'serif'] });
export const pressStart = localFont({ src: '../fonts/press-start-2p.woff2', weight: '400', display: 'swap', preload: false, variable: '--font-pixel', fallback: ['ui-monospace', 'monospace'] });
export const orbitron = localFont({ src: '../fonts/orbitron.woff2', weight: '700 900', display: 'swap', preload: false, variable: '--font-orbit', fallback: ['system-ui', 'sans-serif'] });
