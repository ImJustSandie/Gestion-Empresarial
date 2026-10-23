// src/utils/alfabetizacionContent.ts
// La vista /alfabetizacion se alimenta del CONTENIDO (content/blocks/),
// no de datos quemados: lo que se crea/edita en /editor se refleja aquí.
// Convenciones de .lesson que entiende esta vista:
//   ## Temáticas|Temas + lista .....: temáticas del tema
//   ## Referentes + lista ...........: referentes
//   ## Alcance + párrafos ...........: alcance
//   > Actividad: ... ................: actividad (fuera de Referentes/Alcance)
//   Sin sección Temáticas ...........: los ##/### pasan como temáticas
// Misma firma que el módulo anterior (BLOQUES_ALFABETIZACION, TOTAL_SUBTEMAS,
// STORAGE_KEY_PROGRESS) para no tocar la vista.

import { getAllBlocks, getLessonsByBlock } from "./lessons";
import type { Lesson } from "./lesson";

export interface Subtema {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  tematicas: string[];
  actividad?: string;
  referentes?: string[];
  alcance?: string;
}

export interface Bloque {
  id: string;
  numero: number;
  titulo: string;
  tituloCorto: string;
  descripcion: string;
  icono: string;
  color: string;
  subtemas: Subtema[];
}

const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

function firstParagraph(lesson: Lesson, max = 160): string {
  const p = lesson.blocks.find((b) => b.type === "paragraph");
  if (!p || p.type !== "paragraph") return "";
  return p.text.length > max ? `${p.text.slice(0, max).trimEnd()}…` : p.text;
}

function lessonToSubtema(lesson: Lesson): Subtema {
  const tematicas: string[] = [];
  const headings: string[] = [];
  const alcance: string[] = [];
  let referentes: string[] | undefined;
  let actividad: string | undefined;
  let fromList = false;
  let section: string | null = null;

  for (const b of lesson.blocks) {
    if (b.type === "h1") continue;
    if (b.type === "h2") {
      const n = norm(b.text);
      if (n === "tematicas" || n === "temas" || n === "referentes" || n === "alcance") {
        section = n;
      } else {
        headings.push(b.text);
        section = null;
      }
      continue;
    }
    if (b.type === "h3") {
      headings.push(b.text);
      continue;
    }
    if (b.type === "list" && (section === "tematicas" || section === "temas")) {
      tematicas.push(...b.items);
      fromList = true;
      continue;
    }
    if (b.type === "list" && section === "referentes") {
      (referentes ??= []).push(...b.items);
      continue;
    }
    if ((b.type === "paragraph" || b.type === "quote") && section === "alcance") {
      alcance.push(b.text);
      continue;
    }
    if (b.type === "quote" && section !== "referentes" && section !== "alcance" && !actividad) {
      const m = b.text.match(/^actividad\s*:\s*(.+)$/is);
      if (m) actividad = m[1].trim();
      continue;
    }
  }
  if (!fromList) tematicas.push(...headings);

  return {
    id: lesson.meta.id,
    codigo: lesson.meta.code ?? lesson.meta.id,
    titulo: lesson.meta.title,
    descripcion: lesson.meta.description ?? firstParagraph(lesson),
    tematicas,
    ...(actividad ? { actividad } : {}),
    ...(referentes && referentes.length > 0 ? { referentes } : {}),
    ...(alcance.length > 0 ? { alcance: alcance.join(" ") } : {}),
  };
}

function build(): Bloque[] {
  return getAllBlocks().map((b, i) => ({
    id: b.id,
    numero: i + 1,
    titulo: b.title,
    tituloCorto: b.short ?? b.title,
    descripcion: b.description ?? "",
    icono: b.icon ?? "📄",
    color: b.color ?? "indigo",
    subtemas: getLessonsByBlock(b.id).map(lessonToSubtema),
  }));
}

export const BLOQUES_ALFABETIZACION: Bloque[] = build();
export const TOTAL_SUBTEMAS = BLOQUES_ALFABETIZACION.reduce((acc, b) => acc + b.subtemas.length, 0);
export const STORAGE_KEY_PROGRESS = "gestion-empresarial:alfabetizacion-progress";

// ---------------------------------------------------------------------------
// Persistencia IndexedDB del progreso de alfabetización por usuario
// (misma DB/store que el resto del proyecto: "gestion-empresarial" / "kv")
// ---------------------------------------------------------------------------

const IDB_DB_NAME = "gestion-empresarial";
const IDB_STORE = "kv";

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await idbOpen();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await idbOpen();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

/** Clave IndexedDB para el progreso de un usuario concreto */
function progressKeyForUser(userId: string): string {
  return `alfabetizacion-progress:${userId}`;
}

/**
 * Guarda el progreso de alfabetización de un usuario tanto en localStorage
 * (para su propio uso) como en IndexedDB (para que el dashboard del profesor
 * pueda leerlo).
 */
export async function saveAlfabetizacionProgress(
  userId: string,
  progress: Record<string, boolean>
): Promise<void> {
  const json = JSON.stringify(progress);
  try { localStorage.setItem(STORAGE_KEY_PROGRESS, json); } catch { /* sin localStorage */ }
  await idbSet(progressKeyForUser(userId), json);
}

/**
 * Lee el progreso de alfabetización de un usuario desde IndexedDB.
 * Devuelve un Record<lessonId, boolean> (vacío si no hay datos).
 */
export async function getAlfabetizacionProgressForUser(
  userId: string
): Promise<Record<string, boolean>> {
  const raw = await idbGet(progressKeyForUser(userId));
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, boolean>; } catch { return {}; }
}

export interface BloqueProgress {
  bloqueId: string;
  titulo: string;
  completed: number;
  total: number;
  pct: number;
}

export interface UserAlfabetizacionSummary {
  userId: string;
  bloques: BloqueProgress[];
  totalCompleted: number;
  totalLessons: number;
  overallPct: number;
}

/**
 * Calcula el resumen de progreso de alfabetización para múltiples usuarios.
 * Usado por el Dashboard del profesor para mostrar el avance promedio
 * en los 5 módulos de los estudiantes del curso.
 */
export async function getAlfabetizacionProgressForUsers(
  userIds: string[]
): Promise<UserAlfabetizacionSummary[]> {
  const results: UserAlfabetizacionSummary[] = [];
  for (const userId of userIds) {
    const progress = await getAlfabetizacionProgressForUser(userId);
    const bloques: BloqueProgress[] = BLOQUES_ALFABETIZACION.map((b) => {
      const total = b.subtemas.length;
      const completed = b.subtemas.filter((s) => !!progress[s.id]).length;
      return {
        bloqueId: b.id,
        titulo: b.tituloCorto,
        completed,
        total,
        pct: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
    const totalCompleted = bloques.reduce((a, b) => a + b.completed, 0);
    const totalLessons = TOTAL_SUBTEMAS;
    results.push({
      userId,
      bloques,
      totalCompleted,
      totalLessons,
      overallPct: totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0,
    });
  }
  return results;
}
