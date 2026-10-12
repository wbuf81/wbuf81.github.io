import { getCompanyNames, getGame, getGames, getPrices, getWeeks } from '@/lib/snes/data';
import { buildIndex, GENRE_FAMILIES, heatmapCounts } from '@/lib/snes/library';
import { formatRelease, gameCount, MONTHS, playersLabel, ratingLabel } from '@/lib/snes/display';
import { panelWeekFor } from '@/lib/snes/weeks';
import { slimWeeks } from '@/lib/snes/onThisDay';
import { consolePrice, gamePrice } from '@/lib/snes/prices';
import { SNES_BASE, TIME_MACHINE, timeMachinePath } from '@/lib/snes/routes';
import { THEME_IDS, titleList } from '@/lib/snes/top8';
import { THEMES } from '../snes/top8/themes';
import SnesNav from '../snes/components/SnesNav';
import { GameTile } from '../snes/components/GameTile';
import { Cover } from '../snes/components/Cover';
import { Top8Star } from '../snes/components/Top8Star';
import { Top8Scope } from '../snes/components/Top8Tray';
import Paper from '../snes/components/Paper';
import BeKindRewind from '../snes/components/BeKindRewind';
import SnesCredit from '../snes/components/SnesCredit';
import type { PopItem } from '@/lib/snes/types';

// The SNES section's own pieces, drawn live with the real components where they can stand alone, and as static markup
// with the real class names where they only make sense inside their page. Everything here is read at build time; the
// only client props are three tiles, one week and the title list the Top 8 tray labels its covers with.

const TILES = ['f-zero', 'super-metroid', 'soccer-kid'];
const HEAT_YEARS = [1991, 1994];

function TmCard({ label, item, sub, poster = false }: { label: string; item: PopItem; sub: string | null; poster?: boolean }) {
  return (
    <div className="s-tm-card">
      <span className={`s-tm-art${poster ? ' is-poster' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {item.art ? <img src={item.art} alt="" width={240} height={poster ? 360 : 240} loading="lazy" decoding="async" /> : <span className="s-tm-noart">{label}</span>}
      </span>
      <span className="s-tm-k">{label}</span>
      <b className="s-tm-t">{item.title}</b>
      {sub ? <span className="s-tm-by">{sub}</span> : null}
    </div>
  );
}

export default function SnesKit() {
  const games = getGames();
  const index = buildIndex(games);
  const names = getCompanyNames();
  const tiles = TILES.map((s) => index.find((g) => g.slug === s)!);
  const metroid = getGame('super-metroid')!;
  const fzero = getGame('f-zero')!;
  const weeks = getWeeks();
  const { index: wi, label } = panelWeekFor(weeks, metroid);
  const week = weeks[wi];
  const gp = gamePrice(getPrices(), metroid.slug);
  const cp = consolePrice(getPrices());
  const price = gp ? { usd: gp.usd, year: Number(gp.date.slice(0, 4)), what: 'game' as const } : { usd: cp.usd, year: Number(cp.date.slice(0, 4)), what: 'console' as const };
  const slim = slimWeeks(weeks, games)[wi];
  const heat = heatmapCounts(index);
  const mario = index.find((g) => g.slug === 'super-mario-world')!;

  return (
    <section className="ch ds-snes" id="ds-snes" aria-labelledby="ds-snes-h">
      <h2 id="ds-snes-h">The SNES kit</h2>
      <p>
        The SNES pages under <code>/videogames</code> add their own pieces on top of the system: a dark screen colour
        for games, a purple for anything SNES, and a few 90s props. They live in <code>app/snes/</code>, styled by{' '}
        <code>app/snes/snes.css</code> (tokens only, every block an <code>s-</code> name under <code>.wb</code>). Below,
        the pieces that move are the real components; the rest are their real classes.
      </p>

      <h3>The SNES menu</h3>
      <p>
        <code>SnesNav</code> is the first thing in <code>&lt;main&gt;</code> on every SNES page, stuck to the top. Pass{' '}
        <code>current</code> (games, time or top8); game and company pages count as games. The n/8 badge on My Top 8
        comes from the saved list, so it appears only in the browser. Anything else that sticks to the top sits below it
        with <code>top: var(--s-nav-h)</code>. Here it doesn&apos;t stick.
      </p>
      <div className="ds-snes-nav">
        <SnesNav current="games" />
      </div>

      <Top8Scope titles={titleList(games)}>
        <h3>Game tiles</h3>
        <p>
          <code>GameTile</code>: a dark card with the box art, title, publisher and genre. Point at one on a computer and
          its 12-second clip plays after a moment, with a purple glow and light scanlines; on a phone the first tap
          plays it and the second opens the game. Chips show the EGM and Nintendo Power scores when there are any, and Day
          One on the launch titles.
        </p>
        <div className="s-row">
          {tiles.map((g) => (
            <GameTile key={g.slug} game={g} publisherName={names[g.publisher] ?? ''} genre={g.genres[0]} />
          ))}
        </div>

        <h3>Covers and the no-art placeholder</h3>
        <p>
          <code>Cover</code> draws a box cover, decorative (its title is said next to it). A game with no art, or a cover
          that fails to load, gets its initials on a grey card the same shape, never a broken image.
        </p>
        <div className="spec-row">
          <div className="ds-cover"><Cover src="/snes/box/super-metroid.jpg" title="Super Metroid" width={300} height={209} /></div>
          <div className="ds-cover"><Cover src="" title="Soccer Kid" width={300} height={209} noArt /></div>
        </div>

        <h3>The ★ Top 8 button</h3>
        <p>
          <code>Top8Star</code> adds a game to the visitor&apos;s Top 8 from anywhere. The tile kind is the 28px star on
          the tiles above, with a 44px area to press: on a computer it shows when you point at or tab to the tile, on a
          touch screen it is always there. It is always a <b>sibling</b> of the tile&apos;s link, never inside the{' '}
          <code>&lt;a&gt;</code>. The page kind is a labelled button, as on a game page:
        </p>
        <div className="spec-row">
          <Top8Star slug="super-metroid" title="Super Metroid" variant="page" />
        </div>
        <p>
          When the list is full it asks &ldquo;Replace which?&rdquo; with the eight covers. The popover takes focus only
          once it&apos;s on screen; browsers refuse focus on a hidden one.
        </p>

        <h3>The toast</h3>
        <p>
          One polite <code>role=&quot;status&quot;</code> region per page, added to <code>&lt;body&gt;</code> once, swaps
          its text for each message and clears it after a couple of seconds. The words are fixed: &ldquo;Added to your Top
          8 · n/8&rdquo;, &ldquo;Removed from your Top 8&rdquo;, &ldquo;Replaced X with Y&rdquo;. Here it is standing
          still:
        </p>
        <div className="ds-toast">
          <div className="wb s-live"><span>Added to your Top 8 · 3/8</span></div>
        </div>

        <h3>The Top 8 tray</h3>
        <p>
          <code>Top8Tray</code> sits at the bottom of the library, game and company pages after the first pick: the eight
          slots, the count and a link to the Top 8. Folding it away is remembered. While it shows, the page&apos;s end
          makes room for it. It is never on the Top 8 or Time Machine pages, which have their own. It shows nothing
          until something is picked: pick a game with any ★ above to see it here.
        </p>
      </Top8Scope>

      <h3>Filter chips and toggles</h3>
      <p>
        The library&apos;s controls are <code>.s-toggle</code>: mono, 32px tall (44px on touch), purple when on. The
        genre key uses the seven <code>--snes-f-*</code> colours, the same as the scatter&apos;s dots.
      </p>
      <div className="ds-still" inert>
        <div className="spec-row">
          <button type="button" className="s-toggle" aria-pressed={false}>Launch day</button>
          <button type="button" className="s-toggle" aria-pressed={true}><span aria-hidden="true">★</span> In my Top 8</button>
        </div>
        <div className="s-key">
          {GENRE_FAMILIES.map((f) => (
            <button key={f.key} type="button" className={`s-key-btn f-${f.key}`} aria-pressed={false}>
              <i aria-hidden="true" />{f.label}
            </button>
          ))}
        </div>
      </div>

      <h3>Heatmap cells</h3>
      <p>
        <code>.s-heat-cell</code> with a level <code>l1</code>–<code>l4</code> from <code>--snes-h1</code> to{' '}
        <code>--snes-h4</code>, darker for busier months; an empty month has no level, and months before the launch are
        dashed (<code>is-pre</code>). Two real years:
      </p>
      <div className="s-heat ds-heat">
        <div className="s-heat-row" aria-hidden="true">
          <span />
          {MONTHS.map((m) => <em key={m}>{m[0]}</em>)}
        </div>
        {HEAT_YEARS.map((year) => (
          <div className="s-heat-row" key={year}>
            <span>{year}</span>
            {heat.filter((c) => c.year === year).map((c) => (
              <span key={c.key} className={`s-heat-cell l${c.level}${c.pre ? ' is-pre' : ''}`} title={`${MONTHS[c.month - 1]} ${c.year}: ${c.pre ? 'before launch' : gameCount(c.count)}`}>
                {c.count || ''}
              </span>
            ))}
          </div>
        ))}
      </div>

      <h3>Instruction booklet bits</h3>
      <p>
        A game page reads like the game&apos;s manual: <code>.s-booklet</code> on the warm <code>--booklet</code> paper with
        a stitched edge, the site&apos;s mono eyebrow, then <code>.s-bchip</code> chips for genre, players, rating and chip.
        Day One is the purple one.
      </p>
      <div className="s-booklet ds-booklet">
        <div className="eyebrow">Instruction booklet · {formatRelease(fzero.releasedUS, fzero.datePrecision)}</div>
        <p className="s-title">{fzero.title}</p>
        <div className="s-bchips">
          {fzero.genres.map((g) => <span key={g} className="s-bchip">{g}</span>)}
          {fzero.players ? <span className="s-bchip">{playersLabel(fzero.players)}</span> : null}
          {fzero.launchTitle ? <span className="s-bchip is-day">Day One</span> : null}
          <span className="s-bchip">{ratingLabel(fzero.esrb, fzero.releasedUS)}</span>
          {fzero.chip ? <span className="s-bchip">{fzero.chip}</span> : null}
        </div>
      </div>

      <h3>The Omaha World-Pixel</h3>
      <p>
        <code>Paper</code> is the week&apos;s news as a newspaper clipping, the lead story as its headline. Its masthead is
        always &ldquo;The Omaha World-Pixel&rdquo;, never the real Omaha paper&apos;s name. The Time Machine shows it full
        size; <code>compact</code> drops the side column. This is the week Super Metroid came out:
      </p>
      <div className="ds-paper">
        <Paper week={week} weekNumber={wi + 1} headline="h4" />
      </div>

      <h3>Be Kind, Rewind</h3>
      <p>
        <code>BeKindRewind</code> closes each game page: the #1 song, album and movie the week it came out, as a cassette,
        a CD and a ticket, beside the compact paper and the price, dated, then in today&apos;s money. A game known only by
        its month shows the month.
      </p>
      <BeKindRewind week={week} weekNumber={wi + 1} label={label} monthName={formatRelease(metroid.releasedUS, 'month')} price={price} paperHeadline="h4" />

      <h3>Time Machine cards</h3>
      <p>
        On the Time Machine&apos;s screen each #1 is an <code>.s-tm-card</code>: square art for songs and albums, a poster
        for the movie, the kind in mono caps, then the title. They link to Wikipedia there; these don&apos;t.
      </p>
      <div className="s-tm-screen ds-tm">
        <div className="s-tm-cards">
          <TmCard label="#1 song" item={week.song} sub={week.song.by} />
          <TmCard label="#1 album" item={week.album} sub={week.album.by} />
          <TmCard label="#1 movie" item={week.film} sub={week.film.gross ? `${week.film.gross} weekend` : null} poster />
        </div>
      </div>

      <h3>MySpace boxes</h3>
      <p>
        The Top 8 builder dresses as an old profile page: <code>.s-t8-box</code> with its blue <code>.s-t8-bh</code> bar,
        theme chips, numbered slots and friend requests to accept or deny. The picture&apos;s wordmark is
        &ldquo;snesspace&rdquo;, never &ldquo;myspace&rdquo;. The six themes are drawn in code, and their names carry no game
        logos or trademarked names. These are still copies; the builder is live on its page.
      </p>
      <div className="s-t8 ds-still" inert>
        <div className="s-t8-col">
          <div className="s-t8-box">
            <div className="s-t8-bh">Edit profile</div>
            <div className="s-t8-bb">
              <div className="s-t8-themes" role="group" aria-label="Theme">
                {THEME_IDS.map((id, i) => (
                  <button key={id} type="button" className="s-t8-chip" aria-pressed={i === 0}>{THEMES[id].displayName}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="s-t8-box">
            <div className="s-t8-bh">You have 1 new friend request!</div>
            <div className="s-t8-bb">
              <ul className="s-t8-reqs">
                <li className="s-t8-req">
                  <Cover src={mario.boxArt ?? ''} title={mario.title} width={72} height={50} noArt={!mario.boxArt} />
                  <div>
                    <b>{mario.title}</b>
                    <span>a classic to start with · 1991</span>
                  </div>
                  <div className="s-t8-act">
                    <button type="button" className="s-t8-acc">Accept</button>
                    <button type="button" className="s-t8-den">Deny</button>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="s-t8-box">
          <div className="s-t8-bh"><span>My Friend Space</span><span>2 of 8</span></div>
          <div className="s-t8-bb">
            <ol className="s-t8-slots">
              {[tiles[0], tiles[1], null, null].map((g, i) => (
                <li key={g?.slug ?? `empty-${i}`} className={`s-t8-slot${g ? ' is-full' : ''}`}>
                  <div className="s-t8-handle">
                    <span className="s-t8-rank" aria-hidden="true">{i + 1}</span>
                    {g ? (
                      <>
                        <Cover src={g.boxArt ?? ''} title={g.title} width={300} height={209} noArt={!g.boxArt} />
                        <span className="s-t8-nm">{g.title}</span>
                      </>
                    ) : <span>Add a friend</span>}
                  </div>
                  {g ? <button type="button" className="s-t8-x" aria-label={`Remove ${g.title}`}><span aria-hidden="true">✕</span></button> : null}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <h3>Hub cards and On this day</h3>
      <p>
        The <code>/videogames</code> hub links each project with an <code>.s-hub-card</code>, the tile&apos;s dark card
        grown up. Above them, &ldquo;On this day&rdquo; picks the visitor&apos;s date in their own browser, so the static
        page holds only a same-height placeholder. This is a still of it.
      </p>
      <div className="ds-still-otd">
        <section className="s-otd" aria-label="On this day in SNES history (example)">
          <div className="s-otd-h">On this day in SNES history</div>
          <div className="s-otd-body">
            <div className="s-otd-year" inert>
              <button type="button" aria-label="Earlier year">◀</button>
              <span className="s-otd-led">This week in {week.start.slice(0, 4)}</span>
              <button type="button" aria-label="Later year">▶</button>
            </div>
            <ul className="s-otd-list">
              <li><b>#1 song</b> {slim[1]}{slim[2] ? ` — ${slim[2]}` : ''}</li>
              <li><b>#1 movie</b> {slim[3]}</li>
              {slim[4] ? <li><b>In the news</b> {slim[4]}</li> : null}
              <li><b>Games</b> {slim[5]} new SNES {slim[5] === 1 ? 'game' : 'games'}</li>
            </ul>
            <a className="s-otd-go" href={timeMachinePath(week.start)}>Open this week in the Time Machine →</a>
          </div>
        </section>
      </div>
      <div className="s-hub">
        <a className="s-hub-card" href={SNES_BASE}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/snes/box/super-mario-world.jpg" alt="" width={300} height={209} loading="lazy" />
          <span className="s-hub-t">Super Nintendo history</span>
          <span className="s-hub-p">{games.length} games, 1991–1998 — timeline, cover wall, shelf and more</span>
        </a>
        <a className="s-hub-card" href={TIME_MACHINE}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/snes/pop/unforgettable-with-love.webp" alt="" width={300} height={209} loading="lazy" />
          <span className="s-hub-t">SNES Time Machine</span>
          <span className="s-hub-p">Every week, 1991–1998: the #1 song, album and movie, the news, and the new games</span>
        </a>
      </div>

      <h3>The credit line</h3>
      <p>
        Every SNES page ends with <code>SnesCredit</code>, once. <code>pop</code> adds the chart and box-office sources
        where Time Machine data shows; <code>cpi</code> adds the note where a price is in today&apos;s money.
      </p>
      <SnesCredit pop cpi />
    </section>
  );
}
