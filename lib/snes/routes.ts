/* Page routes for the SNES section (static asset URLs under /snes/ are separate and unchanged). */
export const SNES_BASE = '/videogames/snes-history';
export const gamePath = (slug: string) => `${SNES_BASE}/${slug}`;
export const companyPath = (slug: string) => `${SNES_BASE}/company/${slug}`;
export const TIME_MACHINE = `${SNES_BASE}/time-machine`;
export const timeMachinePath = (start: string) => `${TIME_MACHINE}?w=${start}`;
/** A Wikipedia article URL: spaces become underscores and the rest is percent-encoded, so '?', '#', '+', '&', '%' and '/' stay part of the title (parentheses and apostrophes are left readable). */
export const wikiUrl = (article: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(article.replace(/ /g, '_'))}`;
export const TOP8 = `${SNES_BASE}/top-8`;
