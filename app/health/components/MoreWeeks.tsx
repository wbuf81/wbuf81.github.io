'use client';

import { type ReactNode, useId, useState } from 'react';

interface Props {
  /** Every week in the grid, shown and hidden together: the button's "Show all 18 weeks". */
  total: number;
  /** How many show before the button is pressed. */
  shown: number;
  /** The older weeks, already drawn on the server; this only shows or hides them. */
  children: ReactNode;
}

/** The consistency grid's older weeks behind a button under it, which can hide them again. */
export default function MoreWeeks({ total, shown, children }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <div id={id} className="h-more-weeks" hidden={!open}>
        {children}
      </div>
      <button type="button" className="btn ghost sm h-more" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {open ? `Show the newest ${shown} only` : `Show all ${total} weeks`}
      </button>
    </>
  );
}
