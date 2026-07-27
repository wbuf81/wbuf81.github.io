'use client';

import { formatNumber } from './chartTheme';

interface TooltipEntry {
  name?: string;
  value?: number | string | null;
  color?: string;
  dataKey?: string | number;
}

interface Props {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
  /** Appended to each value, e.g. "lb" or "g". */
  unit?: string;
  digits?: number;
}

/**
 * Identity comes from the colored dot beside each row; the text itself stays in
 * text tokens so a light hue is never used as type.
 */
export default function ChartTooltip({ active, label, payload, unit, digits = 0 }: Props) {
  if (!active || !payload || payload.length === 0) return null;

  const rows = payload.filter((entry) => entry.value !== null && entry.value !== undefined);
  if (rows.length === 0) return null;

  return (
    <div className="health-tooltip">
      <p className="health-tooltip-label">{label}</p>
      {rows.map((entry) => (
        <p className="health-tooltip-row" key={String(entry.dataKey ?? entry.name)}>
          <span className="health-tooltip-dot" style={{ background: entry.color }} aria-hidden="true" />
          <span className="health-tooltip-name">{entry.name}</span>
          <span className="health-tooltip-value">
            {typeof entry.value === 'number' ? formatNumber(entry.value, digits) : entry.value}
            {unit ? ` ${unit}` : ''}
          </span>
        </p>
      ))}
    </div>
  );
}
