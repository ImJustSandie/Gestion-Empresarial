// src/utils/alfabetizacionActividades.ts
// Las actividades viven en 3 JSON (uno por tipo) en src/data/:
//   actividades-elegir.json .... "¿Cuál respuesta elegirías?"
//   actividades-detector.json ... "Detector de alucinaciones" (forense)
//   actividades-promptlab.json .. "Prompt lab" (generar prompts)
// Para agregar una variante basta añadir un objeto al JSON que corresponda:
// las páginas y el índice se generan solos (rutas dinámicas por slug).
import ELEGIR_JSON from "../data/actividades-elegir.json";
import DETECTOR_JSON from "../data/actividades-detector.json";
import PROMPTLAB_JSON from "../data/actividades-promptlab.json";

export type Veredicto = "correcta" | "incorrecta" | "pendiente";
export type TipoActividad = "elegir" | "detector" | "promptlab";

export interface OpcionRespuesta {
  id: "A" | "B" | "C";
  texto: string;
}

export interface ModuloActividad {
  slug: string;
  titulo: string;
  descripcion: string;
  icono: string;
}

export interface ConexionContenido {
  bloqueId: string;
  bloqueTitulo: string;
  leccionId: string;
  leccionCodigo: string;
  leccionTitulo: string;
}

export interface ActividadElegir {
  id: string;
  modulo: ModuloActividad;
  titulo: string;
  problema: string;
  contexto: string;
  opciones: OpcionRespuesta[];
  correcta: "A" | "B" | "C";
  detalleFalso: string;
  retro: Record<"A" | "B" | "C", string>;
  conexion: ConexionContenido;
}

export interface Afirmacion {
  id: string;
  texto: string;
  veredicto: Veredicto;
  explicacion: string;
}

export interface ActividadDetector {
  id: string;
  modulo: ModuloActividad;
  titulo: string;
  introduccion: string;
  textoIA: string;
  afirmaciones: Afirmacion[];
  conexion: ConexionContenido;
}

export interface PiezaPrompt {
  id: string;
  etiqueta: string;
  texto: string;
  requerida: boolean;
  orden?: number;
  porQue: string;
}

export interface ActividadPromptLab {
  id: string;
  modulo: ModuloActividad;
  titulo: string;
  introduccion: string;
  mision: string;
  promptVago: string;
  piezas: PiezaPrompt[];
  conexion: ConexionContenido;
}

export const ACTIVIDADES_ELEGIR = ELEGIR_JSON as unknown as ActividadElegir[];
export const ACTIVIDADES_DETECTOR = DETECTOR_JSON as unknown as ActividadDetector[];
export const ACTIVIDADES_PROMPTLAB = PROMPTLAB_JSON as unknown as ActividadPromptLab[];

// --- Índice de módulos: cada variante cuelga de su tipo ---
// /alfabetizacion/actividades/<tipo>/<slug>

export interface ModuloConTipo extends ModuloActividad {
  tipo: TipoActividad;
  numero: number; // posición dentro de su tipo (Caso N)
  href: string;
}

function conTipo(tipo: TipoActividad, lista: { modulo: ModuloActividad }[]): ModuloConTipo[] {
  return lista.map((a, i) => ({
    ...a.modulo,
    tipo,
    numero: i + 1,
    href: `/alfabetizacion/actividades/${tipo}/${a.modulo.slug}`,
  }));
}

export const MODULOS_ACTIVIDADES: ModuloConTipo[] = [
  ...conTipo("elegir", ACTIVIDADES_ELEGIR),
  ...conTipo("detector", ACTIVIDADES_DETECTOR),
  ...conTipo("promptlab", ACTIVIDADES_PROMPTLAB),
];

export function moduloDe(tipo: TipoActividad, slug: string): ModuloConTipo | undefined {
  return MODULOS_ACTIVIDADES.find((m) => m.tipo === tipo && m.slug === slug);
}

// --- Tipos como bloques: cada tipo tiene su portada con sus casos ---

export interface TipoMeta {
  tipo: TipoActividad;
  titulo: string;
  descripcion: string;
  icono: string;
  href: string;
  hero: string;
  borde: string;
}

export const TIPOS_ACTIVIDADES: TipoMeta[] = [
  {
    tipo: "elegir",
    titulo: "¿Cuál respuesta elegirías?",
    descripcion: "Tres respuestas de IA, una sola es la mejor. Elige un caso o deja que el sistema te dé uno al azar.",
    icono: "⚖️",
    href: "/alfabetizacion/actividades/elegir",
    hero: "bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white",
    borde: "border-gray-200 hover:border-indigo-400",
  },
  {
    tipo: "detector",
    titulo: "Detector de alucinaciones",
    descripcion: "Clasifica afirmaciones como un forense digital. Elige un caso o deja que el sistema te dé uno al azar.",
    icono: "🔍",
    href: "/alfabetizacion/actividades/detector",
    hero: "bg-slate-950 text-white",
    borde: "border-slate-700 hover:border-emerald-500",
  },
  {
    tipo: "promptlab",
    titulo: "Prompt lab",
    descripcion: "Genera tu propio prompt por piezas. Elige un experimento o deja que el sistema te dé uno al azar.",
    icono: "⚗️",
    href: "/alfabetizacion/actividades/prompt-lab",
    hero: "bg-gradient-to-br from-teal-600 via-emerald-700 to-green-800 text-white",
    borde: "border-gray-200 hover:border-teal-500",
  },
];

export function listaPorTipo(tipo: TipoActividad): (ActividadElegir | ActividadDetector | ActividadPromptLab)[] {
  return tipo === "elegir" ? ACTIVIDADES_ELEGIR : tipo === "detector" ? ACTIVIDADES_DETECTOR : ACTIVIDADES_PROMPTLAB;
}

export function actividadPorSlug(
  tipo: TipoActividad,
  slug: string,
): ActividadElegir | ActividadDetector | ActividadPromptLab | undefined {
  return listaPorTipo(tipo).find((a) => a.modulo.slug === slug);
}

/** Texto para identificar el caso en la lista (contenido, no nombre). */
export function extractoCaso(tipo: TipoActividad, id: string): string {
  if (tipo === "elegir") return ACTIVIDADES_ELEGIR.find((a) => a.id === id)?.problema ?? "";
  if (tipo === "detector") {
    const t = ACTIVIDADES_DETECTOR.find((a) => a.id === id)?.textoIA ?? "";
    return t.length > 110 ? `${t.slice(0, 110).trimEnd()}…` : t;
  }
  const m = ACTIVIDADES_PROMPTLAB.find((a) => a.id === id)?.mision ?? "";
  return m.length > 110 ? `${m.slice(0, 110).trimEnd()}…` : m;
}

// --- Persistencia por id de actividad (localStorage, sin backend) ---

const STORAGE_KEY = "gestion-empresarial:actividades-v2";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export interface ActividadesGuardadas {
  elegir: Record<string, { seleccion: "A" | "B" | "C"; acierto: boolean }>;
  detector: Record<string, Record<string, Veredicto>>;
  promptLab: Record<string, { piezas: string[]; exito: boolean }>;
}

function vacias(): ActividadesGuardadas {
  return { elegir: {}, detector: {}, promptLab: {} };
}

export function loadActividades(): ActividadesGuardadas {
  try {
    if (!isBrowser()) return vacias();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return vacias();
    const parsed = JSON.parse(raw) as Partial<ActividadesGuardadas>;
    return {
      elegir: parsed.elegir ?? {},
      detector: parsed.detector ?? {},
      promptLab: parsed.promptLab ?? {},
    };
  } catch {
    return vacias();
  }
}

export function saveActividades(next: ActividadesGuardadas): void {
  try {
    if (isBrowser()) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* sin localStorage */
  }
}

// --- Estado compartido (portada de tipos + páginas de tipo) ---

export interface EstadoCaso {
  etiqueta: string;
  estilos: string;
  completada: boolean;
}

export function estadoCaso(
  tipo: TipoActividad,
  id: string,
  guardadas: ActividadesGuardadas,
): EstadoCaso {
  const sinEmpezar: EstadoCaso = { etiqueta: "Sin empezar", estilos: "bg-gray-100 text-gray-500", completada: false };
  if (tipo === "elegir") {
    const r = guardadas.elegir[id];
    if (!r) return sinEmpezar;
    return r.acierto
      ? { etiqueta: "✓ Completada", estilos: "bg-emerald-100 text-emerald-800", completada: true }
      : { etiqueta: "En progreso", estilos: "bg-amber-100 text-amber-800", completada: false };
  }
  if (tipo === "detector") {
    const act = ACTIVIDADES_DETECTOR.find((a) => a.id === id);
    const marcas = guardadas.detector[id] ?? {};
    if (!act || Object.keys(marcas).length === 0) return sinEmpezar;
    const total = act.afirmaciones.length;
    const hechas = act.afirmaciones.filter((a) => marcas[a.id]).length;
    if (hechas < total)
      return { etiqueta: `En progreso · ${hechas}/${total}`, estilos: "bg-amber-100 text-amber-800", completada: false };
    const aciertos = act.afirmaciones.filter((a) => marcas[a.id] === a.veredicto).length;
    return aciertos === total
      ? { etiqueta: "✓ Completada", estilos: "bg-emerald-100 text-emerald-800", completada: true }
      : { etiqueta: `Cerrada · ${aciertos}/${total}`, estilos: "bg-indigo-100 text-indigo-800", completada: false };
  }
  const lab = guardadas.promptLab[id];
  if (!lab || lab.piezas.length === 0) return sinEmpezar;
  return lab.exito
    ? { etiqueta: "✓ Completada", estilos: "bg-emerald-100 text-emerald-800", completada: true }
    : { etiqueta: "En progreso", estilos: "bg-amber-100 text-amber-800", completada: false };
}
