import fs from 'fs';
import path from 'path';
import { parseContributionsHtml, buildMap, type Contributions } from '@/lib/githubContributions';

const td = (date: string, level: number) =>
  `<td tabindex="0" data-ix="0" data-date="${date}" id="contribution-day-component-0-0" data-level="${level}" class="ContributionCalendar-day"></td>`;

test('parses GitHub public calendar cells in date order, ignoring the legend', () => {
  const html = td('2026-01-02', 3) + td('2026-01-01', 0) + td('2026-01-03', 4) + '<div data-level="2" class="legend"></div>';
  expect(parseContributionsHtml(html)).toEqual({ from: '2026-01-01', to: '2026-01-03', levels: '034' });
});

test('rejects a gap in the days', () => {
  expect(() => parseContributionsHtml(td('2026-01-01', 0) + td('2026-01-03', 1))).toThrow(/gap/);
});

test('rejects a page with no days', () => {
  expect(() => parseContributionsHtml('<html><body>Rate limited</body></html>')).toThrow(/no days/);
});

test('crosses month and year ends without a false gap', () => {
  const html = td('2025-12-31', 1) + td('2026-01-01', 2) + td('2026-02-28', 0);
  expect(() => parseContributionsHtml(html)).toThrow(/gap at 2026-02-28/);
  expect(parseContributionsHtml(td('2026-02-28', 1) + td('2026-03-01', 2)).levels).toBe('12');
});

test('the committed file is a year of 0–4 levels, one per day', () => {
  const data: Contributions = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/github-contributions.json'), 'utf8'));
  expect(data.user).toBe('wbuf81');
  expect(data.levels).toMatch(/^[0-4]+$/);
  const days = Math.round((Date.parse(data.to) - Date.parse(data.from)) / 86400000) + 1;
  expect(data.levels.length).toBe(days);
  expect(days).toBeGreaterThanOrEqual(364);
});

test('the refresh script never fails the deploy and keeps the committed file when GitHub is unreachable', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { spawnSync } = require('child_process');
  const file = path.join(process.cwd(), 'data/github-contributions.json');
  const before = fs.readFileSync(file, 'utf8');
  const run = spawnSync(process.execPath, ['scripts/github-contributions.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, GITHUB_CONTRIBUTIONS_URL: 'http://127.0.0.1:9/unreachable' },
    encoding: 'utf8',
    timeout: 30000,
  });
  expect(run.status).toBe(0);
  expect(run.stderr).toMatch(/warning: GitHub contributions not refreshed/);
  expect(fs.readFileSync(file, 'utf8')).toBe(before);
}, 40000);

test('buildMap lays days into Sunday-first weeks with month labels', () => {
  // 28 Sep 2025 is a Sunday; two weeks, the second starting in October.
  const m = buildMap({ user: 'x', from: '2025-09-28', to: '2025-10-11', levels: '01234000000000' });
  expect(m.weeks).toBe(2);
  expect(m.cells).toHaveLength(14);
  expect(m.cells[0]).toEqual({ date: '2025-09-28', level: 0 });
  expect(m.cells[4]).toEqual({ date: '2025-10-02', level: 4 });
  expect(m.months).toEqual([{ col: 2, label: 'Oct' }]);
});

test('buildMap pads a start that is not a Sunday', () => {
  // 1 Jan 2026 is a Thursday: four empty cells first.
  const m = buildMap({ user: 'x', from: '2026-01-01', to: '2026-01-03', levels: '123' });
  expect(m.cells.slice(0, 4).every((c) => c.level === -1)).toBe(true);
  expect(m.cells[4]).toEqual({ date: '2026-01-01', level: 1 });
  expect(m.weeks).toBe(1);
});
