'use client';
import type { IndexGame } from '@/lib/snes/library';
export default function CoverWall({ games }: { games: IndexGame[]; matched: Set<string> }) {
  return <div className="s-wall" data-count={games.length} />;
}
