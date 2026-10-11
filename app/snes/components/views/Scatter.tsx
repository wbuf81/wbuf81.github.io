'use client';
import type { IndexGame, ScoreAxis } from '@/lib/snes/library';
export default function Scatter({ games }: { games: IndexGame[]; axis: ScoreAxis; onAxis: (a: ScoreAxis) => void }) {
  return <div className="s-scatter" data-count={games.length} />;
}
