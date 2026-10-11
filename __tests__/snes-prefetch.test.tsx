import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { GameTile } from '@/app/snes/components/GameTile';
import CoverWall from '@/app/snes/components/views/CoverWall';
import Scatter from '@/app/snes/components/views/Scatter';
import Shelf from '@/app/snes/components/views/Shelf';
import type { IndexGame } from '@/lib/snes/library';

// Next prefetches every <Link> that scrolls into view; the Wall alone would download ~13 MB. Game links must opt out.
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, prefetch, children, ...rest }: { href: string; prefetch?: boolean; children: React.ReactNode }) => (
    <a href={href} data-prefetch={String(prefetch)} {...rest}>{children}</a>
  ),
}));

const g: IndexGame = {
  slug: 'f-zero', title: 'F-Zero', search: 'f zero', releasedUS: '1991-08-23', datePrecision: 'day', publisher: 'nintendo',
  developers: ['nintendo-ead'], genres: [], players: null, chip: null, chipSlug: null, launchTitle: true, egmAvg: 8, np10: 7.6,
  aggregate: 80, boxArt: '/snes/box/f-zero.jpg', thumb: '/snes/thumb/f-zero.jpg', video: null,
  series: null, themes: [], perspectives: [], coop: false, versus: false, users: null,
};

const cases: [string, React.ReactElement][] = [
  ['GameTile', <GameTile key="t" game={g} publisherName="Nintendo" />],
  ['CoverWall', <CoverWall key="w" games={[g]} matched={new Set(['f-zero'])} />],
  ['Shelf', <Shelf key="s" games={[g]} byYear />],
  ['Scatter', <Scatter key="c" games={[g]} axis="egm" onAxis={() => {}} />],
];

test.each(cases)('%s game links do not prefetch', (_name, el) => {
  const { container } = render(el);
  const links = container.querySelectorAll('a[href="/videogames/snes-history/f-zero"]');
  expect(links.length).toBeGreaterThan(0);
  links.forEach((a) => expect(a).toHaveAttribute('data-prefetch', 'false'));
});
