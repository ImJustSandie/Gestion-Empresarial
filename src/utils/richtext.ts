// src/utils/richtext.ts
// Estilos inline para el .lesson (como un mini editor de texto, pero en texto plano):
//   **negrita**  *cursiva*  __subrayado__  `código`  ==resaltado==
//   {color:red|texto}  {color:#e11d48|texto}
//   {bg:yellow|texto}
//   {font:Georgia|texto}
//   {size:20|texto}
// Las funciones de validación evitan inyección de estilos: solo pasan colores,
// fuentes y tamaños permitidos. Las fuentes son pilas del sistema (funcionan
// sin conexión y en cualquier despliegue estático).

export const COLOR_PALETTE = [
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#0ea5e9",
  "#111827",
  "#6b7280",
  "#ffffff",
  "#000000",
];

const NAMED_COLORS: Record<string, string> = {
  red: "#dc2626",
  orange: "#ea580c",
  yellow: "#ca8a04",
  green: "#16a34a",
  blue: "#2563eb",
  purple: "#7c3aed",
  pink: "#db2777",
  sky: "#0ea5e9",
  black: "#111827",
  gray: "#6b7280",
  white: "#ffffff",
};

export function toSafeColor(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(v)) return v;
  return NAMED_COLORS[v] ?? null;
}

export const FONT_STACKS: Record<string, string> = {
  sistema: 'ui-sans-serif, system-ui, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  times: '"Times New Roman", Times, serif',
  arial: "Arial, Helvetica, sans-serif",
  verdana: "Verdana, Geneva, sans-serif",
  courier: '"Courier New", Courier, monospace',
  impact: 'Impact, "Arial Black", sans-serif',
};

export const FONT_LABELS: Record<string, string> = {
  sistema: "Sistema",
  georgia: "Georgia",
  times: "Times",
  arial: "Arial",
  verdana: "Verdana",
  courier: "Monoespaciada",
  impact: "Impact",
};

export function fontStackFor(name: string): string | null {
  const key = name.trim().toLowerCase();
  if (FONT_STACKS[key]) return FONT_STACKS[key];
  // Nombre personalizado (solo letras, números y espacios): se usa tal cual
  // con fallback sans-serif. Si la fuente no está instalada, no rompe nada.
  if (/^[a-z0-9 ]{1,40}$/i.test(name.trim())) return `${name.trim()}, sans-serif`;
  return null;
}

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

export function clampSize(value: string): number | null {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(48, Math.max(10, n));
}
