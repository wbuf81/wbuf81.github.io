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
import { WeekSummary } from '@/types/health';
import ChartTooltip from './ChartTooltip';
import { ANIMATE, SERIES, axisProps, gridProps } from './chartTheme';

interface Props {
  weeks: WeekSummary[];
}

/**
 * Lifts and cardio sessions per week. Both series are session counts, so they
 * share one axis. Cardio *minutes* are not plotted here — at a fixed 30 minutes
 * per session they are the same shape as the session count, and giving them
 * their own scale would mean a second y-axis. The total is a stat tile instead.
 */
export default function WeeklyConsistencyChart({ weeks }: Props) {
  const data = weeks.map((week) => ({
    label: week.label,
    workouts: week.workouts,
    cardio: week.cardioSessions,
  }));

  // No legend here on purpose: this chart sits directly beneath the day grid in
  // the Consistency section, which already establishes blue = lift, orange =
  // cardio. A second legend with the same mapping is noise.
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }} barGap={2}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={40} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />

        <Bar dataKey="workouts" name="Lifts" fill={SERIES.blue} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={ANIMATE} />
        <Bar dataKey="cardio" name="Cardio" fill={SERIES.orange} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={ANIMATE} />
      </BarChart>
    </ResponsiveContainer>
  );
}
