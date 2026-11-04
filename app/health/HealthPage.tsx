import { Nav } from '../components/Nav';
import Footer from '../components/Footer';
import HealthDashboard from './components/HealthDashboard';
import HealthNav from './components/HealthNav';
import type { HealthSection } from './sections';
import { getHealthView } from './view';
import './health.css';

/** The shell every /health page shares: the site header, the health menu, the title, then one section. */
export default function HealthPage({ section }: { section: HealthSection }) {
  const view = getHealthView();
  return (
    <>
      <Nav theme />
      <main className="wb wb-page">
        <HealthNav current={section} />
        <div className="h-wrap">
          <header className="h-top">
            <div className="eyebrow">Health · updated weekly</div>
            <h1 className="h-title">Health</h1>
            <p className="lede">Daily tracker — weight, intake, steps and training. Updated weekly.</p>
          </header>
          {view.days.length === 0 ? (
            <p className="h-note">No data recorded yet.</p>
          ) : (
            <HealthDashboard section={section} {...view} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
