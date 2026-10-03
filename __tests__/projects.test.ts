import fs from 'fs';
import path from 'path';
import { AGENTS, TOOLS, PERSONAL, GROUPS, FEATURED, place, personalGroups, featured, spelled, buildCounts } from '@/lib/projects';

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
  expect(AGENTS.map((a) => a.name)).toEqual(['OSCAR', 'SMORES', 'MAISIE', 'SNOOP', 'RHINO', 'PABSTY', 'BEASLEY', 'LUCY']);
  expect(TOOLS.map((t) => t.name)).toEqual(['WBDB']);
  expect(PERSONAL.find((p) => p.name === 'OmaFinance')).toMatchObject({ group: 'Omarchy Linux', badge: 'Private repo' });
});

test('private repos have no GitHub link, open ones do', () => {
  for (const p of all) {
    if (p.badge === 'Private repo') expect(p.href).toBeUndefined();
    else expect(p.href).toMatch(/^https:\/\/github\.com\/wbuf81\//);
  }
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

test('featured is a real personal project and is left out of its group', () => {
  expect(PERSONAL.some((p) => p.key === FEATURED)).toBe(true);
  expect(featured().key).toBe(FEATURED);
  expect(featured().chips?.length).toBeGreaterThan(0);
  const grouped = personalGroups().flatMap((g) => g.items.map((i) => i.key));
  expect(grouped).not.toContain(FEATURED);
  expect(grouped.length).toBe(PERSONAL.length - 1);
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
  expect(buildCounts()).toEqual({ work: 9, home: 9 });
  expect(spelled(9)).toBe('nine');
  expect(spelled(20)).toBe('twenty');
  expect(spelled(21)).toBe('21');
});
