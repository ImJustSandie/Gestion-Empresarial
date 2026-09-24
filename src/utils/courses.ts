// src/utils/courses.ts - Persistencia JSON local (IndexedDB + /data/courses.json)
import initialCourses from "../data/courses.json";

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  profesorIds: string[];
  estudianteIds: string[];
  createdAt: string;
  createdBy: string;
}

export interface Activity {
  id: string;
  courseId: string;
  title: string;
  description: string;
  type: "tarea" | "actividad" | "evaluacion";
  dueDate?: string;
  createdAt: string;
  createdBy: string;
}

const IDB_DB_NAME = "gestion-empresarial";
const IDB_STORE = "kv";
const IDB_COURSES_KEY = "courses-json";
const IDB_ACTIVITIES_KEY = "activities-json";

let coursesCache: Course[] = [...(initialCourses as Course[])];
let activitiesCache: Activity[] = [];
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

export async function createCourse(data: { name: string; description: string; createdBy: string; code?: string }): Promise<{ success: boolean; message: string; course?: Course }> {
  await hydrate();
  const name = data.name.trim();
  if (!name) return { success: false, message: "El nombre del curso es obligatorio." };
  // código automático de 6 números (ignora code manual si se pasa)
  const code = generate6DigitCode();
  // validación: exactamente 6 dígitos numéricos
  if (!/^\d{6}$/.test(code)) {
    return { success: false, message: "El código debe ser de 6 números." };
  }
  const course: Course = {
    id: `course-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    code,
    name,
    description: data.description.trim(),
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
  await persistCourses();
  await persistActivities();
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

export async function createActivity(data: { courseId: string; title: string; description: string; type: Activity["type"]; dueDate?: string; createdBy: string }): Promise<{ success: boolean; message: string; activity?: Activity }> {
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
  await persistActivities();
  return { success: true, message: "Actividad eliminada." };
}

export function exportCoursesJson(): string {
  return JSON.stringify(coursesCache, null, 2);
}
export function exportActivitiesJson(): string {
  return JSON.stringify(activitiesCache, null, 2);
}
