import fs from 'fs';
import { render, screen, within, fireEvent } from '@testing-library/react';
import DesignPage from '@/app/design/page';
import { TOKENS } from '@/app/design/tokens';

jest.mock('next/navigation', () => ({ usePathname: () => '/design' }));

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(
    () => new Proxy({}, { get: (t: Record<string, unknown>, k: string) => (k in t ? t[k] : jest.fn()) }),
  ) as never;
});

test('the design page shows every token, the type, the blocks and the rules', () => {
  const { container } = render(<DesignPage />);
  expect(screen.getByRole('heading', { level: 1, name: 'How wesleybard.com is built.' })).toBeInTheDocument();
  for (const name of ['Colour', 'Type', 'The header', 'Building blocks', 'Write-up pages', 'Writing', 'Using it on a page']) {
    expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
  }
  const swatches = Array.from(container.querySelectorAll('.sw code'), (c) => c.textContent);
  expect(swatches.sort()).toEqual(TOKENS.map((t) => t.name).sort());
  expect(screen.getByText('#0f4c5c · #7ec4d4')).toBeInTheDocument();
  expect(screen.getAllByRole('group', { name: 'Colour theme' }).length).toBeGreaterThanOrEqual(1);
  // Tetris's own Play, and the trailer print's
  expect(within(container.querySelector('.arcade') as HTMLElement).getByRole('button', { name: /Play/ })).toBeInTheDocument();
});

test('the SNES kit shows every SNES piece, after the building blocks and write-ups and before the writing rules', () => {
  const { container } = render(<DesignPage />);
  const section = container.querySelector('section#ds-snes') as HTMLElement;
  expect(section).not.toBeNull();
  expect(within(section).getByRole('heading', { level: 2, name: 'The SNES kit' })).toBeInTheDocument();
  const order = Array.from(container.querySelectorAll('.ds > section'), (s) => s.getAttribute('aria-labelledby'));
  expect(order.slice(order.indexOf('ds-blocks'), order.indexOf('ds-blocks') + 4)).toEqual(['ds-blocks', 'ds-writeups', 'ds-snes-h', 'ds-writing']);
  const pieces = [
    'The SNES menu', 'Game tiles', 'Covers and the no-art placeholder', 'The ★ Top 8 button', 'The toast', 'The Top 8 tray',
    'Filter chips and toggles', 'Heatmap cells', 'Instruction booklet bits', 'The Omaha World-Pixel', 'Be Kind, Rewind',
    'Time Machine cards', 'MySpace boxes', 'The hub and On this day', 'The credit line',
  ];
  for (const name of pieces) expect(within(section).getByRole('heading', { level: 3, name })).toBeInTheDocument();
  expect(within(section).getByRole('navigation', { name: 'SNES' })).toBeInTheDocument();
  // Live pieces: real tiles and the credit; the paper keeps the outline (h4 under the piece's h3), never the real name.
  expect(within(section).getAllByText('The Omaha World-Pixel').length).toBeGreaterThanOrEqual(2);
  expect(section.textContent).not.toMatch(/World-Herald/);
  expect(section.querySelectorAll('.s-tile').length).toBe(3);
  expect(section.querySelector('.s-credit')).not.toBeNull();
  expect(Array.from(section.querySelectorAll('.s-t8-chip'), (c) => c.textContent)).toEqual([
    'MySpace Classic', 'Glitter', 'Console', 'Grand Prix', 'Crystal Menu', 'Polygon Space',
  ]);
});

test('the design page keeps its outline (one h1, no skipped levels) and every SNES kit image has alt, width and height', () => {
  const { container } = render(<DesignPage />);
  const levels = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'), (h) => Number(h.tagName[1]));
  expect(levels.filter((l) => l === 1)).toHaveLength(1);
  for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  for (const img of Array.from(container.querySelectorAll('#ds-snes img'))) {
    expect(img.hasAttribute('alt')).toBe(true);
    expect(img.getAttribute('width')).toBeTruthy();
    expect(img.getAttribute('height')).toBeTruthy();
  }
});

test('the header section shows the project filter: heading and chips, held still and inert, All pressed', () => {
  const { container } = render(<DesignPage />);
  const header = container.querySelector('section[aria-labelledby="ds-header"]') as HTMLElement;
  expect(within(header).getByRole('heading', { level: 3, name: 'The band' })).toBeInTheDocument();
  expect(within(header).getByRole('heading', { level: 3, name: 'The project filter' })).toBeInTheDocument();
  expect(header).toHaveTextContent(/Connect, which lands on the footer/);
  expect(header).toHaveTextContent(/On the homepage the header stays on screen/);
  expect(header).toHaveTextContent(/The homepage.s list has no band/);
  expect(header).toHaveTextContent(/a slim bar fixed just under it/);
  expect(header).toHaveTextContent(/the page never moves when it comes or goes/);
  expect(header.textContent).not.toMatch(/On the homepage the band/);
  const sample = header.querySelector('.pf-rest') as HTMLElement;
  expect(within(sample).getByRole('heading', { level: 4, name: 'Explore projects' })).toHaveClass('pf-h');
  const chips = within(sample).getByRole('group', { name: 'Explore projects' });
  expect(within(chips).queryAllByRole('link')).toHaveLength(0);
  const buttons = within(chips).getAllByRole('button');
  expect(buttons.map((b) => b.querySelector('.pf-l')!.textContent)).toEqual(['All', 'Work', 'Gaming', 'Mac apps', 'Linux', 'Electronics', 'Web']);
  expect(buttons.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.querySelector('.pf-l')!.textContent)).toEqual(['All']);
  // Inert: a press changes nothing here, and there is no slim bar on this page.
  fireEvent.click(buttons[1]);
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
  expect(container.querySelector('.pf-bar')).toBeNull();
  expect(container.querySelector('.pf-band')).toBeNull();
});

test('the sample tiles carry their category over the name', () => {
  const { container } = render(<DesignPage />);
  const labels = Array.from(container.querySelectorAll('.tile .tile-cat'), (b) => b.textContent);
  expect(labels).toEqual(['Work', 'Electronics', 'Gaming']);
});

test('the trailer print is shown live: a video that never autoplays and shows no controls, and the print is no link', () => {
  const { container } = render(<DesignPage />);
  expect(screen.getByRole('heading', { level: 3, name: 'The trailer print' })).toBeInTheDocument();
  const video = container.querySelector('.print.trl video') as HTMLVideoElement;
  expect(video).not.toBeNull();
  expect(video.hasAttribute('autoplay')).toBe(false);
  expect(video.hasAttribute('controls')).toBe(false);
  expect(video.getAttribute('src')).toBe('/games/con-air/trailer.mp4');
  expect(video.closest('a')).toBeNull();
  expect(within(container.querySelector('.print.trl') as HTMLElement).getByRole('button', { name: 'Turn sound on' })).toBeInTheDocument();
});

test('the write-up pages part shows its own blocks live and links both real pages', () => {
  const { container } = render(<DesignPage />);
  const section = container.querySelector('section[aria-labelledby="ds-writeups"]') as HTMLElement;
  expect(within(section).getByRole('heading', { level: 2, name: 'Write-up pages' })).toBeInTheDocument();
  for (const name of [
    'The recipe', 'The hero', 'The facts strip', 'Screenshots', 'The definition list', 'The warning card',
    'The numbered steps', 'The flowchart', 'The roster', 'The animated sprite', 'The closing card',
  ]) {
    expect(within(section).getByRole('heading', { level: 3, name })).toBeInTheDocument();
  }
  expect(section.querySelectorAll('dl.gm-dl > div')).toHaveLength(2);
  expect(section.querySelectorAll('.card.bd-warn li')).toHaveLength(2);
  const steps = section.querySelectorAll('ol.bd-steps > li');
  expect(steps.length).toBeGreaterThanOrEqual(2);
  expect(section.querySelectorAll('ol.bd-steps .bd-links a').length).toBeGreaterThanOrEqual(1);
  const hrefs = Array.from(section.querySelectorAll('a'), (a) => a.getAttribute('href'));
  expect(hrefs).toContain('/games/con-air');
  expect(hrefs).toContain('/builds/photo-frame');
  expect(hrefs).toContain('/work');
  // the facts strip and the screenshots sit in their own .wb.gm wrappers, so the write-ups' page-wide rules reach them
  expect(section.querySelectorAll('.wb.gm.ds-gm .stats > div')).toHaveLength(4);
  const shots = Array.from(section.querySelectorAll('.ds-shots img.ph'));
  expect(shots.map((i) => [i.getAttribute('width'), i.getAttribute('height')])).toEqual([['960', '640'], ['1280', '800']]);
  expect(shots[0].closest('a')).toBeNull();
  expect(shots[1].closest('a')).toHaveAttribute('href', shots[1].getAttribute('src'));
  for (const img of shots) expect(fs.existsSync(`public${img.getAttribute('src')}`)).toBe(true);
  // the outside link opens in a new tab, never the opener
  for (const a of Array.from(section.querySelectorAll('a[href^="http"]'))) {
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toMatch(/noopener/);
  }
});

test('the write-up recipe names the files, the stylesheets and classes, the metadata, the test and the tile link', () => {
  const { container } = render(<DesignPage />);
  const recipe = container.querySelector('section[aria-labelledby="ds-writeups"] ol.ds-recipe') as HTMLElement;
  expect(recipe).not.toBeNull();
  const text = recipe.textContent ?? '';
  for (const bit of [
    'app/games/<slug>/page.tsx', 'app/builds/<slug>/page.tsx', 'app/games/games.css', 'app/builds/builds.css',
    'wb wb-page gm', 'robots', 'openGraph', 'public/sitemap.xml', '__tests__/<slug>.test.tsx', 'lib/projects.ts', 'cta',
  ]) {
    expect(text).toContain(bit);
  }
});

test('the flowchart is shown live: three stages, real text, two source boxes with their arrows, and the strip', () => {
  const { container } = render(<DesignPage />);
  const flow = container.querySelector('section[aria-labelledby="ds-writeups"] figure.bd-flow') as HTMLElement;
  expect(flow).not.toBeNull();
  expect(flow).toHaveAttribute('aria-label');
  expect(flow.querySelectorAll('.bd-flow-stages > li.bd-flow-stage')).toHaveLength(3);
  expect(flow.querySelectorAll('.bd-flow-from .bd-flow-feed-1, .bd-flow-from .bd-flow-feed-2')).toHaveLength(2);
  expect(flow.querySelectorAll('.bd-flow-box')).toHaveLength(4);
  expect(flow.querySelector('.bd-flow-hub .bd-flow-lead')).not.toBeNull();
  // every box holds two or three rows, and every arrow has its words
  for (const box of Array.from(flow.querySelectorAll('.bd-flow-box'))) {
    const rows = box.querySelectorAll('.bd-flow-rows > div, .bd-flow-points > li').length;
    expect(rows).toBeGreaterThanOrEqual(2);
    expect(rows).toBeLessThanOrEqual(3);
  }
  const says = Array.from(flow.querySelectorAll('.bd-flow-conn'), (c) => c.querySelector('.bd-flow-says')?.textContent);
  expect(says).toHaveLength(3);
  for (const s of says) expect(s).toBeTruthy();
  for (const a of Array.from(flow.querySelectorAll('.bd-flow-arrow'))) expect(a).toHaveAttribute('aria-hidden', 'true');
  expect(flow.querySelector('.bd-flow-loop')).toHaveTextContent('When I change something');
  expect(flow.querySelector('img, svg')).toBeNull();
});

test('the silent trailer print is shown in its own shape, with no sound button', () => {
  const { container } = render(<DesignPage />);
  const prints = Array.from(container.querySelectorAll('.print.trl'));
  expect(prints).toHaveLength(2);
  const boot = prints[1] as HTMLElement;
  expect(boot.closest('.wb.gm.bd')).not.toBeNull();
  const video = boot.querySelector('video') as HTMLVideoElement;
  expect(video.getAttribute('src')).toBe('/builds/photo-frame/boot.mp4');
  expect([video.getAttribute('width'), video.getAttribute('height')]).toEqual(['1280', '800']);
  expect(video.hasAttribute('autoplay')).toBe(false);
  expect(within(boot).queryByRole('button', { name: /sound/ })).toBeNull();
  expect(within(boot).getByText('The boot animation')).toBeInTheDocument();
});

test('the page says what changed today: no retired wording, and the page rules are written down', () => {
  const { container } = render(<DesignPage />);
  const text = container.textContent ?? '';
  expect(text).not.toMatch(/Autonomous AI agents|AUTONOMOUS/i);
  const using = container.querySelector('section[aria-labelledby="ds-using"]') as HTMLElement;
  expect(using).toHaveTextContent(/One menu per page/);
  expect(using).toHaveTextContent(/Every card shows/);
  expect(using).toHaveTextContent(/newest first/);
  const writing = container.querySelector('section[aria-labelledby="ds-writing"]') as HTMLElement;
  expect(writing).toHaveTextContent(/State the fact and stop/);
  expect(writing).toHaveTextContent(/made-up data/);
  expect(writing).toHaveTextContent(/names no vendor, client, person or number/);
});
