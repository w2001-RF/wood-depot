/**
 * Indicative material estimates. Simple, transparent rules of thumb — NOT an
 * engineering calculation. Every result is shown with a disclaimer.
 */
export type GreenhouseUsage = 'vegetables' | 'nursery' | 'berries';

export type ConfigInput =
  | { type: 'greenhouse'; lengthM: number; widthM: number; heightM: number; usage: GreenhouseUsage }
  | { type: 'formwork'; areaM2: number; element: 'slab' | 'wall' }
  | { type: 'construction'; lengthM: number; widthM: number; roof: 'flat' | 'pitched' }
  | { type: 'agriculture'; rowLengthM: number; rows: number; spacingM: number; system: 'trellis' | 'fence' };

export interface EstimateLine {
  productId: string;
  quantity: number;
}

const up = (n: number) => Math.max(0, Math.ceil(n - 1e-9));

export function estimate(input: ConfigInput): EstimateLine[] {
  const lines: EstimateLine[] = [];
  const push = (productId: string, quantity: number) => {
    const q = up(quantity);
    if (q > 0) lines.push({ productId, quantity: q });
  };

  switch (input.type) {
    case 'greenhouse': {
      const spacing = input.usage === 'nursery' ? 2.5 : 2;
      const bays = up(input.lengthM / spacing);
      const frames = bays + 1;
      const centralRow = input.widthM > 6 ? frames : 0;
      push('poteau-serre', frames * 2 + centralRow); // side posts (+ central row for wide spans)
      push('support-serre', frames); // ridge supports
      push('piece-structure-serre', frames * 2); // roof slopes
      push('traverse-serre', up(input.lengthM / 5) * (3 + (input.widthM > 6 ? 2 : 0))); // eaves + ridge (+ purlins)
      push('renfort-serre', 8 + bays * 2); // corner + bay bracing
      break;
    }
    case 'formwork': {
      const faces = input.element === 'wall' ? 2 : 1;
      const boardArea = 4 * 0.25; // one formwork board
      push('bois-coffrage', ((input.areaM2 * faces) / boardArea) * 1.1); // +10 % cuts
      push('chevron', (input.areaM2 * faces) / 1.5); // stiffeners
      push('madrier', input.element === 'slab' ? input.areaM2 / 1 : (input.areaM2 * faces) / 3);
      break;
    }
    case 'construction': {
      const { lengthM: L, widthM: W } = input;
      push('poutre', up(L / 3.5) + 1);
      const rafterRun = input.roof === 'pitched' ? (W / 2 / Math.cos((25 * Math.PI) / 180)) * 2 : W;
      push('chevron', (up(L / 0.6) + 1) * up(rafterRun / 4));
      push('bois-charpente', up(L / 6) * (input.roof === 'pitched' ? 3 : 2)); // wall plates + ridge
      push('planche', (L * rafterRun) / (4 * 0.2) / 3); // battens / purlin boards estimate
      break;
    }
    case 'agriculture': {
      const perRow = up(input.rowLengthM / input.spacingM) + 1;
      const posts = perRow * input.rows;
      push('poteau-agricole', posts);
      if (input.system === 'trellis') {
        push('traverse-agricole', posts); // T crossbar on each post
        push('support-agricole', input.rows * 2); // end anchors
      } else {
        push('traverse-agricole', input.rows * up(input.rowLengthM / 3) * 2); // two rails
      }
      break;
    }
  }
  return lines;
}

export const LIMITS = {
  lengthM: [2, 100],
  widthM: [2, 30],
  heightM: [2, 6],
  areaM2: [1, 1000],
  rowLengthM: [5, 500],
  rows: [1, 200],
  spacingM: [1.5, 8],
} as const;
