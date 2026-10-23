// src/utils/courses.ts - Persistencia JSON local (IndexedDB + /data/courses.json)
import initialCourses from "../data/courses.json";

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  color?: string;
  icon?: string;
  cover?: string;
  profesorIds: string[];
  estudianteIds: string[];
  createdAt: string;
  createdBy: string;
}

/** Tipos de actividadeslab de SintaxIA (alfabetización) vinculables a una actividad */
export type SintaxiaToolTipo = "elegir" | "detector" | "promptlab";

/** Referencia a una herramienta SintaxIA: tipo + caso concreto (slug opcional) */
export interface SintaxiaToolRef {
  tipo: SintaxiaToolTipo;
  /** slug del caso concreto; undefined = cualquier caso (el estudiante elige uno al azar) */
  slug?: string;
}

const SINTAXIA_SEGMENTS: Record<SintaxiaToolTipo, string> = {
  elegir: "elegir",
  detector: "detector",
  promptlab: "prompt-lab",
};

/** URL de la herramienta SintaxIA vinculada (/alfabetizacion/actividades/...) */
export function sintaxiaToolHref(ref?: SintaxiaToolRef): string {
  if (!ref) return "/alfabetizacion/actividades";
  return `/alfabetizacion/actividades/${SINTAXIA_SEGMENTS[ref.tipo]}${ref.slug ? `/${ref.slug}` : ""}`;
}

export interface Activity {
  id: string;
  courseId: string;
  title: string;
  description: string;
  type: "tarea" | "actividad" | "evaluacion";
  dueDate?: string;
  locked?: boolean;    // el profesor bloqueó la edición de entregas para todos los estudiantes
  sintaxia?: SintaxiaToolRef; // herramienta SintaxIA de alfabetización vinculada
  createdAt: string;
  createdBy: string;
}

export interface ActivitySubmission {
  id: string;
  activityId: string;
  courseId: string;
  studentId: string;
  status: "pendiente" | "entregado" | "calificado" | "no_entregado";
  submittedAt?: string;
  content?: string;    // texto de la entrega (actividad completada por el estudiante)
  score?: number;      // 0 a 100
  maxScore: number;    // 100 por defecto
  feedback?: string;
  locked?: boolean;    // el profesor bloqueó la edición de ESTA entrega del estudiante
}

export const COURSE_COLORS: Record<string, { from: string; to: string; label: string }> = {
  morado: { from: "#7C5CE9", to: "#5E3FE6", label: "Morado" },
  violeta: { from: "#8B5CF6", to: "#6D28D9", label: "Violeta" },
  indigo: { from: "#6366F1", to: "#4338CA", label: "Índigo" },
  azul: { from: "#3B82F6", to: "#1D4ED8", label: "Azul" },
  cian: { from: "#06B6D4", to: "#0E7490", label: "Cian" },
  teal: { from: "#14B8A6", to: "#0F766E", label: "Teal" },
  esmeralda: { from: "#10B981", to: "#059669", label: "Esmeralda" },
  lima: { from: "#84CC16", to: "#3F6212", label: "Lima" },
  ambar: { from: "#F59E0B", to: "#B45309", label: "Ámbar" },
  naranja: { from: "#F97316", to: "#C2410C", label: "Naranja" },
  rojo: { from: "#EF4444", to: "#B91C1C", label: "Rojo" },
  rosa: { from: "#F43F5E", to: "#BE123C", label: "Rosa" },
  fucsia: { from: "#D946EF", to: "#A21CAF", label: "Fucsia" },
  cafe: { from: "#A16207", to: "#78350F", label: "Café" },
  gris: { from: "#64748B", to: "#334155", label: "Gris" },
};

export const COURSE_COLOR_IDS = Object.keys(COURSE_COLORS);

export const COURSE_LOGOS = Array.from({ length: 15 }, (_, i) => `logo-${String(i + 1).padStart(2, "0")}.png`);

export const COURSE_COVERS = Array.from({ length: 10 }, (_, i) => `curso-${String(i + 1).padStart(2, "0")}.jpg`);

function hashId(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash;
}

function pickLeastUsedCover(courses: Course[], courseId: string): string {
  const counts = new Map(COURSE_COVERS.map((c) => [c, 0]));
  for (const c of courses) {
    if (c.cover && counts.has(c.cover)) counts.set(c.cover, counts.get(c.cover)! + 1);
  }
  const min = Math.min(...counts.values());
  const candidates = COURSE_COVERS.filter((c) => counts.get(c) === min);
  return candidates[hashId(courseId) % candidates.length];
}

function withCovers(courses: Course[]): Course[] {
  if (courses.every((c) => c.cover && COURSE_COVERS.includes(c.cover))) return courses;
  const assigned = courses.filter((c) => c.cover && COURSE_COVERS.includes(c.cover));
  const pending = courses
    .filter((c) => !c.cover || !COURSE_COVERS.includes(c.cover))
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "") || a.id.localeCompare(b.id));
  const covers = new Map<string, string>();
  for (const c of pending) {
    const cover = pickLeastUsedCover(assigned, c.id);
    covers.set(c.id, cover);
    assigned.push({ ...c, cover });
  }
  return courses.map((c) => (covers.has(c.id) ? { ...c, cover: covers.get(c.id) } : c));
}

export function courseCoverUrl(course: Course): string {
  const cover = course.cover && COURSE_COVERS.includes(course.cover) ? course.cover : COURSE_COVERS[hashId(course.id) % COURSE_COVERS.length];
  return `/multimedia/cursos/${cover}`;
}

const IDB_DB_NAME = "gestion-empresarial";
const IDB_STORE = "kv";
const IDB_COURSES_KEY = "courses-json";
const IDB_ACTIVITIES_KEY = "activities-json";
const IDB_SUBMISSIONS_KEY = "submissions-json";

let coursesCache: Course[] = [...(initialCourses as Course[])];
let activitiesCache: Activity[] = [];
let submissionsCache: ActivitySubmission[] = [];
let cacheHydrated = false;
let hydratePromise: Promise<void> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser() || !("indexedDB" in window)) {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await idbOpen();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await idbOpen();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

async function persistCourses(): Promise<void> {
  await idbSet(IDB_COURSES_KEY, JSON.stringify(coursesCache, null, 2));
}

async function persistActivities(): Promise<void> {
  await idbSet(IDB_ACTIVITIES_KEY, JSON.stringify(activitiesCache, null, 2));
}

async function persistSubmissions(): Promise<void> {
  await idbSet(IDB_SUBMISSIONS_KEY, JSON.stringify(submissionsCache, null, 2));
}

async function hydrate(): Promise<void> {
  if (cacheHydrated) return;
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    const rawCourses = await idbGet(IDB_COURSES_KEY);
    if (rawCourses) {
      try {
        const parsed = JSON.parse(rawCourses);
        if (Array.isArray(parsed)) coursesCache = parsed;
      } catch {}
    } else if (isBrowser()) {
      try {
        const res = await fetch("/data/courses.json", { cache: "no-store" });
        if (res.ok) {
          const parsed = await res.json();
          if (Array.isArray(parsed)) {
            coursesCache = parsed;
            await persistCourses();
          }
        }
      } catch {}
    }
    const rawActs = await idbGet(IDB_ACTIVITIES_KEY);
    if (rawActs) {
      try {
        const parsed = JSON.parse(rawActs);
        if (Array.isArray(parsed)) activitiesCache = parsed;
      } catch {}
    }
    const rawSubs = await idbGet(IDB_SUBMISSIONS_KEY);
    if (rawSubs) {
      try {
        const parsed = JSON.parse(rawSubs);
        if (Array.isArray(parsed)) submissionsCache = parsed;
      } catch {}
    }
    const covered = withCovers(coursesCache);
    if (covered !== coursesCache) {
      coursesCache = covered;
      if (isBrowser()) await persistCourses();
    }
    cacheHydrated = true;
  })();
  return hydratePromise;
}

export async function initCourses(): Promise<void> {
  await hydrate();
}

export async function getCourses(): Promise<Course[]> {
  await hydrate();
  return [...coursesCache];
}

export function getCoursesSync(): Course[] {
  return [...coursesCache];
}

function generate6DigitCode(): string {
  // genera código de 6 números, garantizando unicidad
  let code: string;
  let attempts = 0;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    attempts++;
    if (attempts > 100) break; // fallback
  } while (coursesCache.some((c) => c.code === code));
  return code;
}

export async function createCourse(data: { name: string; description: string; createdBy: string; code?: string; color?: string; icon?: string }): Promise<{ success: boolean; message: string; course?: Course }> {
  await hydrate();
  const name = data.name.trim();
  if (!name) return { success: false, message: "El nombre del curso es obligatorio." };
  // código automático de 6 números (ignora code manual si se pasa)
  const code = generate6DigitCode();
  // validación: exactamente 6 dígitos numéricos
  if (!/^\d{6}$/.test(code)) {
    return { success: false, message: "El código debe ser de 6 números." };
  }
  const id = `course-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const course: Course = {
    id,
    code,
    name,
    description: data.description.trim(),
    color: data.color?.trim() || undefined,
    icon: data.icon?.trim() || undefined,
    cover: pickLeastUsedCover(coursesCache, id),
    profesorIds: [],
    estudianteIds: [],
    createdAt: new Date().toISOString(),
    createdBy: data.createdBy,
  };
  coursesCache = [...coursesCache, course];
  await persistCourses();
  return { success: true, message: `Curso creado con código ${code}.`, course };
}

export async function deleteCourse(courseId: string): Promise<{ success: boolean; message: string }> {
  await hydrate();
  if (!coursesCache.some((c) => c.id === courseId)) return { success: false, message: "Curso no encontrado." };
  coursesCache = coursesCache.filter((c) => c.id !== courseId);
  activitiesCache = activitiesCache.filter((a) => a.courseId !== courseId);
  submissionsCache = submissionsCache.filter((s) => s.courseId !== courseId);
  await persistCourses();
  await persistActivities();
  await persistSubmissions();
  return { success: true, message: "Curso eliminado." };
}

export async function assignUserToCourse(courseId: string, userId: string, role: "profesor" | "estudiante"): Promise<{ success: boolean; message: string }> {
  await hydrate();
  const idx = coursesCache.findIndex((c) => c.id === courseId);
  if (idx === -1) return { success: false, message: "Curso no encontrado." };
  const course = { ...coursesCache[idx] };
  // limpiar de ambos arrays para evitar duplicados
  course.profesorIds = course.profesorIds.filter((id) => id !== userId);
  course.estudianteIds = course.estudianteIds.filter((id) => id !== userId);
  if (role === "profesor") course.profesorIds.push(userId);
  else course.estudianteIds.push(userId);
  coursesCache[idx] = course;
  await persistCourses();
  return { success: true, message: "Usuario asignado al curso." };
}

export async function unassignUserFromCourse(courseId: string, userId: string): Promise<{ success: boolean; message: string }> {
  await hydrate();
  const idx = coursesCache.findIndex((c) => c.id === courseId);
  if (idx === -1) return { success: false, message: "Curso no encontrado." };
  const course = { ...coursesCache[idx] };
  course.profesorIds = course.profesorIds.filter((id) => id !== userId);
  course.estudianteIds = course.estudianteIds.filter((id) => id !== userId);
  coursesCache[idx] = course;
  await persistCourses();
  return { success: true, message: "Usuario desasignado." };
}

export async function getCoursesForUser(userId: string, role: string): Promise<Course[]> {
  await hydrate();
  if (role === "admin") return [...coursesCache];
  return coursesCache.filter((c) => c.profesorIds.includes(userId) || c.estudianteIds.includes(userId));
}

// Actividades
export async function getActivities(courseId?: string): Promise<Activity[]> {
  await hydrate();
  if (courseId) return activitiesCache.filter((a) => a.courseId === courseId);
  return [...activitiesCache];
}

export async function createActivity(data: { courseId: string; title: string; description: string; type: Activity["type"]; dueDate?: string; sintaxia?: SintaxiaToolRef; createdBy: string }): Promise<{ success: boolean; message: string; activity?: Activity }> {
  await hydrate();
  const title = data.title.trim();
  if (!title) return { success: false, message: "Título obligatorio." };
  if (!coursesCache.some((c) => c.id === data.courseId)) return { success: false, message: "Curso no encontrado." };
  const act: Activity = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    courseId: data.courseId,
    title,
    description: data.description.trim(),
    type: data.type,
    dueDate: data.dueDate,
    sintaxia: data.sintaxia?.tipo
      ? { tipo: data.sintaxia.tipo, slug: data.sintaxia.slug || undefined }
      : undefined,
    createdAt: new Date().toISOString(),
    createdBy: data.createdBy,
  };
  activitiesCache = [...activitiesCache, act];
  await persistActivities();
  return { success: true, message: "Actividad creada.", activity: act };
}

export async function deleteActivity(activityId: string): Promise<{ success: boolean; message: string }> {
  await hydrate();
  activitiesCache = activitiesCache.filter((a) => a.id !== activityId);
  submissionsCache = submissionsCache.filter((s) => s.activityId !== activityId);
  await persistActivities();
  await persistSubmissions();
  return { success: true, message: "Actividad eliminada." };
}

/** Bloquea/desbloquea la edición de entregas de una actividad (para todos los estudiantes) */
export async function setActivityLock(
  activityId: string,
  locked: boolean
): Promise<{ success: boolean; message: string }> {
  await hydrate();
  const idx = activitiesCache.findIndex((a) => a.id === activityId);
  if (idx === -1) return { success: false, message: "Actividad no encontrada." };
  activitiesCache[idx] = { ...activitiesCache[idx], locked };
  await persistActivities();
  return {
    success: true,
    message: locked
      ? "Entregas bloqueadas: los estudiantes no podrán editarlas."
      : "Entregas desbloqueadas: los estudiantes pueden editar de nuevo.",
  };
}

// Entregas y Calificaciones (Submissions)
export async function getSubmissions(courseId?: string): Promise<ActivitySubmission[]> {
  await hydrate();
  if (courseId) return submissionsCache.filter((s) => s.courseId === courseId);
  return [...submissionsCache];
}

export function getSubmissionsSync(courseId?: string): ActivitySubmission[] {
  if (courseId) return submissionsCache.filter((s) => s.courseId === courseId);
  return [...submissionsCache];
}

export async function saveSubmission(
  sub: Omit<ActivitySubmission, "id"> & { id?: string }
): Promise<{ success: boolean; submission: ActivitySubmission }> {
  await hydrate();
  const id = sub.id || `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const fullSub: ActivitySubmission = {
    id,
    activityId: sub.activityId,
    courseId: sub.courseId,
    studentId: sub.studentId,
    status: sub.status,
    submittedAt: sub.submittedAt,
    content: sub.content,
    score: sub.score !== undefined ? Math.max(0, Math.min(100, sub.score)) : undefined,
    maxScore: sub.maxScore || 100,
    feedback: sub.feedback,
    locked: sub.locked || undefined,
  };
  const idx = submissionsCache.findIndex(
    (s) => s.activityId === sub.activityId && s.studentId === sub.studentId
  );
  if (idx >= 0) {
    submissionsCache[idx] = fullSub;
  } else {
    submissionsCache.push(fullSub);
  }
  await persistSubmissions();
  return { success: true, submission: fullSub };
}

export async function bulkSaveSubmissions(subs: ActivitySubmission[]): Promise<void> {
  await hydrate();
  const map = new Map<string, ActivitySubmission>();
  for (const s of submissionsCache) {
    map.set(`${s.activityId}_${s.studentId}`, s);
  }
  for (const s of subs) {
    map.set(`${s.activityId}_${s.studentId}`, s);
  }
  submissionsCache = Array.from(map.values());
  await persistSubmissions();
}

export async function resetCourseSubmissions(courseId: string): Promise<void> {
  await hydrate();
  submissionsCache = submissionsCache.filter((s) => s.courseId !== courseId);
  await persistSubmissions();
}

export function exportCoursesJson(): string {
  return JSON.stringify(coursesCache, null, 2);
}
export function exportActivitiesJson(): string {
  return JSON.stringify(activitiesCache, null, 2);
}
export function exportSubmissionsJson(): string {
  return JSON.stringify(submissionsCache, null, 2);
}
