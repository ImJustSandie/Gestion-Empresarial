// src/components/dashboard/MetricCard.tsx
import type { ComponentChildren } from "preact";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: {
    text: string;
    variant: "success" | "warning" | "danger" | "brand" | "neutral";
  };
  icon?: ComponentChildren;
  progressPct?: number;
  progressColor?: string;
  footerNote?: string;
  onClick?: () => void;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  badge,
  icon,
  progressPct,
  progressColor = "#5932EA",
  footerNote,
  onClick,
}: MetricCardProps) {
  const badgeClasses = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    brand: "bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]",
    neutral: "bg-gray-100 text-gray-700 border-gray-200",
  }[badge?.variant || "neutral"];

  return (
    <div
      onClick={onClick}
      class={`bg-white rounded-2xl border border-gray-200 p-6 shadow-xs transition-all duration-200 hover:shadow-md hover:border-gray-300 ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 truncate">
            {title}
          </p>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-extrabold text-gray-900 tracking-tight">
              {value}
            </span>
            {badge && (
              <span
                class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClasses}`}
              >
                {badge.text}
              </span>
            )}
          </div>
          {subtitle && <p class="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>

        {icon && (
          <div class="shrink-0 w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#5932EA]">
            {icon}
          </div>
        )}
      </div>

      {typeof progressPct === "number" && (
        <div class="mt-4">
          <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, progressPct))}%`,
                backgroundColor: progressColor,
              }}
            />
          </div>
        </div>
      )}

      {footerNote && (
        <div class="mt-3 pt-3 border-t border-gray-100 flex items-center text-xs text-gray-500">
          {footerNote}
        </div>
      )}
    </div>
  );
}
