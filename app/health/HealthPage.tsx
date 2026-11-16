import { Nav } from '../components/Nav';
import Footer from '../components/Footer';
import HealthDashboard from './components/HealthDashboard';
import HealthNav from './components/HealthNav';
import type { HealthSection } from './sections';
import { getHealthView } from './view';
import './health.css';

/** The shell every /health page shares: the site header, the health menu, then one section, which titles itself. */
export default function HealthPage({ section }: { section: HealthSection }) {
  const view = getHealthView();
  return (
    <>
      <Nav theme />
      <main className="wb wb-page">
        <HealthNav current={section} />
        <div className="h-wrap">
          {/* HealthDashboard draws the section's own header (SectionHeader) first, the empty page included. */}
          <HealthDashboard section={section} {...view} />
        </div>
      </main>
      <Footer />
    </>
  );
}
