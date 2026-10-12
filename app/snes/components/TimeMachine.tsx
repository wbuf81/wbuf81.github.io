'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { PopItem, Week } from '@/lib/snes/types';
import { gamesForWeek, weekIndexFor } from '@/lib/snes/weeks';
import { toToday } from '@/lib/snes/money';
import { gamePath } from '@/lib/snes/routes';
import { MONTHS, SHORT_MONTHS } from '@/lib/snes/display';
import Paper from './Paper';
import YearsStory, { type Milestone } from './YearsStory';

// The SNES Time Machine: every week of the era on a CRT "screen". One piece of state, the week index, drives the
// screen; the VCR deck is a sibling of the screen (not a child), so scrubbing never re-mounts the slider. The week
// lives in ?w= so a week can be shared; a plain URL stays plain until the visitor moves.
export type TmGame = { slug: string; title: string; releasedUS: string; datePrecision: string; boxArt: string | null };
export type TmPrices = { console: { usd: number; year: number }; games: Record<string, { usd: number; year: number }> };

const DATE = /^\d{4}-\d{2}(-\d{2})?$/;
const MONTH_CAP = 12;
const wiki = (article: string | null) => (article ? `https://en.wikipedia.org/wiki/${encodeURIComponent(article.replace(/ /g, '_'))}` : undefined);
const led = (iso: string) => { const [y, m, d] = iso.split('-'); return `${SHORT_MONTHS[Number(m) - 1].toUpperCase()}·${d}·${y}`; };
const money = (n: number) => `$${n.toFixed(2)}`;
const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(t.tagName));

function Card({ label, item, sub, poster = false }: { label: string; item: PopItem; sub: string | null; poster?: boolean }) {
  const body = (
    <>
      <span className={`s-tm-art${poster ? ' is-poster' : ''}`}>
        {item.art ? <img src={item.art} alt="" width={240} height={poster ? 360 : 240} loading="lazy" decoding="async" /> : <span className="s-tm-noart">{label}</span>}
      </span>
      <span className="s-tm-k">{label}</span>
      <b className="s-tm-t">{item.title}</b>
      {sub ? <span className="s-tm-by">{sub}</span> : null}
    </>
  );
  const href = wiki(item.article);
  return href
    ? <a className="s-tm-card" href={href} target="_blank" rel="noopener noreferrer">{body}</a>
    : <div className="s-tm-card">{body}</div>;
}

function Cover({ g }: { g: TmGame }) {
  return (
    <Link className="s-tm-cover" href={gamePath(g.slug)} prefetch={false}>
      <span className="s-tm-box">
        {g.boxArt ? <img src={g.boxArt} alt="" width={96} height={67} loading="lazy" decoding="async" /> : <span className="s-tm-noart">{g.title}</span>}
      </span>
      <span className="s-tm-ct">{g.title}</span>
    </Link>
  );
}

function Screen({ weeks, i, games, bySlug, prices }: { weeks: Week[]; i: number; games: TmGame[]; bySlug: Map<string, TmGame>; prices: TmPrices }) {
  const week = weeks[i];
  const shelf = gamesForWeek(games, weeks, i);
  const exact = shelf.exact.map((s) => bySlug.get(s)!);
  const month = shelf.month.map((s) => bySlug.get(s)!);
  const priced = [...shelf.exact, ...shelf.month].find((s) => prices.games[s]);
  const gp = priced ? prices.games[priced] : null;
  const monthName = MONTHS[Number(week.start.slice(5, 7)) - 1];
  return (
    <>
      <div className="s-tm-top" aria-live="polite">
        <div>
          <span className="s-tm-wo">Week of</span>
          <time className="s-tm-led" dateTime={week.start}>{led(week.start)}</time>
        </div>
        <span className="s-tm-n">Week {i + 1} of {weeks.length}</span>
      </div>
      <div className="s-tm-cards">
        <Card label="#1 song" item={week.song} sub={week.song.by} />
        <Card label="#1 album" item={week.album} sub={week.album.by} />
        <Card label="#1 movie" item={week.film} sub={week.film.gross ? `${week.film.gross} weekend` : null} poster />
        <div className="s-tm-card s-tm-price">
          <span className="s-tm-k">Price check</span>
          <p>💵 A Super NES: {money(prices.console.usd)} · about ${toToday(prices.console.usd, prices.console.year)} in today&rsquo;s money</p>
          {gp && priced ? (
            <p>🎮 {bySlug.get(priced)!.title}: {money(gp.usd)} in a {gp.year} catalog · about ${toToday(gp.usd, gp.year)} today</p>
          ) : null}
        </div>
      </div>
      <Paper week={week} weekNumber={i + 1} />
      <div className="s-tm-shelf">
        {exact.length ? (
          <>
            <h2 className="s-tm-sh">On SNES shelves this week · {exact.length}</h2>
            <div className="s-tm-covers">{exact.map((g) => <Cover key={g.slug} g={g} />)}</div>
          </>
        ) : null}
        {month.length ? (
          <>
            <h2 className="s-tm-sh">{`Also out in ${monthName} (exact day unknown) · ${month.length}`}</h2>
            <div className="s-tm-covers">
              {month.slice(0, MONTH_CAP).map((g) => <Cover key={g.slug} g={g} />)}
              {month.length > MONTH_CAP ? <span className="s-tm-more">+{month.length - MONTH_CAP} more</span> : null}
            </div>
          </>
        ) : null}
        {!exact.length && !month.length ? <p className="s-tm-sh">No new SNES games this week.</p> : null}
      </div>
    </>
  );
}

const Deck = memo(function Deck({ i, max, ticks, go }: { i: number; max: number; ticks: { label: string; at: number }[]; go: (n: number) => void }) {
  return (
    <div className="s-tm-deck" role="group" aria-label="VCR controls">
      <button type="button" className="s-tm-prev" aria-label="Previous week" onClick={() => go(i - 1)} disabled={i <= 0}>◀◀</button>
      <div className="s-tm-scrub">
        <input type="range" aria-label="Scrub through the weeks" min={0} max={max} value={i} onChange={(e) => go(Number(e.target.value))} />
        <div className="s-tm-ticks" aria-hidden="true">
          {ticks.map((t) => <span key={t.label} style={{ left: `${t.at}%` }}>{t.label}</span>)}
        </div>
      </div>
      <button type="button" className="s-tm-next" aria-label="Next week" onClick={() => go(i + 1)} disabled={i >= max}>▶▶</button>
      <button type="button" className="s-tm-rand" aria-label="Random week" onClick={() => go(Math.floor(Math.random() * (max + 1)))}>⏏</button>
    </div>
  );
});

export default function TimeMachine({ weeks, games, milestones, prices }: { weeks: Week[]; games: TmGame[]; milestones: Milestone[]; prices: TmPrices }) {
  const [i, setI] = useState(0);
  const max = weeks.length - 1;
  const screenRef = useRef<HTMLElement>(null);
  const moved = useRef(false);
  const bySlug = useMemo(() => new Map(games.map((g) => [g.slug, g])), [games]);
  // Year labels sit in the middle of each year's stretch of the slider ('91 is only the last 19 weeks of 1991).
  const ticks = useMemo(() => {
    const out: { label: string; at: number }[] = [];
    const first = Number(weeks[0].start.slice(0, 4)), last = Number(weeks[max].start.slice(0, 4));
    const startOf = (y: number) => (y === first ? 0 : weekIndexFor(weeks, `${y - 1}-12-31`) + 1);
    for (let y = first; y <= last; y++) {
      const mid = (startOf(y) + (y === last ? max : startOf(y + 1) - 1)) / 2;
      out.push({ label: `’${String(y).slice(2)}`, at: max ? (mid / max) * 100 : 0 });
    }
    return out;
  }, [weeks, max]);

  const go = useCallback((n: number) => { moved.current = true; setI(Math.max(0, Math.min(max, n))); }, [max]);

  // Open the week named in ?w= (after mount, so the static HTML stays the launch week).
  useEffect(() => {
    const w = new URLSearchParams(window.location.search).get('w');
    if (w && DATE.test(w)) setI(weekIndexFor(weeks, w));
  }, [weeks]);

  // Keep ?w= in step once the visitor has moved.
  useEffect(() => {
    if (moved.current) window.history.replaceState(null, '', `?w=${weeks[i].start}`);
  }, [i, weeks]);

  // ←/→ step a week, unless the visitor is typing or using a control, or holding a modifier.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isTyping(e.target)) return;
      if (e.key === 'ArrowLeft') setI((n) => { moved.current = true; return Math.max(0, n - 1); });
      else if (e.key === 'ArrowRight') setI((n) => { moved.current = true; return Math.min(max, n + 1); });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [max]);

  const jump = useCallback((date: string) => {
    go(weekIndexFor(weeks, date));
    screenRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [go, weeks]);

  return (
    <div className="s-tm">
      <YearsStory milestones={milestones} onJump={jump} />
      <div className="s-tm-tv">
        <section className="s-tm-screen" ref={screenRef} aria-label="The week on screen">
          <Screen weeks={weeks} i={i} games={games} bySlug={bySlug} prices={prices} />
        </section>
        <Deck i={i} max={max} ticks={ticks} go={go} />
      </div>
    </div>
  );
}
