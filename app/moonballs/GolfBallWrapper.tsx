'use client';

import dynamic from 'next/dynamic';

const GolfBallClient = dynamic(() => import('./GolfBallClient'), { ssr: false });

export default function GolfBallWrapper() {
  return <GolfBallClient />;
}
