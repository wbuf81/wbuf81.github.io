# Subtle family revision

This is the latest artwork direction from Wes on November 9, 2026. He disliked the white faces and prominent people in the earlier references.

The four people remain in the same parts of the scene, but they are smaller, fainter silhouettes seen from behind, with no facial features, white face patches, or bright outlines. Keep exactly one wife seated in the chair, and one father with two sons in the water.

## Files

- `coastal-family-light-subtle.png`: revised light reference.
- `coastal-family-dark-subtle.png`: revised dark reference, using a quiet pencil-gray illustration.
- `coastal-family-art-subtle-crisp.png`: new transparent artwork source for the shared CSS mask.
- `IMAGE-PROMPTS.txt` and `ARTWORK-EXTRACTION-PROMPT.txt`: built-in imagegen provenance.

## Apply to the current implementation

The footer has already been implemented in the working tree. Preserve that implementation, its current Geist Serif, and option B/B4's pencil-gray dark theme. Do not restore earlier cyan-on-charcoal or softened-teal alternatives from the old handoff.

Use the new artwork as the input to the existing asset-preparation process documented in `public/footer/SOURCES.md`. Keep the crisp square-dot texture and all four small figures. The family faintness must survive in the alpha channel because the site ignores the image's RGB colors when masking. Avoid quantizing away the faint family marks. Verify the nonempty bounds instead of blindly assuming the old 188-row crop is unchanged.

The current production band is 2172:536, the mask is positioned at the bottom, and the entire composition must stay visible. Keep the current `--foot-art` mappings: accent at 72% in light, pencil gray at 22% in dark. Do not change the whole illustration's contrast to solve only the people.

The PNG mockups show the visual intent; keep real page text and links from the existing component. They are not replacements for the current markup or type system.

Check the resulting mask in both themes, at desktop and phone widths: all four people remain present, no bright facial marks, no enlarged silhouettes, no muddy rectangle, and crisp boardwalk/grass texture.

Only this design revision has been added by Codex; existing application work belongs to the ongoing Claude Code session.

