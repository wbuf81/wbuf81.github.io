import fs from 'fs';
import path from 'path';
import { AGENTS, TOOLS, PERSONAL, GAMES, GROUPS, HIGHLIGHTS, LATEST, CATEGORIES, place, placement, homeProjects, categoryOf, filterItems, newestFirst, GAMING_GROUP, highlights, personal, project, spelled, buildCounts } from '@/lib/projects';

const all = [...AGENTS, ...TOOLS, ...PERSONAL, ...GAMES];
const inPublic = (p: string) => fs.existsSync(path.join(process.cwd(), 'public', p));

test('every tile is complete and its pictures exist', () => {
  for (const p of all) {
    expect([p.name, p.subtitle, p.description, p.badge, p.alt, p.kind].every(Boolean)).toBe(true);
    expect(inPublic(p.image)).toBe(true);
    if (p.hardware) expect(inPublic(p.hardware.image)).toBe(true);
    if (p.trailer) {
      expect(inPublic(p.trailer.src)).toBe(true);
      expect(inPublic(p.trailer.poster)).toBe(true);
      expect(p.trailer.label).toBeTruthy();
    }
  }
});

test('nothing is hotlinked', () => {
  for (const p of all) {
    expect(p.image.startsWith('/')).toBe(true);
    if (p.hardware) expect(p.hardware.image.startsWith('/')).toBe(true);
    if (p.trailer) expect([p.trailer.src, p.trailer.poster].every((u) => u.startsWith('/'))).toBe(true);
  }
});

test('keys are unique', () => {
  expect(new Set(all.map((p) => p.key)).size).toBe(all.length);
});

test('the new tiles are there', () => {
  expect(AGENTS.map((a) => a.name)).toEqual(['OSCAR', 'SMORES', 'MAISIE', 'SNOOP', 'RHINO', 'PABSTY', 'BEASLEY', 'LUCY', 'WINNIE']);
  expect(TOOLS.map((t) => t.name)).toEqual(['WBDB']);
  expect(PERSONAL.find((p) => p.name === 'OmaFinance')).toMatchObject({ group: 'Omarchy Linux', badge: 'Private repo' });
});

test('private repos have no link, open ones link to GitHub, live ones to a page on this site', () => {
  for (const p of all) {
    // A private repo has no link, or links to its write-up on this site, never an outside address.
    if (p.badge === 'Private repo') {
      if (p.href !== undefined) expect(p.href).toMatch(/^\/builds\/[a-z0-9-]+$/);
    }
    else if (p.badge === 'Open source') expect(p.href).toMatch(/^https:\/\/github\.com\/wbuf81\//);
    // A game Wes made has a page here about it, and nothing to download.
    else if (p.badge === 'Private build') expect(p.href).toMatch(/^\/games\/[a-z0-9-]+$/);
    else expect(p.href).toMatch(/^\//);
  }
});

test('games: CON AIR first, with its page and its own link text', () => {
  expect(GAMES.map((g) => g.key)).toEqual(['conair']);
  expect(GAMES[0]).toMatchObject({ name: 'CON AIR', badge: 'Private build', href: '/games/con-air', cta: 'About the game →' });
  expect(GAMES[0].chips).toBeUndefined();
  expect(GAMES[0].chipsLabel).toBeUndefined();
  for (const g of GAMES) expect(`${g.subtitle} ${g.description}`).not.toMatch(/—/);
});

test('the highlights row: Photo Frame Dashboard (latest), CON AIR, Tidemark', () => {
  expect(HIGHLIGHTS).toEqual(['frame', 'conair', 'tidemark']);
  expect(LATEST).toBe('frame');
  expect(HIGHLIGHTS).toContain(LATEST);
  expect(highlights().map((h) => [h.project.name, h.latest])).toEqual([
    ['Photo Frame Dashboard', true],
    ['CON AIR', false],
    ['Tidemark', false],
  ]);
  expect(project('conair').name).toBe('CON AIR');
  expect(() => project('nope')).toThrow();
  const keys = (c: string) => homeProjects().filter((p) => p.category === c).map((p) => p.key);
  expect(keys('mac')).toEqual(['tidemark', 'tesla', 'daisy']);
  expect(keys('electronics')).toEqual(['frame', 'knobdeck', 'neo', 'aac', 'spotify']);
  expect(keys('web')).toEqual(['office']);
  expect(keys('games')).toEqual(['conair', 'snes', 'gbforge']);
  expect([...GROUPS]).toEqual(['Mac apps', 'Omarchy Linux', 'Electronics', 'Web']);
  expect(personal('snes')).toMatchObject({ badge: 'Live on this site', href: '/videogames/snes-history' });
  expect(() => personal('nope')).toThrow();
});

test('the photo frame: in Electronics, a private repo with its write-up here and its own link text', () => {
  const groups = homeProjects().filter((p) => p.category === 'electronics').map((p) => p.name);
  expect(groups).toEqual(['Photo Frame Dashboard', 'Knobdeck', 'Stream Deck Neo Takeover', 'Personal AAC Device', 'M5 Spotify Deck']);
  expect(personal('frame')).toMatchObject({ badge: 'Private repo', href: '/builds/photo-frame', cta: 'How I built it →' });
});

test('public copy rules', () => {
  const wbdb = TOOLS[0];
  expect(`${wbdb.subtitle} ${wbdb.description}`).not.toMatch(/\d/);
  for (const p of all) {
    // CLAUDE.md › Content rules: no internal vendors, no named regulators, no clients or brokerages.
    // (MAISIE's OFAC is long-standing copy Wes wrote; the rule is enforced for everything else.)
    expect(`${p.subtitle} ${p.description}`).not.toMatch(/\b(Meta|LexSynergy|Merrill|OneTrust|SharePoint|FDIC|NCUA|SEC)\b/);
  }
});

// Wes, 24 Nov 2026: the row repeats three builds that are also in the grid (shown there once a category is pressed).
test('every card in the row is a real project, none twice, and each is in the one list', () => {
  const keys = HIGHLIGHTS;
  for (const k of keys) expect(() => project(k)).not.toThrow();
  expect(new Set(keys).size).toBe(keys.length);
  expect(keys).toContain(LATEST);
  for (const h of highlights()) expect(h.project.href).toBeTruthy();
  const list = homeProjects().map((p) => p.key);
  for (const k of keys) expect(list).toContain(k);
  expect(CATEGORIES.filter((c) => c.group).map((c) => c.group)).toEqual([...GROUPS]);
});

test('every personal project is in a known group', () => {
  for (const p of PERSONAL) expect([...GROUPS, GAMING_GROUP]).toContain(p.group);
});

test('placing tiles follows the tilt and tape pattern by position', () => {
  const placed = place(AGENTS, 0);
  expect(placed[0].tilt).toBe(-2.6);
  expect(placed[0].tapes).toEqual([{ left: '38%', top: '-10px', width: '74px', angle: '-4deg' }]);
  expect(placed[1].tapes).toHaveLength(2);
  expect(place(AGENTS, 8)[0].tilt).toBe(-2.6);
});

test('placement(i) is what place gives the print at position i', () => {
  for (let i = 0; i < 20; i++) {
    const { tilt, tapes } = place([AGENTS[0]], i)[0];
    expect(placement(i)).toEqual({ tilt, tapes });
  }
});

test('tilt and tape go by position in the one newest-first list', () => {
  const page = homeProjects();
  expect(page).toHaveLength(all.length);
  page.forEach((p, i) => expect({ tilt: p.tilt, tapes: p.tapes }).toEqual(placement(i)));
});

test('counts for the strip, in words', () => {
  expect(buildCounts()).toEqual({ work: 10, home: 15 });
  expect(spelled(15)).toBe('fifteen');
  expect(spelled(9)).toBe('nine');
  expect(spelled(20)).toBe('twenty');
  expect(spelled(21)).toBe('21');
});

// Wes, 24 Nov 2026: within each section the newest added shows first.
test('every project has a real added date, none after 24 Nov 2026', () => {
  for (const p of all) {
    expect(p.added).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const d = new Date(`${p.added}T00:00:00Z`);
    expect(Number.isNaN(d.getTime())).toBe(false);
    expect(d.toISOString().slice(0, 10)).toBe(p.added);
    expect(p.added <= '2026-11-24').toBe(true);
  }
});

test('newestFirst sorts by added, ties keeping their order', () => {
  const list = [
    { key: 'a', added: '2026-01-01' },
    { key: 'b', added: '2026-03-01' },
    { key: 'c', added: '2026-01-01' },
    { key: 'd', added: '2026-03-01' },
  ];
  expect(newestFirst(list).map((x) => x.key)).toEqual(['b', 'd', 'a', 'c']);
  expect(list.map((x) => x.key)).toEqual(['a', 'b', 'c', 'd']);
});

// Wes, 24 Nov 2026: one grid, newest first across everything; ties go work, then personal in PERSONAL's order, then games.
test('the homepage list is every project, newest first, ties in the documented order', () => {
  expect(homeProjects().map((p) => p.name)).toEqual([
    'Photo Frame Dashboard', 'CON AIR', 'My Office in 3D', 'WINNIE', 'Tidemark', 'Mac Tesla Tracker', 'SNES History',
    'LUCY', 'WBDB', 'OmaFinance', 'Idle Screen Counter', 'BEASLEY', 'Knobdeck', 'Stream Deck Neo Takeover',
    'Personal AAC Device', 'M5 Spotify Deck', 'Daisy Status Bar', 'GBForge Tetris', 'Omarchy Workspace Labels',
    'MAISIE', 'SNOOP', 'RHINO', 'PABSTY', 'OSCAR', 'SMORES',
  ]);
  expect(new Set(homeProjects().map((p) => p.key)).size).toBe(all.length);
});

test('every project has a category, from where it lives', () => {
  for (const p of [...AGENTS, ...TOOLS]) expect(categoryOf(p)).toBe('work');
  for (const p of GAMES) expect(categoryOf(p)).toBe('games');
  for (const p of PERSONAL) {
    const want = p.group === GAMING_GROUP ? 'games' : CATEGORIES.find((c) => c.group === p.group)!.id;
    expect(categoryOf(p)).toBe(want);
  }
  for (const p of homeProjects()) expect(CATEGORIES.map((c) => c.id)).toContain(p.category);
  expect(() => categoryOf({ ...PERSONAL[1], group: undefined })).toThrow();
});

test('six categories, and the band counts each from the data, All first', () => {
  expect(CATEGORIES.map((c) => [c.id, c.name, c.label, c.icon])).toEqual([
    ['work', 'Work', 'Work', '🤖'], ['games', 'Gaming', 'Gaming', '🎮'], ['mac', 'Mac apps', 'Mac apps', '💻'],
    ['linux', 'Omarchy Linux', 'Linux', '🐧'], ['electronics', 'Electronics', 'Electronics', '🔌'], ['web', 'Web', 'Web', '🌐'],
  ]);
  expect(filterItems().map((i) => [i.id, i.label, i.count])).toEqual([
    ['all', 'All', all.length],
    ['work', 'Work', AGENTS.length + TOOLS.length],
    ['games', 'Gaming', GAMES.length + PERSONAL.filter((p) => p.group === GAMING_GROUP).length],
    ['mac', 'Mac apps', 3], ['linux', 'Linux', 3], ['electronics', 'Electronics', 5], ['web', 'Web', 1],
  ]);
});
