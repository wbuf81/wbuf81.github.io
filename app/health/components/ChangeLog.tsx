import { HealthChangeEntry } from '@/types/health';

interface Props {
  entries: HealthChangeEntry[];
}

/**
 * Every change to a goal or a block, oldest first — the one table on the page
 * that reads forwards, because it is a story rather than a snapshot.
 *
 * Derived from the dated config, so it cannot disagree with the numbers the
 * charts use. A change with no recorded reason shows an em dash rather than a
 * guess.
 */
export default function ChangeLog({ entries }: Props) {
  return (
    <div className="table-scroll">
      <table className="health-table is-changes" aria-label="Changes to goals and blocks, oldest first">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Change</th>
            {/* is-num on the header too, or the label sits left of its own column. */}
            <th scope="col" className="is-num">From</th>
            <th scope="col" className="is-num">To</th>
            <th scope="col">Why</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={`${entry.date}-${entry.label}-${index}`}>
              <th scope="row" className="is-week">
                {entry.dateLabel}
              </th>
              <td>{entry.label}</td>
              <td className="is-num is-was">{entry.from ?? '—'}</td>
              <td className="is-num">{entry.to}</td>
              <td className="is-notes">{entry.note || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
