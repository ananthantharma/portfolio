/* eslint-disable react-memo/require-memo */
'use client';
import {FC, memo, useEffect, useRef} from 'react';

/**
 * Animated deep-space backdrop for the home hero, drawn on one canvas:
 * drifting nebula, three parallax star layers that twinkle, shooting stars,
 * a slowly turning planet with city lights, aurora rippling along its edge,
 * a breathing sunrise flare, a small moon, and misty mountains.
 * Static layers are pre-rendered on resize so each frame stays cheap.
 * Pauses when the tab is hidden or the hero is scrolled away; honours reduced motion.
 */

type Star = {x: number; y: number; r: number; base: number; phase: number; speed: number; layer: number; tint: string};
type City = {lat: number; lon: number; b: number; phase: number};
type Shooter = {x: number; y: number; vx: number; vy: number; life: number; max: number; len: number};

const TAU = Math.PI * 2;

/** Small seeded generator so the scene looks the same on every resize. */
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Jagged ridge line by midpoint displacement (values 0..1). */
function ridge(count: number, roughness: number, rand: () => number) {
  const size = 2 ** Math.ceil(Math.log2(count - 1)) + 1;
  const h = new Array<number>(size).fill(0);
  h[0] = rand();
  h[size - 1] = rand();
  let step = size - 1;
  let amp = 1;
  while (step > 1) {
    const half = step / 2;
    for (let i = half; i < size - 1; i += step) h[i] = (h[i - half] + h[i + half]) / 2 + (rand() - 0.5) * amp;
    amp *= roughness;
    step = half;
  }
  const min = Math.min(...h);
  const max = Math.max(...h);
  return h.slice(0, count).map(v => (v - min) / (max - min || 1));
}

const SpaceBackground: FC<{className?: string}> = memo(({className}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let raf = 0;
    let onScreen = true;
    let last = performance.now();
    let clock = 0;
    let spin = 0;
    let nextShooter = 2500;
    const mouse = {x: 0, y: 0, tx: 0, ty: 0};

    let stars: Star[] = [];
    const cities: City[] = [];
    const shooters: Shooter[] = [];
    let nebula: HTMLCanvasElement | null = null;
    let planet: HTMLCanvasElement | null = null;
    let farHills: HTMLCanvasElement | null = null;
    let nearHills: HTMLCanvasElement | null = null;
    let glow: HTMLCanvasElement | null = null;
    const P = {cx: 0, cy: 0, R: 0, sx: 0, sy: 0, flareAngle: -0.2};

    // City lights: clusters scattered over the part of the planet that faces us
    {
      const rand = rng(91);
      for (let c = 0; c < 95; c++) {
        const lat0 = 0.32 + rand() * 1.05;
        const lon0 = rand() * TAU;
        const n = 5 + Math.floor(rand() * 22);
        const spread = 0.012 + rand() * 0.05;
        for (let i = 0; i < n; i++) {
          cities.push({
            lat: lat0 + (rand() - 0.5) * spread * 1.4,
            lon: lon0 + (rand() - 0.5) * spread * 3,
            b: 0.25 + rand() * 0.7,
            phase: rand() * TAU,
          });
        }
      }
    }

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);

      const phone = W < 768;
      // Planet: a huge sphere rising from the lower right, its top limb about a third of the way down
      P.R = phone ? Math.max(W * 1.25, H * 0.75) : Math.max(W * 0.62, H * 1.05);
      P.cx = phone ? W * 0.72 : W * 0.87;
      const top = phone ? H * 0.66 : H * 0.4;
      P.cy = top + P.R;
      P.sx = P.cx + P.R * Math.sin(P.flareAngle);
      P.sy = P.cy - P.R * Math.cos(P.flareAngle);

      // Stars
      const rand = rng(7);
      const count = Math.min(1100, Math.round((W * H) / (phone ? 2600 : 1700)));
      const tints = ['255,255,255', '255,255,255', '255,255,255', '200,215,255', '190,170,255', '255,235,215'];
      stars = Array.from({length: count}, () => {
        const layer = rand() < 0.62 ? 0 : rand() < 0.75 ? 1 : 2;
        return {
          x: rand() * W,
          y: rand() * H,
          r: layer === 0 ? 0.4 + rand() * 0.5 : layer === 1 ? 0.7 + rand() * 0.7 : 1.1 + rand() * 1.1,
          base: layer === 0 ? 0.25 + rand() * 0.4 : 0.45 + rand() * 0.5,
          phase: rand() * TAU,
          speed: 0.6 + rand() * 2.2,
          layer,
          tint: tints[Math.floor(rand() * tints.length)],
        };
      });

      // Soft glow sprite for bright stars
      glow = makeCanvas(64, 64);
      {
        const g = glow.getContext('2d')!;
        const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.15, 'rgba(210,220,255,0.55)');
        grad.addColorStop(0.45, 'rgba(150,140,255,0.12)');
        grad.addColorStop(1, 'rgba(120,100,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
      }

      // Nebula at half resolution (the upscale softens it like real gas)
      nebula = makeCanvas(W / 2, H / 2);
      {
        const n = nebula.getContext('2d')!;
        n.scale(0.5, 0.5);
        const nr = rng(23);
        const colors = ['88,80,236', '139,92,246', '59,130,246', '167,139,250', '37,99,235', '99,102,241'];
        const ax = phone ? W * 0.2 : W * 0.48;
        const ay = -H * 0.08;
        const bx = phone ? W * 1.05 : W * 0.98;
        const by = phone ? H * 0.5 : H * 0.62;
        for (let i = 0; i < 170; i++) {
          const t = nr();
          const bend = Math.sin(t * Math.PI) * W * 0.08;
          const x = ax + (bx - ax) * t + (nr() - 0.5) * W * 0.09 - bend;
          const y = ay + (by - ay) * t + (nr() - 0.5) * H * 0.1;
          const r = (25 + nr() * 115) * (phone ? 0.7 : 1);
          const grad = n.createRadialGradient(x, y, 0, x, y, r);
          const col = colors[Math.floor(nr() * colors.length)];
          const a = 0.03 + nr() * 0.09;
          grad.addColorStop(0, `rgba(${col},${a})`);
          grad.addColorStop(1, `rgba(${col},0)`);
          n.fillStyle = grad;
          n.fillRect(x - r, y - r, r * 2, r * 2);
        }
        // Bright cores
        for (let i = 0; i < 14; i++) {
          const t = 0.25 + nr() * 0.55;
          const x = ax + (bx - ax) * t + (nr() - 0.5) * W * 0.06;
          const y = ay + (by - ay) * t + (nr() - 0.5) * H * 0.06;
          const r = 30 + nr() * 70;
          const grad = n.createRadialGradient(x, y, 0, x, y, r);
          grad.addColorStop(0, 'rgba(200,210,255,0.16)');
          grad.addColorStop(1, 'rgba(160,150,255,0)');
          n.fillStyle = grad;
          n.fillRect(x - r, y - r, r * 2, r * 2);
        }
        // Dark dust lanes
        n.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 40; i++) {
          const t = nr();
          const x = ax + (bx - ax) * t + (nr() - 0.5) * W * 0.1;
          const y = ay + (by - ay) * t + (nr() - 0.5) * H * 0.1;
          const r = 20 + nr() * 80;
          const grad = n.createRadialGradient(x, y, 0, x, y, r);
          grad.addColorStop(0, 'rgba(0,0,0,0.35)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          n.fillStyle = grad;
          n.fillRect(x - r, y - r, r * 2, r * 2);
        }
        n.globalCompositeOperation = 'source-over';
        // Dense star dust inside the band
        for (let i = 0; i < 700; i++) {
          const t = nr();
          const x = ax + (bx - ax) * t + (nr() - 0.5) * W * 0.14;
          const y = ay + (by - ay) * t + (nr() - 0.5) * H * 0.14;
          n.fillStyle = `rgba(230,230,255,${0.15 + nr() * 0.5})`;
          n.fillRect(x, y, 1.4, 1.4);
        }
      }

      // Planet body, atmosphere halo and lit limb
      planet = makeCanvas(W * dpr, H * dpr);
      {
        const p = planet.getContext('2d')!;
        p.scale(dpr, dpr);
        const {cx, cy, R, sx, sy} = P;
        let g = p.createRadialGradient(cx, cy, R * 0.99, cx, cy, R * 1.065);
        g.addColorStop(0, 'rgba(120,140,255,0.45)');
        g.addColorStop(0.2, 'rgba(95,105,255,0.16)');
        g.addColorStop(0.55, 'rgba(80,60,210,0.05)');
        g.addColorStop(1, 'rgba(40,30,120,0)');
        p.fillStyle = g;
        p.beginPath();
        p.arc(cx, cy, R * 1.065, 0, TAU);
        p.fill();

        g = p.createRadialGradient(cx, cy + R * 0.25, R * 0.2, cx, cy, R);
        g.addColorStop(0, '#010106');
        g.addColorStop(0.84, '#050817');
        g.addColorStop(0.965, '#111a4d');
        g.addColorStop(1, '#3443b8');
        p.fillStyle = g;
        p.beginPath();
        p.arc(cx, cy, R, 0, TAU);
        p.fill();

        p.save();
        p.beginPath();
        p.arc(cx, cy, R, 0, TAU);
        p.clip();
        // Faint continents and cloud texture
        const pr = rng(51);
        for (let i = 0; i < 260; i++) {
          const a = (pr() - 0.5) * 2.4;
          const d = R * (0.86 + pr() * 0.14);
          const x = cx + Math.sin(a) * d;
          const y = cy - Math.cos(a) * d;
          const rx = 20 + pr() * 120;
          p.fillStyle = pr() < 0.5 ? `rgba(70,90,200,${0.02 + pr() * 0.04})` : `rgba(0,0,0,${0.05 + pr() * 0.08})`;
          p.beginPath();
          p.ellipse(x, y, rx, rx * (0.25 + pr() * 0.4), a, 0, TAU);
          p.fill();
        }
        // Dawn spilling over the day side near the sun
        g = p.createRadialGradient(sx, sy, 0, sx, sy, R * 0.6);
        g.addColorStop(0, 'rgba(140,170,255,0.34)');
        g.addColorStop(0.25, 'rgba(80,100,230,0.12)');
        g.addColorStop(1, 'rgba(40,40,160,0)');
        p.fillStyle = g;
        p.fillRect(cx - R, cy - R, R * 2, R * 2);
        p.restore();

        g = p.createRadialGradient(sx, sy, 0, sx, sy, R * 1.3);
        g.addColorStop(0, 'rgba(235,240,255,0.95)');
        g.addColorStop(0.18, 'rgba(150,170,255,0.6)');
        g.addColorStop(0.6, 'rgba(100,100,240,0.25)');
        g.addColorStop(1, 'rgba(80,70,220,0.08)');
        p.strokeStyle = g;
        p.lineWidth = 1.6;
        p.beginPath();
        p.arc(cx, cy, R, 0, TAU);
        p.stroke();
      }

      // Mountains (slightly wider than the screen so parallax never shows an edge)
      const hillsW = W + 80;
      const makeHills = (base: number, amp: number, rough: number, seed: number, top: string, bottom: string, rim: string) => {
        const c = makeCanvas(hillsW * dpr, H * dpr);
        const m = c.getContext('2d')!;
        m.scale(dpr, dpr);
        const pts = ridge(Math.ceil(hillsW / 6) + 1, rough, rng(seed));
        m.beginPath();
        m.moveTo(0, H);
        pts.forEach((v, i) => m.lineTo(i * 6, H * base - v * H * amp));
        m.lineTo(hillsW, H);
        m.closePath();
        const g = m.createLinearGradient(0, H * (base - amp), 0, H);
        g.addColorStop(0, top);
        g.addColorStop(1, bottom);
        m.fillStyle = g;
        m.fill();
        m.beginPath();
        pts.forEach((v, i) => (i ? m.lineTo(i * 6, H * base - v * H * amp) : m.moveTo(0, H * base - v * H * amp)));
        m.strokeStyle = rim;
        m.lineWidth = 1;
        m.stroke();
        return c;
      };
      farHills = makeHills(0.9, phone ? 0.07 : 0.11, 0.58, 13, 'rgba(36,36,92,0.85)', '#07071a', 'rgba(150,140,255,0.3)');
      nearHills = makeHills(0.975, phone ? 0.05 : 0.08, 0.52, 29, '#06061a', '#020208', 'rgba(120,110,250,0.32)');
    };

    const spawnShooter = () => {
      const fromRight = Math.random() < 0.7;
      const angle = Math.PI * (fromRight ? 0.8 + Math.random() * 0.08 : 0.12 + Math.random() * 0.08);
      const speed = 0.9 + Math.random() * 0.6; // px per ms
      shooters.push({
        x: W * (fromRight ? 0.55 + Math.random() * 0.5 : Math.random() * 0.4),
        y: H * Math.random() * 0.35,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        max: 700 + Math.random() * 700,
        len: 120 + Math.random() * 160,
      });
    };

    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!reduceMotion) {
        clock += dt;
        spin += dt * 0.000018;
      }
      const t = clock;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#04030d');
      sky.addColorStop(0.55, '#06061a');
      sky.addColorStop(1, '#030209');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Stars, three depths: slow drift, mouse parallax and twinkle
      const drawStars = (layer: number) => {
        const par = [5, 12, 22][layer];
        const drift = [0.004, 0.009, 0.016][layer] * t;
        for (const s of stars) {
          if (s.layer !== layer) continue;
          let x = (s.x - drift) % W;
          if (x < 0) x += W;
          x += mouse.x * par;
          const y = s.y + mouse.y * par;
          const tw = 0.55 + 0.45 * Math.sin(t * 0.001 * s.speed + s.phase);
          const a = s.base * tw;
          if (layer === 2 && glow) {
            ctx.globalAlpha = a * 0.9;
            const size = s.r * 9;
            ctx.drawImage(glow, x - size / 2, y - size / 2, size, size);
            ctx.globalAlpha = 1;
          } else {
            ctx.fillStyle = `rgba(${s.tint},${a})`;
            ctx.fillRect(x, y, s.r * 1.6, s.r * 1.6);
          }
        }
      };
      drawStars(0);

      // Nebula: two copies turning slowly against each other so the gas seems to flow
      if (nebula) {
        const px = W * 0.72 + mouse.x * 14;
        const py = H * 0.22 + mouse.y * 14;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.9 + 0.1 * Math.sin(t * 0.00025);
        ctx.translate(px, py);
        ctx.rotate(Math.sin(t * 0.00004) * 0.035);
        ctx.scale(1 + 0.02 * Math.sin(t * 0.00009), 1 + 0.02 * Math.sin(t * 0.00009));
        ctx.drawImage(nebula, -W * 0.72, -H * 0.22, W, H);
        ctx.globalAlpha = 0.22 + 0.08 * Math.sin(t * 0.0002 + 1.7);
        ctx.rotate(-Math.sin(t * 0.00004) * 0.07);
        ctx.scale(1.07, 1.07);
        ctx.drawImage(nebula, -W * 0.72, -H * 0.22, W, H);
        ctx.restore();
      }
      drawStars(1);

      // Moon on a slow, gentle orbit
      {
        const phone = W < 768;
        const r = Math.min(W, H) * (phone ? 0.045 : 0.034);
        const mx = W * (phone ? 0.82 : 0.82) + Math.sin(t * 0.00005) * W * 0.012 + mouse.x * 18;
        const my = H * (phone ? 0.14 : 0.23) + Math.cos(t * 0.00005) * H * 0.012 + mouse.y * 18;
        const halo = ctx.createRadialGradient(mx, my, r * 0.9, mx, my, r * 2.4);
        halo.addColorStop(0, 'rgba(130,140,255,0.16)');
        halo.addColorStop(1, 'rgba(130,140,255,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(mx, my, r * 2.4, 0, TAU);
        ctx.fill();
        const body = ctx.createRadialGradient(mx - r * 0.55, my + r * 0.35, r * 0.05, mx, my, r * 1.05);
        body.addColorStop(0, '#b4c0ff');
        body.addColorStop(0.3, '#4c54a8');
        body.addColorStop(0.7, '#12132e');
        body.addColorStop(1, '#06060f');
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, TAU);
        ctx.fill();
      }

      // Shooting stars
      if (!reduceMotion) {
        nextShooter -= dt;
        if (nextShooter <= 0) {
          spawnShooter();
          nextShooter = 2600 + Math.random() * 5200;
        }
      }
      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        s.life += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.life >= s.max) {
          shooters.splice(i, 1);
          continue;
        }
        const fade = Math.sin((s.life / s.max) * Math.PI);
        const sp = Math.hypot(s.vx, s.vy);
        const tx = s.x - (s.vx / sp) * s.len;
        const ty = s.y - (s.vy / sp) * s.len;
        const g = ctx.createLinearGradient(s.x, s.y, tx, ty);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
        g.addColorStop(0.2, `rgba(180,190,255,${0.45 * fade})`);
        g.addColorStop(1, 'rgba(140,120,255,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        if (glow) {
          ctx.globalAlpha = fade;
          ctx.drawImage(glow, s.x - 7, s.y - 7, 14, 14);
          ctx.globalAlpha = 1;
        }
      }
      drawStars(2);

      // Planet
      const ox = mouse.x * 8;
      const oy = mouse.y * 8;
      if (planet) ctx.drawImage(planet, ox, oy, W, H);
      const {R} = P;
      const cx = P.cx + ox;
      const cy = P.cy + oy;
      const sx = P.sx + ox;
      const sy = P.sy + oy;

      // City lights on the night side, turning with the planet
      for (const c of cities) {
        const lon = c.lon + spin;
        const cosLat = Math.cos(c.lat);
        const z = cosLat * Math.cos(lon);
        if (z <= 0.02) continue;
        const x = cx + R * cosLat * Math.sin(lon);
        const y = cy - R * Math.sin(c.lat);
        if (x < -2 || x > W + 2 || y < -2 || y > H + 2) continue;
        // Fade toward the limb and where dawn is breaking near the sun
        const dawn = Math.min(1, Math.hypot(x - sx, y - sy) / (R * 0.32));
        const a = c.b * Math.min(1, z * 2.6) * dawn * (0.7 + 0.3 * Math.sin(t * 0.0025 + c.phase));
        if (a < 0.03) continue;
        ctx.fillStyle = `rgba(255,${190 + Math.round(c.b * 40)},${130 + Math.round(c.b * 60)},${a})`;
        ctx.fillRect(x, y, 1.3, 1.3);
      }

      // Aurora rippling along the limb
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const segs = 150;
      const a0 = -1.15;
      const a1 = 1.15;
      ctx.lineWidth = ((a1 - a0) * R) / segs + 1.2;
      for (let i = 0; i < segs; i++) {
        const ang = a0 + ((a1 - a0) * i) / segs;
        if (Math.abs(ang - P.flareAngle) < 0.1) continue;
        const n = Math.sin(ang * 9 + t * 0.00045) * 0.5 + Math.sin(ang * 23 - t * 0.0008) * 0.3 + Math.sin(ang * 4 + t * 0.00022) * 0.45;
        if (n <= -0.15) continue;
        const ux = Math.sin(ang);
        const uy = -Math.cos(ang);
        const bx = cx + ux * R * 1.002;
        const by = cy + uy * R * 1.002;
        if (bx < -20 || bx > W + 20 || by > H + 20) continue;
        const h = R * (0.012 + 0.035 * (n + 0.15));
        const nearSun = Math.min(1, Math.abs(ang - P.flareAngle) / 0.35);
        const alpha = 0.16 * (n + 0.15) * nearSun;
        const g = ctx.createLinearGradient(bx, by, bx + ux * h, by + uy * h);
        g.addColorStop(0, `rgba(110,210,255,${alpha})`);
        g.addColorStop(0.5, `rgba(130,120,255,${alpha * 0.55})`);
        g.addColorStop(1, 'rgba(170,110,255,0)');
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + ux * h, by + uy * h);
        ctx.stroke();
      }

      // Sunrise flare at the limb: core, horizontal streak and a faint beam, all breathing
      const pulse = 0.88 + 0.12 * Math.sin(t * 0.0006) + 0.04 * Math.sin(t * 0.0021);
      let g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 0.3 * pulse);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.06, 'rgba(215,225,255,0.65)');
      g.addColorStop(0.28, 'rgba(120,130,255,0.2)');
      g.addColorStop(1, 'rgba(70,40,210,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, R * 0.3 * pulse, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(P.flareAngle);
      ctx.scale(1, 0.03);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.5);
      g.addColorStop(0, `rgba(200,215,255,${0.6 * pulse})`);
      g.addColorStop(0.35, `rgba(140,150,255,${0.18 * pulse})`);
      g.addColorStop(1, 'rgba(100,90,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, W * 0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(P.flareAngle);
      ctx.scale(0.05, 1);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, H * 0.55);
      g.addColorStop(0, `rgba(170,180,255,${0.1 * pulse})`);
      g.addColorStop(1, 'rgba(120,100,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, H * 0.55, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.restore();

      // Mountains with drifting mist between the ridges
      if (farHills) ctx.drawImage(farHills, -40 + mouse.x * 10, mouse.y * 4, W + 80, H);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const span = W + 900;
        const x = ((t * (0.012 + i * 0.006) + i * 520) % span) - 450;
        const y = H * (0.86 + i * 0.03);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, 0.22);
        const mg = ctx.createRadialGradient(0, 0, 0, 0, 0, 420);
        mg.addColorStop(0, 'rgba(120,110,230,0.07)');
        mg.addColorStop(1, 'rgba(120,110,230,0)');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(0, 0, 420, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      if (nearHills) ctx.drawImage(nearHills, -40 + mouse.x * 18, mouse.y * 6, W + 80, H);

      // Vignette
      const v = ctx.createRadialGradient(W * 0.55, H * 0.45, Math.min(W, H) * 0.35, W * 0.5, H * 0.5, Math.max(W, H) * 0.85);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);

      if (!reduceMotion && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    build();
    start();

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        build();
        start();
      }, 120);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onVisibility = () => {
      if (!document.hidden && onScreen) start();
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
    });
    io.observe(canvas);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, {passive: true});
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      io.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas aria-hidden className={className} ref={canvasRef} />;
});

SpaceBackground.displayName = 'SpaceBackground';
export default SpaceBackground;
