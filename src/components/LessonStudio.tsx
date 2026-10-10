import { useEffect, useMemo, useState } from "preact/hooks";
import LessonCellEditor from "./LessonCellEditor";
import LessonCellForm from "./LessonCellForm";
import LessonRenderer from "./LessonRenderer";
import SplitView from "./SplitView";
import { parseLesson, serializeLesson, type Lesson } from "../utils/lesson";
import {
  clearCustom,
  clearDraft,
  getDraft,
  getLessonById,
  listDraftIds,
  moveId,
  setDraft,
} from "../utils/lessons";
import { api, backendAvailable, type ApiBlock } from "../utils/contentApi";

export interface StudioListItem {
  id: string;
  title: string;
  code?: string;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function LessonStudio({ lessons }: { lessons: StudioListItem[] }) {
  const [mode, setMode] = useState<"checking" | "server" | "local">("checking");

  useEffect(() => {
    backendAvailable().then((ok) => setMode(ok ? "server" : "local"));
  }, []);

  if (mode === "checking") {
    return (
      <div class="bg-white border rounded-2xl p-8 text-center text-sm text-gray-500">
        Comprobando servidor local de contenido…
      </div>
    );
  }
  if (mode === "server") {
    return (
      <div>
        <p class="mb-3 text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">
          ● Servidor local conectado — guardar escribe directo en content/blocks/
        </p>
        <ServerStudio />
      </div>
    );
  }
  return (
    <div>
      <p class="mb-3 text-xs text-gray-500">
        Sin servidor local (<span class="font-mono bg-gray-100 px-1 rounded">npm run content:server</span> para
        escritura directa). Modo navegador: guarda en localStorage y exporta el .lesson.
      </p>
      <LocalStudio lessons={lessons} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modo servidor: layout tipo Overleaf.
// Drawer izquierda (bloques → lessons) + centro dividido en
// edición por celdas | previsualización en vivo con divisor movible.
// ---------------------------------------------------------------------------

function ServerStudio() {
  const [blocks, setBlocks] = useState<ApiBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [navBlockId, setNavBlockId] = useState<string | null>(null);
  const [open, setOpen] = useState<{ blockId: string; id: string } | null>(null);
  const [base, setBase] = useState<Lesson | null>(null);
  const [preview, setPreview] = useState<Lesson | null>(null);
  const [saveTick, setSaveTick] = useState(0);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);

  // Formularios
  const [showNewBlock, setShowNewBlock] = useState(false);
  const [nbTitle, setNbTitle] = useState("");
  const [nbDesc, setNbDesc] = useState("");
  const [editing, setEditing] = useState<{ id: string; title: string; description: string } | null>(null);
  const [showNewLesson, setShowNewLesson] = useState(false);
  const [nlId, setNlId] = useState("");
  const [nlTitle, setNlTitle] = useState("");
  const [moveTarget, setMoveTarget] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const refresh = async () => {
    try {
      const list = await api.blocks();
      setBlocks(list);
      setError("");
      setNavBlockId((prev) => (prev && list.some((b) => b.id === prev) ? prev : null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando bloques.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const block = useMemo(() => blocks.find((b) => b.id === navBlockId) ?? null, [blocks, navBlockId]);
  const openMeta = useMemo(() => {
    if (!open) return null;
    const b = blocks.find((x) => x.id === open.blockId);
    return b?.lessons.find((l) => l.id === open.id) ?? null;
  }, [blocks, open]);
  const totalLessons = useMemo(() => blocks.reduce((n, b) => n + b.lessons.length, 0), [blocks]);

  const openLesson = async (blockId: string, id: string) => {
    setOpen({ blockId, id });
    setLastSaved(null);
    setNavBlockId(blockId);
    setBase(null);
    setPreview(null);
    setLoadingLesson(true);
    try {
      const source = await api.lessonSource(blockId, id);
      const parsed = parseLesson(source, id);
      parsed.meta.blockId = blockId;
      setBase(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir la lección.");
    } finally {
      setLoadingLesson(false);
    }
  };

  const closeLesson = () => {
    setOpen(null);
    setBase(null);
    setPreview(null);
    setLastSaved(null);
  };

  /** Sube un archivo al backend (content/blocks/<bloque>/images/<lesson>/) y devuelve su src. */
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!open) return null;
    const { blockId, id } = open;
    if (!file.type.startsWith("image/")) {
      setError("Solo se pueden subir imágenes.");
      return null;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("La imagen supera los 8 MB.");
      return null;
    }
    const b64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
      reader.readAsDataURL(file);
    });
    try {
      const res = await api.uploadImage(blockId, id, file.name, b64);
      return res.src;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
      return null;
    }
  };

  const handleSave = async (effective: Lesson) => {
    if (!open) return;
    try {
      await api.saveLessonSource(open.blockId, effective.meta.id, serializeLesson(effective));
      clearCustom(effective.meta.id); // el archivo manda; limpia el override del navegador
      // Recargar lo guardado para que el formulario compare contra el archivo nuevo
      // y el aviso de "cambios sin guardar" desaparezca.
      const source = await api.lessonSource(open.blockId, effective.meta.id);
      const parsed = parseLesson(source, effective.meta.id);
      parsed.meta.blockId = open.blockId;
      setBase(parsed);
      setPreview(null);
      setSaveTick((t) => t + 1);
      setLastSaved(new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      await refresh();
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  };

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    try {
      await fn();
      setFormError("");
      setError("");
      await refresh();
      after?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error.";
      setFormError(msg);
      setError(msg);
    }
  };

  const createBlock = () =>
    run(async () => {
      if (!nbTitle.trim()) throw new Error("El título del bloque es obligatorio.");
      const b = await api.createBlock({ title: nbTitle.trim(), description: nbDesc.trim() });
      setNavBlockId(b.id);
      setNbTitle("");
      setNbDesc("");
      setShowNewBlock(false);
    });

  const saveBlockEdit = () =>
    run(async () => {
      if (!editing || !editing.title.trim()) throw new Error("El título no puede quedar vacío.");
      await api.updateBlock(editing.id, { title: editing.title.trim(), description: editing.description });
      setEditing(null);
    });

  const deleteBlock = (id: string, lessons: number) =>
    run(async () => {
      if (!window.confirm(`¿Eliminar el bloque "${id}" con sus ${lessons} lecciones?`)) return;
      if (open && open.blockId === id) closeLesson();
      await api.deleteBlock(id);
    });

  const moveBlock = (from: number, to: number) =>
    run(async () => {
      const ids = moveId(blocks.map((b) => b.id), from, to);
      await api.saveBlocksOrder(ids);
    });

  const createLesson = () =>
    run(async () => {
      if (!block) return;
      if (!nlTitle.trim() && !nlId.trim()) throw new Error("Ponle título o id a la lección.");
      const created = await api.createLesson(block.id, {
        id: nlId.trim() || undefined,
        title: nlTitle.trim() || undefined,
      });
      setNlId("");
      setNlTitle("");
      setShowNewLesson(false);
      await openLesson(block.id, created.id);
    });

  const deleteLesson = (blockId: string, id: string) =>
    run(async () => {
      if (!window.confirm(`¿Eliminar la lección "${id}"?`)) return;
      if (open && open.id === id) closeLesson();
      await api.deleteLesson(blockId, id);
    });

  const moveLessonOrder = (blockId: string, ids: string[], from: number, to: number) =>
    run(async () => {
      await api.saveLessonsOrder(blockId, moveId(ids, from, to));
    });

  const moveLessonBlock = (lessonId: string, from: string) =>
    run(async () => {
      const to = moveTarget[lessonId];
      if (!to || to === from) return;
      await api.moveLesson(lessonId, from, to);
      if (open && open.id === lessonId) {
        await openLesson(to, lessonId);
      }
    });

  if (loading) {
    return <div class="bg-white border rounded-2xl p-8 text-center text-sm text-gray-500">Cargando bloques…</div>;
  }

  const shown = preview ?? base;

  return (
    <div>
      {error && <p class="mb-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2">{error}</p>}

      {/* Barra superior: drawer + breadcrumb */}
      <div class="flex items-center gap-2 mb-3">
        <button
          onClick={() => setDrawerOpen((o) => !o)}
          class="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700"
          title={drawerOpen ? "Ocultar menú" : "Mostrar menú"}
        >
          ☰
        </button>
        <nav class="flex items-center gap-1.5 text-sm min-w-0">
          <button onClick={() => { setNavBlockId(null); closeLesson(); }} class="font-bold hover:underline shrink-0">
            Bloques
          </button>
          {block && (
            <>
              <span class="text-gray-300">/</span>
              <button onClick={closeLesson} class="hover:underline truncate" title={block.title}>
                {block.icon} {block.title}
              </button>
            </>
          )}
          {open && (
            <>
              <span class="text-gray-300">/</span>
              <span class="text-gray-500 truncate">{openMeta?.title ?? open.id}</span>
            </>
          )}
        </nav>
        {lastSaved && (
          <span class="ml-auto text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
            ✓ Guardado {lastSaved}
          </span>
        )}
      </div>

      <div class="flex items-start gap-3 relative">
        {/* Fondo para cerrar el drawer en móvil */}
        {drawerOpen && (
          <div class="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setDrawerOpen(false)} />
        )}

        {/* Drawer izquierda */}
        {drawerOpen && (
          <aside class="fixed md:static inset-y-0 left-0 z-40 w-80 max-w-[85vw] shrink-0 bg-white border rounded-none md:rounded-2xl p-3 overflow-y-auto max-h-[85vh] md:max-h-none md:h-[calc(100vh-300px)] md:min-h-[480px]">
            <div class="flex items-center gap-2 mb-2">
              <p class="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                {block ? "Lessons" : `Bloques (${blocks.length})`}
              </p>
              <button onClick={() => setDrawerOpen(false)} class="ml-auto md:hidden px-2 py-1 text-gray-500" aria-label="Cerrar menú">✕</button>
            </div>

            {/* Vista: lista de bloques */}
            {!block && (
              <>
                <button
                  onClick={() => setShowNewBlock((s) => !s)}
                  class="w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
                >
                  ＋ Nuevo bloque
                </button>
                {showNewBlock && (
                  <div class="mt-2 grid gap-2 border rounded-xl p-2">
                    <input
                      value={nbTitle}
                      onInput={(e) => setNbTitle((e.target as HTMLInputElement).value)}
                      placeholder="Título del bloque"
                      class="border rounded-xl px-3 py-2 text-sm w-full"
                    />
                    <input
                      value={nbDesc}
                      onInput={(e) => setNbDesc((e.target as HTMLInputElement).value)}
                      placeholder="Descripción"
                      class="border rounded-xl px-3 py-2 text-sm w-full"
                    />
                    {formError && <p class="text-xs text-rose-600">{formError}</p>}
                    <button onClick={createBlock} class="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold">
                      Crear bloque
                    </button>
                  </div>
                )}
                <div class="mt-2 grid gap-1">
                  {blocks.map((b, i) => (
                    <div key={b.id} class="rounded-xl px-2 py-1.5 hover:bg-gray-100">
                      <div class="flex items-center gap-1">
                        <button onClick={() => setNavBlockId(b.id)} class="flex-1 text-left min-w-0">
                          <span class="block text-sm font-bold truncate">{b.icon} {b.title}</span>
                          <span class="block font-mono text-[11px] text-gray-400">{b.id} · {b.lessons.length} lessons</span>
                        </button>
                        <button onClick={() => moveBlock(i, i - 1)} disabled={i === 0} class="px-1.5 py-1 text-xs disabled:opacity-30" title="Subir">↑</button>
                        <button onClick={() => moveBlock(i, i + 1)} disabled={i === blocks.length - 1} class="px-1.5 py-1 text-xs disabled:opacity-30" title="Bajar">↓</button>
                      </div>
                      <div class="flex gap-1 mt-1">
                        <button onClick={() => setEditing({ id: b.id, title: b.title, description: b.description })} class="text-[11px] px-2 py-0.5 rounded-lg border border-gray-200">
                          Editar
                        </button>
                        <button onClick={() => deleteBlock(b.id, b.lessons.length)} class="text-[11px] px-2 py-0.5 rounded-lg border border-rose-300 text-rose-500">
                          Eliminar
                        </button>
                      </div>
                      {editing?.id === b.id && (
                        <div class="mt-2 grid gap-1.5 bg-gray-50 rounded-xl p-2">
                          <input
                            value={editing.title}
                            onInput={(e) => setEditing({ ...editing, title: (e.target as HTMLInputElement).value })}
                            class="border rounded-lg px-2 py-1.5 text-sm text-gray-900 w-full bg-white"
                            placeholder="Título"
                          />
                          <input
                            value={editing.description}
                            onInput={(e) => setEditing({ ...editing, description: (e.target as HTMLTextAreaElement).value })}
                            class="border rounded-lg px-2 py-1.5 text-sm text-gray-900 w-full bg-white"
                            placeholder="Descripción"
                          />
                          <div class="flex gap-1">
                            <button onClick={saveBlockEdit} class="flex-1 px-2 py-1 rounded-lg bg-gray-900 text-white text-xs font-bold">Guardar</button>
                            <button onClick={() => setEditing(null)} class="px-2 py-1 rounded-lg border text-xs text-gray-700 bg-white">Cancelar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {blocks.length === 0 && <p class="text-xs text-gray-400 px-1">Sin bloques: crea el primero ↑</p>}
                </div>
              </>
            )}

            {/* Vista: lessons del bloque + flecha atrás */}
            {block && (
              <>
                <button
                  onClick={() => setNavBlockId(null)}
                  class="flex items-center gap-2 w-full text-left px-2 py-2 rounded-xl hover:bg-gray-100"
                >
                  <span class="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm shrink-0">←</span>
                  <span>
                    <span class="block text-[11px] text-gray-400">Volver a bloques</span>
                    <span class="block text-sm font-bold leading-tight">{block.icon} {block.title}</span>
                  </span>
                </button>
                <div class="mt-2 grid gap-1 max-h-[40vh] md:max-h-[52vh] overflow-y-auto">
                  {block.lessons.map((l, i) => (
                    <div key={l.id} class={`rounded-xl px-2 py-1.5 ${open?.id === l.id ? "bg-indigo-100" : "hover:bg-gray-100"}`}>
                      <div class="flex items-center gap-1">
                        <button onClick={() => openLesson(block.id, l.id)} class="flex-1 text-left min-w-0">
                          <span class="block text-sm font-semibold truncate font-mono">{l.code ?? l.id}</span>
                          <span class="block text-xs text-gray-500 truncate">{l.title}</span>
                        </button>
                        <button onClick={() => moveLessonOrder(block.id, block.lessons.map((x) => x.id), i, i - 1)} disabled={i === 0} class="px-1 text-xs disabled:opacity-30">↑</button>
                        <button onClick={() => moveLessonOrder(block.id, block.lessons.map((x) => x.id), i, i + 1)} disabled={i === block.lessons.length - 1} class="px-1 text-xs disabled:opacity-30">↓</button>
                        <button onClick={() => deleteLesson(block.id, l.id)} class="px-1 text-xs text-rose-500" title="Eliminar">✕</button>
                      </div>
                      <div class="flex gap-1 mt-1">
                        <select
                          value={moveTarget[l.id] ?? ""}
                          onChange={(e) => setMoveTarget({ ...moveTarget, [l.id]: (e.target as HTMLSelectElement).value })}
                          class="flex-1 border rounded-lg text-[11px] px-1 py-1 bg-white"
                        >
                          <option value="">Mover a bloque…</option>
                          {blocks.filter((b) => b.id !== block.id).map((b) => (
                            <option key={b.id} value={b.id}>{b.id}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => moveLessonBlock(l.id, block.id)}
                          disabled={!moveTarget[l.id]}
                          class="text-[11px] px-2 py-1 rounded-lg border disabled:opacity-30 bg-white"
                        >
                          Mover
                        </button>
                      </div>
                    </div>
                  ))}
                  {block.lessons.length === 0 && <p class="text-xs text-gray-400 px-1">Sin lessons todavía.</p>}
                </div>
                <button
                  onClick={() => setShowNewLesson((s) => !s)}
                  class="mt-2 w-full px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
                >
                  ＋ Nueva lesson
                </button>
                {showNewLesson && (
                  <div class="mt-2 grid gap-2 border rounded-xl p-2">
                    <input
                      value={nlTitle}
                      onInput={(e) => setNlTitle((e.target as HTMLInputElement).value)}
                      placeholder="Título de la lección"
                      class="border rounded-xl px-3 py-2 text-sm w-full"
                    />
                    <input
                      value={nlId}
                      onInput={(e) => setNlId((e.target as HTMLInputElement).value)}
                      placeholder="id opcional (ej. 2-1-mi-tema)"
                      class="border rounded-xl px-3 py-2 text-sm font-mono w-full"
                    />
                    {formError && <p class="text-xs text-rose-600">{formError}</p>}
                    <button onClick={createLesson} class="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold">
                      Crear y editar
                    </button>
                  </div>
                )}
              </>
            )}
          </aside>
        )}

        {/* Centro */}
        <section class="flex-1 min-w-0">
          {open && loadingLesson && (
            <div class="bg-white border rounded-2xl p-8 text-center text-sm text-gray-500">Abriendo {open.id}…</div>
          )}

          {open && base && (
            <SplitView
              left={
                <LessonCellForm
                  key={`${open.blockId}/${open.id}#${saveTick}`}
                  base={base}
                  onSave={handleSave}
                  onChange={(l) => {
                    setPreview(l);
                    setLastSaved(null);
                  }}
                  saveLabel="Guardar en el proyecto"
                  uploadImage={uploadImage}
                />
              }
              right={
                <div>
                  <p class="text-[11px] font-bold uppercase tracking-widest text-gray-400">Vista previa · en vivo</p>
                  {shown && (
                    <>
                      <p class="font-mono text-xs text-indigo-600 font-bold mt-2">
                        {shown.meta.code} · {shown.meta.block}
                      </p>
                      <p class="text-sm text-gray-500 mt-1">{shown.meta.description}</p>
                      <div class="mt-2 bg-white border rounded-2xl p-5">
                        <LessonRenderer lesson={shown} />
                      </div>
                    </>
                  )}
                </div>
              }
            />
          )}

          {!open && block && (
            <div class="bg-white border rounded-2xl p-8 text-center">
              <p class="text-5xl">{block.icon}</p>
              <h2 class="text-2xl font-extrabold mt-2">{block.title}</h2>
              {block.description && <p class="text-sm text-gray-600 mt-1 max-w-xl mx-auto">{block.description}</p>}
              <p class="text-xs text-gray-400 mt-2 font-mono">{block.id} · {block.lessons.length} lessons</p>
              <div class="mt-4 flex flex-wrap justify-center gap-2">
                {block.lessons.length > 0 && (
                  <button
                    onClick={() => openLesson(block.id, block.lessons[0].id)}
                    class="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700"
                  >
                    Editar “{block.lessons[0].title}” →
                  </button>
                )}
                <button
                  onClick={() => setShowNewLesson(true)}
                  class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
                >
                  ＋ {block.lessons.length === 0 ? "Crear la primera lesson" : "Nueva lesson"}
                </button>
              </div>
              {block.lessons.length === 0 && (
                <p class="text-xs text-gray-400 mt-3">Este bloque aún no tiene lessons. Créala desde aquí o desde el menú.</p>
              )}
            </div>
          )}

          {!open && !block && (
            <div class="bg-white border rounded-2xl p-8 text-center">
              <p class="text-5xl">☰</p>
              <h2 class="text-xl font-extrabold mt-2">Selecciona un bloque del menú</h2>
              <p class="text-sm text-gray-600 mt-1">
                {blocks.length} bloques · {totalLessons} lessons en total.
              </p>
              <button
                onClick={() => setShowNewBlock(true)}
                class="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
              >
                ＋ Nuevo bloque
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modo local (sin backend): navegador + borradores + exportar .lesson.
// ---------------------------------------------------------------------------

function LocalStudio({ lessons }: { lessons: StudioListItem[] }) {
  const fileIds = useMemo(() => new Set(lessons.map((l) => l.id)), [lessons]);
  const [selected, setSelected] = useState<string | null>(lessons[0]?.id ?? null);
  // Borradores solo en cliente (evita hydration mismatch con el SSR).
  const [draftIds, setDraftIds] = useState<string[]>([]);
  useEffect(() => {
    refreshDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [showNew, setShowNew] = useState(false);
  const [fileId, setFileId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newBlock, setNewBlock] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [formError, setFormError] = useState("");

  const refreshDrafts = () => setDraftIds(listDraftIds());

  const isDraft = selected != null && !fileIds.has(selected);
  const active: Lesson | null = useMemo(() => {
    if (!selected) return null;
    if (!fileIds.has(selected)) return getDraft(selected);
    return getLessonById(selected) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, fileIds, draftIds, lessons]);

  const handleSave = (effective: Lesson) => {
    if (!fileIds.has(effective.meta.id)) {
      setDraft(effective);
      refreshDrafts();
    }
  };

  const createDraft = () => {
    const id = fileId.trim() || slugify(newTitle);
    if (!id || !SLUG_RE.test(id)) {
      setFormError("El nombre de archivo debe ser tipo mi-leccion (minúsculas, números y guiones).");
      return;
    }
    if (fileIds.has(id) || getDraft(id)) {
      setFormError(`Ya existe una lección o borrador con id "${id}".`);
      return;
    }
    const title = newTitle.trim() || id;
    const lesson: Lesson = {
      meta: {
        id,
        title,
        block: newBlock.trim() || undefined,
        description: newDesc.trim() || undefined,
      },
      blocks: [
        { id: "titulo", type: "h1", text: title },
        { id: "intro", type: "paragraph", text: "Párrafo inicial…" },
      ],
      raw: "",
    };
    setDraft(lesson);
    refreshDrafts();
    setSelected(id);
    setShowNew(false);
    setFileId("");
    setNewTitle("");
    setNewBlock("");
    setNewDesc("");
    setFormError("");
  };

  const deleteDraft = (id: string) => {
    if (!window.confirm(`¿Eliminar el borrador "${id}" del navegador?`)) return;
    clearDraft(id);
    refreshDrafts();
    if (selected === id) setSelected(lessons[0]?.id ?? null);
  };

  return (
    <div>
      <div class="grid md:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Lateral: abrir existentes + crear nuevas */}
        <aside class="bg-white border rounded-2xl p-3 md:sticky md:top-24">
          <button
            onClick={() => setShowNew((s) => !s)}
            class="w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
          >
            ＋ Nueva lección
          </button>

          {showNew && (
            <div class="mt-3 grid gap-2 border-t pt-3">
              <label class="block text-xs font-semibold text-gray-500">
                Nombre de archivo (.lesson)
                <input
                  value={fileId}
                  onInput={(e) => setFileId((e.target as HTMLInputElement).value)}
                  placeholder="mi-leccion"
                  class="mt-1 w-full border rounded-xl px-3 py-2 text-sm font-mono text-gray-900"
                />
              </label>
              <label class="block text-xs font-semibold text-gray-500">
                Título
                <input
                  value={newTitle}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    setNewTitle(v);
                    if (!fileId) setFileId(slugify(v));
                  }}
                  placeholder="Título de la lección"
                  class="mt-1 w-full border rounded-xl px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <label class="block text-xs font-semibold text-gray-500">
                Bloque
                <input
                  value={newBlock}
                  onInput={(e) => setNewBlock((e.target as HTMLInputElement).value)}
                  placeholder="Bloque"
                  class="mt-1 w-full border rounded-xl px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <label class="block text-xs font-semibold text-gray-500">
                Descripción
                <input
                  value={newDesc}
                  onInput={(e) => setNewDesc((e.target as HTMLInputElement).value)}
                  placeholder="Descripción corta"
                  class="mt-1 w-full border rounded-xl px-3 py-2 text-sm text-gray-900"
                />
              </label>
              {formError && <p class="text-xs text-rose-600">{formError}</p>}
              <button onClick={createDraft} class="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700">
                Crear y editar
              </button>
            </div>
          )}

          <p class="mt-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">Archivos ({lessons.length})</p>
          <div class="mt-1 grid gap-1 max-h-64 overflow-y-auto">
            {lessons.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelected(l.id)}
                class={`text-left px-3 py-2 rounded-xl text-sm transition ${selected === l.id ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}
              >
                <span class="font-mono text-[11px] opacity-70">{l.code ?? l.id}</span>
                <span class="block font-semibold leading-tight truncate">{l.title}</span>
              </button>
            ))}
            {lessons.length === 0 && <p class="text-xs text-gray-400 px-1">Sin archivos todavía.</p>}
          </div>

          {draftIds.length > 0 && (
            <>
              <p class="mt-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">Borradores ({draftIds.length})</p>
              <div class="mt-1 grid gap-1 max-h-48 overflow-y-auto">
                {draftIds.map((id) => (
                  <div key={id} class={`flex items-center gap-1 px-2 py-1.5 rounded-xl ${selected === id ? "bg-amber-100" : "hover:bg-gray-100"}`}>
                    <button onClick={() => setSelected(id)} class="flex-1 text-left min-w-0">
                      <span class="block text-sm font-semibold truncate font-mono">{id}</span>
                    </button>
                    <button onClick={() => deleteDraft(id)} class="px-2 py-1 rounded-lg text-xs text-rose-600 hover:bg-rose-50" title="Eliminar borrador">✕</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* Editor */}
        <section class="min-w-0">
          {!active && (
            <div class="bg-white border rounded-2xl p-8 text-center text-sm text-gray-500">
              Selecciona una lección o crea una nueva para empezar.
            </div>
          )}
          {active && (
            <div key={active.meta.id}>
              <div class="flex flex-wrap items-center gap-2">
                <span class={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${isDraft ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"}`}>
                  {isDraft ? "borrador (sin archivo)" : "archivo del proyecto"}
                </span>
                <span class="font-mono text-xs text-gray-500">{active.meta.id}.lesson</span>
                {!isDraft && (
                  <a href={`/lecciones/${active.meta.id}`} class="ml-auto text-xs text-indigo-600 hover:underline">
                    Ver página pública →
                  </a>
                )}
              </div>
              <LessonCellEditor base={active} onSave={handleSave} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
