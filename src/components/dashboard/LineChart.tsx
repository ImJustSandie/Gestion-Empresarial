// src/components/dashboard/LineChart.tsx
import { useState } from "preact/hooks";

export interface LineDataPoint {
  label: string; // Título corto o fecha de actividad
  studentScore: number | null;
  groupAvg: number | null;
  statusLabel?: string;
}

interface LineChartProps {
  data: LineDataPoint[];
  studentName?: string;
  height?: number;
}

export default function LineChart({
  data,
  studentName = "Estudiante",
  height = 220,
}: LineChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div class="h-44 flex items-center justify-center text-xs text-gray-400">
        No hay datos de actividades para trazar la tendencia temporal.
      </div>
    );
  }

  // Dimensiones SVG
  const width = 600;
  const paddingLeft = 40;
  const paddingRight = 25;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const count = data.length;
  const getX = (index: number) => {
    if (count <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (count - 1)) * chartWidth;
  };

  const getY = (val: number | null) => {
    if (val === null) return paddingTop + chartHeight;
    const clamped = Math.max(0, Math.min(100, val));
    return paddingTop + chartHeight - (clamped / 100) * chartHeight;
  };

  // Construir paths SVG
  // 1. Serie Grupo
  const groupPoints = data.map((d, i) => `${getX(i)},${getY(d.groupAvg)}`).join(" ");

  // 2. Serie Estudiante (filtrando nulos para la línea continua)
  const studentValidPoints = data
    .map((d, i) => (d.studentScore !== null ? { x: getX(i), y: getY(d.studentScore), idx: i } : null))
    .filter((p): p is { x: number; y: number; idx: number } => p !== null);

  const studentPathD =
    studentValidPoints.length > 0
      ? studentValidPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "")
      : "";

  return (
    <div class="w-full">
      {/* Leyenda superior */}
      <div class="flex items-center justify-end gap-5 text-xs mb-2">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-[#5932EA]" />
          <span class="font-medium text-gray-700">{studentName}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-4 h-0.5 border-b-2 border-dashed border-slate-400" />
          <span class="font-medium text-slate-500">Promedio del Grupo</span>
        </div>
      </div>

      <div class="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          class="w-full h-auto overflow-visible"
          style={{ minWidth: 400 }}
        >
          {/* Ejes horizontales de referencia (0, 25, 50, 75, 100) */}
          {[0, 25, 50, 75, 100].map((level) => {
            const y = getY(level);
            return (
              <g key={level}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth={level === 60 ? "1.5" : "1"}
                  strokeDasharray={level === 60 ? "3 3" : undefined}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  class="text-[10px] fill-slate-400 font-mono"
                >
                  {level}
                </text>
              </g>
            );
          })}

          {/* Línea del promedio del aula */}
          {groupPoints && (
            <polyline
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2"
              strokeDasharray="4 4"
              points={groupPoints}
            />
          )}

          {/* Línea del estudiante */}
          {studentPathD && (
            <path
              d={studentPathD}
              fill="none"
              stroke="#5932EA"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Puntos de datos */}
          {data.map((item, i) => {
            const x = getX(i);
            const studentY = item.studentScore !== null ? getY(item.studentScore) : null;
            const groupY = item.groupAvg !== null ? getY(item.groupAvg) : null;
            const isActive = activeIdx === i;

            return (
              <g key={i}>
                {/* Línea vertical indicadora en hover */}
                {isActive && (
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + chartHeight}
                    stroke="#5932EA"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.5"
                  />
                )}

                {/* Punto Promedio del grupo */}
                {groupY !== null && (
                  <circle
                    cx={x}
                    cy={groupY}
                    r={isActive ? 4 : 3}
                    fill="#94A3B8"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                )}

                {/* Punto Estudiante */}
                {studentY !== null && (
                  <circle
                    cx={x}
                    cy={studentY}
                    r={isActive ? 6 : 4.5}
                    fill="#5932EA"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    class="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setActiveIdx(i)}
                    onMouseLeave={() => setActiveIdx(null)}
                  />
                )}

                {/* Punto vacío si no entregó */}
                {item.studentScore === null && (
                  <circle
                    cx={x}
                    cy={paddingTop + chartHeight}
                    r={3.5}
                    fill="#F1F5F9"
                    stroke="#CBD5E1"
                    strokeWidth="1.5"
                    class="cursor-pointer"
                    onMouseEnter={() => setActiveIdx(i)}
                    onMouseLeave={() => setActiveIdx(null)}
                  />
                )}

                {/* Etiqueta del eje X */}
                <text
                  x={x}
                  y={height - 12}
                  textAnchor="middle"
                  class={`text-[10px] transition-colors ${
                    isActive ? "fill-gray-900 font-bold" : "fill-slate-400"
                  }`}
                >
                  {item.label.length > 10 ? `${item.label.slice(0, 9)}…` : item.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip interactivo flotante */}
        {activeIdx !== null && (
          <div
            class="absolute top-2 bg-gray-900/95 backdrop-blur-xs text-white p-2.5 rounded-xl text-xs shadow-xl pointer-events-none transition-all z-20"
            style={{
              left: `${Math.min(75, Math.max(10, (getX(activeIdx) / width) * 100))}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p class="font-bold text-gray-100 truncate max-w-[200px]">
              {data[activeIdx].label}
            </p>
            <div class="mt-1 space-y-0.5 font-mono text-[11px]">
              <div class="flex items-center justify-between gap-4">
                <span class="text-violet-300">{studentName}:</span>
                <span class="font-bold">
                  {data[activeIdx].studentScore !== null
                    ? `${data[activeIdx].studentScore} pts`
                    : "Sin entrega"}
                </span>
              </div>
              <div class="flex items-center justify-between gap-4 text-slate-400">
                <span>Promedio grupo:</span>
                <span>
                  {data[activeIdx].groupAvg !== null
                    ? `${data[activeIdx].groupAvg} pts`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
