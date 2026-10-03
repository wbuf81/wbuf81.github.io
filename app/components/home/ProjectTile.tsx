import type { Hardware, Placed } from '@/lib/projects';
import Print from './Print';

export function HardwareLink({ hardware }: { hardware: Hardware }) {
  return (
    <a className="hw" href={hardware.href} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
      <img src={hardware.image} alt="" loading="lazy" />
      <span>{hardware.label}</span>
    </a>
  );
}

// A tile (design system › tiles): the print stands over the top of its card. Personal projects get a footer
// with the board they run on (or what they're written in) and, when the repo is public, a GitHub link.
export default function ProjectTile({ project: p, footer = false }: { project: Placed; footer?: boolean }) {
  return (
    <article className="tile">
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
      <div className="tb">
        <div className="th">
          <h3>{p.name}</h3>
          <span className="tag">{p.badge}</span>
        </div>
        <div className="fn">{p.subtitle}</div>
        <p>{p.description}</p>
        {footer && (
          <div className="tf">
            {p.hardware ? <HardwareLink hardware={p.hardware} /> : <span className="fine">{p.kind}</span>}
            {p.href && (
              <a href={p.href} target="_blank" rel="noopener noreferrer">
                GitHub →
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
