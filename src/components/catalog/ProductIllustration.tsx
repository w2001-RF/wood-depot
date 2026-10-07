import { useState } from 'react';
import type { Product } from '../../types';
import { TONES } from '../3d/materials/textures';

/**
 * Drawn product image used until real photos exist (product.image). Proportions
 * follow the product's real section so cards are honest about what you get.
 */
export function ProductIllustration({ product, className = '' }: { product: Product; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (product.image && !broken)
    return <img src={product.image} alt="" loading="lazy" onError={() => setBroken(true)} className={`h-full w-full object-cover ${className}`} />;
  const tone = TONES[product.woodTone];
  const id = `g-${product.id}`;
  return (
    <svg viewBox="0 0 240 160" className={`h-full w-full ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe6d4" />
          <stop offset="1" stopColor="#e2d4b9" />
        </linearGradient>
        <pattern id={`${id}-grain`} width="60" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 3 Q15 1 30 3 T60 3" fill="none" stroke={tone.dark} strokeOpacity="0.28" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="240" height="160" fill={`url(#${id}-bg)`} />
      <ellipse cx="120" cy="134" rx="96" ry="10" fill="#3a2618" opacity="0.12" />
      {product.shape === 'board' && <Boards product={product} id={id} />}
      {product.shape === 'round' && <Poles product={product} />}
      {product.shape === 'bag' && <Bags product={product} />}
      {product.shape === 'bulk' && <Pile />}
    </svg>
  );
}

function Boards({ product, id }: { product: Product; id: string }) {
  const tone = TONES[product.woodTone];
  const w = product.dimensions.widthCm ?? 10;
  const t = product.dimensions.thicknessCm ?? 5;
  const k = Math.min(3.2, 40 / Math.max(w, t * 2));
  const bw = w * k;
  const bt = Math.max(t * k, 4);
  const len = 120 + (product.dimensions.lengthM ?? 4) * 10;
  const rows = Math.max(2, Math.min(5, Math.round(60 / bt)));
  const cols = Math.max(1, Math.min(4, Math.round(70 / bw)));
  const items = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = 32 + c * bw * 0.9 + r * 0;
      const y = 120 - (r + 1) * bt - c * bw * 0.35;
      items.push(
        <g key={`${r}-${c}`}>
          <polygon points={`${x},${y} ${x + len * 0.72},${y - len * 0.18} ${x + len * 0.72},${y - len * 0.18 + bt} ${x},${y + bt}`} fill={tone.base} stroke={tone.dark} strokeOpacity="0.5" strokeWidth="0.6" />
          <polygon points={`${x},${y} ${x + len * 0.72},${y - len * 0.18} ${x + len * 0.72},${y - len * 0.18 + bt} ${x},${y + bt}`} fill={`url(#${id}-grain)`} />
          <rect x={x - bw * 0.6} y={y} width={bw * 0.6} height={bt} fill={tone.light} stroke={tone.dark} strokeOpacity="0.6" strokeWidth="0.6" transform={`skewY(-28) translate(0 ${(x - bw * 0.6) * 0.53})`} />
        </g>,
      );
    }
  return <g>{items}</g>;
}

function Poles({ product }: { product: Product }) {
  const tone = TONES[product.woodTone];
  const d = Math.max(10, Math.min(22, (product.dimensions.diameterCm ?? 10) * 1.6));
  const out = [];
  let i = 0;
  for (let row = 0; row < 3; row++)
    for (let c = 0; c < 4 - row; c++) {
      const cx = 52 + c * d + row * (d / 2);
      const cy = 118 - row * d * 0.85;
      out.push(
        <g key={i++}>
          <line x1={cx} y1={cy} x2={cx + 130} y2={cy - 36} stroke={tone.base} strokeWidth={d} strokeLinecap="butt" />
          <line x1={cx} y1={cy - d * 0.25} x2={cx + 130} y2={cy - 36 - d * 0.25} stroke={tone.light} strokeOpacity="0.5" strokeWidth={d * 0.2} />
          <circle cx={cx} cy={cy} r={d / 2} fill={tone.light} stroke={tone.dark} strokeWidth="0.8" />
          <circle cx={cx} cy={cy} r={d / 4} fill="none" stroke={tone.ring} strokeOpacity="0.6" strokeWidth="0.8" />
        </g>,
      );
    }
  return <g>{out}</g>;
}

function Bags({ product }: { product: Product }) {
  const big = (product.dimensions.weightKg ?? 0) > 6;
  const bw = big ? 70 : 52;
  const bh = big ? 30 : 22;
  return (
    <g>
      <rect x="40" y="118" width="160" height="10" fill="#c8b48e" />
      {[0, 1, 2].map((r) =>
        [0, 1].map((c) => (
          <g key={`${r}${c}`} transform={`translate(${62 + c * (bw + 6) + (r % 2) * 6} ${118 - (r + 1) * (bh + 2)})`}>
            <rect width={bw} height={bh} rx="7" fill="#ece4d2" stroke="#a69676" strokeWidth="0.8" />
            <rect x={bw * 0.1} y={bh * 0.32} width={bw * 0.8} height={bh * 0.36} fill="#1f3a2e" />
          </g>
        )),
      )}
      <text x="200" y="40" textAnchor="end" fontFamily="Big Shoulders Display, sans-serif" fontWeight="900" fontSize="22" fill="#1f3a2e">
        {product.dimensions.weightKg} KG
      </text>
    </g>
  );
}

function Pile() {
  return (
    <g>
      <path d="M40 128 Q80 70 120 62 Q165 68 200 128 Z" fill="#26211e" />
      {Array.from({ length: 26 }, (_, i) => (
        <circle key={i} cx={56 + ((i * 37) % 130)} cy={122 - ((i * 13) % 40) * (1 - Math.abs(((i * 37) % 130) - 65) / 90)} r={2 + (i % 4)} fill={i % 3 ? '#3b3430' : '#1a1715'} />
      ))}
    </g>
  );
}
