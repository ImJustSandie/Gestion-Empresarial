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

export default function AlfabetizacionView() {
  // bloqueId === null => portada con los 5 bloques protagonistas
  // Se puede enlazar directo con ?bloque=<id> (usado por el botón "volver" de /lecciones/[id])
  // El bloque inicial se resuelve de forma síncrona desde ?bloque=<id> para no
  // mostrar la portada y luego cambiar (parpadeo al volver desde /lecciones/[id]).
  // Además se espera al montaje antes de pintar, para no mostrar contenido equivocado.
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
      // Solo el primer tema expandido por defecto
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

  return (
    <div class="min-h-screen">
      {/* Barra superior de la sección (solo ruta + progreso) */}
      <div class="sticky top-[57px] md:top-[61px] z-20 bg-white/90 backdrop-blur border-b">
        <div class="container mx-auto px-4 py-2.5 flex items-center gap-2">
          <button onClick={goHome} class="text-sm font-bold hover:underline truncate">
            {bloque ? <span><span class="text-gray-400 font-normal">Alfabetización /</span> B{bloque.numero} · {bloque.tituloCorto}</span> : "Alfabetización IA"}
          </button>

          <div class="ml-auto flex items-center gap-3">
            <div class="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <span>{completedCount}/{TOTAL_SUBTEMAS}</span>
              <div class="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span class="font-bold text-gray-700">{pct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PORTADA: bloques protagonistas ===== */}
      {bloque === null && (
        <div class="container mx-auto px-4 py-6 sm:py-10">
          <div class="text-center max-w-2xl mx-auto mb-8">
            <p class="text-xs font-bold uppercase tracking-widest text-indigo-600">Módulo de alfabetización · IA generativa</p>
            <h1 class="text-3xl sm:text-4xl font-extrabold mt-2">Elige un bloque para empezar</h1>
            <p class="text-sm text-gray-600 mt-2">
              {BLOQUES_ALFABETIZACION.length} bloques · {TOTAL_SUBTEMAS} temas · contenido en <span class="font-mono text-xs bg-gray-100 px-1 rounded">content/blocks/</span> (editor <span class="font-mono text-xs bg-gray-100 px-1 rounded">/editor</span>)
            </p>
          </div>

          <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {BLOQUES_ALFABETIZACION.map((b) => {
              const st = BLOQUE_STYLES[b.color] ?? BLOQUE_STYLES.indigo;
              const nDone = b.subtemas.filter((s) => done[s.id]).length;
              const bpct = Math.round((nDone / b.subtemas.length) * 100);
              return (
                <article key={b.id} class={`bg-white border-2 rounded-3xl overflow-hidden flex flex-col ${st.border} transition hover:shadow-xl`}>
                  {/* Hero del bloque */}
                  <div class={`bg-gradient-to-br ${st.hero} text-white p-6 relative overflow-hidden`}>
                    <span class="absolute -right-4 -bottom-6 text-[110px] opacity-20 select-none leading-none">{b.icono}</span>
                    <span class="inline-block text-[11px] font-extrabold tracking-widest bg-white/20 px-2 py-1 rounded-lg">BLOQUE {b.numero}</span>
                    <h2 class="text-2xl font-extrabold mt-2 leading-tight relative">{b.titulo}</h2>
                    <p class="text-sm text-white/85 mt-1 relative">{b.subtemas.length} temas · {b.subtemas[0].codigo} – {b.subtemas[b.subtemas.length - 1].codigo}</p>
                  </div>
                  <div class="p-5 flex-1 flex flex-col">
                    <p class="text-sm text-gray-600 flex-1">{b.descripcion}</p>
                    {/* Mini índice */}
                    <ul class="mt-3 space-y-1">
                      {b.subtemas.slice(0, 3).map((s) => (
                        <li key={s.id} class="text-xs text-gray-500 truncate">· <span class="font-mono text-gray-400">{s.codigo}</span> {s.titulo}</li>
                      ))}
                      {b.subtemas.length > 3 && <li class="text-xs text-gray-400">· +{b.subtemas.length - 3} temas más…</li>}
                    </ul>
                    <div class="mt-3">
                      <div class="flex justify-between text-xs text-gray-500 mb-1"><span>{nDone}/{b.subtemas.length} vistos</span><span class="font-bold">{bpct}%</span></div>
                      <div class="h-2 bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-gray-900" style={{ width: `${bpct}%` }} /></div>
                    </div>
                    <button onClick={() => openBloque(b.id)} class="mt-4 w-full px-4 py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition">
                      Abrir bloque {b.numero} →
                    </button>
                  </div>
                </article>
              );
            })}

            {/* Tarjeta progreso */}
            <article class="bg-gray-900 text-white rounded-3xl p-6 flex flex-col justify-center">
              <p class="text-xs uppercase tracking-widest text-white/60 font-bold">Tu avance</p>
              <p class="text-4xl font-extrabold mt-1">{pct}%</p>
              <p class="text-sm text-white/70">{completedCount} de {TOTAL_SUBTEMAS} temas marcados como vistos.</p>
            </article>
          </div>

          {/* Módulo diferenciado: Laboratorio de actividades */}
          <a href="/alfabetizacion/actividades" class="mt-4 block rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-emerald-950 text-white p-6 sm:p-8 relative hover:shadow-2xl transition group">
            <span class="absolute -right-4 -bottom-8 text-[130px] opacity-20 select-none leading-none group-hover:scale-105 transition">🧪</span>
            <div class="relative">
              <span class="inline-block text-[11px] font-extrabold tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded-lg">MÓDULO · ACTIVIDADES</span>
              <h2 class="text-2xl sm:text-3xl font-extrabold mt-2">Laboratorio de actividades</h2>
              <p class="text-sm text-white/75 mt-1 max-w-2xl">¿Cuál respuesta elegirías? · Detector de alucinaciones forense · Prompt lab. Evalúa y construye con IA sin necesidad de una IA real.</p>
              <span class="inline-block mt-4 px-5 py-2.5 rounded-xl bg-white text-gray-900 text-sm font-bold group-hover:bg-emerald-300 transition">Entrar al laboratorio →</span>
            </div>
          </a>
        </div>
      )}

      {/* ===== VISTA BLOQUE: todos los temas ===== */}
      {bloque !== null && (() => {
        const st = BLOQUE_STYLES[bloque.color] ?? BLOQUE_STYLES.indigo;
        const nDone = bloque.subtemas.filter((s) => done[s.id]).length;
        const bpct = Math.round((nDone / bloque.subtemas.length) * 100);
        return (
          <div class="container mx-auto px-4 py-6 sm:py-8">
            {/* Hero protagonista del bloque */}
            <section class={`rounded-3xl overflow-hidden bg-gradient-to-br ${st.hero} text-white p-6 sm:p-10 relative`}>
              <span class="absolute right-4 top-4 text-[90px] sm:text-[140px] opacity-20 select-none leading-none">{bloque.icono}</span>
              <button onClick={goHome} class="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-semibold relative">← Todos los bloques</button>
              <p class="mt-4 text-xs font-extrabold tracking-widest bg-white/20 inline-block px-2 py-1 rounded-lg relative">BLOQUE {bloque.numero} · {bloque.subtemas.length} TEMAS</p>
              <h1 class="text-3xl sm:text-5xl font-extrabold mt-2 leading-tight relative max-w-3xl">{bloque.titulo}</h1>
              <p class="mt-2 text-white/85 max-w-2xl text-sm sm:text-base relative">{bloque.descripcion}</p>
              <div class="mt-4 flex flex-wrap items-center gap-2 relative">
                <span class="text-xs bg-white text-gray-900 font-bold px-3 py-1.5 rounded-full">{nDone}/{bloque.subtemas.length} vistos · {bpct}%</span>
                <button onClick={expandAllCurrent} class="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-semibold">Expandir todo</button>
                <button onClick={collapseAllCurrent} class="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-semibold">Colapsar</button>
                <button onClick={() => markBloque(nDone < bloque.subtemas.length)} class="text-xs bg-white text-gray-900 px-3 py-1.5 rounded-full font-bold">
                  {nDone < bloque.subtemas.length ? "✓ Marcar bloque completo" : "↩ Desmarcar bloque"}
                </button>
              </div>
              <div class="mt-3 h-2 bg-white/25 rounded-full overflow-hidden relative max-w-xl">
                <div class="h-full bg-white rounded-full transition-all" style={{ width: `${bpct}%` }} />
              </div>
            </section>

            {/* Índice rápido */}
            <div class="mt-4 flex gap-2 overflow-x-auto pb-1">
              {bloque.subtemas.map((s, i) => (
                <a
                  key={s.id}
                  href={`#tema-${s.id}`}
                  onClick={(e) => { e.preventDefault(); setExpanded((p) => ({ ...p, [s.id]: true })); setTimeout(() => document.getElementById(`tema-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30); }}
                  class={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-semibold ${done[s.id] ? "bg-emerald-100 border-emerald-200 text-emerald-800" : "bg-white text-gray-600 hover:border-gray-400"}`}
                  title={s.titulo}
                >
                  {done[s.id] ? "✓ " : ""}{s.codigo}
                </a>
              ))}
            </div>

            {/* Todos los temas distribuidos */}
            <div class="mt-4 grid gap-3">
              {bloque.subtemas.map((s, i) => {
                const isOpen = !!expanded[s.id];
                const isDone = !!done[s.id];
  // Retrasa el primer pintado hasta el montaje: evita el parpadeo de mostrar la
  // portada un instante cuando se vuelve desde una lección con ?bloque=<id>.
  if (!mounted) {
    return (
      <div class="min-h-screen">
        <div class="container mx-auto px-4 py-10 max-w-2xl">
          <div class="h-4 w-48 bg-gray-200 animate-pulse rounded mb-3" />
          <div class="h-8 w-3/4 bg-gray-200 animate-pulse rounded mb-2" />
          <div class="h-4 w-full bg-gray-100 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
                  <article key={s.id} id={`tema-${s.id}`} class={`bg-white border-2 rounded-2xl overflow-hidden scroll-mt-32 transition ${isOpen ? "border-gray-900 shadow-lg" : "border-gray-200"} ${isDone ? "opacity-95" : ""}`}>
                    {/* Cabecera clicable */}
                    <button onClick={() => toggleExpand(s.id)} class="w-full text-left p-4 sm:p-5 flex items-start gap-3 hover:bg-gray-50/60">
                      <span class={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 border ${isDone ? "bg-emerald-500 border-emerald-500 text-white" : "bg-gray-900 text-white"}`}>
                        {isDone ? "✓" : s.codigo}
                      </span>
                      <span class="flex-1 min-w-0">
                        <span class="block text-[11px] font-mono text-gray-400">Tema {i + 1}/{bloque.subtemas.length} · {s.codigo}</span>
                        <span class="block font-bold leading-tight text-base sm:text-lg">{s.titulo}</span>
                        <span class="block text-sm text-gray-600 mt-0.5">{s.descripcion}</span>
                      </span>
                      <span class={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition ${isOpen ? "bg-gray-900 text-white rotate-180" : "text-gray-400"}`}>▾</span>
                    </button>

                    {isOpen && (
                      <div class="px-4 sm:px-5 pb-5 pt-1 border-t bg-gray-50/50">
                        <div class="py-3 flex flex-wrap items-center gap-2">
                          <button onClick={() => toggleDone(s.id)} class={`px-4 py-2 rounded-xl text-sm font-bold transition ${isDone ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-900 text-white hover:bg-gray-700"}`}>
                            {isDone ? "✓ Visto — desmarcar" : "Marcar como visto"}
                          </button>
                          <a href={`/lecciones/${s.id}`} class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition">
                            📖 Abrir lección →
                          </a>
                          <span class={`text-xs font-bold px-2 py-1 rounded-full border ${st.badge}`}>{bloque.tituloCorto}</span>
                        </div>

                        <h4 class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Temáticas · {s.tematicas.length}</h4>
                        <ul class="grid sm:grid-cols-2 gap-2">
                          {s.tematicas.map((t) => (
                            <li key={t} class="flex gap-2 text-sm bg-white border rounded-xl px-3 py-2">
                              <span class={`${st.accent} font-bold`}>•</span>{t}
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
                            <p class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Referentes</p>
                            <ul class="text-sm text-gray-600 space-y-1">
                              {s.referentes.map((r) => (
                                <li key={r} class="flex gap-2"><span>📖</span>{r}</li>
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
                <button onClick={() => openBloque(prevBloque.id)} class="text-left bg-white border rounded-2xl p-4 hover:border-gray-400">
                  <p class="text-xs text-gray-500">← Anterior</p>
                  <p class="font-bold">B{prevBloque.numero} · {prevBloque.titulo}</p>
                </button>
              ) : <span />}
              {nextBloque ? (
                <button onClick={() => openBloque(nextBloque.id)} class="text-right bg-gray-900 text-white rounded-2xl p-4 hover:bg-gray-700">
                  <p class="text-xs text-white/60">Siguiente →</p>
                  <p class="font-bold">B{nextBloque.numero} · {nextBloque.titulo}</p>
                </button>
              ) : (
                <button onClick={goHome} class="text-right bg-emerald-600 text-white rounded-2xl p-4 hover:bg-emerald-700">
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
