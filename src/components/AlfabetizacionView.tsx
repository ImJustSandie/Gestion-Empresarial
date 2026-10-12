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

const BLOQUE_STYLES: Record<string, { hero: string; badge: string; border: string; accent: string }> = {
  emerald: {
    hero: "from-emerald-600 via-emerald-700 to-teal-800",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    border: "hover:border-emerald-400",
    accent: "text-emerald-600",
  },
  indigo: {
    hero: "from-indigo-600 via-indigo-700 to-violet-800",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
    border: "hover:border-indigo-400",
    accent: "text-indigo-600",
  },
  amber: {
    hero: "from-amber-500 via-orange-600 to-orange-700",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    border: "hover:border-amber-400",
    accent: "text-amber-600",
  },
  rose: {
    hero: "from-rose-600 via-rose-700 to-pink-800",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    border: "hover:border-rose-400",
    accent: "text-rose-600",
  },
  violet: {
    hero: "from-violet-600 via-purple-700 to-purple-900",
    badge: "bg-violet-100 text-violet-800 border-violet-200",
    border: "hover:border-violet-400",
    accent: "text-violet-600",
  },
};

const NIVEL_THEMES: Record<number, {
  headerBg: string;
  btnBg: string;
  barBg: string;
  dotColor: string;
  icon: string;
}> = {
  1: {
    headerBg: "bg-gradient-to-br from-[#6A42C2] to-[#8B5CF6]",
    btnBg: "bg-[#6A42C2] hover:bg-[#5833A8]",
    barBg: "bg-[#6A42C2]",
    dotColor: "text-[#6A42C2]",
    icon: "🧠",
  },
  2: {
    headerBg: "bg-gradient-to-br from-[#00897B] to-[#10B981]",
    btnBg: "bg-[#00897B] hover:bg-[#007266]",
    barBg: "bg-[#00897B]",
    dotColor: "text-[#00897B]",
    icon: "💬",
  },
  3: {
    headerBg: "bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6]",
    btnBg: "bg-[#1D4ED8] hover:bg-[#1E40AF]",
    barBg: "bg-[#1D4ED8]",
    dotColor: "text-[#1D4ED8]",
    icon: "🔍",
  },
  4: {
    headerBg: "bg-gradient-to-br from-[#E11D48] to-[#F43F5E]",
    btnBg: "bg-[#E11D48] hover:bg-[#BE123C]",
    barBg: "bg-[#E11D48]",
    dotColor: "text-[#E11D48]",
    icon: "🛡️",
  },
  5: {
    headerBg: "bg-gradient-to-br from-[#EA580C] to-[#F97316]",
    btnBg: "bg-[#EA580C] hover:bg-[#C2410C]",
    barBg: "bg-[#EA580C]",
    dotColor: "text-[#EA580C]",
    icon: "📦",
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

  return (
    <div class="min-h-screen">
      {/* Barra superior de la sección (ruta + progreso) */}
      <div class="sticky top-[57px] md:top-[61px] z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div class="w-full px-6 sm:px-10 lg:px-14 py-2.5 flex items-center justify-between gap-4">
          <button onClick={goHome} class="text-sm font-bold hover:underline truncate cursor-pointer text-slate-800">
            {bloque ? (
              <span>
                <span class="text-slate-400 font-normal">Alfabetización /</span> B{bloque.numero} · {bloque.tituloCorto}
              </span>
            ) : (
              "Alfabetización IA"
            )}
          </button>

          <div class="flex items-center gap-3">
            <div class="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span>{completedCount}/{TOTAL_SUBTEMAS} vistos</span>
              <div class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-[#5932EA] transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span class="font-bold text-slate-700">{pct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PORTADA: 5 Bloques de Alfabetización según Imagen 2 ===== */}
      {bloque === null && (
        <div class="w-full px-6 sm:px-10 lg:px-14 py-8">
          {/* Tarjeta de Progreso General (Superior) */}
          <div class="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
            {/* Lado izquierdo: Anillo de porcentaje y texto */}
            <div class="flex items-center gap-5 w-full md:w-auto">
              <div class="relative w-20 h-20 shrink-0">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
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
                <div class="absolute inset-0 flex items-center justify-center font-black text-slate-900 text-lg">
                  {pct}%
                </div>
              </div>
              <div>
                <p class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  TU PROGRESO GENERAL
                </p>
                <h3 class="text-xl font-black text-slate-900 mt-0.5">
                  {pct}% completado
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  Vas muy bien. Continúa con el siguiente nivel para seguir avanzando.
                </p>
              </div>
            </div>

            {/* Centro: Barra de niveles */}
            <div class="flex flex-col items-start gap-1.5 w-full md:w-auto">
              <div class="w-full sm:w-64 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-[#5932EA] to-[#7C5CE9] rounded-full transition-all duration-500"
                  style={{ width: `${(completedBlocksCount / BLOQUES_ALFABETIZACION.length) * 100}%` }}
                />
              </div>
              <p class="text-xs text-slate-400 font-medium">
                {completedBlocksCount} de {BLOQUES_ALFABETIZACION.length} niveles completados
              </p>
            </div>

            {/* Derecha: Consejo con foco */}
            <div class="flex items-center gap-3.5 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 max-w-xs w-full md:w-auto">
              <div class="w-10 h-10 rounded-full bg-[#EDE9FE] flex items-center justify-center text-[#5932EA] shrink-0 text-lg">
                💡
              </div>
              <div class="text-xs text-slate-600 leading-snug">
                <p>La alfabetización en IA es el primer paso para un futuro más consciente.</p>
                <span class="text-[#5932EA] font-bold block mt-0.5">→</span>
              </div>
            </div>
          </div>

          {/* Encabezado de la Sección */}
          <div class="mb-8">
            <p class="text-[11px] font-extrabold uppercase tracking-widest text-[#5932EA] mb-1">
              NIVELES DE ALFABETIZACIÓN IA
            </p>
            <h2 class="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
              Elige un bloque para empezar
            </h2>
            <p class="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
              Cada nivel te acerca a un uso más consciente, crítico y creativo de la inteligencia artificial. Completa los cinco niveles para dominar las competencias esenciales de la era de la IA.
            </p>
          </div>

          {/* Tarjetas de niveles en dos grupos: Niveles 1–3 y Niveles 4–5 */}
          {[[0, 1, 2], [3, 4]].map((group, gi) => (
          <div class={gi === 0 ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch mb-10" : "flex flex-col sm:flex-row justify-center gap-4 items-stretch"}>
            {group.map((i) => {
              const b = BLOQUES_ALFABETIZACION[i];
              const theme = NIVEL_THEMES[b.numero] ?? NIVEL_THEMES[1];
              const nDone = b.subtemas.filter((s) => done[s.id]).length;
              const bpct = Math.round((nDone / b.subtemas.length) * 100);

              return (
                <article
                  key={b.id}
                  class={`${gi === 1 ? "w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc((100%-2rem)/3)]" : ""} bg-white border border-slate-200/90 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-all group`}
                >
                  <div>
                    {/* Cabecera con color característico del Nivel */}
                    <div
                      class={`${theme.headerBg} text-white p-4 sm:p-5 relative overflow-hidden min-h-[140px] flex flex-col justify-between`}
                    >
                      <span class="absolute -right-2 -bottom-2 text-5xl opacity-40 select-none group-hover:scale-110 transition-transform">
                        {theme.icon}
                      </span>

                      <span class="inline-block text-[10px] font-extrabold tracking-widest bg-white/20 px-2 py-0.5 rounded-full uppercase w-fit backdrop-blur-xs">
                        NIVEL {b.numero}
                      </span>

                      <h3 class="text-base font-extrabold mt-2 leading-snug relative pr-6">
                        {b.titulo}
                      </h3>
                    </div>

                    {/* Contenido con textos reales del proyecto */}
                    <div class="p-4 sm:p-5 flex-1 flex flex-col min-h-[190px]">
                      <p class="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
                        {b.descripcion}
                      </p>

                      {/* Temas principales */}
                      <div class="mb-4">
                        <p class="text-[11px] font-bold text-slate-700 mb-1.5">
                          Temas principales
                        </p>
                        <ul class="space-y-1">
                          {b.subtemas.slice(0, 3).map((s) => (
                            <li key={s.id} class="text-xs text-slate-500 truncate flex items-center gap-1.5">
                              <span class={`${theme.dotColor} text-base leading-none`}>•</span>
                              <span class="truncate">{s.titulo}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Barra de progreso y botón de acción */}
                  <div class="p-4 sm:p-5 pt-0">
                    <div class="mb-3">
                      <div class="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{nDone}/{b.subtemas.length} vistos</span>
                        <span class="font-bold">{bpct}%</span>
                      </div>
                      <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          class={`h-full ${theme.barBg} transition-all duration-300`}
                          style={{ width: `${bpct}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => openBloque(b.id)}
                      class={`w-full py-2.5 px-3 rounded-xl ${theme.btnBg} text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1`}
                    >
                      {nDone > 0 ? "Continuar →" : "Comenzar →"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          ))}

          {/* Módulo diferenciado: Laboratorio de actividades (se preserva tal cual) */}
          <a
            href="/alfabetizacion/actividades"
            class="block rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-emerald-950 text-white p-6 sm:p-8 relative hover:shadow-2xl transition group"
          >
            <span class="absolute -right-4 -bottom-8 text-[130px] opacity-20 select-none leading-none group-hover:scale-105 transition">
              🧪
            </span>
            <div class="relative">
              <span class="inline-block text-[11px] font-extrabold tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded-lg">
                MÓDULO · ACTIVIDADES
              </span>
              <h2 class="text-2xl sm:text-3xl font-extrabold mt-2">Laboratorio de actividades</h2>
              <p class="text-sm text-white/75 mt-1 max-w-2xl leading-relaxed">
                ¿Cuál respuesta elegirías? · Detector de alucinaciones forense · Prompt lab. Evalúa y construye con IA sin necesidad de una IA real.
              </p>
              <span class="inline-block mt-4 px-5 py-2.5 rounded-xl bg-white text-gray-900 text-sm font-bold group-hover:bg-emerald-300 transition">
                Entrar al laboratorio →
              </span>
            </div>
          </a>
        </div>
      )}

      {/* ===== VISTA DETALLADA DEL BLOQUE SELECCIONADO ===== */}
      {bloque !== null && (() => {
        const st = BLOQUE_STYLES[bloque.color] ?? BLOQUE_STYLES.indigo;
        const nDone = bloque.subtemas.filter((s) => done[s.id]).length;
        const bpct = Math.round((nDone / bloque.subtemas.length) * 100);

        return (
          <div class="w-full px-6 sm:px-10 lg:px-14 py-8">
            {/* Hero del bloque */}
            <section class={`rounded-3xl overflow-hidden bg-gradient-to-br ${st.hero} text-white p-6 sm:p-10 relative shadow-sm`}>
              <span class="absolute right-4 top-4 text-[90px] sm:text-[140px] opacity-20 select-none leading-none">
                {bloque.icono}
              </span>
              <button
                onClick={goHome}
                class="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-semibold relative cursor-pointer"
              >
                ← Todos los bloques
              </button>
              <p class="mt-4 text-xs font-extrabold tracking-widest bg-white/20 inline-block px-2 py-1 rounded-lg relative">
                BLOQUE {bloque.numero} · {bloque.subtemas.length} TEMAS
              </p>
              <h1 class="text-3xl sm:text-5xl font-extrabold mt-2 leading-tight relative max-w-3xl">
                {bloque.titulo}
              </h1>
              <p class="mt-2 text-white/85 max-w-2xl text-sm sm:text-base relative leading-relaxed">
                {bloque.descripcion}
              </p>
              <div class="mt-4 flex flex-wrap items-center gap-2 relative">
                <span class="text-xs bg-white text-gray-900 font-bold px-3 py-1.5 rounded-full">
                  {nDone}/{bloque.subtemas.length} vistos · {bpct}%
                </span>
                <button
                  onClick={expandAllCurrent}
                  class="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-semibold cursor-pointer"
                >
                  Expandir todo
                </button>
                <button
                  onClick={collapseAllCurrent}
                  class="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-semibold cursor-pointer"
                >
                  Colapsar
                </button>
                <button
                  onClick={() => markBloque(nDone < bloque.subtemas.length)}
                  class="text-xs bg-white text-gray-900 px-3 py-1.5 rounded-full font-bold cursor-pointer"
                >
                  {nDone < bloque.subtemas.length ? "✓ Marcar bloque completo" : "↩ Desmarcar bloque"}
                </button>
              </div>
              <div class="mt-3 h-2 bg-white/25 rounded-full overflow-hidden relative max-w-xl">
                <div class="h-full bg-white rounded-full transition-all" style={{ width: `${bpct}%` }} />
              </div>
            </section>

            {/* Índice rápido */}
            <div class="mt-4 flex gap-2 overflow-x-auto pb-1">
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
                  class={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-semibold ${
                    done[s.id]
                      ? "bg-emerald-100 border-emerald-200 text-emerald-800"
                      : "bg-white text-gray-600 hover:border-gray-400"
                  }`}
                  title={s.titulo}
                >
                  {done[s.id] ? "✓ " : ""}
                  {s.codigo}
                </a>
              ))}
            </div>

            {/* Todos los temas distribuidos */}
            <div class="mt-4 grid gap-3">
              {bloque.subtemas.map((s, i) => {
                const isOpen = !!expanded[s.id];
                const isDone = !!done[s.id];

                return (
                  <article
                    key={s.id}
                    id={`tema-${s.id}`}
                    class={`bg-white border-2 rounded-2xl overflow-hidden scroll-mt-32 transition ${
                      isOpen ? "border-gray-900 shadow-lg" : "border-gray-200"
                    } ${isDone ? "opacity-95" : ""}`}
                  >
                    {/* Cabecera clicable */}
                    <button
                      onClick={() => toggleExpand(s.id)}
                      class="w-full text-left p-4 sm:p-5 flex items-start gap-3 hover:bg-gray-50/60 cursor-pointer"
                    >
                      <span
                        class={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 border ${
                          isDone
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "bg-gray-900 text-white"
                        }`}
                      >
                        {isDone ? "✓" : s.codigo}
                      </span>
                      <span class="flex-1 min-w-0">
                        <span class="block text-[11px] font-mono text-gray-400">
                          Tema {i + 1}/{bloque.subtemas.length} · {s.codigo}
                        </span>
                        <span class="block font-bold leading-tight text-base sm:text-lg">
                          {s.titulo}
                        </span>
                        <span class="block text-sm text-gray-600 mt-0.5">
                          {s.descripcion}
                        </span>
                      </span>
                      <span
                        class={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition ${
                          isOpen ? "bg-gray-900 text-white rotate-180" : "text-gray-400"
                        }`}
                      >
                        ▾
                      </span>
                    </button>

                    {isOpen && (
                      <div class="px-4 sm:px-5 pb-5 pt-1 border-t bg-gray-50/50">
                        <div class="py-3 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => toggleDone(s.id)}
                            class={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                              isDone
                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                : "bg-gray-900 text-white hover:bg-gray-700"
                            }`}
                          >
                            {isDone ? "✓ Visto — desmarcar" : "Marcar como visto"}
                          </button>
                          <a
                            href={`/lecciones/${s.id}`}
                            class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition"
                          >
                            📖 Abrir lección →
                          </a>
                          <span class={`text-xs font-bold px-2 py-1 rounded-full border ${st.badge}`}>
                            {bloque.tituloCorto}
                          </span>
                        </div>

                        <h4 class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                          Temáticas · {s.tematicas.length}
                        </h4>
                        <ul class="grid sm:grid-cols-2 gap-2">
                          {s.tematicas.map((t) => (
                            <li key={t} class="flex gap-2 text-sm bg-white border rounded-xl px-3 py-2">
                              <span class={`${st.accent} font-bold`}>•</span>
                              {t}
                            </li>
                          ))}
                        </ul>

                        {s.actividad && (
                          <div class="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <p class="text-sm font-bold text-amber-800">⚡ Actividad sugerida</p>
                            <p class="text-sm text-amber-900 mt-1">{s.actividad}</p>
                          </div>
                        )}
                        {s.alcance && (
                          <div class="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <p class="text-sm font-bold text-blue-800">📌 Alcance</p>
                            <p class="text-sm text-blue-900 mt-1">{s.alcance}</p>
                          </div>
                        )}
                        {s.referentes && (
                          <div class="mt-3">
                            <p class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                              Referentes
                            </p>
                            <ul class="text-sm text-gray-600 space-y-1">
                              {s.referentes.map((r) => (
                                <li key={r} class="flex gap-2">
                                  <span>📖</span>
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
            <div class="mt-6 grid sm:grid-cols-2 gap-3">
              {prevBloque ? (
                <button
                  onClick={() => openBloque(prevBloque.id)}
                  class="text-left bg-white border rounded-2xl p-4 hover:border-gray-400 cursor-pointer"
                >
                  <p class="text-xs text-gray-500">← Anterior</p>
                  <p class="font-bold">B{prevBloque.numero} · {prevBloque.titulo}</p>
                </button>
              ) : (
                <span />
              )}
              {nextBloque ? (
                <button
                  onClick={() => openBloque(nextBloque.id)}
                  class="text-right bg-gray-900 text-white rounded-2xl p-4 hover:bg-gray-700 cursor-pointer"
                >
                  <p class="text-xs text-white/60">Siguiente →</p>
                  <p class="font-bold">B{nextBloque.numero} · {nextBloque.titulo}</p>
                </button>
              ) : (
                <button
                  onClick={goHome}
                  class="text-right bg-emerald-600 text-white rounded-2xl p-4 hover:bg-emerald-700 cursor-pointer"
                >
                  <p class="text-xs text-white/70">Fin del recorrido →</p>
                  <p class="font-bold">Volver a la portada</p>
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
