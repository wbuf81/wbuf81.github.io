'use client';

import { useMemo, useState } from 'react';
import type { HealthCalorieTarget, HealthDatedTargets, HealthDay, PhaseSummary, WeeklyTrendRow } from '@/types/health';
import MacrosCard from './MacrosCard';
import PaceChart from './PaceChart';
import SectionHeader from './SectionHeader';
import StepsCard from './StepsCard';
import WeightTrend from './WeightTrend';
import { RANGE_LABELS, type TrendRangeKey, rangeKeys, trendRange } from './trendRange';

interface Props {
  eyebrow: string;
  title: string;
  days: HealthDay[];
  weeklyTrend: WeeklyTrendRow[];
  phases: PhaseSummary[];
  /** The block the newest data falls in (lib/health › leadPhase). */
  leadPhase: PhaseSummary | null;
  calorieTargets: HealthCalorieTarget[];
  targets: HealthDatedTargets[];
  weightUnit: string;
}

/**
 * The Trends page: its header with the range switch (8 weeks · This block · Everything, default 8 weeks), then the
 * cards it redraws: weight, pounds per week, steps and macros. The pattern cards, which always read everything, are on
 * Patterns. Takes derived data as props: lib/health reads the filesystem and cannot come to the browser.
 */
export default function Trends({ eyebrow, title, days, weeklyTrend, phases, leadPhase, calorieTargets, targets, weightUnit }: Props) {
  const keys = useMemo(() => rangeKeys(days, phases), [days, phases]);
  const [key, setKey] = useState<TrendRangeKey>('w8');
  const range = useMemo(() => trendRange(days, keys.includes(key) ? key : 'w8', phases), [days, key, keys, phases]);

  return (
    <>
      <SectionHeader eyebrow={eyebrow} title={title}>
        <div className="h-seg" role="group" aria-label="How far back">
          {keys.map((k) => (
            <button key={k} type="button" aria-pressed={range.key === k} onClick={() => setKey(k)}>
              {RANGE_LABELS[k]}
            </button>
          ))}
        </div>
      </SectionHeader>
      <WeightTrend range={range} weeklyTrend={weeklyTrend} phases={phases} calorieTargets={calorieTargets} lead={leadPhase} weightUnit={weightUnit} />
      <PaceChart range={range} weeklyTrend={weeklyTrend} phases={phases} lead={leadPhase} weightUnit={weightUnit} />
      <div className="h-pair">
        <StepsCard range={range} weeklyTrend={weeklyTrend} phases={phases} targets={targets} />
        <MacrosCard range={range} weeklyTrend={weeklyTrend} phases={phases} targets={targets} />
      </div>
    </>
  );
}
