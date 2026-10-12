'use client';

import { createContext, memo, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { addPick, isPicked, removePick, replacePick, type Top8State } from '../../../lib/snes/top8.ts';
import { useInTop8Provider, useTop8Hub } from '../top8/store';
import { ensureToastRegion, showToast } from './toast';
import { Cover } from './Cover';

type Props = {
  slug: string;
  title: string;
  variant: 'tile' | 'page';
  onToast?: (msg: string) => void;
  /** Titles for the replace popover's covers (slug → title). Falls back to the slug, title-cased. */
  titles?: Record<string, string>;
};

/** With a titles map, stored slugs that aren't games (renamed or removed) count as empty slots. Storage is not
 * rewritten for this; the next edit through the star drops them. An empty map means no titles, so nothing is dropped. */
export const knownOnly = (s: Top8State, names: Record<string, string> | undefined): Top8State =>
  !names || isEmpty(names) || s.slots.every((x) => !x || Object.hasOwn(names, x)) ? s : { ...s, slots: s.slots.map((x) => (x && Object.hasOwn(names, x) ? x : null)) };
const isEmpty = (o: object) => { for (const k in o) if (Object.hasOwn(o, k)) return false; return true; };
// The popover closes on a scroll or resize only once the star has moved this far (px).
const MOVED = 4;

const fromSlug = (slug: string) => slug.split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

// Slug → title for the replace popover's labels, shared by every star under one provider (a page passes it once).
const TitlesContext = createContext<Record<string, string> | undefined>(undefined);
export function Top8Titles({ titles, children }: { titles: Record<string, string>; children: ReactNode }) {
  return <TitlesContext.Provider value={titles}>{children}</TitlesContext.Provider>;
}

// The add-to-Top-8 star. A sibling of the tile's link (never inside it). Renders nothing until mounted.
// Under a Top8Provider it reads the shared hub and selects only "picked / full" (plus the slots while its popover is
// open), so a pick re-renders just the stars it changes; memo keeps parent re-renders out too.
export const Top8Star = memo(function Top8Star({ slug, title, variant, onToast, titles }: Props) {
  const hub = useTop8Hub();
  const inProvider = useInTop8Provider();
  const shared = useContext(TitlesContext);
  const names = titles ?? shared;
  const [open, setOpen] = useState(false);
  const key = useSyncExternalStore(hub.subscribe, () => {
    const raw = hub.get();
    if (!raw) return 'x';
    const s = knownOnly(raw, names);
    const flags = `${isPicked(s, slug) ? 1 : 0}${s.slots.every(Boolean) ? 1 : 0}`;
    return open ? `${flags}${s.slots.join(',')}` : flags;
  }, () => 'x');
  const raw = key === 'x' ? null : hub.get();
  const state = raw && knownOnly(raw, names);
  const update = hub.update;
  // Fixed (and hidden) from the first paint, so the popover never sits in the flow at the end of <body>.
  const [pos, setPos] = useState<CSSProperties>({ position: 'fixed', left: 0, top: 0, visibility: 'hidden' });
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const say = onToast ?? showToast;
  const mounted = state !== null;
  // A provider sets up the shared toast region once for its whole page; a star on its own does it itself.
  useEffect(() => { if (mounted && !onToast && !inProvider) ensureToastRegion(); }, [mounted, onToast, inProvider]);

  useEffect(() => {
    if (!open) return;
    const close = () => { setOpen(false); btn.current?.focus(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onDown = (e: Event) => {
      const t = e.target as Node;
      if (pop.current?.contains(t) || btn.current?.contains(t)) return;
      setOpen(false);
    };
    // A scroll or resize closes it only when the star itself has moved (focusing the popover, or a page's late
    // layout shift, can fire a scroll without moving anything). Scrolling the popover's own list never closes it.
    const at = btn.current?.getBoundingClientRect();
    const moved = () => {
      const now = btn.current?.getBoundingClientRect();
      return !at || !now || Math.abs(now.top - at.top) > MOVED || Math.abs(now.left - at.left) > MOVED;
    };
    const shut = (e: Event) => {
      if (e.target instanceof Node && pop.current?.contains(e.target)) return;
      if (moved()) setOpen(false);
    };
    const onResize = () => { if (moved()) setOpen(false); };
    const onFocusOut = (e: FocusEvent) => {
      const to = e.relatedTarget as Node | null;
      if (to && !pop.current?.contains(to) && !btn.current?.contains(to)) setOpen(false);
    };
    const el = pop.current;
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', shut, true);
    window.addEventListener('resize', onResize);
    el?.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', shut, true);
      window.removeEventListener('resize', onResize);
      el?.removeEventListener('focusout', onFocusOut);
    };
  }, [open]);

  // Keep the popover inside the viewport: fixed at the star, nudged back on screen.
  useLayoutEffect(() => {
    if (!open || !btn.current || !pop.current) return;
    const b = btn.current.getBoundingClientRect();
    const p = pop.current.getBoundingClientRect();
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.max(8, Math.min(b.left, vw - p.width - 8));
    const below = b.bottom + 6;
    const top = below + p.height <= vh - 8 ? below : Math.max(8, b.top - p.height - 6);
    setPos({ position: 'fixed', left, top });
  }, [open]);

  useEffect(() => {
    if (open) pop.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, [open]);

  if (!state) return null;
  const picked = isPicked(state, slug);
  const full = state.slots.every(Boolean);
  const nameOf = (s: string) => names?.[s] ?? fromSlug(s);

  const click = () => {
    if (picked) {
      update((s) => removePick(s, slug));
      say('Removed from your Top 8');
      return;
    }
    if (full) { setOpen((o) => !o); return; }
    let count = 0;
    update((s) => {
      const next = addPick(knownOnly(s, names), slug).state;
      count = next.slots.filter(Boolean).length;
      return next;
    });
    say(`Added to your Top 8 · ${count}/8`);
  };

  const replace = (i: number) => {
    const old = state.slots[i] as string;
    update((s) => replacePick(knownOnly(s, names), i, slug));
    say(`Replaced ${nameOf(old)} with ${title}`);
    setOpen(false);
    btn.current?.focus();
  };

  const label = picked ? `Remove ${title} from your Top 8` : `Add ${title} to your Top 8`;
  return (
    <span className={`s-star s-star-${variant}${picked ? ' is-on' : ''}`}>
      <button ref={btn} type="button" className="s-star-btn" aria-pressed={picked} aria-label={label}
        aria-haspopup={!picked && full ? 'dialog' : undefined} aria-expanded={open || undefined} onClick={click}>
        {variant === 'page' ? (picked ? '★ In your Top 8' : '☆ Add to my Top 8') : <span aria-hidden="true">{picked ? '★' : '☆'}</span>}
      </button>
      {open && createPortal(
        // React bubbles portal events through the React tree: stop clicks and keys here so a tile's own handlers (tap
        // preview, card toggles) never see them. Esc is handled here because it no longer reaches the document.
        <div ref={pop} className="wb s-star-pop" role="dialog" aria-label="Your Top 8 is full. Replace which?" style={pos}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); }
          }}>
          <p className="s-star-pop-t" aria-hidden="true">Top 8 is full. Replace which?</p>
          <div className="s-star-pop-grid">
            {state.slots.map((s, i) => s && (
              <button key={s} type="button" className="s-star-pick" aria-label={`Replace ${nameOf(s)}`} onClick={() => replace(i)}>
                <Cover src={`/snes/thumb/${s}.jpg`} title={nameOf(s)} width={96} height={67} />
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </span>
  );
});
