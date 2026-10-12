import { SNES_BASE, companyPath, gamePath } from '../lib/snes/routes';

test('builds page routes under the SNES base', () => {
  expect(SNES_BASE).toBe('/videogames/snes-history');
  expect(gamePath('f-zero')).toBe('/videogames/snes-history/f-zero');
  expect(companyPath('nintendo')).toBe('/videogames/snes-history/company/nintendo');
});

test('links into the Time Machine at a week', async () => {
  const { TIME_MACHINE, timeMachinePath } = await import('../lib/snes/routes');
  expect(TIME_MACHINE).toBe('/videogames/snes-history/time-machine');
  expect(timeMachinePath('1991-08-23')).toBe('/videogames/snes-history/time-machine?w=1991-08-23');
});
