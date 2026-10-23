// src/utils/dashboardMock.ts - Generador de datos sintéticos realistas para el Dashboard
import type { Course, Activity, ActivitySubmission } from "./courses";
import type { User } from "./auth";
import { bulkSaveSubmissions } from "./courses";
import { BLOQUES_ALFABETIZACION, saveAlfabetizacionProgress } from "./alfabetizacionContent";

const NOMBRES_MOCK = [
  "Valentina Gómez",
  "Mateo Rodríguez",
  "Camila Martínez",
  "Santiago Vargas",
  "Sofía Morales",
  "Nicolás Herrera",
  "Isabella Ríos",
  "Sebastián Castro",
  "Luciana Ortiz",
  "Samuel Mendoza",
  "Mariana Peña",
  "Felipe Navarro",
  "Gabriela Silva",
  "Daniel Quintero",
  "Elena Cardona",
];

/**
 * Estudiantes de referencia para el seed: matriculados en el curso o,
 * en su defecto, estudiantes reales del sistema o IDs sintéticos.
 */
function resolveStudentIds(course: Course, existingUsers: User[]): string[] {
  if (course.estudianteIds && course.estudianteIds.length > 0) return [...course.estudianteIds];
  const realStudents = existingUsers.filter((u) => u.role === "estudiante");
  if (realStudents.length > 0) return realStudents.map((s) => s.id);
  return NOMBRES_MOCK.slice(0, 8).map((_, idx) => `mock-student-${idx + 1}`);
}

/** Perfil académico por índice de estudiante (determinista) */
function perfilPorIndice(sIdx: number): "alto" | "medio" | "riesgo" | "critico" {
  const mod = sIdx % 10;
  if (mod < 2) return "alto";
  if (mod < 7) return "medio";
  if (mod < 9) return "riesgo";
  return "critico";
}

/** Rango de nota coherente con el perfil (más estricto en evaluaciones) */
function notaParaPerfil(profile: "alto" | "medio" | "riesgo" | "critico", tipo: Activity["type"]): number {
  let minScore = 65;
  let rango = 25;
  if (profile === "alto") {
    minScore = 85;
    rango = 15;
  } else if (profile === "riesgo") {
    minScore = 45;
    rango = 25;
  } else if (profile === "critico") {
    minScore = 20;
    rango = 35;
  }
  let score = Math.round(minScore + Math.random() * rango);
  if (tipo === "evaluacion") {
    score = Math.max(10, score - 5);
  }
  return Math.min(100, Math.max(0, score));
}

const FEEDBACK_ALTO = "Buen trabajo, conceptos claros.";
const FEEDBACK_REFUERZO = "Revisar temas de refuerzo.";

/**
 * Asegura que el curso tenga al menos algunas actividades y estudiantes inscritos
 * con entregas realistas para que el docente pueda explorar el dashboard de inmediato.
 * Solo se aplica si el curso aún no tiene entregas registradas.
 */
export async function seedMockDataForCourse(
  course: Course,
  existingActivities: Activity[],
  existingUsers: User[],
  existingSubmissions: ActivitySubmission[]
): Promise<ActivitySubmission[]> {
  // Si ya tiene entregas registradas para este curso, no sobrescribir a menos que esté vacío
  if (existingSubmissions.some((s) => s.courseId === course.id)) {
    return existingSubmissions.filter((s) => s.courseId === course.id);
  }

  // Si no hay actividades, no se pueden generar entregas
  if (existingActivities.length === 0) {
    return [];
  }

  const studentIds = resolveStudentIds(course, existingUsers);

  const generated: ActivitySubmission[] = [];
  const now = Date.now();

  // Distribuir perfiles de estudiantes:
  // - 20% destacados (notas 85-100, entregan a tiempo)
  // - 50% promedio (notas 65-85, casi todo entregado)
  // - 20% en riesgo (notas 40-60, algunas no entregadas)
  // - 10% críticos (notas < 40 o abandonos)
  studentIds.forEach((studentId, sIdx) => {
    const profile = perfilPorIndice(sIdx);

    existingActivities.forEach((activity, aIdx) => {
      const isDue = activity.dueDate ? new Date(activity.dueDate).getTime() <= now : true;

      // Probabilidad de entrega según perfil
      let entregaProb = 0.95;
      if (profile === "medio") entregaProb = 0.85;
      if (profile === "riesgo") entregaProb = 0.55;
      if (profile === "critico") entregaProb = 0.25;

      const randomVal = Math.random();
      const haEntregado = randomVal < entregaProb;

      if (!haEntregado) {
        if (isDue) {
          generated.push({
            id: `sub-${course.id}-${activity.id}-${studentId}`,
            activityId: activity.id,
            courseId: course.id,
            studentId,
            status: "no_entregado",
            score: 0,
            maxScore: 100,
            feedback: "Actividad no entregada a la fecha límite.",
          });
        } else {
          generated.push({
            id: `sub-${course.id}-${activity.id}-${studentId}`,
            activityId: activity.id,
            courseId: course.id,
            studentId,
            status: "pendiente",
            maxScore: 100,
          });
        }
        return;
      }

      // Si ha entregado: generar nota coherente
      const score = notaParaPerfil(profile, activity.type);

      // Determinar si fue a tiempo o tardía
      const fueTardia = profile === "riesgo" || profile === "critico" ? Math.random() > 0.5 : Math.random() > 0.85;
      const submittedDate = new Date(now - (existingActivities.length - aIdx) * 86400000 * 3 + (fueTardia ? 86400000 : 0)).toISOString();

      generated.push({
        id: `sub-${course.id}-${activity.id}-${studentId}`,
        activityId: activity.id,
        courseId: course.id,
        studentId,
        status: "calificado",
        submittedAt: submittedDate,
        score,
        maxScore: 100,
        feedback: score >= 75 ? FEEDBACK_ALTO : FEEDBACK_REFUERZO,
      });
    });
  });

  if (generated.length > 0) {
    await bulkSaveSubmissions(generated);
  }

  return generated;
}

/**
 * Regenera los datos sintéticos SIN borrar las entregas reales de los estudiantes
 * (las que tienen texto). Para cada entrega con texto existente solo genera nota y
 * retroalimentación, conservando el contenido y la fecha de entrega. Para los pares
 * (estudiante, actividad) sin entrega con texto genera entregas sintéticas como de costumbre.
 */
export async function regenerateMockDataForCourse(
  course: Course,
  existingActivities: Activity[],
  existingUsers: User[],
  existingSubmissions: ActivitySubmission[]
): Promise<ActivitySubmission[]> {
  if (existingActivities.length === 0) {
    return existingSubmissions.filter((s) => s.courseId === course.id);
  }

  const courseSubs = existingSubmissions.filter((s) => s.courseId === course.id);
  // Entregas reales con texto (se conservan intactas, salvo nota/feedback/status)
  const entregasConTexto = new Map(
    courseSubs.filter((s) => s.content?.trim()).map((s) => [`${s.activityId}_${s.studentId}`, s])
  );

  const studentIds = resolveStudentIds(course, existingUsers);
  const generated: ActivitySubmission[] = [];
  const now = Date.now();

  studentIds.forEach((studentId, sIdx) => {
    const profile = perfilPorIndice(sIdx);

    existingActivities.forEach((activity, aIdx) => {
      const base = {
        activityId: activity.id,
        courseId: course.id,
        studentId,
      };

      // 1) Entrega real con texto: solo nota + retroalimentación, sin tocar contenido
      const real = entregasConTexto.get(`${activity.id}_${studentId}`);
      if (real) {
        const score = notaParaPerfil(profile, activity.type);
        generated.push({
          id: real.id,
          ...base,
          status: "calificado",
          submittedAt: real.submittedAt,
          content: real.content,
          score,
          maxScore: real.maxScore ?? 100,
          feedback: score >= 75 ? FEEDBACK_ALTO : FEEDBACK_REFUERZO,
        });
        return;
      }

      // 2) Sin texto: generar entrega sintética (como seedMockDataForCourse)
      const isDue = activity.dueDate ? new Date(activity.dueDate).getTime() <= now : true;
      let entregaProb = 0.95;
      if (profile === "medio") entregaProb = 0.85;
      if (profile === "riesgo") entregaProb = 0.55;
      if (profile === "critico") entregaProb = 0.25;

      const haEntregado = Math.random() < entregaProb;

      if (!haEntregado) {
        if (isDue) {
          generated.push({ ...base, id: `sub-${course.id}-${activity.id}-${studentId}`, status: "no_entregado", score: 0, maxScore: 100, feedback: "Actividad no entregada a la fecha límite." });
        } else {
          generated.push({ ...base, id: `sub-${course.id}-${activity.id}-${studentId}`, status: "pendiente", maxScore: 100 });
        }
        return;
      }

      const score = notaParaPerfil(profile, activity.type);
      const fueTardia = profile === "riesgo" || profile === "critico" ? Math.random() > 0.5 : Math.random() > 0.85;
      const submittedDate = new Date(now - (existingActivities.length - aIdx) * 86400000 * 3 + (fueTardia ? 86400000 : 0)).toISOString();

      generated.push({
        id: `sub-${course.id}-${activity.id}-${studentId}`,
        ...base,
        status: "calificado",
        submittedAt: submittedDate,
        score,
        maxScore: 100,
        feedback: score >= 75 ? FEEDBACK_ALTO : FEEDBACK_REFUERZO,
      });
    });
  });

  if (generated.length > 0) {
    await bulkSaveSubmissions(generated);
  }

  return generated;
}

export function getMockStudentName(studentId: string, index: number = 0): string {
  if (studentId.startsWith("mock-student-")) {
    const num = parseInt(studentId.replace("mock-student-", ""), 10) || 1;
    return NOMBRES_MOCK[(num - 1) % NOMBRES_MOCK.length];
  }
  return NOMBRES_MOCK[index % NOMBRES_MOCK.length];
}

/**
 * Simula el progreso de alfabetización para los estudiantes de un curso.
 * Las lecciones completadas son coherentes con el perfil académico de cada estudiante:
 *  - alto   → 70–100 % de lecciones completadas
 *  - medio  → 40–75 % de lecciones completadas
 *  - riesgo → 10–45 % de lecciones completadas
 *  - crítico → 0–20 % de lecciones completadas
 *
 * El avance se distribuye de forma secuencial (bloque 1 antes que bloque 2, etc.)
 * para simular un comportamiento realista de consumo de contenido.
 */
export async function seedAlfabetizacionProgressForCourse(
  studentIds: string[]
): Promise<void> {
  // Recopilar todos los IDs de lecciones en orden (bloque 1 → bloque N)
  const allLessonIds: string[] = [];
  for (const bloque of BLOQUES_ALFABETIZACION) {
    for (const subtema of bloque.subtemas) {
      allLessonIds.push(subtema.id);
    }
  }
  const total = allLessonIds.length;
  if (total === 0) return;

  for (let sIdx = 0; sIdx < studentIds.length; sIdx++) {
    const studentId = studentIds[sIdx];

    // Determinar perfil del estudiante (mismo esquema que seedMockDataForCourse)
    let profile: "alto" | "medio" | "riesgo" | "critico";
    const mod = sIdx % 10;
    if (mod < 2) profile = "alto";
    else if (mod < 7) profile = "medio";
    else if (mod < 9) profile = "riesgo";
    else profile = "critico";

    // Rango de completitud según perfil
    let minPct = 0;
    let maxPct = 100;
    if (profile === "alto") { minPct = 70; maxPct = 100; }
    else if (profile === "medio") { minPct = 40; maxPct = 75; }
    else if (profile === "riesgo") { minPct = 10; maxPct = 45; }
    else { minPct = 0; maxPct = 20; }

    // Calcular cuántas lecciones completa (+ pequeña variación aleatoria)
    const pct = minPct + Math.random() * (maxPct - minPct);
    const completedCount = Math.round((pct / 100) * total);

    // Marcar las primeras N lecciones como completadas (secuencial)
    const progress: Record<string, boolean> = {};
    for (let i = 0; i < completedCount; i++) {
      progress[allLessonIds[i]] = true;
    }

    await saveAlfabetizacionProgress(studentId, progress);
  }
}

/**
 * Borra el progreso de alfabetización de un conjunto de estudiantes.
 * Llama a saveAlfabetizacionProgress con objeto vacío para cada uno.
 */
export async function clearAlfabetizacionProgressForStudents(
  studentIds: string[]
): Promise<void> {
  for (const studentId of studentIds) {
    await saveAlfabetizacionProgress(studentId, {});
  }
}
