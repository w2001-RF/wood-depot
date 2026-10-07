import * as THREE from 'three';
import type { WoodTone } from '../../../types';

/**
 * Procedural canvas textures — no downloads, so the depot works offline and in
 * sandboxed frames. Each generator is deterministic (seeded).
 */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return { c, ctx };
}

function finish(c: HTMLCanvasElement, repeat = true, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

export const TONES: Record<WoodTone, { base: string; dark: string; light: string; ring: string }> = {
  pine: { base: '#c99d66', dark: '#8d6036', light: '#e0b985', ring: '#a6763f' },
  fir: { base: '#cdb48a', dark: '#93784f', light: '#e3d0a8', ring: '#b0915f' },
  eucalyptus: { base: '#ad7a52', dark: '#6c4126', light: '#c79466', ring: '#8a5733' },
  charcoal: { base: '#2a2522', dark: '#141110', light: '#3d3632', ring: '#1d1916' },
};

function grainNoise(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, rand: () => number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Sawn-face wood. Grain runs along U (horizontal) by default; `vertical` flips
 * it for cylinder sides whose length runs along V.
 */
export function woodSideTexture(tone: WoodTone, size: number, seed: number, vertical = false) {
  const { c, ctx } = canvas(size);
  const col = TONES[tone];
  const r = rng(seed);
  ctx.fillStyle = col.base;
  ctx.fillRect(0, 0, size, size);
  if (vertical) {
    ctx.translate(size, 0);
    ctx.rotate(Math.PI / 2);
  }
  // broad tonal bands (early/late wood)
  for (let i = 0; i < 9; i++) {
    const y = r() * size;
    const g = ctx.createLinearGradient(0, y - 30, 0, y + 30);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, r() > 0.5 ? `${col.light}55` : `${col.dark}33`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 30, size, 60);
  }
  // fine grain lines with gentle waviness
  const lines = Math.round(size / 3.2);
  for (let i = 0; i < lines; i++) {
    const y0 = (i / lines) * size + r() * 3;
    const amp = 1 + r() * 4;
    const freq = 0.004 + r() * 0.01;
    const ph = r() * 10;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 8) {
      const y = y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1 + ph * 2) * amp * 0.25;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const dark = r() < 0.7;
    ctx.strokeStyle = dark ? `rgba(70,40,15,${0.06 + r() * 0.16})` : `rgba(255,235,200,${0.05 + r() * 0.1})`;
    ctx.lineWidth = 0.6 + r() * 1.6;
    ctx.stroke();
  }
  // knots — the detail that makes timber read as real
  const knots = 1 + Math.floor(r() * 3);
  for (let k = 0; k < knots; k++) {
    const kx = r() * size;
    const ky = r() * size;
    const kr = 4 + r() * 9;
    for (let ring = 5; ring >= 0; ring--) {
      ctx.beginPath();
      ctx.ellipse(kx, ky, kr * (1 + ring * 0.9) * 1.8, kr * (1 + ring * 0.55), 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(80,45,18,${0.05 + (5 - ring) * 0.03})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(kx, ky, kr * 1.4, kr, 0, 0, Math.PI * 2);
    ctx.fillStyle = col.dark;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  grainNoise(ctx, size, size, 14, r);
  return finish(c);
}

/** End grain: growth rings around an off-centre pith, with a drying check. */
export function endGrainTexture(tone: WoodTone, size: number, seed: number) {
  const { c, ctx } = canvas(size);
  const col = TONES[tone];
  const r = rng(seed);
  ctx.fillStyle = col.light;
  ctx.fillRect(0, 0, size, size);
  const cx = size * (0.2 + r() * 0.6);
  const cy = size * (r() < 0.5 ? -0.3 : 1.3) * (0.6 + r() * 0.5);
  for (let i = 0; i < 70; i++) {
    const rad = i * size * 0.035 + r() * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(110,65,25,${0.12 + r() * 0.18})`;
    ctx.lineWidth = 1 + r() * 3;
    ctx.stroke();
  }
  // saw marks
  for (let y = 0; y < size; y += 3) {
    ctx.fillStyle = `rgba(0,0,0,${r() * 0.04})`;
    ctx.fillRect(0, y, size, 1);
  }
  ctx.beginPath();
  ctx.moveTo(cx, Math.max(0, Math.min(size, cy)));
  ctx.lineTo(cx + (r() - 0.5) * size * 0.4, size * 0.5);
  ctx.strokeStyle = 'rgba(40,20,5,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  grainNoise(ctx, size, size, 18, r);
  return finish(c, false);
}

/** Peeled pole: grain along V, with a few bark remnants. */
export function poleTexture(tone: WoodTone, size: number, seed: number) {
  const t = woodSideTexture(tone, size, seed, true);
  const ctx = (t.image as HTMLCanvasElement).getContext('2d')!;
  const r = rng(seed + 99);
  for (let i = 0; i < 14; i++) {
    const x = r() * size;
    const h = 20 + r() * size * 0.3;
    const y = r() * size;
    ctx.fillStyle = `rgba(70,45,28,${0.35 + r() * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + r() * 8, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  t.needsUpdate = true;
  return t;
}

/** Polished-trowel concrete with slab joints every tile. */
export function concreteTexture(size: number, seed = 7) {
  const { c, ctx } = canvas(size);
  const r = rng(seed);
  ctx.fillStyle = '#a49c90';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 140; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = 10 + r() * size * 0.12;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const v = r() < 0.5 ? '90,84,76' : '190,182,170';
    g.addColorStop(0, `rgba(${v},${0.08 + r() * 0.1})`);
    g.addColorStop(1, `rgba(${v},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // tyre / pallet scuffs
  for (let i = 0; i < 10; i++) {
    ctx.strokeStyle = `rgba(40,35,30,${0.04 + r() * 0.05})`;
    ctx.lineWidth = 6 + r() * 10;
    ctx.beginPath();
    const y = r() * size;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + (r() - 0.5) * 80, size * 0.6, y + (r() - 0.5) * 80, size, y + (r() - 0.5) * 40);
    ctx.stroke();
  }
  // sawdust patches
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(200,160,100,${0.05 + r() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(r() * size, r() * size, 4 + r() * 22, 3 + r() * 10, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(55,50,45,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  grainNoise(ctx, size, size, 22, r);
  return finish(c);
}

/** Compacted sandy earth for the yards and the open-air courtyard. */
export function groundTexture(size: number, seed = 11) {
  const { c, ctx } = canvas(size);
  const r = rng(seed);
  ctx.fillStyle = '#b89a72';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = 6 + r() * 40;
    ctx.fillStyle = r() < 0.5 ? `rgba(120,92,60,${0.05 + r() * 0.08})` : `rgba(220,198,160,${0.05 + r() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rad, rad * (0.4 + r() * 0.6), r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${r() < 0.5 ? '90,70,50' : '240,225,200'},${0.25 + r() * 0.3})`;
    ctx.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2);
  }
  grainNoise(ctx, size, size, 26, r);
  return finish(c);
}

/** Corrugated sheet (colour + matching bump). */
export function corrugatedTexture(size: number, color: string, ribs = 16) {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  const step = size / ribs;
  for (let i = 0; i < ribs; i++) {
    const g = ctx.createLinearGradient(i * step, 0, (i + 1) * step, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.18)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.02)');
    g.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(i * step, 0, step, size);
  }
  const r = rng(3);
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(110,80,50,${r() * 0.06})`;
    ctx.fillRect(r() * size, r() * size * 0.3 + size * 0.7, 2 + r() * 6, 20 + r() * 80);
  }
  return finish(c);
}

/** Rendered concrete block lower wall. */
export function blockWallTexture(size: number) {
  const { c, ctx } = canvas(size);
  const r = rng(5);
  ctx.fillStyle = '#d6cbb8';
  ctx.fillRect(0, 0, size, size);
  const rows = 6;
  const bh = size / rows;
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? size / 6 : 0;
    for (let x = -off; x < size; x += size / 3) {
      ctx.fillStyle = `rgba(${150 + r() * 40},${140 + r() * 30},${120 + r() * 30},0.25)`;
      ctx.fillRect(x + 2, row * bh + 2, size / 3 - 4, bh - 4);
    }
    ctx.fillStyle = 'rgba(90,80,65,0.35)';
    ctx.fillRect(0, row * bh, size, 2);
  }
  grainNoise(ctx, size, size, 16, r);
  return finish(c);
}

/** Woven polypropylene charcoal sack with a printed label. */
export function sackTexture(size: number, kg: string) {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = '#ece4d2';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size; i += 3) {
    ctx.fillStyle = 'rgba(150,135,110,0.18)';
    ctx.fillRect(i, 0, 1, size);
    ctx.fillRect(0, i, size, 1);
  }
  ctx.fillStyle = '#1f3a2e';
  ctx.fillRect(size * 0.08, size * 0.3, size * 0.84, size * 0.4);
  ctx.fillStyle = '#f2eadb';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${size * 0.1}px "Big Shoulders Display", Impact, sans-serif`;
  ctx.fillText('CHARBON DE BOIS', size / 2, size * 0.43);
  ctx.font = `700 ${size * 0.12}px "Noto Kufi Arabic", Tahoma, sans-serif`;
  ctx.fillText(`فحم · ${kg}`, size / 2, size * 0.58);
  return finish(c, false);
}

/**
 * Painted timber sign board: French headline, Arabic sub-line, zone code tile.
 * Text is drawn on canvas so Arabic shapes and RTL work without font files.
 */
export function signTexture(fr: string, ar: string, code: string, accent: string) {
  const W = 1024;
  const Hh = 300;
  const { c, ctx } = canvas(W, Hh);
  ctx.fillStyle = '#231710';
  ctx.fillRect(0, 0, W, Hh);
  const r = rng(fr.length * 31);
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(255,220,170,${0.02 + r() * 0.04})`;
    ctx.beginPath();
    const y = r() * Hh;
    ctx.moveTo(0, y);
    ctx.lineTo(W, y + (r() - 0.5) * 6);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(236,223,200,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, W - 28, Hh - 28);
  ctx.fillStyle = accent;
  ctx.fillRect(40, 48, 150, Hh - 96);
  ctx.fillStyle = '#f6f1e7';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 120px "Big Shoulders Display", Impact, sans-serif`;
  ctx.fillText(code, 115, Hh / 2 + 6);
  ctx.textAlign = 'left';
  ctx.font = `800 ${fr.length > 16 ? 86 : 104}px "Big Shoulders Display", "Arial Narrow", Impact, sans-serif`;
  ctx.fillText(fr.toUpperCase(), 230, 116, W - 270);
  ctx.fillStyle = '#d9c3a0';
  ctx.font = `700 58px "Noto Kufi Arabic", Tahoma, sans-serif`;
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillText(ar, W - 46, 214);
  return finish(c, false);
}

/** Printed fabric banner (seasonal). */
export function bannerTexture(line1: string, line2: string) {
  const { c, ctx } = canvas(1024, 384);
  const g = ctx.createLinearGradient(0, 0, 0, 384);
  g.addColorStop(0, '#1f3a2e');
  g.addColorStop(1, '#173026');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 384);
  ctx.strokeStyle = '#d9c3a0';
  ctx.lineWidth = 6;
  ctx.setLineDash([22, 14]);
  ctx.strokeRect(24, 24, 976, 336);
  ctx.setLineDash([]);
  ctx.fillStyle = '#f6f1e7';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${line1.length > 26 ? 66 : 84}px "Big Shoulders Display", Impact, sans-serif`;
  ctx.fillText(line1.toUpperCase(), 512, 150, 940);
  ctx.fillStyle = '#e9c98f';
  ctx.font = `700 64px "Noto Kufi Arabic", Tahoma, sans-serif`;
  ctx.direction = 'rtl';
  ctx.fillText(line2, 512, 262, 940);
  return finish(c, false);
}

/** Painted floor marking (zone code + name) — reads at walking height. */
export function floorLabelTexture(code: string, text: string) {
  const { c, ctx } = canvas(1024, 256);
  ctx.clearRect(0, 0, 1024, 256);
  ctx.fillStyle = 'rgba(246,241,231,0.78)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `900 150px "Big Shoulders Display", Impact, sans-serif`;
  ctx.fillText(code, 20, 136);
  ctx.font = `800 96px "Big Shoulders Display", Impact, sans-serif`;
  ctx.fillText(text.toUpperCase(), 160, 140, 850);
  const t = finish(c, false);
  return t;
}

/** Soft vertical gradient used for light shafts and the guidance beacon. */
export function shaftTexture() {
  const { c, ctx } = canvas(64, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,240,205,0.9)');
  g.addColorStop(0.6, 'rgba(255,230,190,0.35)');
  g.addColorStop(1, 'rgba(255,230,190,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  const h = ctx.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, 'rgba(0,0,0,1)');
  h.addColorStop(0.5, 'rgba(0,0,0,0)');
  h.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = h;
  ctx.fillRect(0, 0, 64, 256);
  return finish(c, false);
}
