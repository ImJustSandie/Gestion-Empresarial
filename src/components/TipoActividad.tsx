// src/components/TipoActividad.tsx
// Página de un TIPO de actividad (como la vista de un bloque): hero, botón de
// caso aleatorio y lista de casos (Caso 1, Caso 2…) identificados por su
// contenido, sin necesidad de nombres.
import { useState } from "preact/hooks";
import {
  TIPOS_ACTIVIDADES,
  estadoCaso,
  extractoCaso,
  listaPorTipo,
  loadActividades,
  type TipoActividad,
} from "../utils/alfabetizacionActividades";

export default function TipoActividad({ tipo }: { tipo: TipoActividad }) {
  const meta = TIPOS_ACTIVIDADES.find((t) => t.tipo === tipo)!;
  const casos = listaPorTipo(tipo);
  const [guardadas] = useState(loadActividades);

  const aleatorio = () => {
    if (casos.length === 0) return;
    const pick = casos[Math.floor(Math.random() * casos.length)];
    window.location.href = `${meta.href}/${pick.modulo.slug}`;
  };

  return (
    <div>
      {/* Hero del tipo */}
      <section class={`rounded-3xl overflow-hidden p-6 sm:p-10 relative ${meta.hero}`}>
        <span class="absolute right-4 top-4 text-[90px] sm:text-[140px] opacity-20 select-none leading-none">{meta.icono}</span>
        <a href="/alfabetizacion/actividades" class="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-semibold relative">← Todas las actividades</a>
        <p class="mt-4 text-xs font-extrabold tracking-widest bg-white/20 inline-block px-2 py-1 rounded-lg relative">{casos.length} CASOS</p>
        <h1 class="text-3xl sm:text-5xl font-extrabold mt-2 leading-tight relative max-w-3xl">{meta.titulo}</h1>
        <p class="mt-2 text-white/85 max-w-2xl text-sm sm:text-base relative">{meta.descripcion}</p>
        <div class="mt-4 relative">
          <button onClick={aleatorio} class="px-6 py-3 rounded-2xl bg-white text-gray-900 text-sm font-extrabold hover:bg-emerald-300 transition">
            🎲 Caso aleatorio
          </button>
        </div>
      </section>

      {/* Lista de casos */}
      <div class="mt-4 grid gap-3">
        {casos.map((c, i) => {
          const st = estadoCaso(tipo, c.id, guardadas);
          return (
            <a
              key={c.id}
              href={`${meta.href}/${c.modulo.slug}`}
              class="bg-white border-2 rounded-2xl p-4 sm:p-5 flex items-start gap-3 hover:border-gray-400 hover:shadow transition text-left"
            >
              <span class="w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 bg-gray-900 text-white">
                {i + 1}
              </span>
              <span class="flex-1 min-w-0">
                <span class="block text-[11px] font-bold uppercase tracking-widest text-gray-400">Caso {i + 1}</span>
                <span class="block font-bold leading-tight text-base sm:text-lg mt-0.5">{extractoCaso(tipo, c.id)}</span>
              </span>
              <span class={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${st.estilos}`}>{st.etiqueta}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
