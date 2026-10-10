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
