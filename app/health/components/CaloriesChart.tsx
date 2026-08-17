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
import { HealthCalorieTarget, HealthDay } from '@/types/health';
import { calorieTargetFor } from '@/lib/calorieTarget';
import { dayTickLabel } from '@/lib/dayLabel';
import ChartTooltip from './ChartTooltip';
import {
  ANIMATE,
  DAILY_MARGIN,
  DAILY_Y_WIDTH,
  SERIES,
  TEXT_SECONDARY,
  axisProps,
  cleanAxis,
  formatNumber,
  gridProps,
} from './chartTheme';

interface Props {
  days: HealthDay[];
  average: number | null;
  /** Dated daily targets. The rule steps when the target changes. */
  calorieTargets?: HealthCalorieTarget[];
}

/**
 * Calories are their own chart rather than a line over the macro grams: grams
 * and kcal are different scales, and overlaying them would mean a second y-axis.
 *
 * The target is a stepped line rather than a flat reference rule, because it
 * changes mid-block — a single rule would silently score early days against a
 * number that wasn't in force yet.
 */
export default function CaloriesChart({ days, average, calorieTargets }: Props) {
  const data = days.map((day) => ({
    label: dayTickLabel(day),
    cals: day.cals,
    goal: calorieTargetFor(day.date, calorieTargets),
  }));

  const hasGoal = data.some((point) => point.goal !== null);

  const peak = Math.max(
    ...days.map((d) => d.cals ?? 0),
    average ?? 0,
    ...data.map((point) => point.goal ?? 0)
  );
  const { domain, ticks } = cleanAxis(peak, 1000);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={DAILY_MARGIN}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis
          {...axisProps}
          width={DAILY_Y_WIDTH}
          domain={domain}
          ticks={ticks}
          tickFormatter={(value: number) => formatNumber(value)}
        />
        <Tooltip content={<ChartTooltip unit="kcal" />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />

        {/*
          The goal supersedes the average as the reference to read against. Drawing
          both would stack two rules a handful of kcal apart into what looks like
          one line; the average is still a stat tile above.
        */}
        {average !== null && !hasGoal && (
          <ReferenceLine
            y={average}
            stroke={TEXT_SECONDARY}
            strokeWidth={1}
          />
        )}

        <Bar
          dataKey="cals"
          name="Calories"
          fill={SERIES.blue}
          maxBarSize={24}
          radius={[4, 4, 0, 0]}
          isAnimationActive={ANIMATE}
        />

        {/*
          Drawn after the bars so the rule reads on top of them, and stepped so
          the day a target changed is the day the line moves.
        */}
        {hasGoal && (
          <Line
            type="stepAfter"
            dataKey="goal"
            name="Target"
            // Neutral, not the series blue: the bars are already blue, and the
            // rule now draws on top of them rather than behind.
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
