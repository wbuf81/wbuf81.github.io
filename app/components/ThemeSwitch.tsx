'use client';

import { useEffect, useState } from 'react';
import { applyMode, readMode, type ThemeMode } from '@/lib/theme';

const MODES: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
  {
    mode: 'light',
    label: 'Light',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
      </svg>
    ),
  },
  {
    mode: 'auto',
    label: 'Match my computer',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="5.5" />
        <path className="f" d="M8 2.5a5.5 5.5 0 0 1 0 11z" />
      </svg>
    ),
  },
  {
    mode: 'dark',
    label: 'Dark',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M13.3 10.2A5.6 5.6 0 0 1 5.8 2.7a5.6 5.6 0 1 0 7.5 7.5z" />
      </svg>
    ),
  },
];

// LegCom's three-way theme pill: light, match the computer, dark. The boot script
// in the layout has already applied a saved choice before this hydrates.
export default function ThemeSwitch() {
  const [mode, setMode] = useState<ThemeMode>('auto');

  useEffect(() => {
    setMode(readMode());
  }, []);

  const now = MODES.find((m) => m.mode === mode)!.label;

  return (
    <div className="theme" role="group" aria-label="Colour theme">
      {MODES.map((m) => (
        <button
          key={m.mode}
          type="button"
          aria-label={m.label}
          aria-pressed={mode === m.mode}
          onClick={() => {
            applyMode(m.mode);
            setMode(m.mode);
          }}
        >
          {m.icon}
        </button>
      ))}
      <span className="tip" role="tooltip">
        <span className="t">Theme</span>
        <span className="h">Light, dark, or match your computer.</span>
        <span className="p">
          The sun is light, the moon is dark, and the middle one follows your computer&apos;s setting. Your choice is
          saved in this browser.
        </span>
        <span className="lv">Now: {now}</span>
      </span>
    </div>
  );
}
