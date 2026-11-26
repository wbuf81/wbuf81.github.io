import HealthPage from '../HealthPage';
import { healthMetadata } from '../view';

export const metadata = healthMetadata('patterns');

export default function Page() {
  return <HealthPage section="patterns" />;
}
