import { ArrowLeft, Box, Hand, Map as MapIcon, Navigation, Search, Settings2, ShoppingCart, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PLAYER, ZONES } from '../../../config/depotLayout';
import { useT } from '../../../i18n';
import { selectTotalItems, useCartStore } from '../../../stores/cartStore';
import { useCatalogStore } from '../../../stores/catalogStore';
import { useDepotStore } from '../../../stores/depotStore';
import { selectOverlayOpen, useUiStore } from '../../../stores/uiStore';
import type { QualityLevel } from '../../../types';
import type { DepotWorld } from '../../../utils/depotWorld';
import { isTouchDevice } from '../../../utils/webgl';
import { SearchBox } from '../../navigation/SearchBox';
import { WhatsAppIcon } from '../../ui/WhatsAppIcon';
import { playerRuntime, setPose } from '../runtime';
import { Joystick } from './Joystick';
import { Minimap } from './Minimap';

function GuideBanner() {
  const { t } = useT();
  const guide = useDepotStore((s) => s.guide);
  const setGuide = useDepotStore((s) => s.setGuide);
  const [dist, setDist] = useState(0);
  useEffect(() => {
    if (!guide) return;
    const id = window.setInterval(() => {
      const p = playerRuntime.path;
      let d = 0;
      for (let i = 1; i < p.length; i++) d += Math.hypot(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z);
      setDist(Math.round(d));
    }, 300);
    return () => window.clearInterval(id);
  }, [guide]);
  if (!guide) return null;
  return (
    <div className="wd-glass pointer-events-auto flex items-center gap-3 py-1.5 ps-3 pe-1.5 text-sm text-[#f6f1e7]">
      <Navigation size={15} className="text-[#f2c879]" />
      <span className="max-w-[46vw] truncate">
        <span className="text-[#d9c3a0]">{t('depot.guiding')} </span>
        <strong>{guide.label}</strong>
        {dist > 0 && <span className="text-[#d9c3a0]"> · {dist} m</span>}
      </span>
      <button type="button" onClick={() => setGuide(null)} className="grid h-7 w-7 place-items-center hover:bg-white/10" aria-label={t('depot.cancelGuide')}>
        <X size={14} />
      </button>
    </div>
  );
}

function QualityMenu() {
  const { t } = useT();
  const quality = useDepotStore((s) => s.quality);
  const setQuality = useDepotStore((s) => s.setQuality);
  const [open, setOpen] = useState(false);
  const levels: QualityLevel[] = ['high', 'medium', 'low'];
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="wd-hud-btn" aria-label={t('depot.quality')} aria-expanded={open}>
        <Settings2 size={17} />
      </button>
      {open && (
        <div className="wd-glass absolute end-0 top-full z-30 mt-2 w-44 p-1 text-sm text-[#f6f1e7]">
          <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#d9c3a0]">{t('depot.quality')}</p>
          {levels.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setQuality(q);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-2 py-2 text-start hover:bg-white/10 ${quality === q ? 'text-[#f2c879]' : ''}`}
            >
              {t(`depot.quality.${q}` as 'depot.quality.high')}
              {quality === q && <span aria-hidden>●</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Commercial anchor in 3D: the selection is always one tap from a quote. */
function CartCta() {
  const { t } = useT();
  const total = useCartStore(selectTotalItems);
  const setQuoteOpen = useUiStore((s) => s.setQuoteOpen);
  const [pulse, setPulse] = useState(false);
  const prev = useRef(total);
  useEffect(() => {
    if (total > prev.current) {
      setPulse(true);
      const id = window.setTimeout(() => setPulse(false), 700);
      prev.current = total;
      return () => window.clearTimeout(id);
    }
    prev.current = total;
  }, [total]);
  if (!total) return null;
  return (
    <button
      type="button"
      onClick={() => setQuoteOpen(true)}
      className={`pointer-events-auto flex max-w-full items-center gap-2 bg-[#1f3a2e] py-2.5 ps-3 pe-4 text-start text-sm font-bold uppercase tracking-wide text-[#f6f1e7] shadow-xl ring-1 ring-[#f6f1e7]/15 transition hover:bg-[#2f5a45] ${pulse ? 'wd-pop' : ''}`}
    >
      <WhatsAppIcon className="h-4 w-4" />
      {t('depot.cartCta', { n: total })}
    </button>
  );
}

export function DepotHUD({ world }: { world: DepotWorld | null }) {
  const { t, l } = useT();
  const navigate = useUiStore((s) => s.navigate);
  const setCartOpen = useUiStore((s) => s.setCartOpen);
  const overlay = useUiStore(selectOverlayOpen);
  const total = useCartStore(selectTotalItems);
  const phase = useDepotStore((s) => s.phase);
  const viewMode = useDepotStore((s) => s.viewMode);
  const setViewMode = useDepotStore((s) => s.setViewMode);
  const setPhase = useDepotStore((s) => s.setPhase);
  const zone = useDepotStore((s) => s.currentZone);
  const focusedId = useDepotStore((s) => s.focusedId);
  const notice = useDepotStore((s) => s.notice);
  const byId = useCatalogStore((s) => s.byId);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const touch = isTouchDevice();
  const zoneDef = ZONES.find((z) => z.id === zone);
  const focusedIt = focusedId ? world?.interactables.find((i) => i.id === focusedId) : null;
  const focusedName = focusedIt?.productId ? byId[focusedIt.productId]?.name : null;
  const exploring = phase === 'explore' && viewMode === '3d';

  // collapse the controls hint once the visitor has walked a bit
  useEffect(() => {
    if (!exploring) return;
    const start = { x: playerRuntime.x, z: playerRuntime.z };
    const id = window.setInterval(() => {
      if (Math.hypot(playerRuntime.x - start.x, playerRuntime.z - start.z) > 6) {
        setHintVisible(false);
        window.clearInterval(id);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [exploring]);

  if (phase === 'cinematic')
    return (
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="wd-letterbox absolute inset-x-0 top-0 h-[9vh] bg-black" />
        <div className="wd-letterbox absolute inset-x-0 bottom-0 h-[9vh] bg-black" />
        <button type="button" onClick={() => { setPose(PLAYER.start); setPhase('explore'); }} className="pointer-events-auto absolute bottom-[calc(9vh+16px)] end-5 border border-white/40 bg-black/40 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur hover:bg-black/60">
          {t('depot.skip')} →
        </button>
      </div>
    );

  if (phase === 'loading' || phase === 'idle') return null;

  return (
    <div className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 ${overlay ? 'opacity-0' : 'opacity-100'}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* top-left: identity + where am I */}
      <div className="absolute start-3 top-3 flex items-center gap-2 sm:start-5 sm:top-5">
        <button type="button" onClick={() => navigate('home')} className="wd-hud-btn pointer-events-auto" aria-label={t('depot.exit')} title={t('depot.exit')}>
          <ArrowLeft size={18} className="rtl:rotate-180" />
        </button>
        <div className="wd-glass flex h-10 items-center gap-2.5 ps-3 pe-3 text-[#f6f1e7]">
          <span className="hidden font-display text-lg font-black leading-none tracking-[0.12em] sm:inline">WOOD DEPOT</span>
          {zoneDef && viewMode === '3d' && (
            <span className="flex items-center gap-1.5 text-xs text-[#d9c3a0] sm:border-s sm:border-white/20 sm:ps-2.5">
              <span className="grid h-4 w-4 place-items-center text-[9px] font-bold text-[#1c130d]" style={{ background: zoneDef.color === '#4a4440' ? '#8d8580' : zoneDef.color }}>
                {zoneDef.code}
              </span>
              <span className="max-w-[34vw] truncate sm:max-w-none">{t(`zone.${zone}` as 'zone.desk')}</span>
            </span>
          )}
        </div>
      </div>

      {/* top-right: search, view, quality, cart */}
      <div className="absolute end-3 top-3 flex items-start gap-1.5 sm:end-5 sm:top-5 sm:gap-2">
        <div className="pointer-events-auto hidden w-72 md:block">
          <SearchBox variant="dark" />
        </div>
        <button type="button" onClick={() => setSearchOpen(true)} className="wd-hud-btn pointer-events-auto md:hidden" aria-label={t('search.label')}>
          <Search size={17} />
        </button>
        <button
          type="button"
          onClick={() => setViewMode(viewMode === '3d' ? 'plan' : '3d')}
          className="wd-hud-btn pointer-events-auto"
          aria-label={viewMode === '3d' ? t('depot.view2d') : t('depot.view3d')}
          title={viewMode === '3d' ? t('depot.view2d') : t('depot.view3d')}
        >
          {viewMode === '3d' ? <MapIcon size={17} /> : <Box size={17} />}
        </button>
        {viewMode === '3d' && !touch && (
          <div className="pointer-events-auto">
            <QualityMenu />
          </div>
        )}
        <button type="button" onClick={() => setCartOpen(true)} className="wd-hud-btn pointer-events-auto relative" aria-label={t('cart.open', { n: total })}>
          <ShoppingCart size={18} />
          {total > 0 && <span className="absolute -end-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#f2c879] px-1 text-[11px] font-bold text-[#1c130d]">{total > 999 ? '999+' : total}</span>}
        </button>
      </div>

      {/* top-centre: guidance / notices */}
      <div className="absolute inset-x-0 top-[68px] flex flex-col items-center gap-2 px-3 sm:top-20">
        <GuideBanner />
        {notice && viewMode === '3d' && <p className="wd-glass max-w-xl px-4 py-2 text-center text-sm text-[#f6f1e7]">{notice}</p>}
      </div>

      {viewMode === '3d' && (
        <>
          {!touch && <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" aria-hidden />}

          {/* bottom-left: controls hint (desktop) */}
          {!touch && (
            <div className={`wd-glass absolute bottom-5 start-5 max-w-[min(300px,30vw)] px-3 py-2 text-xs leading-relaxed text-[#ecdfc8] transition-all duration-500 ${hintVisible ? 'opacity-100' : 'pointer-events-auto opacity-50 hover:opacity-100'}`}>
              {hintVisible ? t('depot.hint.desktop') : 'ZQSD · E'}
            </div>
          )}
          {touch && exploring && !overlay && <Joystick label={t('depot.hint.mobile')} />}

          {/* bottom-centre: interact (touch) + quote CTA */}
          {/* desktop: centred; touch: the side opposite the joystick thumb */}
          <div className={`absolute bottom-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-2 ${touch ? 'end-3 max-w-[58vw] items-end' : 'inset-x-0 items-center'}`}>
            {touch && focusedId && (
              <button
                type="button"
                onClick={() => {
                  playerRuntime.interactRequested = true;
                }}
                className="wd-pop pointer-events-auto z-30 flex max-w-full items-center gap-2 bg-[#f6f1e7] px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-[#1c130d] shadow-2xl"
              >
                <Hand size={16} className="shrink-0" />
                <span className="truncate">{focusedId === 'desk' ? t('zone.desk') : focusedName ? `${t('depot.interact')} · ${l(focusedName)}` : t('depot.interact')}</span>
              </button>
            )}
            <CartCta />
          </div>
        </>
      )}

      {/* minimap: bottom-right on desktop; top-right on phones so the thumb zone stays for actions */}
      {world && viewMode === '3d' && (
        <div className={touch ? 'absolute end-3 top-[60px]' : 'absolute bottom-5 end-3 sm:end-5'}>
          <Minimap world={world} compact={touch} />
        </div>
      )}

      {searchOpen && (
        <div className="pointer-events-auto absolute inset-x-0 top-0 z-40 bg-[#1c130d]/95 p-3 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <SearchBox variant="dark" autoFocus onDone={() => setSearchOpen(false)} />
            <button type="button" onClick={() => setSearchOpen(false)} className="wd-hud-btn" aria-label={t('cta.close')}>
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
