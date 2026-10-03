import type { CSSProperties } from 'react';
import { buildMap, dayLabel, type Contributions } from '@/lib/githubContributions';

// The GitHub map (design system › section card and the GitHub map), in the site's own teal scale. It fills the
// card's width; on a phone it scrolls inside the card. Data: lib/githubContributions.ts.
export default function GitHubMap({ data }: { data: Contributions }) {
  const { cells, months, weeks } = buildMap(data);
  return (
    <section className="ch" aria-labelledby="gh-h">
      <div className="ch-h">
        <div>
          <div className="eyebrow">@{data.user}</div>
          <h2 id="gh-h">GitHub activity</h2>
        </div>
        <a href={`https://github.com/${data.user}`} target="_blank" rel="noopener noreferrer">
          Open GitHub →
        </a>
      </div>
      <div className="heat-box" style={{ '--weeks': weeks } as CSSProperties}>
        <div className="heat-m" aria-hidden="true">
          {months.map((m) => (
            <span key={m.col} style={{ gridColumn: `${m.col} / span 3` }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="heat-row">
          <div className="heat-d" aria-hidden="true">
            <span />
            <span>Mon</span>
            <span />
            <span>Wed</span>
            <span />
            <span>Fri</span>
            <span />
          </div>
          <div
            className="heat"
            role="img"
            aria-label={`GitHub contributions by ${data.user}, ${dayLabel(data.from)} to ${dayLabel(data.to)}`}
          >
            {cells.map((c, i) =>
              c.level < 0 ? (
                <i key={`pad-${i}`} className="pad" />
              ) : (
                <i key={c.date} className={`l${c.level}`} data-date={c.date} title={dayLabel(c.date)} />
              ),
            )}
          </div>
        </div>
      </div>
      <div className="heat-f">
        <span className="fine">Most projects are in private repositories.</span>
        <span className="legend" aria-hidden="true">
          Less
          <i className="l0" />
          <i className="l1" />
          <i className="l2" />
          <i className="l3" />
          <i className="l4" />
          More
        </span>
      </div>
    </section>
  );
}
