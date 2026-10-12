/* Build-time access to the SNES dataset for pages (never imported by client components). */
import type { Company, Game, Price, Week } from './types.ts';
import games from '../../data/snes/games.json';
import companies from '../../data/snes/companies.json';
import weeks from '../../data/snes/weeks.json';
import prices from '../../data/snes/prices.json';

export const getGames = () => games as unknown as Game[];
export const getCompanies = () => companies as Company[];
export const getCompanyNames = (): Record<string, string> => Object.fromEntries(getCompanies().map((c) => [c.slug, c.name]));
export const getGame = (slug: string) => getGames().find((g) => g.slug === slug);
export const getWeeks = () => weeks as Week[];
export const getPrices = () => prices as unknown as { hardware: (Price & { item: string })[]; games: Record<string, Price> };
