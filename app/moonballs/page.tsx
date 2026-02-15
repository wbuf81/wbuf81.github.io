import { Metadata } from 'next';
import GolfBallWrapper from './GolfBallWrapper';

export const metadata: Metadata = {
  title: 'Moon Balls - Custom Golf Ball Designer',
  description: 'Design your own custom Moon Ball with logos, text, and colors in 3D.',
  openGraph: {
    title: 'Moon Balls - Custom Golf Ball Designer',
    description: 'Design your own custom Moon Ball with logos, text, and colors in 3D.',
    type: 'website',
  },
};

export default function GolfBallPage() {
  return <GolfBallWrapper />;
}
