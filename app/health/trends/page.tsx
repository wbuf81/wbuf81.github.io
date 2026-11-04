import HealthPage from '../HealthPage';
import { healthMetadata } from '../view';

export const metadata = healthMetadata('trends');

export default function Page() {
  return <HealthPage section="trends" />;
}
