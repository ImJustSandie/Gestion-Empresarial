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
  height = 200,
  valueSuffix = "est.",
  emptyMessage = "Sin datos disponibles",
}: VerticalBarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (items.length === 0) {
    return <div class="text-xs text-gray-400 py-8 text-center">{emptyMessage}</div>;
  }

  // Dimensiones SVG
  const svgWidth = 420;
  const svgHeight = height;
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 26;
  const paddingBottom = 42;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const baselineY = paddingTop + chartHeight;

  // Escala máxima (al menos 4 para tener guías visuales legibles)
  const rawMax = Math.max(...items.map((i) => i.value), 0);
  const maxValue = rawMax === 0 ? 5 : Math.ceil(rawMax * 1.25);

  // Niveles del eje Y para las líneas de cuadrícula
  const ySteps = [0, Math.round(maxValue / 2), maxValue];

  const colWidth = chartWidth / items.length;
  const barWidth = Math.min(46, colWidth * 0.65);

  return (
    <div class="w-full relative">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        class="w-full h-auto overflow-visible select-none"
      >
        {/* Líneas horizontales de fondo */}
        {ySteps.map((val) => {
          const y = baselineY - (val / maxValue) * chartHeight;
          return (
            <g key={val}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="#F1F5F9"
                strokeWidth="1.5"
                strokeDasharray={val === 0 ? undefined : "3 3"}
              />
              <text
                x={paddingLeft - 6}
                y={y + 3.5}
                textAnchor="end"
                class="text-[10px] font-mono fill-slate-400"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Columnas y Barras */}
        {items.map((item, idx) => {
          const colCenterX = paddingLeft + idx * colWidth + colWidth / 2;
          const barX = colCenterX - barWidth / 2;
          const isHovered = hoveredIdx === idx;

          // Altura de la barra
          const barH = item.value > 0 ? Math.max(8, (item.value / maxValue) * chartHeight) : 4;
          const barY = baselineY - barH;
          const barColor = item.color || "#5932EA";

          return (
            <g
              key={item.key}
              class="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Pista de fondo translúcida (Track) */}
              <rect
                x={barX}
                y={paddingTop}
                width={barWidth}
                height={chartHeight}
                rx="8"
                fill={isHovered ? "#F1F5F9" : "#F8FAFC"}
                class="transition-colors duration-150"
              />

              {/* Barra de valor rellena */}
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barH}
                rx="7"
                fill={barColor}
                opacity={hoveredIdx !== null && !isHovered ? 0.65 : 1}
                class="transition-all duration-300 ease-out"
              />

              {/* Borde sutil superior de la barra cuando tiene valor */}
              {item.value > 0 && (
                <line
                  x1={barX + 4}
                  y1={barY}
                  x2={barX + barWidth - 4}
                  y2={barY}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              )}

              {/* Valor numérico encima de la barra */}
              <text
                x={colCenterX}
                y={item.value > 0 ? barY - 6 : baselineY - 8}
                textAnchor="middle"
                class={`text-[12px] font-mono transition-all duration-150 ${
                  isHovered ? "font-black fill-gray-950 scale-105" : "font-bold fill-gray-700"
                }`}
              >
                {item.value}
              </text>

              {/* Etiqueta del rango de calificación (Eje X) */}
              <text
                x={colCenterX}
                y={baselineY + 16}
                textAnchor="middle"
                class={`text-[11px] font-bold transition-colors ${
                  isHovered ? "fill-[#5932EA]" : "fill-gray-700"
                }`}
              >
                {item.sublabel || item.label}
              </text>

              {/* Porcentaje o categoría corta */}
              <text
                x={colCenterX}
                y={baselineY + 29}
                textAnchor="middle"
                class="text-[9px] font-semibold fill-gray-400"
              >
                {typeof item.pct === "number" ? `${item.pct}%` : item.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip flotante al pasar el cursor */}
      {hoveredIdx !== null && (
        <div
          class="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-xl shadow-xl pointer-events-none z-20 flex items-center gap-2 animate-fade-in"
        >
          <span
            class="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: items[hoveredIdx].color || "#5932EA" }}
          />
          <span class="font-bold">{items[hoveredIdx].label}:</span>
          <span class="font-mono text-violet-200">
            {items[hoveredIdx].value} {valueSuffix}
          </span>
          {typeof items[hoveredIdx].pct === "number" && (
            <span class="text-gray-400">({items[hoveredIdx].pct}%)</span>
          )}
        </div>
      )}
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
