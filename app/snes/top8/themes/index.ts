import type { ThemeId } from '@/lib/snes/top8';
import type { Theme } from '../render';
import { myspace } from './myspace';
import { glitter } from './glitter';
import { consoleTheme } from './console';
import { grandprix } from './grandprix';
import { crystal } from './crystal';
import { polygon } from './polygon';

export const THEMES: Record<ThemeId, Theme> = { myspace, glitter, console: consoleTheme, grandprix, crystal, polygon };
