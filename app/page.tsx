'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface BlobPoint {
  x: number;
  y: number;
  scale: number;
}

interface Channel {
  id: string;
  name: string;
  icon: string;
  revealImage: string;
  grainStyle: 'film' | 'sports' | 'crt';
}

const CHANNELS: Channel[] = [
  {
    id: 'space',
    name: 'Space',
    icon: '🚀',
    revealImage: '/aligned_space_transparent.png',
    grainStyle: 'film',
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: '🎮',
    revealImage: '/aligned_videogame_transparent.png',
    grainStyle: 'crt',
  },
  {
    id: 'sports',
    name: 'Sports',
    icon: '🏈',
    revealImage: '/aligned_football_transparent.png',
    grainStyle: 'sports',
  },
];

export default function Home() {
  const [currentChannelIndex, setCurrentChannelIndex] = useState(0);
  const [isChangingChannel, setIsChangingChannel] = useState(false);
  const [dialRotation, setDialRotation] = useState(0);
  const currentChannel = CHANNELS[currentChannelIndex];
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

  // Load reveal image when channel changes
  useEffect(() => {
    // Preload reveal image for current channel
    revealImgLoadedRef.current = false;
    const img = new Image();
    img.onload = () => {
      revealImgLoadedRef.current = true;
    };
    img.src = currentChannel.revealImage;
    revealImgRef.current = img;
  }, [currentChannel.revealImage]);

  // Initialize blob positions
  useEffect(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    blobPointsRef.current.forEach((point) => {
      point.x = centerX;
      point.y = centerY;
    });
  }, []);

  // Generate wandering position using multiple sine waves for organic movement
  const getWanderingPosition = useCallback((time: number) => {
    const isMobile = window.innerWidth < 768;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    // Smaller wandering radius on mobile to keep blob more centered
    const radiusX = window.innerWidth * (isMobile ? 0.2 : 0.3);
    const radiusY = window.innerHeight * (isMobile ? 0.2 : 0.3);

    // Combine multiple frequencies for organic, non-repetitive movement
    // Slower speed on mobile for less frantic movement
    const speed = isMobile ? 1.2 : 2;
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

      // Animate blob points with different easing for trailing effect
      // Faster easing when touch/mouse is active for more responsive feel
      // Even faster on mobile for snappier touch response
      const isMobileDevice = window.innerWidth < 768;
      const baseEase = isMouseActiveRef.current
        ? (isMobileDevice ? 0.2 : 0.15)  // Faster touch response on mobile
        : 0.08;
      const easeStep = isMouseActiveRef.current
        ? (isMobileDevice ? 0.025 : 0.02)
        : 0.01;
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
      const isMobile = window.innerWidth < 768;
      // Larger blob on mobile for better coverage
      const baseSize = isMobile ? 105 : 120;
      offCtx.fillStyle = 'white';
      blobPointsRef.current.forEach((point) => {
        const size = baseSize * point.scale;
        offCtx.beginPath();
        offCtx.arc(point.x, point.y, size, 0, Math.PI * 2);
        offCtx.fill();
      });

      // Apply blur for gooey effect - less blur on mobile for sharper edges
      ctx.filter = isMobile ? 'blur(20px)' : 'blur(30px)';
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

  const handleChannelChange = useCallback(() => {
    if (isChangingChannel) return;

    setIsChangingChannel(true);
    setDialRotation(prev => prev + 120); // Rotate dial 120 degrees

    // Show static for 300ms, then change channel
    setTimeout(() => {
      setCurrentChannelIndex((prev) => (prev + 1) % CHANNELS.length);
      setTimeout(() => {
        setIsChangingChannel(false);
      }, 150);
    }, 300);
  }, [isChangingChannel]);

  return (
    <div
      ref={containerRef}
      className="hero-container"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
    >
      {/* Space background elements - renders behind everything */}
      {currentChannel.grainStyle === 'film' && (
        <div className="space-bg">
          {/* Planets */}
          <div className="planet planet-1" />
          <div className="planet planet-2" />
          <div className="planet planet-3" />
          <div className="planet planet-4" />

          {/* Background stars */}
          <div className="bg-star" style={{ left: '8%', top: '12%' }} />
          <div className="bg-star" style={{ left: '22%', top: '78%' }} />
          <div className="bg-star" style={{ left: '35%', top: '25%' }} />
          <div className="bg-star" style={{ left: '52%', top: '88%' }} />
          <div className="bg-star" style={{ left: '68%', top: '15%' }} />
          <div className="bg-star" style={{ left: '85%', top: '65%' }} />
          <div className="bg-star" style={{ left: '15%', top: '45%' }} />
          <div className="bg-star" style={{ left: '78%', top: '35%' }} />
          <div className="bg-star" style={{ left: '42%', top: '58%' }} />
          <div className="bg-star" style={{ left: '92%', top: '82%' }} />
          <div className="bg-star bg-star-large" style={{ left: '28%', top: '8%' }} />
          <div className="bg-star bg-star-large" style={{ left: '65%', top: '72%' }} />
          <div className="bg-star bg-star-large" style={{ left: '88%', top: '22%' }} />
        </div>
      )}

      {/* Background Image (main.jpg) */}
      <div ref={bgImageRef} className="background-image" />

      {/* Grain texture overlay */}
      <div className={`grain-overlay grain-${currentChannel.grainStyle}`} />


      {/* Sports emojis for sports channel */}
      {currentChannel.grainStyle === 'sports' && (
        <div className="sports-container">
          {/* Hash marks overlay */}
          <div className="hash-marks" />
          {/* Yard numbers */}
          <div className="yard-numbers">
            <span className="yard-number">10</span>
            <span className="yard-number">20</span>
            <span className="yard-number">30</span>
            <span className="yard-number">40</span>
            <span className="yard-number">50</span>
            <span className="yard-number">40</span>
            <span className="yard-number">30</span>
            <span className="yard-number">20</span>
            <span className="yard-number">10</span>
            {/* Duplicate for seamless loop */}
            <span className="yard-number">20</span>
            <span className="yard-number">30</span>
            <span className="yard-number">40</span>
            <span className="yard-number">50</span>
            <span className="yard-number">40</span>
            <span className="yard-number">30</span>
            <span className="yard-number">20</span>
            <span className="yard-number">10</span>
          </div>
          {/* Footballs thrown left to right */}
          <div className="sports-emoji football-ltr" style={{ top: '25%', animationDelay: '0s', animationDuration: '4s' }}>🏈</div>
          <div className="sports-emoji football-ltr" style={{ top: '55%', animationDelay: '2.5s', animationDuration: '4.5s' }}>🏈</div>
          <div className="sports-emoji football-ltr" style={{ top: '80%', animationDelay: '5s', animationDuration: '3.5s' }}>🏈</div>
          {/* Footballs thrown right to left */}
          <div className="sports-emoji football-rtl" style={{ top: '35%', animationDelay: '1s', animationDuration: '4s' }}>🏈</div>
          <div className="sports-emoji football-rtl" style={{ top: '65%', animationDelay: '3.5s', animationDuration: '4.5s' }}>🏈</div>
          <div className="sports-emoji football-rtl" style={{ top: '15%', animationDelay: '6s', animationDuration: '3.5s' }}>🏈</div>
        </div>
      )}

      {/* Tetris pieces for gaming channel */}
      {currentChannel.grainStyle === 'crt' && (
        <div className="tetris-container">
          <div className="tetris-piece piece-i" style={{ left: '3%', animationDelay: '0s', animationDuration: '8s' }} />
          <div className="tetris-piece piece-o" style={{ left: '8%', animationDelay: '2s', animationDuration: '10s' }} />
          <div className="tetris-piece piece-t" style={{ left: '13%', animationDelay: '1s', animationDuration: '9s' }} />
          <div className="tetris-piece piece-l" style={{ left: '18%', animationDelay: '4s', animationDuration: '11s' }} />
          <div className="tetris-piece piece-j" style={{ left: '23%', animationDelay: '0.5s', animationDuration: '7s' }} />
          <div className="tetris-piece piece-s" style={{ left: '28%', animationDelay: '3s', animationDuration: '12s' }} />
          <div className="tetris-piece piece-z" style={{ left: '33%', animationDelay: '1.5s', animationDuration: '8.5s' }} />
          <div className="tetris-piece piece-i" style={{ left: '38%', animationDelay: '2.5s', animationDuration: '9.5s' }} />
          <div className="tetris-piece piece-t" style={{ left: '43%', animationDelay: '0.8s', animationDuration: '10.5s' }} />
          <div className="tetris-piece piece-o" style={{ left: '48%', animationDelay: '3.5s', animationDuration: '7.5s' }} />
          <div className="tetris-piece piece-l" style={{ left: '53%', animationDelay: '5s', animationDuration: '11.5s' }} />
          <div className="tetris-piece piece-j" style={{ left: '58%', animationDelay: '6s', animationDuration: '8.2s' }} />
          <div className="tetris-piece piece-s" style={{ left: '63%', animationDelay: '4.5s', animationDuration: '9.8s' }} />
          <div className="tetris-piece piece-z" style={{ left: '68%', animationDelay: '5.5s', animationDuration: '10.2s' }} />
          <div className="tetris-piece piece-i" style={{ left: '73%', animationDelay: '6.5s', animationDuration: '8.8s' }} />
          <div className="tetris-piece piece-t" style={{ left: '78%', animationDelay: '1.2s', animationDuration: '9.2s' }} />
          <div className="tetris-piece piece-o" style={{ left: '83%', animationDelay: '2.8s', animationDuration: '10.8s' }} />
          <div className="tetris-piece piece-l" style={{ left: '88%', animationDelay: '0.3s', animationDuration: '7.8s' }} />
          <div className="tetris-piece piece-j" style={{ left: '93%', animationDelay: '4.2s', animationDuration: '11.2s' }} />
          <div className="tetris-piece piece-s" style={{ left: '98%', animationDelay: '5.8s', animationDuration: '8.5s' }} />
          <div className="tetris-piece piece-z" style={{ left: '6%', animationDelay: '7s', animationDuration: '9.5s' }} />
          <div className="tetris-piece piece-i" style={{ left: '16%', animationDelay: '7.5s', animationDuration: '10s' }} />
          <div className="tetris-piece piece-t" style={{ left: '26%', animationDelay: '8s', animationDuration: '8.8s' }} />
          <div className="tetris-piece piece-o" style={{ left: '36%', animationDelay: '8.5s', animationDuration: '11s' }} />
          <div className="tetris-piece piece-l" style={{ left: '46%', animationDelay: '9s', animationDuration: '7.2s' }} />
          <div className="tetris-piece piece-j" style={{ left: '56%', animationDelay: '9.5s', animationDuration: '9.8s' }} />
          <div className="tetris-piece piece-s" style={{ left: '66%', animationDelay: '10s', animationDuration: '10.5s' }} />
          <div className="tetris-piece piece-z" style={{ left: '76%', animationDelay: '10.5s', animationDuration: '8.2s' }} />
          <div className="tetris-piece piece-i" style={{ left: '86%', animationDelay: '11s', animationDuration: '9s' }} />
          <div className="tetris-piece piece-t" style={{ left: '96%', animationDelay: '11.5s', animationDuration: '10.2s' }} />
        </div>
      )}

      {/* Reveal canvas (space.jpg revealed by blob) */}
      <canvas ref={revealCanvasRef} className="reveal-canvas" />

      {/* Name - Top Left */}
      <div className="name-container">
        <h1 className="name">Wesley Bard</h1>
        <p className="nickname">(you can call me Wes)</p>
        <div className="taglines-container">
          <p className="tagline">🔒 Risk and Compliance Leader by Trade.</p>
          <p className="tagline">⚙️ Engineer at Heart.</p>
          <p className="tagline">🤖 AI Builder.</p>
          <p className="tagline">👨‍👩‍👦‍👦 Proud Husband and Boy (x2) Dad.</p>
          <p className="tagline tagline-secondary">🐾 Bernese Mountain Dogs.</p>
          <p className="tagline tagline-secondary">🚀 Space Enthusiast.</p>
          <p className="tagline tagline-secondary">🕹️ Video Gamer.</p>
          <p className="tagline tagline-secondary">🏈 Florida Gators, Jacksonville Jaguars.</p>
          <p className="tagline"><svg className="tagline-icon" viewBox="0 0 24 24" fill="#1e88e5"><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/></svg> Autism & Inclusivity Advocate.</p>
        </div>
      </div>

      
      {/* Socials Widget - Top Right */}
      <div className="widget widget-top-right">
        <div className="widget-top">
          <a href="https://www.linkedin.com/in/wesleybard/" target="_blank" rel="noopener noreferrer" className="widget-top-link">
            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            <span className="widget-top-link-text">LINKED IN</span>
          </a>
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

      {/* Moonballs Widget - Bottom Left */}
      <div className="widget widget-bottom-left">
        <a href="/moonballs" className="widget-top-link moonballs-link">
          <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="8" cy="9" r="1.2"/>
            <circle cx="14" cy="7" r="1"/>
            <circle cx="16" cy="12" r="1.2"/>
            <circle cx="11" cy="14" r="1"/>
            <circle cx="7" cy="14" r="0.8"/>
            <circle cx="14" cy="17" r="0.9"/>
            <circle cx="10" cy="10" r="0.6"/>
          </svg>
          <span className="widget-top-link-text">MOON BALLS</span>
        </a>
        <a href="/lee" className="widget-bottom">
          <svg className="widget-bottom-icon" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
          <div className="widget-bottom-text">
            <div className="widget-bottom-title">LEE&apos;S PICKS</div>
            <div className="widget-bottom-subtitle">Curated Recommendations</div>
          </div>
        </a>
      </div>

      {/* Channel Widget - Bottom Right */}
      <div className="widget widget-bottom-right channel-widget">
        <div className="channel-display">
          {isChangingChannel && <div className="channel-static" />}
          <div className="channel-label">CURRENT CHANNEL</div>
          <span className={`channel-icon channel-icon-${currentChannel.id}`}>{currentChannel.icon}</span>
          <span className="channel-name">{currentChannel.name}</span>
        </div>
        <button
          className="channel-dial-container"
          onClick={handleChannelChange}
          disabled={isChangingChannel}
        >
          <div className="dial-outer-ring">
            <div
              className="channel-dial"
              style={{ transform: `rotate(${dialRotation}deg)` }}
            >
              <div className="dial-indicator" />
              <div className="dial-center-cap" />
            </div>
          </div>
          <span className="dial-label">CHANGE CHANNEL</span>
        </button>
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
          z-index: 1;
        }

        .grain-overlay {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          pointer-events: none;
          z-index: 1;
          opacity: 0.18;
          animation: grain 3s steps(1) infinite;
        }

        /* Film grain - default space channel */
        .grain-film {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }

        /* Space background - behind the pictures */
        .space-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          overflow: hidden;
        }

        /* Planets */
        .planet {
          position: absolute;
          border-radius: 50%;
          opacity: 0.5;
        }

        .planet-1 {
          width: 120px;
          height: 120px;
          top: 10%;
          right: 8%;
          background: radial-gradient(circle at 30% 30%, #8b5a2b, #4a3728 60%, #2d1f1a);
          box-shadow: inset -15px -10px 30px rgba(0,0,0,0.5), 0 0 40px rgba(139, 90, 43, 0.3);
          animation: planet-drift-1 20s ease-in-out infinite;
        }

        .planet-2 {
          width: 80px;
          height: 80px;
          bottom: 15%;
          left: 5%;
          background: radial-gradient(circle at 35% 35%, #6b8cae, #3d5a73 50%, #1a2f3d);
          box-shadow: inset -10px -8px 20px rgba(0,0,0,0.5), 0 0 30px rgba(107, 140, 174, 0.3);
          animation: planet-drift-2 25s ease-in-out infinite;
        }

        .planet-3 {
          width: 60px;
          height: 60px;
          top: 55%;
          right: 15%;
          background: radial-gradient(circle at 30% 30%, #c4a35a, #8b7355 60%, #4a3f2f);
          box-shadow: inset -8px -6px 15px rgba(0,0,0,0.5), 0 0 20px rgba(196, 163, 90, 0.3);
          animation: planet-drift-3 18s ease-in-out infinite;
        }

        .planet-4 {
          width: 100px;
          height: 100px;
          top: 25%;
          left: calc(3% + 300px);
          background: radial-gradient(circle at 30% 30%, #9b59b6, #6c3483 60%, #4a235a);
          box-shadow: inset -12px -9px 25px rgba(0,0,0,0.5), 0 0 35px rgba(155, 89, 182, 0.3);
          animation: planet-drift-4 22s ease-in-out infinite;
        }

        @keyframes planet-drift-1 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-30px, 20px); }
          50% { transform: translate(-10px, 40px); }
          75% { transform: translate(20px, 16px); }
        }

        @keyframes planet-drift-2 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(24px, -16px); }
          50% { transform: translate(40px, 10px); }
          75% { transform: translate(16px, 30px); }
        }

        @keyframes planet-drift-3 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-20px, -24px); }
          50% { transform: translate(16px, -10px); }
          75% { transform: translate(-10px, 20px); }
        }

        @keyframes planet-drift-4 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(25px, 15px); }
          50% { transform: translate(10px, -20px); }
          75% { transform: translate(-15px, 25px); }
        }

        /* Background stars */
        .bg-star {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #ffd700;
          border-radius: 50%;
          opacity: 0.8;
          box-shadow: 0 0 12px 4px rgba(255, 215, 0, 0.6), 0 0 20px 6px rgba(255, 200, 0, 0.3);
          animation: star-twinkle 3s ease-in-out infinite;
        }

        .bg-star:nth-child(odd) {
          background: #87ceeb;
          box-shadow: 0 0 12px 4px rgba(135, 206, 235, 0.6), 0 0 20px 6px rgba(135, 206, 235, 0.3);
          animation: star-twinkle-alt 4s ease-in-out infinite;
        }

        .bg-star-large {
          width: 12px;
          height: 12px;
          opacity: 1;
          background: #fff;
          box-shadow: 0 0 20px 6px rgba(255, 255, 255, 0.8), 0 0 30px 10px rgba(255, 215, 0, 0.4);
          animation: star-twinkle-large 5s ease-in-out infinite;
        }

        @keyframes star-twinkle {
          0%, 100% { opacity: 0.4; transform: scale(1) translate(0, 0); }
          25% { opacity: 0.7; transform: scale(1.1) translate(1px, -1px); }
          50% { opacity: 0.9; transform: scale(1.2) translate(0, 1px); }
          75% { opacity: 0.6; transform: scale(1.05) translate(-1px, 0); }
        }

        @keyframes star-twinkle-alt {
          0%, 100% { opacity: 0.5; transform: scale(1) translate(0, 0); }
          25% { opacity: 0.8; transform: scale(1.15) translate(-1px, 1px); }
          50% { opacity: 0.6; transform: scale(0.95) translate(1px, 0); }
          75% { opacity: 0.9; transform: scale(1.1) translate(0, -1px); }
        }

        @keyframes star-twinkle-large {
          0%, 100% { opacity: 0.6; transform: scale(1) translate(0, 0); }
          25% { opacity: 0.9; transform: scale(1.15) translate(2px, -2px); }
          50% { opacity: 1; transform: scale(1.25) translate(-1px, 2px); }
          75% { opacity: 0.75; transform: scale(1.1) translate(1px, -1px); }
        }


        /* Sports effect - green field with animated yard lines */
        .grain-sports {
          background:
            /* Small 5-yard marker lines */
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 58px,
              rgba(255, 255, 255, 0.35) 58px,
              rgba(255, 255, 255, 0.35) 60px,
              transparent 60px,
              transparent 120px
            ),
            /* Big 10-yard marker lines */
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 118px,
              rgba(255, 255, 255, 0.7) 118px,
              rgba(255, 255, 255, 0.7) 122px,
              transparent 122px,
              transparent 240px
            ),
            linear-gradient(
              180deg,
              rgba(34, 139, 34, 0.12) 0%,
              rgba(34, 139, 34, 0.18) 50%,
              rgba(34, 139, 34, 0.12) 100%
            );
          opacity: 1;
          animation: yard-lines 12s linear infinite;
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

        @keyframes yard-lines {
          0% { transform: translateX(-240px); }
          100% { transform: translateX(0px); }
        }

        /* Sports emojis container */
        .sports-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }

        /* Hash marks - small perpendicular lines */
        .hash-marks {
          position: absolute;
          top: 0;
          left: 0;
          width: calc(100% + 240px);
          height: 100%;
          background:
            /* Upper hash marks */
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 117px,
              rgba(255, 255, 255, 0.4) 117px,
              rgba(255, 255, 255, 0.4) 123px,
              transparent 123px,
              transparent 240px
            ),
            /* Lower hash marks */
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 117px,
              rgba(255, 255, 255, 0.4) 117px,
              rgba(255, 255, 255, 0.4) 123px,
              transparent 123px,
              transparent 240px
            );
          background-size: 240px 8px, 240px 8px;
          background-position: 0 30%, 0 70%;
          background-repeat: repeat-x;
          animation: yard-lines 12s linear infinite;
        }

        /* Yard numbers */
        .yard-numbers {
          position: absolute;
          top: 50%;
          left: -120px;
          transform: translateY(-50%);
          display: flex;
          gap: 0;
          animation: yard-numbers-anchored 12s linear infinite;
          white-space: nowrap;
        }

        @keyframes yard-numbers-anchored {
          0% { transform: translateY(-50%) translateX(-240px); }
          100% { transform: translateY(-50%) translateX(0px); }
        }

        .yard-number {
          font-family: 'Arial Black', 'Helvetica Neue', sans-serif;
          font-size: 48px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.15);
          width: 240px;
          text-align: center;
          letter-spacing: 4px;
          text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        .sports-emoji {
          position: absolute;
          font-size: 32px;
          opacity: 0.25;
        }

        .football-ltr {
          left: -60px;
          animation: football-throw-ltr linear infinite;
        }

        .football-rtl {
          right: -60px;
          animation: football-throw-rtl linear infinite;
        }

        @keyframes football-throw-ltr {
          0% {
            transform: translateX(0) translateY(60px) rotate(-30deg);
            opacity: 0;
          }
          10% {
            opacity: 0.25;
          }
          50% {
            transform: translateX(calc(50vw + 30px)) translateY(-180px) rotate(-30deg);
          }
          90% {
            opacity: 0.25;
          }
          100% {
            transform: translateX(calc(100vw + 60px)) translateY(60px) rotate(-30deg);
            opacity: 0;
          }
        }

        @keyframes football-throw-rtl {
          0% {
            transform: translateX(0) translateY(60px) rotate(210deg);
            opacity: 0;
          }
          10% {
            opacity: 0.25;
          }
          50% {
            transform: translateX(calc(-50vw - 30px)) translateY(-180px) rotate(210deg);
          }
          90% {
            opacity: 0.25;
          }
          100% {
            transform: translateX(calc(-100vw - 60px)) translateY(60px) rotate(210deg);
            opacity: 0;
          }
        }

        /* CRT effect - classic 8-bit Nintendo TV look */
        .grain-crt {
          background:
            repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.3) 0px,
              rgba(0, 0, 0, 0.3) 1px,
              transparent 1px,
              transparent 3px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(255, 0, 0, 0.03) 0px,
              rgba(255, 0, 0, 0.03) 1px,
              rgba(0, 255, 0, 0.03) 1px,
              rgba(0, 255, 0, 0.03) 2px,
              rgba(0, 0, 255, 0.03) 2px,
              rgba(0, 0, 255, 0.03) 3px
            );
          opacity: 1;
          animation: crt-flicker 0.15s infinite;
          box-shadow: inset 0 0 150px rgba(0, 0, 0, 0.4);
        }

        @keyframes crt-flicker {
          0% { opacity: 0.97; }
          50% { opacity: 1; }
          100% { opacity: 0.98; }
        }

        /* Tetris pieces container */
        .tetris-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }

        .tetris-piece {
          position: absolute;
          top: -120px;
          opacity: 0.25;
          animation: tetris-fall linear infinite;
        }

        @keyframes tetris-fall {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          24.9% {
            transform: translateY(calc(25vh)) rotate(0deg);
          }
          25% {
            transform: translateY(calc(25vh)) rotate(90deg);
          }
          49.9% {
            transform: translateY(calc(50vh)) rotate(90deg);
          }
          50% {
            transform: translateY(calc(50vh)) rotate(180deg);
          }
          74.9% {
            transform: translateY(calc(75vh)) rotate(180deg);
          }
          75% {
            transform: translateY(calc(75vh)) rotate(270deg);
          }
          99.9% {
            transform: translateY(calc(100vh + 100px)) rotate(270deg);
          }
          100% {
            transform: translateY(calc(100vh + 100px)) rotate(360deg);
          }
        }

        /* I-piece - cyan */
        .piece-i {
          width: 24px;
          height: 96px;
          background: #00f0f0;
          box-shadow: inset -3px -3px 0 rgba(0,0,0,0.3), inset 3px 3px 0 rgba(255,255,255,0.3);
        }

        /* O-piece - yellow */
        .piece-o {
          width: 48px;
          height: 48px;
          background: #f0f000;
          box-shadow: inset -3px -3px 0 rgba(0,0,0,0.3), inset 3px 3px 0 rgba(255,255,255,0.3);
        }

        /* T-piece - purple */
        .piece-t {
          width: 72px;
          height: 48px;
          background: #a000f0;
          clip-path: polygon(33% 0%, 66% 0%, 66% 50%, 100% 50%, 100% 100%, 0% 100%, 0% 50%, 33% 50%);
          box-shadow: inset -3px -3px 0 rgba(0,0,0,0.3), inset 3px 3px 0 rgba(255,255,255,0.3);
        }

        /* L-piece - orange */
        .piece-l {
          width: 48px;
          height: 72px;
          background: #f0a000;
          clip-path: polygon(0% 0%, 50% 0%, 50% 66%, 100% 66%, 100% 100%, 0% 100%);
          box-shadow: inset -3px -3px 0 rgba(0,0,0,0.3), inset 3px 3px 0 rgba(255,255,255,0.3);
        }

        /* J-piece - blue */
        .piece-j {
          width: 48px;
          height: 72px;
          background: #0000f0;
          clip-path: polygon(50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 66%, 50% 66%);
          box-shadow: inset -3px -3px 0 rgba(0,0,0,0.3), inset 3px 3px 0 rgba(255,255,255,0.3);
        }

        /* S-piece - green */
        .piece-s {
          width: 72px;
          height: 48px;
          background: #00f000;
          clip-path: polygon(33% 0%, 100% 0%, 100% 50%, 66% 50%, 66% 100%, 0% 100%, 0% 50%, 33% 50%);
          box-shadow: inset -3px -3px 0 rgba(0,0,0,0.3), inset 3px 3px 0 rgba(255,255,255,0.3);
        }

        /* Z-piece - red */
        .piece-z {
          width: 72px;
          height: 48px;
          background: #f00000;
          clip-path: polygon(0% 0%, 66% 0%, 66% 50%, 100% 50%, 100% 100%, 33% 100%, 33% 50%, 0% 50%);
          box-shadow: inset -3px -3px 0 rgba(0,0,0,0.3), inset 3px 3px 0 rgba(255,255,255,0.3);
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
          position: fixed;
          top: 40px;
          left: 40px;
          z-index: 10;
        }

        .name {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 4rem;
          font-weight: 700;
          line-height: 1;
          color: #1f2937;
          margin: 0;
          white-space: nowrap;
        }

        .nickname {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 1rem;
          font-weight: 400;
          font-style: italic;
          color: #888;
          margin: 0.4em 0 0 0;
        }

        .taglines-container {
          margin-top: 0.75em;
          padding-top: 0.75em;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
        }

        .tagline {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.85rem;
          font-weight: 400;
          color: #555;
          margin: 0;
          margin-top: 0.35em;
          letter-spacing: 0.02em;
        }

        .tagline:first-of-type {
          margin-top: 0;
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

        .widget-top-right {
          top: 40px;
          right: 40px;
        }

        .widget-bottom-left {
          bottom: 40px;
          left: 40px;
        }

        .widget-bottom-right {
          bottom: 40px;
          right: 40px;
        }

        .moonballs-link:hover {
          color: #6366f1;
        }

        .channel-widget {
          width: 180px;
          background: #1a1a1a;
          border: none;
          animation: channel-pulse 1.5s ease-in-out 3;
          animation-delay: 1s;
        }

        @keyframes channel-pulse {
          0%, 100% {
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
          }
          50% {
            box-shadow: 0 0 20px 4px rgba(99, 102, 241, 0.5), 0 0 40px 8px rgba(99, 102, 241, 0.3);
          }
        }

        .channel-display {
          position: relative;
          overflow: hidden;
          padding: 20px;
          text-align: center;
          background: #374151;
        }

        .channel-label {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          color: #666;
          margin-bottom: 4px;
        }

        .channel-icon {
          font-size: 2.2rem;
          display: inline-block;
          margin-bottom: 4px;
        }

        /* Animated icons for each channel */
        .channel-icon-space {
          animation: rocket-float 1.5s ease-in-out infinite;
        }

        .channel-icon-gaming {
          animation: gamepad-rock 0.8s ease-in-out infinite;
        }

        .channel-icon-sports {
          animation: football-spin 2s linear infinite;
        }

        @keyframes rocket-float {
          0%, 100% { transform: translateY(0) rotate(-15deg); }
          50% { transform: translateY(-8px) rotate(-5deg); }
        }

        @keyframes gamepad-rock {
          0%, 100% { transform: rotate(-15deg); }
          50% { transform: rotate(15deg); }
        }

        @keyframes football-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* TV Static effect */
        .channel-static {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            repeating-radial-gradient(circle at 50% 50%,
              transparent 0,
              rgba(0,0,0,0.1) 1px,
              transparent 2px
            ),
            linear-gradient(
              to bottom,
              rgba(255,255,255,0.1) 0%,
              rgba(0,0,0,0.2) 50%,
              rgba(255,255,255,0.1) 100%
            );
          background-color: #888;
          background-size: 4px 4px, 100% 4px;
          z-index: 10;
          animation: static-flicker 0.05s steps(3) infinite;
          border-radius: inherit;
        }

        @keyframes static-flicker {
          0% { opacity: 1; background-position: 0 0, 0 0; }
          33% { opacity: 0.95; background-position: 2px 1px, 0 2px; }
          66% { opacity: 1; background-position: 1px 2px, 0 1px; }
          100% { opacity: 0.9; background-position: 0 0, 0 3px; }
        }

        .channel-name {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          color: #fff;
          text-transform: uppercase;
        }

        .channel-dial-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 16px 20px;
          background: #1a1a1a;
          border: none;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .channel-dial-container:hover {
          background: #2a2a2a;
        }

        .channel-dial-container:disabled {
          cursor: not-allowed;
        }

        .dial-outer-ring {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #2a2a2a;
          padding: 3px;
          box-shadow:
            0 6px 12px rgba(0,0,0,0.5),
            0 2px 4px rgba(0,0,0,0.3),
            inset 0 1px 1px rgba(255,255,255,0.05);
          position: relative;
        }

        /* Ridges around the edge */
        .dial-outer-ring::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 50%;
          background:
            repeating-conic-gradient(
              from 0deg,
              #3d3d3d 0deg 6deg,
              #2a2a2a 6deg 12deg
            );
          mask: radial-gradient(circle, transparent 75%, black 76%);
          -webkit-mask: radial-gradient(circle, transparent 75%, black 76%);
        }

        .channel-dial {
          width: 100%;
          height: 100%;
          background:
            radial-gradient(ellipse at 25% 25%, #d4c4a0 0%, #8b7355 30%, #5c4a32 70%, #3d3225 100%);
          border-radius: 50%;
          position: relative;
          box-shadow:
            inset 0 3px 8px rgba(255,255,255,0.3),
            inset 0 -4px 8px rgba(0,0,0,0.5),
            inset 2px 0 4px rgba(0,0,0,0.2),
            inset -2px 0 4px rgba(0,0,0,0.2),
            0 2px 4px rgba(0,0,0,0.4);
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          border: 2px solid #4a3f2f;
        }

        /* Inner ridges on the knob */
        .channel-dial::before {
          content: '';
          position: absolute;
          top: 6px;
          left: 6px;
          right: 6px;
          bottom: 6px;
          border-radius: 50%;
          background:
            repeating-conic-gradient(
              from 0deg,
              rgba(0,0,0,0.15) 0deg 15deg,
              rgba(255,255,255,0.05) 15deg 30deg
            );
        }

        .channel-dial-container:hover .channel-dial {
          background:
            radial-gradient(ellipse at 25% 25%, #e0d0b0 0%, #9b8365 30%, #6c5a42 70%, #4d4235 100%);
        }

        .dial-indicator {
          position: absolute;
          top: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 14px;
          background: linear-gradient(to bottom, #f5f0e0, #c0b090);
          border-radius: 2px;
          box-shadow:
            0 1px 2px rgba(0,0,0,0.4),
            inset 0 1px 1px rgba(255,255,255,0.5);
          z-index: 2;
        }

        .dial-center-cap {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 18px;
          height: 18px;
          background:
            radial-gradient(ellipse at 35% 35%, #c0a878 0%, #8b7355 50%, #5c4a32 100%);
          border-radius: 50%;
          box-shadow:
            inset 0 2px 4px rgba(255,255,255,0.3),
            inset 0 -2px 4px rgba(0,0,0,0.4),
            0 1px 3px rgba(0,0,0,0.3);
          border: 1px solid #4a3f2f;
          z-index: 3;
        }

        /* Hex screw head in center */
        .dial-center-cap::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          background: #3d3225;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }

        .dial-label {
          color: #888;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.55rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
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
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
        }

        .widget-top-link:hover {
          color: #1a1a1a;
          transform: scale(1.05);
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

        /* Hide secondary taglines when viewport height is limited */
        @media (max-height: 750px) {
          .tagline-secondary {
            display: none;
          }
        }

        /* Also hide on small width + moderate height combo */
        @media (max-width: 768px) and (max-height: 900px) {
          .tagline-secondary {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .background-image {
            background-size: cover;
          }

          .name {
            font-size: 2.5rem;
          }

          .nickname {
            font-size: 0.85rem;
          }

          .name-container {
            position: fixed;
            top: 24px;
            left: 24px;
            right: auto;
            max-width: 60%;
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

          .widget-top-right {
            top: auto;
            bottom: 20px;
            right: 16px;
          }

          .widget-bottom-left {
            bottom: 20px;
            left: 16px;
          }

          .widget-bottom-right {
            bottom: auto;
            top: 24px;
            right: 16px;
          }

          .channel-widget {
            width: 130px;
          }

          .channel-display {
            padding: 14px;
          }

          .channel-label {
            font-size: 0.5rem;
            margin-bottom: 3px;
          }

          .channel-icon {
            font-size: 1.6rem;
            margin-bottom: 3px;
          }

          .channel-name {
            font-size: 0.5rem;
          }

          .channel-dial-container {
            padding: 12px 14px;
            gap: 8px;
          }

          .dial-outer-ring {
            width: 50px;
            height: 50px;
            padding: 3px;
          }

          .dial-indicator {
            height: 10px;
            width: 2px;
            top: 3px;
          }

          .dial-center-cap {
            width: 16px;
            height: 16px;
          }

          .dial-label {
            font-size: 0.5rem;
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
            margin-bottom: 0;
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
            font-size: 2rem;
          }

          .nickname {
            font-size: 0.75rem;
          }

          .name-container {
            top: 16px;
            left: 16px;
            max-width: 65%;
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

          .widget-top-right {
            bottom: 16px;
            right: 10px;
          }

          .widget-bottom-left {
            bottom: 16px;
            left: 10px;
          }

          .widget-bottom-right {
            top: 16px;
            right: 10px;
          }

          .channel-widget {
            width: 110px;
          }

          .channel-display {
            padding: 10px;
          }

          .channel-label {
            font-size: 0.45rem;
            margin-bottom: 2px;
          }

          .channel-icon {
            font-size: 1.3rem;
            margin-bottom: 2px;
          }

          .channel-name {
            font-size: 0.45rem;
          }

          .channel-dial-container {
            padding: 10px;
            gap: 6px;
          }

          .dial-outer-ring {
            width: 42px;
            height: 42px;
            padding: 3px;
          }

          .dial-indicator {
            height: 8px;
            width: 2px;
            top: 2px;
          }

          .dial-center-cap {
            width: 14px;
            height: 14px;
          }

          .dial-label {
            font-size: 0.45rem;
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
            margin-bottom: 0;
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
            font-size: 1.5rem;
          }

          .nickname {
            font-size: 0.65rem;
          }

          .name-container {
            top: 12px;
            left: 12px;
            max-width: 60%;
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

          .widget-top-right {
            bottom: 10px;
            right: 6px;
          }

          .widget-bottom-left {
            bottom: 10px;
            left: 6px;
          }

          .widget-bottom-right {
            top: 10px;
            right: 6px;
          }

          .channel-widget {
            width: 95px;
          }

          .channel-display {
            padding: 8px;
          }

          .channel-label {
            font-size: 0.4rem;
            margin-bottom: 2px;
          }

          .channel-icon {
            font-size: 1.1rem;
            margin-bottom: 2px;
          }

          .channel-name {
            font-size: 0.4rem;
          }

          .channel-dial-container {
            padding: 8px;
            gap: 4px;
          }

          .dial-outer-ring {
            width: 36px;
            height: 36px;
            padding: 2px;
          }

          .dial-indicator {
            height: 6px;
            width: 2px;
            top: 2px;
          }

          .dial-center-cap {
            width: 12px;
            height: 12px;
          }

          .dial-label {
            font-size: 0.4rem;
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
            margin-bottom: 0;
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
