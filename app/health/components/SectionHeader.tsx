import type { ReactNode } from 'react';
import type { PhaseSummary } from '@/types/health';

/**
 * The eyebrow over every /health page: the block the newest data falls in (lib/health › leadPhase) and its week,
 * "Health · Lean bulk, week 3". With no block, "Health · updated weekly".
 */
export function healthEyebrow(phase: PhaseSummary | null | undefined): string {
  return phase ? `Health · ${phase.label}, week ${phase.weekCount}` : 'Health · updated weekly';
}

interface Props {
  eyebrow: string;
  /** The section's title, from app/health/sections.ts: "This week", "Trends", … */
  title: string;
  /** Controls for the section (Trends' range switch), on the right of the title row; underneath on a phone. */
  children?: ReactNode;
}

/** The top of a /health page: one eyebrow line, the section's title, and anything the section puts beside it. */
export default function SectionHeader({ eyebrow, title, children }: Props) {
  return (
    <header className="h-top">
      <div className="h-top-row">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="h-title">{title}</h1>
        </div>
        {children && <div className="h-top-aside">{children}</div>}
      </div>
    </header>
  );
}
