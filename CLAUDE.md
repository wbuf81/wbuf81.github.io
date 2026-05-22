# wesleybard.com

## Deploy
Pushes to `main` auto-deploy to GitHub Pages via `.github/workflows/deploy.yml`. Build: `npm run build` (outputs to `./out`).

## Key files
- Homepage copy & projects section: `app/page.tsx` — `REPO_CARDS` array
- Agent mascot images: `public/agents/*.jpg` (800×480px, soft grayscale)

## Content rules
All copy must be external-safe. No internal vendor names (OneTrust, SharePoint), no named regulators or audit firms, no financial specifics. When in doubt, generalize: "company web properties", "brand portfolio", "privacy request data".

## Image processing
Mascot images processed with Pillow: `filter: grayscale(100%) brightness(1.15) contrast(0.78)` in CSS. Source files in `~/Downloads/{name}-header.jpg`.

## Smart quotes
File contains Unicode smart quotes (e.g. `’`). Use Python string replacement when `Edit` tool fails on apostrophes — don't rely on exact quote matching.
