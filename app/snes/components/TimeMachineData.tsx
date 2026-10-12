'use client';

import { useMemo } from 'react';
import { unpackGames, unpackWeeks, type PackedGame, type PackedWeeks } from '@/lib/snes/pack';
import TimeMachine, { type TmPrices } from './TimeMachine';
import type { Milestone } from './YearsStory';

// The server/client boundary for the Time Machine: the page sends packed weeks and games (see lib/snes/pack.ts) to
// keep the HTML and RSC payload small, and they are unpacked once here.
export default function TimeMachineData({ weeks, games, milestones, prices }: { weeks: PackedWeeks; games: PackedGame[]; milestones: Milestone[]; prices: TmPrices }) {
  const w = useMemo(() => unpackWeeks(weeks), [weeks]);
  const g = useMemo(() => unpackGames(games), [games]);
  return <TimeMachine weeks={w} games={g} milestones={milestones} prices={prices} />;
}
