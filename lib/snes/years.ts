/* "Your SNES years": a visitor's age and school grade at moments in the SNES era, from a birth year. */
export const LAUNCH = '1991-08-23';
export const LAST_GAME = '1998-10-06';
export const WES_BIRTH_YEAR = 1981;
export const WES_LINE = 'Wes saved up $200 and bought one at ShopKo in Omaha, Nebraska, with F-Zero as a launch title.';
export const MILESTONES: { slug: string; text: string }[] = [
  { slug: 'super-mario-world', text: 'the SNES launched with Super Mario World' },
  { slug: 'the-legend-of-zelda-a-link-to-the-past', text: 'A Link to the Past came out' },
  { slug: 'street-fighter-ii-the-world-warrior', text: 'Street Fighter II hit' },
  { slug: 'star-fox', text: 'Star Fox flew in with the Super FX chip' },
  { slug: 'mortal-kombat', text: 'Mortal Kombat arrived (with sweat instead of blood)' },
  { slug: 'super-metroid', text: 'Super Metroid came out' },
  { slug: 'donkey-kong-country', text: 'Donkey Kong Country came out' },
  { slug: 'chrono-trigger', text: 'Chrono Trigger came out' },
  { slug: 'super-mario-rpg-legend-of-the-seven-stars', text: 'Super Mario RPG came out' },
  { slug: 'frogger', text: 'the last US SNES game (Frogger!) shipped' },
];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const parts = (iso: string) => iso.split('-').map(Number);
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

/** Age on a date, assuming a mid-year (1 July) birthday. */
export function ageAt(birthYear: number, iso: string): number {
  const [y, m] = parts(iso);
  return y - birthYear - ((m || 7) < 7 ? 1 : 0);
}
/** US school grade (0 = kindergarten): the school year starts in September; a child is in K the year they turn 5. */
export function schoolGrade(birthYear: number, iso: string): number {
  const [y, m] = parts(iso);
  const schoolYear = (m || 1) >= 9 ? y : y - 1;
  return schoolYear - birthYear - 5;
}
export function gradeName(n: number): string {
  if (n < 0) return 'not in school yet';
  if (n === 0) return 'in kindergarten';
  if (n <= 12) return `in ${ordinal(n)} grade`;
  if (n <= 16) return 'in college';
  return 'out of school';
}
/** Who you were at a milestone. In summer the school year is about to start, so it reads "about to start Nth grade", as the story does. */
export function milestoneWho(birthYear: number, iso: string): string {
  const age = ageAt(birthYear, iso);
  if (age < 0) return 'before you were born';
  const [y, m] = parts(iso);
  if (m >= 6 && m <= 8) {
    const next = schoolGrade(birthYear, `${y}-09-15`);
    if (next >= 1 && next <= 12) return `you were ${age}, about to start ${ordinal(next)} grade`;
  }
  return `you were ${age}, ${gradeName(schoolGrade(birthYear, iso))}`;
}
export function story(birthYear: number): { lead: string; wes: string | null; close: string } {
  const a = ageAt(birthYear, LAUNCH);
  const nextGrade = schoolGrade(birthYear, '1991-09-15');
  const [ly, lm] = parts(LAST_GAME);
  const last = ageAt(birthYear, LAST_GAME);
  const lastWhen = `${MONTHS[lm - 1]} ${ly}`;
  const close = last < 0 ? `You weren't born yet when the last US SNES game shipped in ${lastWhen}.`
    : last === 0 ? `You were born the year the last US SNES game shipped, in ${lastWhen}.`
    : `You were ${last} when the last US SNES game shipped in ${lastWhen}.`;
  if (a < 0) return { lead: `You weren't born yet when the SNES launched in August 1991; you arrived in ${birthYear}, in the middle of the 16-bit years.`, wes: null, close };
  if (a === 0) return { lead: 'You were born the year the Super Nintendo launched.', wes: null, close };
  const school = nextGrade >= 1 && nextGrade <= 12 ? `, about to start ${ordinal(nextGrade)} grade` : '';
  return { lead: `You were ${a} when the Super Nintendo launched on August 23, 1991${school}.`, wes: birthYear === WES_BIRTH_YEAR ? WES_LINE : null, close };
}
