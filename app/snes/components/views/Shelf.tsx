'use client';
import type { IndexGame } from '@/lib/snes/library';
export default function Shelf({ games }: { games: IndexGame[]; byYear: boolean }) {
  return <div className="s-shelf" data-count={games.length} />;
}
