import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Game } from '@/lib/snes/types';
import { companyPath } from '@/lib/snes/routes';
import { displayedMagazines, formatRelease, npLabel, playersLabel, ratingLabel, reviewerScores } from '@/lib/snes/display';

const COUNT_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const reviewers = (n: number) => `${COUNT_WORDS[n] ?? n} reviewer${n === 1 ? '' : 's'}`;

function Bars({ scores, label }: { scores: number[]; label: string }) {
  return (
    <div className="s-bars">
      {scores.map((s, i) => (
        <div key={i} className="s-bar4" style={{ height: `${s * 8}px` }}><i>{s}</i></div>
      ))}
      <span className="s-bars-label">{label}</span>
    </div>
  );
}

// The right-hand column of a game page, laid out like the game's instruction booklet.
export default function Booklet({ game, names, logoSize, star }: {
  game: Game; names: Record<string, string>; logoSize?: [number, number];
  /** The Top 8 button, shown right after the title. */
  star?: ReactNode;
}) {
  const when = formatRelease(game.releasedUS, game.datePrecision);
  const { egm, nintendoPower, other } = game.scores;
  const fam = reviewerScores(other.Fam);
  const rest = displayedMagazines(other, fam ? ['Fam'] : []);
  const { critic, criticCount, users, usersCount } = game.scores;
  const anyScore = Boolean(egm || nintendoPower || fam || rest.length || critic !== null || users !== null);
  const { coop, versus } = game.multiplayer;
  const multiplayer = [coop ? 'Co-op' : '', versus ? '2+ players' : ''].filter(Boolean).join(' · ');
  const company = (slug: string) => <Link href={companyPath(slug)}>{names[slug] ?? slug}</Link>;

  return (
    <article className="s-booklet">
      <div className="eyebrow">Instruction booklet · {when}</div>
      {game.media.logo ? (
        <>
          <h1 className="vh">{game.title}</h1>
          <img className="s-logo" src={`/snes/logo/${game.slug}.webp`} alt={game.title} width={logoSize?.[0]} height={logoSize?.[1]} decoding="async" />
        </>
      ) : (
        <h1 className="s-title">{game.title}</h1>
      )}
      {star ? <div className="s-btitle-star">{star}</div> : null}
      <div className="s-bchips">
        {game.genres.map((g) => <span key={g} className="s-bchip">{g}</span>)}
        {game.players ? <span className="s-bchip">{playersLabel(game.players)}</span> : null}
        {game.launchTitle ? <span className="s-bchip is-day">Day One</span> : null}
        <span className="s-bchip">{ratingLabel(game.esrb, game.releasedUS)}</span>
        {game.chip ? <span className="s-bchip">{game.chip}</span> : null}
      </div>

      <section className="s-sect" aria-labelledby="sect-story">
        <h2 id="sect-story">The story</h2>
        <p>{game.summary ?? 'No summary yet.'}</p>
      </section>

      <section className="s-sect" aria-labelledby="sect-spec">
        <h2 id="sect-spec">Specifications</h2>
        <dl className="s-spec">
          <dt>Released</dt>
          <dd>{when}{game.launchTitle ? ' — launch day' : ''}</dd>
          <dt>{game.developers.length > 1 ? 'Developers' : 'Developer'}</dt>
          <dd>{game.developers.map((d, i) => <span key={d}>{i ? ', ' : ''}{company(d)}</span>)}</dd>
          <dt>Publisher</dt>
          <dd>{company(game.publisher)}</dd>
          {game.players ? <><dt>Players</dt><dd>{game.players}</dd></> : null}
          {game.genres.length ? <><dt>Genre</dt><dd>{game.genres.join(' · ')}</dd></> : null}
          <dt>Rating</dt>
          <dd>{ratingLabel(game.esrb, game.releasedUS)}</dd>
          {game.chip ? <><dt>Chip</dt><dd>{game.chip}</dd></> : null}
          {game.series ? <><dt>Series</dt><dd>{game.series}</dd></> : null}
          {game.themes.length ? <><dt>Themes</dt><dd>{game.themes.join(' · ')}</dd></> : null}
          {game.perspectives.length ? <><dt>View</dt><dd>{game.perspectives.join(' · ')}</dd></> : null}
          {multiplayer ? <><dt>Multiplayer</dt><dd>{multiplayer}</dd></> : null}
        </dl>
      </section>

      <section className="s-sect" aria-labelledby="sect-mags">
        <h2 id="sect-mags">What the magazines said</h2>
        {!anyScore ? <p className="s-none">No magazine scores on record yet.</p> : (
          <>
            {egm ? <Bars scores={egm} label={`EGM · ${reviewers(egm.length)}`} /> : <p className="s-none">EGM · not on record yet</p>}
            {fam ? <Bars scores={fam} label={`Famitsu · ${reviewers(fam.length)}`} /> : null}
            <dl className="s-crs">
              {critic !== null ? <div className="s-cr"><dt>Critics</dt><dd>{critic}/100 ({criticCount} {criticCount === 1 ? 'review' : 'reviews'})</dd></div> : null}
              {users !== null ? <div className="s-cr"><dt>Players</dt><dd>{users}/100 ({usersCount} {usersCount === 1 ? 'rating' : 'ratings'})</dd></div> : null}
              {nintendoPower ? <div className="s-cr"><dt>Nintendo Power</dt><dd>{npLabel(nintendoPower)}</dd></div> : null}
              {rest.map((m) => <div key={m.name} className="s-cr"><dt>{m.name}</dt><dd>{m.score}</dd></div>)}
            </dl>
          </>
        )}
      </section>
    </article>
  );
}
