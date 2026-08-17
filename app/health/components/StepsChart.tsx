'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HealthDatedTargets, HealthDay } from '@/types/health';
import { dayTickLabel } from '@/lib/dayLabel';
import { targetsFor } from '@/lib/targets';
import ChartTooltip from './ChartTooltip';
import {
  ANIMATE,
  DAILY_MARGIN,
  DAILY_Y_WIDTH,
  MUTED_MARK,
  SERIES,
  TEXT_SECONDARY,
  axisProps,
  cleanAxis,
  formatNumber,
  gridProps,
} from './chartTheme';

interface Props {
  days: HealthDay[];
  /** All-time daily average, so the line reads as a standard rather than moving with the bars. */
  average: number | null;
  /**
   * Dated goal revisions. The floor and target are drawn per day and step when
   * a revision changes them, so a goal set later is never drawn across the weeks
   * that came before it.
   */
  targets?: HealthDatedTargets[];
}

export default function StepsChart({ days, average, targets }: Props) {
  const data = days.map((day) => {
    const inForce = targetsFor(day.date, targets);
    return {
      label: dayTickLabel(day),
      steps: day.steps,
      min: inForce?.stepsMinimum ?? null,
      goal: inForce?.stepsGoal ?? null,
    };
  });

  const hasMin = data.some((point) => point.min !== null);
  const hasGoal = data.some((point) => point.goal !== null);

  const peak = Math.max(
    ...days.map((d) => d.steps ?? 0),
    average ?? 0,
    ...data.map((point) => Math.max(point.min ?? 0, point.goal ?? 0))
  );
  const { domain, ticks } = cleanAxis(peak, 5000);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={DAILY_MARGIN}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis
          {...axisProps}
          width={DAILY_Y_WIDTH}
          domain={domain}
          ticks={ticks}
          tickFormatter={(value: number) => (value === 0 ? '0' : `${formatNumber(value / 1000)}k`)}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />

        {average !== null && (
          <ReferenceLine
            y={average}
            stroke={TEXT_SECONDARY}
            strokeWidth={1}
          />
        )}

        <Bar
          dataKey="steps"
          name="Steps"
          fill={SERIES.blue}
          maxBarSize={24}
          radius={[4, 4, 0, 0]}
          isAnimationActive={ANIMATE}
        />

        {/*
          Drawn after the bars so both rules read on top of them, and stepped so
          a revision moves the line on the day it took effect. Neutral inks
          rather than the series blue, which the bars already use: the floor is
          the lighter of the two because clearing it is the baseline, not the win.
        */}
        {hasMin && (
          <Line
            type="stepAfter"
            dataKey="min"
            name="Floor"
            stroke={MUTED_MARK}
            strokeWidth={1}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            connectNulls={false}
            isAnimationActive={ANIMATE}
          />
        )}

        {hasGoal && (
          <Line
            type="stepAfter"
            dataKey="goal"
            name="Goal"
            stroke={TEXT_SECONDARY}
            strokeWidth={1}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            connectNulls={false}
            isAnimationActive={ANIMATE}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
