/* Build-time access to the SNES dataset for pages (never imported by client components). */
import type { Company, Game } from './types.ts';
import games from '../../data/snes/games.json';
import companies from '../../data/snes/companies.json';

export const getGames = () => games as unknown as Game[];
export const getCompanies = () => companies as Company[];
export const getCompanyNames = (): Record<string, string> => Object.fromEntries(getCompanies().map((c) => [c.slug, c.name]));
export const getGame = (slug: string) => getGames().find((g) => g.slug === slug);
