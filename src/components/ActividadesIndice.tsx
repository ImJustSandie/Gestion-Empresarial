// src/components/ActividadesIndice.tsx
// Portada del laboratorio (como la portada de bloques): una tarjeta por TIPO
// de actividad con su conteo y avance. Cada tipo tiene su propia página con
// sus casos en /alfabetizacion/actividades/<tipo>.
import { useState } from "preact/hooks";
import {
  TIPOS_ACTIVIDADES,
  estadoCaso,
  listaPorTipo,
  loadActividades,
} from "../utils/alfabetizacionActividades";

export default function ActividadesIndice() {
  const [guardadas] = useState(loadActividades);

  return (
    <div class="grid md:grid-cols-3 gap-4">
      {TIPOS_ACTIVIDADES.map((t) => {
        const casos = listaPorTipo(t.tipo);
        const hechas = casos.filter((c) => estadoCaso(t.tipo, c.id, guardadas).completada).length;
        return (
          <a
            key={t.tipo}
            href={t.href}
            class={`rounded-3xl overflow-hidden border-2 transition hover:shadow-xl flex flex-col ${t.borde} bg-white`}
          >
            <div class={`p-6 relative overflow-hidden ${t.hero}`}>
              <span class="absolute -right-4 -bottom-6 text-[100px] opacity-20 select-none leading-none">{t.icono}</span>
              <span class="inline-block text-[11px] font-extrabold tracking-widest bg-white/20 px-2 py-1 rounded-lg relative">
                {casos.length} CASOS
              </span>
              <h2 class="text-2xl font-extrabold mt-2 relative">{t.titulo}</h2>
            </div>
            <div class="p-5 flex-1 flex flex-col">
              <p class="text-sm text-gray-600 flex-1">{t.descripcion}</p>
              <div class="mt-4 flex items-center justify-between gap-2">
                <span class="text-xs font-bold text-gray-500">{hechas}/{casos.length} completados</span>
                <span class="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold">Abrir →</span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
