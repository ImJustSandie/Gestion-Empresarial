// src/components/ElegirRespuesta.tsx
// Actividad 1 ("¿Cuál respuesta elegirías?"): el estudiante recibe un problema
// y tres respuestas de IA (superficial / detallada con un dato falso /
// contextualizada con fuentes). Elige una, comprueba y recibe retroalimentación.
import { useState } from "preact/hooks";
import { loadActividades, saveActividades, type ActividadElegir } from "../utils/alfabetizacionActividades";

export default function ElegirRespuesta({ act, numero }: { act: ActividadElegir; numero: number }) {
  const guardado = loadActividades().elegir[act.id];
  const [seleccion, setSeleccion] = useState<"A" | "B" | "C" | null>(guardado ? guardado.seleccion : null);
  const [comprobado, setComprobado] = useState<boolean>(!!guardado);
  const [acierto, setAcierto] = useState<boolean>(guardado ? guardado.acierto : false);

  const comprobar = () => {
    if (!seleccion) return;
    const ok = seleccion === act.correcta;
    setAcierto(ok);
    setComprobado(true);
    const prev = loadActividades();
    saveActividades({ ...prev, elegir: { ...prev.elegir, [act.id]: { seleccion, acierto: ok } } });
  };

  const reintentar = () => {
    setSeleccion(null);
    setComprobado(false);
    setAcierto(false);
    const prev = loadActividades();
    const next = { ...prev.elegir };
    delete next[act.id];
    saveActividades({ ...prev, elegir: next });
  };

  return (
    <article class="bg-white border-2 rounded-3xl overflow-hidden border-gray-200">
      <div class="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white p-6 sm:p-8 relative overflow-hidden">
        <span class="absolute -right-3 -bottom-8 text-[110px] opacity-20 select-none leading-none">⚖️</span>
        <span class="inline-block text-[11px] font-extrabold tracking-widest bg-white/20 px-2 py-1 rounded-lg relative">ACTIVIDAD {numero} · EVALUAR RESPUESTAS</span>
        <h2 class="text-2xl sm:text-3xl font-extrabold mt-2 relative">{act.titulo}</h2>
        <p class="text-sm text-white/85 mt-2 max-w-2xl relative">{act.contexto}</p>
      </div>

      <div class="p-5 sm:p-6">
        <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p class="text-[11px] font-extrabold tracking-widest text-amber-700">EL PROBLEMA PLANTEADO A LA IA</p>
          <p class="font-bold text-lg mt-1">{act.problema}</p>
        </div>

        <div class="grid gap-3 mt-4">
          {act.opciones.map((op) => {
            const esSeleccion = seleccion === op.id;
            const esCorrecta = op.id === act.correcta;
            let estilo = "border-gray-200 hover:border-indigo-400 bg-white";
            let insignia = "bg-gray-900 text-white";
            if (comprobado && esCorrecta) {
              estilo = "border-emerald-500 bg-emerald-50";
              insignia = "bg-emerald-600 text-white";
            } else if (comprobado && esSeleccion && !esCorrecta) {
              estilo = "border-rose-500 bg-rose-50";
              insignia = "bg-rose-600 text-white";
            } else if (!comprobado && esSeleccion) {
              estilo = "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600";
              insignia = "bg-indigo-600 text-white";
            }
            return (
              <button
                key={op.id}
                disabled={comprobado}
                onClick={() => setSeleccion(op.id)}
                class={`w-full text-left border-2 rounded-2xl p-4 flex items-start gap-3 transition ${estilo} ${comprobado ? "cursor-default" : "cursor-pointer"}`}
              >
                <span class={`w-9 h-9 rounded-2xl flex items-center justify-center font-extrabold shrink-0 ${insignia}`}>
                  {comprobado && esCorrecta ? "✓" : op.id}
                </span>
                <span>
                  <span class="block text-[11px] font-bold text-gray-400">Respuesta {op.id}</span>
                  <span class="block text-sm leading-relaxed mt-0.5">{op.texto}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div class="mt-4">
          {!comprobado ? (
            <button
              onClick={comprobar}
              disabled={!seleccion}
              class={`px-6 py-2.5 rounded-xl text-sm font-bold transition ${!seleccion ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
            >
              Comprobar elección
            </button>
          ) : (
            <button onClick={reintentar} class="px-6 py-2.5 rounded-xl text-sm font-bold bg-gray-900 text-white hover:bg-gray-700 transition">
              ↩ Intentar de nuevo
            </button>
          )}
        </div>

        {comprobado && seleccion && (
          <div class={`mt-4 rounded-2xl p-4 border ${acierto ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
            <p class={`text-sm font-extrabold ${acierto ? "text-emerald-800" : "text-rose-800"}`}>
              {acierto ? "✓ ¡Elegiste la mejor respuesta!" : `✕ Elegiste la ${seleccion}. Mira por qué no es la mejor.`}
            </p>
            <p class={`text-sm mt-1 ${acierto ? "text-emerald-900" : "text-rose-900"}`}>{act.retro[seleccion]}</p>
            {!acierto && (
              <p class="text-sm mt-2 text-gray-700">
                <b>Pista forense:</b> {act.detalleFalso}
              </p>
            )}
            <p class="text-xs mt-3 text-gray-500">
              Criterios usados: <b>exactitud</b> (¿los datos son verificables?), <b>relevancia</b> (¿responde con el nivel necesario?) y <b>fuentes</b> (¿permite contrastar?).
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
