# The site's web fonts

`next/font/local` serves these files (`app/layout.tsx`, `app/snes/fonts.ts`), so the build never downloads anything.
Every face is licensed under the **SIL Open Font License 1.1** (https://openfontlicense.org), which allows bundling
and redistribution with software. Each file keeps its own copyright and licence records.

`scripts/fonts/fetch-fonts.py` cuts every file but one from the fonts in Google's own repo
(https://github.com/google/fonts) the way Google Fonts serves them:

| File | Family | Source in google/fonts |
| --- | --- | --- |
| `ibm-plex-sans.woff2` | IBM Plex Sans, weights 100–700, width 100 | `ofl/ibmplexsans/IBMPlexSans[wdth,wght].ttf` |
| `ibm-plex-mono-400.woff2` | IBM Plex Mono Regular | `ofl/ibmplexmono/IBMPlexMono-Regular.ttf` |
| `ibm-plex-mono-500.woff2` | IBM Plex Mono Medium | `ofl/ibmplexmono/IBMPlexMono-Medium.ttf` |
| `playfair-display.woff2` | Playfair Display, weights 400–900 | `ofl/playfairdisplay/PlayfairDisplay[wght].ttf` |
| `outfit.woff2` | Outfit, weights 100–900 | `ofl/outfit/Outfit[wght].ttf` |
| `vt323.woff2` | VT323 | `ofl/vt323/VT323-Regular.ttf` |
| `unifraktur-maguntia.woff2` | UnifrakturMaguntia | `ofl/unifrakturmaguntia/UnifrakturMaguntia-Book.ttf` |
| `press-start-2p.woff2` | Press Start 2P | `ofl/pressstart2p/PressStart2P-Regular.ttf` |
| `orbitron.woff2` | Orbitron, weights 400–900 | `ofl/orbitron/Orbitron[wght].ttf` |

The exception is the system's serif, which isn't on Google Fonts yet. It's Vercel's own file, copied unchanged:

| File | Family | Source |
| --- | --- | --- |
| `geist-serif.woff2` | Geist Serif 1.003, Regular (its only weight; no italic) | npm `geist@1.9.2`, `dist/fonts/geist-serif/GeistSerif-Regular.woff2` (https://github.com/vercel/geist-font) |

It replaced Source Serif 4 on 8 Nov 2026. It lacks a few characters Source Serif had (½, ³, ±, the thin spaces);
the browser draws those from the fallback serif. In the site's serif text that touches one SNES title, *Ranma ½*.
