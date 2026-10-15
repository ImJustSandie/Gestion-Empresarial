// src/components/dashboard/BarChart.tsx
import { useState } from "preact/hooks";

export interface VerticalBarItem {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  pct?: number;
  color?: string;
}

export interface HorizontalBarItem {
  id: string;
  title: string;
  type?: string;
  value: number; // 0 a 100
  secondaryValue?: number;
  labelRight: string;
  color?: string;
}

interface VerticalBarChartProps {
  items: VerticalBarItem[];
  height?: number;
  valueSuffix?: string;
  emptyMessage?: string;
}

export function VerticalBarChart({
  items,
  height = 180,
  valueSuffix = "est.",
  emptyMessage = "Sin datos disponibles",
}: VerticalBarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (items.length === 0) {
    return <div class="text-xs text-gray-400 py-8 text-center">{emptyMessage}</div>;
  }

  const maxValue = Math.max(...items.map((i) => i.value), 1);

  return (
    <div class="w-full">
      <div
        class="flex items-end justify-between gap-3 pt-6 pb-2 border-b border-gray-100"
        style={{ height }}
      >
        {items.map((item, idx) => {
          const barHeightPct = Math.max(8, Math.round((item.value / maxValue) * 100));
          const isHovered = hoveredIdx === idx;
          const barColor = item.color || "#5932EA";

          return (
            <div
              key={item.key}
              class="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip flotante */}
              {isHovered && (
                <div class="absolute -top-10 bg-gray-900 text-white text-[11px] font-semibold py-1 px-2 rounded shadow-lg z-20 whitespace-nowrap animate-fade-in pointer-events-none">
                  {item.value} {valueSuffix} {typeof item.pct === "number" ? `(${item.pct}%)` : ""}
                </div>
              )}

              {/* Valor superior */}
              <span
                class={`text-xs font-bold mb-1 transition-colors ${
                  isHovered ? "text-gray-900 font-extrabold" : "text-gray-500"
                }`}
              >
                {item.value}
              </span>

              {/* Barra */}
              <div class="w-full max-w-[48px] bg-gray-100 rounded-t-lg overflow-hidden flex flex-col justify-end">
                <div
                  class="w-full rounded-t-lg transition-all duration-500 ease-out"
                  style={{
                    height: `${barHeightPct}%`,
                    backgroundColor: barColor,
                    opacity: hoveredIdx !== null && !isHovered ? 0.6 : 1,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Etiquetas inferiores */}
      <div class="flex items-start justify-between gap-3 pt-2">
        {items.map((item) => (
          <div key={item.key} class="flex-1 text-center min-w-0">
            <p class="text-xs font-semibold text-gray-700 truncate" title={item.label}>
              {item.label}
            </p>
            {item.sublabel && (
              <p class="text-[10px] text-gray-400 truncate">{item.sublabel}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface HorizontalBarChartProps {
  items: HorizontalBarItem[];
  emptyMessage?: string;
  onItemClick?: (id: string) => void;
}

export function HorizontalBarChart({
  items,
  emptyMessage = "No hay actividades registradas en este curso.",
  onItemClick,
}: HorizontalBarChartProps) {
  if (items.length === 0) {
    return <div class="text-xs text-gray-400 py-8 text-center">{emptyMessage}</div>;
  }

  const typeBadges: Record<string, { label: string; class: string }> = {
    evaluacion: { label: "Evaluación", class: "bg-rose-50 text-rose-700 border-rose-200" },
    tarea: { label: "Tarea", class: "bg-blue-50 text-blue-700 border-blue-200" },
    actividad: { label: "Actividad", class: "bg-purple-50 text-purple-700 border-purple-200" },
  };

  return (
    <div class="space-y-3.5">
      {items.map((item) => {
        const barColor = item.color || "#5932EA";
        const badge = item.type ? typeBadges[item.type] : null;

        return (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item.id)}
            class={`p-2.5 rounded-xl transition-all ${
              onItemClick ? "hover:bg-gray-50 cursor-pointer" : ""
            }`}
          >
            <div class="flex items-center justify-between gap-3 mb-1.5">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                {badge && (
                  <span
                    class={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${badge.class}`}
                  >
                    {badge.label}
                  </span>
                )}
                <span class="text-xs font-semibold text-gray-800 truncate" title={item.title}>
                  {item.title}
                </span>
              </div>
              <span class="text-xs font-extrabold text-gray-900 shrink-0">
                {item.labelRight}
              </span>
            </div>

            {/* Barra de progreso */}
            <div class="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
              <div
                class="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(100, Math.max(0, item.value))}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
