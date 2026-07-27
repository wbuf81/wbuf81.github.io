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
  average: number | null;
}

/**
 * Calories are their own chart rather than a line over the macro grams: grams
 * and kcal are different scales, and overlaying them would mean a second y-axis.
 */
export default function CaloriesChart({ days, average }: Props) {
  const data = days.map((day) => ({
    label: `${day.day} ${day.date.slice(8)}`,
    cals: day.cals,
  }));

  const peak = Math.max(...days.map((d) => d.cals ?? 0), average ?? 0);
  const { domain, ticks } = cleanAxis(peak, 1000);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis
          {...axisProps}
          width={56}
          domain={domain}
          ticks={ticks}
          tickFormatter={(value: number) => formatNumber(value)}
        />
        <Tooltip content={<ChartTooltip unit="kcal" />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />

        {average !== null && (
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
      </BarChart>
    </ResponsiveContainer>
  );
}
