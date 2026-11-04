import HealthPage from './HealthPage';
import { healthMetadata } from './view';

// /health opens on This week; the other sections are their own pages under the HealthNav menu.
export const metadata = healthMetadata('week');

export default function Page() {
  return <HealthPage section="week" />;
}
