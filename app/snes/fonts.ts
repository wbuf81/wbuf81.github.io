/* Display faces for the Time Machine only: VT323 for LED dates and tape labels, UnifrakturMaguntia for the masthead. */
import { UnifrakturMaguntia, VT323 } from 'next/font/google';
export const vt323 = VT323({ weight: '400', subsets: ['latin'], display: 'swap', preload: false, variable: '--font-vt323', fallback: ['ui-monospace', 'Menlo', 'monospace'] });
export const fraktur = UnifrakturMaguntia({ weight: '400', subsets: ['latin'], display: 'swap', preload: false, variable: '--font-fraktur', fallback: ['Georgia', 'serif'] });
import { Press_Start_2P, Orbitron } from 'next/font/google';
export const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap', preload: false, variable: '--font-pixel', fallback: ['ui-monospace', 'monospace'] });
export const orbitron = Orbitron({ weight: ['700', '900'], subsets: ['latin'], display: 'swap', preload: false, variable: '--font-orbit', fallback: ['system-ui', 'sans-serif'] });
