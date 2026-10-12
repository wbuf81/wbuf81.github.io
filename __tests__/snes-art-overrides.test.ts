import { artId, unknownArtOverrides } from '@/lib/snes/weeks';

describe('unknownArtOverrides', () => {
  const articles = ['Metallica (album)', 'Hot Shots!'];
  it('accepts known ids', () => {
    expect(unknownArtOverrides(articles, { [artId('Hot Shots!')]: '/snes/pop/x.webp', [artId('Metallica (album)')]: null })).toEqual([]);
  });
  it('reports a misspelt id', () => {
    expect(unknownArtOverrides(articles, { 'hot-shotz': null })).toEqual(['art override names unknown id hot-shotz']);
  });
  it('accepts an empty overrides object', () => {
    expect(unknownArtOverrides(articles, {})).toEqual([]);
  });
});
