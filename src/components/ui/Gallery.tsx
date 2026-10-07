import { useState } from 'react';
import { galleryItems, type GalleryCategory } from '../../data/gallery';
import { useT } from '../../i18n';

/** Stylised demo artwork per category until the depot supplies photos (item.src). */
function DemoArt({ category }: { category: GalleryCategory }) {
  const wood = ['#c99d66', '#ad7a52', '#cdb48a'];
  return (
    <svg viewBox="0 0 400 280" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="400" height="280" fill={category === 'greenhouse' ? '#dfe7da' : category === 'delivery' ? '#e8dcc6' : '#e6d9c0'} />
      {category === 'depot' && (
        <g>
          <path d="M0 280 L0 90 L200 40 L400 90 L400 280Z" fill="#2a1c12" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={150 + i * 4} y={0} width={30} height={280} fill="#fff1d6" opacity={0.07} transform={`skewX(-18) translate(${i * 40} 0)`} />
          ))}
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <rect key={r} x={30} y={240 - r * 14} width={140} height={12} fill={wood[r % 3]} />
          ))}
          {[0, 1, 2, 3, 4].map((r) => (
            <rect key={`b${r}`} x={230} y={240 - r * 16} width={140} height={14} fill={wood[(r + 1) % 3]} />
          ))}
        </g>
      )}
      {category === 'wood' &&
        Array.from({ length: 6 }, (_, r) =>
          Array.from({ length: 8 }, (_, c) => (
            <g key={`${r}${c}`}>
              <rect x={20 + c * 46} y={30 + r * 40} width={42} height={36} fill={wood[(r + c) % 3]} />
              <circle cx={20 + c * 46 + 10 + ((r * c) % 20)} cy={30 + r * 40 + 30} r={14} fill="none" stroke="#8d6036" strokeOpacity="0.35" />
            </g>
          )),
        )}
      {category === 'construction' && (
        <g>
          <rect x="0" y="200" width="400" height="80" fill="#a49c90" />
          <rect x="60" y="80" width="280" height="120" fill="#cdb48a" />
          {Array.from({ length: 11 }, (_, i) => (
            <rect key={i} x={60 + i * 26} y={80} width={2} height={120} fill="#93784f" />
          ))}
          {[100, 200, 300].map((x) => (
            <rect key={x} x={x - 4} y={200} width={8} height={60} fill="#8d6036" transform={`rotate(${x === 200 ? 0 : x < 200 ? 12 : -12} ${x} 200)`} />
          ))}
        </g>
      )}
      {category === 'agriculture' && (
        <g>
          <rect y="190" width="400" height="90" fill="#b89a72" />
          {[60, 150, 240, 330].map((x) => (
            <g key={x}>
              <rect x={x - 4} y={90} width={8} height={110} fill="#ad7a52" />
              <rect x={x - 30} y={92} width={60} height={6} fill="#c99d66" />
              <circle cx={x - 20} cy={120} r={16} fill="#6f8b4a" />
              <circle cx={x + 18} cy={130} r={18} fill="#5c7a3c" />
            </g>
          ))}
        </g>
      )}
      {category === 'greenhouse' && (
        <g>
          <rect y="210" width="400" height="70" fill="#b89a72" />
          <path d="M60 210 V120 L200 70 L340 120 V210Z" fill="#ffffff" opacity="0.55" stroke="#ad7a52" strokeWidth="6" />
          <line x1="200" y1="70" x2="200" y2="210" stroke="#c99d66" strokeWidth="5" />
          {[110, 160, 240, 290].map((x) => (
            <line key={x} x1={x} y1={210} x2={x} y2={x < 200 ? 100 : 100} stroke="#c99d66" strokeWidth="3" opacity="0.7" />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <circle key={i} cx={80 + i * 26} cy={200} r={10} fill="#4f7a3a" />
          ))}
        </g>
      )}
      {category === 'delivery' && (
        <g>
          <rect y="220" width="400" height="60" fill="#5f5a53" />
          <rect x="40" y="150" width="90" height="70" fill="#ece6da" />
          <rect x="130" y="180" width="230" height="16" fill="#1f3a2e" />
          {[0, 1, 2, 3].map((r) => (
            <rect key={r} x={140} y={166 - r * 12} width={210} height={11} fill={wood[r % 3]} />
          ))}
          {[80, 200, 320].map((x) => (
            <circle key={x} cx={x} cy={222} r={18} fill="#1a1a1a" />
          ))}
        </g>
      )}
    </svg>
  );
}

export function Gallery() {
  const { t, l } = useT();
  const [cat, setCat] = useState<GalleryCategory | 'all'>('all');
  const cats: (GalleryCategory | 'all')[] = ['all', 'depot', 'wood', 'construction', 'agriculture', 'greenhouse', 'delivery'];
  const items = galleryItems.filter((g) => cat === 'all' || g.category === cat);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="tablist">
        {cats.map((c) => (
          <button key={c} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={`h-9 border px-3 text-xs font-bold uppercase tracking-wider ${cat === c ? 'border-[#1c130d] bg-[#1c130d] text-[#f6f1e7]' : 'border-[#3a2618]/20 hover:bg-[#ecdfc8]'}`}>
            {t(`gallery.${c}` as 'gallery.all')}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
        {items.map((g, i) => (
          <figure key={g.id} className={`group relative overflow-hidden bg-[#e6d9c0] ${i === 0 && cat === 'all' ? 'md:col-span-2 md:row-span-2' : ''}`}>
            <div className="aspect-[4/3] h-full w-full transition duration-700 group-hover:scale-[1.04]">
              {g.src ? <img src={g.src} alt={l(g.caption)} loading="lazy" className="h-full w-full object-cover" /> : <DemoArt category={g.category} />}
            </div>
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 text-sm font-semibold text-white">
              {l(g.caption)}
              {!g.src && <span className="mt-0.5 block text-[10px] font-normal uppercase tracking-[0.14em] text-white/70">{t('gallery.demo')}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
