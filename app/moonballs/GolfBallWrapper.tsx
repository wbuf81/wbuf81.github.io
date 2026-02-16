'use client';

import dynamic from 'next/dynamic';

const GolfBallClient = dynamic(() => import('./GolfBallClient'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        width: '100vw',
        background: '#2a4a25',
        fontFamily: 'var(--font-outfit), sans-serif',
      }}
    >
      <div
        style={{
          fontSize: '1.6rem',
          fontWeight: 800,
          letterSpacing: '0.12em',
          color: 'rgba(255, 255, 255, 0.9)',
          textTransform: 'uppercase',
          marginBottom: '24px',
        }}
      >
        Moon Balls
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.7)',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  ),
});

export default function GolfBallWrapper() {
  return <GolfBallClient />;
}
