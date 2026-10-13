// src/components/QuizBlock.tsx
// Celda-bloque `quiz`: pregunta de selección múltiple con una respuesta correcta.
// La respuesta NO se muestra directamente: el estudiante elige una opción,
// pulsa "Comprobar" y solo entonces recibe retroalimentación + explicación.
// El resultado se guarda en localStorage por lección + celda.
import { useState } from "preact/hooks";

export interface QuizBlockData {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface Props {
  block: QuizBlockData;
  lessonId: string;
}

const STORAGE_KEY = "gestion-empresarial:quiz";
const LETRAS = ["a", "b", "c", "d", "e", "f"];

function storageKey(lessonId: string, blockId: string): string {
  return `${lessonId}:${blockId}`;
}

function loadResultado(lessonId: string, blockId: string): { seleccion: number; acierto: boolean } | null {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, { seleccion: number; acierto: boolean }>;
    return parsed[storageKey(lessonId, blockId)] ?? null;
  } catch {
    return null;
  }
}

function saveResultado(lessonId: string, blockId: string, seleccion: number, acierto: boolean): void {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = (raw ? JSON.parse(raw) : {}) as Record<string, { seleccion: number; acierto: boolean }>;
    parsed[storageKey(lessonId, blockId)] = { seleccion, acierto };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* sin localStorage */
  }
}

function clearResultado(lessonId: string, blockId: string): void {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, { seleccion: number; acierto: boolean }>;
    delete parsed[storageKey(lessonId, blockId)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* sin localStorage */
  }
}

export default function QuizBlock({ block, lessonId }: Props) {
  const guardado = loadResultado(lessonId, block.id);
  const [seleccion, setSeleccion] = useState<number | null>(guardado ? guardado.seleccion : null);
  const [comprobado, setComprobado] = useState<boolean>(!!guardado);
  const [acierto, setAcierto] = useState<boolean>(guardado ? guardado.acierto : false);

  const comprobar = () => {
    if (seleccion === null) return;
    const ok = seleccion === block.correct;
    setAcierto(ok);
    setComprobado(true);
    saveResultado(lessonId, block.id, seleccion, ok);
  };

  const reintentar = () => {
    setSeleccion(null);
    setComprobado(false);
    setAcierto(false);
    clearResultado(lessonId, block.id);
  };

    return (
    <div class="my-8 rounded-3xl overflow-hidden border-2 border-[#DDD6FE] bg-[#F7F5FF]">
      <div class="px-5 sm:px-7 pt-6 pb-2">
        <p class="inline-flex items-center gap-2 text-xs font-extrabold tracking-widest text-[#5932EA] bg-white border border-[#DDD6FE] px-3 py-1.5 rounded-full">✏️ COMPRUEBA LO APRENDIDO</p>
        <p class="font-extrabold text-lg sm:text-xl leading-snug text-slate-900 mt-4">{block.question}</p>
        {!comprobado && <p class="text-sm text-slate-500 mt-1">Elige una opción y pulsa “Comprobar respuesta”.</p>}
      </div>
      <div class="p-5 sm:px-7 sm:pb-7 grid gap-3">
        {block.options.map((op, i) => {
          const esSeleccion = seleccion === i;
          const esCorrecta = i === block.correct;
          let estilo = "border-slate-200 hover:border-[#7C5CE9] hover:bg-[#FBFAFF] bg-white";
          let insignia = "bg-slate-100 text-slate-600";
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
              key={i}
              disabled={comprobado}
              onClick={() => setSeleccion(i)}
              aria-pressed={esSeleccion}
              class={`w-full text-left border-2 rounded-2xl p-4 flex items-start gap-4 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5932EA]/40 ${estilo} ${comprobado ? "cursor-default" : "cursor-pointer"}`}
            >
              <span class={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold uppercase shrink-0 ${insignia}`}>
                {comprobado && esCorrecta ? "✓" : comprobado && esSeleccion ? "✕" : LETRAS[i] ?? i + 1}
              </span>
              <span class="text-base leading-7 text-slate-800 pt-0.5">{op}</span>
            </button>
          );
        })}
        <div class="mt-1">
          {!comprobado ? (
            <button
              onClick={comprobar}
              disabled={seleccion === null}
              class={`px-7 py-3.5 rounded-2xl text-base font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5932EA]/40 ${seleccion === null ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-[#5932EA] text-white hover:bg-[#4E2AD0] cursor-pointer shadow-sm"}`}
            >
              Comprobar respuesta
            </button>
          ) : (
            <button onClick={reintentar} class="px-7 py-3.5 rounded-2xl text-base font-bold bg-white border-2 border-slate-300 text-slate-800 hover:border-slate-500 transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5932EA]/40">
              ↩ Intentar de nuevo
            </button>
          )}
        </div>
        {comprobado && (
          <div class={`rounded-2xl p-5 border-2 flex gap-4 ${acierto ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`} role="status">
            <span class="text-3xl leading-none shrink-0" aria-hidden="true">{acierto ? "🎉" : "🤔"}</span>
            <div>
              <p class={`text-lg font-extrabold ${acierto ? "text-emerald-800" : "text-rose-800"}`}>
                {acierto ? "✓ ¡Correcto!" : "✕ Aún no. Revisa la explicación e inténtalo de nuevo."}
              </p>
              {block.explanation && (
                <p class={`text-base leading-7 mt-1 ${acierto ? "text-emerald-900" : "text-rose-900"}`}>{block.explanation}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}