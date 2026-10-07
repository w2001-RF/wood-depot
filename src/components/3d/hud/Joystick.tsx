import { useEffect, useRef, useState } from 'react';
import { playerRuntime } from '../runtime';

const R = 56;

/**
 * Floating thumb stick. Appears where the thumb lands inside its zone (bottom
 * start corner), so it works for small and large hands. Push to the rim to run.
 */
export function Joystick({ label }: { label: string }) {
  const zone = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pid = useRef<number | null>(null);

  useEffect(
    () => () => {
      playerRuntime.joy.x = 0;
      playerRuntime.joy.y = 0;
    },
    [],
  );

  const update = (cx: number, cy: number, o: { x: number; y: number }) => {
    let dx = cx - o.x;
    let dy = cy - o.y;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob({ x: dx, y: dy });
    const nx = dx / R;
    const ny = -dy / R;
    const m = Math.hypot(nx, ny);
    const dead = 0.12;
    const k = m < dead ? 0 : (m - dead) / (1 - dead) / (m || 1);
    playerRuntime.joy.x = nx * k;
    playerRuntime.joy.y = ny * k;
  };

  return (
    <div
      ref={zone}
      aria-label={label}
      role="application"
      className="pointer-events-auto absolute bottom-0 start-0 z-20 h-[45vh] w-[50vw] touch-none select-none"
      onPointerDown={(e) => {
        if (pid.current !== null) return;
        pid.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        const r = zone.current!.getBoundingClientRect();
        const o = { x: Math.min(Math.max(e.clientX, r.left + R + 12), r.right - R - 12), y: Math.min(Math.max(e.clientY, r.top + R), r.bottom - R - 20) };
        setOrigin(o);
        update(e.clientX, e.clientY, o);
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== pid.current || !origin) return;
        update(e.clientX, e.clientY, origin);
      }}
      onPointerUp={(e) => {
        if (e.pointerId !== pid.current) return;
        pid.current = null;
        setOrigin(null);
        setKnob({ x: 0, y: 0 });
        playerRuntime.joy.x = 0;
        playerRuntime.joy.y = 0;
      }}
      onPointerCancel={() => {
        pid.current = null;
        setOrigin(null);
        playerRuntime.joy.x = 0;
        playerRuntime.joy.y = 0;
      }}
    >
      {(() => {
        const r = zone.current?.getBoundingClientRect();
        const o = origin ?? (r ? { x: r.left + 28 + R, y: r.bottom - 36 - R } : null);
        if (!o || !r) return <div className="absolute bottom-9 start-7 h-28 w-28 rounded-full border border-white/25 bg-black/15" />;
        return (
          <div className="absolute" style={{ left: o.x - r.left - R, top: o.y - r.top - R, width: R * 2, height: R * 2 }}>
            <div className={`absolute inset-0 rounded-full border border-white/30 bg-black/20 backdrop-blur-sm transition-opacity ${origin ? 'opacity-100' : 'opacity-60'}`} />
            <div
              className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border border-white/50 bg-[#f6f1e7]/85 shadow-lg"
              style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
            />
          </div>
        );
      })()}
    </div>
  );
}
