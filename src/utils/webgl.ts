import type { QualityLevel } from '../types';

export function isWebGLAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Initial quality guess from device signals. A runtime FPS monitor then
 * downgrades if the guess was too optimistic.
 */
export function detectQuality(): QualityLevel {
  if (typeof window === 'undefined') return 'medium';
  const forced = new URLSearchParams(window.location.search).get('quality');
  if (forced === 'high' || forced === 'medium' || forced === 'low') return forced;
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const mem = nav.deviceMemory ?? 8;
    const cores = nav.hardwareConcurrency ?? 8;
    const touch = isTouchDevice();
    let renderer = '';
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    const software = /swiftshader|llvmpipe|software|basic render/.test(renderer);
    if (software || mem <= 2 || cores <= 2) return 'low';
    if (touch || mem <= 4 || /intel|mali-[gt][0-9]{1,2}\b|adreno \(tm\) [3-5]/.test(renderer)) return 'medium';
    return 'high';
  } catch {
    return 'medium';
  }
}
