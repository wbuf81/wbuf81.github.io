'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { WeightPoint } from '@/types/health';
import ChartLegend from './ChartLegend';
import ChartTooltip from './ChartTooltip';
import { ANIMATE, MUTED_MARK, SERIES, SURFACE, axisProps, gridProps } from './chartTheme';

interface Props {
  data: WeightPoint[];
  /** False until 14 days exist, when a 7-day mean starts to mean something. */
  showTrend: boolean;
}

/**
 * The y-axis is deliberately zoomed to the data range rather than anchored at
 * zero: across a realistic spread a zero-based axis flattens real movement into
 * a straight line.
 */
function zoomedDomain(data: WeightPoint[]): [number, number] {
  const weights = data.map((d) => d.weight).filter((w): w is number => w !== null);
  if (weights.length === 0) return [0, 1];

  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const pad = Math.max((max - min) * 0.15, 0.5);

  return [Math.floor((min - pad) * 2) / 2, Math.ceil((max + pad) * 2) / 2];
}

export default function WeightChart({ data, showTrend }: Props) {
  const domain = zoomedDomain(data);

  return (
    <>
    {showTrend && (
      <ChartLegend
        items={[
          { label: 'Daily', color: MUTED_MARK, shape: 'line' },
          { label: '7-day average', color: SERIES.blue, shape: 'line' },
        ]}
      />
    )}
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
        <YAxis
          {...axisProps}
          domain={domain}
          tickFormatter={(value: number) => value.toFixed(1)}
          width={52}
        />
        <Tooltip
          content={<ChartTooltip unit="lb" digits={1} />}
          cursor={{ stroke: MUTED_MARK, strokeWidth: 1 }}
        />

        <Line
          type="monotone"
          dataKey="weight"
          name="Daily"
          stroke={showTrend ? MUTED_MARK : SERIES.blue}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={{
            r: 4,
            fill: showTrend ? MUTED_MARK : SERIES.blue,
            stroke: SURFACE,
            strokeWidth: 2,
          }}
          activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }}
          connectNulls
          isAnimationActive={ANIMATE}
        />

        {showTrend && (
          <Line
            type="monotone"
            dataKey="trend"
            name="7-day average"
            stroke={SERIES.blue}
            strokeWidth={2}
            strokeLinecap="round"
            dot={false}
            activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }}
            connectNulls
            isAnimationActive={ANIMATE}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
    </>
  );
}
