'use client';

import { useState } from 'react';
import { HealthChangeEntry, HealthDay, HealthMarker, PhaseSummary, WeeklyTrendRow } from '@/types/health';
import ChangeLog from './ChangeLog';
import DayTable from './DayTable';
import PhaseTable from './PhaseTable';
import WeekTable from './WeekTable';

interface Props {
  trend: WeeklyTrendRow[];
  markers: HealthMarker[];
  changeLog: HealthChangeEntry[];
  days: HealthDay[];
  phases: PhaseSummary[];
  weightUnit: string;
}

type Tab = 'weeks' | 'changes' | 'days' | 'phases';

const NOTES: Record<Tab, string> = {
  weeks: "Every week, newest first. Change compares a week's average weight to the week before.",
  changes: 'Every change to a goal or a block, oldest first. Derived from the data, so it always matches the numbers above.',
  days: 'Every recorded day, newest first. A heavier rule starts each week.',
  phases: 'Every block, and what happened during it.',
};

/** Every number on the page in text form, one table at a time. */
export default function Records({ trend, markers, changeLog, days, phases, weightUnit }: Props) {
  const [tab, setTab] = useState<Tab>('weeks');
  const tabs: { key: Tab; label: string }[] = [
    { key: 'weeks', label: 'By week' },
    ...(changeLog.length > 0 ? [{ key: 'changes' as Tab, label: 'Changes' }] : []),
    { key: 'days', label: 'Every day' },
    ...(phases.length > 1 ? [{ key: 'phases' as Tab, label: 'Phases' }] : []),
  ];

  return (
    <section className="h-card">
      <div className="h-card-h is-center">
        <h2>Records</h2>
        <div className="h-seg" role="group" aria-label="Which table">
          {tabs.map((t) => (
            <button key={t.key} type="button" aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <p className="h-note">{NOTES[tab]}</p>
      {tab === 'weeks' && <WeekTable rows={trend} markers={markers} weightUnit={weightUnit} />}
      {tab === 'changes' && <ChangeLog entries={changeLog} />}
      {tab === 'days' && <DayTable days={days} />}
      {tab === 'phases' && <PhaseTable phases={phases} weightUnit={weightUnit} />}
    </section>
  );
}
