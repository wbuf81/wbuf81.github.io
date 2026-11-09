# public/footer

`coastal-family.png` is the footer's boardwalk drawing: 2172 × 536, a 4-bit palette PNG of about 245 KB.
`app/design-system.css` › the footer uses it as a CSS alpha mask, so only its transparency matters; its colour
comes from the `--foot-art` token (the accent in light, a pencil grey in dark).

It is two generated drawings put together on 9 Nov 2026 (Wes picked this as F2 on the mockup canvas):

- **The scene** is the design handoff's `docs/design/coastal-footer-2026-11-09/coastal-family-art.png`
  (2172 × 724, RGBA; generated with an image tool, prompts in that folder), unchanged.
- **The family** comes from Codex's "subtle family" revision, `coastal-family-art-subtle-crisp.png` (same size;
  its README and prompts are in Wes's `Claude/output/coastal-footer-subtle-family-2026-11-09/` folder). The first
  version drew the heads as empty outlines on solid bodies, which read as white faces; the revision draws the four
  of them at about half the size, as faint silhouettes seen from behind. Its image tool redrew the rest of the
  scene too (the sea oats, a crisper horizon), so only the people were taken from it: two boxes covering the old
  and new figures (x 1348–1492 by y 343–478, and x 1603–1720 by y 446–578, in the 724-tall source), with the new
  file read 4px lower (it sits 4px lower), blended into the old scene over 14px at the edges.

Then only what the mask reads was kept:

- the colour dropped (RGB zeroed), the alpha kept;
- alpha under 12 (under 5%: the faint haze around the strokes, invisible at full strength) cleared to 0;
- alpha rounded to 16 even levels (mean change under 2/255; 8 levels lifted the haze into a visible grey wash);
- the 188 empty rows above the tallest sea oats trimmed, so the band holds only the drawing.

The scene has exactly four people, and that is deliberate: Wes's wife in the beach chair on the right, and Wes
with their two boys in the shallow water. They are meant to be found, not seen: keep them small and faint, with
no faces, if the drawing is ever redone.
