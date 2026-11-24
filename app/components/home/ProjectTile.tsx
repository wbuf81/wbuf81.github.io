import type { Hardware, Placed } from '@/lib/projects';
import Print from './Print';
import TrailerPrint from './TrailerPrint';

export function HardwareLink({ hardware }: { hardware: Hardware }) {
  return (
    <a className="hw" href={hardware.href} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
      <img src={hardware.image} alt="" loading="lazy" />
      <span>{hardware.label}</span>
    </a>
  );
}

/** A tile's category label: its full name, and what pressing it does (on /design it is left inert). */
export interface TileCategory {
  name: string;
  onPress?: () => void;
}

// A tile (design system › tiles): the print stands over the top of its card. Personal projects get a footer
// with the board they run on (or what they're written in) and, when the repo is public, a GitHub link —
// or, for a build that lives on this site, a link to it in the same tab.
// `category` puts the tile's category over its name, in the eyebrow style: a button that presses that filter on the
// homepage (ProjectFilter). `hidden` is the filter leaving the tile out; a trailer in it stops.
export default function ProjectTile({
  project: p,
  footer = false,
  category,
  hidden = false,
}: {
  project: Placed;
  footer?: boolean;
  category?: TileCategory;
  hidden?: boolean;
}) {
  return (
    <article className="tile" hidden={hidden}>
      {p.trailer ? (
        <TrailerPrint trailer={p.trailer} tilt={p.tilt} tapes={p.tapes} off={hidden} />
      ) : (
        <Print
          image={p.image}
          alt={p.alt}
          fit={p.fit}
          tilt={p.tilt}
          tapes={p.tapes}
          caption={
            <>
              <span>{p.name}</span>
              <span>{p.kind}</span>
            </>
          }
        />
      )}
      <div className="tb">
        {category && (
          <button type="button" className="tile-cat" onClick={category.onPress} aria-label={`Show only ${category.name}`}>
            {category.name}
          </button>
        )}
        <div className="th">
          <h3>{p.name}</h3>
          <span className="tag">{p.badge}</span>
        </div>
        <div className="fn">{p.subtitle}</div>
        <p>{p.description}</p>
        {footer && (
          <div className="tf">
            {p.hardware ? <HardwareLink hardware={p.hardware} /> : <span className="fine">{p.kind}</span>}
            {p.href &&
              (p.href.startsWith('/') ? (
                <a href={p.href}>{p.cta ?? 'Explore it →'}</a>
              ) : (
                <a href={p.href} target="_blank" rel="noopener noreferrer">
                  GitHub →
                </a>
              ))}
          </div>
        )}
      </div>
    </article>
  );
}
