import HealthPage from '../HealthPage';
import { healthMetadata } from '../view';

export const metadata = healthMetadata('calendar');

export default function Page() {
  return <HealthPage section="calendar" />;
}
