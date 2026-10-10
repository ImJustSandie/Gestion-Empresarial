// src/utils/contentApi.ts
// Cliente del backend DEV-ONLY (server/content-server.mjs, `npm run content:server`).
// Solo existe en local. En producción (Pages/Vercel estático) el backend no está
// y el editor trabaja en modo local (localStorage + descargar .lesson).
// No sabe nada de diseño: solo mueve datos.

const BASE = "http://127.0.0.1:8787";

export interface ApiLessonMeta {
  id: string;
  title: string;
  code?: string;
}

export interface ApiBlock {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  lessons: ApiLessonMeta[];
}

let probe: { value: boolean; at: number } | null = null;

export async function backendAvailable(timeoutMs = 1500): Promise<boolean> {
  if (probe && Date.now() - probe.at < 10_000) return probe.value;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${BASE}/api/health`, { signal: ctrl.signal });
    clearTimeout(t);
    probe = { value: res.ok, at: Date.now() };
    return res.ok;
  } catch {
    probe = { value: false, at: Date.now() };
    return false;
  }
}

export function resetBackendProbe(): void {
  probe = null;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new Error("Servidor de contenido no disponible. Ejecuta `npm run content:server`.");
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const msg = (data as { error?: unknown } | null)?.error;
    throw new Error(typeof msg === "string" ? msg : `Error ${res.status} del servidor de contenido.`);
  }
  return data as T;
}

export const api = {
  blocks: () => req<{ blocks: ApiBlock[] }>("/api/blocks").then((r) => r.blocks),

  createBlock: (input: { id?: string; title: string; description?: string; icon?: string; color?: string }) =>
    req<{ block: ApiBlock }>("/api/blocks", { method: "POST", body: JSON.stringify(input) }).then((r) => r.block),

  updateBlock: (id: string, input: { title?: string; description?: string; icon?: string; color?: string }) =>
    req<{ block: ApiBlock }>(`/api/blocks/${id}`, { method: "PATCH", body: JSON.stringify(input) }).then((r) => r.block),

  deleteBlock: (id: string) => req<{ ok: boolean }>(`/api/blocks/${id}`, { method: "DELETE" }),

  saveBlocksOrder: (ids: string[]) =>
    req<{ ok: boolean }>("/api/blocks-order", { method: "PUT", body: JSON.stringify({ ids }) }),

  lessonSource: (blockId: string, lessonId: string) =>
    req<{ id: string; source: string }>(`/api/blocks/${blockId}/lessons/${lessonId}`).then((r) => r.source),

  saveLessonSource: (blockId: string, lessonId: string, source: string) =>
    req<{ ok: boolean }>(`/api/blocks/${blockId}/lessons/${lessonId}`, {
      method: "PUT",
      body: JSON.stringify({ source }),
    }),

  createLesson: (blockId: string, input: { id?: string; title?: string; source?: string }) =>
    req<{ id: string }>(`/api/blocks/${blockId}/lessons`, { method: "POST", body: JSON.stringify(input) }),

  deleteLesson: (blockId: string, lessonId: string) =>
    req<{ ok: boolean }>(`/api/blocks/${blockId}/lessons/${lessonId}`, { method: "DELETE" }),

  saveLessonsOrder: (blockId: string, ids: string[]) =>
    req<{ ok: boolean }>(`/api/blocks/${blockId}/lessons-order`, {
      method: "PUT",
      body: JSON.stringify({ ids }),
    }),

  moveLesson: (lessonId: string, from: string, to: string) =>
    req<{ ok: boolean }>("/api/lessons/move", {
      method: "POST",
      body: JSON.stringify({ lessonId, from, to }),
    }),

  listImages: (blockId: string, lessonId: string) =>
    req<{ images: { file: string; src: string }[] }>(
      `/api/blocks/${blockId}/lessons/${lessonId}/images`,
    ).then((r) => r.images),

  uploadImage: (blockId: string, lessonId: string, filename: string, data: string) =>
    req<{ file: string; src: string }>(`/api/blocks/${blockId}/lessons/${lessonId}/images`, {
      method: "POST",
      body: JSON.stringify({ filename, data }),
    }),
};
