// src/components/dashboard/MultiSegmentDonut.tsx
import { useState } from "preact/hooks";

export interface DonutSegment {
  key: string;
  label: string;
  count: number;
  color: string;
}

interface MultiSegmentDonutProps {
  segments: DonutSegment[];
  size?: number;
  centerValue?: string;
  centerLabel?: string;
  centerSubtext?: string;
  onHoverSegment?: (key: string | null) => void;
  onClickSegment?: (key: string) => void;
  activeSegmentKey?: string | null;
  selectedSegmentKey?: string | null;
}

export default function MultiSegmentDonut({
  segments,
  size = 190,
  onHoverSegment,
  onClickSegment,
  activeSegmentKey,
  selectedSegmentKey,
}: MultiSegmentDonutProps) {
  const [internalHoverKey, setInternalHoverKey] = useState<string | null>(null);
  const currentHoverKey = activeSegmentKey !== undefined ? activeSegmentKey : internalHoverKey;

  const total = segments.reduce((acc, s) => acc + s.count, 0);

  // Parámetros de geometría SVG
  const cx = 100;
  const cy = 100;
  const radius = 88;

  // Estado vacío si no hay entregas
  if (total === 0) {
    return (
      <div class="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 200 200" width={size} height={size}>
          <circle cx={cx} cy={cy} r={radius} fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" class="text-xs font-semibold fill-gray-400">
            Sin datos
          </text>
        </svg>
      </div>
    );
  }

  // Si solo hay 1 segmento con el 100%
  const activeSegments = segments.filter((s) => s.count > 0);
  if (activeSegments.length === 1) {
    const single = activeSegments[0];
    const isHovered = currentHoverKey === single.key;
    const isAnyHovered = currentHoverKey !== null;
    const fillColor = isHovered ? single.color : isAnyHovered ? "#E2E8F0" : single.color;

    return (
      <div class="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
        <svg viewBox="0 0 200 200" width={size} height={size}>
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill={fillColor}
            stroke="#FFFFFF"
            strokeWidth="3"
            class="transition-colors duration-200 cursor-pointer"
            onMouseEnter={() => {
              setInternalHoverKey(single.key);
              onHoverSegment?.(single.key);
            }}
            onMouseLeave={() => {
              setInternalHoverKey(null);
              onHoverSegment?.(null);
            }}
          />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            class="font-black text-xl font-mono fill-white pointer-events-none drop-shadow-xs"
          >
            100%
          </text>
        </svg>
      </div>
    );
  }

  // Pre-calcular arcos y posiciones de porcentajes
  let accumulatedAngle = -Math.PI / 2; // Comenzar en las 12 en punto (-90°)
  const slices = segments.map((seg) => {
    if (seg.count <= 0) {
      return {
        ...seg,
        pct: 0,
        pathD: "",
        textX: cx,
        textY: cy,
        hasSlice: false,
      };
    }

    const sliceAngle = (seg.count / total) * (2 * Math.PI);
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + sliceAngle;
    accumulatedAngle += sliceAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
    const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    // Posición del porcentaje dentro de la rebanada (en el baricentro angular a radio ~0.6)
    const midAngle = startAngle + sliceAngle / 2;
    const textRadius = radius * 0.62;
    const textX = cx + textRadius * Math.cos(midAngle);
    const textY = cy + textRadius * Math.sin(midAngle);

    // Vector de traslación sutil cuando está en hover (pull-out slice)
    const pullOutDist = 4;
    const pullX = pullOutDist * Math.cos(midAngle);
    const pullY = pullOutDist * Math.sin(midAngle);

    return {
      ...seg,
      pct: Math.round((seg.count / total) * 100),
      pathD,
      textX,
      textY,
      pullX,
      pullY,
      hasSlice: true,
    };
  });

  const isAnyHovered = currentHoverKey !== null;
  const isAnySelected = selectedSegmentKey !== null && selectedSegmentKey !== undefined;

  return (
    <div class="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} class="overflow-visible">
        {slices.map((slice) => {
          if (!slice.hasSlice) return null;
          const isHovered = currentHoverKey === slice.key;
          const isSelected = selectedSegmentKey === slice.key;

          // Color: el segmento activo (hover o seleccionado) mantiene color; los demás se atenúan
          const isActive = isHovered || isSelected;
          const fillColor = isActive
            ? slice.color
            : isAnyHovered || isAnySelected
            ? "#E2E8F0"
            : slice.color;
          const textColor = isActive
            ? "#FFFFFF"
            : isAnyHovered || isAnySelected
            ? "#94A3B8"
            : "#FFFFFF";

          // Pull-out: el seleccionado se desplaza más que el hover
          const pullDist = isSelected ? 8 : isHovered ? 4 : 0;
          const midAngle = Math.atan2(slice.pullY / 4, slice.pullX / 4);
          const pullX = pullDist * Math.cos(midAngle);
          const pullY = pullDist * Math.sin(midAngle);
          const transform = `translate(${pullX}, ${pullY})`;

          return (
            <g
              key={slice.key}
              style={{ transform, transition: "transform 220ms ease, fill 200ms ease" }}
              class="cursor-pointer"
              onMouseEnter={() => {
                setInternalHoverKey(slice.key);
                onHoverSegment?.(slice.key);
              }}
              onMouseLeave={() => {
                setInternalHoverKey(null);
                onHoverSegment?.(null);
              }}
              onClick={() => onClickSegment?.(slice.key)}
            >
              {/* Sector / Rebanada del Pastel */}
              <path
                d={slice.pathD}
                fill={fillColor}
                stroke={isSelected ? "#FFFFFF" : "#FFFFFF"}
                strokeWidth={isSelected ? "4" : "2.5"}
                strokeLinejoin="round"
                class="transition-colors duration-200"
              />

              {/* Porcentaje impreso directamente dentro de la rebanada */}
              {slice.pct >= 5 && (
                <text
                  x={slice.textX}
                  y={slice.textY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={textColor}
                  class="font-black text-[13px] font-mono tracking-tight pointer-events-none drop-shadow-xs transition-colors duration-200"
                >
                  {slice.pct}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
