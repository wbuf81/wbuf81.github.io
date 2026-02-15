'use client';

export default function MoonBallsBranding() {
  return (
    <>
      <div className="branding-top">
        <span className="branding-full">MOON BALLS DESIGN STUDIO</span>
        <span className="branding-short">MOON BALLS</span>
      </div>

      <style jsx>{`
        .branding-top {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          pointer-events: none;
          font-family: var(--font-outfit), sans-serif;
          font-weight: 900;
          font-size: 1.4rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #ffffff;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
          white-space: nowrap;
        }
        .branding-short {
          display: none;
        }
        @media (max-width: 768px) {
          .branding-top {
            font-size: 0.75rem;
            top: max(12px, env(safe-area-inset-top));
          }
          .branding-full {
            display: none;
          }
          .branding-short {
            display: inline;
          }
        }
      `}</style>
    </>
  );
}
