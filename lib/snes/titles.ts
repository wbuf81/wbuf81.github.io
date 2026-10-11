/*
 * Title helpers shared by every source. normalizeTitle is the matching key between Wikipedia, IGDB and
 * libretro, which spell the same game differently ("7th Saga, The (USA)" vs "The 7th Saga"); slugify makes
 * the permanent URL slug. Loaded by plain Node scripts too: keep imports type-only and extension-explicit.
 */

const ROMAN: Record<string, string> = { ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8' };

export function stripDiacritics(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

export function normalizeTitle(title: string): string {
  let s = stripDiacritics(title).toLowerCase();
  s = s.replace(/\s*\([^)]*\)/g, ' ');
  s = s.replace(/^([^,]+),\s*(the|a|an)\b/, '$2 $1');
  s = s.replace(/&/g, ' and ');
  s = s.replace(/['’`]/g, '');
  s = s.replace(/[^a-z0-9]+/g, ' ').trim();
  s = s.replace(/^the\s+/, '');
  return s
    .split(' ')
    .map((w) => ROMAN[w] ?? w)
    .join(' ');
}

export function slugify(title: string): string {
  return stripDiacritics(title)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
