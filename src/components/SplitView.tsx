import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

// SplitView: dos paneles lado a lado con divisor arrastrable (estilo Overleaf).
// El reparto se guarda en localStorage. En móvil se apilan.
// No sabe nada de lessons: solo maqueta.

interface Props {
  left: ComponentChildren;
  right: ComponentChildren;
  storageKey?: string;
  initial?: number; // % del panel izquierdo
  min?: number;
  max?: number;
}

export default function SplitView({
  left,
  right,
  storageKey = "gestion-empresarial:editor-split",
  initial = 50,
  min = 20,
  max = 80,
}: Props) {
  const [ratio, setRatio] = useState(initial);
  const [wide, setWide] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const v = Number(raw);
        if (Number.isFinite(v) && v >= min && v <= max) setRatio(v);
      }
    } catch {}
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (v: number) => {
    const clamped = Math.min(max, Math.max(min, Math.round(v)));
    setRatio(clamped);
    try {
      localStorage.setItem(storageKey, String(clamped));
    } catch {}
  };

  return (
    <div class="flex flex-col md:flex-row bg-white border rounded-2xl overflow-hidden md:h-[calc(100vh-300px)] md:min-h-[480px]">
      <div class="min-w-0 md:h-full md:overflow-y-auto p-3 md:p-4" style={wide ? { width: `${ratio}%` } : undefined}>
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        title="Arrastra para dar más tamaño a un lado (doble clic = 50/50)"
        class={`hidden md:flex w-3 shrink-0 cursor-col-resize items-center justify-center touch-none select-none ${
          dragging ? "bg-indigo-300" : "bg-gray-100 hover:bg-indigo-200"
        }`}
        onPointerDown={(e) => {
          setDragging(true);
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          const rect = (e.currentTarget as HTMLElement).parentElement?.getBoundingClientRect();
          if (!rect || rect.width === 0) return;
          persist(((e.clientX - rect.left) / rect.width) * 100);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onDblClick={() => persist(50)}
      >
        <span class="flex flex-col gap-1">
          <span class="w-1 h-1 rounded-full bg-gray-400" />
          <span class="w-1 h-1 rounded-full bg-gray-400" />
          <span class="w-1 h-1 rounded-full bg-gray-400" />
        </span>
      </div>

      <div class="min-w-0 flex-1 md:h-full md:overflow-y-auto bg-gray-50 border-t md:border-t-0 md:border-l p-3 md:p-4">
        {right}
      </div>
    </div>
  );
}
