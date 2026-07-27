interface LegendItem {
  label: string;
  color: string;
  /** A line key for line series, a dot for fills. */
  shape?: 'dot' | 'line';
}

/**
 * Plain markup rather than Recharts' <Legend>, for two reasons: the order is
 * guaranteed to match the visual stack (Recharts derives its own order from
 * render internals), and the text can wear text tokens instead of the series
 * colour, which a light hue fails at.
 */
export default function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <p className="chart-legend">
      {items.map((item) => (
        <span className="chart-legend-key" key={item.label}>
          <span
            className={item.shape === 'line' ? 'chart-legend-line' : 'chart-legend-dot'}
            style={{ background: item.color }}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </p>
  );
}
