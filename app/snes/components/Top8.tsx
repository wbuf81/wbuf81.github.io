'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors,
  type Announcements, type DragEndEvent, type PointerActivationConstraint, type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  EMPTY_STATE, THEME_IDS, cleanName, parseQuery, recommend, toQuery,
  type ThemeId, type Top8Game, type Top8State,
} from '@/lib/snes/top8';
import { SIZE, drawTop8, loadThemeFonts, type Fonts } from '../top8/render';
import { THEMES } from '../top8/themes';
import { orbitron, pressStart, vt323 } from '../fonts';

// The SNES Top 8 maker: MySpace boxes for the profile, the 8 slots and friend requests, beside a live 1080x1080
// canvas that is also the saved picture. The first render is EMPTY_STATE on server and client alike; the link or
// storage is read after mount. Every change is saved, and the URL follows once the visitor has edited.

const STORE = 'snes-top8';
const FILE = 'my-snes-top-8.png';
const MAX_RESULTS = 12;
const box = (slug: string) => `/snes/box/${slug}.jpg`;
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Moves one slot and shifts the rest, empties included (the drag's onDragEnd). */
export function moveSlot(slots: (string | null)[], from: number, to: number): (string | null)[] {
  return arrayMove(slots, from, to);
}

function readStored(known: Set<string>): Top8State | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!raw || !Array.isArray(raw.slots)) return null;
    const seen = new Set<string>();
    const slots = Array.from({ length: 8 }, (_, i) => {
      const s = raw.slots[i];
      if (typeof s !== 'string' || !known.has(s) || seen.has(s)) return null;
      seen.add(s);
      return s;
    });
    const theme: ThemeId = (THEME_IDS as readonly string[]).includes(raw.theme) ? raw.theme : EMPTY_STATE.theme;
    const name = typeof raw.name === 'string' ? cleanName(raw.name) : '';
    const denied = Array.isArray(raw.denied) ? raw.denied.filter((s: unknown): s is string => typeof s === 'string' && known.has(s)) : [];
    return { slots, theme, name, denied };
  } catch {
    return null;
  }
}

function siteFonts(): Fonts {
  let sans = '', mono = '';
  try {
    const cs = getComputedStyle(document.documentElement);
    sans = cs.getPropertyValue('--font-sans').trim();
    mono = cs.getPropertyValue('--font-mono').trim();
  } catch { /* fall back below */ }
  const fam = (f: { style?: { fontFamily?: string } }, fb: string) => f.style?.fontFamily || fb;
  return {
    sans: sans ? `${sans}, system-ui, sans-serif` : 'IBM Plex Sans, system-ui, sans-serif',
    mono: mono ? `${mono}, ui-monospace, monospace` : 'IBM Plex Mono, ui-monospace, monospace',
    vt: fam(vt323, 'VT323, ui-monospace, monospace'),
    pixel: fam(pressStart, '"Press Start 2P", ui-monospace, monospace'),
    orbit: fam(orbitron, 'Orbitron, system-ui, sans-serif'),
  };
}

// Mouse and pen only: touch goes through the TouchSensor's press-and-hold, so a swipe over the grid still scrolls.
class MousePointerSensor extends PointerSensor {
  static activators = [{
    eventName: 'onPointerDown' as const,
    handler: ({ nativeEvent: e }: { nativeEvent: PointerEvent }) => e.isPrimary !== false && e.button === 0 && e.pointerType !== 'touch',
  }];
}
const POINTER: PointerActivationConstraint = { distance: 6 };

type SlotProps = {
  id: string; index: number; slug: string | null; title: string | null; replacing: string | null;
  onReplace: (i: number) => void; onRemove: (i: number) => void; onEmpty: () => void;
};

function Slot({ id, index, slug, title, replacing, onReplace, onRemove, onEmpty }: SlotProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id, disabled: replacing ? true : { draggable: !slug, droppable: false },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const n = index + 1;
  const cls = `s-t8-slot${slug ? ' is-full' : ''}${replacing ? ' is-pick' : ''}${isDragging ? ' is-drag' : ''}`;
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (replacing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onReplace(index); return; }
    if (!slug && !replacing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onEmpty(); return; }
    listeners?.onKeyDown?.(e);
  };
  return (
    <li className={cls} ref={setNodeRef} style={style} data-t8-slot={index}>
      <div
        className="s-t8-handle"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        aria-disabled={undefined}
        aria-roledescription={slug ? attributes['aria-roledescription'] : undefined}
        aria-describedby={slug ? attributes['aria-describedby'] : undefined}
        aria-label={`Slot ${n}: ${title ?? 'empty, add a friend'}`}
        onKeyDown={onKeyDown}
        onClick={() => (replacing ? onReplace(index) : !slug ? onEmpty() : undefined)}
      >
        <span className="s-t8-rank" aria-hidden="true">{n}</span>
        {slug ? (
          <>
            <img src={box(slug)} alt="" width={300} height={209} loading="lazy" decoding="async" draggable={false} />
            <span className="s-t8-nm">{title}</span>
          </>
        ) : <span className="s-t8-add">Add a friend</span>}
      </div>
      {slug && !replacing ? (
        <button type="button" className="s-t8-x" aria-label={`Remove ${title}`} onClick={() => onRemove(index)} onPointerDown={(e) => e.stopPropagation()}>
          <span aria-hidden="true">✕</span>
        </button>
      ) : null}
    </li>
  );
}

export default function Top8({ games }: { games: Top8Game[] }) {
  const bySlug = useMemo(() => new Map(games.map((g) => [g.slug, g])), [games]);
  const known = useMemo(() => new Set(games.map((g) => g.slug)), [games]);
  const titles = useMemo(() => Object.fromEntries(games.map((g) => [g.slug, g.title])), [games]);
  const index = useMemo(() => games.map((g) => ({ g, n: norm(g.title) })), [games]);
  const titleOf = useCallback((s: string) => bySlug.get(s)?.title ?? s, [bySlug]);

  const [state, setState] = useState<Top8State>(EMPTY_STATE);
  const [nameDraft, setNameDraft] = useState('');
  const [ready, setReady] = useState(false);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const edited = useRef(false);

  // ---- state: load after mount, save every change, follow in the URL once edited ----
  useEffect(() => {
    const fromLink = parseQuery(window.location.search, known);
    const stored = readStored(known);
    const next = fromLink ? { ...EMPTY_STATE, denied: stored?.denied ?? [], ...fromLink } : stored ?? EMPTY_STATE;
    setState(next);
    setNameDraft(next.name);
    setReady(true);
    try {
      const probe = new File([''], FILE, { type: 'image/png' });
      setCanShare(typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] }));
    } catch { setCanShare(false); }
  }, [known]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* storage blocked: the session still works */ }
    if (edited.current) window.history.replaceState(null, '', toQuery(state));
  }, [state, ready]);

  const update = useCallback((fn: (s: Top8State) => Top8State) => { edited.current = true; setState(fn); }, []);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const say = useCallback((t: string) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const add = useCallback((slug: string) => {
    if (state.slots.includes(slug)) { say('Already in your Top 8'); return; }
    const i = state.slots.indexOf(null);
    if (i < 0) { setReplacing(slug); return; }
    update((s) => ({ ...s, slots: s.slots.map((x, k) => (k === i ? slug : x)) }));
  }, [state.slots, say, update]);

  const replaceAt = useCallback((i: number) => {
    if (!replacing) return;
    const slug = replacing;
    setReplacing(null);
    update((s) => ({ ...s, slots: s.slots.map((x, k) => (k === i ? slug : x)) }));
  }, [replacing, update]);

  useEffect(() => {
    if (!replacing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setReplacing(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [replacing]);

  // ---- search combobox ----
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => {
    const words = norm(q).split(' ').filter(Boolean);
    if (norm(q).length < 2) return [];
    const ranked: { g: Top8Game; r: number; i: number }[] = [];
    index.forEach(({ g, n }, i) => {
      if (!words.every((w) => n.includes(w))) return;
      const parts = n.split(' ');
      const whole = words.every((w) => parts.includes(w)) ? 2 : 0;
      ranked.push({ g, r: whole + (n.startsWith(words[0]) ? 1 : 0), i });
    });
    return ranked.sort((a, b) => b.r - a.r || a.i - b.i).slice(0, MAX_RESULTS).map((x) => x.g);
  }, [q, index]);
  const listOpen = open && results.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!searchRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const pick = (slug: string) => {
    add(slug);
    setQ('');
    setOpen(false);
    inputRef.current?.focus();
  };
  const onSearchKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { if (open) { e.stopPropagation(); setOpen(false); } return; }
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => (listOpen ? (a + 1) % results.length : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); setActive((a) => (a - 1 + results.length) % results.length); }
    else if (e.key === 'Enter' && listOpen) { e.preventDefault(); pick(results[Math.min(active, results.length - 1)].slug); }
  };

  // ---- friend requests ----
  const recs = useMemo(() => recommend(state, games), [state, games]);

  // ---- drag and drop ----
  const ids = useMemo(() => state.slots.map((s, i) => s ?? `_${i}`), [state.slots]);
  const sensors = useSensors(
    useSensor(MousePointerSensor, { activationConstraint: POINTER }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const pos = (id: UniqueIdentifier) => ids.indexOf(String(id)) + 1;
  // dnd-kit reports the starting slot as an "over" right after pick-up; skip repeats so "Picked up…" is heard.
  const lastOver = useRef<UniqueIdentifier | null>(null);
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => { lastOver.current = a.id; return `Picked up ${titleOf(String(a.id))}, slot ${pos(a.id)}.`; },
    onDragOver: ({ active: a, over }) => {
      const id = over?.id ?? null;
      if (id === lastOver.current) return undefined;
      lastOver.current = id;
      return over ? `${titleOf(String(a.id))} moved to slot ${pos(over.id)}.` : `${titleOf(String(a.id))} is not over a slot.`;
    },
    onDragEnd: ({ active: a, over }) => (over ? `Dropped ${titleOf(String(a.id))} in slot ${pos(over.id)}.` : `Dropped ${titleOf(String(a.id))}.`),
    onDragCancel: ({ active: a }) => `Cancelled. ${titleOf(String(a.id))} stays in slot ${pos(a.id)}.`,
  };
  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    if (!over || a.id === over.id) return;
    const from = ids.indexOf(String(a.id)), to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    update((s) => ({ ...s, slots: moveSlot(s.slots, from, to) }));
  };

  // ---- the picture ----
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useRef(new Map<string, HTMLImageElement>());
  const fonts = useRef<Fonts | null>(null);
  const [fontsFor, setFontsFor] = useState<ThemeId | null>(null);
  const frame = useRef(0);
  const latest = useRef(state);
  latest.current = state;

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!ctx || !fonts.current) return;
    const s = latest.current;
    const imgs: Record<string, HTMLImageElement> = {};
    for (const slug of s.slots) {
      if (!slug) continue;
      let img = images.current.get(slug);
      if (!img) {
        img = new Image();
        img.onload = img.onerror = () => scheduleRef.current();
        img.src = box(slug);
        images.current.set(slug, img);
      }
      imgs[slug] = img;
    }
    drawTop8({ ctx, slots: s.slots, titles, name: s.name, images: imgs, fonts: fonts.current }, THEMES[s.theme]);
  }, [titles]);
  const schedule = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => draw());
  }, [draw]);
  // A cover that arrives later redraws through the current scheduler.
  const scheduleRef = useRef(schedule);
  scheduleRef.current = schedule;

  useEffect(() => {
    let live = true;
    fonts.current ??= siteFonts();
    loadThemeFonts(THEMES[state.theme], fonts.current).then(() => { if (live) setFontsFor(state.theme); });
    return () => { live = false; };
  }, [state.theme]);

  useEffect(() => {
    if (fontsFor === null) return;
    schedule();
    return () => cancelAnimationFrame(frame.current);
  }, [state, fontsFor, schedule]);

  const toBlob = (cb: (b: Blob | null) => void) => {
    const cv = canvasRef.current;
    if (!cv) return cb(null);
    draw();
    try { cv.toBlob(cb, 'image/png'); } catch { cb(null); }
  };
  const save = () => toBlob((blob) => {
    if (!blob) { say('Couldn’t make the picture — try Save again'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = FILE;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });
  const shareUrl = () => `${window.location.origin}${window.location.pathname}${toQuery(state)}`;
  const share = () => toBlob(async (blob) => {
    if (!blob) { say('Couldn’t make the picture — try Save again'); return; }
    try {
      await navigator.share({ files: [new File([blob], FILE, { type: 'image/png' })], title: 'My SNES Top 8', url: shareUrl() });
    } catch { /* cancelled or refused: nothing to do */ }
  });
  const copy = async () => {
    const url = shareUrl();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('no clipboard');
      await navigator.clipboard.writeText(url);
      setFallbackUrl(null);
      say('Link copied');
    } catch {
      setFallbackUrl(url);
    }
  };
  const fallbackRef = useRef<HTMLInputElement>(null);
  // A shown link goes stale as soon as the list changes.
  useEffect(() => setFallbackUrl(null), [state]);
  useEffect(() => { if (fallbackUrl) { fallbackRef.current?.focus(); fallbackRef.current?.select(); } }, [fallbackUrl]);

  const filled = state.slots.filter(Boolean).length;
  const reqTitle = recs.length ? `You have ${recs.length} new friend request${recs.length === 1 ? '' : 's'}!` : 'No friend requests';

  return (
    <div className="s-t8">
      <div className="s-t8-col">
        <section className="s-t8-box" aria-labelledby="t8-profile">
          <h2 className="s-t8-bh" id="t8-profile">Edit profile</h2>
          <div className="s-t8-bb">
            <label className="s-t8-label" htmlFor="t8-name">Display name (optional)</label>
            <input
              id="t8-name" className="s-t8-input" type="text" maxLength={24} autoComplete="off" placeholder="Wes" value={nameDraft}
              onChange={(e) => { const raw = e.target.value; setNameDraft(raw); update((s) => ({ ...s, name: cleanName(raw) })); }}
            />
            <div className="s-t8-themes" role="group" aria-label="Theme">
              {THEME_IDS.map((id) => (
                <button key={id} type="button" className="s-t8-chip" aria-pressed={state.theme === id} onClick={() => update((s) => ({ ...s, theme: id }))}>
                  {THEMES[id].displayName}
                </button>
              ))}
            </div>
            <div className="s-t8-search" ref={searchRef}>
              <label className="s-t8-label" htmlFor="t8-q">Add a game</label>
              <input
                id="t8-q" ref={inputRef} className="s-t8-input" type="text" autoComplete="off" placeholder={`Search ${games.length} SNES games…`}
                role="combobox" aria-expanded={listOpen} aria-controls="t8-results" aria-autocomplete="list"
                aria-activedescendant={listOpen ? `t8-opt-${active}` : undefined}
                value={q}
                onChange={(e) => { setQ(e.target.value); setActive(0); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onKeyDown={onSearchKey}
              />
              {listOpen ? (
                <ul className="s-t8-results" id="t8-results" role="listbox" aria-label="Matching games">
                  {results.map((g, i) => (
                    <li
                      key={g.slug} id={`t8-opt-${i}`} role="option" aria-selected={i === active} className="s-t8-opt"
                      onMouseDown={(e) => e.preventDefault()} onClick={() => pick(g.slug)} onMouseEnter={() => setActive(i)}
                    >
                      <img src={box(g.slug)} alt="" width={46} height={32} loading="lazy" decoding="async" />
                      <span>{g.title} <small>{g.year}</small></span>
                    </li>
                  ))}
                </ul>
              ) : open && norm(q).length >= 2 ? <p className="s-t8-note s-t8-none">No games match.</p> : null}
            </div>
          </div>
        </section>

        <section className="s-t8-box" aria-labelledby="t8-friends">
          <div className="s-t8-bh">
            <h2 id="t8-friends">{state.name ? `${state.name}'s Friend Space` : 'My Friend Space'}</h2>
            <span>{filled} of 8</span>
          </div>
          <div className="s-t8-bb">
            <DndContext
              id="t8-dnd"
              sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}
              accessibility={{
                announcements,
                screenReaderInstructions: { draggable: 'To move a game, press Space to pick it up. Use the arrow keys to move it, Space to drop it, or Escape to cancel.' },
              }}
            >
              <SortableContext items={ids} strategy={rectSortingStrategy}>
                <ol className="s-t8-slots">
                  {state.slots.map((slug, i) => (
                    <Slot
                      key={ids[i]} id={ids[i]} index={i} slug={slug} title={slug ? titleOf(slug) : null} replacing={replacing}
                      onReplace={replaceAt} onRemove={(k) => update((s) => ({ ...s, slots: s.slots.map((x, j) => (j === k ? null : x)) }))}
                      onEmpty={() => inputRef.current?.focus()}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
            <p className="s-t8-hint" aria-live="polite">
              {replacing ? `Tap a slot to put ${titleOf(replacing)} there. Esc to cancel.` : 'Drag covers to reorder, or focus one and press Space. ✕ removes.'}
            </p>
          </div>
        </section>

        <section className="s-t8-box" aria-labelledby="t8-reqs">
          <h2 className="s-t8-bh" id="t8-reqs">{reqTitle}</h2>
          <div className="s-t8-bb">
            {recs.length ? (
              <ul className="s-t8-reqs">
                {recs.map(({ slug, reason }) => {
                  const g = bySlug.get(slug)!;
                  return (
                    <li key={slug} className="s-t8-req">
                      <img src={box(slug)} alt="" width={72} height={50} loading="lazy" decoding="async" />
                      <div>
                        <b>{g.title}</b>
                        <span>{reason} · {g.year}</span>
                      </div>
                      <div className="s-t8-act">
                        <button type="button" className="s-t8-acc" aria-label={`Accept ${g.title}`} onClick={() => add(slug)}>Accept</button>
                        <button type="button" className="s-t8-den" aria-label={`Deny ${g.title}`} onClick={() => update((s) => ({ ...s, denied: [...s.denied, slug] }))}>Deny</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="s-t8-note">Deny fewer games and more will show up.</p>}
          </div>
        </section>
      </div>

      <section className="s-t8-box s-t8-prev" aria-labelledby="t8-pic">
        <h2 className="s-t8-bh" id="t8-pic">Your Top 8 picture · 1080×1080</h2>
        <div className="s-t8-bb">
          <canvas ref={canvasRef} className="s-t8-canvas" width={SIZE} height={SIZE} role="img" aria-label="Preview of your Top 8 picture" />
          <div className="s-t8-btns">
            <button type="button" className="s-t8-btn" onClick={save}>Save picture</button>
            {canShare ? <button type="button" className="s-t8-btn" onClick={share}>Share</button> : null}
            <button type="button" className="s-t8-btn is-alt" onClick={copy}>Copy link</button>
            {confirming ? (
              <span className="s-t8-confirm">
                Are you sure?{' '}
                <button type="button" className="s-t8-btn is-alt" onClick={() => { update((s) => ({ ...EMPTY_STATE, theme: s.theme })); setNameDraft(''); setReplacing(null); setConfirming(false); }}>Yes, start over</button>
                <button type="button" className="s-t8-btn is-alt" onClick={() => setConfirming(false)}>Keep it</button>
              </span>
            ) : <button type="button" className="s-t8-btn is-alt" onClick={() => setConfirming(true)}>Start over</button>}
          </div>
          {fallbackUrl ? (
            <div className="s-t8-fallback">
              <label className="s-t8-label" htmlFor="t8-link">Link to your Top 8 (copy it from here)</label>
              <input id="t8-link" ref={fallbackRef} className="s-t8-input" type="text" readOnly value={fallbackUrl} onFocus={(e) => e.currentTarget.select()} />
            </div>
          ) : null}
        </div>
      </section>

      <div className="s-t8-toast" role="status" aria-live="polite">{toast ? <span>{toast}</span> : null}</div>
    </div>
  );
}
