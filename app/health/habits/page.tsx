import HealthPage from '../HealthPage';
import { healthMetadata } from '../view';

export const metadata = healthMetadata('habits');

export default function Page() {
  return <HealthPage section="habits" />;
}
