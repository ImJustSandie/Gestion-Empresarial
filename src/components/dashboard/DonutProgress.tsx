// src/components/dashboard/DonutProgress.tsx
interface DonutProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  title?: string;
  subtitle?: string;
  label?: string;
}

export default function DonutProgress({
  percentage,
  size = 140,
  strokeWidth = 14,
  color = "#5932EA",
  bgColor = "#EDE9FE",
  title,
  subtitle,
  label,
}: DonutProgressProps) {
  const cleanPct = Math.min(100, Math.max(0, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (cleanPct / 100) * circumference;

  return (
    <div class="flex flex-col items-center justify-center">
      <div class="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg class="transform -rotate-90" width={size} height={size}>
          {/* Pista de fondo */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={bgColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Arco de progreso */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            class="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Texto central */}
        <div class="absolute flex flex-col items-center justify-center text-center">
          <span class="text-2xl font-black text-gray-900 leading-none">
            {cleanPct}%
          </span>
          {label && (
            <span class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">
              {label}
            </span>
          )}
        </div>
      </div>
      {(title || subtitle) && (
        <div class="text-center mt-3">
          {title && <p class="text-sm font-bold text-gray-800">{title}</p>}
          {subtitle && <p class="text-xs text-gray-500">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}
