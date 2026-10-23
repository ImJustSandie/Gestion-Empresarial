// src/components/DashboardView.tsx - Panel Analítico Docente para Gestión Empresarial
import { useEffect, useState, useMemo } from "preact/hooks";
import { initAuth, getSession, type Session, getUsersAsync, type User } from "../utils/auth";
import {
  initCourses,
  getCoursesForUser,
  getActivities,
  getSubmissions,
  type Course,
  type Activity,
  type ActivitySubmission,
  resetCourseSubmissions,
} from "../utils/courses";
import { seedMockDataForCourse, seedAlfabetizacionProgressForCourse, clearAlfabetizacionProgressForStudents } from "../utils/dashboardMock";
import {
  calculateCourseAnalytics,
  type CourseAnalyticsSummary,
  type StudentCourseMetric,
} from "../utils/dashboardAnalytics";
import {
  getAlfabetizacionProgressForUsers,
  BLOQUES_ALFABETIZACION,
  type UserAlfabetizacionSummary,
} from "../utils/alfabetizacionContent";
import SelectMenu from "./SelectMenu";
import MetricCard from "./dashboard/MetricCard";
import DonutProgress from "./dashboard/DonutProgress";
import MultiSegmentDonut, { type DonutSegment } from "./dashboard/MultiSegmentDonut";
import { VerticalBarChart, HorizontalBarChart, type VerticalBarItem, type HorizontalBarItem } from "./dashboard/BarChart";
import StudentDetailModal from "./dashboard/StudentDetailModal";

export default function DashboardView() {
  const [session, setSession] = useState<Session | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingMock, setGeneratingMock] = useState(false);
  // Progreso de alfabetización por estudiante del curso
  const [alfabetizacionProgress, setAlfabetizacionProgress] = useState<UserAlfabetizacionSummary[]>([]);
  const [loadingAlfProgress, setLoadingAlfProgress] = useState(false);

  // Filtros y ordenamiento en el roster de estudiantes
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "riesgo" | "regular" | "excelente">("todos");
  const [sortBy, setSortBy] = useState<"name" | "progress" | "weighted" | "approval">("weighted");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pestaña de visualización para el rendimiento por actividad
  const [activityMetricTab, setActivityMetricTab] = useState<"score" | "submissions">("score");

  // Estudiante seleccionado para el Drill-down modal
  const [selectedStudent, setSelectedStudent] = useState<StudentCourseMetric | null>(null);
  // Modal de lista completa de estudiantes en riesgo
  const [showRiskModal, setShowRiskModal] = useState(false);

  // Carga inicial
  useEffect(() => {
    (async () => {
      await initAuth();
      await initCourses();
      const s = getSession();
      if (!s) {
        window.location.href = "/";
        return;
      }
      // Solo profesor y admin pueden acceder al dashboard
      if (s.role !== "profesor" && s.role !== "admin") {
        window.location.href = "/ensenanza";
        return;
      }
      setSession(s);

      // Cargar cursos según rol
      const userCourses = await getCoursesForUser(s.userId, s.role);
      setCourses(userCourses);

      // Leer curso de la URL si existe
      const urlParams = new URLSearchParams(window.location.search);
      const paramCourseId = urlParams.get("curso");
      const initialCourse = userCourses.find((c) => c.id === paramCourseId) || userCourses[0];

      if (initialCourse) {
        setSelectedCourseId(initialCourse.id);
      }

      const [acts, subs, users] = await Promise.all([
        getActivities(),
        getSubmissions(),
        getUsersAsync(),
      ]);

      setActivities(acts);
      setSubmissions(subs);
      setAllUsers(users);
      setLoading(false);
    })();
  }, []);

  // Sincronizar selección de curso con la URL
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const url = new URL(window.location.href);
    url.searchParams.set("curso", courseId);
    window.history.replaceState({}, "", url.toString());
  };

  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  // Cargar progreso de alfabetización de los estudiantes del curso seleccionado
  useEffect(() => {
    if (!selectedCourse || loading) return;
    const studentIds = selectedCourse.estudianteIds || [];
    if (studentIds.length === 0) {
      setAlfabetizacionProgress([]);
      return;
    }
    setLoadingAlfProgress(true);
    getAlfabetizacionProgressForUsers(studentIds).then((summaries) => {
      setAlfabetizacionProgress(summaries);
      setLoadingAlfProgress(false);
    });
  }, [selectedCourseId, loading]);

  // Si el curso actual no tiene submissions y tiene actividades, poblarlas automáticamente con seed realista
  useEffect(() => {
    if (!selectedCourse || loading) return;
    const courseActs = activities.filter((a) => a.courseId === selectedCourse.id);
    const courseSubs = submissions.filter((s) => s.courseId === selectedCourse.id);

    if (courseActs.length > 0 && courseSubs.length === 0 && !generatingMock) {
      setGeneratingMock(true);
      seedMockDataForCourse(selectedCourse, courseActs, allUsers, submissions).then((newSubs) => {
        setSubmissions((prev) => [...prev.filter((s) => s.courseId !== selectedCourse.id), ...newSubs]);
        setGeneratingMock(false);
      });
    }
  }, [selectedCourseId, activities, loading]);

  // Re-semillar datos sintéticos manualmente
  const handleRegenerateSeed = async () => {
    if (!selectedCourse) return;
    setGeneratingMock(true);

    // 1. Regenerar entregas de actividades
    await resetCourseSubmissions(selectedCourse.id);
    const courseActs = activities.filter((a) => a.courseId === selectedCourse.id);
    const newSubs = await seedMockDataForCourse(selectedCourse, courseActs, allUsers, []);
    setSubmissions((prev) => [...prev.filter((s) => s.courseId !== selectedCourse.id), ...newSubs]);

    // 2. Regenerar progreso de alfabetización
    // Usar misma lógica de selección de estudiantes que seedMockDataForCourse
    let alfStudentIds = selectedCourse.estudianteIds ?? [];
    if (alfStudentIds.length === 0) {
      // Fallback: usar estudiantes reales del sistema (misma lógica que el seed de actividades)
      const realStudents = allUsers.filter((u) => u.role === "estudiante");
      alfStudentIds = realStudents.map((u) => u.id);
    }
    if (alfStudentIds.length > 0) {
      await clearAlfabetizacionProgressForStudents(alfStudentIds);
      await seedAlfabetizacionProgressForCourse(alfStudentIds);
      const summaries = await getAlfabetizacionProgressForUsers(alfStudentIds);
      setAlfabetizacionProgress(summaries);
    }

    setGeneratingMock(false);
  };


  // Motor analítico del curso seleccionado
  const analytics: CourseAnalyticsSummary | null = useMemo(() => {
    if (!selectedCourse) return null;
    return calculateCourseAnalytics(selectedCourse, activities, submissions, allUsers);
  }, [selectedCourse, activities, submissions, allUsers]);

  // Estudiantes filtrados y ordenados
  const filteredStudents = useMemo(() => {
    if (!analytics) return [];
    let list = [...analytics.students];

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.codigo.includes(q) || s.email.toLowerCase().includes(q)
      );
    }

    // Filtro por estado
    if (statusFilter !== "todos") {
      list = list.filter((s) => s.status === statusFilter);
    }

    // Ordenamiento
    list.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      if (sortBy === "name") {
        valA = a.name;
        valB = b.name;
      } else if (sortBy === "progress") {
        valA = a.progressDuePct;
        valB = b.progressDuePct;
      } else if (sortBy === "weighted") {
        valA = a.weightedScore;
        valB = b.weightedScore;
      } else if (sortBy === "approval") {
        valA = a.approvalRate;
        valB = b.approvalRate;
      }

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === "asc" ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    return list;
  }, [analytics, searchQuery, statusFilter, sortBy, sortOrder]);

  const toggleSort = (field: "name" | "progress" | "weighted" | "approval") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  if (loading) {
    return (
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center min-h-[50vh]">
        <div class="flex flex-col items-center gap-3">
          <div class="w-10 h-10 border-4 border-[#5932EA] border-t-transparent rounded-full animate-spin" />
          <p class="text-sm font-medium text-gray-500">Cargando métricas y analíticas...</p>
        </div>
      </div>
    );
  }

  // Si no tiene cursos asignados
  if (courses.length === 0) {
    return (
      <div class="max-w-4xl mx-auto px-4 py-16 text-center">
        <div class="w-16 h-16 rounded-3xl bg-[#EDE9FE] text-[#5932EA] flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">No tienes cursos asignados</h2>
        <p class="text-gray-500 mb-6 max-w-md mx-auto text-sm">
          Para visualizar analíticas de rendimiento, necesitas tener cursos asociados a tu cuenta.
        </p>
        <a
          href="/actividades"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5932EA] text-white text-sm font-semibold hover:bg-[#7C5CE9] transition-colors"
        >
          Ir a Gestión de Cursos y Actividades
        </a>
      </div>
    );
  }

  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: c.name,
    meta: `Código: ${c.code}`,
  }));

  // Preparar datos para el histograma de distribución de notas
  const distributionChartData: VerticalBarItem[] = analytics
    ? analytics.distributionBuckets.map((b) => ({
        key: b.key,
        label: b.label,
        sublabel: b.range,
        value: b.count,
        pct: b.pct,
        color: b.color,
      }))
    : [];

  // Preparar datos para el ranking de actividades (barras horizontales)
  const activityChartData: HorizontalBarItem[] = analytics
    ? analytics.activitiesAnalytics.map((act) => ({
        id: act.activityId,
        title: act.title,
        type: act.type,
        value: activityMetricTab === "score" ? act.averageScore : act.submissionRatePct,
        labelRight: activityMetricTab === "score" ? `${act.averageScore} pts` : `${act.submissionRatePct}% entregas`,
        color: activityMetricTab === "score" ? (act.averageScore >= 70 ? "#5932EA" : "#F59E0B") : "#3B82F6",
      }))
    : [];

  // Módulo seleccionado para ver avance por estudiante en el KPI de Alfabetización
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(null);

  const handleModuleClick = (index: number) => {
    setSelectedModuleIndex((prev) => (prev === index ? null : index));
  };

  // Segmento interactivo de puntualidad: hover y selección persistente
  const [hoveredPunctualityKey, setHoveredPunctualityKey] = useState<string | null>(null);
  const [selectedPunctualityKey, setSelectedPunctualityKey] = useState<string | null>(null);

  const handlePunctualityClick = (key: string) => {
    setSelectedPunctualityKey((prev) => (prev === key ? null : key));
  };

  // Preparar datos para la dona multisegmento de puntualidad y cumplimiento
  const punctualitySegments: DonutSegment[] = useMemo(() => {
    if (!analytics) return [];
    return [
      {
        key: "a_tiempo",
        label: "A tiempo",
        count: analytics.submissionsOnTime,
        color: "#10B981", // verde esmeralda
      },
      {
        key: "con_retraso",
        label: "Con retraso",
        count: analytics.submissionsLate,
        color: "#F59E0B", // ámbar
      },
      {
        key: "pendientes",
        label: "Pendientes / No entregadas",
        count: analytics.submissionsPendingOrMissing,
        color: "#EF4444", // rojo
      },
    ];
  }, [analytics]);

  const totalDelivered = analytics ? analytics.submissionsOnTime + analytics.submissionsLate : 0;
  const netPunctualityPct = totalDelivered > 0 ? Math.round((analytics!.submissionsOnTime / totalDelivered) * 100) : 0;
  const totalSubmissionsPool = analytics
    ? analytics.submissionsOnTime + analytics.submissionsLate + analytics.submissionsPendingOrMissing
    : 0;

  // Clasifica a cada estudiante según sus entregas: a tiempo, con retraso, pendientes
  const studentsByPunctualityCategory = useMemo(() => {
    type Entry = { student: StudentCourseMetric; count: number };
    const empty: Record<string, Entry[]> = { a_tiempo: [], con_retraso: [], pendientes: [] };
    if (!analytics || !selectedCourse) return empty;

    const courseActs = activities.filter((a) => a.courseId === selectedCourse.id);
    const courseSubs = submissions.filter((s) => s.courseId === selectedCourse.id);

    const result: Record<string, Entry[]> = {
      a_tiempo: [],
      con_retraso: [],
      pendientes: [],
    };

    analytics.students.forEach((student) => {
      let onTimeCount = 0;
      let lateCount = 0;
      let pendingCount = 0;

      courseActs.forEach((act) => {
        const sub = courseSubs.find(
          (s) => s.studentId === student.studentId && s.activityId === act.id
        );
        if (!sub || sub.status === "no_entregado" || sub.status === "pendiente") {
          pendingCount++;
        } else if (sub.submittedAt && act.dueDate) {
          if (new Date(sub.submittedAt).getTime() > new Date(act.dueDate).getTime()) {
            lateCount++;
          } else {
            onTimeCount++;
          }
        } else {
          onTimeCount++;
        }
      });

      if (onTimeCount > 0) result.a_tiempo.push({ student, count: onTimeCount });
      if (lateCount > 0) result.con_retraso.push({ student, count: lateCount });
      if (pendingCount > 0) result.pendientes.push({ student, count: pendingCount });
    });

    // Ordenar por count descendente
    Object.values(result).forEach((arr) => arr.sort((a, b) => b.count - a.count));

    return result;
  }, [analytics, selectedCourse, activities, submissions]);

  return (
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Barra Superior: Título + Selector de Curso */}
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Dashboard Analítico
            </h1>
            <span
              class={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                session?.role === "admin"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-[#EDE9FE] text-[#6D28D9]"
              }`}
            >
              {session?.role === "admin" ? "Admin" : "Docente"}
            </span>
          </div>

          <p class="text-xs sm:text-sm text-gray-500 mt-1">
            Supervisa el rendimiento académico, avance de entregas y alertas tempranas por curso.
          </p>
        </div>

        {/* Selector de Curso */}
        <div class="w-full md:w-80 shrink-0">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            Curso Activo
          </label>
          <SelectMenu
            options={courseOptions}
            value={selectedCourseId}
            onChange={handleCourseChange}
            ariaLabel="Seleccionar curso para ver analíticas"
            wrapperClass="w-full"
            icon={
              <svg class="w-4 h-4 text-[#5932EA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
        </div>
      </div>


      {analytics && (
        <>
          {/* Fila 1: Tarjetas KPI de Resumen Ejecutivo */}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Avance en M\u00f3dulos de Alfabetizaci\u00f3n */}
            {(() => {
              const avgOverall =
                alfabetizacionProgress.length > 0
                  ? Math.round(alfabetizacionProgress.reduce((a, s) => a + s.overallPct, 0) / alfabetizacionProgress.length)
                  : 0;
              const studentsWithAny = alfabetizacionProgress.filter((s) => s.totalCompleted > 0).length;
              const bloqueAvgs = BLOQUES_ALFABETIZACION.map((b, i) => ({
                titulo: b.tituloCorto,
                avg:
                  alfabetizacionProgress.length > 0
                    ? Math.round(
                        alfabetizacionProgress.reduce((a, s) => a + (s.bloques[i]?.pct ?? 0), 0) /
                          alfabetizacionProgress.length
                      )
                    : 0,
              }));

              return (
                <div class="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs flex flex-col gap-3">
                  {/* Encabezado */}
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-2.5">
                      <div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#EDE9FE,#DDD6FE)" }}>
                        <svg class="w-5 h-5 text-[#5932EA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <p class="text-[11px] font-bold uppercase tracking-wider text-gray-400">Avance Alfabetización</p>
                        <p class="text-2xl font-black text-gray-900 leading-tight">{avgOverall}%</p>
                      </div>
                    </div>
                    <span
                      class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        avgOverall >= 70 ? "bg-emerald-100 text-emerald-700" : avgOverall >= 40 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {avgOverall >= 70 ? "Avanzado" : avgOverall >= 40 ? "En progreso" : "Iniciando"}
                    </span>
                  </div>

                  {/* Barra global */}
                  <div class="space-y-1">
                    <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-700"
                        style={{ width: `${avgOverall}%`, background: "linear-gradient(90deg,#7C5CE9,#5932EA)" }}
                      />
                    </div>
                    <p class="text-[10px] text-gray-400">
                      {loadingAlfProgress
                        ? "Cargando progreso..."
                        : alfabetizacionProgress.length === 0
                        ? "Sin estudiantes asignados"
                        : `${studentsWithAny} de ${alfabetizacionProgress.length} est. con avance · 5 módulos`}
                    </p>
                  </div>

                  {/* Desglose por módulo — cada fila es clickeable */}
                  <div class="space-y-1 pt-1 border-t border-gray-100">
                    {bloqueAvgs.map(({ titulo, avg }, i) => {
                      const isOpen = selectedModuleIndex === i;
                      const barColor = avg >= 70 ? "#10B981" : avg >= 40 ? "#F59E0B" : "#5932EA";
                      // Estudiantes de este bloque
                      const studentsInModule = alfabetizacionProgress
                        .map((s) => {
                          const bp = s.bloques[i];
                          // Buscar nombre del estudiante en allUsers
                          const user = allUsers.find((u) => u.id === s.userId);
                          return {
                            userId: s.userId,
                            name: user?.name ?? s.userId,
                            codigo: user?.codigo ?? "",
                            pct: bp?.pct ?? 0,
                            completed: bp?.completed ?? 0,
                            total: bp?.total ?? 0,
                          };
                        })
                        .sort((a, b) => b.pct - a.pct);

                      return (
                        <div key={i}>
                          {/* Fila de módulo — clickeable */}
                          <button
                            onClick={() => handleModuleClick(i)}
                            class={`w-full flex items-center gap-2 px-1.5 py-1 rounded-lg transition-all duration-150 cursor-pointer ${
                              isOpen
                                ? "bg-[#EDE9FE]"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <span
                              class={`text-[10px] w-4 shrink-0 font-mono font-bold ${
                                isOpen ? "text-[#5932EA]" : "text-gray-500"
                              }`}
                            >
                              {i + 1}
                            </span>
                            <span
                              class={`text-[10px] truncate flex-1 min-w-0 text-left ${
                                isOpen ? "text-[#5932EA] font-semibold" : "text-gray-600"
                              }`}
                            >
                              {titulo}
                            </span>
                            <div class="w-14 bg-gray-100 rounded-full h-1 overflow-hidden shrink-0">
                              <div
                                class="h-full rounded-full transition-all duration-500"
                                style={{ width: `${avg}%`, backgroundColor: barColor }}
                              />
                            </div>
                            <span
                              class={`text-[10px] font-bold font-mono w-7 text-right shrink-0 ${
                                isOpen ? "text-[#5932EA]" : "text-gray-500"
                              }`}
                            >
                              {avg}%
                            </span>
                            <svg
                              class={`w-3 h-3 shrink-0 transition-transform duration-200 ${
                                isOpen ? "rotate-180 text-[#5932EA]" : "text-gray-300"
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Panel expandible: avance por estudiante */}
                          {isOpen && (
                            <div class="mt-1 mb-1 ml-4 mr-1 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-2 space-y-1.5 animate-fade-in">
                              {loadingAlfProgress ? (
                                <p class="text-[10px] text-[#7C5CE9] text-center py-1">Cargando...</p>
                              ) : studentsInModule.length === 0 ? (
                                <p class="text-[10px] text-gray-400 text-center py-1">Sin estudiantes asignados</p>
                              ) : (
                                studentsInModule.map((st) => {
                                  const stBarColor =
                                    st.pct >= 70 ? "#10B981" : st.pct >= 40 ? "#F59E0B" : "#EF4444";
                                  return (
                                    <div key={st.userId} class="flex items-center gap-2">
                                      {/* Avatar inicial */}
                                      <div
                                        class="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[9px] shrink-0 bg-[#EDE9FE] text-[#5932EA] border border-[#DDD6FE]"
                                      >
                                        {st.name.charAt(0).toUpperCase()}
                                      </div>
                                      {/* Nombre + código */}
                                      <div class="flex-1 min-w-0">
                                        <p class="text-[10px] font-semibold text-gray-700 truncate leading-tight">
                                          {st.name}
                                        </p>
                                        {st.codigo && (
                                          <p class="text-[9px] font-mono text-gray-400 leading-none">
                                            {st.codigo}
                                          </p>
                                        )}
                                      </div>
                                      {/* Barra de progreso */}
                                      <div class="w-14 bg-white rounded-full h-1.5 overflow-hidden border border-gray-200 shrink-0">
                                        <div
                                          class="h-full rounded-full transition-all duration-500"
                                          style={{ width: `${st.pct}%`, backgroundColor: stBarColor }}
                                        />
                                      </div>
                                      {/* Porcentaje */}
                                      <span
                                        class="text-[10px] font-bold font-mono w-8 text-right shrink-0"
                                        style={{ color: stBarColor }}
                                      >
                                        {st.pct}%
                                      </span>
                                      {/* Lecciones */}
                                      <span class="text-[9px] text-gray-400 shrink-0 font-mono">
                                        {st.completed}/{st.total}
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* KPI 2: Rendimiento Ponderado (Decisión A - Opción 2) */}
            <MetricCard
              title="Rendimiento Ponderado"
              value={`${analytics.averageWeightedScore}`}
              subtitle="Escala de 0 a 100 puntos"
              badge={{
                text: "50% Eval · 30% Tar · 20% Act",
                variant: "brand",
              }}
              progressPct={analytics.averageWeightedScore}
              progressColor={analytics.averageWeightedScore >= 70 ? "#10B981" : "#F59E0B"}
              footerNote={`Promedio simple aritmético: ${analytics.averageSimpleScore} pts`}
              icon={
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />

            {/* KPI 3: Tasa de Aprobación (Decisión A - Opción 3) */}
            <MetricCard
              title="Tasa de Aprobación"
              value={`${analytics.averageApprovalRate}%`}
              subtitle="Calificaciones ≥ 60 puntos"
              badge={{
                text: analytics.averageApprovalRate >= 75 ? "Sólido" : "Crítico",
                variant: analytics.averageApprovalRate >= 75 ? "success" : "danger",
              }}
              progressPct={analytics.averageApprovalRate}
              progressColor="#3B82F6"
              footerNote={`${analytics.students.filter((s) => s.approvalRate >= 60).length} de ${analytics.totalStudents} estudiantes aprobando`}
              icon={
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />

            {/* KPI 4: Estudiantes en Riesgo Académico — con lista + modal si > 3 */}
            {(() => {
              const riskStudents = analytics.students
                .filter((s) => s.status === "riesgo")
                .sort((a, b) => a.weightedScore - b.weightedScore); // peor nota primero
              const preview = riskStudents.slice(0, 3);
              const hasMore = riskStudents.length > 3;

              const RiskRow = ({ s, onClick }: { s: StudentCourseMetric; onClick: () => void }) => {
                const motivo =
                  s.weightedScore < 60 && s.progressDuePct < 50
                    ? "Nota y avance bajos"
                    : s.weightedScore < 60
                    ? `Nota: ${s.weightedScore} pts`
                    : `Avance: ${s.progressDuePct}%`;
                return (
                  <button
                    onClick={onClick}
                    class="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-rose-50 transition-colors group text-left cursor-pointer"
                  >
                    <div class={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] border shrink-0 ${s.avatarColor}`}>
                      {s.name.charAt(0)}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-[11px] font-semibold text-gray-800 truncate group-hover:text-rose-700 transition-colors">{s.name}</p>
                      <p class="text-[9px] font-mono text-gray-400">{s.codigo}</p>
                    </div>
                    <div class="flex flex-col items-end gap-0.5 shrink-0">
                      <span class="text-[10px] font-extrabold font-mono text-rose-600">{s.weightedScore} pts</span>
                      <span class="text-[9px] text-gray-400 leading-none">{motivo}</span>
                    </div>
                  </button>
                );
              };

              return (
                <div class="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs flex flex-col gap-3">
                  {/* Encabezado */}
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-2.5">
                      <div class={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${riskStudents.length === 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
                        <svg class={`w-5 h-5 ${riskStudents.length === 0 ? "text-emerald-500" : "text-rose-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <p class="text-[11px] font-bold uppercase tracking-wider text-gray-400">Estudiantes en Riesgo</p>
                        <p class={`text-2xl font-black leading-tight ${riskStudents.length === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {riskStudents.length}
                        </p>
                      </div>
                    </div>
                    <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${riskStudents.length === 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {riskStudents.length === 0 ? "Sin alertas" : `${riskStudents.length} en alerta`}
                    </span>
                  </div>

                  {/* Barra de proporción */}
                  <div class="space-y-1">
                    <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(riskStudents.length / Math.max(1, analytics.totalStudents)) * 100}%`,
                          backgroundColor: riskStudents.length === 0 ? "#10B981" : "#EF4444",
                        }}
                      />
                    </div>
                    <p class="text-[10px] text-gray-400">
                      {analytics.regularCount} regulares · {analytics.excellentCount} destacados · {analytics.totalStudents} total
                    </p>
                  </div>

                  {/* Lista de estudiantes en riesgo (máx 3 en preview) */}
                  <div class="border-t border-gray-100 pt-2">
                    {riskStudents.length === 0 ? (
                      <div class="flex items-center gap-2 py-2">
                        <svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span class="text-xs text-gray-500">Ningún estudiante en situación de alerta</span>
                      </div>
                    ) : (
                      <div class="space-y-1">
                        {preview.map((s) => (
                          <RiskRow key={s.studentId} s={s} onClick={() => setSelectedStudent(s)} />
                        ))}
                        {hasMore && (
                          <button
                            onClick={() => setShowRiskModal(true)}
                            class="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer group"
                          >
                            <svg class="w-3.5 h-3.5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span class="text-[11px] font-bold text-rose-600 group-hover:text-rose-700">
                              Ver todos ({riskStudents.length})
                            </span>
                            <svg class="w-3 h-3 text-rose-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Fila 2: Visualizaciones Gráficas */}
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfica 1: Histograma de Distribución de Calificaciones */}
            <div class="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <h3 class="text-sm font-bold text-gray-900">
                    Distribución de Calificaciones
                  </h3>
                  <span class="text-xs text-gray-400 font-mono">
                    Total: {analytics.totalStudents} est.
                  </span>
                </div>
                <p class="text-xs text-gray-500 mb-4">
                  Conteo de alumnos agrupados por rango de desempeño ponderado.
                </p>
              </div>

              <div class="py-2">
                <VerticalBarChart items={distributionChartData} height={190} />
              </div>

              <div class="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span>Nota mínima de aprobación: 60 pts</span>
                <span class="text-emerald-600 font-semibold">
                  {analytics.excellentCount + analytics.regularCount} aprobados
                </span>
              </div>
            </div>

            {/* Gráfica 2: Ranking y Rendimiento por Actividad */}
            <div class="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <h3 class="text-sm font-bold text-gray-900">
                    Rendimiento por Actividad
                  </h3>
                  {/* Selector de métrica */}
                  <div class="flex items-center bg-gray-100 p-0.5 rounded-lg text-[10px] font-semibold">
                    <button
                      onClick={() => setActivityMetricTab("score")}
                      class={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        activityMetricTab === "score"
                          ? "bg-white text-gray-900 shadow-xs"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      Nota Media
                    </button>
                    <button
                      onClick={() => setActivityMetricTab("submissions")}
                      class={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        activityMetricTab === "submissions"
                          ? "bg-white text-gray-900 shadow-xs"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      % Entregas
                    </button>
                  </div>
                </div>
                <p class="text-xs text-gray-500 mb-4">
                  {activityMetricTab === "score"
                    ? "Promedio de notas obtenidas en cada actividad del curso."
                    : "Tasa de completitud y entregas sobre el total de alumnos."}
                </p>
              </div>

              <div class="max-h-[220px] overflow-y-auto pr-1">
                <HorizontalBarChart items={activityChartData} />
              </div>

              <div class="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span>{analytics.totalActivities} actividades registradas</span>
                <a href="/actividades" class="text-[#5932EA] hover:underline font-medium">
                  Crear actividad →
                </a>
              </div>
            </div>

            {/* Gráfica 3: Estado de Cumplimiento de Entregas (Gráfico Circular Multisegmento) */}
            <div class="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <h3 class="text-sm font-bold text-gray-900">
                    Puntualidad y Cumplimiento
                  </h3>
                  <span class="text-xs font-mono text-gray-400">
                    Total: {totalSubmissionsPool}
                  </span>
                </div>
                <p class="text-xs text-gray-500 mb-4">
                  Distribución proporcional de entregas a tiempo, con retraso y no entregadas.
                </p>
              </div>

              <div class="py-2 flex items-center justify-center">
                <MultiSegmentDonut
                  segments={punctualitySegments}
                  size={185}
                  activeSegmentKey={hoveredPunctualityKey}
                  selectedSegmentKey={selectedPunctualityKey}
                  onHoverSegment={setHoveredPunctualityKey}
                  onClickSegment={handlePunctualityClick}
                />
              </div>

              {/* Leyenda interactiva con porcentajes, "X de Y entregas" y clic para drill-down */}
              <div class="space-y-1 pt-4 border-t border-gray-100">
                {punctualitySegments.map((seg) => {
                  const isHovered = hoveredPunctualityKey === seg.key;
                  const isSelected = selectedPunctualityKey === seg.key;
                  const isAnyHovered = hoveredPunctualityKey !== null;
                  const isAnySelected = selectedPunctualityKey !== null;
                  const pct = totalSubmissionsPool > 0 ? Math.round((seg.count / totalSubmissionsPool) * 100) : 0;

                  return (
                    <div
                      key={seg.key}
                      onMouseEnter={() => setHoveredPunctualityKey(seg.key)}
                      onMouseLeave={() => setHoveredPunctualityKey(null)}
                      onClick={() => handlePunctualityClick(seg.key)}
                      class={`flex items-center justify-between px-2.5 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "ring-2 shadow-sm scale-[1.01]"
                          : isHovered
                          ? "bg-gray-100 shadow-xs scale-[1.01]"
                          : isAnyHovered || (isAnySelected && !isSelected)
                          ? "opacity-50"
                          : "hover:bg-gray-50"
                      }`}
                      style={isSelected ? { ringColor: seg.color, backgroundColor: seg.color + "12" } : {}}
                    >
                      {/* Dot + nombre + subtexto */}
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span
                          class="w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-200"
                          style={{ backgroundColor: isSelected || isHovered ? seg.color : isAnyHovered || (isAnySelected && !isSelected) ? "#CBD5E1" : seg.color }}
                        />
                        <div class="flex flex-col leading-tight min-w-0">
                          <span class={`text-xs font-medium transition-colors duration-200 ${isSelected ? "font-bold" : "text-gray-700"}`}>
                            {seg.label}
                          </span>
                          <span class="text-[10px] font-mono text-gray-400">
                            {seg.count} de {totalSubmissionsPool} entregas
                          </span>
                        </div>
                      </div>

                      {/* Pastilla pct + flecha toggle */}
                      <div class="flex items-center gap-1.5 shrink-0">
                        <span
                          class={`text-[11px] font-extrabold font-mono px-2 py-0.5 rounded-lg transition-colors duration-200 ${
                            isSelected ? "text-white" : isHovered ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
                          }`}
                          style={isSelected ? { backgroundColor: seg.color } : {}}
                        >
                          {pct}%
                        </span>
                        <svg
                          class={`w-3.5 h-3.5 transition-transform duration-200 ${isSelected ? "rotate-180" : ""}`}
                          style={{ color: isSelected ? seg.color : "#9CA3AF" }}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Panel de detalle de estudiantes al seleccionar un segmento */}
              {selectedPunctualityKey && (() => {
                const seg = punctualitySegments.find((s) => s.key === selectedPunctualityKey)!;
                const studentList = studentsByPunctualityCategory[selectedPunctualityKey] || [];

                const labelMap: Record<string, { title: string; noun: string }> = {
                  a_tiempo: { title: "Entregas a tiempo", noun: "act. a tiempo" },
                  con_retraso: { title: "Entregas con retraso", noun: "act. con retraso" },
                  pendientes: { title: "Sin entregar / pendientes", noun: "act. pendientes" },
                };
                const meta = labelMap[selectedPunctualityKey] || { title: selectedPunctualityKey, noun: "entregas" };

                return (
                  <div class="mt-3 border-t border-gray-100 pt-3">
                    {/* Encabezado del panel */}
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span class="text-xs font-bold text-gray-900">{meta.title}</span>
                        <span
                          class="text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-white"
                          style={{ backgroundColor: seg.color }}
                        >
                          {studentList.length} estudiantes
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedPunctualityKey(null)}
                        class="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                        title="Cerrar"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Lista de estudiantes */}
                    {studentList.length === 0 ? (
                      <p class="text-xs text-gray-400 text-center py-3">Ningún estudiante en esta categoría</p>
                    ) : (
                      <div class="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {studentList.map(({ student, count }) => (
                          <div
                            key={student.studentId}
                            onClick={() => setSelectedStudent(student)}
                            class="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
                          >
                            {/* Avatar */}
                            <div class={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] border shrink-0 ${student.avatarColor}`}>
                              {student.name.charAt(0)}
                            </div>
                            {/* Info */}
                            <div class="flex-1 min-w-0">
                              <p class="text-[11px] font-semibold text-gray-800 truncate group-hover:text-[#5932EA] transition-colors">
                                {student.name}
                              </p>
                              <p class="text-[9px] font-mono text-gray-400">{student.codigo}</p>
                            </div>
                            {/* Conteo */}
                            <span
                              class="text-[10px] font-extrabold font-mono px-1.5 py-0.5 rounded-md text-white shrink-0"
                              style={{ backgroundColor: seg.color + "CC" }}
                            >
                              {count} {meta.noun}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Fila 3: Roster Analítico de Estudiantes (Tabla Interactiva + Drill-down) */}
          <div class="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 class="text-base font-bold text-gray-900">
                  Desempeño Individual por Estudiante
                </h3>
                <p class="text-xs text-gray-500">
                  Haz clic en cualquier estudiante para inspeccionar su trayectoria temporal y detalle de entregas.
                </p>
              </div>

              {/* Controles de Búsqueda y Filtro */}
              <div class="flex items-center gap-3 flex-wrap">
                {/* Buscador */}
                <div class="relative min-w-[200px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                    placeholder="Buscar por nombre o código..."
                    class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#5932EA] focus:ring-1 focus:ring-[#5932EA]"
                  />
                  <svg
                    class="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Filtro por estado */}
                <div class="flex items-center bg-gray-100 p-0.5 rounded-xl text-xs">
                  <button
                    onClick={() => setStatusFilter("todos")}
                    class={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      statusFilter === "todos" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"
                    }`}
                  >
                    Todos ({analytics.students.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("riesgo")}
                    class={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      statusFilter === "riesgo" ? "bg-rose-500 text-white shadow-xs" : "text-gray-500 hover:text-rose-600"
                    }`}
                  >
                    En Riesgo ({analytics.atRiskCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter("regular")}
                    class={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      statusFilter === "regular" ? "bg-white text-amber-700 shadow-xs" : "text-gray-500"
                    }`}
                  >
                    Regular ({analytics.regularCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter("excelente")}
                    class={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      statusFilter === "excelente" ? "bg-white text-emerald-700 shadow-xs" : "text-gray-500"
                    }`}
                  >
                    Destacados ({analytics.excellentCount})
                  </button>
                </div>

                {/* Botón de regenerar simulación para pruebas */}
                <button
                  onClick={handleRegenerateSeed}
                  disabled={generatingMock}
                  class="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Regenerar datos de prueba sintéticos con nueva distribución"
                >
                  <svg class={`w-3.5 h-3.5 ${generatingMock ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{generatingMock ? "Calculando..." : "Simular Datos"}</span>
                </button>
              </div>
            </div>

            {/* Tabla de Estudiantes */}
            <div class="overflow-x-auto rounded-2xl border border-gray-100">
              <table class="w-full text-left text-xs">
                <thead class="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100">
                  <tr>
                    <th
                      onClick={() => toggleSort("name")}
                      class="py-3 px-4 cursor-pointer hover:text-gray-900 select-none"
                    >
                      <div class="flex items-center gap-1">
                        <span>Estudiante</span>
                        {sortBy === "name" && (
                          <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort("progress")}
                      class="py-3 px-4 cursor-pointer hover:text-gray-900 select-none text-center"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <span>Avance a la Fecha</span>
                        {sortBy === "progress" && (
                          <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort("weighted")}
                      class="py-3 px-4 cursor-pointer hover:text-gray-900 select-none text-center"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <span>Rend. Ponderado</span>
                        {sortBy === "weighted" && (
                          <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort("approval")}
                      class="py-3 px-4 cursor-pointer hover:text-gray-900 select-none text-center"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <span>Tasa Aprobación</span>
                        {sortBy === "approval" && (
                          <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th class="py-3 px-4 text-center">Estado Académico</th>
                    <th class="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colspan={6} class="py-8 text-center text-gray-400">
                        No se encontraron estudiantes que coincidan con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const statusConfig = {
                        excelente: { label: "Destacado", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                        regular: { label: "Regular", class: "bg-amber-50 text-amber-700 border-amber-200" },
                        riesgo: { label: "En Riesgo", class: "bg-rose-50 text-rose-700 border-rose-200" },
                      }[student.status];

                      return (
                        <tr
                          key={student.studentId}
                          onClick={() => setSelectedStudent(student)}
                          class="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                        >
                          {/* Columna Estudiante */}
                          <td class="py-3 px-4">
                            <div class="flex items-center gap-3">
                              <div
                                class={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border shrink-0 ${student.avatarColor}`}
                              >
                                {student.name.charAt(0)}
                              </div>
                              <div class="min-w-0">
                                <p class="font-semibold text-gray-900 group-hover:text-[#5932EA] transition-colors truncate">
                                  {student.name}
                                </p>
                                <p class="text-[11px] text-gray-400 font-mono">
                                  {student.codigo}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Columna Avance a la Fecha */}
                          <td class="py-3 px-4">
                            <div class="flex flex-col items-center max-w-[120px] mx-auto">
                              <div class="flex items-center justify-between w-full text-[11px] font-semibold text-gray-700 mb-1">
                                <span>{student.progressDuePct}%</span>
                                <span class="text-[10px] text-gray-400 font-normal">
                                  {student.submittedCount}/{student.dueActivitiesCount}
                                </span>
                              </div>
                              <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                  class="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${student.progressDuePct}%`,
                                    backgroundColor: student.progressDuePct >= 70 ? "#5932EA" : "#F59E0B",
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Columna Rendimiento Ponderado */}
                          <td class="py-3 px-4 text-center font-mono font-bold text-sm">
                            <span
                              class={
                                student.weightedScore >= 75
                                  ? "text-emerald-600"
                                  : student.weightedScore >= 60
                                  ? "text-amber-600"
                                  : "text-rose-600"
                              }
                            >
                              {student.weightedScore} pts
                            </span>
                          </td>

                          {/* Columna Tasa de Aprobación */}
                          <td class="py-3 px-4 text-center font-mono font-semibold text-gray-700">
                            {student.approvalRate}%
                          </td>

                          {/* Columna Estado */}
                          <td class="py-3 px-4 text-center">
                            <span
                              class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusConfig.class}`}
                            >
                              {statusConfig.label}
                            </span>
                          </td>

                          {/* Columna Acción */}
                          <td class="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudent(student);
                              }}
                              class="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#5932EA] hover:bg-[#EDE9FE] transition-colors cursor-pointer"
                            >
                              Ver detalle →
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Drill-Down de Detalle del Estudiante */}
      {selectedStudent && analytics && (
        <StudentDetailModal
          student={selectedStudent}
          courseSummary={analytics}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {/* Modal: Lista completa de estudiantes en riesgo */}
      {showRiskModal && analytics && (() => {
        const riskStudents = analytics.students
          .filter((s) => s.status === "riesgo")
          .sort((a, b) => a.weightedScore - b.weightedScore);
        return (
          <div
            class="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowRiskModal(false); }}
          >
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden animate-fade-in">
              {/* Header del modal */}
              <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 class="text-base font-black text-gray-900">Estudiantes en Riesgo Académico</h2>
                    <p class="text-xs text-gray-500">{riskStudents.length} estudiantes · Nota ponderada &lt; 60 o avance &lt; 50%</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRiskModal(false)}
                  class="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Cuerpo: lista scrolleable */}
              <div class="overflow-y-auto flex-1 px-4 py-3 space-y-2">
                {riskStudents.map((s, i) => {
                  const motivo =
                    s.weightedScore < 60 && s.progressDuePct < 50
                      ? "Nota ponderada y avance bajos"
                      : s.weightedScore < 60
                      ? "Nota ponderada insuficiente"
                      : "Avance a la fecha insuficiente";
                  return (
                    <button
                      key={s.studentId}
                      onClick={() => { setShowRiskModal(false); setSelectedStudent(s); }}
                      class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-100 hover:border-rose-200 hover:bg-rose-50 transition-all group text-left cursor-pointer"
                    >
                      {/* Posición */}
                      <span class="text-xs font-black text-gray-300 w-5 shrink-0 text-center">{i + 1}</span>
                      {/* Avatar */}
                      <div class={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border-2 shrink-0 ${s.avatarColor}`}>
                        {s.name.charAt(0)}
                      </div>
                      {/* Info principal */}
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-900 truncate group-hover:text-rose-700 transition-colors">{s.name}</p>
                        <div class="flex items-center gap-2 mt-0.5">
                          <span class="text-[10px] font-mono text-gray-400">{s.codigo}</span>
                          <span class="text-[10px] text-rose-500 font-semibold">{motivo}</span>
                        </div>
                      </div>
                      {/* Métricas */}
                      <div class="flex items-center gap-3 shrink-0">
                        <div class="text-center">
                          <p class="text-base font-black text-rose-600">{s.weightedScore}</p>
                          <p class="text-[9px] text-gray-400 leading-none">pts</p>
                        </div>
                        <div class="text-center">
                          <p class="text-sm font-bold text-gray-500">{s.progressDuePct}%</p>
                          <p class="text-[9px] text-gray-400 leading-none">avance</p>
                        </div>
                        <svg class="w-4 h-4 text-gray-300 group-hover:text-rose-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div class="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p class="text-xs text-gray-400">
                  Haz clic en un estudiante para ver su detalle completo
                </p>
                <button
                  onClick={() => setShowRiskModal(false)}
                  class="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
