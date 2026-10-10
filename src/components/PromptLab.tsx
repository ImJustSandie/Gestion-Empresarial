// src/components/PromptLab.tsx
// Actividad 3 ("Prompt lab"): el estudiante GENERA el prompt.
// Del banco de fragmentos selecciona los que sirven, descarta distractores
// y ordena su selección. Al comprobar recibe evaluación por criterios
// (selección, descarte y orden). Sin respuestas simuladas.
import { useState } from "preact/hooks";
import { loadActividades, saveActividades, type ActividadPromptLab } from "../utils/alfabetizacionActividades";

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
    <article class="bg-white border-2 rounded-3xl overflow-hidden border-gray-200">
      <div class="bg-gradient-to-br from-teal-600 via-emerald-700 to-green-800 text-white p-6 sm:p-8 relative overflow-hidden">
        <span class="absolute -right-3 -bottom-8 text-[110px] opacity-20 select-none leading-none">⚗️</span>
        <span class="inline-block text-[11px] font-extrabold tracking-widest bg-white/20 px-2 py-1 rounded-lg relative">ACTIVIDAD {numero} · GENERA TU PROMPT</span>
        <h2 class="text-2xl sm:text-3xl font-extrabold mt-2 relative">{act.titulo}</h2>
        <p class="text-sm text-white/85 mt-2 max-w-2xl relative">{act.introduccion}</p>
      </div>

      <div class="p-5 sm:p-6 grid gap-4">
        {/* Misión */}
        <div class="rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <p class="text-[11px] font-extrabold tracking-widest text-teal-700">🎯 TU MISIÓN</p>
          <p class="text-sm mt-1">{act.mision}</p>
          <p class="text-[11px] font-extrabold tracking-widest text-teal-700 mt-3">PUNTO DE PARTIDA (VAGO)</p>
          <p class="font-mono text-sm mt-1 bg-white border rounded-xl px-3 py-2">“{act.promptVago}”</p>
        </div>

        {/* Paso 1: banco de fragmentos */}
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Paso 1 · Selecciona del banco (hay distractores: descártalos)</p>
          {banco.length === 0 ? (
            <p class="text-sm text-gray-400 italic">Banco vacío: todo está en tu prompt o ya lo evaluaste.</p>
          ) : (
            <div class="grid gap-2">
              {banco.map((p, idx) => (
                <div key={p.id} class="border-2 border-gray-200 rounded-2xl p-3 flex items-start gap-3 bg-white">
                  <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold text-gray-400">Fragmento {idx + 1}</p>
                    <p class="text-sm font-mono mt-0.5">{p.texto}</p>
                  </div>
                  <button
                    disabled={generado}
                    onClick={() => agregar(p.id)}
                    class={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition ${generado ? "bg-gray-100 text-gray-300 cursor-default" : "bg-teal-600 text-white hover:bg-teal-700"}`}
                  >
                    ＋ Añadir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paso 2: tu prompt en orden */}
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Paso 2 · Ordena tu prompt ({orden.length} fragmentos)</p>
          {orden.length === 0 ? (
            <p class="text-sm text-gray-400 italic border-2 border-dashed rounded-2xl p-4 text-center">Añade fragmentos del banco en el orden en que deben ir.</p>
          ) : (
            <ol class="grid gap-2">
              {orden.map((id, i) => {
                const p = porId.get(id)!;
                return (
                  <li key={id} class="border-2 border-teal-600 bg-teal-50 rounded-2xl p-3 flex items-start gap-3">
                    <span class="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-mono">{p.texto}</p>
                    </div>
                    {!generado && (
                      <div class="flex flex-col gap-1 shrink-0">
                        <button onClick={() => mover(i, -1)} disabled={i === 0} class="px-2 py-0.5 rounded border text-xs disabled:opacity-30 bg-white" title="Subir">↑</button>
                        <button onClick={() => mover(i, 1)} disabled={i === orden.length - 1} class="px-2 py-0.5 rounded border text-xs disabled:opacity-30 bg-white" title="Bajar">↓</button>
                        <button onClick={() => quitar(id)} class="px-2 py-0.5 rounded border text-xs text-rose-600 bg-white" title="Devolver al banco">✕</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div class="flex flex-wrap gap-2">
          {!generado ? (
            <button
              onClick={generar}
              disabled={orden.length === 0}
              class={`px-6 py-2.5 rounded-xl text-sm font-bold transition ${orden.length === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-teal-600 text-white hover:bg-teal-700"}`}
            >
              ⚗️ Generar mi prompt
            </button>
          ) : (
            <>
              <button onClick={modificar} class="px-5 py-2.5 rounded-xl text-sm font-bold bg-gray-900 text-white hover:bg-gray-700 transition">↩ Seguir editando</button>
              <button onClick={reiniciar} class="px-5 py-2.5 rounded-xl text-sm font-semibold border hover:bg-gray-50 transition">Vaciar laboratorio</button>
            </>
          )}
        </div>

        {/* Paso 3: tu prompt generado + evaluación */}
        {generado && (
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Paso 3 · Tu prompt generado</p>
            <p class="text-sm leading-relaxed bg-gray-900 text-gray-100 rounded-2xl p-4 font-mono">{promptFinal}</p>
            <div class={`mt-3 rounded-2xl p-4 border ${exito ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <p class={`text-sm font-extrabold ${exito ? "text-emerald-800" : "text-amber-800"}`}>
                {exito ? "✓ ¡Prompt de laboratorio aprobado! Lo armaste tú: completo, limpio y ordenado." : "✕ Tu prompt aún no está listo. Revisa los criterios y sigue editando."}
              </p>
              <ul class="mt-2 space-y-1.5 text-sm">
                <li class="flex gap-2">
                  <span class={`font-extrabold ${faltantes.length === 0 ? "text-emerald-600" : "text-rose-600"}`}>{faltantes.length === 0 ? "✓" : "✕"}</span>
                  <span>
                    <b>Selección:</b>{" "}
                    {faltantes.length === 0 ? "incluiste las 4 piezas necesarias." : `te faltan: ${faltantes.map((p) => p.etiqueta).join(", ")}.`}
                  </span>
                </li>
                <li class="flex gap-2">
                  <span class={`font-extrabold ${intrusos.length === 0 ? "text-emerald-600" : "text-rose-600"}`}>{intrusos.length === 0 ? "✓" : "✕"}</span>
                  <span>
                    <b>Descarte:</b>{" "}
                    {intrusos.length === 0 ? "ningún distractor en tu prompt." : `descarta: ${intrusos.map((p) => p.etiqueta).join(", ")}.`}
                  </span>
                </li>
                {intrusos.map((p) => (
                  <li key={p.id} class="flex gap-2 text-sm text-gray-600 ml-6">
                    <span>→</span>
                    <span><b>{p.etiqueta}:</b> {p.porQue}</span>
                  </li>
                ))}
                <li class="flex gap-2">
                  <span class={`font-extrabold ${ordenOk ? "text-emerald-600" : "text-rose-600"}`}>{ordenOk ? "✓" : "✕"}</span>
                  <span>
                    <b>Orden:</b>{" "}
                    {ordenOk ? "objetivo → contexto → restricción → formato." : "reordena: primero el objetivo, luego el contexto y al final cómo entregarlo."}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
