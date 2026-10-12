/* Prices in today's money: US CPI-U annual averages (BLS). Update NOW_YEAR / NOW_CPI each January. */
export const CPI: Record<number, number> = { 1991: 136.2, 1992: 140.3, 1993: 144.5, 1994: 148.2, 1995: 152.4, 1996: 156.9, 1997: 160.5, 1998: 163.0 };
export const NOW_YEAR = 2025;
export const NOW_CPI = 322.2; // 2025 annual average (approximate until BLS final)

export function toToday(usd: number, year: number): number {
  const then = CPI[year];
  if (!then) throw new Error(`toToday: no CPI for ${year}`);
  return Math.round((usd * NOW_CPI) / then);
}
