'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PhaseSummary, WeightPoint } from '@/types/health';
import ChartLegend from './ChartLegend';
import ChartTooltip from './ChartTooltip';
import {
  ANIMATE,
  DAILY_MARGIN,
  DAILY_X_BAND,
  DAILY_Y_WIDTH,
  MUTED_MARK,
  SERIES,
  SURFACE,
  TEXT_MUTED,
  axisProps,
  gridProps,
} from './chartTheme';

interface Props {
  data: WeightPoint[];
  /** False until 14 days exist, when a 7-day mean starts to mean something. */
  showTrend: boolean;
  phases: PhaseSummary[];
}

/**
 * Phases are washes behind the data, not marks in it: a tint at ~7% so the plot
 * reads on top of it. Only the goal line is allowed to be a real mark, because
 * it is a number you are aiming at.
 */
const PHASE_TINT: Record<string, string> = {
  cut: 'rgba(42, 120, 214, 0.07)',
  bulk: 'rgba(235, 104, 52, 0.07)',
  maintain: 'rgba(27, 175, 122, 0.07)',
};

/**
 * The y-axis is zoomed to the data plus the active goal, never anchored at
 * zero: across a realistic spread a zero-based axis flattens real movement
 * into a straight line. Including the goal costs some vertical resolution on
 * the daily wiggles, but it keeps the distance still to cover in view — the
 * gap between the line and the floor is the point of the chart during a cut.
 */
function zoomedDomain(data: WeightPoint[], goal: number | null): [number, number] {
  const weights = data.map((d) => d.weight).filter((w): w is number => w !== null);
  if (weights.length === 0) return [0, 1];
  if (goal !== null) weights.push(goal);

  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const pad = Math.max((max - min) * 0.15, 0.5);

  return [Math.floor((min - pad) * 2) / 2, Math.ceil((max + pad) * 2) / 2];
}

export default function WeightChart({ data, showTrend, phases }: Props) {
  const activeGoal =
    phases.find((phase) => phase.isOngoing && phase.goalWeight !== null)?.goalWeight ?? null;
  const domain = zoomedDomain(data, activeGoal);

  // The x-axis is categorical (point labels), so a date has to be mapped to the
  // nearest plotted point rather than used as a raw coordinate.
  const labelFor = (iso: string, edge: 'start' | 'end'): string | null => {
    const inside = data.filter((point) => (edge === 'start' ? point.date >= iso : point.date <= iso));
    if (inside.length === 0) return null;
    return edge === 'start' ? inside[0].label : inside[inside.length - 1].label;
  };

  const bands = phases
    .map((phase) => {
      const x1 = labelFor(phase.start, 'start');
      const x2 = labelFor(phase.end ?? data[data.length - 1]?.date ?? phase.start, 'end');
      return x1 && x2 ? { phase, x1, x2 } : null;
    })
    .filter((band): band is { phase: PhaseSummary; x1: string; x2: string } => band !== null);

  // The domain is stretched to keep the ongoing goal in view, so its line
  // always draws; the range check only guards goals from already-closed phases.
  const goalLines = phases.filter(
    (phase) =>
      phase.isOngoing &&
      phase.goalWeight !== null &&
      phase.goalWeight >= domain[0] &&
      phase.goalWeight <= domain[1]
  );

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
      <LineChart data={data} margin={DAILY_MARGIN}>
        <CartesianGrid {...gridProps} />
        <XAxis
          dataKey="label"
          {...axisProps}
          interval="preserveStartEnd"
          {...DAILY_X_BAND}
        />
        <YAxis
          {...axisProps}
          domain={domain}
          tickFormatter={(value: number) => value.toFixed(1)}
          width={DAILY_Y_WIDTH}
        />
        <Tooltip
          content={<ChartTooltip unit="lb" digits={1} />}
          cursor={{ stroke: MUTED_MARK, strokeWidth: 1 }}
        />

        {bands.map(({ phase, x1, x2 }) => (
          <ReferenceArea
            key={phase.start}
            x1={x1}
            x2={x2}
            fill={PHASE_TINT[phase.type] ?? PHASE_TINT.maintain}
            fillOpacity={1}
            stroke="none"
            label={{
              value: phase.label,
              position: 'insideBottomLeft',
              fill: TEXT_MUTED,
              fontSize: 11,
            }}
          />
        ))}

        {goalLines.map((phase) => (
          <ReferenceLine
            key={`goal-${phase.start}`}
            y={phase.goalWeight as number}
            stroke={SERIES.blue}
            strokeWidth={1}
            strokeDasharray="4 4"
            label={{
              value: `goal ${phase.goalWeight}`,
              position: 'right',
              fill: SERIES.blue,
              fontSize: 11,
            }}
          />
        ))}

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
