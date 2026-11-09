# Coastal family footer — Claude Code handoff

Prepared November 9, 2026 for this repository.

## Selected direction

Wes chose the curved boardwalk composition, entering from the lower left, with dunes, sea oats, and an open ocean. Fine ASCII-like squares, crosses, and ordered dithering give it a printed pixel texture. Keep the scene and its family placement consistent across light and dark mode.

Exactly four people are intentional: his wife seated in a beach chair on the right facing the sea, and Wes with his two sons together in the shallow water farther away. They should be faint details within the scene. Keep them small and avoid bright outlines or prominently featured silhouettes.

The first charcoal/cyan dark version felt ominous to Wes. The latest dark mockup softens the surface to dark teal and reduces only the illustration's contrast. Keep text readable. The original saturated-teal mockup remains a composition reference, not the final default theme.

## Files

- `coastal-family-light.png`: full light-theme composition reference.
- `coastal-family-dark.png`: full softened dark-theme composition reference; supersedes the earlier stark charcoal version.
- `coastal-family-art.png`: artwork-only transparent PNG, 2172 × 724, suitable for an alpha mask. No rasterized text. Use the same asset in both themes.
- `selected-teal-composition.png`: the composition Wes explicitly selected, before the light/dark palette refinements.
- `IMAGE-PROMPTS.txt`, `IMAGE-PROMPTS-REFINEMENT.txt`, and `ARTWORK-PROMPT.txt`: built-in image-generation provenance. These record the exploratory generation instructions, not additional product requirements.
- `CLAUDE-PROMPT.txt`: a short ready-to-paste implementation request.

The full-footer PNGs are design references, not a substitute for actual footer markup. Generate real selectable text and working links above the decorative artwork. The generated assets may vary slightly from the reference; preserve the chosen family count and scene when making implementation adjustments.

## Current repository facts

Refreshed after Wes updated the repository; reviewed against commit `346e669` (Homepage: a highlights row of three in place of the featured build). Working tree was clean before adding this handoff.

- Read current `CLAUDE.md` before implementation.
- Existing footer: `app/components/Footer.tsx`.
- Styles and light/dark tokens: `app/design-system.css`.
- Token documentation: `app/design/tokens.ts` and `app/design/page.tsx`.
- Theme handling: `lib/theme.ts` and `app/components/ThemeSwitch.tsx`.
- Current serif is **Geist Serif**, loaded locally by `app/layout.tsx` as `--font-serif`. It supersedes Source Serif 4 mentioned in the early image prompts. Use the existing `var(--serif)`, `var(--sans)`, and `var(--mono)` aliases. Do not add remote fonts or recreate font loading.
- The updated page has a graph-paper background. Keep the footer a solid surface so the page grid ends cleanly above it.
- Keep the existing highlights row and other current homepage work intact.

## Theme implementation

Use the current design-system variables rather than copying approximate RGB colors out of generated pixels.

Light: `--paper` surface, `--ink` title, `--ink-2` supporting text, `--accent` links/artwork.

Dark: use `--accent-soft` for a calm dark-teal footer surface. Keep `--ink`, `--ink-2` and `--accent` for readable text. Tint the artwork with `--accent` at approximately 0.5–0.6 opacity, adjusting by eye against the softened mockup. Opacity applies only to the decorative art layer, never the whole footer.

Use the supplied transparent art as a CSS alpha mask with `background-color: var(--accent)`, `mask-mode: alpha`, and both standard and WebKit mask declarations as appropriate. That makes the scene genuinely theme-aware without two independently cropped files or CSS color filters. Preserve its 3:1 aspect ratio initially; optimize its mobile framing only after checking the family and boardwalk remain visible. If an alpha-mask rendering reveals undesirable residual marks, compare with the full light mockup and correct the art handling before shipping; do not accept a solid tinted rectangle.

Scope styles under `.wb` and the footer, following the repo's existing tests. Honor both OS preference and the saved desktop theme choice. Phones follow the OS setting according to `lib/theme.ts`; don't add a second theme preference. Preserve the existing light-only behavior on /lee. If new tokens are necessary, add both dark mappings and document them on /design per CLAUDE.md.

## Layout and copy

At desktop sizes, keep the name and short contact sentence on the left, two compact navigation groups on the right, then a small copyright/back-to-top row in clear space above the full-width illustration. The boardwalk enters from lower left; wife and chair remain on right; father and two sons stay together in the water.

Use the existing content width and horizontal spacing, generous vertical breathing room, and a responsive serif name. At 390px, stack the content naturally, keep tap targets comfortable and avoid horizontal scrolling. Do not force the entire footer to a screenshot's 2:1 ratio. Reserve an independent art region so text cannot collide with the drawing. Keep all four people in view when cropping. Start with no animation or parallax.

Copy: Wesley Bard; Feel free to reach out.; Explore; Connect; Projects; Games; Design system; GitHub; LinkedIn; Back to top; copyright with the build-time year.

Links verified from current components:
- Projects: /#projects
- Games: /videogames (reuse the repository's route constants where applicable)
- Design system: /design
- GitHub: https://github.com/wbuf81
- LinkedIn: https://www.linkedin.com/in/wesleybard/

Use a real page-top target for Back to top, working from every page that uses this footer. Treat the illustration as decorative with `aria-hidden="true"` and `pointer-events: none`; preserve semantic footer/nav and visible keyboard focus. Do not add visible explanatory text about family identities.

## Validation and delivery

Move only production artwork to an appropriate `public/` asset directory when implementing. Keep design references here. Confirm transparency, aspect ratio, file weight and legibility at the actual rendered size. Render on a 390px phone and a wide desktop in both themes, including system preference and explicit desktop overrides. Check links, keyboard focus, no overflow, family count/placement, and the graph-paper-to-solid-footer transition.

Run appropriate existing component/design-system checks and the repository's normal build/test scripts. No tests or production code were changed by this handoff. The latest mockups are raster visual references; they are not a browser-verified implementation.

The repository auto-deploys on pushes to main. This handoff prepares the implementation; it does not itself publish the design.

