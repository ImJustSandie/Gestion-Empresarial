// src/components/ElegirRespuesta.tsx
// Actividad 1 ("¿Cuál respuesta elegirías?"): el estudiante recibe un problema
// y tres respuestas de IA (superficial / detallada con un dato falso /
// contextualizada con fuentes). Elige una, comprueba y recibe retroalimentación.
import { useState } from "preact/hooks";
import { loadActividades, saveActividades, type ActividadElegir } from "../utils/alfabetizacionActividades";

const FOCO = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5932EA]/40";
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
    <article class="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
      <div class="bg-gradient-to-br from-[#5932EA] via-[#4E2AD0] to-[#7C5CE9] text-white p-6 sm:p-9 relative overflow-hidden">
        <span class="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" aria-hidden="true" />
        <span class="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:16px_16px]" aria-hidden="true" />
        <span class="absolute -right-3 -bottom-8 text-[120px] opacity-20 select-none leading-none" aria-hidden="true">⚖️</span>
        <span class="relative inline-block text-xs font-extrabold tracking-widest bg-white/20 px-3 py-1.5 rounded-full">ACTIVIDAD {numero} · EVALUAR RESPUESTAS</span>
        <h2 class="relative text-2xl sm:text-4xl font-extrabold mt-3 leading-tight">{act.titulo}</h2>
        <p class="relative text-base sm:text-lg text-white/90 mt-3 max-w-2xl leading-relaxed">{act.contexto}</p>
      </div>

      <div class="p-5 sm:p-8">
        <div class="bg-amber-50 border-l-4 border-amber-400 rounded-2xl p-5">
          <p class="text-xs font-extrabold tracking-widest text-amber-700">EL PROBLEMA PLANTEADO A LA IA</p>
          <p class="font-bold text-lg sm:text-xl text-slate-900 mt-1.5 leading-snug">{act.problema}</p>
        </div>

        <p class="text-sm font-semibold text-slate-500 mt-7 mb-3">{comprobado ? "Así quedó tu elección:" : "Lee las tres respuestas y elige la mejor:"}</p>
        <div class="grid gap-4">
          {act.opciones.map((op) => {
            const esSeleccion = seleccion === op.id;
            const esCorrecta = op.id === act.correcta;
            let estilo = "border-slate-200 hover:border-[#7C5CE9] hover:bg-[#FBFAFF] bg-white";
            let insignia = "bg-slate-100 text-slate-700";
            if (comprobado && esCorrecta) {
              estilo = "border-emerald-500 bg-emerald-50";
              insignia = "bg-emerald-600 text-white";
            } else if (comprobado && esSeleccion && !esCorrecta) {
              estilo = "border-rose-500 bg-rose-50";
              insignia = "bg-rose-600 text-white";
            } else if (comprobado) {
              estilo = "border-slate-200 bg-white opacity-60";
            } else if (esSeleccion) {
              estilo = "border-[#5932EA] bg-[#F3F0FF] ring-4 ring-[#5932EA]/15";
              insignia = "bg-[#5932EA] text-white";
            }
            return (
              <button
                key={op.id}
                disabled={comprobado}
                onClick={() => setSeleccion(op.id)}
                aria-pressed={esSeleccion}
                class={`w-full text-left border-2 rounded-2xl p-5 flex items-start gap-4 transition ${FOCO} ${estilo} ${comprobado ? "cursor-default" : "cursor-pointer"}`}
              >
                <span class={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-extrabold shrink-0 ${insignia}`}>
                  {comprobado && esCorrecta ? "✓" : op.id}
                </span>
                <span class="min-w-0">
                  <span class="block text-sm font-bold text-slate-400">Respuesta {op.id}</span>
                  <span class="block text-base leading-7 text-slate-800 mt-0.5">{op.texto}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div class="mt-6">
          {!comprobado ? (
            <button
              onClick={comprobar}
              disabled={!seleccion}
              class={`px-8 py-3.5 rounded-2xl text-base font-bold transition ${FOCO} ${!seleccion ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-[#5932EA] text-white hover:bg-[#4E2AD0] shadow-sm cursor-pointer"}`}
            >
              Comprobar elección
            </button>
          ) : (
            <button onClick={reintentar} class={`px-8 py-3.5 rounded-2xl text-base font-bold bg-white border-2 border-slate-300 text-slate-800 hover:border-slate-500 transition cursor-pointer ${FOCO}`}>
              ↩ Intentar de nuevo
            </button>
          )}
        </div>

        {comprobado && seleccion && (
          <div class={`mt-6 rounded-2xl p-5 sm:p-6 border-2 flex gap-4 ${acierto ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`} role="status">
            <span class="text-3xl leading-none shrink-0" aria-hidden="true">{acierto ? "🎉" : "🤔"}</span>
            <div class="min-w-0">
              <p class={`text-lg font-extrabold ${acierto ? "text-emerald-800" : "text-rose-800"}`}>
                {acierto ? "✓ ¡Elegiste la mejor respuesta!" : `✕ Elegiste la ${seleccion}. Mira por qué no es la mejor.`}
              </p>
              <p class={`text-base leading-7 mt-1.5 ${acierto ? "text-emerald-900" : "text-rose-900"}`}>{act.retro[seleccion]}</p>
              {!acierto && (
                <p class="text-base leading-7 mt-3 text-slate-700 bg-white/70 rounded-xl p-3">
                  <b>Pista forense:</b> {act.detalleFalso}
                </p>
              )}
              <p class="text-sm leading-6 mt-4 text-slate-500">
                Criterios usados: <b>exactitud</b> (¿los datos son verificables?), <b>relevancia</b> (¿responde con el nivel necesario?) y <b>fuentes</b> (¿permite contrastar?).
              </p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}