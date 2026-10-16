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
 * Asegura que el curso tenga al menos algunas actividades y estudiantes inscritos
 * con entregas realistas para que el docente pueda explorar el dashboard de inmediato.
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

  // Estudiantes a considerar: los del curso o un conjunto sintético
  let studentIds = course.estudianteIds;
  if (!studentIds || studentIds.length === 0) {
    // Tomar estudiantes reales del sistema o crear ids representativos
    const realStudents = existingUsers.filter((u) => u.role === "estudiante");
    if (realStudents.length > 0) {
      studentIds = realStudents.map((s) => s.id);
    } else {
      // IDs sintéticos
      studentIds = NOMBRES_MOCK.slice(0, 8).map((_, idx) => `mock-student-${idx + 1}`);
    }
  }

  const generated: ActivitySubmission[] = [];
  const now = Date.now();

  // Distribuir perfiles de estudiantes:
  // - 20% destacados (notas 85-100, entregan a tiempo)
  // - 50% promedio (notas 65-85, casi todo entregado)
  // - 20% en riesgo (notas 40-60, algunas no entregadas)
  // - 10% críticos (notas < 40 o abandonos)
  studentIds.forEach((studentId, sIdx) => {
    let profile: "alto" | "medio" | "riesgo" | "critico";
    const mod = sIdx % 10;
    if (mod < 2) profile = "alto";
    else if (mod < 7) profile = "medio";
    else if (mod < 9) profile = "riesgo";
    else profile = "critico";

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
      let minScore = 70;
      let maxScoreRange = 30;
      if (profile === "alto") {
        minScore = 85;
        maxScoreRange = 15;
      } else if (profile === "medio") {
        minScore = 65;
        maxScoreRange = 25;
      } else if (profile === "riesgo") {
        minScore = 45;
        maxScoreRange = 25;
      } else {
        minScore = 20;
        maxScoreRange = 35;
      }

      // Añadir pequeña variación según el tipo (evaluación suele ser más estricta)
      let score = Math.round(minScore + Math.random() * maxScoreRange);
      if (activity.type === "evaluacion") {
        score = Math.max(10, score - 5);
      }
      score = Math.min(100, Math.max(0, score));

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
        feedback: score >= 75 ? "Buen trabajo, conceptos claros." : "Revisar temas de refuerzo.",
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
