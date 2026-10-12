import { CPI, NOW_CPI, NOW_YEAR, toToday } from '@/lib/snes/money';

it('converts with CPI-U annual averages and rounds to the dollar', () => {
  expect(CPI[1991]).toBe(136.2);
  expect(NOW_YEAR).toBe(2025);
  expect(toToday(199.99, 1991)).toBe(Math.round((199.99 * NOW_CPI) / 136.2));
  expect(toToday(199.99, 1991)).toBeGreaterThan(460);
  expect(toToday(199.99, 1991)).toBeLessThan(485);
});
it('refuses years outside the table', () => {
  expect(() => toToday(10, 1989)).toThrow(/no CPI for 1989/);
});
