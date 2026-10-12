// Clip rules shared by game tiles and the scatter's hover card. One clip at a time across the whole page: starting
// one stops whichever was playing.
let stopPlaying: (() => void) | null = null;
export const claimClip = (stop: () => void) => {
  stopPlaying?.();
  stopPlaying = stop;
};

export const canPreview = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches;
// Phones have no hover: there the first tap plays a clip and a second tap opens the game.
export const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

// Plays with sound if allowed; a browser that refuses unmuted playback gets the clip muted instead.
export const playClip = (v: HTMLVideoElement, sound: boolean) => {
  v.muted = !sound;
  v.play().catch(() => {
    v.muted = true;
    v.play().catch(() => {});
  });
};

// A clip must not keep playing behind another tab or window: stop it when the page is hidden or loses focus.
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopPlaying?.();
  });
  window.addEventListener('blur', () => stopPlaying?.());
}
