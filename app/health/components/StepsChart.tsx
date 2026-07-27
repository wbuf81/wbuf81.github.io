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
import ChartTooltip from './ChartTooltip';
import { ANIMATE, SERIES, TEXT_SECONDARY, axisProps, cleanAxis, formatNumber, gridProps } from './chartTheme';

interface Props {
  days: HealthDay[];
  /** All-time daily average, so the line reads as a standard rather than moving with the bars. */
  average: number | null;
}

export default function StepsChart({ days, average }: Props) {
  const data = days.map((day) => ({
    label: `${day.day} ${day.date.slice(8)}`,
    steps: day.steps,
  }));

  const peak = Math.max(...days.map((d) => d.steps ?? 0), average ?? 0);
  const { domain, ticks } = cleanAxis(peak, 5000);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis
          {...axisProps}
          width={56}
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
      </BarChart>
    </ResponsiveContainer>
  );
}
