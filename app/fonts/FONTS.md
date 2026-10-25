# The site's web fonts

`next/font/local` serves these files (`app/layout.tsx`, `app/snes/fonts.ts`). `scripts/fonts/fetch-fonts.py` cuts
them from the fonts in Google's own repo (https://github.com/google/fonts) the way Google Fonts serves them, so the
build never downloads anything. Every face is licensed under the **SIL Open Font License 1.1**
(https://openfontlicense.org), which allows bundling and redistribution with software. Each file keeps its own
copyright and licence records.

| File | Family | Source in google/fonts |
| --- | --- | --- |
| `source-serif-4.woff2` | Source Serif 4, weights 200–900, optical size 14 | `ofl/sourceserif4/SourceSerif4[opsz,wght].ttf` |
| `ibm-plex-sans.woff2` | IBM Plex Sans, weights 100–700, width 100 | `ofl/ibmplexsans/IBMPlexSans[wdth,wght].ttf` |
| `ibm-plex-mono-400.woff2` | IBM Plex Mono Regular | `ofl/ibmplexmono/IBMPlexMono-Regular.ttf` |
| `ibm-plex-mono-500.woff2` | IBM Plex Mono Medium | `ofl/ibmplexmono/IBMPlexMono-Medium.ttf` |
| `playfair-display.woff2` | Playfair Display, weights 400–900 | `ofl/playfairdisplay/PlayfairDisplay[wght].ttf` |
| `outfit.woff2` | Outfit, weights 100–900 | `ofl/outfit/Outfit[wght].ttf` |
| `vt323.woff2` | VT323 | `ofl/vt323/VT323-Regular.ttf` |
| `unifraktur-maguntia.woff2` | UnifrakturMaguntia | `ofl/unifrakturmaguntia/UnifrakturMaguntia-Book.ttf` |
| `press-start-2p.woff2` | Press Start 2P | `ofl/pressstart2p/PressStart2P-Regular.ttf` |
| `orbitron.woff2` | Orbitron, weights 400–900 | `ofl/orbitron/Orbitron[wght].ttf` |
