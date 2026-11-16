'use client';

import { useMemo, useState } from 'react';
import type { HealthCalorieTarget, HealthDatedTargets, HealthDay, PhaseSummary, StepStreaks, WeeklyTrendRow } from '@/types/health';
import MacrosCard from './MacrosCard';
import NextMorning from './NextMorning';
import PaceChart from './PaceChart';
import SectionHeader from './SectionHeader';
import StepsCard from './StepsCard';
import WeekByDay from './WeekByDay';
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
  stepStreaks: StepStreaks;
  weightUnit: string;
}

/**
 * The Trends page: its header with the range switch (8 weeks · This block · Everything, default 8 weeks), then every
 * Trends card. Weight, pounds per week, steps and macros follow the range; the pattern cards always read everything. Takes derived
 * data as props: lib/health reads the filesystem and cannot come to the browser.
 */
export default function Trends({ eyebrow, title, days, weeklyTrend, phases, leadPhase, calorieTargets, targets, stepStreaks, weightUnit }: Props) {
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
      <NextMorning days={days} calorieTargets={calorieTargets} weightUnit={weightUnit} />
      <WeekByDay days={days} calorieTargets={calorieTargets} targets={targets} weightUnit={weightUnit} />
      <div className="h-pair">
        <StepsCard range={range} weeklyTrend={weeklyTrend} phases={phases} targets={targets} streaks={stepStreaks} />
        <MacrosCard range={range} weeklyTrend={weeklyTrend} phases={phases} targets={targets} />
      </div>
    </>
  );
}
