/**
 * Smoke tests for scripts/add-health-week.mjs — specifically that it can
 * still load lib/health.ts under plain Node. That loader broke silently
 * when the dayLabel split added an import Node couldn't resolve, and the
 * break only surfaced on the next weekly import. Every case here runs
 * --dry-run so data/health.json is never touched.
 */
import { spawnSync } from 'child_process';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..');
const script = path.join(repoRoot, 'scripts', 'add-health-week.mjs');

function runDryRun(input: string) {
  const result = spawnSync('node', [script, '--dry-run'], {
    cwd: repoRoot,
    input,
    encoding: 'utf8',
    timeout: 30_000,
  });
  return { ...result, combined: `${result.stdout}\n${result.stderr}` };
}

describe('add-health-week.mjs --dry-run', () => {
  it('loads lib/health.ts and exits cleanly on empty input', () => {
    const result = runDryRun('');
    expect(result.combined).not.toContain('Could not load lib/health.ts');
    expect(result.combined).toContain('--dry-run: nothing written.');
    expect(result.status).toBe(0);
  });

  it('refuses rows that do not have 12 columns', () => {
    const result = runDryRun('Aug 3\tMon\t2,209\n');
    expect(result.combined).not.toContain('Could not load lib/health.ts');
    expect(result.combined).toContain('expected 12 columns');
    expect(result.status).toBe(1);
  });
});
