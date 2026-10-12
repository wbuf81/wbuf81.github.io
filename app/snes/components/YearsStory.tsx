'use client';

import { useEffect, useState } from 'react';
import { ageAt, gradeName, schoolGrade, story, WES_BIRTH_YEAR } from '@/lib/snes/years';
import { SHORT_MONTHS } from '@/lib/snes/display';

// "Your SNES years": a birth year turns the era into a personal story (Wes's 1981 version by default). The year is
// remembered in this browser; if storage is blocked the story still works. The field is a plain text input so typing
// a year digit by digit feels natural: the story follows the last valid year, and blur tidies the field back to it.
const KEY = 'snes-birth-year';
const MIN = 1965, MAX = 2012;
const valid = (v: string) => (/^\d{4}$/.test(v.trim()) && Number(v) >= MIN && Number(v) <= MAX ? Number(v) : null);

export type Milestone = { slug: string; text: string; date: string };

export default function YearsStory({ milestones, onJump }: { milestones: Milestone[]; onJump: (date: string) => void }) {
  const [year, setYear] = useState(WES_BIRTH_YEAR);
  const [text, setText] = useState(String(WES_BIRTH_YEAR));
  useEffect(() => {
    try {
      const saved = valid(localStorage.getItem(KEY) ?? '');
      if (saved) { setYear(saved); setText(String(saved)); }
    } catch { /* storage blocked: keep 1981 */ }
  }, []);
  const change = (v: string) => {
    setText(v);
    const n = valid(v);
    if (n === null) return;
    setYear(n);
    try { localStorage.setItem(KEY, String(n)); } catch { /* storage blocked */ }
  };
  const s = story(year);
  return (
    <section className="s-tm-years" aria-label="Your SNES years">
      <div className="s-tm-born">
        <label htmlFor="tm-born"><b>📼 Your SNES years.</b> Born in </label>
        <input
          id="tm-born" type="text" inputMode="numeric" autoComplete="off" maxLength={4} pattern="[0-9]{4}"
          value={text} onChange={(e) => change(e.target.value)} onBlur={() => setText(String(year))}
          aria-describedby="tm-born-hint"
        />
        <span id="tm-born-hint" className="s-tm-hint">{MIN}–{MAX}</span>
      </div>
      <p>{s.lead} {s.wes ? <>{s.wes} </> : null}{s.close}</p>
      <div className="s-tm-ms">
        {milestones.map((m) => {
          const [y, mo] = m.date.split('-').map(Number);
          const age = ageAt(year, m.date);
          const who = age < 0 ? 'before you were born' : `you were ${age}, ${gradeName(schoolGrade(year, m.date))}`;
          return (
            <button key={m.slug} type="button" onClick={() => onJump(m.date)}>
              <b>{SHORT_MONTHS[mo - 1]} {y}</b> · {m.text}: {who}
            </button>
          );
        })}
      </div>
    </section>
  );
}
