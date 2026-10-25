#!/usr/bin/env python3
"""Download the site's web fonts into app/fonts/, where next/font/local serves them from.

The build used to fetch every face from Google Fonts (next/font/google). On 25 Oct 2026 Google answered one of
those requests with a kind of font link Next.js could not read, and the daily deploy failed. The files now live in
the repo, so a build never asks Google for anything. Run this only to add a face, then name the new file in
app/layout.tsx or app/snes/fonts.ts:

    python3 scripts/fonts/fetch-fonts.py

Needs fonttools and brotli (pip3 install fonttools brotli).

Each file is cut from the font in Google's own repo (github.com/google/fonts) the way Google cuts the file it
sends a Mac browser, so the site draws the same letters it did from Google:
- variable faces stay variable, one file for every weight, with any other axis fixed where Google fixes it
  (Source Serif 4's optical size at 14, IBM Plex Sans's width at 100);
- Google's "latin" characters, which is what every page drew from Google, plus Latin Extended-A
  (ā … ž, for "Technōs Japan" on the SNES pages);
- unhinted and keeping their glyph names, as Google sends them.
"""
import io
import urllib.parse
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT = Path(__file__).resolve().parents[2] / 'app' / 'fonts'
REPO = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'

# Google's "latin" set as its stylesheet gives it, the combining accents its latin files carry as well, and
# Latin Extended-A.
LATIN = ('U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, '
         'U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD')
ACCENTS = 'U+0300-0301, U+0303, U+0309, U+0323'
LATIN_EXT_A = 'U+0100-017F'

# File name, the font in Google's repo, and the axes Google fixes before serving it.
FONTS = [
    ('source-serif-4', 'sourceserif4/SourceSerif4[opsz,wght].ttf', {'opsz': 14}),
    ('ibm-plex-sans', 'ibmplexsans/IBMPlexSans[wdth,wght].ttf', {'wdth': 100}),
    ('ibm-plex-mono-400', 'ibmplexmono/IBMPlexMono-Regular.ttf', {}),
    ('ibm-plex-mono-500', 'ibmplexmono/IBMPlexMono-Medium.ttf', {}),
    ('playfair-display', 'playfairdisplay/PlayfairDisplay[wght].ttf', {}),
    ('outfit', 'outfit/Outfit[wght].ttf', {}),
    ('vt323', 'vt323/VT323-Regular.ttf', {}),
    ('unifraktur-maguntia', 'unifrakturmaguntia/UnifrakturMaguntia-Book.ttf', {}),
    ('press-start-2p', 'pressstart2p/PressStart2P-Regular.ttf', {}),
    ('orbitron', 'orbitron/Orbitron[wght].ttf', {}),
]


def codepoints(ranges: str) -> list:
    out = []
    for part in ranges.split(','):
        a, _, b = part.strip()[2:].partition('-')
        out.extend(range(int(a, 16), int(b or a, 16) + 1))
    return out


def main() -> None:
    OUT.mkdir(exist_ok=True)
    chars = codepoints(f'{LATIN}, {ACCENTS}, {LATIN_EXT_A}')
    for name, src, pins in FONTS:
        with urllib.request.urlopen(REPO + urllib.parse.quote(src), timeout=60) as r:
            # Keep each glyph's bounding box as stored: UnifrakturMaguntia's are stale, and recomputing them
            # moves its letters 27 units to the right of where Google draws them.
            font = TTFont(io.BytesIO(r.read()), recalcBBoxes=False)
        opts = subset.Options()
        opts.layout_features = opts.layout_features + ['lnum', 'pnum', 'tnum']  # the features Google keeps
        opts.name_IDs = ['*']  # the copyright and licence records travel with the file
        opts.glyph_names = True  # as Google's do: without them Chrome on a Mac draws the text a shade softer
        opts.hinting = False
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=chars)
        sub.subset(font)
        if pins:  # after the subset: fontTools can't subset a font it has just instanced
            font = instancer.instantiateVariableFont(font, pins)
        font.flavor = 'woff2'
        path = OUT / f'{name}.woff2'
        font.save(path)
        print(f'{path.relative_to(OUT.parents[1])}  {path.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
