// src/utils/lessons.ts
// Lee el contenido desde `content/blocks/<bloque>/{block.json,lessons/*.lesson}`.
//   content/blocks/order.json ............ orden de bloques (celdas-archivo nivel bloque)
//   content/blocks/<id>/block.json ....... { title, description, icon?, color? }
//   content/blocks/<id>/order.json ....... orden de lessons dentro del bloque (opcional)
//   content/blocks/<id>/lessons/*.lesson . lecciones (celdas-bloque dentro de cada archivo)
//
// Overrides de navegador (localStorage, para previsualizar sin backend):
//   `gestion-empresarial:lessons-order` ..... orden global de lessons
//   `gestion-empresarial:lesson-custom:{id}` -> { blocks?, block?, title?, code?, description? }
// Borradores sin archivo: `gestion-empresarial:lesson-draft:{id}` -> Lesson.
// No sabe nada de diseño: devuelve datos puros.
import { parseLesson, type Lesson, type LessonBlock } from "./lesson";

export interface BlockInfo {
  id: string;
  title: string;
  short?: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface BlockJson {
  title?: string;
  short?: string;
  description?: string;
  icon?: string;
  color?: string;
}

const blockModules = import.meta.glob<BlockJson>("../../content/blocks/*/block.json", {
  import: "default",
  eager: true,
});

const blocksOrderModules = import.meta.glob<string[]>("../../content/blocks/order.json", {
  import: "default",
  eager: true,
});

const lessonsOrderModules = import.meta.glob<string[]>("../../content/blocks/*/order.json", {
  import: "default",
  eager: true,
});

const lessonModules = import.meta.glob<string>("../../content/blocks/*/lessons/*.lesson", {
  query: "?raw",
  import: "default",
  eager: true,
});

export const ORDER_KEY = "gestion-empresarial:lessons-order";
export const customKey = (id: string) => `gestion-empresarial:lesson-custom:${id}`;
export const draftKey = (id: string) => `gestion-empresarial:lesson-draft:${id}`;
const DRAFT_PREFIX = "gestion-empresarial:lesson-draft:";

export interface LessonCustom {
  blocks?: LessonBlock[];
  block?: string;
  title?: string;
  description?: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/** "../../content/blocks/<bloque>/..." -> "<bloque>" ("" si no coincide). */
function blockIdFromPath(path: string): string {
  const m = path.replace(/\\/g, "/").match(/content\/blocks\/([^/]+)\//);
  return m ? m[1] : "";
}

function idFromPath(path: string): string {
  const file = path.split("/").pop() ?? path;
  return file.replace(/\.lesson$/, "");
}

function firstArray<T>(modules: Record<string, T>): T | null {
  const values = Object.values(modules);
  if (values.length > 0 && Array.isArray(values[0])) return values[0] as T;
  return null;
}

let blocksCache: BlockInfo[] | null = null;
let lessonsCache: Lesson[] | null = null;

function loadBlocks(): BlockInfo[] {
  if (blocksCache) return blocksCache;
  const byId = new Map<string, BlockInfo>();
  for (const [path, json] of Object.entries(blockModules)) {
    const id = blockIdFromPath(path);
    if (!id) continue;
    byId.set(id, {
      id,
      title: typeof json?.title === "string" && json.title ? json.title : id,
      short: typeof json?.short === "string" && json.short ? json.short : undefined,
      description: typeof json?.description === "string" ? json.description : undefined,
      icon: typeof json?.icon === "string" ? json.icon : undefined,
      color: typeof json?.color === "string" ? json.color : undefined,
    });
  }
  const order = firstArray(blocksOrderModules) ?? [...byId.keys()].sort();
  const out: BlockInfo[] = [];
  for (const id of order) {
    const b = byId.get(id);
    if (b) {
      out.push(b);
      byId.delete(id);
    }
  }
  for (const b of [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))) out.push(b);
  blocksCache = out;
  return out;
}

function orderForBlock(blockId: string): string[] | null {
  for (const [path, ids] of Object.entries(lessonsOrderModules)) {
    if (blockIdFromPath(path) === blockId && Array.isArray(ids)) return ids as string[];
  }
  return null;
}

function loadLessons(): Lesson[] {
  if (lessonsCache) return lessonsCache;
  const blockTitles = new Map(loadBlocks().map((b) => [b.id, b.title]));
  const out: Lesson[] = [];
  for (const [path, raw] of Object.entries(lessonModules)) {
    const blockId = blockIdFromPath(path);
    const id = idFromPath(path);
    const lesson = parseLesson(typeof raw === "string" ? raw : "", id);
    if (!lesson.meta.id || lesson.meta.id === "sin-id") lesson.meta.id = id;
    if (!lesson.meta.title || lesson.meta.title === "sin-id") lesson.meta.title = id;
    lesson.meta.blockId = blockId;
    if (!lesson.meta.block) lesson.meta.block = blockTitles.get(blockId) ?? blockId;
    out.push(lesson);
  }
  lessonsCache = out;
  return out;
}

function sortLessonsInBlock(lessons: Lesson[], blockId: string): Lesson[] {
  const byId = new Map(lessons.map((l) => [l.meta.id, l]));
  const codeSorted = [...lessons].sort((a, b) =>
    (a.meta.code ?? a.meta.id).localeCompare(b.meta.code ?? b.meta.id, "es", { numeric: true }),
  );
  const order = orderForBlock(blockId) ?? codeSorted.map((l) => l.meta.id);
  const out: Lesson[] = [];
  for (const id of order) {
    const l = byId.get(id);
    if (l) {
      out.push(l);
      byId.delete(id);
    }
  }
  for (const l of codeSorted) if (byId.has(l.meta.id)) out.push(l);
  return out;
}

export function getStoredOrder(): string[] | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) return parsed as string[];
  } catch {}
  return null;
}

export function setStoredOrder(ids: string[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
  } catch {}
}

export function clearStoredOrder(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(ORDER_KEY);
  } catch {}
}

export function getCustom(id: string): LessonCustom | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(customKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LessonCustom;
    if (
      parsed &&
      (Array.isArray(parsed.blocks) ||
        typeof parsed.block === "string" ||
        typeof parsed.title === "string" ||
        typeof parsed.description === "string")
    )
      return parsed;
  } catch {}
  return null;
}

export function setCustom(id: string, custom: LessonCustom): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(customKey(id), JSON.stringify(custom));
  } catch {}
}

export function clearCustom(id: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(customKey(id));
  } catch {}
}

// --- Borradores: lecciones nuevas que aún no tienen archivo .lesson ---

function isLessonLike(v: unknown): v is Lesson {
  if (!v || typeof v !== "object") return false;
  const o = v as { meta?: unknown; blocks?: unknown };
  return !!o.meta && typeof o.meta === "object" && Array.isArray(o.blocks);
}

export function getDraft(id: string): Lesson | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(draftKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Lesson;
    if (isLessonLike(parsed) && (parsed.meta as { id?: unknown }).id === id) return parsed;
  } catch {}
  return null;
}

export function setDraft(lesson: Lesson): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(draftKey(lesson.meta.id), JSON.stringify(lesson));
  } catch {}
}

export function clearDraft(id: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(draftKey(id));
    localStorage.removeItem(customKey(id));
  } catch {}
}

/** Ids de borradores guardados en este navegador. */
export function listDraftIds(): string[] {
  if (!isBrowser()) return [];
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DRAFT_PREFIX)) out.push(k.slice(DRAFT_PREFIX.length));
    }
  } catch {}
  return out.sort();
}

function applyCustom(lesson: Lesson): Lesson {
  const custom = getCustom(lesson.meta.id);
  if (!custom) return lesson;
  return {
    ...lesson,
    meta: {
      ...lesson.meta,
      ...(custom.block != null ? { block: custom.block } : {}),
      ...(custom.title != null ? { title: custom.title } : {}),
      ...(custom.description != null ? { description: custom.description } : {}),
    },
    blocks: Array.isArray(custom.blocks) && custom.blocks.length > 0 ? custom.blocks : lesson.blocks,
  };
}

/** Orden global guardado en navegador (compat con el reordenador de /lecciones). */
function applyStoredOrder(lessons: Lesson[]): Lesson[] {
  const stored = getStoredOrder();
  if (!stored) return lessons;
  const byId = new Map(lessons.map((l) => [l.meta.id, l]));
  const out: Lesson[] = [];
  for (const id of stored) {
    const l = byId.get(id);
    if (l) {
      out.push(l);
      byId.delete(id);
    }
  }
  for (const l of lessons) if (byId.has(l.meta.id)) out.push(l);
  return out;
}

// --- API pública ---

export function getAllBlocks(): BlockInfo[] {
  return loadBlocks();
}

export function getBlock(id: string): BlockInfo | undefined {
  return loadBlocks().find((b) => b.id === id);
}

/**
 * El código es posicional y se genera solo: `<nº bloque>.<posición en el bloque>`
 * (base 1). No se edita a mano; al reordenar bloques o lessons se recalcula.
 * Las huérfanas (sin bloque) conservan su frontmatter o su id.
 */
function assignCodes(blocksInOrder: BlockInfo[], byBlock: Map<string, Lesson[]>): void {
  blocksInOrder.forEach((b, bi) => {
    const ls = byBlock.get(b.id) ?? [];
    ls.forEach((l, li) => {
      l.meta.code = `${bi + 1}.${li + 1}`;
    });
  });
}

export function getLessonsByBlock(blockId: string): Lesson[] {
  const sorted = sortLessonsInBlock(
    loadLessons().filter((l) => l.meta.blockId === blockId),
    blockId,
  );
  const blocks = loadBlocks();
  assignCodes(blocks, new Map([[blockId, sorted]]));
  return sorted.map(applyCustom);
}

export function getAllLessons(): Lesson[] {
  const blocks = loadBlocks();
  const byBlock = new Map<string, Lesson[]>();
  const out: Lesson[] = [];
  for (const b of blocks) {
    const sorted = sortLessonsInBlock(
      loadLessons().filter((l) => l.meta.blockId === b.id),
      b.id,
    );
    byBlock.set(b.id, sorted);
    out.push(...sorted);
  }
  // Lessons huérfanas (carpeta sin block.json) al final, ordenadas por código.
  const known = new Set(out.map((l) => l.meta.id));
  const orphans = loadLessons()
    .filter((l) => !known.has(l.meta.id))
    .sort((a, b) => (a.meta.code ?? a.meta.id).localeCompare(b.meta.code ?? b.meta.id, "es", { numeric: true }));
  assignCodes(blocks, byBlock);
  return applyStoredOrder([...out, ...orphans]).map(applyCustom);
}

export function getLessonById(id: string): Lesson | undefined {
  const base = loadLessons().find((l) => l.meta.id === id);
  if (!base) return undefined;
  if (!base.meta.blockId) return applyCustom(base);
  return getLessonsByBlock(base.meta.blockId).find((l) => l.meta.id === id);
}

/** Reordena una lista de ids (puro, para mover lecciones-archivo). */
export function moveId(ids: string[], from: number, to: number): string[] {
  if (from < 0 || from >= ids.length) return ids;
  const target = Math.max(0, Math.min(ids.length - 1, to));
  if (from === target) return ids;
  const next = [...ids];
  const [x] = next.splice(from, 1);
  next.splice(target, 0, x);
  return next;
}
