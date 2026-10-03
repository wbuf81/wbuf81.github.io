import type { Project } from '@/lib/projects';
import Print from './Print';
import { HardwareLink } from './ProjectTile';

// The featured build (design system › the featured build): a big print over the left edge of its panel.
// lib/projects.ts › FEATURED picks it.
export default function FeaturedBuild({ project: p }: { project: Project }) {
  return (
    <article className="feat" aria-label="Featured build">
      <Print
        image={p.image}
        alt={p.alt}
        fit={p.fit}
        tilt={-1.8}
        tapes={[{ left: '41%', top: '-10px', width: '100px', angle: '-4deg' }]}
        href={p.href}
        label={p.href ? `Open ${p.name} on GitHub` : undefined}
        caption={
          <>
            <span>{p.name}</span>
            <span>{p.kind}</span>
          </>
        }
        eager
      />
      <div className="fpanel">
        <div className="fhead">
          <div className="kick">
            <span className="tag acc">Featured build</span>
            <span className="tag">{p.badge}</span>
          </div>
          <h2>{p.name}</h2>
          <div className="fn">{p.subtitle}</div>
        </div>
        <div className="fcopy">
          <p>{p.description}</p>
          {p.href && (
            <a className="btn" href={p.href} target="_blank" rel="noopener noreferrer">
              View on GitHub →
            </a>
          )}
        </div>
        <div className="fdata">
          {p.hardware && (
            <div>
              <div className="act-h">Runs on</div>
              <HardwareLink hardware={p.hardware} />
            </div>
          )}
          {p.chips && p.chips.length > 0 && (
            <div>
              <div className="act-h">{p.chipsLabel ?? 'What it does'}</div>
              <div className="chips">
                {p.chips.map((c) => (
                  <span className="chip" key={c}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
