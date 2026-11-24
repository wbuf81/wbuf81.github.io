import fs from 'fs';
import path from 'path';
import { AGENTS, TOOLS, PERSONAL, GAMES, GROUPS, HIGHLIGHTS, LATEST, place, placement, homeBuilds, homeNavItems, newestFirst, HOME_SECTIONS, GAMING_GROUP, highlights, personal, project, spelled, buildCounts } from '@/lib/projects';

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
  const keys = (label: string) => homeBuilds().groups.find((g) => g.label === label)!.items.map((i) => i.key);
  expect(keys('Mac apps')).toEqual(['tidemark', 'tesla', 'daisy']);
  expect(keys('Electronics')).toEqual(['frame', 'knobdeck', 'neo', 'aac', 'spotify']);
  expect(keys('Everything else')).toEqual(['office']);
  expect(homeBuilds().otherGames.map((i) => i.key)).toEqual(['snes', 'gbforge']);
  expect([...GROUPS]).toEqual(['Mac apps', 'Omarchy Linux', 'Electronics', 'Everything else']);
  expect(personal('snes')).toMatchObject({ badge: 'Live on this site', href: '/videogames/snes-history' });
  expect(() => personal('nope')).toThrow();
});

test('the photo frame: in Electronics, a private repo with its write-up here and its own link text', () => {
  const groups = homeBuilds().groups.find((g) => g.label === 'Electronics')!.items.map((i) => i.name);
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

// Wes, 24 Nov 2026: the row repeats three builds that also sit in their groups as ordinary tiles.
test('every card in the row is a real project, none twice, and each stays a tile in its section', () => {
  const keys = HIGHLIGHTS;
  for (const k of keys) expect(() => project(k)).not.toThrow();
  expect(new Set(keys).size).toBe(keys.length);
  expect(keys).toContain(LATEST);
  for (const h of highlights()) expect(h.project.href).toBeTruthy();
  const grouped = homeBuilds().groups.flatMap((g) => g.items.map((i) => i.key));
  const gaming = homeBuilds().otherGames.map((i) => i.key);
  for (const k of keys) {
    const inGames = GAMES.some((g) => g.key === k);
    expect(inGames ? GAMES.map((g) => g.key) : grouped).toContain(k);
  }
  expect(grouped.length + gaming.length).toBe(PERSONAL.length);
  expect(new Set([...grouped, ...gaming]).size).toBe(PERSONAL.length);
  expect(homeBuilds().groups.map((g) => g.label)).toEqual([...GROUPS]);
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

test('tilt and tape go by position on the page, after sorting, carrying on from one list to the next', () => {
  const b = homeBuilds();
  const page = [...b.work, ...b.games, ...b.otherGames, ...b.groups.flatMap((g) => g.items)];
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

test('the homepage lists come out newest first', () => {
  const b = homeBuilds();
  expect(b.work.map((p) => p.name)).toEqual(['WINNIE', 'LUCY', 'WBDB', 'BEASLEY', 'MAISIE', 'SNOOP', 'RHINO', 'PABSTY', 'OSCAR', 'SMORES']);
  expect(b.games.map((p) => p.key)).toEqual(['conair']);
  expect(b.otherGames.map((p) => p.key)).toEqual(['snes', 'gbforge']);
  const names = Object.fromEntries(b.groups.map((g) => [g.id, g.items.map((p) => p.name)]));
  expect(names).toEqual({
    mac: ['Tidemark', 'Mac Tesla Tracker', 'Daisy Status Bar'],
    linux: ['OmaFinance', 'Idle Screen Counter', 'Omarchy Workspace Labels'],
    electronics: ['Photo Frame Dashboard', 'Knobdeck', 'Stream Deck Neo Takeover', 'Personal AAC Device', 'M5 Spotify Deck'],
    more: ['My Office in 3D'],
  });
});

test('six home sections, and the band counts each from the data', () => {
  expect(HOME_SECTIONS.map((s) => [s.id, s.heading])).toEqual([
    ['work', 'Work'], ['games', 'Gaming'], ['mac', 'Mac apps'], ['linux', 'Omarchy Linux'], ['electronics', 'Electronics'], ['more', 'Everything else'],
  ]);
  expect(homeNavItems().map((i) => [i.id, i.label, i.count])).toEqual([
    ['work', 'Work', AGENTS.length + TOOLS.length],
    ['games', 'Gaming', GAMES.length + PERSONAL.filter((p) => p.group === GAMING_GROUP).length],
    ['mac', 'Mac apps', 3], ['linux', 'Linux', 3], ['electronics', 'Electronics', 5], ['more', 'More', 1],
  ]);
});
