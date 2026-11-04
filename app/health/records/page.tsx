import HealthPage from '../HealthPage';
import { healthMetadata } from '../view';

export const metadata = healthMetadata('records');

export default function Page() {
  return <HealthPage section="records" />;
}
