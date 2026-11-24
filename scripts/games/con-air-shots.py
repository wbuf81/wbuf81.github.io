#!/usr/bin/env python3
"""Copies CON AIR's screenshots, homepage print and link-preview card into the site.

The sources are the game's own 240x160 emulator screenshots, written by its test sweep into the game project's
build folder (a private repo, ~/Vibecoding/conair-gameboy by default). Each is scaled 4x with nearest-neighbour, so
every site pixel is a whole game pixel, and checked to be pixel-exact.

    python3 scripts/games/con-air-shots.py [path/to/conair-gameboy/build]

The trailer is copied separately, unchanged apart from moving its index to the front so it starts playing at once:

    ffmpeg -i conair_hype_60.mp4 -c copy -movflags +faststart public/games/con-air/trailer.mp4

Never copy the ROM (*.gba) or a save file here: the site shows the game, it does not give it out. Needs Pillow.
"""
import pathlib
import sys

from PIL import Image, ImageChops

SITE = pathlib.Path(__file__).resolve().parents[2]
BUILD = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path.home() / 'Vibecoding/conair-gameboy/build'
OUT = SITE / 'public/games/con-air'

SHOTS = {
    'title': 'shots/sweep/release/000_boot_title.png',
    'menu': 'shots/sweep/release/003_endless_selected.png',
    'how-to-play': 'preview/menu/howto_1.png',
    'power-ups': 'preview/menu/howto_2.png',
    'story-1-city': 'shots/sweep/story/000_story_cut_intro_b0_p0.png',
    'story-2-bet': 'shots/sweep/story/001_story_cut_intro_b1_p1.png',
    'story-3-wife': 'shots/sweep/story/002_story_cut_intro_b3_p3.png',
    'story-4-inside': 'shots/sweep/story/003_story_cut_intro_b4_p4.png',
    'story-5-dog': 'shots/sweep/story/004_story_cut_intro_b5_p5.png',
    'story-6-launch': 'shots/sweep/story/005_story_cut_intro_b6_p6.png',
    'zone-1-drive-thru': 'shots/sweep/story/007_story_run_m73.png',
    'zone-2-back-nine': 'shots/sweep/story/010_story_run_m319.png',
    'zone-3-game-day': 'shots/sweep/story/012_story_run_m456.png',
    'zone-4-casino': 'shots/sweep/story/015_story_run_m937.png',
    'zone-5-super-bowl': 'shots/sweep/story/017_story_run_m1339.png',
    'ending': 'shots/sweep/story/019_story_cut_win_b0_p20.png',
    'squad-nick': 'preview/menu/howto_5.png',
    'squad-hamzah': 'preview/menu/howto_6.png',
    'squad-pearce': 'preview/menu/howto_7.png',
    'squad-dettmer': 'preview/menu/howto_8.png',
    'squad-wes': 'preview/menu/howto_9.png',
    'squad-rob': 'preview/menu/howto_10.png',
    'level-select': 'preview/modes/levelsel_medals.png',
    'level-clear': 'preview/modes/level_result_medal.png',
    'versus-pass': 'preview/modes/versus_pass_1.png',
    'versus-ranking': 'preview/modes/versus_ranking_3.png',
    'credits': 'preview/extras/credits_u620.png',
}
SCALE = 4


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for name, rel in SHOTS.items():
        src = Image.open(BUILD / rel).convert('RGB')
        if src.size != (240, 160):
            raise SystemExit(f'{rel}: expected a 240x160 screenshot, got {src.size}')
        big = src.resize((240 * SCALE, 160 * SCALE), Image.NEAREST)
        # A palette PNG is a fraction of the size; keep it only when it reproduces every pixel.
        pal = big.convert('P', palette=Image.ADAPTIVE, colors=256)
        exact = ImageChops.difference(big, pal.convert('RGB')).getbbox() is None
        path = OUT / f'{name}.png'
        (pal if exact else big).save(path, optimize=True)
        total += path.stat().st_size
    print(f'{len(SHOTS)} screenshots, {total // 1024} KB, in {OUT.relative_to(SITE)}')

    title = Image.open(BUILD / SHOTS['title']).convert('RGB')
    # The homepage print is 2:1: the title screen's top 120 rows (the logo over the skyline).
    title.crop((0, 0, 240, 120)).resize((960, 480), Image.NEAREST).save(SITE / 'public/projects/con-air.png', optimize=True)
    # The link-preview card is 1200x630: the title at 5x, cut off under the logo.
    title.resize((1200, 800), Image.NEAREST).crop((0, 0, 1200, 630)).save(SITE / 'public/og-con-air.png', optimize=True)
    print('public/projects/con-air.png and public/og-con-air.png written')


if __name__ == '__main__':
    main()
