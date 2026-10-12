'use client';

import { useEffect, useRef, useState } from 'react';
import { FIRST_YEAR, LAST_YEAR, type Facets, type Filters, type ScoreFlag, type ViewKey } from '@/lib/snes/library';
import { SoundButton } from './sound';

const VIEW_LABELS: [ViewKey, string][] = [['timeline', 'Timeline'], ['heatmap', 'Heatmap'], ['wall', 'Wall'], ['shelf', 'Shelf'], ['scatter', 'Scatter']];
const SCORE_LABELS: [ScoreFlag, string][] = [['egm', 'Has an EGM score'], ['np', 'Has a Nintendo Power score'], ['egm8', 'EGM average 8+']];
const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

type Props = { filters: Filters; facets: Facets; onChange: (patch: Partial<Filters>) => void; onClear: () => void; hasMultiplayer?: boolean };

// How many filter controls in the panel are set (search, view, sort and the scatter axis are not filters).
export const activeFilterCount = (f: Filters) =>
  [f.years.length, f.publisher, f.developer, f.chip, f.genre, f.players, f.series, f.theme, f.camera, f.mp, f.scores.length, f.launch, f.mine].filter(Boolean).length;

export default function FilterBar({ filters: f, facets, onChange, onClear, hasMultiplayer = false }: Props) {
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (e: Event) => {
      if (bar.current && !bar.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);
  const count = activeFilterCount(f);
  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <div className="s-bar" role="search" ref={bar}>
      <div className="s-bar-row">
        <input className="s-search" type="search" aria-label="Search games" placeholder="Search 717 games…" value={f.q} onChange={(e) => onChange({ q: e.target.value })} />
        <button ref={button} type="button" className={`s-toggle s-filters${count ? ' is-on' : ''}`} aria-expanded={open} aria-controls="s-filter-panel" onClick={() => setOpen((o) => !o)}>
          Filters{count ? ` (${count})` : ''}
        </button>
        {f.view === 'wall' || f.view === 'shelf' ? (
          <select aria-label="Sort" className="s-select" value={f.sort} onChange={(e) => onChange({ sort: e.target.value as Filters['sort'] })}>
            <option value="date">Release date</option>
            <option value="title">Title</option>
            <option value="egm">EGM average</option>
            <option value="np">Nintendo Power</option>
            <option value="aggregate">Aggregate</option>
            <option value="users">Player score</option>
          </select>
        ) : null}
        <SoundButton />
        <div className="s-views" role="tablist" aria-label="View">
          {VIEW_LABELS.map(([v, label]) => (
            <button key={v} type="button" role="tab" aria-selected={f.view === v} onClick={() => onChange({ view: v })}>{label}</button>
          ))}
        </div>
      </div>
      {open ? (
        <div id="s-filter-panel" className="s-panel">
          <details className={`s-dd${f.years.length ? ' is-on' : ''}`}>
            <summary>Year{f.years.length ? ` (${f.years.length})` : ''} ▾</summary>
            <div className="s-pop">
              {YEARS.map((y) => (
                <label key={y}><input type="checkbox" checked={f.years.includes(y)} onChange={() => onChange({ years: toggleIn(f.years, y).sort() })} /> {y}</label>
              ))}
            </div>
          </details>
          <select aria-label="Publisher" className={`s-select${f.publisher ? ' is-on' : ''}`} value={f.publisher ?? ''} onChange={(e) => onChange({ publisher: e.target.value || null })}>
            <option value="">Any publisher</option>
            {facets.publishers.map((p) => <option key={p.slug} value={p.slug}>{p.name} ({p.count})</option>)}
          </select>
          <select aria-label="Developer" className={`s-select${f.developer ? ' is-on' : ''}`} value={f.developer ?? ''} onChange={(e) => onChange({ developer: e.target.value || null })}>
            <option value="">Any developer</option>
            {facets.developers.map((d) => <option key={d.slug} value={d.slug}>{d.name} ({d.count})</option>)}
          </select>
          <select aria-label="Chip" className={`s-select${f.chip ? ' is-on' : ''}`} value={f.chip ?? ''} onChange={(e) => onChange({ chip: e.target.value || null })}>
            <option value="">Any chip</option>
            {facets.chips.map((c) => <option key={c.slug} value={c.slug}>{c.name} ({c.count})</option>)}
          </select>
          {facets.genres.length ? (
            <select aria-label="Genre" className={`s-select${f.genre ? ' is-on' : ''}`} value={f.genre ?? ''} onChange={(e) => onChange({ genre: e.target.value || null })}>
              <option value="">Any genre</option>
              {facets.genres.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          ) : null}
          {facets.players.length ? (
            <select aria-label="Players" className={`s-select${f.players ? ' is-on' : ''}`} value={f.players ?? ''} onChange={(e) => onChange({ players: Number(e.target.value) || null })}>
              <option value="">Any players</option>
              {facets.players.map((n) => <option key={n} value={n}>{n}+ players</option>)}
            </select>
          ) : null}
          {facets.series.length ? (
            <select aria-label="Series" className={`s-select${f.series ? ' is-on' : ''}`} value={f.series ?? ''} onChange={(e) => onChange({ series: e.target.value || null })}>
              <option value="">Any series</option>
              {facets.series.map((s) => <option key={s.slug} value={s.slug}>{s.name} ({s.count})</option>)}
            </select>
          ) : null}
          {facets.themes.length ? (
            <select aria-label="Theme" className={`s-select${f.theme ? ' is-on' : ''}`} value={f.theme ?? ''} onChange={(e) => onChange({ theme: e.target.value || null })}>
              <option value="">Any theme</option>
              {facets.themes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          ) : null}
          {facets.perspectives.length ? (
            <select aria-label="Camera" className={`s-select${f.camera ? ' is-on' : ''}`} value={f.camera ?? ''} onChange={(e) => onChange({ camera: e.target.value || null })}>
              <option value="">Any view</option>
              {facets.perspectives.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : null}
          {hasMultiplayer ? (
            <select aria-label="Multiplayer" className={`s-select${f.mp ? ' is-on' : ''}`} value={f.mp ?? ''} onChange={(e) => onChange({ mp: (e.target.value || null) as Filters['mp'] })}>
              <option value="">Any multiplayer</option>
              <option value="coop">Co-op</option>
              <option value="versus">2+ players</option>
            </select>
          ) : null}
          <details className={`s-dd${f.scores.length ? ' is-on' : ''}`}>
            <summary>Scores{f.scores.length ? ` (${f.scores.length})` : ''} ▾</summary>
            <div className="s-pop">
              {SCORE_LABELS.map(([k, label]) => (
                <label key={k}><input type="checkbox" checked={f.scores.includes(k)} onChange={() => onChange({ scores: toggleIn(f.scores, k) })} /> {label}</label>
              ))}
            </div>
          </details>
          <button type="button" className="s-toggle" aria-pressed={f.launch} onClick={() => onChange({ launch: !f.launch })}>Launch day</button>
          <button type="button" className="s-toggle" aria-pressed={f.mine} onClick={() => onChange({ mine: !f.mine })}>★ In my Top 8</button>
          <button type="button" className="s-clear" onClick={onClear}>Clear filters</button>
        </div>
      ) : null}
    </div>
  );
}
