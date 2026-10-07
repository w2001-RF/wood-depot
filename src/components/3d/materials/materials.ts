import * as THREE from 'three';
import type { QualityLevel, WoodTone } from '../../../types';
import {
  blockWallTexture,
  concreteTexture,
  corrugatedTexture,
  endGrainTexture,
  groundTexture,
  poleTexture,
  sackTexture,
  shaftTexture,
  woodSideTexture,
} from './textures';

/** Shared materials. Generated once per session; every stack reuses them (no per-mesh shader cost). */
export interface DepotMaterials {
  woodSide: Record<WoodTone, THREE.MeshStandardMaterial[]>;
  woodEnd: Record<WoodTone, THREE.MeshStandardMaterial>;
  pole: Record<WoodTone, THREE.MeshStandardMaterial>;
  concrete: THREE.MeshStandardMaterial;
  ground: THREE.MeshStandardMaterial;
  courtyard: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  wallMetal: THREE.MeshStandardMaterial;
  wallBlock: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  paintGreen: THREE.MeshStandardMaterial;
  paintOchre: THREE.MeshStandardMaterial;
  paintWhite: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  skylight: THREE.MeshStandardMaterial;
  film: THREE.MeshStandardMaterial;
  sack5: THREE.MeshStandardMaterial;
  sack15: THREE.MeshStandardMaterial;
  charcoal: THREE.MeshStandardMaterial;
  plant: THREE.MeshStandardMaterial;
  soil: THREE.MeshStandardMaterial;
  palletWood: THREE.MeshStandardMaterial;
  sticker: THREE.MeshStandardMaterial;
  shaft: THREE.MeshBasicMaterial;
  paintLine: THREE.MeshStandardMaterial;
}

let cache: { quality: QualityLevel; mats: DepotMaterials } | null = null;

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);

export function textureSize(q: QualityLevel) {
  return q === 'high' ? 512 : q === 'medium' ? 512 : 256;
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/**
 * Builds every texture/material in small steps, yielding to the browser between
 * steps so the loading screen can show honest progress.
 */
export async function prepareDepotAssets(quality: QualityLevel, onProgress: (p: number) => void): Promise<DepotMaterials> {
  if (cache) {
    onProgress(1);
    return cache.mats;
  }
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('800 64px "Big Shoulders Display"'),
        document.fonts.load('700 64px "Noto Kufi Arabic"'),
      ]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {
    /* fonts are optional for canvas text */
  }
  const S = textureSize(quality);
  const tones: WoodTone[] = ['pine', 'fir', 'eucalyptus', 'charcoal'];
  const steps: (() => void)[] = [];
  // filled step by step below; complete once every step has run
  const partial = { woodSide: {}, woodEnd: {}, pole: {} } as unknown as DepotMaterials;

  tones.forEach((tone, ti) => {
    steps.push(() => {
      // two face variants per tone so neighbouring boards don't repeat
      partial.woodSide[tone] = [0, 1].map((v) =>
        std({ map: woodSideTexture(tone, S, 100 + ti * 10 + v), roughness: tone === 'charcoal' ? 0.95 : 0.82, metalness: 0 }),
      );
    });
    steps.push(() => {
      partial.woodEnd[tone] = std({ map: endGrainTexture(tone, S / 2, 200 + ti), roughness: 0.9 });
      partial.pole[tone] = std({ map: poleTexture(tone, S, 300 + ti), roughness: 0.85 });
    });
  });

  steps.push(() => {
    const t = concreteTexture(S);
    t.repeat.set(1, 1);
    partial.concrete = std({ map: t, roughness: 0.78, metalness: 0.02 });
    const p = std({ color: '#efe6d4', roughness: 0.7 });
    partial.paintLine = p;
  });
  steps.push(() => {
    const g = groundTexture(S);
    partial.ground = std({ map: g, roughness: 1 });
    const g2 = groundTexture(S, 23);
    partial.courtyard = std({ map: g2, roughness: 1, color: '#d9c9ae' });
  });
  steps.push(() => {
    const roof = corrugatedTexture(256, '#a9aaa4', 12);
    partial.roof = std({ map: roof, bumpMap: roof, bumpScale: 2, roughness: 0.55, metalness: 0.55, side: THREE.DoubleSide });
    const wall = corrugatedTexture(256, '#d8cdb8', 14);
    partial.wallMetal = std({ map: wall, bumpMap: wall, bumpScale: 1.5, roughness: 0.6, metalness: 0.25, side: THREE.DoubleSide });
    partial.wallBlock = std({ map: blockWallTexture(256), roughness: 0.92 });
  });
  steps.push(() => {
    partial.steel = std({ color: '#2f3632', roughness: 0.55, metalness: 0.6 });
    partial.paintGreen = std({ color: '#1f3a2e', roughness: 0.5, metalness: 0.2 });
    partial.paintOchre = std({ color: '#c99a2e', roughness: 0.45, metalness: 0.15 });
    partial.paintWhite = std({ color: '#ece6da', roughness: 0.45, metalness: 0.1 });
    partial.rubber = std({ color: '#1a1a1a', roughness: 0.9 });
    partial.glass = std({ color: '#2a3b40', roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.75 });
    partial.skylight = std({ color: '#fff6e3', emissive: '#fff1d6', emissiveIntensity: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    partial.film = std({ color: '#f3f6f1', roughness: 0.25, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
    partial.charcoal = std({ color: '#1d1a18', roughness: 0.75, metalness: 0.25 });
    partial.plant = std({ color: '#4f7a3a', roughness: 0.8 });
    partial.soil = std({ color: '#5a4330', roughness: 1 });
    partial.sticker = std({ color: '#8a6a45', roughness: 0.95 });
    partial.palletWood = std({ map: woodSideTexture('fir', 256, 77), color: '#d8c7a5', roughness: 0.9 });
  });
  steps.push(() => {
    partial.sack5 = std({ map: sackTexture(256, '5 kg'), roughness: 0.85 });
    partial.sack15 = std({ map: sackTexture(256, '15 kg'), roughness: 0.85 });
    partial.shaft = new THREE.MeshBasicMaterial({
      map: shaftTexture(),
      transparent: true,
      opacity: quality === 'low' ? 0 : 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  });

  for (let i = 0; i < steps.length; i++) {
    steps[i]();
    onProgress((i + 1) / steps.length);
    await nextFrame();
  }
  const mats = partial;
  cache = { quality, mats };
  return mats;
}

export function getCachedMaterials(): DepotMaterials | null {
  return cache?.mats ?? null;
}

/** Synchronous variant for the light landing scene and the product viewer. */
export function getMaterialsSync(quality: QualityLevel = 'medium'): DepotMaterials {
  if (cache) return cache.mats;
  let result: DepotMaterials;
  const S = textureSize(quality);
  const tones: WoodTone[] = ['pine', 'fir', 'eucalyptus', 'charcoal'];
  const woodSide = {} as Record<WoodTone, THREE.MeshStandardMaterial[]>;
  const woodEnd = {} as Record<WoodTone, THREE.MeshStandardMaterial>;
  const pole = {} as Record<WoodTone, THREE.MeshStandardMaterial>;
  tones.forEach((tone, ti) => {
    woodSide[tone] = [0, 1].map((v) => std({ map: woodSideTexture(tone, S, 100 + ti * 10 + v), roughness: 0.82 }));
    woodEnd[tone] = std({ map: endGrainTexture(tone, S / 2, 200 + ti), roughness: 0.9 });
    pole[tone] = std({ map: poleTexture(tone, S, 300 + ti), roughness: 0.85 });
  });
  const ground = std({ map: groundTexture(S), roughness: 1 });
  const wall = corrugatedTexture(256, '#d8cdb8', 14);
  const roofT = corrugatedTexture(256, '#a9aaa4', 12);
  result = {
    woodSide,
    woodEnd,
    pole,
    concrete: std({ map: concreteTexture(S), roughness: 0.78 }),
    ground,
    courtyard: ground,
    roof: std({ map: roofT, roughness: 0.55, metalness: 0.55, side: THREE.DoubleSide }),
    wallMetal: std({ map: wall, roughness: 0.6, metalness: 0.25, side: THREE.DoubleSide }),
    wallBlock: std({ map: blockWallTexture(256), roughness: 0.92 }),
    steel: std({ color: '#2f3632', roughness: 0.55, metalness: 0.6 }),
    paintGreen: std({ color: '#1f3a2e', roughness: 0.5 }),
    paintOchre: std({ color: '#c99a2e', roughness: 0.45 }),
    paintWhite: std({ color: '#ece6da', roughness: 0.45 }),
    rubber: std({ color: '#1a1a1a', roughness: 0.9 }),
    glass: std({ color: '#2a3b40', roughness: 0.08, metalness: 0.4 }),
    skylight: std({ color: '#fff6e3' }),
    film: std({ color: '#f3f6f1', transparent: true, opacity: 0.22, depthWrite: false }),
    sack5: std({ map: sackTexture(256, '5 kg'), roughness: 0.85 }),
    sack15: std({ map: sackTexture(256, '15 kg'), roughness: 0.85 }),
    charcoal: std({ color: '#1d1a18', roughness: 0.75, metalness: 0.25 }),
    plant: std({ color: '#4f7a3a' }),
    soil: std({ color: '#5a4330' }),
    palletWood: std({ map: woodSideTexture('fir', 256, 77), color: '#d8c7a5', roughness: 0.9 }),
    sticker: std({ color: '#8a6a45', roughness: 0.95 }),
    shaft: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
    paintLine: std({ color: '#efe6d4' }),
  };
  cache = { quality, mats: result };
  return result;
}
