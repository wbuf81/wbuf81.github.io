import fs from 'fs';
import path from 'path';
import { AGENTS, TOOLS, PERSONAL, GROUPS, HIGHLIGHTS, LATEST, place, personalGroups, highlights, personal, spelled, buildCounts } from '@/lib/projects';

const all = [...AGENTS, ...TOOLS, ...PERSONAL];
const inPublic = (p: string) => fs.existsSync(path.join(process.cwd(), 'public', p));

test('every tile is complete and its pictures exist', () => {
  for (const p of all) {
    expect([p.name, p.subtitle, p.description, p.badge, p.alt, p.kind].every(Boolean)).toBe(true);
    expect(inPublic(p.image)).toBe(true);
    if (p.hardware) expect(inPublic(p.hardware.image)).toBe(true);
  }
});

test('nothing is hotlinked', () => {
  for (const p of all) {
    expect(p.image.startsWith('/')).toBe(true);
    if (p.hardware) expect(p.hardware.image.startsWith('/')).toBe(true);
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
    if (p.badge === 'Private repo') expect(p.href).toBeUndefined();
    else if (p.badge === 'Open source') expect(p.href).toMatch(/^https:\/\/github\.com\/wbuf81\//);
    else expect(p.href).toMatch(/^\//);
  }
});

test('the highlights row: Office in 3D and Mac Tesla Tracker, then Tidemark as the latest', () => {
  expect(HIGHLIGHTS).toEqual(['office', 'tesla']);
  expect(LATEST).toBe('tidemark');
  expect(highlights().map((h) => [h.project.name, h.latest])).toEqual([
    ['My Office in 3D', false],
    ['Mac Tesla Tracker', false],
    ['Tidemark', true],
  ]);
  const keys = (label: string) => personalGroups().find((g) => g.label === label)!.items.map((i) => i.key);
  expect(keys('Mac apps')).toEqual(['daisy']);
  expect(keys('Everything else')).toEqual(['snes', 'neo', 'gbforge']);
  expect(personal('snes')).toMatchObject({ badge: 'Live on this site', href: '/videogames/snes-history' });
  expect(() => personal('nope')).toThrow();
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

test('every card in the row is a real personal project, none twice, and each leaves its group', () => {
  const keys = [...HIGHLIGHTS, LATEST];
  for (const k of keys) expect(PERSONAL.some((p) => p.key === k)).toBe(true);
  expect(new Set(keys).size).toBe(keys.length);
  for (const h of highlights()) expect(h.project.href).toBeTruthy();
  const grouped = personalGroups().flatMap((g) => g.items.map((i) => i.key));
  for (const k of keys) expect(grouped).not.toContain(k);
  expect(grouped.length).toBe(PERSONAL.length - keys.length);
  expect(personalGroups().map((g) => g.label)).toEqual([...GROUPS]);
});

test('every personal project is in a known group', () => {
  for (const p of PERSONAL) expect(GROUPS).toContain(p.group);
});

test('placing tiles follows the tilt and tape pattern by position', () => {
  const placed = place(AGENTS, 0);
  expect(placed[0].tilt).toBe(-2.6);
  expect(placed[0].tapes).toEqual([{ left: '38%', top: '-10px', width: '74px', angle: '-4deg' }]);
  expect(placed[1].tapes).toHaveLength(2);
  expect(place(AGENTS, 8)[0].tilt).toBe(-2.6);
});

test('personal tiles continue the pattern after the work tiles', () => {
  const first = personalGroups()[0].items[0];
  expect(first.tilt).toBe(place([first], AGENTS.length + TOOLS.length)[0].tilt);
});

test('counts for the strip, in words', () => {
  expect(buildCounts()).toEqual({ work: 10, home: 13 });
  expect(spelled(9)).toBe('nine');
  expect(spelled(20)).toBe('twenty');
  expect(spelled(21)).toBe('21');
});
