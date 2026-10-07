import { CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { isTouchDevice } from '../../utils/webgl';

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  // in the depot, sit below the HUD's guidance banner
  const inDepot = useUiStore((s) => s.route === 'depot');
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <div className={`pointer-events-none fixed inset-x-0 z-[80] flex flex-col items-center gap-2 px-4 ${inDepot ? (isTouchDevice() ? 'top-[calc(env(safe-area-inset-top)+182px)]' : 'top-[calc(env(safe-area-inset-top)+124px)]') : 'top-[calc(env(safe-area-inset-top)+72px)]'}`} aria-live="polite" role="status">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className="wd-toast-in pointer-events-auto flex max-w-md items-center gap-2 bg-[#1c130d]/92 px-4 py-2.5 text-start text-sm text-[#f6f1e7] shadow-xl backdrop-blur"
        >
          {t.tone === 'success' ? <CheckCircle2 size={16} className="shrink-0 text-[#7fd49c]" /> : t.tone === 'warning' ? <TriangleAlert size={16} className="shrink-0 text-[#f2c879]" /> : <Info size={16} className="shrink-0 text-[#d9c3a0]" />}
          {t.text}
        </button>
      ))}
    </div>
  );
}
