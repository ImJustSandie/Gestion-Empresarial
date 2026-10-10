import { useEffect, useState } from "preact/hooks";
import { clearStoredOrder, getStoredOrder, moveId, setStoredOrder } from "../utils/lessons";

export interface LessonListItem {
  id: string;
  title: string;
  code?: string;
  block?: string;
  description?: string;
  cells: number;
}

export default function LessonOrderEditor({ lessons }: { lessons: LessonListItem[] }) {
  const [order, setOrder] = useState<string[]>(lessons.map((l) => l.id));
  const [edit, setEdit] = useState(false);
  const [dragFrom, setDragFrom] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredOrder();
    if (stored && stored.length > 0) {
      const known = new Set(lessons.map((l) => l.id));
      const filtered = stored.filter((id) => known.has(id));
      for (const l of lessons) if (!filtered.includes(l.id)) filtered.push(l.id);
      setOrder(filtered);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byId = new Map(lessons.map((l) => [l.id, l]));
  const move = (from: number, to: number) => setOrder((o) => moveId(o, from, to));

  const save = () => {
    setStoredOrder(order);
    setEdit(false);
  };
  const reset = () => {
    clearStoredOrder();
    setOrder(lessons.map((l) => l.id));
    setEdit(false);
  };

  return (
    <div>
      <div class="flex items-center gap-2">
        <p class="text-sm text-gray-500">{order.length} lecciones-archivo</p>
        <div class="ml-auto flex gap-2">
          {edit ? (
            <>
              <button onClick={save} class="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-700">Guardar orden</button>
              <button onClick={reset} class="px-3 py-1.5 rounded-lg border text-xs font-semibold">Restablecer</button>
              <button onClick={() => setEdit(false)} class="px-3 py-1.5 rounded-lg border text-xs">Cancelar</button>
            </>
          ) : (
            <button onClick={() => setEdit(true)} class="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:border-gray-400">⇅ Reordenar lecciones</button>
          )}
        </div>
      </div>

      <div class="grid gap-3 mt-4">
        {order.map((id, i) => {
          const l = byId.get(id);
          if (!l) return null;
          const card = (
            <div class="flex items-start gap-3">
              {edit && <span class="cursor-grab px-1 text-gray-400 select-none" title="Arrastra para mover">⋮⋮</span>}
              <div class="flex-1 min-w-0">
                <p class="font-mono text-xs text-indigo-600 font-bold">{l.code ?? l.id} · #{i + 1}</p>
                <p class="font-bold text-lg leading-tight">{l.title}</p>
                {l.description && <p class="text-sm text-gray-600 mt-1">{l.description}</p>}
                <p class="text-xs text-gray-400 mt-2">{l.cells} celdas · {l.block ?? "sin bloque"}</p>
              </div>
              {edit && (
                <div class="flex flex-col gap-1 shrink-0" onClick={(e) => e.preventDefault()}>
                  <button onClick={() => move(i, i - 1)} disabled={i === 0} class="px-2 py-1 rounded-lg border text-xs disabled:opacity-30">↑</button>
                  <button onClick={() => move(i, i + 1)} disabled={i === order.length - 1} class="px-2 py-1 rounded-lg border text-xs disabled:opacity-30">↓</button>
                </div>
              )}
            </div>
          );
          return edit ? (
            <div
              key={id}
              draggable
              onDragStart={() => setDragFrom(id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragFrom && dragFrom !== id) {
                  const from = order.indexOf(dragFrom);
                  move(from, i);
                }
                setDragFrom(null);
              }}
              class={`bg-white border-2 rounded-2xl p-5 transition ${dragFrom === id ? "border-indigo-500 opacity-60" : "border-gray-200"}`}
            >
              {card}
            </div>
          ) : (
            <a key={id} href={`/lecciones/${id}`} class="bg-white border rounded-2xl p-5 hover:border-indigo-400 hover:shadow transition block">
              {card}
            </a>
          );
        })}
      </div>
      {edit && (
        <p class="text-xs text-gray-500 mt-3">
          El orden se guarda en el navegador (localStorage). Para hacerlo permanente, reordena desde el editor
          oculto (<span class="font-mono bg-gray-100 px-1 rounded">/editor</span>) con el servidor local corriendo.
        </p>
      )}
    </div>
  );
}
