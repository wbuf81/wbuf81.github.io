/*
 * Every project on the homepage. A tile says what a thing does and what it runs on — never repo statistics
 * (line, test or commit counts): they say nothing to a reader and date the moment the repo moves on.
 * Public copy names no client, vendor, regulator, brokerage or figure (CLAUDE.md › Content rules);
 * __tests__/projects.test.ts checks it.
 */

export interface Hardware {
  label: string;
  href: string;
  image: string;
}

export interface Project {
  key: string;
  name: string;
  /** The print's caption, right-hand side: the breed for an agent, what it runs on for a build. */
  kind: string;
  subtitle: string;
  description: string;
  badge: 'Private repo' | 'Open source';
  image: string;
  alt: string;
  /** photo: a mascot, cropped from the top · shot: a screenshot, centred · board: a product shot on white */
  fit: 'photo' | 'shot' | 'board';
  href?: string;
  hardware?: Hardware;
  group?: (typeof GROUPS)[number];
  /** Shown when the project is the featured build, under `chipsLabel`. */
  chips?: string[];
  chipsLabel?: string;
}

export interface Tape {
  left: string;
  top: string;
  width: string;
  angle: string;
}

export interface Placed extends Project {
  tilt: number;
  tapes: Tape[];
}

/** Personal work reads in these groups, in this order. */
export const GROUPS = ['Omarchy Linux', 'Microcontrollers', 'Everything else'] as const;

/** The build in the big block at the top. Any personal project with chips fits. */
export const FEATURED = 'neo';

const M5: Hardware = {
  label: 'M5Stack Core Basic v2.7',
  href: 'https://shop.m5stack.com/products/esp32-basic-core-iot-development-kit-v2-7',
  image: '/boards/m5stack-core-basic.jpg',
};

export const AGENTS: Project[] = [
  {
    key: 'oscar', name: 'OSCAR', kind: 'Bernese mountain dog', fit: 'photo', badge: 'Private repo',
    image: '/agents/oscar.jpg', alt: 'OSCAR, a Bernese mountain dog, at a desk with two monitors',
    subtitle: 'Obligation Scanning & Compliance Analysis Reporter',
    description: 'AI agent that continuously scans company web properties for legal compliance gaps — privacy notices, cookie banners, GDPR requirements, hidden footer links — with automated reporting and email alerts.',
  },
  {
    key: 'smores', name: 'SMORES', kind: 'Schnoodle', fit: 'photo', badge: 'Private repo',
    image: '/agents/smores.jpg', alt: 'SMORES, a schnoodle, at a desk with a binder',
    subtitle: 'Service Mark Ongoing Review & Enhancement System',
    description: 'Tracks all service marks, renewals, and filing deadlines across the brand portfolio. Monitors trademark lifecycles and fires alerts before anything lapses.',
  },
  {
    key: 'maisie', name: 'MAISIE', kind: 'Tabby cat', fit: 'photo', badge: 'Private repo',
    image: '/agents/maisie.jpg', alt: 'MAISIE, a tabby cat in glasses, reading at a desk',
    subtitle: 'Monitoring Agent for International Sanctions & Intelligence Engine',
    description: "Monitors domains across the company's brand portfolio against the OFAC Specially Designated Nationals list. Syncs sanctions data, flags potential matches, and tracks compliance status across the portfolio.",
  },
  {
    key: 'snoop', name: 'SNOOP', kind: 'Detective beagle', fit: 'photo', badge: 'Private repo',
    image: '/agents/snoop.jpg', alt: 'SNOOP, a beagle in a detective hat, at a desk',
    subtitle: 'Direct Navigator for Oversight of Organizational Policies',
    description: 'Monitors and manages organizational policies across compliance frameworks. Tracks policy lifecycles, detects gaps in framework coverage, and keeps documentation current.',
  },
  {
    key: 'rhino', name: 'RHINO', kind: 'Rhinoceros', fit: 'photo', badge: 'Private repo',
    image: '/agents/rhino.jpg', alt: 'RHINO, a rhinoceros, at a desk',
    subtitle: 'Risk Hub for Identification, Notification & Oversight',
    description: 'Maintains the enterprise risk register — material risks with likelihood, residual score, and mitigation plan in one place. Quarterly assessment cadence with full audit trail and portfolio-level exposure tracking.',
  },
  {
    key: 'pabsty', name: 'PABSTY', kind: 'British shorthair', fit: 'photo', badge: 'Private repo',
    image: '/agents/pabsty.jpg', alt: 'PABSTY, a grey British shorthair, at a desk',
    subtitle: 'Privacy Analytics & Benchmarking for Subject Tasks',
    description: 'Transforms privacy request data into executive-ready analytics. Tracks DSAR volumes by region, brand, and regulation type — automated monthly snapshots delivered without manual intervention.',
  },
  {
    key: 'beasley', name: 'BEASLEY', kind: 'Aussiedoodle', fit: 'photo', badge: 'Private repo',
    image: '/agents/beasley.jpg', alt: 'BEASLEY, an aussiedoodle, at a desk',
    subtitle: 'Brand Evaluation & Abuse Scoping Linked Exactly to Your-brands',
    description: 'Routes abuse complaints to the team that owns them — reads the incoming complaint mail, pulls out the domains, attributes each one to its brand in the portfolio, and keeps the analytics on what came in and where it went.',
  },
  {
    key: 'lucy', name: 'LUCY', kind: 'Pit and lab mix', fit: 'photo', badge: 'Private repo',
    image: '/agents/lucy.jpg', alt: 'LUCY, a pit and lab mix, at a desk',
    subtitle: 'Litigation Utility for Conflicts on Your Brand',
    description: "Polls a domain-name watch service every couple of hours for newly registered look-alike domains, works out which brand in the portfolio manages each one, and emails Legal a digest with Take action and Dismiss buttons — then follows every actioned domain until it's gone.",
  },
];

/** Work that isn't a pet-named agent. */
export const TOOLS: Project[] = [
  {
    key: 'wbdb', name: 'WBDB', kind: 'The lab', fit: 'shot', badge: 'Private repo',
    image: '/projects/wbdb-lab.jpg', alt: "WBDB's lab bench: element tiles pour into a beaker labelled WBDB",
    subtitle: "Domain intelligence · the company's domains, read for risk and value",
    description: 'Where you bring a question about the domains on the platform. Scores how convincingly a look-alike domain impersonates a brand, finds the banks, credit unions, hospitals and nonprofits among them, and checks every domain against public registers of institutions and companies.',
  },
];

export const PERSONAL: Project[] = [
  {
    key: 'spotify', name: 'M5 Spotify Deck', group: 'Microcontrollers', kind: 'C++', fit: 'shot', badge: 'Open source',
    image: '/projects/m5-spotify-deck.jpg', alt: 'Screenshot of M5 Spotify Deck',
    subtitle: 'wbuf81/m5-spotify-deck',
    description: 'Retro Spotify desk companion — eight views, a real Mode 7 tilting grid, and a Wi-Fi setup portal. C++.',
    href: 'https://github.com/wbuf81/m5-spotify-deck',
    hardware: M5,
  },
  {
    key: 'knobdeck', name: 'Knobdeck', group: 'Microcontrollers', kind: 'ESP32-S3', fit: 'shot', badge: 'Open source',
    image: '/projects/knobdeck.jpg', alt: 'Screenshot of Knobdeck',
    subtitle: 'wbuf81/esp32-knobdeck',
    description: 'A desk controller on a 360×360 round touchscreen you turn. It plays your music behind seven beat-reactive visualisers — and the moment a Teams call starts, the screen becomes your mic and camera as two giant buttons: red means you are on air, tap a half to toggle it.',
    href: 'https://github.com/wbuf81/esp32-knobdeck',
    hardware: {
      label: 'Waveshare ESP32-S3-Knob-Touch-LCD-1.8',
      href: 'https://www.waveshare.com/esp32-s3-knob-touch-lcd-1.8.htm',
      image: '/boards/waveshare-knob-touch-1.8.jpg',
    },
    chips: ['Music, seven visualisers', 'Teams mic and camera'],
    chipsLabel: 'Two jobs',
  },
  {
    key: 'aac', name: 'Personal AAC Device', group: 'Microcontrollers', kind: 'M5Stack', fit: 'board', badge: 'Private repo',
    image: M5.image, alt: M5.label,
    subtitle: 'wbuf81/m5stack-aac-talker',
    description: 'A dedicated speech device for augmentative and alternative communication: one tile at a time on a 320×240 screen, three buttons to move through them and speak, and an ID screen holding emergency contact details like a medical bracelet.',
    hardware: M5,
  },
  {
    key: 'neo', name: 'Stream Deck Neo Takeover', group: 'Everything else', kind: 'Node', fit: 'shot', badge: 'Open source',
    image: '/projects/streamdeck-neo.jpg', alt: 'Screenshot of Stream Deck Neo Takeover',
    subtitle: 'wbuf81/streamdeckneoclaude',
    description: 'A Node daemon that owns the USB device outright and draws every pixel itself, with the Elgato software removed from the picture. Seven live pages — Claude Code sessions, Codex tasks, Spotify, stocks, weather, football, machine vitals — and a key press acts on the thing it shows.',
    href: 'https://github.com/wbuf81/streamdeckneoclaude',
    hardware: {
      label: 'Elgato Stream Deck Neo',
      href: 'https://www.elgato.com/us/en/p/stream-deck-neo',
      image: '/boards/elgato-stream-deck-neo.jpg',
    },
    chips: ['Claude Code sessions', 'Codex tasks', 'Spotify', 'Stocks', 'Weather', 'Football', 'Machine vitals'],
    chipsLabel: 'Seven live pages',
  },
  {
    key: 'daisy', name: 'Daisy Status Bar', group: 'Everything else', kind: 'Swift · macOS', fit: 'shot', badge: 'Open source',
    image: '/projects/daisy-status-bar.jpg', alt: 'Screenshot of Daisy Status Bar',
    subtitle: 'wbuf81/daisy-claude-status-bar',
    description: 'A Bernese Mountain Dog in the macOS menu bar that reacts to what Claude Code is doing. Swift, installable from a Homebrew tap.',
    href: 'https://github.com/wbuf81/daisy-claude-status-bar',
  },
  {
    key: 'gbforge', name: 'GBForge Tetris', group: 'Everything else', kind: 'Python', fit: 'shot', badge: 'Open source',
    image: '/projects/gbforge-title-editor.jpg', alt: 'Screenshot of the GBForge Tetris title screen editor',
    subtitle: 'wbuf81/GBForge-Tetris',
    description: 'Game Boy Tetris ROM customizer — pixel-art title screen editor, custom music, a dedication screen, and a web GUI. Python.',
    href: 'https://github.com/wbuf81/GBForge-Tetris',
  },
  {
    key: 'idle', name: 'Idle Screen Counter', group: 'Omarchy Linux', kind: 'QML', fit: 'shot', badge: 'Open source',
    image: '/projects/omarchy-idle-screencounter.jpg', alt: 'Screenshot of Idle Screen Counter',
    subtitle: 'wbuf81/omarchy-idle-screencounter',
    description: 'A theme-aware mechanical split-flap countdown that appears before Omarchy starts the screensaver. QML.',
    href: 'https://github.com/wbuf81/omarchy-idle-screencounter',
  },
  {
    key: 'labels', name: 'Omarchy Workspace Labels', group: 'Omarchy Linux', kind: 'QML', fit: 'shot', badge: 'Open source',
    image: '/projects/omarchy-workspace-labels.jpg', alt: 'Screenshot of Omarchy Workspace Labels',
    subtitle: 'wbuf81/omarchy-workspace-labels',
    description: 'Named workspaces with per-workspace icons for the Omarchy bar — hover previews, an inline icon picker, and a keyboard-driven editor. QML.',
    href: 'https://github.com/wbuf81/omarchy-workspace-labels',
  },
  {
    key: 'omafinance', name: 'OmaFinance', group: 'Omarchy Linux', kind: 'QML · Quickshell', fit: 'shot', badge: 'Private repo',
    image: '/projects/omafinance.svg', alt: 'An illustration of OmaFinance: a portfolio chart, holdings with trendlines, and a ticker in the Omarchy bar',
    subtitle: 'wbuf81/OmaFinance',
    description: 'A portfolio and market workspace that lives in Omarchy — live quotes with per-row freshness, holdings across accounts, cash-flow-adjusted returns, a privacy mode, and a scrolling bar ticker, all themed from the active Omarchy palette. Portfolio data stays on the machine. QML, with a SwiftUI sibling for macOS called BARD//OS.',
  },
];

// LegCom's hand-taped prints: tilt and tape go by position, not by project, so a row always looks scattered
// by hand whatever is added or moved. null: a strip across each top corner.
const TILT = [-2.6, 1.9, -1.3, 2.9, 2.2, -3, 1.4, -2.1];
const TAPE: ([number, number, number] | null)[] = [[38, -4, 74], null, [56, -7, 66], [30, 3, 88], null, [22, 8, 78], null, [34, 4, 68]];

function tapesAt(i: number): Tape[] {
  const t = TAPE[i % TAPE.length];
  if (!t) {
    return [
      { left: '-18px', top: '-6px', width: '56px', angle: '-38deg' },
      { left: 'calc(100% - 38px)', top: '-6px', width: '56px', angle: '38deg' },
    ];
  }
  return [{ left: `${t[0]}%`, top: '-10px', width: `${t[2]}px`, angle: `${t[1]}deg` }];
}

/** Gives each project its tilt and tape, by its position on the page (`start` is the first one's). */
export function place(list: Project[], start: number): Placed[] {
  return list.map((p, i) => ({ ...p, tilt: TILT[(start + i) % TILT.length], tapes: tapesAt(start + i) }));
}

export function featured(): Project {
  const p = PERSONAL.find((x) => x.key === FEATURED);
  if (!p) throw new Error(`FEATURED names no personal project: ${FEATURED}`);
  return p;
}

/** The personal groups in order, the featured build left out; positions carry on after the work tiles. */
export function personalGroups(): { label: (typeof GROUPS)[number]; items: Placed[] }[] {
  let n = AGENTS.length + TOOLS.length;
  return GROUPS.map((label) => {
    const items = PERSONAL.filter((p) => p.group === label && p.key !== FEATURED);
    const placed = place(items, n);
    n += items.length;
    return { label, items: placed };
  });
}

export function buildCounts(): { work: number; home: number } {
  return { work: AGENTS.length + TOOLS.length, home: PERSONAL.length };
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

/** Small counts in words, as the copy reads ("nine builds"); anything larger stays a numeral. */
export function spelled(n: number): string {
  return WORDS[n] ?? String(n);
}
