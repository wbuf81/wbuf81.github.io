/*
 * Every colour token in app/design-system.css, with its job, for /design. A token missing here fails
 * __tests__/design-system.test.ts. The light · dark values are read from the stylesheet itself (tokenValues),
 * so the page can never disagree with the CSS.
 */

export type TokenGroup = 'Surfaces' | 'Ink' | 'Accent' | 'Meaning' | 'Prints' | 'Arcade' | 'GitHub map' | 'Charts' | 'SNES';

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
  { name: '--over', job: 'The worse direction: over a target, a gain on a cut', group: 'Meaning' },
  { name: '--tape', job: 'Tape on a print', group: 'Prints' },
  { name: '--screen', job: "Tetris's screen, dark in both themes", group: 'Arcade' },
  { name: '--screen-ink', job: 'Figures on the screen', group: 'Arcade' },
  { name: '--screen-ink-2', job: 'Labels on the screen', group: 'Arcade' },
  { name: '--screen-2', job: 'Game tiles on /snes: a card in the screen colour', group: 'Arcade' },
  { name: '--screen-rule', job: 'Borders and chips on screen-coloured tiles', group: 'Arcade' },
  { name: '--h0', job: 'No contributions', group: 'GitHub map' },
  { name: '--h1', job: 'A few', group: 'GitHub map' },
  { name: '--h2', job: 'Some', group: 'GitHub map' },
  { name: '--h3', job: 'Many', group: 'GitHub map' },
  { name: '--h4', job: 'The most', group: 'GitHub map' },
  { name: '--mark', job: 'Raw readings behind a trend line', group: 'Charts' },
  { name: '--series-1', job: 'First series: protein, lifts, calories at or under target', group: 'Charts' },
  { name: '--series-2', job: 'Second series: carbs, cardio, calories over target, a big day', group: 'Charts' },
  { name: '--series-3', job: 'Third series: fat', group: 'Charts' },
  { name: '--snes', job: 'The SNES purple: active filters, EGM bars, Day One', group: 'SNES' },
  { name: '--snes-glow', job: 'Hover and focus glow on games', group: 'SNES' },
  { name: '--snes-soft', job: 'Fills behind SNES-purple text', group: 'SNES' },
  { name: '--snes-h1', job: 'Release heatmap: a few games', group: 'SNES' },
  { name: '--snes-h2', job: 'Release heatmap: some', group: 'SNES' },
  { name: '--snes-h3', job: 'Release heatmap: many', group: 'SNES' },
  { name: '--snes-h4', job: 'Release heatmap: the busiest months', group: 'SNES' },
  { name: '--booklet', job: 'The instruction-booklet paper on game pages', group: 'SNES' },
  { name: '--shelf', job: 'Back of the game shelf', group: 'SNES' },
  { name: '--plank', job: 'Shelf planks under the spines', group: 'SNES' },
  { name: '--snes-hof', job: 'Score scatter: the Hall of Fame band, 9 and up', group: 'SNES' },
  { name: '--snes-bin', job: 'Score scatter: the Bargain Bin band, under 5', group: 'SNES' },
  { name: '--snes-f-action', job: 'Score scatter dots: action and platform games', group: 'SNES' },
  { name: '--snes-f-fighting', job: 'Score scatter dots: fighting games', group: 'SNES' },
  { name: '--snes-f-shooter', job: 'Score scatter dots: shooters', group: 'SNES' },
  { name: '--snes-f-rpg', job: 'Score scatter dots: RPGs and adventures', group: 'SNES' },
  { name: '--snes-f-sports', job: 'Score scatter dots: sports and racing', group: 'SNES' },
  { name: '--snes-f-puzzle', job: 'Score scatter dots: puzzle, strategy and sims', group: 'SNES' },
  { name: '--snes-f-other', job: 'Score scatter dots: everything else', group: 'SNES' },
  { name: '--tm-led', job: 'Time Machine: the amber LED date readout', group: 'SNES' },
  { name: '--tm-paper', job: 'Time Machine: the newspaper clipping paper, light edge', group: 'SNES' },
  { name: '--tm-paper-2', job: 'Time Machine: the newspaper clipping paper, shaded edge', group: 'SNES' },
  { name: '--tm-paper-ink', job: 'Time Machine: ink on the newspaper clipping', group: 'SNES' },
  { name: '--tm-kicker', job: 'Time Machine: the red dateline above the lead story', group: 'SNES' },
  { name: '--tm-cass', job: 'Time Machine: cassette shell for the song tape', group: 'SNES' },
  { name: '--tm-ticket', job: 'Time Machine: movie ticket stub paper', group: 'SNES' },
  { name: '--tm-ticket-ink', job: 'Time Machine: ink on the movie ticket stub', group: 'SNES' },
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
