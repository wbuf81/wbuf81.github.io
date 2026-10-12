/* Display faces for the Time Machine only: VT323 for LED dates and tape labels, UnifrakturMaguntia for the masthead. */
import { UnifrakturMaguntia, VT323 } from 'next/font/google';
export const vt323 = VT323({ weight: '400', subsets: ['latin'], display: 'swap', preload: false, variable: '--font-vt323', fallback: ['ui-monospace', 'Menlo', 'monospace'] });
export const fraktur = UnifrakturMaguntia({ weight: '400', subsets: ['latin'], display: 'swap', preload: false, variable: '--font-fraktur', fallback: ['Georgia', 'serif'] });
