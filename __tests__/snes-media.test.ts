import { indexMedia, mediaFor, splitMediaName } from '@/lib/snes/media';

const FILES = [
  'F-Zero (USA)-image.png', 'F-Zero (USA)-marquee.png', 'F-Zero (USA)-thumb.png', 'F-Zero (USA)-video.mp4',
  'Super Metroid (Japan, USA) (En,Ja)-image.png', 'Super Metroid (Japan, USA) (En,Ja)-video.mp4',
  'Dino City (USA)-video.mp4', 'Dino City (USA)-marquee.png',
  'Arcus Odyssey (USA) (Proto)-video.mp4',
  'F-Zero (Japan)-video.mp4',
  'notes.txt',
];

test('splits a media file name into its base and kind', () => {
  expect(splitMediaName('7th Saga, The (USA)-marquee.png')).toEqual({ base: '7th Saga, The (USA)', kind: 'marquee' });
  expect(splitMediaName('F-Zero (USA)-video.mp4')).toEqual({ base: 'F-Zero (USA)', kind: 'video' });
  expect(splitMediaName('notes.txt')).toBeNull();
});

test('indexes US files by title with every kind found, skipping prototypes and Japan-only files', () => {
  const index = indexMedia(FILES);
  expect(mediaFor(index, 'F-Zero')).toEqual({ base: 'F-Zero (USA)', kinds: ['image', 'marquee', 'thumb', 'video'], japan: false });
  expect(mediaFor(index, 'Super Metroid')).toEqual({ base: 'Super Metroid (Japan, USA) (En,Ja)', kinds: ['image', 'video'], japan: true });
  expect(mediaFor(index, 'Arcus Odyssey')).toBeNull();
});

test('an alias names the file base when titles differ', () => {
  const index = indexMedia(FILES);
  expect(mediaFor(index, 'DinoCity')).toBeNull();
  expect(mediaFor(index, 'DinoCity', 'Dino City (USA)')?.kinds).toEqual(['marquee', 'video']);
  expect(mediaFor(index, 'DinoCity', 'Nope (USA)')).toBeNull();
});
