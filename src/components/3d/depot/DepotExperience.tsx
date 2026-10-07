import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Component, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { translate, useT } from '../../../i18n';
import { useCatalogStore } from '../../../stores/catalogStore';
import { useDepotStore } from '../../../stores/depotStore';
import { useUiStore } from '../../../stores/uiStore';
import type { QualityLevel } from '../../../types';
import { buildDepotWorld } from '../../../utils/depotWorld';
import { isWebGLAvailable } from '../../../utils/webgl';
import { PlanView } from '../fallback/PlanView';
import { DepotHUD } from '../hud/DepotHUD';
import { guideToProduct } from '../interactions/actions';
import { getCachedMaterials, prepareDepotAssets, type DepotMaterials } from '../materials/materials';
import { playerRuntime } from '../runtime';
import { DepotScene } from './DepotScene';

class SceneBoundary extends Component<{ onError: (e: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.error('[depot] 3D scene failed', e);
    this.props.onError(e);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function LoadingScreen({ progress }: { progress: number }) {
  const { t } = useT();
  const pct = Math.round(progress * 100);
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-[#1c130d] text-[#f6f1e7]" role="status" aria-live="polite">
      <div className="wd-grain absolute inset-0 opacity-40" aria-hidden />
      <div className="relative w-[min(86vw,420px)]">
        <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-[#d9c3a0]">Wood Depot</p>
        <p className="mt-3 font-display text-4xl font-black uppercase leading-none tracking-wide sm:text-5xl">{t('depot.loading')}</p>
        <div className="mt-8 flex items-end justify-between text-xs text-[#d9c3a0]">
          <span>{progress < 0.85 ? t('depot.loadingStep.textures') : t('depot.loadingStep.scene')}</span>
          <span className="font-display text-3xl font-black text-[#f6f1e7] tabular-nums">{pct}%</span>
        </div>
        <div className="mt-2 h-[3px] bg-white/10">
          <div className="h-full bg-[#f2c879] transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-6 text-xs leading-relaxed text-[#ecdfc8]/70">{t('depot.hint.desktop')}</p>
      </div>
    </div>
  );
}

/** Marks the scene ready after real frames have rendered (shaders compiled). */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useEffect(() => {
    let n = 0;
    let raf = 0;
    const tick = () => {
      if (++n >= 3 && !done.current) {
        done.current = true;
        onReady();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onReady]);
  return null;
}

const DPR: Record<QualityLevel, [number, number]> = { high: [1, 1.75], medium: [1, 1.25], low: [0.7, 1] };

/** The depot as an application mode: full screen, its own HUD, no site chrome. */
export default function DepotExperience() {
  const { t } = useT();
  const byId = useCatalogStore((s) => s.byId);
  const world = useMemo(() => buildDepotWorld(byId), [byId]);
  playerRuntime.world = world;
  const webgl = useMemo(() => isWebGLAvailable(), []);
  const quality = useDepotStore((s) => s.quality);
  const viewMode = useDepotStore((s) => s.viewMode);
  const progress = useDepotStore((s) => s.progress);
  const inspecting = useUiStore((s) => !!s.inspection || s.quoteOpen);
  const [mats, setMats] = useState<DepotMaterials | null>(getCachedMaterials());
  const [ready, setReady] = useState(false);
  const downgraded = useRef(false);

  useEffect(() => {
    const depot = useDepotStore.getState();
    if (!webgl) depot.setViewMode('plan', t('depot.webglMissing'));
    depot.setPhase('loading');
    depot.setProgress(mats ? 0.85 : 0);
    return () => {
      const d = useDepotStore.getState();
      d.setPhase('idle');
      d.setFocused(null);
      d.setHovered(null);
      d.setGuide(null);
      document.body.style.cursor = '';
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (viewMode !== '3d' || mats) return;
    let cancelled = false;
    prepareDepotAssets(quality, (p) => !cancelled && useDepotStore.getState().setProgress(p * 0.85))
      .then((m) => !cancelled && setMats(m))
      .catch((e) => {
        console.error('[depot] asset preparation failed', e);
        useDepotStore.getState().setViewMode('plan', translate(useUiStore.getState().lang, 'depot.webglError'));
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, mats, quality]);

  // plan view never waits for 3D assets
  useEffect(() => {
    if (viewMode === 'plan') {
      useDepotStore.getState().setPhase('explore');
      const g = useUiStore.getState().consumeGuide();
      if (g) guideToProduct(g);
    }
  }, [viewMode]);

  const onReady = () => {
    setReady(true);
    const depot = useDepotStore.getState();
    depot.setProgress(1);
    const ui = useUiStore.getState();
    const intro = ui.consumeIntro();
    depot.setPhase(intro ? 'cinematic' : 'explore');
    const g = ui.consumeGuide();
    if (g) window.setTimeout(() => guideToProduct(g), intro ? 0 : 50);
  };

  const fail = () => useDepotStore.getState().setViewMode('plan', translate(useUiStore.getState().lang, 'depot.webglError'));

  const lowKey = quality === 'low' ? 'low' : 'hi';
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#1c130d]" style={{ height: '100dvh' }}>
      {viewMode === '3d' && mats && (
        <SceneBoundary onError={fail}>
          <Canvas
            key={lowKey}
            className="!absolute inset-0"
            shadows={quality === 'low' ? false : quality === 'high' ? 'soft' : 'percentage'}
            dpr={DPR[quality]}
            frameloop={inspecting ? 'demand' : 'always'}
            gl={{ antialias: quality !== 'low', powerPreference: 'high-performance', stencil: false }}
            camera={{ fov: 68, near: 0.05, far: 320, position: [-7, 7.5, 30] }}
            onCreated={({ gl, scene }) => {
              const dbg = (window as unknown as { __wd?: Record<string, unknown> }).__wd;
              if (dbg) Object.assign(dbg, { gl, scene });
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.0;
              gl.domElement.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                fail();
              });
            }}
          >
            <PerformanceMonitor
              ms={400}
              iterations={6}
              onDecline={() => {
                if (downgraded.current) return;
                const q = useDepotStore.getState().quality;
                if (q === 'low') return;
                downgraded.current = true;
                useDepotStore.getState().setQuality(q === 'high' ? 'medium' : 'low');
                useUiStore.getState().toast(translate(useUiStore.getState().lang, 'depot.autoQuality'), 'info');
              }}
            />
            <DepotScene world={world} mats={mats} quality={quality} />
            {!ready && <ReadySignal onReady={onReady} />}
          </Canvas>
        </SceneBoundary>
      )}
      {viewMode === 'plan' && <PlanView world={world} />}
      {viewMode === '3d' && !ready && <LoadingScreen progress={progress} />}
      <DepotHUD world={world} />
    </div>
  );
}
