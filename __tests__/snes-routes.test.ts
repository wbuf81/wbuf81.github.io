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

test('wikiUrl makes a valid Wikipedia path from an article title', async () => {
  const { wikiUrl } = await import('../lib/snes/routes');
  expect(wikiUrl('Have You Ever Really Loved a Woman?')).toBe('https://en.wikipedia.org/wiki/Have_You_Ever_Really_Loved_a_Woman%3F');
  expect(wikiUrl('Romeo + Juliet')).toBe('https://en.wikipedia.org/wiki/Romeo_%2B_Juliet');
  expect(wikiUrl('(Everything I Do) I Do It for You')).toBe('https://en.wikipedia.org/wiki/(Everything_I_Do)_I_Do_It_for_You');
  expect(wikiUrl('A#B&C%D/E')).toBe('https://en.wikipedia.org/wiki/A%23B%26C%25D%2FE');
});
