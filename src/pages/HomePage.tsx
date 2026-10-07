import { ArrowRight, Compass, LayoutGrid, MapPin, Ruler, Send, Sprout, Tractor, Warehouse, Flame } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n';
import { useCatalogStore } from '../stores/catalogStore';
import { useUiStore } from '../stores/uiStore';
import { isWebGLAvailable } from '../utils/webgl';
import { ProductCard } from '../components/catalog/ProductCard';
import { Gallery } from '../components/ui/Gallery';

const LandingScene = lazy(() => import('../components/3d/landing/LandingScene'));

function HeroFallback() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,#6b4428_0%,#2a1c12_55%,#140d08_100%)]">
      <svg viewBox="0 0 800 400" className="absolute inset-x-0 bottom-0 h-[60%] w-full opacity-60" preserveAspectRatio="xMidYMax slice" aria-hidden>
        <path d="M120 400 V230 L400 170 L680 230 V400 Z" fill="#1c130d" />
        <rect x="350" y="290" width="100" height="110" fill="#e9b872" opacity="0.55" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={40} y={360 - i * 10} width={150} height={8} fill="#8d6036" />
        ))}
      </svg>
    </div>
  );
}

export function HomePage() {
  const { t } = useT();
  const navigate = useUiStore((s) => s.navigate);
  const products = useCatalogStore((s) => s.products);
  const featured = useMemo(() => products.filter((p) => p.featured).slice(0, 4), [products]);
  const webgl = useMemo(() => isWebGLAvailable(), []);
  const heroRef = useRef<HTMLElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);

  // stop rendering the hero scene once scrolled away
  useEffect(() => {
    const el = heroRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const markets = [
    { id: 'construction', icon: Warehouse, t: 'cat.construction', d: 'solutions.construction.d', code: 'A' },
    { id: 'agriculture', icon: Tractor, t: 'cat.agriculture', d: 'solutions.agriculture.d', code: 'B' },
    { id: 'greenhouse', icon: Sprout, t: 'cat.greenhouse', d: 'solutions.greenhouse.d', code: 'C' },
    { id: 'seasonal', icon: Flame, t: 'cat.seasonal', d: 'solutions.seasonal.d', code: 'D' },
  ] as const;

  return (
    <>
      <section ref={heroRef} className="relative h-[100svh] min-h-[560px] overflow-hidden bg-[#1c130d] text-[#f6f1e7]">
        {webgl ? (
          <Suspense fallback={<HeroFallback />}>
            <LandingScene active={heroVisible} />
          </Suspense>
        ) : (
          <HeroFallback />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(18,12,8,0.82)_0%,rgba(18,12,8,0.45)_45%,rgba(18,12,8,0)_75%)] rtl:bg-[linear-gradient(270deg,rgba(18,12,8,0.82)_0%,rgba(18,12,8,0.45)_45%,rgba(18,12,8,0)_75%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#120c08] to-transparent" />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-16 sm:px-6 sm:pb-24">
          <p className="wd-rise text-xs font-bold uppercase tracking-[0.32em] text-[#d9c3a0]">{t('hero.kicker')}</p>
          <h1 className="wd-rise mt-3 max-w-3xl font-display text-[clamp(3.2rem,10vw,8.5rem)] font-black uppercase leading-[0.86] tracking-wide [animation-delay:80ms]">{t('hero.title')}</h1>
          <p className="wd-rise mt-5 max-w-xl text-base text-[#ecdfc8] sm:text-lg [animation-delay:160ms]">{t('hero.subtitle')}</p>
          <div className="wd-rise mt-8 flex flex-col gap-3 sm:flex-row [animation-delay:240ms]">
            <button
              type="button"
              onClick={() => navigate('depot', { intro: true })}
              className="group flex h-14 items-center justify-center gap-3 bg-[#f6f1e7] px-7 text-sm font-black uppercase tracking-[0.16em] text-[#1c130d] shadow-[0_10px_40px_rgba(0,0,0,0.35)] hover:bg-white"
            >
              <Compass size={19} />
              {t('cta.explore')}
              <ArrowRight size={18} className="transition group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            </button>
            <button type="button" onClick={() => navigate('catalog')} className="flex h-14 items-center justify-center gap-2 border border-[#f6f1e7]/45 px-7 text-sm font-bold uppercase tracking-[0.16em] backdrop-blur-sm hover:bg-white/10">
              <LayoutGrid size={17} /> {t('cta.catalog')}
            </button>
          </div>
          <p className="wd-rise mt-5 text-xs text-[#d9c3a0] [animation-delay:320ms]">{t('hero.hint')}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#6b4428]">{t('home.markets.kicker')}</p>
        <h2 className="mt-2 font-display text-5xl font-black uppercase leading-none tracking-wide sm:text-6xl">{t('home.markets.title')}</h2>
        <div className="mt-10 grid gap-px border border-[#3a2618]/15 bg-[#3a2618]/15 sm:grid-cols-2 lg:grid-cols-4">
          {markets.map((m) => (
            <button key={m.id} type="button" onClick={() => navigate('solutions')} className="group flex flex-col bg-[#f6f1e7] p-6 text-start transition hover:bg-[#efe6d4]">
              <div className="flex items-center justify-between">
                <m.icon size={26} className="text-[#6b4428]" />
                <span className="font-display text-4xl font-black text-[#3a2618]/15">{m.code}</span>
              </div>
              <h3 className="mt-6 font-display text-2xl font-extrabold uppercase">{t(m.t)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6b4428]">{t(m.d)}</p>
              <span className="mt-auto flex items-center gap-1 pt-6 text-xs font-bold uppercase tracking-wider opacity-0 transition group-hover:opacity-100">
                {t('nav.solutions')} <ArrowRight size={14} className="rtl:rotate-180" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-[#1c130d] text-[#f6f1e7]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d9c3a0]">{t('home.steps.kicker')}</p>
          <h2 className="mt-2 max-w-3xl font-display text-5xl font-black uppercase leading-none tracking-wide">{t('home.steps.title')}</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              { i: Compass, t: 'home.step1.t', d: 'home.step1.d' },
              { i: Ruler, t: 'home.step2.t', d: 'home.step2.d' },
              { i: Send, t: 'home.step3.t', d: 'home.step3.d' },
            ].map((s, n) => (
              <li key={s.t} className="border-t border-[#d9c3a0]/30 pt-5">
                <div className="flex items-center gap-3">
                  <span className="font-display text-5xl font-black text-[#c99a2e]">0{n + 1}</span>
                  <s.i size={22} className="text-[#d9c3a0]" />
                </div>
                <h3 className="mt-3 font-display text-2xl font-extrabold uppercase">{t(s.t as 'home.step1.t')}</h3>
                <p className="mt-1 text-sm text-[#d9c3a0]">{t(s.d as 'home.step1.d')}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-5xl font-black uppercase tracking-wide">{t('home.featured')}</h2>
          <button type="button" onClick={() => navigate('catalog')} className="hidden items-center gap-1 text-sm font-bold uppercase tracking-wider sm:flex">
            {t('cta.catalog')} <ArrowRight size={15} className="rtl:rotate-180" />
          </button>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <h2 className="font-display text-5xl font-black uppercase tracking-wide">{t('home.gallery')}</h2>
        <div className="mt-8">
          <Gallery />
        </div>
      </section>

      <section className="border-t border-[#3a2618]/10 bg-[#efe6d4]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-4xl font-black uppercase">{t('home.cta.title')}</h2>
            <p className="mt-1 text-[#6b4428]">{t('home.cta.text')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate('configurator')} className="flex h-12 items-center gap-2 bg-[#1c130d] px-6 text-sm font-bold uppercase tracking-wider text-[#f6f1e7] hover:bg-[#3a2618]">
              <Ruler size={16} /> {t('nav.configurator')}
            </button>
            <button type="button" onClick={() => navigate('contact')} className="flex h-12 items-center gap-2 border border-[#3a2618]/30 px-6 text-sm font-bold uppercase tracking-wider hover:bg-[#ecdfc8]">
              <MapPin size={16} /> {t('nav.contact')}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
