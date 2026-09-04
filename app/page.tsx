'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Nav } from './components/Nav';
import TetrisBackground from './components/TetrisBackground';
import type { TetrisHandle } from './components/TetrisBackground';
import MsPacManBackground from './components/MsPacManBackground';
import type { MsPacManHandle } from './components/MsPacManBackground';
import GalagaBackground from './components/GalagaBackground';
import type { GalagaHandle } from './components/GalagaBackground';

type GameType = 'tetris' | 'pacman' | 'galaga';


const REPO_CARDS = [
  {
    title: 'OSCAR',
    subtitle: 'Obligation Scanning & Compliance Analysis Reporter',
    description: 'AI agent that continuously scans company web properties for legal compliance gaps — privacy notices, cookie banners, GDPR requirements, hidden footer links — with automated reporting and email alerts.',
    href: null,
    badge: 'Private Repo',
    image: '/agents/oscar.jpg',
    fullWidth: false,
  },
  {
    title: 'SMORES',
    subtitle: 'Service Mark Ongoing Review & Enhancement System',
    description: 'Tracks all service marks, renewals, and filing deadlines across the brand portfolio. Monitors trademark lifecycles and fires alerts before anything lapses.',
    href: null,
    badge: 'Private Repo',
    image: '/agents/smores.jpg',
  },
  {
    title: 'MAISIE',
    subtitle: 'Monitoring Agent for International Sanctions & Intelligence Engine',
    description: 'Monitors domains across the company\'s brand portfolio against the OFAC Specially Designated Nationals list. Syncs sanctions data, flags potential matches, and tracks compliance status across the portfolio.',
    href: null,
    badge: 'Private Repo',
    image: '/agents/maisie.jpg',
  },
  {
    title: 'SNOOP',
    subtitle: 'Direct Navigator for Oversight of Organizational Policies',
    description: 'Monitors and manages organizational policies across compliance frameworks. Tracks policy lifecycles, detects gaps in framework coverage, and keeps documentation current.',
    href: null,
    badge: 'Private Repo',
    image: '/agents/snoop.jpg',
  },
  {
    title: 'RHINO',
    subtitle: 'Risk Hub for Identification, Notification & Oversight',
    description: 'Maintains the enterprise risk register — material risks with likelihood, residual score, and mitigation plan in one place. Quarterly assessment cadence with full audit trail and portfolio-level exposure tracking.',
    href: null,
    badge: 'Private Repo',
    image: '/agents/rhino.jpg',
  },
  {
    title: 'PABSTY',
    subtitle: 'Privacy Analytics & Benchmarking for Subject Tasks',
    description: 'Transforms privacy request data into executive-ready analytics. Tracks DSAR volumes by region, brand, and regulation type — automated monthly snapshots delivered without manual intervention.',
    href: null,
    badge: 'Private Repo',
    image: '/agents/pabsty.jpg',
    fullWidth: false,
  },
  {
    title: 'BEASLEY',
    subtitle: 'Brand Evaluation & Abuse Scoping Linked Exactly to Your-brands',
    description: 'Routes abuse complaints to the team that owns them — reads the incoming complaint mail, pulls out the domains, attributes each one to its brand in the portfolio, and keeps the analytics on what came in and where it went.',
    href: null,
    badge: 'Private Repo',
    image: '/agents/beasley.jpg',
  },
];
/*
 * Project cards describe what a thing does and what it runs on. No line counts,
 * test counts, or other repo statistics — they say nothing to a reader and date
 * the moment the repo moves on.
 */
const PERSONAL_CARDS = [
  {
    title: 'M5 Spotify Deck',
    shot: '/projects/m5-spotify-deck.jpg',
    group: 'Microcontrollers',
    subtitle: 'wbuf81/m5-spotify-deck',
    description: 'Retro Spotify desk companion — eight views, a real Mode 7 tilting grid, and a Wi-Fi setup portal. C++.',
    href: 'https://github.com/wbuf81/m5-spotify-deck',
    badge: 'Open Source',
    image: null,
    hardware: {
      label: 'M5Stack Core Basic v2.7',
      href: 'https://shop.m5stack.com/products/esp32-basic-core-iot-development-kit-v2-7',
      image: '/boards/m5stack-core-basic.jpg',
    },
  },
  {
    title: 'Knobdeck',
    group: 'Microcontrollers',
    shot: '/projects/knobdeck.jpg',
    subtitle: 'wbuf81/esp32-knobdeck',
    description: 'A desk controller on a 360×360 round touchscreen you turn. It plays your music behind seven beat-reactive visualisers — and the moment a Teams call starts, the screen becomes your mic and camera as two giant buttons: red means you are on air, tap a half to toggle it.',
    href: 'https://github.com/wbuf81/esp32-knobdeck',
    badge: 'Open Source',
    hardware: {
      label: 'Waveshare ESP32-S3-Knob-Touch-LCD-1.8',
      href: 'https://www.waveshare.com/esp32-s3-knob-touch-lcd-1.8.htm',
      image: '/boards/waveshare-knob-touch-1.8.jpg',
    },
  },
  {
    title: 'Personal AAC Device',
    group: 'Microcontrollers',
    subtitle: 'wbuf81/m5stack-aac-talker',
    description: 'A dedicated speech device for augmentative and alternative communication: one tile at a time on a 320×240 screen, three buttons to move through them and speak, and an ID screen holding emergency contact details like a medical bracelet.',
    href: null,
    badge: 'Private Repo',
    hardware: {
      label: 'M5Stack Core Basic v2.7',
      href: 'https://shop.m5stack.com/products/esp32-basic-core-iot-development-kit-v2-7',
      image: '/boards/m5stack-core-basic.jpg',
    },
  },
  {
    title: 'Stream Deck Neo Takeover',
    group: 'Everything else',
    subtitle: 'wbuf81/streamdeckneoclaude',
    description: 'A Node daemon that owns the USB device outright and draws every pixel itself, with the Elgato software removed from the picture. Seven live pages — Claude Code sessions, Codex tasks, Spotify, stocks, weather, football, machine vitals — and a key press acts on the thing it shows.',
    href: 'https://github.com/wbuf81/streamdeckneoclaude',
    badge: 'Open Source',
    shot: '/projects/streamdeck-neo.jpg',
    hardware: {
      label: 'Elgato Stream Deck Neo',
      href: 'https://www.elgato.com/us/en/p/stream-deck-neo',
      image: '/boards/elgato-stream-deck-neo.jpg',
    },
  },
  {
    title: 'Daisy Status Bar',
    shot: '/projects/daisy-status-bar.jpg',
    group: 'Everything else',
    subtitle: 'wbuf81/daisy-claude-status-bar',
    description: 'A Bernese Mountain Dog in the macOS menu bar that reacts to what Claude Code is doing. Swift, installable from a Homebrew tap.',
    href: 'https://github.com/wbuf81/daisy-claude-status-bar',
    badge: 'Open Source',
    image: null,
  },
  {
    title: 'GBForge Tetris',
    shot: '/projects/gbforge-title-editor.jpg',
    group: 'Everything else',
    subtitle: 'wbuf81/GBForge-Tetris',
    description: 'Game Boy Tetris ROM customizer — pixel-art title screen editor, custom music, a dedication screen, and a web GUI. Python.',
    href: 'https://github.com/wbuf81/GBForge-Tetris',
    badge: 'Open Source',
    image: null,
  },
  {
    title: 'Idle Screen Counter',
    shot: 'https://raw.githubusercontent.com/wbuf81/omarchy-idle-screencounter/main/preview.png',
    group: 'Omarchy Linux',
    subtitle: 'wbuf81/omarchy-idle-screencounter',
    description: 'A theme-aware mechanical split-flap countdown that appears before Omarchy starts the screensaver. QML.',
    href: 'https://github.com/wbuf81/omarchy-idle-screencounter',
    badge: 'Open Source',
  },
  {
    title: 'Omarchy Workspace Labels',
    shot: '/projects/omarchy-workspace-labels.jpg',
    group: 'Omarchy Linux',
    subtitle: 'wbuf81/omarchy-workspace-labels',
    description: 'Named workspaces with per-workspace icons for the Omarchy bar — hover previews, an inline icon picker, and a keyboard-driven editor. QML.',
    href: 'https://github.com/wbuf81/omarchy-workspace-labels',
    badge: 'Open Source',
    image: null,
  },
];

/** Personal work reads in these groups, in this order. */
const PERSONAL_GROUPS = ['Omarchy Linux', 'Microcontrollers', 'Everything else'];

const INTEREST_CARDS = [
  {
    title: 'STEM Mentoring',
    description: 'GatorLaunch mentor at the University of Florida and Big Brothers Big Sisters volunteer since 2011.',
  },
  {
    title: 'Autism & Inclusivity Advocate',
    description: 'Championing neurodiversity awareness and inclusive environments for families and workplaces.',
  },
];

export default function HomePage() {
  const [activeGame, setActiveGame] = useState<GameType>('tetris');
  const tetrisRef = useRef<TetrisHandle>(null);
  const pacmanRef = useRef<MsPacManHandle>(null);
  const galagaRef = useRef<GalagaHandle>(null);
  const [gameState, setGameState] = useState({ isPlaying: false, score: 0, secondary: 0 });

  const handleTetrisState = useCallback((state: { isPlaying: boolean; score: number; lines: number }) => {
    setGameState({ isPlaying: state.isPlaying, score: state.score, secondary: state.lines });
  }, []);

  const handlePacmanState = useCallback((state: { isPlaying: boolean; score: number; level: number }) => {
    setGameState({ isPlaying: state.isPlaying, score: state.score, secondary: state.level });
  }, []);

  const handleGalagaState = useCallback((state: { isPlaying: boolean; score: number; stage: number }) => {
    setGameState({ isPlaying: state.isPlaying, score: state.score, secondary: state.stage });
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (activeGame === 'tetris') tetrisRef.current?.togglePlay();
    else if (activeGame === 'pacman') pacmanRef.current?.togglePlay();
    else galagaRef.current?.togglePlay();
  }, [activeGame]);

  const handleSwitchGame = useCallback((game: GameType) => {
    if (game === activeGame) return;
    setGameState({ isPlaying: false, score: 0, secondary: 0 });
    setActiveGame(game);
  }, [activeGame]);

  const gameLabels = {
    tetris: { play: 'Play Tetris', auto: 'Auto-play', stat: 'Lines' },
    pacman: { play: 'Play Pac-Man', auto: 'Auto-play', stat: 'Level' },
    galaga: { play: 'Play Galaga', auto: 'Auto-play', stat: 'Stage' },
  };

  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="hero">
        {activeGame === 'tetris' && <TetrisBackground ref={tetrisRef} onStateChange={handleTetrisState} />}
        {activeGame === 'pacman' && <MsPacManBackground ref={pacmanRef} onStateChange={handlePacmanState} />}
        {activeGame === 'galaga' && <GalagaBackground ref={galagaRef} onStateChange={handleGalagaState} />}
        <div className="hero-inner">
          <div className="hero-text">
            <h1 className="hero-name">Wesley Bard</h1>
            <div className="hero-then-now">
              <p><span className="tn-label">Then</span>Engineer @ Lockheed Martin</p>
              <p><span className="tn-label">Now</span>Governance, Risk &amp; Compliance @ Newfold Digital</p>
              <p><span className="tn-label">Still</span>Building stuff</p>
            </div>
            <div className="game-row">
              <div className="game-selector">
                <button
                  className={`game-selector-text${activeGame === 'tetris' ? ' game-selector-active' : ''}`}
                  onClick={() => handleSwitchGame('tetris')}
                >
                  Tetris
                </button>
                <span className="game-selector-divider">|</span>
                <button
                  className={`game-selector-text${activeGame === 'pacman' ? ' game-selector-active' : ''}`}
                  onClick={() => handleSwitchGame('pacman')}
                >
                  Ms. Pac-Man
                </button>
                <span className="game-selector-divider">|</span>
                <button
                  className={`game-selector-text${activeGame === 'galaga' ? ' game-selector-active' : ''}`}
                  onClick={() => handleSwitchGame('galaga')}
                >
                  Galaga
                </button>
              </div>
              <button
                className="game-play-btn"
                onClick={handleTogglePlay}
              >
                {gameState.isPlaying ? '⏹ Stop' : '▶ Play'}
              </button>
            </div>
            <div className="game-stats" style={{ opacity: gameState.isPlaying ? 1 : 0 }}>
              <span>Score: {gameState.score.toLocaleString()}</span>
              <span className="game-stats-sep">&middot;</span>
              <span>{gameLabels[activeGame].stat}: {gameState.secondary}</span>
              <span className="game-stats-sep">&middot;</span>
              <span className="game-controls-inline">
                {activeGame === 'tetris' && <>arrows move &middot; space drop</>}
                {activeGame === 'pacman' && <>arrows steer</>}
                {activeGame === 'galaga' && <>arrows move &middot; space fire</>}
              </span>
            </div>
          </div>
          <div className="hero-headshot">
            <div className="headshot-frame">
              <Image
                src="/headshot-thumb.jpg"
                alt="Wesley Bard"
                width={200}
                height={200}
                priority
                style={{ borderRadius: '50%', objectFit: 'cover', width: '200px', height: '200px' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Projects & Beyond */}
      <section id="beyond" className="section">
        <div className="section-inner">
          <h2 className="section-heading">Projects</h2>
          <h3 className="subsection-heading">Work</h3>

          <p className="group-label">Autonomous AI Agents</p>
          <p className="group-note">
            Agents that take the repetitive end of legal and compliance work — scanning, monitoring,
            reporting, chasing deadlines before they lapse. Each one named after a coworker&apos;s pet,
            driving engagement and making compliance a little more fun.
          </p>
          <div className="agent-grid">
            {REPO_CARDS.filter((card) => card.href === null).map((card) => (
              <div key={card.title} className="beyond-card agent-card">
                {card.image && (
                  <div className="agent-img-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.image} alt={card.title} className="agent-img" />
                    <div className="agent-img-overlay" />
                  </div>
                )}
                <div className="agent-body">
                  <div className="beyond-header">
                    <h4 className="beyond-title">{card.title}</h4>
                    {card.badge && <span className="beyond-badge">{card.badge}</span>}
                  </div>
                  {card.subtitle && <p className="beyond-subtitle">{card.subtitle}</p>}
                  <p className="beyond-desc">{card.description}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="subsection-heading">Personal</h3>
          {PERSONAL_GROUPS.map((group) => (
            <div key={group}>
              <p className="group-label">{group}</p>
              <div className="agent-grid">
                {PERSONAL_CARDS.filter((card) => card.group === group).map((card) => (
                  <div key={card.title} className="beyond-card agent-card">
                    {(card.shot || card.hardware?.image) && (
                      <div className="agent-img-wrap is-shot">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={card.shot ?? card.hardware?.image}
                          alt={card.shot ? `${card.title} screenshot` : card.hardware?.label}
                          className={`agent-img${card.shot ? '' : ' is-board'}`}
                        />
                      </div>
                    )}
                    <div className="agent-body">
                      <div className="beyond-header is-stacked">
                        <h4 className="beyond-title">{card.title}</h4>
                        <span className="beyond-badge">{card.badge}</span>
                      </div>
                      <p className="beyond-desc">{card.description}</p>
                      <div className="card-links">
                        {card.href && (
                          <a className="beyond-link" href={card.href} target="_blank" rel="noopener noreferrer">
                            Repo &rarr;
                          </a>
                        )}
                        {card.hardware && (
                          <a className="hardware-link" href={card.hardware.href} target="_blank" rel="noopener noreferrer">
                            {card.hardware.image && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={card.hardware.image} alt={card.hardware.label} className="board-img" />
                            )}
                            <span>{card.hardware.label}&nbsp;&#8599;</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* GitHub Activity */}
          <div className="github-activity">
            <div className="github-activity-header">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style={{ color: '#1f2937' }}>
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="github-activity-label">GitHub Activity</span>
              <span className="github-activity-note">Most projects are in private repositories</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://ghchart.rshah.org/1f2937/wbuf81"
              alt="GitHub contribution chart for wbuf81"
              className="github-heatmap"
            />
          </div>

          {/* Interests */}
          <h3 className="subsection-heading">Beyond Work</h3>
          <div className="beyond-grid beyond-grid-narrow">
            {INTEREST_CARDS.map((card) => (
              <div key={card.title} className="beyond-card">
                <h3 className="beyond-title">{card.title}</h3>
                <p className="beyond-desc">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Connect */}
      <section id="connect" className="section section-alt">
        <div className="section-inner">
          <h2 className="section-heading">Connect</h2>
          <p className="connect-text">
            Feel free to reach out.  Resume available upon request.
          </p>
          <div className="connect-links">
            <a href="https://www.linkedin.com/in/wesleybard/" target="_blank" rel="noopener noreferrer" className="connect-btn connect-btn-primary">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </a>
            <a href="https://github.com/wbuf81" target="_blank" rel="noopener noreferrer" className="connect-btn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-copy">&copy; 2026 Wesley Bard</span>
          <div className="footer-links">
            <a href="https://www.linkedin.com/in/wesleybard/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a href="https://github.com/wbuf81" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>

      <style jsx>{`
        /* Hero */
        .hero {
          padding: 64px 24px;
          background: #fff;
          position: relative;
          overflow: hidden;
        }
        .hero-inner {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 48px;
          position: relative;
          z-index: 1;
        }
        .hero-text {
          flex: 1;
        }
        .hero-name {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 3.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          line-height: 1.1;
        }
        .hero-then-now {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.15rem;
          color: #6b7280;
          margin: 18px 0 0;
          font-weight: 400;
        }
        .hero-then-now p {
          margin: 4px 0 0;
        }
        .tn-label {
          display: inline-block;
          width: 4.6em;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9ca3af;
        }
        .hero-headshot {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        /* The same treatment the project tiles get: grayscale at rest, colour
           and a small zoom on hover. It used to link to the full-size file,
           which nobody wants — the portrait is the point, not a lightbox. */
        /*
          The portrait is shot on white, so the circle is only visible because
          the resting filter's contrast(0.78) tints that white to grey. Clearing
          the filter on hover let the background blend into the page and the
          shoulders read as square edges — hence the ring, which holds the
          circle in both states. The frame scales rather than the image inside
          it: same effect, and nothing to clip.
        */
        .headshot-frame {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(20, 19, 15, 0.10);
          filter: grayscale(100%) brightness(1.15) contrast(0.78);
          transition: filter 0.4s ease, transform 0.5s ease;
        }
        .headshot-frame:hover {
          filter: grayscale(0%) brightness(1) contrast(1);
          transform: scale(1.05);
        }
        .headshot-frame :global(img) {
          display: block;
        }

        /* Game UI */
        .game-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 16px;
        }
        .game-selector {
          display: flex;
          align-items: center;
          gap: 0;
        }
        .game-selector-text {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.85rem;
          font-weight: 400;
          color: #b0b5bd;
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px 0;
          transition: color 0.2s ease;
        }
        .game-selector-text:hover {
          color: #6b7280;
        }
        .game-selector-text.game-selector-active {
          color: #6b7280;
          font-weight: 500;
        }
        .game-selector-divider {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.85rem;
          color: #d1d5db;
          margin: 0 10px;
          user-select: none;
        }
        .game-play-btn {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          color: #9ca3af;
          background: none;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 4px 12px;
          cursor: pointer;
          transition: color 0.2s ease, border-color 0.2s ease;
        }
        .game-play-btn:hover {
          color: #374151;
          border-color: #9ca3af;
        }
        .game-stats {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.75rem;
          color: #b0b5bd;
          transition: opacity 0.3s ease;
        }
        .game-stats-sep {
          color: #d1d5db;
        }
        .game-controls-inline {
          color: #c9cdd3;
        }

        @media (max-width: 767px) {
          .game-row,
          .game-stats {
            display: none;
          }
        }

        /* Sections */
        .section {
          padding: 64px 24px;
        }
        .section-alt {
          background: #fff;
        }
        .section-inner {
          max-width: 1000px;
          margin: 0 auto;
        }
        .section-heading {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 24px;
        }

        /* About */

        /* Experience */

        /* Expertise Tags */

        /* Education & Certs */

        /* Projects & Beyond */
        .beyond-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        .beyond-grid-three {
          grid-template-columns: repeat(3, 1fr);
        }
        .beyond-grid-narrow {
          margin-top: 0;
        }
        .beyond-subtitle {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.75rem;
          color: #9ca3af;
          margin: 2px 0 10px;
          font-style: italic;
        }

        /* Agent grid */
        .agent-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .agent-card {
          padding: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .agent-img-wrap {
          position: relative;
          width: 100%;
          height: 160px;
          overflow: hidden;
          background: #f3f4f6;
          border-radius: 12px 12px 0 0;
          filter: grayscale(100%) brightness(1.15) contrast(0.78);
          transition: filter 0.4s ease;
        }
        .agent-card:hover .agent-img-wrap {
          filter: grayscale(0%) brightness(1) contrast(1);
        }
        .agent-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          transition: transform 0.5s ease;
        }
        .agent-card:hover .agent-img {
          transform: scale(1.05);
        }
        /* Screenshots fill the band like the mascots and share their hover:
           grayscale at rest, colour and a small zoom on the way in. Plain
           grayscale here, without the brightness lift the photographs get —
           that washes a dark UI out. */
        .agent-img-wrap.is-shot {
          background: #111827;
          filter: grayscale(100%);
        }
        .agent-img-wrap.is-shot .agent-img {
          object-position: center;
        }
        /* A board photo is a product shot on white: contain it rather than
           crop the device out of frame. */
        .agent-img.is-board {
          object-fit: contain;
          background: #f9fafb;
          padding: 12px;
        }
        .beyond-header.is-stacked {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        .agent-img-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.06) 100%);
        }
        .agent-body {
          padding: 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .beyond-card {
          background: #fff;
          border-radius: 16px;
          padding: 28px;
          border: 1px solid #f3f4f6;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .beyond-card-link {
          text-decoration: none;
          cursor: pointer;
        }
        .beyond-card-link:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
        }
        .beyond-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .beyond-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.05rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }
        .beyond-badge {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.7rem;
          font-weight: 500;
          color: #6b7280;
          background: #f3f4f6;
          padding: 3px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }
        .beyond-desc {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.9rem;
          line-height: 1.6;
          color: #6b7280;
          margin: 0;
        }
        /* The row's last column: a screenshot when there is one, then the links. */
        /* A card can point at two places: the repo, and the board it runs on.
           Stacked so the board line reads as a caption under the repo link, and
           pinned to the card's foot so links align across a row of tiles. */
        .card-links {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          flex-shrink: 0;
          margin-top: auto;
          padding-top: 14px;
        }
        .hardware-link {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.78rem;
          font-weight: 500;
          color: #6b7280;
          text-decoration: none;
          line-height: 1.4;
        }
        .hardware-link:hover {
          color: #2563eb;
        }
        /* Vendor product shots, treated like the mascots so a catalog photo
           doesn't sit on the page in full colour next to grayscale cards. */
        .board-img {
          width: 46px;
          height: 46px;
          flex-shrink: 0;
          object-fit: contain;
          border-radius: 6px;
          background: #f9fafb;
          filter: grayscale(100%) brightness(1.08) contrast(0.9);
        }
        .hardware-link:hover .board-img {
          filter: none;
        }
        .beyond-link {
          display: inline-block;
          margin-top: 12px;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          color: #2563eb;
        }
        /* A category inside Work or Personal — quieter than the section heads
           above it, so three of them down the page don't read as three sections. */
        .group-label {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #6b7280;
          margin: 36px 0 16px;
        }
        .group-note {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1rem;
          line-height: 1.65;
          color: #4b5563;
          margin: -6px 0 24px;
        }
        .subsection-heading {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 36px 0 20px;
        }
        .github-activity {
          margin-top: 32px;
          background: #fff;
          border-radius: 16px;
          padding: 28px;
          border: 1px solid #f3f4f6;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .github-activity-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .github-activity-label {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.05rem;
          font-weight: 600;
          color: #1f2937;
        }
        .github-activity-note {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.8rem;
          color: #9ca3af;
          margin-left: auto;
        }
        .github-heatmap {
          width: 100%;
          height: auto;
          border-radius: 8px;
        }

        /* Connect */
        .connect-text {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.1rem;
          line-height: 1.7;
          color: #374151;
          margin: 0 0 20px;
          max-width: 600px;
        }
        .connect-links {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .connect-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          color: #374151;
          background: #f3f4f6;
          transition: background 0.2s ease;
        }
        .connect-btn:hover {
          background: #e5e7eb;
          text-decoration: none;
        }
        .connect-btn-primary {
          background: #0a66c2;
          color: #fff;
        }
        .connect-btn-primary:hover {
          background: #004182;
        }

        /* Footer */
        .footer {
          padding: 32px 24px;
          border-top: 1px solid #e5e7eb;
        }
        .footer-inner {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer-copy {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.85rem;
          color: #9ca3af;
        }
        .footer-links {
          display: flex;
          gap: 16px;
        }
        .footer-links a {
          color: #9ca3af;
          transition: color 0.2s ease;
        }
        .footer-links a:hover {
          color: #1f2937;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero {
            padding: 48px 24px;
          }
          .hero-inner {
            flex-direction: column-reverse;
            text-align: center;
            gap: 32px;
          }
          .hero-name {
            font-size: 2.5rem;
          }
          .hero-then-now {
            font-size: 1rem;
          }
          .hero-then-now p {
            margin-top: 10px;
          }
          /* Centered hero: the label sits above its line instead of beside it,
             so the long company line wraps under itself, not under the label. */
          .hero-then-now .tn-label {
            display: block;
            width: auto;
          }
          .section {
            padding: 40px 24px;
          }
          .beyond-grid {
            grid-template-columns: 1fr;
          }
          .beyond-grid-three {
            grid-template-columns: repeat(2, 1fr);
          }
          .agent-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .agent-img-wrap {
            height: 180px;
          }
        }

        @media (max-width: 480px) {
          .hero {
            padding: 32px 16px;
          }
          .hero-name {
            font-size: 2rem;
          }
          .section {
            padding: 32px 16px;
          }
          .section-heading {
            font-size: 1.5rem;
          }
          .beyond-card {
            padding: 20px;
          }
          .agent-grid {
            grid-template-columns: 1fr;
          }
          /* One column wide: the band can afford the height, and the extra
             shows the screenshot rather than a letterboxed slice of it. */
          .agent-img-wrap {
            height: 230px;
          }
          .footer-inner {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}
