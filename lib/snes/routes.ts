/* Page routes for the SNES section (static asset URLs under /snes/ are separate and unchanged). */
export const SNES_BASE = '/videogames/snes-history';
export const gamePath = (slug: string) => `${SNES_BASE}/${slug}`;
export const companyPath = (slug: string) => `${SNES_BASE}/company/${slug}`;
export const TIME_MACHINE = `${SNES_BASE}/time-machine`;
export const timeMachinePath = (start: string) => `${TIME_MACHINE}?w=${start}`;
