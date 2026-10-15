import { useEffect, useMemo, useState } from "preact/hooks";
import { BLOQUES_ALFABETIZACION, STORAGE_KEY_PROGRESS, TOTAL_SUBTEMAS } from "../utils/alfabetizacionContent";

function loadProgress(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

// Un solo tema por nivel: se usa igual en la portada y en la vista del bloque.
const NIVEL_THEMES: Record<number, {
  headerBg: string;
  btnBg: string;
  barBg: string;
  dotColor: string;
  soft: string;
  softText: string;
  border: string;
  ring: string;
  icon: string;
  imagen: string;
  capa: string;
}> = {
  1: {
    headerBg: "bg-gradient-to-br from-[#6A42C2] to-[#8B5CF6]",
    btnBg: "bg-[#6A42C2] hover:bg-[#5833A8]",
    barBg: "bg-[#6A42C2]",
    dotColor: "text-[#6A42C2]",
    soft: "bg-[#F3EEFF]",
    softText: "text-[#5833A8]",
    border: "border-[#6A42C2]",
    ring: "focus-visible:ring-[#6A42C2]",
    icon: "🧠",
    imagen: "/multimedia/niveles/nivel-1.jpg",
    capa: "linear-gradient(135deg, rgba(139,92,246,0.72), rgba(167,139,250,0.58))",
  },
  2: {
    headerBg: "bg-gradient-to-br from-[#00897B] to-[#10B981]",
    btnBg: "bg-[#00897B] hover:bg-[#007266]",
    barBg: "bg-[#00897B]",
    dotColor: "text-[#00897B]",
    soft: "bg-[#E6F6F4]",
    softText: "text-[#00695C]",
    border: "border-[#00897B]",
    ring: "focus-visible:ring-[#00897B]",
    icon: "💬",
    imagen: "/multimedia/niveles/nivel-2.jpg",
    capa: "linear-gradient(135deg, rgba(16,185,129,0.72), rgba(52,211,153,0.58))",
  },
  3: {
    headerBg: "bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6]",
    btnBg: "bg-[#1D4ED8] hover:bg-[#1E40AF]",
    barBg: "bg-[#1D4ED8]",
    dotColor: "text-[#1D4ED8]",
    soft: "bg-[#EAF1FF]",
    softText: "text-[#1E40AF]",
    border: "border-[#1D4ED8]",
    ring: "focus-visible:ring-[#1D4ED8]",
    icon: "🔍",
    imagen: "/multimedia/niveles/nivel-3.jpg",
    capa: "linear-gradient(135deg, rgba(59,130,246,0.72), rgba(96,165,250,0.58))",
  },
  4: {
    headerBg: "bg-gradient-to-br from-[#E11D48] to-[#F43F5E]",
    btnBg: "bg-[#E11D48] hover:bg-[#BE123C]",
    barBg: "bg-[#E11D48]",
    dotColor: "text-[#E11D48]",
    soft: "bg-[#FFEDF1]",
    softText: "text-[#BE123C]",
    border: "border-[#E11D48]",
    ring: "focus-visible:ring-[#E11D48]",
    icon: "🛡️",
    imagen: "/multimedia/niveles/nivel-4.jpg",
    capa: "linear-gradient(135deg, rgba(244,63,94,0.72), rgba(251,113,133,0.58))",
  },
  5: {
    headerBg: "bg-gradient-to-br from-[#EA580C] to-[#F97316]",
    btnBg: "bg-[#EA580C] hover:bg-[#C2410C]",
    barBg: "bg-[#EA580C]",
    dotColor: "text-[#EA580C]",
    soft: "bg-[#FFF1E8]",
    softText: "text-[#C2410C]",
    border: "border-[#EA580C]",
    ring: "focus-visible:ring-[#EA580C]",
    icon: "📦",
    imagen: "/multimedia/niveles/nivel-5.jpg",
    capa: "linear-gradient(135deg, rgba(249,115,22,0.72), rgba(251,146,60,0.58))",
  },
};









export default function AlfabetizacionView() {
  const initialBloqueId = (): string | null => {
    try {
      if (typeof window === "undefined") return null;
      const param = new URLSearchParams(window.location.search).get("bloque");
      if (param && BLOQUES_ALFABETIZACION.some((b) => b.id === param)) return param;
    } catch {
      /* sin URL */
    }
    return null;
  };

  const [bloqueId, setBloqueId] = useState<string | null>(initialBloqueId);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const id = initialBloqueId();
    if (!id) return {};
    const b = BLOQUES_ALFABETIZACION.find((x) => x.id === id);
    return b ? { [b.subtemas[0].id]: true } : {};
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDone(loadProgress());
    setMounted(true);
  }, []);

  const persist = (next: Record<string, boolean>) => {
    setDone(next);
    try {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(next));
    } catch {
      /* sin localStorage */
    }
  };

  const toggleDone = (id: string) => persist({ ...done, [id]: !done[id] });

  const bloque = useMemo(() => BLOQUES_ALFABETIZACION.find((b) => b.id === bloqueId) ?? null, [bloqueId]);

  const completedCount = Object.values(done).filter(Boolean).length;
  const pct = Math.round((completedCount / TOTAL_SUBTEMAS) * 100);

  const completedBlocksCount = useMemo(() => {
    return BLOQUES_ALFABETIZACION.filter((b) => b.subtemas.every((s) => done[s.id])).length;
  }, [done]);

  const openBloque = (id: string, opts?: { expandAll?: boolean }) => {
    const b = BLOQUES_ALFABETIZACION.find((x) => x.id === id)!;
    setBloqueId(id);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("bloque", id);
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* sin history */
    }
    if (opts?.expandAll) {
      const all: Record<string, boolean> = {};
      b.subtemas.forEach((s) => (all[s.id] = true));
      setExpanded(all);
    } else {
      setExpanded({ [b.subtemas[0].id]: true });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goHome = () => {
    setBloqueId(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("bloque");
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* sin history */
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleExpand = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const markBloque = (completar: boolean) => {
    if (!bloque) return;
    const next = { ...done };
    bloque.subtemas.forEach((s) => {
      if (completar) next[s.id] = true;
      else delete next[s.id];
    });
    persist(next);
  };

  const expandAllCurrent = () => {
    if (!bloque) return;
    const all: Record<string, boolean> = {};
    bloque.subtemas.forEach((s) => (all[s.id] = true));
    setExpanded(all);
  };
  const collapseAllCurrent = () => setExpanded({});

  const bloqueIndex = bloque ? BLOQUES_ALFABETIZACION.findIndex((b) => b.id === bloque.id) : -1;
  const prevBloque = bloqueIndex > 0 ? BLOQUES_ALFABETIZACION[bloqueIndex - 1] : null;
  const nextBloque = bloqueIndex >= 0 && bloqueIndex < BLOQUES_ALFABETIZACION.length - 1 ? BLOQUES_ALFABETIZACION[bloqueIndex + 1] : null;

  if (!mounted) {
    return (
      <div class="w-full px-6 sm:px-10 lg:px-14 py-12">
        <div class="h-6 w-48 bg-slate-200 animate-pulse rounded-lg mb-4" />
        <div class="h-10 w-96 bg-slate-200 animate-pulse rounded-xl mb-4" />
        <div class="h-4 w-72 bg-slate-100 animate-pulse rounded mb-8" />
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} class="h-96 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

    const FOCO = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5932EA]/40";
  const proximoBloque = BLOQUES_ALFABETIZACION.find((b) => b.subtemas.some((s) => !done[s.id])) ?? null;

  return (
    <div class="min-h-screen">
      {/* Barra superior de la sección (ruta + progreso) */}
      <div class="sticky top-[57px] md:top-[61px] z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div class="w-full px-6 sm:px-10 lg:px-14 py-3 flex items-center justify-between gap-4">
          <button onClick={goHome} class={`text-sm sm:text-base font-bold hover:underline truncate cursor-pointer text-slate-800 rounded-lg ${FOCO}`}>
            {bloque ? (
              <span>
                <span class="text-slate-400 font-normal">Alfabetización /</span> B{bloque.numero} · {bloque.tituloCorto}
              </span>
            ) : (
              "Alfabetización IA"
            )}
          </button>

          <div class="flex items-center gap-3">
            <div class="hidden sm:flex items-center gap-2.5 text-sm text-slate-500">
              <span>{completedCount}/{TOTAL_SUBTEMAS} vistos</span>
              <div class="w-28 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-[#5932EA] rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span class="font-bold text-slate-700 w-10">{pct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PORTADA ===== */}
      {bloque === null && (
        <div class="w-full px-6 sm:px-10 lg:px-14 py-8 sm:py-10">
          {/* Progreso general */}
          <div class="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-center mb-10">
            <div class="flex items-center gap-5">
              <div class="relative w-24 h-24 shrink-0">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                  <path
                    class="text-slate-100"
                    stroke-width="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    class="text-[#5932EA] transition-all duration-700 ease-out"
                    stroke-dasharray={`${pct}, 100`}
                    stroke-width="3.5"
                    stroke-linecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center font-black text-slate-900 text-xl">
                  {pct}%
                </div>
              </div>
              <div>
                <p class="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  TU PROGRESO GENERAL
                </p>
                <h3 class="text-2xl font-black text-slate-900 mt-0.5">
                  {pct}% completado
                </h3>
                <p class="text-sm text-slate-500 mt-1 max-w-xs leading-snug">
                  Vas muy bien. Continúa con el siguiente nivel para seguir avanzando.
                </p>
              </div>
            </div>

            {/* Niveles: 5 pasos */}
            <div class="w-full lg:max-w-md lg:justify-self-center">
              <div class="flex items-center gap-1.5" role="img" aria-label={`${completedBlocksCount} de ${BLOQUES_ALFABETIZACION.length} niveles completados`}>
                {BLOQUES_ALFABETIZACION.map((b) => {
                  const completo = b.subtemas.every((s) => done[s.id]);
                  const parcial = b.subtemas.some((s) => done[s.id]);
                  return (
                    <span
                      key={b.id}
                      class={`h-3 flex-1 rounded-full transition-colors ${completo ? "bg-[#5932EA]" : parcial ? "bg-[#7C5CE9]/50" : "bg-slate-100"}`}
                    />
                  );
                })}
              </div>
              <p class="text-sm text-slate-500 font-medium mt-2">
                {completedBlocksCount} de {BLOQUES_ALFABETIZACION.length} niveles completados
              </p>
            </div>

            {/* Consejo */}
            <div class="flex items-center gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-8 lg:max-w-xs">
              <div class="w-12 h-12 rounded-2xl bg-[#EDE9FE] flex items-center justify-center text-2xl shrink-0" aria-hidden="true">
                💡
              </div>
              <p class="text-sm text-slate-600 leading-snug">
                La alfabetización en IA es el primer paso para un futuro más consciente.
              </p>
            </div>
          </div>

          {/* Encabezado de la sección */}
          <div class="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <p class="text-xs font-extrabold uppercase tracking-widest text-[#5932EA] mb-1.5">
                NIVELES DE ALFABETIZACIÓN IA
              </p>
              <h2 class="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
                Elige un bloque para empezar
              </h2>
              <p class="text-base sm:text-lg text-slate-600 max-w-3xl leading-relaxed">
                Cada nivel te acerca a un uso más consciente, crítico y creativo de la inteligencia artificial. Completa los cinco niveles para dominar las competencias esenciales de la era de la IA.
              </p>
            </div>
            {proximoBloque && completedCount > 0 && (
              <button
                onClick={() => openBloque(proximoBloque.id)}
                class={`shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#5932EA] hover:bg-[#4E2AD0] text-white text-base font-bold shadow-sm transition cursor-pointer ${FOCO}`}
              >
                Continuar con el Nivel {proximoBloque.numero} →
              </button>
            )}
          </div>

          {/* Tarjetas de niveles: 3 + 2 centradas, todas del mismo tamaño */}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5 items-stretch mb-10">
            {BLOQUES_ALFABETIZACION.map((b, i) => {
              const theme = NIVEL_THEMES[b.numero] ?? NIVEL_THEMES[1];
              const nDone = b.subtemas.filter((s) => done[s.id]).length;
              const bpct = Math.round((nDone / b.subtemas.length) * 100);
              const completo = nDone === b.subtemas.length;
              const pos = i === 3 ? "lg:col-start-2" : "";

              return (
                <article
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openBloque(b.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openBloque(b.id);
                    }
                  }}
                  class={`lg:col-span-2 ${pos} bg-white border border-slate-200/90 rounded-3xl overflow-hidden flex flex-col shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all group cursor-pointer ${FOCO}`}
                >
                  {/* Cabecera con color del nivel */}
                  <div class={`${theme.headerBg} relative overflow-hidden p-5 sm:p-6 text-white`}>
                    <img
                      src={theme.imagen}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      class="pointer-events-none absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{ filter: "grayscale(100%) contrast(1.15)" }}
                    />
                    <span
                      class="pointer-events-none absolute inset-0"
                      style={{ background: theme.capa }}
                      aria-hidden="true"
                    />
                    <div class="relative flex items-start justify-between gap-3">
                      <span class="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-widest bg-white/20 ring-1 ring-white/30 px-3 py-1.5 rounded-full uppercase backdrop-blur-md">
                        NIVEL {b.numero}
                      </span>
                      <span
                        class="w-14 h-14 rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur-md flex items-center justify-center text-3xl select-none transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                        aria-hidden="true"
                      >
                        {theme.icon}
                      </span>
                    </div>
                    <h3 class="relative text-xl sm:text-2xl font-extrabold mt-4 leading-tight drop-shadow-sm">
                      {b.titulo}
                    </h3>
                  </div>

                  {/* Contenido */}
                  <div class="p-5 sm:p-6 flex-1 flex flex-col">
                    <p class="text-sm sm:text-[15px] text-slate-600 leading-relaxed mb-5">
                      {b.descripcion}
                    </p>

                    <p class="text-sm font-bold text-slate-800 mb-2">Temas principales</p>
                    <ul class="space-y-2 mb-6">
                      {b.subtemas.slice(0, 3).map((s) => (
                        <li key={s.id} class="text-sm text-slate-600 flex items-start gap-2.5">
                          <span
                            class={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${done[s.id] ? "bg-emerald-500 text-white" : `${theme.soft} ${theme.softText}`}`}
                            aria-hidden="true"
                          >
                            {done[s.id] ? "✓" : "•"}
                          </span>
                          <span class="leading-snug">{s.titulo}</span>
                        </li>
                      ))}
                    </ul>

                    <div class="mt-auto">
                      <div class="flex justify-between text-sm text-slate-500 mb-1.5">
                        <span>{nDone}/{b.subtemas.length} vistos</span>
                        <span class="font-bold text-slate-700">{bpct}%</span>
                      </div>
                      <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                        <div
                          class={`h-full rounded-full ${theme.barBg} transition-all duration-300`}
                          style={{ width: `${bpct}%` }}
                        />
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openBloque(b.id);
                        }}
                        class={`w-full py-3.5 px-4 rounded-2xl ${theme.btnBg} text-white text-base font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1`}
                      >
                        {completo ? "Repasar →" : nDone > 0 ? "Continuar →" : "Comenzar →"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Laboratorio de actividades */}
          <a
            href="/alfabetizacion/actividades"
            class={`block rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-emerald-950 text-white p-7 sm:p-10 relative hover:shadow-2xl transition group ${FOCO}`}
          >
            <span class="absolute -right-4 -bottom-8 text-[150px] opacity-20 select-none leading-none group-hover:scale-105 transition" aria-hidden="true">
              🧪
            </span>
            <div class="relative">
              <span class="inline-block text-xs font-extrabold tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-lg">
                MÓDULO · ACTIVIDADES
              </span>
              <h2 class="text-3xl sm:text-4xl font-extrabold mt-3">Laboratorio de actividades</h2>
              <p class="text-base sm:text-lg text-white/80 mt-2 max-w-2xl leading-relaxed">
                ¿Cuál respuesta elegirías? · Detector de alucinaciones forense · Prompt lab. Evalúa y construye con IA sin necesidad de una IA real.
              </p>
              <span class="inline-block mt-5 px-6 py-3.5 rounded-2xl bg-white text-gray-900 text-base font-bold group-hover:bg-emerald-300 transition">
                Entrar al laboratorio →
              </span>
            </div>
          </a>
        </div>
      )}

      {/* ===== VISTA DETALLADA DEL BLOQUE ===== */}
      {bloque !== null && (() => {
        const theme = NIVEL_THEMES[bloque.numero] ?? NIVEL_THEMES[1];
        const nDone = bloque.subtemas.filter((s) => done[s.id]).length;
        const bpct = Math.round((nDone / bloque.subtemas.length) * 100);
        const todoVisto = nDone === bloque.subtemas.length;

        return (
          <div class="w-full px-6 sm:px-10 lg:px-14 py-8 sm:py-10">
            {/* Hero del bloque */}
            <section class={`rounded-3xl overflow-hidden ${theme.headerBg} text-white p-6 sm:p-10 relative shadow-sm`}>
              <span class="pointer-events-none absolute -top-16 -right-10 w-72 h-72 rounded-full bg-white/20 blur-3xl" aria-hidden="true" />
              <span
                class="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:16px_16px]"
                aria-hidden="true"
              />
              <span class="absolute right-6 top-6 text-[90px] sm:text-[140px] opacity-20 select-none leading-none" aria-hidden="true">
                {bloque.icono}
              </span>
              <button
                onClick={goHome}
                class="relative block w-fit text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
              >
                ← Todos los bloques
              </button>
              <p class="mt-5 text-xs font-extrabold tracking-widest bg-white/20 w-fit px-3 py-1.5 rounded-lg relative">
                BLOQUE {bloque.numero} · {bloque.subtemas.length} TEMAS
              </p>
              <h1 class="text-3xl sm:text-5xl font-extrabold mt-3 leading-tight relative max-w-3xl">
                {bloque.titulo}
              </h1>
              <p class="mt-3 text-white/90 max-w-2xl text-base sm:text-lg relative leading-relaxed">
                {bloque.descripcion}
              </p>

              <div class="mt-6 relative max-w-xl">
                <div class="flex items-center justify-between text-sm font-semibold mb-2">
                  <span>{nDone}/{bloque.subtemas.length} vistos</span>
                  <span>{bpct}%</span>
                </div>
                <div class="h-3 bg-white/25 rounded-full overflow-hidden">
                  <div class="h-full bg-white rounded-full transition-all" style={{ width: `${bpct}%` }} />
                </div>
              </div>

              <div class="mt-6 flex flex-wrap items-center gap-2.5 relative">
                <button
                  onClick={expandAllCurrent}
                  class="text-sm bg-white/20 hover:bg-white/30 px-4 py-2.5 rounded-full font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
                >
                  Expandir todo
                </button>
                <button
                  onClick={collapseAllCurrent}
                  class="text-sm bg-white/20 hover:bg-white/30 px-4 py-2.5 rounded-full font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
                >
                  Colapsar
                </button>
                <button
                  onClick={() => markBloque(!todoVisto)}
                  class="text-sm bg-white text-gray-900 hover:bg-slate-100 px-4 py-2.5 rounded-full font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
                >
                  {!todoVisto ? "✓ Marcar bloque completo" : "↩ Desmarcar bloque"}
                </button>
              </div>
            </section>

            {/* Índice rápido */}
            <nav class="mt-5 flex items-center gap-2 overflow-x-auto pb-2" aria-label="Temas del bloque">
              <span class="shrink-0 text-sm font-semibold text-slate-500 mr-1">Ir al tema:</span>
              {bloque.subtemas.map((s) => (
                <a
                  key={s.id}
                  href={`#tema-${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setExpanded((p) => ({ ...p, [s.id]: true }));
                    setTimeout(
                      () =>
                        document
                          .getElementById(`tema-${s.id}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                      30
                    );
                  }}
                  class={`shrink-0 text-sm px-4 py-2 rounded-full border-2 font-bold transition ${FOCO} ${
                    done[s.id]
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-600 hover:border-[#7C5CE9] hover:text-[#5932EA]"
                  }`}
                  title={s.titulo}
                >
                  {done[s.id] ? "✓ " : ""}
                  {s.codigo}
                </a>
              ))}
            </nav>

            {/* Temas */}
            <div class="mt-3 grid gap-4">
              {bloque.subtemas.map((s, i) => {
                const isOpen = !!expanded[s.id];
                const isDone = !!done[s.id];

                return (
                  <article
                    key={s.id}
                    id={`tema-${s.id}`}
                    class={`bg-white border-2 rounded-3xl overflow-hidden scroll-mt-32 transition ${
                      isOpen ? `${theme.border} shadow-lg` : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Cabecera clicable */}
                    <button
                      onClick={() => toggleExpand(s.id)}
                      aria-expanded={isOpen}
                      class={`w-full text-left p-5 sm:p-6 flex items-start gap-4 hover:bg-slate-50/70 cursor-pointer ${FOCO}`}
                    >
                      <span
                        class={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-base shrink-0 ${
                          isDone ? "bg-emerald-500 text-white" : `${theme.soft} ${theme.softText}`
                        }`}
                      >
                        {isDone ? "✓" : s.codigo}
                      </span>
                      <span class="flex-1 min-w-0">
                        <span class="block text-sm font-semibold text-slate-400">
                          Tema {i + 1} de {bloque.subtemas.length} · {s.codigo}
                          {isDone && <span class="ml-2 text-emerald-600">· Visto</span>}
                        </span>
                        <span class="block font-extrabold leading-tight text-lg sm:text-xl text-slate-900 mt-0.5">
                          {s.titulo}
                        </span>
                        <span class="block text-sm sm:text-base text-slate-600 mt-1.5 leading-relaxed">
                          {s.descripcion}
                        </span>
                      </span>
                      <span
                        class={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition ${
                          isOpen ? `${theme.btnBg.split(" ")[0]} text-white rotate-180` : "bg-slate-100 text-slate-500"
                        }`}
                        aria-hidden="true"
                      >
                        ▾
                      </span>
                    </button>

                    {isOpen && (
                      <div class="px-5 sm:px-6 pb-6 pt-5 border-t border-slate-100 bg-slate-50/60">
                        <div class="flex flex-wrap items-center gap-3">
                          <a
                            href={`/lecciones/${s.id}`}
                            class={`px-6 py-3 rounded-2xl bg-[#5932EA] text-white text-base font-bold hover:bg-[#4E2AD0] transition shadow-xs ${FOCO}`}
                          >
                            📖 Abrir lección →
                          </a>
                          <button
                            onClick={() => toggleDone(s.id)}
                            class={`px-5 py-3 rounded-2xl text-base font-bold transition cursor-pointer border-2 ${FOCO} ${
                              isDone
                                ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                                : "bg-white border-slate-300 text-slate-700 hover:border-slate-500"
                            }`}
                          >
                            {isDone ? "✓ Visto — desmarcar" : "Marcar como visto"}
                          </button>
                          <span class={`text-sm font-bold px-3 py-1.5 rounded-full ${theme.soft} ${theme.softText}`}>
                            {bloque.tituloCorto}
                          </span>
                        </div>

                        <h4 class="text-sm font-extrabold uppercase tracking-widest text-slate-500 mt-6 mb-3">
                          Temáticas · {s.tematicas.length}
                        </h4>
                        <ul class="grid sm:grid-cols-2 gap-3">
                          {s.tematicas.map((t) => (
                            <li key={t} class="flex gap-3 text-[15px] leading-snug bg-white border border-slate-200 rounded-2xl px-4 py-3">
                              <span class={`${theme.dotColor} font-black`} aria-hidden="true">•</span>
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>

                        {s.actividad && (
                          <div class="mt-4 bg-amber-50 border-l-4 border-amber-400 rounded-2xl p-5">
                            <p class="text-base font-bold text-amber-900">⚡ Actividad sugerida</p>
                            <p class="text-[15px] text-amber-900/90 mt-1 leading-relaxed">{s.actividad}</p>
                          </div>
                        )}
                        {s.alcance && (
                          <div class="mt-4 bg-[#F3F0FF] border-l-4 border-[#7C5CE9] rounded-2xl p-5">
                            <p class="text-base font-bold text-[#4E2AD0]">📌 Alcance</p>
                            <p class="text-[15px] text-slate-700 mt-1 leading-relaxed">{s.alcance}</p>
                          </div>
                        )}
                        {s.referentes && (
                          <div class="mt-5">
                            <p class="text-sm font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                              Referentes
                            </p>
                            <ul class="text-[15px] text-slate-600 space-y-2">
                              {s.referentes.map((r) => (
                                <li key={r} class="flex gap-2.5">
                                  <span aria-hidden="true">📖</span>
                                  {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Navegación entre bloques */}
            <div class="mt-8 grid sm:grid-cols-2 gap-4">
              {prevBloque ? (
                <button
                  onClick={() => openBloque(prevBloque.id)}
                  class={`text-left bg-white border-2 border-slate-200 rounded-2xl p-5 hover:border-[#7C5CE9] transition cursor-pointer ${FOCO}`}
                >
                  <p class="text-sm text-slate-500">← Anterior</p>
                  <p class="font-bold text-lg mt-0.5">B{prevBloque.numero} · {prevBloque.titulo}</p>
                </button>
              ) : (
                <span />
              )}
              {nextBloque ? (
                <button
                  onClick={() => openBloque(nextBloque.id)}
                  class={`text-right bg-[#5932EA] text-white rounded-2xl p-5 hover:bg-[#4E2AD0] transition cursor-pointer ${FOCO}`}
                >
                  <p class="text-sm text-white/70">Siguiente →</p>
                  <p class="font-bold text-lg mt-0.5">B{nextBloque.numero} · {nextBloque.titulo}</p>
                </button>
              ) : (
                <button
                  onClick={goHome}
                  class={`text-right bg-emerald-600 text-white rounded-2xl p-5 hover:bg-emerald-700 transition cursor-pointer ${FOCO}`}
                >
                  <p class="text-sm text-white/80">Fin del recorrido →</p>
                  <p class="font-bold text-lg mt-0.5">Volver a la portada</p>
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}