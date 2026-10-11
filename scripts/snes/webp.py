#!/usr/bin/env python3
"""Convert a PNG to WebP (quality given, method 6), keeping alpha.
Usage: webp.py <src.png> <out.webp> <quality> [<w|h> <pixels>]
With <w|h> <pixels>, downscales only if the source is larger on that axis; otherwise keeps native size."""
import sys

try:
    from PIL import Image
    src, out, quality = sys.argv[1], sys.argv[2], int(sys.argv[3])
    im = Image.open(src).convert("RGBA")
    if len(sys.argv) > 5:
        axis, px = sys.argv[4], int(sys.argv[5])
        if axis not in ("w", "h"):
            raise ValueError("axis must be w or h")
        w, h = im.size
        if (w if axis == "w" else h) > px:
            size = (px, max(1, round(h * px / w))) if axis == "w" else (max(1, round(w * px / h)), px)
            im = im.resize(size, Image.LANCZOS)
    im.save(out, "WEBP", quality=quality, method=6)
except Exception as e:
    print(f"webp.py failed on {sys.argv[1:2]}: {e}", file=sys.stderr)
    sys.exit(1)
