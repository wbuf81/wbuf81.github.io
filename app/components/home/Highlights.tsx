import { highlights, type Project } from '@/lib/projects';
import Print from './Print';

// The highlights row at the top of the homepage (design system › the highlights row): the two builds Wes picks, then
// the latest. Each is a taped print over its card, a size up from the tiles, with a button. lib/projects.ts ›
// HIGHLIGHTS and LATEST choose them.
const TILTS = [-1.6, 1.1, -0.8];
const TAPES = ['38%', '30%', '44%'];

export function HighlightCard({ project: p, latest, position }: { project: Project; latest: boolean; position: number }) {
  const internal = !!p.href?.startsWith('/');
  return (
    <article className={latest ? 'hl is-latest' : 'hl'}>
      <Print
        image={p.image}
        alt={p.alt}
        fit={p.fit}
        tilt={TILTS[position % TILTS.length]}
        tapes={[{ left: TAPES[position % TAPES.length], top: '-9px', width: '96px', angle: '-3deg' }]}
        href={p.href}
        label={p.href ? (internal ? `Open ${p.name}` : `Open ${p.name} on GitHub`) : undefined}
        caption={
          <>
            <span>{p.name}</span>
            <span>{p.kind}</span>
          </>
        }
        sticker={
          latest ? (
            <span className="label-tape" aria-hidden="true">
              New
            </span>
          ) : undefined
        }
        eager
      />
      <div className="hl-body">
        <div className="kick">
          {latest ? <span className="tag fill">Latest</span> : <span className="tag acc">Highlight</span>}
          <span className="tag">{p.badge}</span>
        </div>
        <h3>{p.name}</h3>
        <div className="fn">{p.subtitle}</div>
        <p>{p.description}</p>
        {p.href && (
          <div className="hl-go">
            <a className="btn sm" href={p.href} {...(internal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
              {internal ? 'Explore it →' : 'View on GitHub →'}
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

export default function Highlights() {
  return (
    <section className="hls" aria-labelledby="hl-h">
      <h2 id="hl-h" className="vh">
        Highlights
      </h2>
      {highlights().map((h, i) => (
        <HighlightCard key={h.project.key} project={h.project} latest={h.latest} position={i} />
      ))}
    </section>
  );
}
