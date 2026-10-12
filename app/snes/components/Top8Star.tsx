'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { addPick, isPicked, removePick, replacePick } from '../../../lib/snes/top8.ts';
import { useTop8 } from '../top8/store';
import { useToast } from './toast';

type Props = {
  slug: string;
  title: string;
  variant: 'tile' | 'page';
  onToast?: (msg: string) => void;
  /** Titles for the replace popover's covers (slug → title). Falls back to the slug, title-cased. */
  titles?: Record<string, string>;
};

const fromSlug = (slug: string) => slug.split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

// The add-to-Top-8 star. A sibling of the tile's link (never inside it). Renders nothing until mounted.
export function Top8Star({ slug, title, variant, onToast, titles }: Props) {
  const [state, update] = useTop8();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<CSSProperties>({});
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const own = useToast();
  const say = onToast ?? own.show;

  useEffect(() => {
    if (!open) return;
    const close = () => { setOpen(false); btn.current?.focus(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onDown = (e: Event) => {
      const t = e.target as Node;
      if (pop.current?.contains(t) || btn.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
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
    if (open) pop.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [open]);

  if (!state) return null;
  const picked = isPicked(state, slug);
  const nameOf = (s: string) => titles?.[s] ?? fromSlug(s);

  const click = () => {
    if (picked) {
      update((s) => removePick(s, slug));
      say(`Removed ${title} from your Top 8`);
      return;
    }
    if (state.slots.every(Boolean)) { setOpen((o) => !o); return; }
    update((s) => addPick(s, slug).state);
    say(`Added ${title} to your Top 8`);
  };

  const replace = (i: number) => {
    const old = state.slots[i] as string;
    update((s) => replacePick(s, i, slug));
    say(`Replaced ${nameOf(old)} with ${title}`);
    setOpen(false);
    btn.current?.focus();
  };

  const label = picked ? `Remove ${title} from your Top 8` : `Add ${title} to your Top 8`;
  return (
    <span className={`s-star s-star-${variant}${picked ? ' is-on' : ''}`}>
      <button ref={btn} type="button" className="s-star-btn" aria-pressed={picked} aria-label={label}
        aria-haspopup={picked ? undefined : 'dialog'} aria-expanded={open || undefined} onClick={click}>
        {variant === 'page' ? (picked ? '★ In your Top 8' : '☆ Add to my Top 8') : <span aria-hidden="true">{picked ? '★' : '☆'}</span>}
      </button>
      {open && (
        <div ref={pop} className="s-star-pop" role="dialog" aria-label="Your Top 8 is full. Replace which?" style={pos}>
          <p className="s-star-pop-t" aria-hidden="true">Top 8 is full. Replace which?</p>
          <div className="s-star-pop-grid">
            {state.slots.map((s, i) => s && (
              <button key={s} type="button" className="s-star-pick" aria-label={`Replace ${nameOf(s)}`} onClick={() => replace(i)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/snes/thumb/${s}.jpg`} alt="" width={48} height={34} loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
      {onToast ? null : own.node}
    </span>
  );
}
