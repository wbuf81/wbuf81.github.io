'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HealthDay } from '@/types/health';
import ChartLegend from './ChartLegend';
import ChartTooltip from './ChartTooltip';
import { ANIMATE, SERIES, SURFACE, axisProps, cleanAxis, gridProps } from './chartTheme';

interface Props {
  days: HealthDay[];
}

/** Bottom of the stack first, so the legend reads in the order the bars stack. */
const LEGEND = [
  { label: 'Protein', color: SERIES.blue },
  { label: 'Carbs', color: SERIES.orange },
  { label: 'Fat', color: SERIES.aqua },
];

/**
 * Grams only — one scale, one axis. The 2px surface-colored stroke is the gap
 * that separates stacked segments; it is spacing, not a border.
 */
export default function MacroChart({ days }: Props) {
  const data = days.map((day) => ({
    label: `${day.day} ${day.date.slice(8)}`,
    protein: day.protein,
    carbs: day.carbs,
    fat: day.fat,
  }));

  const peak = Math.max(
    ...days.map((d) => (d.protein ?? 0) + (d.carbs ?? 0) + (d.fat ?? 0))
  );
  const { domain, ticks } = cleanAxis(peak, 100);

  return (
    <>
    <ChartLegend items={LEGEND} />
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -4 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis {...axisProps} width={48} domain={domain} ticks={ticks} />
        <Tooltip content={<ChartTooltip unit="g" />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />

        <Bar
          dataKey="protein"
          name="Protein"
          stackId="macros"
          fill={SERIES.blue}
          stroke={SURFACE}
          strokeWidth={2}
          maxBarSize={24}
          isAnimationActive={ANIMATE}
        />
        <Bar
          dataKey="carbs"
          name="Carbs"
          stackId="macros"
          fill={SERIES.orange}
          stroke={SURFACE}
          strokeWidth={2}
          maxBarSize={24}
          isAnimationActive={ANIMATE}
        />
        <Bar
          dataKey="fat"
          name="Fat"
          stackId="macros"
          fill={SERIES.aqua}
          stroke={SURFACE}
          strokeWidth={2}
          maxBarSize={24}
          radius={[4, 4, 0, 0]}
          isAnimationActive={ANIMATE}
        />
      </BarChart>
    </ResponsiveContainer>
    </>
  );
}
