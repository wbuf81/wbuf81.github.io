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
  expect(story(1999).close).toBe('The last US SNES game shipped in October 1998, before you were born.');
  expect(story(2005).close).toBe('The last US SNES game shipped in October 1998, before you were born.');
  expect(story(1998).close).not.toMatch(/You were 0/);
  expect(story(1997).close).toMatch(/You were 1 when the last US SNES game shipped in October 1998\./);
});
it('milestone chips say "about to start Nth grade" for summer dates, like the story', () => {
  expect(milestoneWho(1981, '1991-08-23')).toBe('you were 10, about to start 5th grade');
  expect(milestoneWho(1981, '1991-06-10')).toBe('you were 9, about to start 5th grade');
  expect(milestoneWho(1981, '1994-04-18')).toBe('you were 12, in 7th grade');
  expect(milestoneWho(1981, '1992-09-15')).toBe('you were 11, in 6th grade');
  expect(milestoneWho(1994, '1993-01-01')).toBe('before you were born');
});
it('births after launch: mid-era years keep "in the middle of the 16-bit years", 1998 meets the last carts, 1999+ arrived after the era', () => {
  expect(story(1991).lead).toBe('You were born the year the Super Nintendo launched.');
  expect(story(1994).lead).toBe("You weren't born yet when the SNES launched in August 1991; you arrived in 1994, in the middle of the 16-bit years.");
  expect(story(1997).lead).toMatch(/in the middle of the 16-bit years\.$/);
  const s98 = story(1998);
  expect(s98.lead).toBe("You weren't born yet when the SNES launched in August 1991; you arrived in 1998, as the last carts were shipping.");
  expect(s98.close).toBe('You were born the year the last US SNES game shipped, in October 1998.');
  for (const y of [1999, 2012]) {
    const s = story(y);
    expect(s.lead).toBe("You arrived after the SNES era — here's what it looked like.");
    expect(s.lead).not.toMatch(/16-bit years/);
    expect(`${s.lead} ${s.close}`.match(/weren't born yet/g)).toBeNull();
    expect(s.wes).toBeNull();
  }
});
it('a summer date before kindergarten reads "about to start kindergarten"', () => {
  expect(milestoneWho(1986, '1991-08-23')).toBe('you were 5, about to start kindergarten');
  expect(milestoneWho(1987, '1991-08-23')).toBe('you were 4, not in school yet');
});
