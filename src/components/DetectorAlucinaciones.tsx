// src/components/DetectorAlucinaciones.tsx
// Actividad 2 ("Detector de alucinaciones"): modo investigador / forense digital.
// El estudiante clasifica cada afirmación (Correcta / Incorrecta / Necesita
// verificación) y luego pulsa cada una para ver la explicación.
import { useState } from "preact/hooks";
import {
  loadActividades,
  saveActividades,
  type ActividadDetector,
  type Veredicto,
} from "../utils/alfabetizacionActividades";

const VEREDICTOS: { id: Veredicto; etiqueta: string; estilos: string }[] = [
  { id: "correcta", etiqueta: "Correcta", estilos: "bg-emerald-600 text-white border-emerald-600" },
  { id: "incorrecta", etiqueta: "Incorrecta", estilos: "bg-rose-600 text-white border-rose-600" },
  { id: "pendiente", etiqueta: "Necesita verificación", estilos: "bg-amber-500 text-slate-950 border-amber-500" },
];

const PUNTO: Record<Veredicto, string> = {
  correcta: "bg-emerald-500",
  incorrecta: "bg-rose-500",
  pendiente: "bg-amber-500",
};

export default function DetectorAlucinaciones({ act, numero }: { act: ActividadDetector; numero: number }) {
  const [marcas, setMarcas] = useState<Record<string, Veredicto>>(() => loadActividades().detector[act.id] ?? {});
  const [revelado, setRevelado] = useState<boolean>(false);
  const [abierta, setAbierta] = useState<Record<string, boolean>>({});

  const todasMarcadas = act.afirmaciones.every((a) => marcas[a.id]);
  const aciertos = act.afirmaciones.filter((a) => marcas[a.id] === a.veredicto).length;

  const marcar = (id: string, v: Veredicto) => {
    if (revelado) return;
    const next = { ...marcas, [id]: v };
    setMarcas(next);
    const prev = loadActividades();
    saveActividades({ ...prev, detector: { ...prev.detector, [act.id]: next } });
  };

  const reiniciar = () => {
    setMarcas({});
    setRevelado(false);
    setAbierta({});
    const prev = loadActividades();
    const next = { ...prev.detector };
    delete next[act.id];
    saveActividades({ ...prev, detector: next });
  };

   return (
    <article class="rounded-3xl overflow-hidden border border-slate-700 bg-slate-950 text-slate-100 shadow-lg">
      {/* Cabecera forense */}
      <div class="p-6 sm:p-9 relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950">
        <div class="absolute inset-0 opacity-10 font-mono text-[10px] leading-5 whitespace-pre overflow-hidden select-none" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <p key={i}>SCAN&gt; bloque_{i.toString(16)} … hash_ok · verificando afirmaciones … █▓▒░</p>
          ))}
        </div>
        <div class="relative">
          <span class="inline-block text-xs font-extrabold tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-full">
             ACTIVIDAD {numero} · FORENSE DIGITAL
          </span>
          <h2 class="text-2xl sm:text-4xl font-extrabold mt-3 leading-tight">{act.titulo}</h2>
          <p class="text-base sm:text-lg text-slate-300 mt-3 max-w-2xl leading-relaxed">{act.introduccion}</p>
        </div>
      </div>

      <div class="p-5 sm:p-8">
        {/* Evidencia */}
        <div class="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
          <p class="text-xs font-extrabold tracking-widest text-emerald-300">📄 EVIDENCIA · TEXTO GENERADO POR LA IA</p>
          <p class="text-base sm:text-lg leading-8 mt-3 text-slate-100">“{act.textoIA}”</p>
        </div>

        <p class="text-sm font-semibold text-slate-400 mt-7 mb-3">Clasifica cada afirmación ({act.afirmaciones.filter((a) => marcas[a.id]).length}/{act.afirmaciones.length}):</p>

        {/* Afirmaciones */}
        <div class="grid gap-4">
          {act.afirmaciones.map((af, i) => {
            const marca = marcas[af.id];
            const bien = revelado && marca === af.veredicto;
            const mal = revelado && marca && marca !== af.veredicto;
            const esAbierta = !!abierta[af.id];
            return (
              <div
                key={af.id}
                class={`rounded-2xl border-2 overflow-hidden transition ${mal ? "border-rose-500" : bien ? "border-emerald-500" : marca ? "border-slate-500" : "border-slate-700"} bg-slate-900`}
              >
                <div class="p-5">
                  <div class="flex items-start gap-3">
                    <span class="font-mono text-sm text-emerald-300/80 shrink-0 mt-0.5 bg-slate-800 rounded-lg px-2 py-0.5">#{String(i + 1).padStart(2, "0")}</span>
                    <p class="text-base leading-7 flex-1 text-slate-100">{af.texto}</p>
                    {revelado && marca && (
                      <span class={`shrink-0 text-sm font-extrabold px-3 py-1 rounded-full ${bien ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                        {bien ? "✓ Acierto" : "✕ Fallo"}
                      </span>
                    )}
                  </div>
                  <div class="flex flex-wrap gap-2.5 mt-4">
                    {VEREDICTOS.map((v) => {
                      const activo = marca === v.id;
                      return (
                        <button
                          key={v.id}
                          disabled={revelado}
                          onClick={() => marcar(af.id, v.id)}
                          aria-pressed={activo}
                          class={`px-4 py-2.5 rounded-full text-sm font-bold border-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/40 ${activo ? v.estilos : "border-slate-600 text-slate-200 hover:border-slate-300"} ${revelado ? "cursor-default opacity-90" : "cursor-pointer"}`}
                        >
                          {activo && <span class={`inline-block w-2 h-2 rounded-full mr-2 ${revelado ? "bg-white" : PUNTO[v.id]}`} />}
                          {v.etiqueta}
                        </button>
                      );
                    })}
                    {revelado && (
                      <button
                        onClick={() => setAbierta((p) => ({ ...p, [af.id]: !p[af.id] }))}
                        aria-expanded={esAbierta}
                        class="sm:ml-auto px-4 py-2.5 rounded-full text-sm font-bold border-2 border-slate-500 text-slate-100 hover:border-emerald-400 hover:text-emerald-300 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/40"
                      >
                        {esAbierta ? "▾ Ocultar peritaje" : "▸ Ver peritaje"}
                      </button>
                    )}
                  </div>
                </div>
                {revelado && esAbierta && (
                  <div class="px-5 pb-5">
                    <div class="rounded-xl bg-slate-950 border border-slate-700 p-4">
                      <p class="text-xs font-extrabold tracking-widest text-emerald-300">🧪 PERITAJE · CLASIFICACIÓN ESPERADA</p>
                      <p class="text-base leading-7 mt-2 text-slate-100">
                        <b>
                          {af.veredicto === "correcta" ? "Correcta" : af.veredicto === "incorrecta" ? "Incorrecta" : "Necesita verificación"}
                        </b>
                        {" — "}
                        {af.explicacion}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Cierre del caso */}
        <div class="mt-6 flex flex-wrap items-center gap-3">
          {!revelado ? (
            <button
              onClick={() => todasMarcadas && setRevelado(true)}
              disabled={!todasMarcadas}
              class={`px-7 py-3.5 rounded-2xl text-base font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/40 ${!todasMarcadas ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"}`}
            >
              {todasMarcadas ? " Cerrar el caso y ver peritaje" : `Clasifica las ${act.afirmaciones.length} afirmaciones para cerrar el caso`}
            </button>
          ) : (
            <>
              <div class="px-5 py-3.5 rounded-2xl text-base font-bold bg-slate-800 border border-slate-600" role="status">
                Caso cerrado: <b class="text-emerald-300">{aciertos}/{act.afirmaciones.length}</b> clasificaciones correctas
              </div>
              <button onClick={reiniciar} class="px-6 py-3.5 rounded-2xl text-base font-bold bg-slate-100 text-slate-900 hover:bg-white transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/40">
                ↩ Reabrir caso
              </button>
            </>
          )}
        </div>
        {revelado && aciertos < act.afirmaciones.length && (
          <p class="text-sm text-slate-400 mt-3">Pulsa “Ver peritaje” en cada afirmación fallada para entender el error forense.</p>
        )}
      </div>
    </article>
  );
}