'use client';

import { useState } from 'react';

/** Up to three initials from a title ("Soccer Kid" → "SK"), for the no-art placeholder. */
export const initials = (title: string) =>
  title.split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 3).map((w) => w[0].toUpperCase()).join('');

type Props = { src: string; title: string; width: number; height: number; noArt?: boolean; loading?: 'lazy' | 'eager' };

/** A decorative cover image (alt=""), or a token-coloured placeholder with the title's initials when the game has no
 * art or the image fails to load. The placeholder keeps the image's aspect ratio. */
export function Cover({ src, title, width, height, noArt = false, loading = 'lazy' }: Props) {
  const [failed, setFailed] = useState(false);
  if (noArt || failed) {
    return <span className="s-cover-none" aria-hidden="true" style={{ aspectRatio: `${width} / ${height}` }}>{initials(title)}</span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={width} height={height} loading={loading} decoding="async" draggable={false} onError={() => setFailed(true)} />;
}
