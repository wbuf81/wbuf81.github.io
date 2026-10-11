import { SNES_BASE, companyPath, gamePath } from '../lib/snes/routes';

test('builds page routes under the SNES base', () => {
  expect(SNES_BASE).toBe('/videogames/snes-history');
  expect(gamePath('f-zero')).toBe('/videogames/snes-history/f-zero');
  expect(companyPath('nintendo')).toBe('/videogames/snes-history/company/nintendo');
});
