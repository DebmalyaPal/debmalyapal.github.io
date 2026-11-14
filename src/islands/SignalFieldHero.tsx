import { useEffect, useRef, useState } from 'react';
import { useReducedMotion, useThemeVersion } from '@/hooks/useMotionPreference';

/**
 * A field of signal particles behind the hero text.
 *
 * - Particles drift on a smooth flow field around jittered grid positions.
 * - Pointer/touch movement and clicks emit ripples that travel through the field; particles
 *   displaced by a wavefront brighten, which reads as light refracting through water.
 * - Near the pointer, close particles link into a small graph — the motif the research
 *   atlas picks up further down the page. Without a pointer (touch, idle, or the reduced-motion
 *   still frame) a slow-drifting focus point forms the same graph on the open side of the hero.
 *
 * Fallbacks: the static CSS backdrop sits underneath at all times. With reduced motion the
 * canvas draws one still frame and attaches no listeners. Animation pauses offscreen and in
 * background tabs, and density drops on low-power devices or when frames run slow.
 */

interface Particle {
  hx: number;
  hy: number;
  x: number;
  y: number;
  phase: number;
  tint: number; // 0 → signal colour, 1 → pulse colour
}

interface Ripple {
  x: number;
  y: number;
  born: number;
  strength: number;
}

type RGB = [number, number, number];

const RIPPLE_SPEED = 0.32; // px per ms
const RIPPLE_LIFE = 2600; // ms
const RIPPLE_WIDTH = 46; // px
const LINK_RADIUS = 150; // px around the pointer where the graph forms
const LINK_DIST = 58; // px between linked particles

function parseColor(value: string, fallback: RGB): RGB {
  const v = value.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(v);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return fallback;
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function isLowPower() {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || nav.connection?.saveData === true;
}

export default function SignalFieldHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const theme = useThemeVersion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !ctx) return; // No canvas support: the static backdrop remains.

    const host = (canvas.closest('[data-hero]') as HTMLElement | null) ?? canvas.parentElement!;
    const styles = getComputedStyle(document.documentElement);
    const signal = parseColor(styles.getPropertyValue('--signal'), [110, 231, 200]);
    const pulse = parseColor(styles.getPropertyValue('--pulse'), [181, 156, 255]);
    const light = theme === 'light';

    let lowPower = isLowPower();
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    const ripples: Ripple[] = [];
    const pointer = { x: -9999, y: -9999, active: false, lastRipple: 0, lastX: 0, lastY: 0 };
    let frame = 0;
    let running = false;
    let visible = true;
    let start = performance.now();
    let slowFrames = 0;
    let lastTime = start;

    function build() {
      const rect = canvas!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 2);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const spacing = (width < 640 ? 30 : 24) * (lowPower ? 1.35 : 1);
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      particles = [];
      // Deterministic jitter so the still frame is identical between visits.
      let seed = 7;
      const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const hx = c * spacing + (rand() - 0.5) * spacing * 0.9;
          const hy = r * spacing + (rand() - 0.5) * spacing * 0.9;
          particles.push({ hx, hy, x: hx, y: hy, phase: rand() * Math.PI * 2, tint: smoothstep(0.35, 1, hx / width + (rand() - 0.5) * 0.5) });
        }
      }
    }

    /** Keeps the field quiet behind the headline (left side on wide screens). */
    function guard(x: number, y: number) {
      if (width < 768) return 0.5;
      return 0.28 + 0.72 * Math.max(smoothstep(width * 0.32, width * 0.78, x), smoothstep(height * 0.7, height, y) * 0.6);
    }

    function draw(now: number) {
      const t = now - start;
      ctx!.clearRect(0, 0, width, height);

      for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i]!.born > RIPPLE_LIFE) ripples.splice(i, 1);

      // The graph forms around the real pointer, or around a drifting focus on wide screens.
      const ghost = !pointer.active && width >= 768;
      const focus = pointer.active
        ? { x: pointer.x, y: pointer.y, weight: 1 }
        : ghost
          ? { x: width * (0.74 + 0.1 * Math.sin(t * 0.00011)), y: height * (0.42 + 0.18 * Math.sin(t * 0.00017 + 1)), weight: 0.55 }
          : null;

      const near: Particle[] = [];
      for (const p of particles) {
        // Ambient flow: two slow, incommensurate sinusoids per axis.
        let dx = Math.sin(p.hy * 0.012 + t * 0.00035 + p.phase) * 4 + Math.sin(p.hx * 0.006 - t * 0.0002) * 3;
        let dy = Math.cos(p.hx * 0.011 + t * 0.0003 + p.phase) * 4 + Math.cos(p.hy * 0.007 + t * 0.00017) * 3;
        let energy = 0;

        for (const rp of ripples) {
          const age = now - rp.born;
          const radius = age * RIPPLE_SPEED;
          const ox = p.hx - rp.x;
          const oy = p.hy - rp.y;
          const d = Math.hypot(ox, oy) || 1;
          const band = Math.exp(-((d - radius) ** 2) / (RIPPLE_WIDTH * RIPPLE_WIDTH));
          if (band < 0.01) continue;
          const decay = (1 - age / RIPPLE_LIFE) ** 2 * rp.strength;
          const push = band * decay * 14;
          dx += (ox / d) * push;
          dy += (oy / d) * push;
          energy += band * decay;
        }

        if (focus) {
          const ox = p.hx - focus.x;
          const oy = p.hy - focus.y;
          const d = Math.hypot(ox, oy);
          if (d < LINK_RADIUS) {
            const pull = (1 - d / LINK_RADIUS) ** 2 * focus.weight;
            dx += (ox / (d || 1)) * pull * 10;
            dy += (oy / (d || 1)) * pull * 10;
            energy += pull * 0.6;
            near.push(p);
          }
        }

        p.x = p.hx + dx;
        p.y = p.hy + dy;

        const g = guard(p.x, p.y);
        const base = light ? 0.4 : 0.36;
        const alpha = Math.min(1, (base + energy * 0.9) * g);
        const col = p.tint > 0.5 ? pulse : signal;
        ctx!.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha.toFixed(3)})`;
        const size = 1.3 + Math.min(1.6, energy * 2.2);
        ctx!.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      }

      // Graph edges between neighbouring particles around the pointer.
      if (focus && near.length > 1) {
        ctx!.lineWidth = 0.7;
        for (let i = 0; i < near.length; i++) {
          const a = near[i]!;
          for (let j = i + 1; j < near.length; j++) {
            const b = near[j]!;
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d > LINK_DIST) continue;
            const fade = (1 - d / LINK_DIST) * (1 - Math.hypot(a.x - focus.x, a.y - focus.y) / LINK_RADIUS) * focus.weight;
            if (fade <= 0) continue;
            ctx!.strokeStyle = `rgba(${signal[0]},${signal[1]},${signal[2]},${(fade * 0.55).toFixed(3)})`;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }
    }

    function loop(now: number) {
      if (!running) return;
      // Adaptive quality: sustained slow frames halve the particle count once.
      const dt = now - lastTime;
      lastTime = now;
      if (!lowPower && dt > 28) {
        if (++slowFrames > 45) {
          lowPower = true;
          build();
        }
      } else slowFrames = Math.max(0, slowFrames - 1);

      // Occasional ambient ripple so the field stays alive on touch devices with no hover.
      if (ripples.length === 0 && Math.random() < 0.004) {
        ripples.push({ x: width * (0.45 + Math.random() * 0.5), y: height * (0.15 + Math.random() * 0.7), born: now, strength: 0.6 });
      }
      draw(now);
      frame = requestAnimationFrame(loop);
    }

    function play() {
      if (running || reduced || !visible || document.hidden) return;
      running = true;
      lastTime = performance.now();
      frame = requestAnimationFrame(loop);
    }

    function pause() {
      running = false;
      cancelAnimationFrame(frame);
    }

    build();
    draw(reduced ? start + 12000 : performance.now());
    setReady(true);

    if (reduced) {
      const ro = new ResizeObserver(() => {
        build();
        draw(start + 12000);
      });
      ro.observe(canvas);
      return () => ro.disconnect();
    }

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = local(e);
      pointer.x = x;
      pointer.y = y;
      pointer.active = e.pointerType === 'mouse' || e.pointerType === 'pen';
      const now = performance.now();
      const moved = Math.hypot(x - pointer.lastX, y - pointer.lastY);
      if (now - pointer.lastRipple > 220 && moved > 60) {
        ripples.push({ x, y, born: now, strength: 0.45 });
        pointer.lastRipple = now;
        pointer.lastX = x;
        pointer.lastY = y;
      }
      if (ripples.length > 8) ripples.shift();
    };
    const onDown = (e: PointerEvent) => {
      const { x, y } = local(e);
      ripples.push({ x, y, born: performance.now(), strength: 1 });
      if (ripples.length > 8) ripples.shift();
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onVisibility = () => (document.hidden ? pause() : play());

    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerdown', onDown, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);

    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) play();
      else pause();
    });
    io.observe(canvas);

    const ro = new ResizeObserver(() => build());
    ro.observe(canvas);

    start = performance.now();
    play();

    return () => {
      pause();
      io.disconnect();
      ro.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduced, theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-signal-field={reduced ? 'static' : 'live'}
      className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
