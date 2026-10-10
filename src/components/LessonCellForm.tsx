import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import RichToolbar from "./RichToolbar";
import {
  cellToEditable,
  cellWithText,
  createCell,
  moveCell,
  type Lesson,
  type LessonBlock,
} from "../utils/lesson";
import { getCustom, setCustom } from "../utils/lessons";

const TYPE_LABELS: Record<LessonBlock["type"], string> = {
  h1: "H1",
  h2: "H2",
  h3: "H3",
  paragraph: "Texto",
  quote: "Cita",
  list: "Lista",
  image: "Imagen",
  divider: "Divisor",
  quiz: "Pregunta",
};

interface MetaState {
  title: string;
  description: string;
}

interface Props {
  base: Lesson;
  onSave?: (effective: Lesson) => void;
  /** Se emite con la lección efectiva en cada cambio (para preview en vivo). */
  onChange?: (effective: Lesson) => void;
  saveLabel?: string;
  /** Si se provee, las celdas de imagen permiten arrastrar o seleccionar archivo para subirlo. Devuelve el src a guardar (`images/...`) o null si falla. */
  uploadImage?: (file: File) => Promise<string | null>;
}

export default function LessonCellForm({ base, onSave, onChange, saveLabel, uploadImage }: Props) {
  // Estado inicial = archivo (igual en servidor y cliente para evitar hydration mismatch).
  // El override del navegador se aplica al montar.
  const [blocks, setBlocks] = useState<LessonBlock[]>(() => base.blocks);
  const [title, setTitle] = useState(() => base.meta.title);
  const [description, setDescription] = useState(() => base.meta.description ?? "");
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [newType, setNewType] = useState<LessonBlock["type"]>("paragraph");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const notifyRef = useRef(onChange);
  notifyRef.current = onChange;
  const taRefs = useRef(new Map<string, HTMLTextAreaElement>());

  const build = (nb: LessonBlock[], nm: MetaState): Lesson => ({
    ...base,
    meta: { ...base.meta, title: nm.title, description: nm.description },
    blocks: nb,
  });

  const metaOf = (t: string, d: string): MetaState => ({
    title: t,
    description: d,
  });

  /** Aplica un cambio y notifica la lección efectiva (preview en vivo). */
  const commit = (nb: LessonBlock[], nm: MetaState) => {
    setBlocks(nb);
    setTitle(nm.title);
    setDescription(nm.description);
    notifyRef.current?.(build(nb, nm));
  };

  const currentMeta = (): MetaState => metaOf(title, description);

  useEffect(() => {
    const c = getCustom(base.meta.id);
    if (!c) return;
    const nb = Array.isArray(c.blocks) && c.blocks.length > 0 ? c.blocks : base.blocks;
    const nm = metaOf(
      c.title ?? base.meta.title,
      c.description ?? base.meta.description ?? "",
    );
    setBlocks(nb);
    setTitle(nm.title);
    setDescription(nm.description);
    notifyRef.current?.(build(nb, nm));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.meta.id]);

  const dirty = useMemo(
    () =>
      JSON.stringify(blocks) !== JSON.stringify(base.blocks) ||
      title !== base.meta.title ||
      description !== (base.meta.description ?? ""),
    [blocks, title, description, base],
  );

  const effective: Lesson = build(blocks, currentMeta());

  const move = (from: number, to: number) => commit(moveCell(blocks, from, to), currentMeta());

  const updateText = (i: number, text: string) =>
    commit(
      blocks.map((c, idx) => (idx === i ? cellWithText(c, text) : c)),
      currentMeta(),
    );

  const updateImageSrc = (i: number, src: string) =>
    commit(
      blocks.map((c, idx) => (idx === i && c.type === "image" ? { ...c, src } : c)),
      currentMeta(),
    );

  const changeType = (i: number, type: LessonBlock["type"]) =>
    commit(
      blocks.map((c, idx) => {
        if (idx !== i || c.type === type) return c;
        const editable = c.type === "divider" ? "" : cellToEditable(c);
        const fresh = createCell(type, editable);
        return { ...fresh, id: c.id } as LessonBlock;
      }),
      currentMeta(),
    );

  const addCell = (after?: number) => {
    const cell = createCell(newType);
    const next = [...blocks];
    if (after == null) next.push(cell);
    else next.splice(after + 1, 0, cell);
    commit(next, currentMeta());
  };

  const removeCell = (i: number) => commit(blocks.filter((_, idx) => idx !== i), currentMeta());

  const setMetaField = (field: keyof MetaState, value: string) =>
    commit(blocks, { ...currentMeta(), [field]: value });

  const save = () => {
    setCustom(base.meta.id, { blocks, title, description });
    onSave?.(effective);
  };

  const sendFile = async (i: number, cellId: string, file: File | undefined) => {
    if (!file || !uploadImage || uploadingId) return;
    setUploadingId(cellId);
    try {
      const src = await uploadImage(file);
      if (src) updateImageSrc(i, src);
    } finally {
      setUploadingId(null);
      setDragOverId(null);
    }
  };

  return (
    <div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-bold">Edición por celdas</span>
        <span class="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200" title="Código automático según la posición">
          {base.meta.code ?? "—"}
        </span>
        {dirty && <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">cambios sin guardar</span>}
        <div class="ml-auto flex flex-wrap gap-2">
          <button onClick={save} class="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-700">
            {saveLabel ?? "Guardar en navegador"}
          </button>
        </div>
      </div>

      <div class="mt-3 grid sm:grid-cols-2 gap-2 bg-gray-50 border rounded-2xl p-3">
        <label class="block text-xs font-semibold text-gray-500">
          Título
          <input
            value={title}
            onInput={(e) => setMetaField("title", (e.target as HTMLInputElement).value)}
            placeholder="Título de la lección"
            class="mt-1 w-full border rounded-xl px-3 py-2 text-sm text-gray-900 bg-white"
          />
        </label>
        <label class="block text-xs font-semibold text-gray-500 sm:col-span-2">
          Descripción
          <input
            value={description}
            onInput={(e) => setMetaField("description", (e.target as HTMLInputElement).value)}
            placeholder="Descripción corta"
            class="mt-1 w-full border rounded-xl px-3 py-2 text-sm text-gray-900 bg-white"
          />
        </label>
      </div>

      <div class="mt-3 grid gap-2">
        {blocks.map((cell, i) => (
          <div
            key={cell.id}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragFrom != null && dragFrom !== i) move(dragFrom, i);
              setDragFrom(null);
            }}
            class={`bg-white border-2 rounded-2xl p-3 transition ${dragFrom === i ? "border-indigo-500 opacity-60" : "border-gray-200"}`}
          >
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="cursor-grab px-2 py-1 text-gray-400 select-none" title="Arrastra para mover">⋮⋮</span>
              <span class="font-mono text-[11px] text-gray-400">#{cell.id}</span>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">{TYPE_LABELS[cell.type]}</span>
              <span class="text-[11px] text-gray-400">{i + 1}/{blocks.length}</span>
              <div class="ml-auto flex items-center gap-1">
                <button onClick={() => move(i, i - 1)} disabled={i === 0} class="px-2 py-1 rounded-lg border text-xs disabled:opacity-30" title="Subir">↑</button>
                <button onClick={() => move(i, i + 1)} disabled={i === blocks.length - 1} class="px-2 py-1 rounded-lg border text-xs disabled:opacity-30" title="Bajar">↓</button>
                <button onClick={() => addCell(i)} class="px-2 py-1 rounded-lg border text-xs" title="Añadir celda debajo">＋</button>
                <button onClick={() => removeCell(i)} class="px-2 py-1 rounded-lg border text-xs text-rose-600" title="Eliminar celda">✕</button>
              </div>
            </div>

            <div class="mt-2 grid gap-1">
              {cell.type !== "divider" && cell.type !== "image" && (
                <RichToolbar
                  target={() => taRefs.current.get(cell.id) ?? null}
                  onApply={(next) => updateText(i, next)}
                />
              )}
              <div class="flex flex-col sm:flex-row gap-2">
              <select
                value={cell.type}
                onChange={(e) => changeType(i, (e.target as HTMLSelectElement).value as LessonBlock["type"])}
                class="border rounded-lg px-2 py-1.5 text-xs shrink-0 bg-white"
              >
                {(Object.keys(TYPE_LABELS) as LessonBlock["type"][]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
              {cell.type !== "divider" && cell.type !== "image" && (
                <textarea
                  ref={(el) => {
                    if (el) taRefs.current.set(cell.id, el);
                    else taRefs.current.delete(cell.id);
                  }}
                  value={cell.type === "list" ? (cell as { items: string[] }).items.join("\n") : cellToEditable(cell)}
                  onInput={(e) => updateText(i, (e.target as HTMLTextAreaElement).value)}
                  rows={cell.type === "list" ? Math.max(2, (cell as { items: string[] }).items.length) : cell.type === "quiz" ? Math.max(4, cell.options.length + 3) : 2}
                  placeholder={cell.type === "list" ? "Un punto por línea" : cell.type === "quiz" ? "Pregunta, una opción por línea (- [x] la correcta) y > explicación" : "Contenido de la celda…"}
                  class="flex-1 border rounded-xl px-3 py-2 text-sm w-full bg-white"
                />
              )}
              {cell.type === "image" && (
                <div class="flex-1 grid gap-2">
                  {uploadImage && (
                    <label
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverId(cell.id);
                      }}
                      onDragLeave={() => setDragOverId((d) => (d === cell.id ? null : d))}
                      onDrop={(e) => {
                        e.preventDefault();
                        sendFile(i, cell.id, e.dataTransfer.files?.[0]);
                      }}
                      class={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-3 py-4 text-sm cursor-pointer transition ${
                        dragOverId === cell.id
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        class="hidden"
                        onChange={(e) => {
                          sendFile(i, cell.id, (e.target as HTMLInputElement).files?.[0]);
                          (e.target as HTMLInputElement).value = "";
                        }}
                      />
                      {uploadingId === cell.id ? "Subiendo imagen…" : "Arrastra una imagen aquí o haz clic para seleccionar"}
                    </label>
                  )}
                  <input
                    value={(cell as { src: string }).src}
                    onInput={(e) => updateImageSrc(i, (e.target as HTMLInputElement).value)}
                    class="border rounded-xl px-3 py-2 text-sm font-mono w-full bg-white"
                    placeholder="/lessons/mi-imagen.png"
                  />
                  <input
                    value={cell.alt}
                    onInput={(e) => updateText(i, (e.target as HTMLInputElement).value)}
                    class="border rounded-xl px-3 py-2 text-sm w-full bg-white"
                    placeholder="Texto alternativo / pie de imagen"
                  />
                </div>
              )}
              {cell.type === "divider" && <p class="text-xs text-gray-400 py-2">— divisor —</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2 bg-gray-50 border rounded-2xl p-3">
        <select value={newType} onChange={(e) => setNewType((e.target as HTMLSelectElement).value as LessonBlock["type"])} class="border rounded-lg px-2 py-2 text-sm bg-white">
          {(Object.keys(TYPE_LABELS) as LessonBlock["type"][]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        <button onClick={() => addCell()} class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">＋ Añadir celda al final</button>
      </div>
    </div>
  );
}
