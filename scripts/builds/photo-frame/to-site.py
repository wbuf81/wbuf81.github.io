#!/usr/bin/env python3
"""Turns the demo screenshots into the pictures the site serves for /builds/photo-frame.

    python3 scripts/builds/photo-frame/to-site.py <shots dir> <boot still .png> <jeffrey-walk-big.png>

<shots dir> is the output of shoot.cjs (1280x800 PNGs). The boot still and the sprite sheet come from
the private frame project (its boot-screens/exports folder and dashboard/public/sprites). Run from the
repo's root. Needs Pillow. Writes:

  public/builds/photo-frame/*.jpg     the six screens the page shows, and boot.jpg (all 1280x800)
  public/builds/photo-frame/jeffrey-walk.png   the 16-frame walk sheet, copied as it is
  public/projects/photo-frame.jpg     the homepage tile: the top 1280x640 of the night home screen, at 1200x600
  public/og-photo-frame.jpg           the link-preview card: the top 1200x630 of the same screen
"""
import os
import shutil
import sys

from PIL import Image

SCREENS = ['home-tokyo-night', 'home-daylight', 'home-paper', 'week-daylight', 'forecast-tokyo-night', 'settings-tokyo-night']


def main() -> None:
    shots, boot, sprite = sys.argv[1:4]
    out = 'public/builds/photo-frame'
    os.makedirs(out, exist_ok=True)
    for name in SCREENS:
        im = Image.open(os.path.join(shots, name + '.png')).convert('RGB')
        assert im.size == (1280, 800), (name, im.size)
        im.save(os.path.join(out, name + '.jpg'), 'JPEG', quality=88, optimize=True, progressive=True)
    still = Image.open(boot).convert('RGB')
    assert still.size == (1280, 800), still.size
    still.save(os.path.join(out, 'boot.jpg'), 'JPEG', quality=88, optimize=True, progressive=True)
    shutil.copyfile(sprite, os.path.join(out, 'jeffrey-walk.png'))

    home = Image.open(os.path.join(shots, 'home-tokyo-night.png')).convert('RGB')
    home.crop((0, 0, 1280, 640)).resize((1200, 600), Image.LANCZOS).save('public/projects/photo-frame.jpg', 'JPEG', quality=86, optimize=True, progressive=True)
    home.resize((1200, 750), Image.LANCZOS).crop((0, 0, 1200, 630)).save('public/og-photo-frame.jpg', 'JPEG', quality=84, optimize=True, progressive=True)


if __name__ == '__main__':
    main()
