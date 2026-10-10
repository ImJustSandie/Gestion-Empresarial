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
    <div class="my-4 border-2 rounded-2xl overflow-hidden border-indigo-200 bg-indigo-50/40">
      <div class="px-4 sm:px-5 pt-4">
        <p class="text-[11px] font-extrabold tracking-widest text-indigo-600">✏️ COMPRUEBA LO APRENDIDO</p>
        <p class="font-bold text-[15px] leading-snug mt-1">{block.question}</p>
      </div>
      <div class="p-4 sm:px-5 grid gap-2">
        {block.options.map((op, i) => {
          const esSeleccion = seleccion === i;
          const esCorrecta = i === block.correct;
          let estilo = "border-gray-200 hover:border-indigo-400 bg-white";
          let insignia = "bg-gray-100 text-gray-600";
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
              key={i}
              disabled={comprobado}
              onClick={() => setSeleccion(i)}
              class={`w-full text-left border-2 rounded-xl p-3 flex items-start gap-3 transition ${estilo} ${comprobado ? "cursor-default" : "cursor-pointer"}`}
            >
              <span class={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${insignia}`}>
                {comprobado && esCorrecta ? "✓" : LETRAS[i] ?? i + 1}
              </span>
              <span class="text-sm leading-relaxed">{op}</span>
            </button>
          );
        })}
        {!comprobado ? (
          <button
            onClick={comprobar}
            disabled={seleccion === null}
            class={`mt-1 px-5 py-2.5 rounded-xl text-sm font-bold transition w-fit ${seleccion === null ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
          >
            Comprobar respuesta
          </button>
        ) : (
          <button onClick={reintentar} class="mt-1 px-5 py-2.5 rounded-xl text-sm font-bold bg-gray-900 text-white hover:bg-gray-700 transition w-fit">
            ↩ Intentar de nuevo
          </button>
        )}
        {comprobado && (
          <div class={`rounded-xl p-4 border text-sm ${acierto ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
            <p class={`font-extrabold ${acierto ? "text-emerald-800" : "text-rose-800"}`}>
              {acierto ? "✓ ¡Correcto!" : "✕ Aún no. Revisa la explicación e inténtalo de nuevo."}
            </p>
            {block.explanation && (
              <p class={`mt-1 ${acierto ? "text-emerald-900" : "text-rose-900"}`}>{block.explanation}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
