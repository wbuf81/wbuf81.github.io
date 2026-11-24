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
  /**
   * The day it was added to this site (YYYY-MM-DD). The homepage's grid shows the newest first (`homeProjects`);
   * never shown on the page. The early dates are Wes's best recollection, and he may correct them.
   */
  added: string;
  name: string;
  /** The print's caption, right-hand side: the breed for an agent, what it runs on for a build. */
  kind: string;
  subtitle: string;
  description: string;
  badge: 'Private repo' | 'Open source' | 'Live on this site' | 'Private build';
  image: string;
  alt: string;
  /** photo: a mascot, cropped from the top · shot: a screenshot, centred · board: a product shot on white */
  fit: 'photo' | 'shot' | 'board';
  href?: string;
  hardware?: Hardware;
  group?: (typeof GROUPS)[number] | typeof GAMING_GROUP;
  /** Shown when the project is in the big featured block (the /videogames hub's SNES History), under `chipsLabel`. */
  chips?: string[];
  chipsLabel?: string;
  /** The text of the link to the project's page on this site, when "Explore it →" doesn't fit. */
  cta?: string;
  /** A trailer the tile plays in place of its still picture (muted until the visitor clicks it). */
  trailer?: Trailer;
}

export interface Trailer {
  src: string;
  poster: string;
  /** The video's accessible name. */
  label: string;
  /** The video's own size in pixels (960 x 640 when left out). */
  width?: number;
  height?: number;
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

/** Personal work reads in these groups, in this order: each is a category of its own on the homepage (CATEGORIES). */
export const GROUPS = ['Mac apps', 'Omarchy Linux', 'Electronics', 'Everything else'] as const;

/**
 * The personal projects in the Gaming category, beside the games Wes made. They stay in PERSONAL so the /videogames hub
 * and the build counts still find them.
 */
export const GAMING_GROUP = 'Gaming' as const;

/**
 * The highlights row at the top of the homepage, left to right (Wes, 24 Nov 2026): Photo Frame Dashboard, CON AIR,
 * Tidemark. HIGHLIGHTS is the whole row; LATEST names which of its cards wears the filled Latest tag and the NEW strip
 * (the others are "Highlight"), and must be one of them. The row repeats its builds: with All pressed the grid below
 * leaves them out (they are right above it), and a category shows them as ordinary tiles. Whenever a project is added, ask Wes whether it should become the Latest card
 * (CLAUDE.md); a card it replaces simply leaves the row, unless he keeps it in HIGHLIGHTS.
 */
export const HIGHLIGHTS: string[] = ['frame', 'conair', 'tidemark'];
export const LATEST = 'frame';

const M5: Hardware = {
  label: 'M5Stack Core Basic v2.7',
  href: 'https://shop.m5stack.com/products/esp32-basic-core-iot-development-kit-v2-7',
  image: '/boards/m5stack-core-basic.jpg',
};

export const AGENTS: Project[] = [
  {
    key: 'oscar', added: '2026-02-16', name: 'OSCAR', kind: 'Bernese mountain dog', fit: 'photo', badge: 'Private repo',
    image: '/agents/oscar.jpg', alt: 'OSCAR, a Bernese mountain dog, at a desk with two monitors',
    subtitle: 'Obligation Scanning & Compliance Analysis Reporter',
    description: 'AI agent that continuously scans company web properties for legal compliance gaps — privacy notices, cookie banners, GDPR requirements, hidden footer links — with automated reporting and email alerts.',
  },
  {
    key: 'smores', added: '2026-02-16', name: 'SMORES', kind: 'Schnoodle', fit: 'photo', badge: 'Private repo',
    image: '/agents/smores.jpg', alt: 'SMORES, a schnoodle, at a desk with a binder',
    subtitle: 'Service Mark Ongoing Review & Enhancement System',
    description: 'Tracks all service marks, renewals, and filing deadlines across the brand portfolio. Monitors trademark lifecycles and fires alerts before anything lapses.',
  },
  {
    key: 'maisie', added: '2026-05-22', name: 'MAISIE', kind: 'Tabby cat', fit: 'photo', badge: 'Private repo',
    image: '/agents/maisie.jpg', alt: 'MAISIE, a tabby cat in glasses, reading at a desk',
    subtitle: 'Monitoring Agent for International Sanctions & Intelligence Engine',
    description: "Monitors domains across the company's brand portfolio against the OFAC Specially Designated Nationals list. Syncs sanctions data, flags potential matches, and tracks compliance status across the portfolio.",
  },
  {
    key: 'snoop', added: '2026-05-22', name: 'SNOOP', kind: 'Detective beagle', fit: 'photo', badge: 'Private repo',
    image: '/agents/snoop.jpg', alt: 'SNOOP, a beagle in a detective hat, at a desk',
    subtitle: 'Direct Navigator for Oversight of Organizational Policies',
    description: 'Monitors and manages organizational policies across compliance frameworks. Tracks policy lifecycles, detects gaps in framework coverage, and keeps documentation current.',
  },
  {
    key: 'rhino', added: '2026-05-22', name: 'RHINO', kind: 'Rhinoceros', fit: 'photo', badge: 'Private repo',
    image: '/agents/rhino.jpg', alt: 'RHINO, a rhinoceros, at a desk',
    subtitle: 'Risk Hub for Identification, Notification & Oversight',
    description: 'Maintains the enterprise risk register — material risks with likelihood, residual score, and mitigation plan in one place. Quarterly assessment cadence with full audit trail and portfolio-level exposure tracking.',
  },
  {
    key: 'pabsty', added: '2026-05-22', name: 'PABSTY', kind: 'British shorthair', fit: 'photo', badge: 'Private repo',
    image: '/agents/pabsty.jpg', alt: 'PABSTY, a grey British shorthair, at a desk',
    subtitle: 'Privacy Analytics & Benchmarking for Subject Tasks',
    description: 'Transforms privacy request data into executive-ready analytics. Tracks DSAR volumes by region, brand, and regulation type — automated monthly snapshots delivered without manual intervention.',
  },
  {
    key: 'beasley', added: '2026-08-30', name: 'BEASLEY', kind: 'Aussiedoodle', fit: 'photo', badge: 'Private repo',
    image: '/agents/beasley.jpg', alt: 'BEASLEY, an aussiedoodle, at a desk',
    subtitle: 'Brand Evaluation & Abuse Scoping Linked Exactly to Your-brands',
    description: 'Routes abuse complaints to the team that owns them — reads the incoming complaint mail, pulls out the domains, attributes each one to its brand in the portfolio, and keeps the analytics on what came in and where it went.',
  },
  {
    key: 'lucy', added: '2026-10-03', name: 'LUCY', kind: 'Pit and lab mix', fit: 'photo', badge: 'Private repo',
    image: '/agents/lucy.jpg', alt: 'LUCY, a pit and lab mix, at a desk',
    subtitle: 'Litigation Utility for Conflicts on Your Brand',
    description: "Polls a domain-name watch service every couple of hours for newly registered look-alike domains, works out which brand in the portfolio manages each one, and emails Legal a digest with Take action and Dismiss buttons — then follows every actioned domain until it's gone.",
  },
  {
    key: 'winnie', added: '2026-10-22', name: 'WINNIE', kind: 'Tabby cat', fit: 'photo', badge: 'Private repo',
    image: '/agents/winnie.jpg', alt: 'WINNIE, a tabby cat in glasses and a flamingo shirt, at a desk',
    subtitle: 'Watchful Inbox Navigator for Notices, Inquiries & Escalations',
    description: "Watches the privacy team's shared inbox and sorts every message by the rules the team already works by — what needs action, what's a follow-up, what's noise. Each request becomes a ticket with the routing WINNIE proposes, checked against what a person actually did, and a weekday morning brief says what's waiting.",
  },
];

/** Work that isn't a pet-named agent. */
export const TOOLS: Project[] = [
  {
    key: 'wbdb', added: '2026-10-03', name: 'WBDB', kind: 'The lab', fit: 'shot', badge: 'Private repo',
    image: '/projects/wbdb-lab.jpg', alt: "WBDB's lab bench: element tiles pour into a beaker labelled WBDB",
    subtitle: "Domain intelligence · the company's domains, read for risk and value",
    description: 'Where you bring a question about the domains on the platform. Scores how convincingly a look-alike domain impersonates a brand, finds the banks, credit unions, hospitals and nonprofits among them, and checks every domain against public registers of institutions and companies.',
  },
];

export const PERSONAL: Project[] = [
  {
    key: 'snes', added: '2026-10-11', name: 'SNES History', group: GAMING_GROUP, kind: 'Next.js · TypeScript', fit: 'shot', badge: 'Live on this site',
    image: '/projects/snes-history.jpg', alt: 'A collage of Super Nintendo box art',
    subtitle: 'Every US Super Nintendo game, 1991–1998',
    description: 'A playable history of the Super Nintendo in America: all 717 US releases on a month-by-month timeline, cover wall, shelf and score scatter, with box art, magazine scores and gameplay clips. A week-by-week time machine shows what was on the radio, at the movies and in the news when each game came out.',
    href: '/videogames/snes-history',
    chips: ['Timeline', 'Cover wall', 'Game shelf', 'Score scatter', 'Time Machine', 'Gameplay clips'],
    chipsLabel: 'Ways in',
  },
  {
    key: 'spotify', added: '2026-08-29', name: 'M5 Spotify Deck', group: 'Electronics', kind: 'C++', fit: 'shot', badge: 'Open source',
    image: '/projects/m5-spotify-deck.jpg', alt: 'Screenshot of M5 Spotify Deck',
    subtitle: 'wbuf81/m5-spotify-deck',
    description: 'Retro Spotify desk companion — eight views, a real Mode 7 tilting grid, and a Wi-Fi setup portal. C++.',
    href: 'https://github.com/wbuf81/m5-spotify-deck',
    hardware: M5,
  },
  {
    key: 'knobdeck', added: '2026-08-30', name: 'Knobdeck', group: 'Electronics', kind: 'ESP32-S3', fit: 'shot', badge: 'Open source',
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
    key: 'neo', added: '2026-08-30', name: 'Stream Deck Neo Takeover', group: 'Electronics', kind: 'Node', fit: 'shot', badge: 'Open source',
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
    key: 'aac', added: '2026-08-30', name: 'Personal AAC Device', group: 'Electronics', kind: 'M5Stack', fit: 'board', badge: 'Private repo',
    image: M5.image, alt: M5.label,
    subtitle: 'wbuf81/m5stack-aac-talker',
    description: 'A dedicated speech device for augmentative and alternative communication: one tile at a time on a 320×240 screen, three buttons to move through them and speak, and an ID screen holding emergency contact details like a medical bracelet.',
    hardware: M5,
  },
  {
    key: 'frame', added: '2026-11-24', name: 'Photo Frame Dashboard', group: 'Electronics', kind: 'Android · JS', fit: 'shot', badge: 'Private repo',
    image: '/projects/photo-frame.jpg',
    alt: "The photo frame at night: a large clock over a rocket launch, tomorrow's calendar, the weather and the markets",
    subtitle: 'A hacked photo frame that shows my day',
    description: 'A 10.1-inch Wi-Fi photo frame, opened up and given a new job: my calendar, the weather, the markets, where my car is and my Claude usage, in three looks and one that follows the sun. A Cloudflare Worker serves it, so no computer has to be on.',
    href: '/builds/photo-frame', cta: 'How I built it →',
  },
  {
    key: 'office', added: '2026-11-01', name: 'My Office in 3D', group: 'Everything else', kind: 'Three.js · TypeScript', fit: 'shot', badge: 'Live on this site',
    image: '/projects/wesley-office.jpg', alt: 'My office as a 3D dollhouse',
    subtitle: 'Inspired by Wes Bos’s 3D office',
    description: 'My actual office, rebuilt in 3D from an iPhone room scan with Wes Bos’s 3d-model-anything. Walk around it, flip it to night, and click the graded games, the Gators helmet or Daisy for the story behind each one.',
    href: '/office/',
    chips: ['Dollhouse', 'Walk around', 'Night mode', 'Knolling'],
    chipsLabel: 'Ways in',
  },
  {
    key: 'tidemark', added: '2026-10-22', name: 'Tidemark', group: 'Mac apps', kind: 'Swift · macOS', fit: 'shot', badge: 'Open source',
    image: '/projects/tidemark.jpg', alt: "Tidemark's Week window at sunset: 19 hours 20 minutes so far this week, a tank of water for each day over the calendar, and two tilted water cards for the plans Personal and Harbor Labs",
    subtitle: 'wbuf81/tidemark',
    description: "Your week with Claude Code and your plan's limits, at the edge of the screen: a tide for each plan beside the Dock, a battery for each in the menu bar, and a calendar of the week's sessions and commits that writes your weekly report. Swift.",
    href: 'https://github.com/wbuf81/tidemark',
  },
  {
    key: 'tesla', added: '2026-10-22', name: 'Mac Tesla Tracker', group: 'Mac apps', kind: 'Swift · macOS', fit: 'shot', badge: 'Open source',
    image: '/projects/mac-tesla-tracker.jpg', alt: 'Mac Tesla Tracker open from the menu bar: one car parked at School and one asleep at Home, each on its own map',
    subtitle: 'wbuf81/mac-tesla-tracker',
    description: "Where every car on your Tesla account is, right in the menu bar — School · Home at a glance, and an arrival time while one is driving. Click a car for its map, get an alert when one leaves or gets home. Read-only through Tesla's official API: it keeps inside the free monthly credit, and everything stays on the Mac.",
    href: 'https://github.com/wbuf81/mac-tesla-tracker',
    chips: ['Every car in the menu bar', 'Leave and arrive alerts', 'A map for each car', 'Usage against the free credit', 'Read-only'],
  },
  {
    key: 'daisy', added: '2026-08-29', name: 'Daisy Status Bar', group: 'Mac apps', kind: 'Swift · macOS', fit: 'shot', badge: 'Open source',
    image: '/projects/daisy-status-bar.jpg', alt: 'Screenshot of Daisy Status Bar',
    subtitle: 'wbuf81/daisy-claude-status-bar',
    description: 'A Bernese Mountain Dog in the macOS menu bar that reacts to what Claude Code is doing. Swift, installable from a Homebrew tap.',
    href: 'https://github.com/wbuf81/daisy-claude-status-bar',
  },
  {
    key: 'gbforge', added: '2026-08-29', name: 'GBForge Tetris', group: GAMING_GROUP, kind: 'Python', fit: 'shot', badge: 'Open source',
    image: '/projects/gbforge-title-editor.jpg', alt: 'Screenshot of the GBForge Tetris title screen editor',
    subtitle: 'wbuf81/GBForge-Tetris',
    description: 'Game Boy Tetris ROM customizer — pixel-art title screen editor, custom music, a dedication screen, and a web GUI. Python.',
    href: 'https://github.com/wbuf81/GBForge-Tetris',
  },
  {
    key: 'idle', added: '2026-09-04', name: 'Idle Screen Counter', group: 'Omarchy Linux', kind: 'QML', fit: 'shot', badge: 'Open source',
    image: '/projects/omarchy-idle-screencounter.jpg', alt: 'Screenshot of Idle Screen Counter',
    subtitle: 'wbuf81/omarchy-idle-screencounter',
    description: 'A theme-aware mechanical split-flap countdown that appears before Omarchy starts the screensaver. QML.',
    href: 'https://github.com/wbuf81/omarchy-idle-screencounter',
  },
  {
    key: 'labels', added: '2026-08-29', name: 'Omarchy Workspace Labels', group: 'Omarchy Linux', kind: 'QML', fit: 'shot', badge: 'Open source',
    image: '/projects/omarchy-workspace-labels.jpg', alt: 'Screenshot of Omarchy Workspace Labels',
    subtitle: 'wbuf81/omarchy-workspace-labels',
    description: 'Named workspaces with per-workspace icons for the Omarchy bar — hover previews, an inline icon picker, and a keyboard-driven editor. QML.',
    href: 'https://github.com/wbuf81/omarchy-workspace-labels',
  },
  {
    key: 'omafinance', added: '2026-10-03', name: 'OmaFinance', group: 'Omarchy Linux', kind: 'QML · Quickshell', fit: 'shot', badge: 'Private repo',
    image: '/projects/omafinance.svg', alt: 'An illustration of OmaFinance: a portfolio chart, holdings with trendlines, and a ticker in the Omarchy bar',
    subtitle: 'wbuf81/OmaFinance',
    description: 'A portfolio and market workspace that lives in Omarchy — live quotes with per-row freshness, holdings across accounts, cash-flow-adjusted returns, a privacy mode, and a scrolling bar ticker, all themed from the active Omarchy palette. Portfolio data stays on the machine. QML, with a SwiftUI sibling for macOS called BARD//OS.',
  },
];

/**
 * Games Wes has made, newest first (24 Nov 2026). Each is a tile in the homepage's Gaming category. A private build has a page on this site about it and nothing to download.
 */
export const GAMES: Project[] = [
  {
    key: 'conair', added: '2026-11-24', name: 'CON AIR', kind: 'Game Boy Advance · C', fit: 'shot', badge: 'Private build',
    image: '/projects/con-air.png',
    alt: 'The CON AIR title screen: a winged logo over a city skyline at night, with Connie flying past',
    subtitle: 'A one-button flying game for the Game Boy Advance',
    description: 'Hold A to rise, let go to fall. Connie has put the house on the Jaguars winning the Super Bowl, and he stays in the air until the bet comes in. Five story levels, an endless mode that gets harder every lap, and a versus mode where friends pass one handheld around. It runs at 60 frames a second on real hardware and saves to the cartridge.',
    href: '/games/con-air',
    cta: 'About the game →',
    trailer: { src: '/games/con-air/trailer.mp4', poster: '/games/con-air/title.png', label: 'CON AIR trailer' },
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

/** The tilt and tape for the print at position `i`, so a page can tape up prints that aren't projects. */
export function placement(i: number): { tilt: number; tapes: Tape[] } {
  return { tilt: TILT[i % TILT.length], tapes: tapesAt(i) };
}

/** Gives each project its tilt and tape, by its position on the page (`start` is the first one's). */
export function place(list: Project[], start: number): Placed[] {
  return list.map((p, i) => ({ ...p, ...placement(start + i) }));
}

/** A personal project by key; throws rather than let a renamed key render nothing. */
export function personal(key: string): Project {
  const p = PERSONAL.find((x) => x.key === key);
  if (!p) throw new Error(`No personal project: ${key}`);
  return p;
}

/** Any project by key, across agents, tools, personal builds and games; throws on an unknown key. */
export function project(key: string): Project {
  const p = [...AGENTS, ...TOOLS, ...PERSONAL, ...GAMES].find((x) => x.key === key);
  if (!p) throw new Error(`No project: ${key}`);
  return p;
}

/** The highlights row, left to right; `latest` marks the one card named by LATEST. */
export function highlights(): { project: Project; latest: boolean }[] {
  return HIGHLIGHTS.map((k) => ({ project: project(k), latest: k === LATEST }));
}

/** Newest first by `added`; projects added the same day keep their order in the array (the sort is stable). */
export function newestFirst<T extends { added: string }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => b.added.localeCompare(a.added));
}

export type CategoryId = 'work' | 'games' | 'mac' | 'linux' | 'electronics' | 'more';

/**
 * The homepage's categories, in the band's order (Wes, 24 Nov 2026: one grid of every project, "defaulting to all, but
 * then the click tabs"). `name` is the full name, on each tile's label; `label` and `icon` are the category's button in
 * the band (ProjectFilter), shorter where the name is long. `id` is the button's address (/#work …). A personal group's
 * category carries its `group`; work and games are found by the list a project lives in (categoryOf).
 */
export const CATEGORIES: { id: CategoryId; name: string; label: string; icon: string; group?: (typeof GROUPS)[number] }[] = [
  { id: 'work', name: 'Work', label: 'Work', icon: '🤖' },
  { id: 'games', name: 'Gaming', label: 'Gaming', icon: '🎮' },
  { id: 'mac', name: 'Mac apps', label: 'Mac apps', icon: '💻', group: 'Mac apps' },
  { id: 'linux', name: 'Omarchy Linux', label: 'Linux', icon: '🐧', group: 'Omarchy Linux' },
  { id: 'electronics', name: 'Electronics', label: 'Electronics', icon: '🔌', group: 'Electronics' },
  { id: 'more', name: 'Everything else', label: 'More', icon: '✨', group: 'Everything else' },
];

/** A project's category, from where it lives: the agents and WBDB are work, games and the gaming group are gaming. */
export function categoryOf(p: Project): CategoryId {
  if (AGENTS.includes(p) || TOOLS.includes(p)) return 'work';
  if (GAMES.includes(p) || p.group === GAMING_GROUP) return 'games';
  const c = CATEGORIES.find((x) => x.group && x.group === p.group);
  if (!c) throw new Error(`No category for ${p.key}`);
  return c.id;
}

export interface HomeProject extends Placed {
  category: CategoryId;
}

/**
 * Every project on the homepage, as one list: newest first across everything by `added`. Ties keep a fixed order, work
 * first, then the personal builds in PERSONAL's order, then games (the sort is stable). Tilt and tape go by position
 * in this full list, so a tile keeps its look when the grid is filtered.
 */
export function homeProjects(): HomeProject[] {
  const all = [...AGENTS, ...TOOLS, ...PERSONAL, ...GAMES];
  return place(newestFirst(all), 0).map((p) => ({ ...p, category: categoryOf(all.find((x) => x.key === p.key)!) }));
}

/** What the homepage's band can press: every project, or one category. */
export type Filter = 'all' | CategoryId;

export interface FilterItem {
  id: Filter;
  label: string;
  /** The full name, for assistive tech when the label is shorter ("Linux" is Omarchy Linux). */
  name: string;
  icon?: string;
  count: number;
}

/** The band's buttons, All first, each with its count. All counts every project, the highlights included. */
export function filterItems(projects: { category: CategoryId }[] = homeProjects()): FilterItem[] {
  return [
    { id: 'all', label: 'All', name: 'All', count: projects.length },
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, name: c.name, icon: c.icon, count: projects.filter((p) => p.category === c.id).length })),
  ];
}

export function buildCounts(): { work: number; home: number } {
  return { work: AGENTS.length + TOOLS.length, home: PERSONAL.length + GAMES.length };
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

/** Small counts in words, as the copy reads ("nine builds"); anything larger stays a numeral. */
export function spelled(n: number): string {
  return WORDS[n] ?? String(n);
}
