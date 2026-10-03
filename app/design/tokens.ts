/*
 * Every colour token in app/design-system.css, with its job, for /design. A token missing here fails
 * __tests__/design-system.test.ts. The light · dark values are read from the stylesheet itself (tokenValues),
 * so the page can never disagree with the CSS.
 */

export type TokenGroup = 'Surfaces' | 'Ink' | 'Accent' | 'Meaning' | 'Prints' | 'Arcade' | 'GitHub map';

export const TOKENS: { name: string; job: string; group: TokenGroup }[] = [
  { name: '--bg', job: 'The page', group: 'Surfaces' },
  { name: '--paper', job: 'Cards, prints, the header and footer', group: 'Surfaces' },
  { name: '--rule', job: 'Borders', group: 'Surfaces' },
  { name: '--rule-soft', job: 'Row lines, chips, quiet fills', group: 'Surfaces' },
  { name: '--ink', job: 'Headings and text', group: 'Ink' },
  { name: '--ink-2', job: 'Secondary text', group: 'Ink' },
  { name: '--ink-3', job: 'Labels and captions', group: 'Ink' },
  { name: '--accent', job: 'Links, buttons, figures', group: 'Accent' },
  { name: '--accent-soft', job: 'Hover and the pressed theme button', group: 'Accent' },
  { name: '--accent-deep', job: 'Button hover', group: 'Accent' },
  { name: '--on-accent', job: 'Text on an accent fill', group: 'Accent' },
  { name: '--core', job: 'Up, on, playing', group: 'Meaning' },
  { name: '--tape', job: 'Tape on a print', group: 'Prints' },
  { name: '--screen', job: "Tetris's screen, dark in both themes", group: 'Arcade' },
  { name: '--screen-ink', job: 'Figures on the screen', group: 'Arcade' },
  { name: '--screen-ink-2', job: 'Labels on the screen', group: 'Arcade' },
  { name: '--h0', job: 'No contributions', group: 'GitHub map' },
  { name: '--h1', job: 'A few', group: 'GitHub map' },
  { name: '--h2', job: 'Some', group: 'GitHub map' },
  { name: '--h3', job: 'Many', group: 'GitHub map' },
  { name: '--h4', job: 'The most', group: 'GitHub map' },
];

function declarations(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) return {};
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries(Array.from(body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g), (m) => [m[1], m[2].trim()]));
}

/** Each token's light and dark value, as written in the stylesheet. */
export function tokenValues(css: string): Record<string, { light: string; dark: string }> {
  const light = declarations(css, ':root {');
  const dark = declarations(css, ':root[data-theme="dark"]:has(.wb-page) {');
  return Object.fromEntries(Object.keys(light).map((k) => [k, { light: light[k], dark: dark[k] ?? light[k] }]));
}
