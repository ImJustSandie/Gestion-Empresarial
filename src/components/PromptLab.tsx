// src/components/PromptLab.tsx
// Actividad 3 ("Prompt lab"): el estudiante GENERA el prompt.
// Del banco de fragmentos selecciona los que sirven, descarta distractores
// y ordena su selección. Al comprobar recibe evaluación por criterios
// (selección, descarte y orden). Sin respuestas simuladas.
import { useState } from "preact/hooks";
import { loadActividades, saveActividades, type ActividadPromptLab } from "../utils/alfabetizacionActividades";
const FOCO = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/40";
export default function PromptLab({ act, numero }: { act: ActividadPromptLab; numero: number }) {
  const porId = new Map(act.piezas.map((p) => [p.id, p]));
  // El orden esperado lo define `orden`, no la posición en el banco (desordenado).
  const requeridas = act.piezas.filter((p) => p.requerida).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  const guardado = loadActividades().promptLab[act.id];
  const [orden, setOrden] = useState<string[]>(guardado ? guardado.piezas : []);
  const [generado, setGenerado] = useState<boolean>(!!guardado);

  const banco = act.piezas.filter((p) => !orden.includes(p.id));

  const agregar = (id: string) => {
    if (generado) return;
    setOrden((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };
  const quitar = (id: string) => {
    if (generado) return;
    setOrden((prev) => prev.filter((x) => x !== id));
  };
  const mover = (i: number, dir: -1 | 1) => {
    if (generado) return;
    setOrden((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  // --- Evaluación por criterios ---
  const faltantes = requeridas.filter((p) => !orden.includes(p.id));
  const intrusos = orden.map((id) => porId.get(id)!).filter((p) => !p.requerida);
  const elegidasRequeridas = orden.filter((id) => porId.get(id)?.requerida);
  const esperado = requeridas.map((p) => p.id);
  const ordenOk =
    elegidasRequeridas.length > 0 &&
    elegidasRequeridas.every((id, i) => esperado.indexOf(id) === esperado.indexOf(elegidasRequeridas[0]) + i);
  const exito = generado && faltantes.length === 0 && intrusos.length === 0 && ordenOk;

  const generar = () => {
    if (orden.length === 0) return;
    setGenerado(true);
    const prev = loadActividades();
    saveActividades({ ...prev, promptLab: { ...prev.promptLab, [act.id]: { piezas: orden, exito: faltantes.length === 0 && intrusos.length === 0 && ordenOk } } });
  };

  const modificar = () => setGenerado(false);
  const reiniciar = () => {
    setOrden([]);
    setGenerado(false);
    const prev = loadActividades();
    const next = { ...prev.promptLab };
    delete next[act.id];
    saveActividades({ ...prev, promptLab: next });
  };

  const promptFinal = [act.promptVago, ...orden.map((id) => porId.get(id)!.texto)].join(" ");

  return (
    <article class="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
      <div class="bg-gradient-to-br from-teal-600 via-emerald-700 to-green-800 text-white p-6 sm:p-9 relative overflow-hidden">
        <span class="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" aria-hidden="true" />
        <span class="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:16px_16px]" aria-hidden="true" />
        <span class="absolute -right-3 -bottom-8 text-[120px] opacity-20 select-none leading-none" aria-hidden="true">⚗️</span>
        <span class="relative inline-block text-xs font-extrabold tracking-widest bg-white/20 px-3 py-1.5 rounded-full">ACTIVIDAD {numero} · GENERA TU PROMPT</span>
        <h2 class="relative text-2xl sm:text-4xl font-extrabold mt-3 leading-tight">{act.titulo}</h2>
        <p class="relative text-base sm:text-lg text-white/90 mt-3 max-w-2xl leading-relaxed">{act.introduccion}</p>
      </div>

      <div class="p-5 sm:p-8 grid gap-8">
        {/* Misión */}
        <div class="rounded-2xl border-l-4 border-teal-500 bg-teal-50 p-5 sm:p-6">
          <p class="text-xs font-extrabold tracking-widest text-teal-700">🎯 TU MISIÓN</p>
          <p class="text-base sm:text-lg leading-7 mt-1.5 text-slate-800">{act.mision}</p>
          <p class="text-xs font-extrabold tracking-widest text-teal-700 mt-5">PUNTO DE PARTIDA (VAGO)</p>
          <p class="font-mono text-base mt-2 bg-white border border-teal-200 rounded-xl px-4 py-3 text-slate-800">“{act.promptVago}”</p>
        </div>

        {/* Paso 1 */}
        <section>
          <h3 class="flex items-start gap-3 mb-3">
            <span class="w-8 h-8 rounded-full bg-teal-600 text-white text-sm font-extrabold flex items-center justify-center shrink-0">1</span>
            <span class="text-base sm:text-lg font-bold text-slate-900 leading-snug pt-0.5">Selecciona del banco <span class="font-medium text-slate-500">(hay distractores: descártalos)</span></span>
          </h3>
          {banco.length === 0 ? (
            <p class="text-base text-slate-400 italic bg-slate-50 rounded-2xl p-4">Banco vacío: todo está en tu prompt o ya lo evaluaste.</p>
          ) : (
            <div class="grid gap-3">
              {banco.map((p, idx) => (
                <div key={p.id} class="border-2 border-slate-200 rounded-2xl p-4 flex items-center gap-4 bg-white">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-slate-400">Fragmento {idx + 1}</p>
                    <p class="text-base leading-7 text-slate-800 mt-0.5">{p.texto}</p>
                  </div>
                  <button
                    disabled={generado}
                    onClick={() => agregar(p.id)}
                    class={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition ${FOCO} ${generado ? "bg-slate-100 text-slate-300 cursor-default" : "bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"}`}
                  >
                    ＋ Añadir
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Paso 2 */}
        <section>
          <h3 class="flex items-start gap-3 mb-3">
            <span class="w-8 h-8 rounded-full bg-teal-600 text-white text-sm font-extrabold flex items-center justify-center shrink-0">2</span>
            <span class="text-base sm:text-lg font-bold text-slate-900 leading-snug pt-0.5">Ordena tu prompt <span class="font-medium text-slate-500">({orden.length} fragmentos)</span></span>
          </h3>
          {orden.length === 0 ? (
            <p class="text-base text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center">Añade fragmentos del banco en el orden en que deben ir.</p>
          ) : (
            <ol class="grid gap-3">
              {orden.map((id, i) => {
                const p = porId.get(id)!;
                return (
                  <li key={id} class="border-2 border-teal-500 bg-teal-50 rounded-2xl p-4 flex items-center gap-4">
                    <span class="w-9 h-9 rounded-full bg-teal-600 text-white text-sm font-extrabold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div class="flex-1 min-w-0">
                      <p class="text-base leading-7 text-slate-800">{p.texto}</p>
                    </div>
                    {!generado && (
                      <div class="flex gap-1.5 shrink-0">
                        <button onClick={() => mover(i, -1)} disabled={i === 0} class={`w-10 h-10 rounded-lg border border-slate-300 text-base disabled:opacity-30 bg-white hover:bg-slate-50 cursor-pointer ${FOCO}`} title="Subir" aria-label="Subir">↑</button>
                        <button onClick={() => mover(i, 1)} disabled={i === orden.length - 1} class={`w-10 h-10 rounded-lg border border-slate-300 text-base disabled:opacity-30 bg-white hover:bg-slate-50 cursor-pointer ${FOCO}`} title="Bajar" aria-label="Bajar">↓</button>
                        <button onClick={() => quitar(id)} class={`w-10 h-10 rounded-lg border border-rose-200 text-base text-rose-600 bg-white hover:bg-rose-50 cursor-pointer ${FOCO}`} title="Devolver al banco" aria-label="Devolver al banco">✕</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div class="flex flex-wrap gap-3">
          {!generado ? (
            <button
              onClick={generar}
              disabled={orden.length === 0}
              class={`px-8 py-3.5 rounded-2xl text-base font-bold transition ${FOCO} ${orden.length === 0 ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-teal-600 text-white hover:bg-teal-700 shadow-sm cursor-pointer"}`}
            >
              ⚗️ Generar mi prompt
            </button>
          ) : (
            <>
              <button onClick={modificar} class={`px-6 py-3.5 rounded-2xl text-base font-bold bg-teal-600 text-white hover:bg-teal-700 transition cursor-pointer ${FOCO}`}>↩ Seguir editando</button>
              <button onClick={reiniciar} class={`px-6 py-3.5 rounded-2xl text-base font-semibold border-2 border-slate-300 text-slate-700 hover:border-slate-500 transition cursor-pointer ${FOCO}`}>Vaciar laboratorio</button>
            </>
          )}
        </div>

        {/* Paso 3 */}
        {generado && (
          <section>
            <h3 class="flex items-start gap-3 mb-3">
              <span class="w-8 h-8 rounded-full bg-teal-600 text-white text-sm font-extrabold flex items-center justify-center shrink-0">3</span>
              <span class="text-base sm:text-lg font-bold text-slate-900 leading-snug pt-0.5">Tu prompt generado</span>
            </h3>
            <p class="text-base leading-8 bg-slate-900 text-slate-100 rounded-2xl p-5 font-mono">{promptFinal}</p>
            <div class={`mt-4 rounded-2xl p-5 sm:p-6 border-2 ${exito ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`} role="status">
              <p class={`text-lg font-extrabold ${exito ? "text-emerald-800" : "text-amber-800"}`}>
                {exito ? "✓ ¡Prompt de laboratorio aprobado! Lo armaste tú: completo, limpio y ordenado." : "✕ Tu prompt aún no está listo. Revisa los criterios y sigue editando."}
              </p>
              <ul class="mt-4 space-y-3 text-base leading-7">
                <li class="flex gap-3">
                  <span class={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-extrabold text-white shrink-0 ${faltantes.length === 0 ? "bg-emerald-600" : "bg-rose-600"}`}>{faltantes.length === 0 ? "✓" : "✕"}</span>
                  <span>
                    <b>Selección:</b>{" "}
                    {faltantes.length === 0 ? "incluiste las 4 piezas necesarias." : `te faltan: ${faltantes.map((p) => p.etiqueta).join(", ")}.`}
                  </span>
                </li>
                <li class="flex gap-3">
                  <span class={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-extrabold text-white shrink-0 ${intrusos.length === 0 ? "bg-emerald-600" : "bg-rose-600"}`}>{intrusos.length === 0 ? "✓" : "✕"}</span>
                  <span>
                    <b>Descarte:</b>{" "}
                    {intrusos.length === 0 ? "ningún distractor en tu prompt." : `descarta: ${intrusos.map((p) => p.etiqueta).join(", ")}.`}
                  </span>
                </li>
                {intrusos.map((p) => (
                  <li key={p.id} class="flex gap-3 text-slate-600 ml-10">
                    <span>→</span>
                    <span><b>{p.etiqueta}:</b> {p.porQue}</span>
                  </li>
                ))}
                <li class="flex gap-3">
                  <span class={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-extrabold text-white shrink-0 ${ordenOk ? "bg-emerald-600" : "bg-rose-600"}`}>{ordenOk ? "✓" : "✕"}</span>
                  <span>
                    <b>Orden:</b>{" "}
                    {ordenOk ? "objetivo → contexto → restricción → formato." : "reordena: primero el objetivo, luego el contexto y al final cómo entregarlo."}
                  </span>
                </li>
              </ul>
            </div>
          </section>
        )}
      </div>
    </article>
  );
}