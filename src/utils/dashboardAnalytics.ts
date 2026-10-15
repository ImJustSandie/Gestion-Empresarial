// src/utils/dashboardAnalytics.ts - Motor analítico y agregaciones para el Dashboard Docente
import type { Course, Activity, ActivitySubmission } from "./courses";
import type { User } from "./auth";
import { getMockStudentName } from "./dashboardMock";

// Ponderaciones por defecto según el tipo de actividad (Decisión A - Opción 2)
export const WEIGHTS_BY_TYPE: Record<Activity["type"], number> = {
  evaluacion: 0.5, // 50%
  tarea: 0.3,      // 30%
  actividad: 0.2,  // 20%
};

// Umbral mínimo para considerar aprobada una actividad (Decisión A - Opción 3)
export const PASSING_SCORE_THRESHOLD = 60;

export interface StudentTimelinePoint {
  activityId: string;
  activityTitle: string;
  activityType: Activity["type"];
  dueDate?: string;
  studentScore: number | null; // null si no ha sido calificado o no entregó
  groupAverageScore: number | null;
  status: ActivitySubmission["status"] | "no_entregado";
  isDue: boolean;
}

export interface StudentCourseMetric {
  studentId: string;
  name: string;
  email: string;
  codigo: string;
  avatarColor: string;
  // Métricas de avance (Decisión B - Opción 2)
  submittedCount: number;
  dueActivitiesCount: number;
  totalActivitiesCount: number;
  progressDuePct: number;    // Avance a la fecha (entregadas / exigibles a la fecha)
  progressTotalPct: number;  // Avance global del curso (entregadas / total)
  // Métricas de rendimiento (Decisión A - Opción 2 y 3)
  weightedScore: number;     // Rendimiento ponderado (0 - 100)
  approvalRate: number;      // Tasa de aprobación (% con score >= 60)
  averageScore: number;      // Promedio simple (0 - 100)
  // Estado de alerta académica
  status: "excelente" | "regular" | "riesgo";
  // Desglose por tipo de actividad
  breakdownByType: Record<Activity["type"], { count: number; avgScore: number; submitted: number }>;
  // Serie temporal para gráfica individual
  timeline: StudentTimelinePoint[];
}

export interface ActivityAnalytics {
  activityId: string;
  title: string;
  type: Activity["type"];
  dueDate?: string;
  isDue: boolean;
  totalEligible: number;
  submittedCount: number;
  gradedCount: number;
  submissionRatePct: number;
  averageScore: number;
  approvalRatePct: number;
}

export interface ScoreDistributionBucket {
  key: string;
  label: string;
  range: string;
  count: number;
  pct: number;
  color: string;
  bgClass: string;
  textClass: string;
}

export interface CourseAnalyticsSummary {
  courseId: string;
  courseName: string;
  courseCode: string;
  totalStudents: number;
  totalActivities: number;
  dueActivitiesCount: number;
  // Métricas principales
  averageProgressDuePct: number;   // Avance promedio a la fecha
  averageProgressTotalPct: number; // Avance promedio global
  averageWeightedScore: number;    // Rendimiento ponderado promedio (0 - 100)
  averageApprovalRate: number;     // Tasa de aprobación promedio (0 - 100)
  averageSimpleScore: number;      // Promedio simple global
  // Semaforización de estudiantes
  atRiskCount: number;             // Estudiantes en riesgo (< 60)
  regularCount: number;            // Estudiantes regular (60 - 74)
  excellentCount: number;          // Estudiantes excelente (>= 75)
  // Entregas por estado
  submissionsOnTime: number;
  submissionsLate: number;
  submissionsPendingOrMissing: number;
  // Distribución de calificaciones (histograma)
  distributionBuckets: ScoreDistributionBucket[];
  // Rendimiento por actividad
  activitiesAnalytics: ActivityAnalytics[];
  // Roster completo de estudiantes procesado
  students: StudentCourseMetric[];
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
];

function isActivityDue(dueDate?: string, now = Date.now()): boolean {
  if (!dueDate) return true;
  return new Date(dueDate).getTime() <= now;
}

/**
 * Calcula las analíticas completas de un curso agregando actividades, estudiantes y entregas.
 */
export function calculateCourseAnalytics(
  course: Course,
  activities: Activity[],
  submissions: ActivitySubmission[],
  allUsers: User[]
): CourseAnalyticsSummary {
  const now = Date.now();
  const courseActivities = activities.filter((a) => a.courseId === course.id);
  const courseSubmissions = submissions.filter((s) => s.courseId === course.id);

  // Determinar lista de estudiantes
  let studentIds = course.estudianteIds || [];
  // Si no hay estudiantes asignados en el curso, pero hay entregas o usuarios estudiantes
  if (studentIds.length === 0) {
    const fromSubs = Array.from(new Set(courseSubmissions.map((s) => s.studentId)));
    if (fromSubs.length > 0) {
      studentIds = fromSubs;
    } else {
      const realStudents = allUsers.filter((u) => u.role === "estudiante");
      studentIds = realStudents.map((s) => s.id);
    }
  }

  // Pre-calcular promedios por actividad para usarlos en comparativas
  const actAveragesMap = new Map<string, { avgScore: number; count: number }>();
  courseActivities.forEach((act) => {
    const actSubs = courseSubmissions.filter((s) => s.activityId === act.id && typeof s.score === "number");
    const count = actSubs.length;
    const avgScore = count > 0 ? Math.round(actSubs.reduce((acc, s) => acc + (s.score || 0), 0) / count) : 0;
    actAveragesMap.set(act.id, { avgScore, count });
  });

  // Actividades exigibles a la fecha (Decisión B)
  const dueActivities = courseActivities.filter((a) => isActivityDue(a.dueDate, now));
  const dueActivitiesCount = dueActivities.length;

  // Analizar a cada estudiante individualmente
  const studentsMetrics: StudentCourseMetric[] = studentIds.map((studentId, idx) => {
    const user = allUsers.find((u) => u.id === studentId);
    const name = user ? user.name : getMockStudentName(studentId, idx);
    const email = user ? user.email : `${studentId}@ejemplo.edu.co`;
    const codigo = user?.codigo || `600${String(1000 + (idx % 8999))}`;
    const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

    const studentSubs = courseSubmissions.filter((s) => s.studentId === studentId);

    // Conteo de entregadas
    const submittedCount = studentSubs.filter(
      (s) => s.status === "entregado" || s.status === "calificado"
    ).length;

    // Avance a la fecha (Decisión B - Opción 2)
    const progressDuePct =
      dueActivitiesCount > 0
        ? Math.min(100, Math.round((submittedCount / dueActivitiesCount) * 100))
        : courseActivities.length === 0
        ? 0
        : 100;

    // Avance global del curso
    const progressTotalPct =
      courseActivities.length > 0
        ? Math.min(100, Math.round((submittedCount / courseActivities.length) * 100))
        : 0;

    // Desglose por tipo y cálculo de Ponderado (Decisión A - Opción 2)
    const breakdownByType: Record<Activity["type"], { count: number; avgScore: number; submitted: number }> = {
      evaluacion: { count: 0, avgScore: 0, submitted: 0 },
      tarea: { count: 0, avgScore: 0, submitted: 0 },
      actividad: { count: 0, avgScore: 0, submitted: 0 },
    };

    let totalScoreSum = 0;
    let gradedCount = 0;
    let approvedCount = 0;

    const scoresByType: Record<Activity["type"], number[]> = {
      evaluacion: [],
      tarea: [],
      actividad: [],
    };

    const timeline: StudentTimelinePoint[] = courseActivities.map((act) => {
      const sub = studentSubs.find((s) => s.activityId === act.id);
      const isDue = isActivityDue(act.dueDate, now);
      const studentScore = sub && typeof sub.score === "number" ? sub.score : null;
      const groupAvg = actAveragesMap.get(act.id)?.avgScore ?? null;

      breakdownByType[act.type].count++;
      if (sub && (sub.status === "entregado" || sub.status === "calificado")) {
        breakdownByType[act.type].submitted++;
      }

      if (studentScore !== null) {
        totalScoreSum += studentScore;
        gradedCount++;
        scoresByType[act.type].push(studentScore);
        if (studentScore >= PASSING_SCORE_THRESHOLD) {
          approvedCount++;
        }
      }

      return {
        activityId: act.id,
        activityTitle: act.title,
        activityType: act.type,
        dueDate: act.dueDate,
        studentScore,
        groupAverageScore: groupAvg,
        status: sub ? sub.status : isDue ? "no_entregado" : "pendiente",
        isDue,
      };
    });

    // Calcular promedios por tipo
    (["evaluacion", "tarea", "actividad"] as Activity["type"][]).forEach((t) => {
      const list = scoresByType[t];
      breakdownByType[t].avgScore = list.length > 0 ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0;
    });

    // Ponderación normalizada sobre los tipos presentes con notas
    let weightedScore = 0;
    let activeWeightTotal = 0;
    (["evaluacion", "tarea", "actividad"] as Activity["type"][]).forEach((t) => {
      if (scoresByType[t].length > 0) {
        weightedScore += breakdownByType[t].avgScore * WEIGHTS_BY_TYPE[t];
        activeWeightTotal += WEIGHTS_BY_TYPE[t];
      }
    });

    if (activeWeightTotal > 0) {
      weightedScore = Math.round(weightedScore / activeWeightTotal);
    } else {
      weightedScore = gradedCount > 0 ? Math.round(totalScoreSum / gradedCount) : 0;
    }

    // Tasa de aprobación (Decisión A - Opción 3)
    const approvalRate =
      gradedCount > 0 ? Math.round((approvedCount / gradedCount) * 100) : 0;

    // Promedio simple
    const averageScore = gradedCount > 0 ? Math.round(totalScoreSum / gradedCount) : 0;

    // Clasificación de estado
    let status: StudentCourseMetric["status"] = "regular";
    if (weightedScore >= 75 && progressDuePct >= 70) {
      status = "excelente";
    } else if (weightedScore < 60 || progressDuePct < 50) {
      status = "riesgo";
    }

    return {
      studentId,
      name,
      email,
      codigo,
      avatarColor,
      submittedCount,
      dueActivitiesCount,
      totalActivitiesCount: courseActivities.length,
      progressDuePct,
      progressTotalPct,
      weightedScore,
      approvalRate,
      averageScore,
      status,
      breakdownByType,
      timeline,
    };
  });

  // Totales y promedios globales del curso
  const totalStudents = studentsMetrics.length;
  const avgProgressDue =
    totalStudents > 0
      ? Math.round(studentsMetrics.reduce((acc, s) => acc + s.progressDuePct, 0) / totalStudents)
      : 0;

  const avgProgressTotal =
    totalStudents > 0
      ? Math.round(studentsMetrics.reduce((acc, s) => acc + s.progressTotalPct, 0) / totalStudents)
      : 0;

  const avgWeighted =
    totalStudents > 0
      ? Math.round(studentsMetrics.reduce((acc, s) => acc + s.weightedScore, 0) / totalStudents)
      : 0;

  const avgApproval =
    totalStudents > 0
      ? Math.round(studentsMetrics.reduce((acc, s) => acc + s.approvalRate, 0) / totalStudents)
      : 0;

  const avgSimple =
    totalStudents > 0
      ? Math.round(studentsMetrics.reduce((acc, s) => acc + s.averageScore, 0) / totalStudents)
      : 0;

  const atRiskCount = studentsMetrics.filter((s) => s.status === "riesgo").length;
  const regularCount = studentsMetrics.filter((s) => s.status === "regular").length;
  const excellentCount = studentsMetrics.filter((s) => s.status === "excelente").length;

  // Analítica por actividad individual
  const activitiesAnalytics: ActivityAnalytics[] = courseActivities.map((act) => {
    const actSubs = courseSubmissions.filter((s) => s.activityId === act.id);
    const submittedCount = actSubs.filter(
      (s) => s.status === "entregado" || s.status === "calificado"
    ).length;
    const gradedSubs = actSubs.filter((s) => typeof s.score === "number");
    const gradedCount = gradedSubs.length;

    const avgScore =
      gradedCount > 0 ? Math.round(gradedSubs.reduce((acc, s) => acc + (s.score || 0), 0) / gradedCount) : 0;

    const approvedCount = gradedSubs.filter((s) => (s.score || 0) >= PASSING_SCORE_THRESHOLD).length;
    const approvalRatePct = gradedCount > 0 ? Math.round((approvedCount / gradedCount) * 100) : 0;

    const totalEligible = totalStudents || 1;
    const submissionRatePct = Math.min(100, Math.round((submittedCount / totalEligible) * 100));

    return {
      activityId: act.id,
      title: act.title,
      type: act.type,
      dueDate: act.dueDate,
      isDue: isActivityDue(act.dueDate, now),
      totalEligible,
      submittedCount,
      gradedCount,
      submissionRatePct,
      averageScore: avgScore,
      approvalRatePct,
    };
  });

  // Distribución de calificaciones en 4 rangos (Histograma)
  const buckets = [
    { key: "critico", label: "Crítico / En Riesgo", range: "0 - 59", min: 0, max: 59, color: "#EF4444", bgClass: "bg-red-500", textClass: "text-red-700" },
    { key: "regular", label: "Básico / Regular", range: "60 - 74", min: 60, max: 74, color: "#F59E0B", bgClass: "bg-amber-500", textClass: "text-amber-700" },
    { key: "favorable", label: "Favorable", range: "75 - 89", min: 75, max: 89, color: "#6366F1", bgClass: "bg-indigo-500", textClass: "text-indigo-700" },
    { key: "excelente", label: "Excelente", range: "90 - 100", min: 90, max: 100, color: "#10B981", bgClass: "bg-emerald-500", textClass: "text-emerald-700" },
  ];

  const distributionBuckets: ScoreDistributionBucket[] = buckets.map((b) => {
    const count = studentsMetrics.filter((s) => s.weightedScore >= b.min && s.weightedScore <= b.max).length;
    const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
    return {
      key: b.key,
      label: b.label,
      range: b.range,
      count,
      pct,
      color: b.color,
      bgClass: b.bgClass,
      textClass: b.textClass,
    };
  });

  // Conteo de entregas a tiempo vs tarde vs pendientes
  let submissionsOnTime = 0;
  let submissionsLate = 0;
  let submissionsPendingOrMissing = 0;

  courseSubmissions.forEach((sub) => {
    if (sub.status === "no_entregado" || sub.status === "pendiente") {
      submissionsPendingOrMissing++;
    } else if (sub.submittedAt) {
      const act = courseActivities.find((a) => a.id === sub.activityId);
      if (act?.dueDate && new Date(sub.submittedAt).getTime() > new Date(act.dueDate).getTime()) {
        submissionsLate++;
      } else {
        submissionsOnTime++;
      }
    } else {
      submissionsOnTime++;
    }
  });

  return {
    courseId: course.id,
    courseName: course.name,
    courseCode: course.code,
    totalStudents,
    totalActivities: courseActivities.length,
    dueActivitiesCount,
    averageProgressDuePct: avgProgressDue,
    averageProgressTotalPct: avgProgressTotal,
    averageWeightedScore: avgWeighted,
    averageApprovalRate: avgApproval,
    averageSimpleScore: avgSimple,
    atRiskCount,
    regularCount,
    excellentCount,
    submissionsOnTime,
    submissionsLate,
    submissionsPendingOrMissing,
    distributionBuckets,
    activitiesAnalytics,
    students: studentsMetrics,
  };
}
