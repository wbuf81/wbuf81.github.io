import { WES_LINE, ageAt, gradeName, milestoneWho, schoolGrade, story } from '@/lib/snes/years';

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
it('never says "You were 0": a 1991 birth is born the year of launch, a 1999+ birth was not born for the last game', () => {
  const s91 = story(1991);
  expect(s91.lead).toBe('You were born the year the Super Nintendo launched.');
  expect(s91.lead).not.toMatch(/You were 0/);
  expect(story(1999).close).toBe("You weren't born yet when the last US SNES game shipped in October 1998.");
  expect(story(2005).close).toBe("You weren't born yet when the last US SNES game shipped in October 1998.");
  expect(story(1998).close).not.toMatch(/You were 0/);
  expect(story(1997).close).toMatch(/You were 1 when the last US SNES game shipped in October 1998\./);
});
it('milestone chips say "about to start Nth grade" for summer dates, like the story', () => {
  expect(milestoneWho(1981, '1991-08-23')).toBe('you were 10, about to start 5th grade');
  expect(milestoneWho(1981, '1991-06-10')).toBe('you were 9, about to start 5th grade');
  expect(milestoneWho(1981, '1994-04-18')).toBe('you were 12, in 7th grade');
  expect(milestoneWho(1981, '1992-09-15')).toBe('you were 11, in 6th grade');
  expect(milestoneWho(1994, '1993-01-01')).toBe('before you were born');
  expect(milestoneWho(1981, '1991-08-23')).toContain(`about to start ${'5th'} grade`);
});
