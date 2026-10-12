import { WES_LINE, ageAt, gradeName, schoolGrade, story } from '@/lib/snes/years';

it('works out age and school grade (school year starts in September)', () => {
  expect(ageAt(1981, '1991-08-23')).toBe(10);
  expect(schoolGrade(1981, '1991-09-15')).toBe(5);
  expect(schoolGrade(1981, '1994-04-18')).toBe(7);
  expect(gradeName(0)).toBe('in kindergarten');
  expect(gradeName(7)).toBe('in 7th grade');
  expect(gradeName(14)).toBe('in college');
  expect(gradeName(-2)).toBe('not in school yet');
});
it('narrates launch and the last game, with the Wes line only for 1981', () => {
  const s = story(1981);
  expect(s.lead).toMatch(/You were 10 when the Super Nintendo launched on August 23, 1991, about to start 5th grade\./);
  expect(s.wes).toBe(WES_LINE);
  expect(WES_LINE).toBe('Wes saved up $200 and bought one at ShopKo in Omaha, Nebraska, with F-Zero as a launch title.');
  expect(s.close).toMatch(/You were 17 when the last US SNES game shipped/);
  expect(story(1985).wes).toBeNull();
});
it('handles people born after the launch', () => {
  expect(story(1994).lead).toMatch(/weren't born yet/);
});
