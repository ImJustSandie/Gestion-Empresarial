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
      <section class={`rounded-3xl overflow-hidden p-6 sm:p-10 relative shadow-lg ${meta.hero}`}>
        {meta.theme.imagen ? (
          <>
            <img
              src={meta.theme.imagen}
              alt=""
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 w-full h-full object-cover"
              style={{ filter: "grayscale(100%) contrast(1.15)" }}
            />
            <span class="pointer-events-none absolute inset-0" style={{ background: meta.theme.capa }} aria-hidden="true" />
          </>
        ) : (
          <>
            {/* Capas decorativas */}
            <span class="pointer-events-none absolute -top-16 -right-10 w-72 h-72 rounded-full bg-white/20 blur-3xl" aria-hidden="true" />
            <span class="pointer-events-none absolute -bottom-24 left-1/4 w-64 h-64 rounded-full bg-black/10 blur-3xl" aria-hidden="true" />
            <span class="pointer-events-none absolute -right-6 -bottom-10 text-[180px] sm:text-[240px] leading-none opacity-10 select-none" aria-hidden="true">
              {meta.icono}
            </span>
          </>
        )}

        <div class="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
          <div class="flex-1 min-w-0">
            <a href="/alfabetizacion/actividades" class="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full font-semibold inline-block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50">← Todas las actividades</a>
            <p class="mt-5 text-xs font-extrabold tracking-widest bg-white/20 block w-fit px-3 py-1.5 rounded-lg">{casos.length} CASOS</p>
            <h1 class="text-3xl sm:text-5xl font-extrabold mt-2 leading-tight max-w-3xl">{meta.titulo}</h1>
            <p class="mt-3 text-white/90 max-w-2xl text-base sm:text-lg leading-relaxed">{meta.descripcion}</p>
            <div class="mt-5">
              <button onClick={aleatorio} class="px-7 py-3.5 rounded-2xl bg-white text-slate-900 text-base font-extrabold hover:bg-slate-100 transition shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50">
                🎲 Caso aleatorio
              </button>
            </div>
          </div>

          {/* Emoji protagonista */}
          <div class="hidden md:flex shrink-0 w-32 h-32 lg:w-40 lg:h-40 rounded-3xl bg-white/15 border border-white/25 backdrop-blur-md shadow-2xl items-center justify-center text-6xl lg:text-7xl rotate-3 transition-transform hover:rotate-0 hover:scale-105">
            {meta.icono}
          </div>

          {/* Insignia compacta en móvil */}
          <span
            class="md:hidden absolute right-4 top-4 w-12 h-12 rounded-2xl bg-white/20 border border-white/25 backdrop-blur-md shadow-lg flex items-center justify-center text-2xl select-none"
            aria-hidden="true"
          >
            {meta.icono}
          </span>
        </div>
      </section>

      {/* Lista de casos */}
      <div class="mt-5 grid gap-4">
        {casos.map((c, i) => {
          const st = estadoCaso(tipo, c.id, guardadas);
          return (
            <a
              key={c.id}
              href={`${meta.href}/${c.modulo.slug}`}
              class={`bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 flex items-center gap-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5932EA]/40 ${meta.theme.borderHover} hover:shadow transition text-left`}
            >
              <span class={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg shrink-0 text-white ${meta.theme.barBg}`}>
                {i + 1}
              </span>
              <span class="flex-1 min-w-0">
                <span class="block text-xs font-bold uppercase tracking-widest text-slate-400">Caso {i + 1}</span>
                <span class="block font-bold leading-snug text-lg sm:text-xl mt-1 text-slate-900">{extractoCaso(tipo, c.id)}</span>
              </span>
              <span class={`shrink-0 text-sm font-bold px-3.5 py-1.5 rounded-full ${st.estilos}`}>{st.etiqueta}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
