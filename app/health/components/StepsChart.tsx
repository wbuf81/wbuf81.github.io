'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HealthDay } from '@/types/health';
import { dayTickLabel } from '@/lib/dayLabel';
import ChartTooltip from './ChartTooltip';
import {
  ANIMATE,
  DAILY_MARGIN,
  DAILY_Y_WIDTH,
  SERIES,
  TEXT_MUTED,
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
  /** The daily floor. Dashed and muted, because clearing it is the baseline, not the win. */
  minimum?: number | null;
  /** The daily target. Dashed in the series hue to match the weight chart's goal line. */
  goal?: number | null;
}

/** A thousands-shortened label for a rule, e.g. 13500 -> "13.5k". */
function ruleLabel(prefix: string, value: number): string {
  return `${prefix} ${formatNumber(value / 1000, value % 1000 === 0 ? 0 : 1)}k`;
}

export default function StepsChart({ days, average, minimum, goal }: Props) {
  const data = days.map((day) => ({
    label: dayTickLabel(day),
    steps: day.steps,
  }));

  const peak = Math.max(
    ...days.map((d) => d.steps ?? 0),
    average ?? 0,
    minimum ?? 0,
    goal ?? 0
  );
  const { domain, ticks } = cleanAxis(peak, 5000);

  return (
    <ResponsiveContainer width="100%" height={260}>
      {/* The right gutter holds the rule labels clear of the bars. */}
      <BarChart data={data} margin={DAILY_MARGIN}>
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

        {typeof minimum === 'number' && (
          <ReferenceLine
            y={minimum}
            stroke={TEXT_MUTED}
            strokeWidth={1}
            strokeDasharray="4 4"
            label={{
              value: ruleLabel('min', minimum),
              position: 'right',
              fill: TEXT_MUTED,
              fontSize: 11,
            }}
          />
        )}

        {typeof goal === 'number' && (
          <ReferenceLine
            y={goal}
            stroke={SERIES.blue}
            strokeWidth={1}
            strokeDasharray="4 4"
            label={{
              value: ruleLabel('goal', goal),
              position: 'right',
              fill: TEXT_MUTED,
              fontSize: 11,
            }}
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
      </BarChart>
    </ResponsiveContainer>
  );
}
