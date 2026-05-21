"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  type: "square" | "cross" | "cluster";
  vx: number;
  vy: number;
  opacity: number;
  originalOpacity: number;
  fadingIn: boolean;
  fadeSpeed: number;
}

export default function DitheredParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const isVisibleRef = useRef<boolean>(true);
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- SETUP DIMENSIONS & RETINA SCALING ---
    let width = 0;
    let height = 0;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Fallback sizing for initial render / non-zero layout confirmation
      width = rect.width || canvas.clientWidth || (canvas.parentElement ? canvas.parentElement.clientWidth : 0) || window.innerWidth;
      height = rect.height || canvas.clientHeight || (canvas.parentElement ? canvas.parentElement.clientHeight : 0) || window.innerHeight;

      // Set actual drawing buffer size scaled for high DPI displays
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // Scale drawing context to match CSS pixels
      ctx.scale(dpr, dpr);
      
      // Re-initialize or adjust particles within the new dimensions
      particles.forEach((p) => {
        if (p.x > width) p.x = Math.random() * width;
        if (p.y > height) p.y = Math.random() * height;
      });
    };

    // --- PARTICLE GENERATION ---
    const particleCount = 45;
    const particles: Particle[] = [];

    const createParticle = (initRandomY = false): Particle => {
      const types: ("square" | "cross" | "cluster")[] = ["square", "cross", "cluster"];
      const originalOpacity = Math.random() * 0.20 + 0.15; // Elegant technical opacity: 15% to 35%
      
      return {
        x: Math.random() * (width || window.innerWidth),
        y: initRandomY 
          ? Math.random() * (height || window.innerHeight) 
          : (height || window.innerHeight) + 10, // Start slightly below bottom if spawning during run
        size: Math.random() * 5 + 3, // 3px to 8px size
        type: types[Math.floor(Math.random() * types.length)],
        vx: (Math.random() - 0.5) * 0.25, // Slow horizontal drift
        vy: -(Math.random() * 0.35 + 0.15), // Slow upward movement
        opacity: initRandomY ? Math.random() * originalOpacity : 0, // Fade in slowly if spawning
        originalOpacity,
        fadingIn: true,
        fadeSpeed: Math.random() * 0.005 + 0.002,
      };
    };

    // Initialize particles across the full screen
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(true));
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    
    // Set a timeout fallback to re-check dimensions after initial render tree paint
    const timeoutId = setTimeout(handleResize, 60);

    // --- MOUSE TRACKING ---
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // --- ANIMATION LOOP ---
    const render = () => {
      if (!isVisibleRef.current) return;

      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const repulsionRadius = 130;
      const repulsionForce = 0.55;

      particles.forEach((p) => {
        // --- 1. Physics & Movement ---
        let currentVx = p.vx;
        let currentVy = p.vy;

        // Mouse interaction (repulsion)
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < repulsionRadius) {
            const force = (repulsionRadius - distance) / repulsionRadius;
            const angle = Math.atan2(dy, dx);
            // Add mouse force pushing particle away
            currentVx += Math.cos(angle) * force * repulsionForce;
            currentVy += Math.sin(angle) * force * repulsionForce;
          }
        }

        // Apply updated velocities
        p.x += currentVx;
        p.y += currentVy;

        // --- 2. Fade Effects ---
        if (p.fadingIn) {
          p.opacity += p.fadeSpeed;
          if (p.opacity >= p.originalOpacity) {
            p.opacity = p.originalOpacity;
            p.fadingIn = false;
          }
        }

        // --- 3. Boundary Wrap & Reset ---
        // If a particle drifts off the top or far horizontally, recycle it at the bottom
        if (p.y < -10 || p.x < -10 || p.x > width + 10) {
          const resetParticle = createParticle(false);
          Object.assign(p, resetParticle);
        }

        // --- 4. Render Particle ---
        ctx.fillStyle = `rgba(0, 85, 255, ${p.opacity})`; // Primary Electric Blue
        ctx.strokeStyle = `rgba(0, 85, 255, ${p.opacity})`;
        ctx.lineWidth = 1;

        if (p.type === "square") {
          // Sharp 1-bit square
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.floor(p.size), Math.floor(p.size));
        } else if (p.type === "cross") {
          // Technical plus sign (+)
          const hSize = Math.floor(p.size / 2) + 1;
          const px = Math.floor(p.x);
          const py = Math.floor(p.y);

          ctx.beginPath();
          ctx.moveTo(px - hSize, py);
          ctx.lineTo(px + hSize, py);
          ctx.moveTo(px, py - hSize);
          ctx.lineTo(px, py + hSize);
          ctx.stroke();
        } else if (p.type === "cluster") {
          // Stair-step / dither matrix block (vintage digital matrix cluster)
          const px = Math.floor(p.x);
          const py = Math.floor(p.y);
          
          ctx.fillRect(px, py, 2, 2);
          ctx.fillRect(px + 2, py + 2, 2, 2);
          ctx.fillRect(px + 4, py, 2, 2);
        }
      });

      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    // --- INTERSECTION OBSERVER (PAUSE ON SCROLL OUT) ---
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
          if (entry.isIntersecting) {
            // Resume loop if scrolled back in
            if (animationFrameIdRef.current === null) {
              animationFrameIdRef.current = requestAnimationFrame(render);
            }
          } else {
            // Cancel animation frame loop when out of view
            if (animationFrameIdRef.current !== null) {
              cancelAnimationFrame(animationFrameIdRef.current);
              animationFrameIdRef.current = null;
            }
          }
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    // --- PAGE VISIBILITY (PAUSE ON TAB INACTIVE) ---
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === "visible";
      if (!isVisible) {
        isVisibleRef.current = false;
        if (animationFrameIdRef.current !== null) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
        }
      } else {
        // Only resume if observer also confirms visibility
        const rect = canvas.getBoundingClientRect();
        const isInViewport = 
          rect.top < window.innerHeight && 
          rect.bottom > 0 && 
          rect.left < window.innerWidth && 
          rect.right > 0;
        
        if (isInViewport) {
          isVisibleRef.current = true;
          if (animationFrameIdRef.current === null) {
            animationFrameIdRef.current = requestAnimationFrame(render);
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initial trigger
    animationFrameIdRef.current = requestAnimationFrame(render);

    // --- CLEANUP ---
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observer.disconnect();
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
