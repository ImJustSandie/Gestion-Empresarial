// src/components/ActividadesIndice.tsx
// Portada del laboratorio, con la misma lengua visual que la portada de bloques:
// tarjeta de progreso general + encabezado de sección + una tarjeta por TIPO de
// actividad (con color de acento, progreso y CTA). Cada tipo tiene su propia
// página con sus casos en /alfabetizacion/actividades/<tipo>.
import { useState } from "preact/hooks";
import { loadActividades, resumenLaboratorio } from "../utils/alfabetizacionActividades";

export default function ActividadesIndice() {
  const [guardadas] = useState(loadActividades);
  const resumen = resumenLaboratorio(guardadas);

   return (
    <div>
      {/* Encabezado de la sección */}
      <div class="mb-8">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#5932EA] mb-1.5">
          MÓDULO · ACTIVIDADES
        </p>
        <h2 class="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
          Laboratorio de actividades
        </h2>
        <p class="text-base sm:text-lg text-slate-600 max-w-3xl leading-relaxed">
          Elige un tipo de actividad para empezar. Evalúa respuestas de IA sin necesidad de construir una IA real.
          Tu progreso se guarda en este navegador.
        </p>
      </div>

      {/* Tarjetas por tipo de actividad */}
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {resumen.tipos.map(({ meta, total, completadas, pct }) => (
          <a
            key={meta.tipo}
            href={meta.href}
            class="bg-white border border-slate-200/90 rounded-3xl overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5932EA]/40"
          >
            <div>
              <div
                class={`${meta.theme.headerBg} relative overflow-hidden min-h-[150px] p-5 sm:p-6 text-white flex flex-col justify-between`}
              >
                {meta.theme.imagen ? (
                  <>
                    <img
                      src={meta.theme.imagen}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      class="pointer-events-none absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{ filter: "grayscale(100%) contrast(1.15)" }}
                    />
                    <span
                      class="pointer-events-none absolute inset-0"
                      style={{ background: meta.theme.capa }}
                      aria-hidden="true"
                    />
                  </>
                ) : (
                  <>
                    {/* Halo de luz */}
                    <span
                      class="pointer-events-none absolute -top-12 -right-10 w-40 h-40 rounded-full bg-white/25 blur-2xl"
                      aria-hidden="true"
                    />
                    {/* Patrón de puntos */}
                    <span
                      class="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:14px_14px]"
                      aria-hidden="true"
                    />
                    {/* Emoji marca de agua */}
                    <span
                      class="pointer-events-none absolute -right-3 -bottom-6 text-[80px] leading-none opacity-25 select-none transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                      aria-hidden="true"
                    >
                      {meta.icono}
                    </span>
                  </>
                )}

                <span class="relative inline-flex items-center gap-1.5 text-xs font-extrabold tracking-widest bg-white/20 ring-1 ring-white/30 px-3 py-1.5 rounded-full uppercase w-fit backdrop-blur-md">
                  <span class="w-1.5 h-1.5 rounded-full bg-white/80" />
                  {total} casos
                </span>

                <h3 class="relative text-xl sm:text-2xl font-extrabold mt-3 leading-tight pr-10 drop-shadow-sm">
                  {meta.titulo}
                </h3>
              </div>

              <div class="p-5 sm:p-6 flex-1 flex flex-col">
                <p class="text-[15px] text-slate-600 leading-relaxed">
                  {meta.descripcion}
                </p>
              </div>
            </div>

            <div class="p-5 sm:p-6 pt-0">
              <div class="mb-3">
                <div class="flex justify-between text-sm text-slate-500 mb-1.5">
                  <span>{completadas}/{total} completados</span>
                  <span class="font-bold">{pct}%</span>
                </div>
                <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    class={`h-full ${meta.theme.barBg} transition-all duration-300`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <span
                class={`w-full py-3.5 px-4 rounded-2xl ${meta.theme.btnBg} text-white text-base font-bold transition shadow-xs flex items-center justify-center gap-1`}
              >
                Abrir →
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
