import type { CSSProperties } from 'react';
import { pct } from './svg';

/** A label cell over a stretch of a chart, in viewBox units: `words` runs from the longest wording to the shortest. */
export interface FitCell {
  key: string;
  x0: number;
  x1: number;
  words: string[];
}

interface Props {
  cells: FitCell[];
  /** The frame's viewBox size, so cells are placed in percentages. */
  w: number;
  h: number;
  /** The row's middle, in viewBox units. */
  y: number;
  /**
   * True: a cell too narrow for even its shortest wording still shows it, right-aligned at the cell's right edge and
   * running out to the left (a block's name). False: it shows nothing (the calorie target ruler).
   */
  overflow?: boolean;
  className?: string;
}

/** The width a wording needs: the label face is monospaced, so its width is its length in characters, plus padding. */
const need = (text: string) => `calc(${[...text].length} * (1ch + var(--fit-ls)) + 12px)`;

/**
 * A row of labels whose room depends on the data (a block's name over a band of any width), fitted without measuring
 * (spec 2026-11-16, "Fitting labels without measuring"). Each cell spans its stretch of the plot and is a size
 * container; each wording is a span that shows only while the cell is at least as wide as it needs and narrower than
 * the wording before it needs (`100cqw` against `--need` and `--room`, in health.css › .h-fit), so the longest wording
 * that fits is the one on screen. jsdom ignores container units, so tests can only see that every wording exists.
 *
 * A cell gives up room to the one after it: when the next cell's shortest wording runs out to the left, this cell
 * fits its own wording in what is left (`--steal`), so two labels never share the same stretch. Only the cell
 * directly before is asked; two blocks in a row too narrow for their own names would still meet.
 */
export default function FitRow({ cells, w, h, y, overflow = true, className = '' }: Props) {
  const shown = cells
    .map((c) => ({ c, words: c.words.filter((t, i) => t && c.words.indexOf(t) === i) }))
    .filter(({ c, words }) => words.length > 0 && c.x1 > c.x0);
  return (
    <>
      {shown.map(({ c, words }, n) => {
        const next = overflow ? shown[n + 1] : undefined;
        // What the next cell's shortest wording needs beyond its own width (and any gap before it), measured in this
        // cell's own width so the browser can work it out: 100cqw here is this cell.
        const steal = next
          ? `max(0px, ${need(next.words[next.words.length - 1])} - ${((next.c.x1 - c.x1) / (c.x1 - c.x0)).toFixed(4)} * 100cqw)`
          : '0px';
        return (
          <div
            key={c.key}
            className={`h-fit ${className}`}
            style={
              { left: pct(c.x0, w), width: pct(c.x1 - c.x0, w), top: pct(y, h), '--steal': steal } as CSSProperties
            }
            aria-hidden="true"
          >
            {words.map((t, i) => {
              const last = i === words.length - 1;
              const style = {
                '--need': need(t),
                '--room': i === 0 ? '100000px' : need(words[i - 1]),
              } as CSSProperties;
              return (
                <span key={t} className={last && overflow ? 'is-last' : undefined} style={style}>
                  <b>{t}</b>
                </span>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
