'use client';

import { useEffect, useRef, useCallback } from 'react';

interface BlobPoint {
  x: number;
  y: number;
  scale: number;
}


export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const revealCanvasRef = useRef<HTMLCanvasElement>(null);
  const targetPosRef = useRef({ x: 0, y: 0 });
  const blobPointsRef = useRef<BlobPoint[]>([
    { x: 0, y: 0, scale: 1 },
    { x: 0, y: 0, scale: 0.85 },
    { x: 0, y: 0, scale: 0.7 },
    { x: 0, y: 0, scale: 0.55 },
    { x: 0, y: 0, scale: 0.4 },
    { x: 0, y: 0, scale: 0.3 },
  ]);
  const animationRef = useRef<number>(0);
  const parallaxRef = useRef({ x: 0, y: 0 });
  const revealImgRef = useRef<HTMLImageElement | null>(null);
  const revealImgLoadedRef = useRef(false);
  const timeRef = useRef(0);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const lastMouseMoveRef = useRef(0);
  const isMouseActiveRef = useRef(false);
  const blendStartTimeRef = useRef(0);
  const blendStartPosRef = useRef({ x: 0, y: 0 });
  const wasMouseActiveRef = useRef(false);

  // Refs for DOM elements
  const bgImageRef = useRef<HTMLDivElement>(null);
  const nameContainerRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    // Preload reveal image
    const img = new Image();
    img.onload = () => {
      revealImgLoadedRef.current = true;
    };
    img.src = '/aligned_space_transparent.png';
    revealImgRef.current = img;

    // Initialize blob positions to center of screen
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    blobPointsRef.current.forEach((point) => {
      point.x = centerX;
      point.y = centerY;
    });
  }, []);

  // Generate wandering position using multiple sine waves for organic movement
  const getWanderingPosition = useCallback((time: number) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const radiusX = window.innerWidth * 0.3;
    const radiusY = window.innerHeight * 0.3;

    // Combine multiple frequencies for organic, non-repetitive movement (2x speed)
    const speed = 2;
    const x = centerX +
      Math.sin(time * 0.0003 * speed) * radiusX * 0.6 +
      Math.sin(time * 0.0007 * speed) * radiusX * 0.3 +
      Math.sin(time * 0.0011 * speed) * radiusX * 0.1;

    const y = centerY +
      Math.cos(time * 0.0004 * speed) * radiusY * 0.6 +
      Math.cos(time * 0.0006 * speed) * radiusY * 0.3 +
      Math.sin(time * 0.0009 * speed) * radiusY * 0.1;

    return { x, y };
  }, []);

  // Blob reveal animation using canvas
  useEffect(() => {
    const canvas = revealCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      // Update time for wandering animation
      timeRef.current += 16; // Approximate 60fps timing

      // Check if mouse has been inactive for 1 second
      const now = Date.now();
      const mouseIdleTime = now - lastMouseMoveRef.current;
      isMouseActiveRef.current = mouseIdleTime < 1000;

      // Detect transition from mouse active to inactive
      if (wasMouseActiveRef.current && !isMouseActiveRef.current) {
        // Mouse just became inactive, start blend transition
        blendStartTimeRef.current = now;
        blendStartPosRef.current = { ...mousePosRef.current };
      }
      wasMouseActiveRef.current = isMouseActiveRef.current;

      // Use mouse position if active, otherwise blend to wandering position
      let targetPos;
      if (isMouseActiveRef.current && lastMouseMoveRef.current > 0) {
        targetPos = mousePosRef.current;
      } else {
        const wanderPos = getWanderingPosition(timeRef.current);

        // Blend from last cursor position to wander position over 2 seconds
        const blendDuration = 2000;
        const blendElapsed = now - blendStartTimeRef.current;
        const blendProgress = Math.min(blendElapsed / blendDuration, 1);

        // Use easeInOut for smooth transition
        const eased = blendProgress < 0.5
          ? 2 * blendProgress * blendProgress
          : 1 - Math.pow(-2 * blendProgress + 2, 2) / 2;

        targetPos = {
          x: blendStartPosRef.current.x + (wanderPos.x - blendStartPosRef.current.x) * eased,
          y: blendStartPosRef.current.y + (wanderPos.y - blendStartPosRef.current.y) * eased,
        };
      }
      targetPosRef.current = targetPos;

      // Smooth parallax based on target position
      const targetParallaxX = (targetPos.x - window.innerWidth / 2) * -0.02;
      const targetParallaxY = (targetPos.y - window.innerHeight / 2) * -0.02;
      parallaxRef.current.x += (targetParallaxX - parallaxRef.current.x) * 0.1;
      parallaxRef.current.y += (targetParallaxY - parallaxRef.current.y) * 0.1;

      // Update DOM elements with parallax
      if (bgImageRef.current) {
        bgImageRef.current.style.transform = `translate(${parallaxRef.current.x}px, ${parallaxRef.current.y}px)`;
      }
      if (nameContainerRef.current) {
        nameContainerRef.current.style.transform = `translate(${parallaxRef.current.x * 1.5}px, ${parallaxRef.current.y * 1.5}px)`;
      }

      // Animate blob points with different easing for trailing effect
      // Faster easing when mouse is active for more responsive feel
      const baseEase = isMouseActiveRef.current ? 0.15 : 0.08;
      const easeStep = isMouseActiveRef.current ? 0.02 : 0.01;
      blobPointsRef.current.forEach((point, index) => {
        const ease = baseEase - index * easeStep;
        point.x += (targetPos.x - point.x) * ease;
        point.y += (targetPos.y - point.y) * ease;
      });

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Only draw if image is loaded
      if (!revealImgLoadedRef.current || !revealImgRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const revealImg = revealImgRef.current;

      // Create offscreen canvas for gooey effect
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Draw blob circles on offscreen canvas
      // Smaller blob on mobile for better fit
      const isMobile = window.innerWidth < 768;
      const baseSize = isMobile ? 60 : 90;
      offCtx.fillStyle = 'white';
      blobPointsRef.current.forEach((point) => {
        const size = baseSize * point.scale;
        offCtx.beginPath();
        offCtx.arc(point.x, point.y, size, 0, Math.PI * 2);
        offCtx.fill();
      });

      // Apply blur for gooey effect
      ctx.filter = 'blur(30px)';
      ctx.drawImage(offscreen, 0, 0);
      ctx.filter = 'none';

      // Use contrast to sharpen the blob edges (gooey effect)
      ctx.globalCompositeOperation = 'source-in';

      // Draw reveal image - sized to match viewport height, centered horizontally
      const imgRatio = revealImg.width / revealImg.height;
      const drawHeight = canvas.height;
      const drawWidth = drawHeight * imgRatio;
      const drawX = (canvas.width - drawWidth) / 2;
      const drawY = 0;

      ctx.drawImage(revealImg, drawX, drawY, drawWidth, drawHeight);
      ctx.globalCompositeOperation = 'source-over';

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [getWanderingPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    lastMouseMoveRef.current = Date.now();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      mousePosRef.current = { x: touch.clientX, y: touch.clientY };
      lastMouseMoveRef.current = Date.now();
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      mousePosRef.current = { x: touch.clientX, y: touch.clientY };
      lastMouseMoveRef.current = Date.now();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="hero-container"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
    >
      {/* Background Image (main.jpg) */}
      <div ref={bgImageRef} className="background-image" />

      {/* Grain texture overlay */}
      <div className="grain-overlay" />

      {/* Reveal canvas (space.jpg revealed by blob) */}
      <canvas ref={revealCanvasRef} className="reveal-canvas" />

      {/* Name - Top Left */}
      <div ref={nameContainerRef} className="name-container">
        <h1 className="name">
          <span className="first-name">Wesley</span>
          <span className="last-name">Bard</span>
        </h1>
        <p className="tagline">🔒 Risk and Compliance executive by trade.</p>
        <p className="tagline">⚙️ Engineer at heart.</p>
        <p className="tagline">🤖 AI builder.</p>
        <p className="tagline">🐾 Proud husband, boy and bernese dad.</p>
        <p className="tagline">🚀 Space enthusiast.</p>
        <p className="tagline">🕹️ Video gamer.</p>
        <p className="tagline">🏈 Florida Gators, Jacksonville Jaguars.</p>
        <p className="tagline"><svg className="tagline-icon" viewBox="0 0 24 24" fill="#1e88e5"><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/></svg> Autism & inclusivity advocate.</p>
      </div>

      
      {/* Socials Widget - Bottom Left */}
      <div className="widget widget-bottom-left">
        <div className="widget-top">
          <div className="widget-label">SOCIALS</div>
          <a href="https://www.linkedin.com/in/wesleybard/" target="_blank" rel="noopener noreferrer" className="widget-top-link">
            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            <span className="widget-top-link-text">LINKED IN</span>
          </a>
          <div className="widget-divider"></div>
        </div>
        <a href="https://www.instagram.com/wb81" target="_blank" rel="noopener noreferrer" className="widget-bottom widget-bottom-mid">
          <svg className="widget-bottom-icon" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          <div className="widget-bottom-text">
            <div className="widget-bottom-title">INSTAGRAM</div>
            <div className="widget-bottom-subtitle">@wb81</div>
          </div>
        </a>
        <a href="https://github.com/wbuf81" target="_blank" rel="noopener noreferrer" className="widget-bottom">
          <svg className="widget-bottom-icon" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <div className="widget-bottom-text">
            <div className="widget-bottom-title">GITHUB</div>
            <div className="widget-bottom-subtitle">@wbuf81</div>
          </div>
        </a>
      </div>

      {/* Portfolio Widget - Top Right */}
      <div className="widget widget-top-right">
        <div className="widget-top">
          <div className="widget-label">PORTFOLIO</div>
          <a href="/resume.pdf" className="widget-top-link">
            {/* Document/Resume Icon */}
            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
              <path d="M8 12h8v2H8zM8 16h8v2H8zM8 8h5v2H8z"/>
            </svg>
            <span className="widget-top-link-text">RESUME</span>
          </a>
          <div className="widget-divider"></div>
        </div>
        <a href="/articles" className="widget-bottom">
          {/* Articles/Pen Icon */}
          <svg className="widget-bottom-icon" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
          <div className="widget-bottom-text">
            <div className="widget-bottom-title">ARTICLES</div>
            <div className="widget-bottom-subtitle">Read my writing</div>
          </div>
        </a>
      </div>

      <style jsx>{`
        .hero-container {
          position: relative;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          background: #ffffff;
          touch-action: none;
          -webkit-overflow-scrolling: touch;
        }

        .background-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url('/aligned_headshot_transparent.png');
          background-size: auto 100%;
          background-position: center;
          background-repeat: no-repeat;
          will-change: transform;
        }

        .grain-overlay {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          pointer-events: none;
          z-index: 1;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          opacity: 0.18;
          animation: grain 3s steps(1) infinite;
        }

        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-2%, -2%); }
          20% { transform: translate(2%, 2%); }
          30% { transform: translate(-1%, 1%); }
          40% { transform: translate(1%, -1%); }
          50% { transform: translate(-2%, 2%); }
          60% { transform: translate(2%, -2%); }
          70% { transform: translate(-1%, -1%); }
          80% { transform: translate(1%, 1%); }
          90% { transform: translate(-2%, -1%); }
        }

        .reveal-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2;
        }

        
        .name-container {
          position: absolute;
          top: 40px;
          left: 40px;
          z-index: 10;
          will-change: transform;
        }

        .name {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 4rem;
          font-weight: 700;
          line-height: 1;
          color: #1f2937;
          margin: 0;
          display: flex;
          flex-direction: column;
        }

        .first-name,
        .last-name {
          display: block;
        }

        .last-name {
          margin-top: 0.1em;
        }

        .tagline {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.9rem;
          font-weight: 400;
          color: #555;
          margin: 0;
          margin-top: 0.4em;
          letter-spacing: 0.02em;
        }

        .tagline:first-of-type {
          margin-top: 1em;
        }

        .tagline-icon {
          width: 1em;
          height: 1em;
          vertical-align: -0.1em;
          margin-right: 0.2em;
          display: inline-block;
        }

        .widget {
          position: absolute;
          z-index: 10;
          border-radius: 24px;
          overflow: hidden;
          width: 180px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
        }

        .widget-bottom-left {
          bottom: 40px;
          left: 40px;
        }

        .widget-top-right {
          top: 40px;
          right: 40px;
        }

        .widget-top {
          background: #f5f5f5;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .widget-label {
          align-self: flex-start;
          color: #666;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          margin-bottom: 24px;
          text-transform: uppercase;
        }

        .widget-top-link {
          color: #888;
          transition: color 0.3s ease, transform 0.3s ease;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
        }

        .widget-top-link:hover {
          color: #1a1a1a;
          transform: scale(1.05);
        }

        .widget-bottom-left .widget-top-link:hover {
          color: #0077b5;
        }

        .widget-top-link-text {
          margin-top: 12px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .widget-divider {
          width: 100%;
          height: 1px;
          background: #ddd;
        }

        .widget-bottom {
          background: #1a1a1a;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          transition: background 0.3s ease;
        }

        .widget-bottom:hover {
          background: #2a2a2a;
        }

        .widget-bottom-mid {
          background: #374151;
          border-bottom: 1px solid #4b5563;
        }

        .widget-bottom-mid:hover {
          background: #4b5563;
        }

        .widget-bottom-icon {
          color: #fff;
          margin-bottom: 12px;
          transition: transform 0.3s ease;
        }

        .widget-bottom:hover .widget-bottom-icon {
          transform: scale(1.05);
        }

        .widget-bottom-text {
          text-align: center;
        }

        .widget-bottom-title {
          color: #fff;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .widget-bottom-subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
        }

        @media (max-width: 768px) {
          .background-image {
            background-size: cover;
          }

          .name {
            font-size: 2.5rem;
          }

          .name-container {
            top: 24px;
            left: 24px;
            right: 24px;
            max-width: calc(100% - 48px);
          }

          .tagline {
            font-size: 0.7rem;
            margin-top: 0.35em;
          }

          .tagline:first-of-type {
            margin-top: 0.75em;
          }

          .widget {
            width: 130px;
            border-radius: 16px;
          }

          .widget-bottom-left {
            bottom: 20px;
            left: 16px;
          }

          .widget-top-right {
            top: auto;
            bottom: 20px;
            right: 16px;
          }

          .widget-top {
            padding: 12px;
          }

          .widget-label {
            font-size: 0.5rem;
            margin-bottom: 10px;
          }

          .widget-top-link svg {
            width: 28px;
            height: 28px;
          }

          .widget-top-link {
            margin-bottom: 10px;
          }

          .widget-top-link-text {
            font-size: 0.55rem;
            margin-top: 6px;
          }

          .widget-bottom {
            padding: 10px;
          }

          .widget-bottom-icon {
            width: 18px;
            height: 18px;
            margin-bottom: 6px;
          }

          .widget-bottom-title {
            font-size: 0.55rem;
          }

          .widget-bottom-subtitle {
            font-size: 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .name {
            font-size: 1.85rem;
          }

          .name-container {
            top: 16px;
            left: 16px;
            right: 16px;
            max-width: calc(100% - 32px);
          }

          .tagline {
            font-size: 0.6rem;
            margin-top: 0.3em;
          }

          .tagline:first-of-type {
            margin-top: 0.6em;
          }

          .widget {
            width: 110px;
            border-radius: 12px;
          }

          .widget-bottom-left {
            bottom: 16px;
            left: 10px;
          }

          .widget-top-right {
            bottom: 16px;
            right: 10px;
          }

          .widget-top {
            padding: 10px;
          }

          .widget-label {
            font-size: 0.45rem;
            margin-bottom: 8px;
          }

          .widget-top-link svg {
            width: 24px;
            height: 24px;
          }

          .widget-top-link {
            margin-bottom: 8px;
          }

          .widget-top-link-text {
            font-size: 0.55rem;
            margin-top: 6px;
          }

          .widget-bottom {
            padding: 12px;
          }

          .widget-bottom-icon {
            width: 18px;
            height: 18px;
            margin-bottom: 6px;
          }

          .widget-bottom-title {
            font-size: 0.55rem;
          }

          .widget-bottom-subtitle {
            font-size: 0.5rem;
          }
        }

        @media (max-width: 380px) {
          .name {
            font-size: 1.6rem;
          }

          .name-container {
            top: 12px;
            left: 12px;
            right: 12px;
          }

          .tagline {
            font-size: 0.5rem;
            margin-top: 0.25em;
          }

          .tagline:first-of-type {
            margin-top: 0.5em;
          }

          .widget {
            width: 95px;
            border-radius: 10px;
          }

          .widget-bottom-left {
            bottom: 10px;
            left: 6px;
          }

          .widget-top-right {
            bottom: 10px;
            right: 6px;
          }

          .widget-top {
            padding: 8px;
          }

          .widget-label {
            font-size: 0.4rem;
            margin-bottom: 6px;
          }

          .widget-top-link svg {
            width: 20px;
            height: 20px;
          }

          .widget-top-link {
            margin-bottom: 6px;
          }

          .widget-top-link-text {
            font-size: 0.45rem;
            margin-top: 4px;
          }

          .widget-bottom {
            padding: 8px;
          }

          .widget-bottom-icon {
            width: 14px;
            height: 14px;
            margin-bottom: 3px;
          }

          .widget-bottom-title {
            font-size: 0.45rem;
          }

          .widget-bottom-subtitle {
            font-size: 0.4rem;
          }
        }
      `}</style>
    </div>
  );
}
