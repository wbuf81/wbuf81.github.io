'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/** A tiny shared toast: `show(msg)` fills a polite live region for ~2.4s. Render `node` once where it is used. */
export function useToast(): { node: ReactNode; show: (msg: string) => void } {
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2400);
  }, []);
  const node = msg ? <div className="s-t8-toast" role="status" aria-live="polite"><span>{msg}</span></div> : null;
  return { node, show };
}
