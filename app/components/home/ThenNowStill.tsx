import { spelled } from '@/lib/projects';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// The stat strip under the name. The counts come from the project lists, so they can't go stale.
export default function ThenNowStill({ counts }: { counts: { work: number; home: number } }) {
  return (
    <div className="stats">
      <div>
        <div className="k">Then</div>
        <div className="n">Lockheed Martin</div>
        <div className="l">Engineer</div>
      </div>
      <div>
        <div className="k">Now</div>
        <div className="n">Newfold Digital</div>
        <div className="l">Governance, Risk &amp; Compliance</div>
      </div>
      <div>
        <div className="k">Still</div>
        <div className="n">Building stuff</div>
        <div className="l">{`${cap(spelled(counts.work))} builds at work, ${spelled(counts.home)} at home`}</div>
      </div>
    </div>
  );
}
