'use client';
import type { IndexGame } from '@/lib/snes/library';
export default function Heatmap({ games }: { games: IndexGame[]; onPick: (monthKey: string) => void }) {
  return <div className="s-heat" data-count={games.length} />;
}
