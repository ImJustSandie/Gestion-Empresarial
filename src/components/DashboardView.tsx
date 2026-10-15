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
import { seedMockDataForCourse } from "../utils/dashboardMock";
import {
  calculateCourseAnalytics,
  type CourseAnalyticsSummary,
  type StudentCourseMetric,
} from "../utils/dashboardAnalytics";
import SelectMenu from "./SelectMenu";
import MetricCard from "./dashboard/MetricCard";
import DonutProgress from "./dashboard/DonutProgress";
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

  // Filtros y ordenamiento en el roster de estudiantes
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "riesgo" | "regular" | "excelente">("todos");
  const [sortBy, setSortBy] = useState<"name" | "progress" | "weighted" | "approval">("weighted");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pestaña de visualización para el rendimiento por actividad
  const [activityMetricTab, setActivityMetricTab] = useState<"score" | "submissions">("score");

  // Estudiante seleccionado para el Drill-down modal
  const [selectedStudent, setSelectedStudent] = useState<StudentCourseMetric | null>(null);

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
    await resetCourseSubmissions(selectedCourse.id);
    const courseActs = activities.filter((a) => a.courseId === selectedCourse.id);
    const newSubs = await seedMockDataForCourse(selectedCourse, courseActs, allUsers, []);
    setSubmissions((prev) => [...prev.filter((s) => s.courseId !== selectedCourse.id), ...newSubs]);
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

  return (
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Barra Superior: Título + Selector de Curso */}
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Dashboard Analítico
            </h1>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EDE9FE] text-[#6D28D9]">
              Docente
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
            {/* KPI 1: Avance Promedio a la Fecha (Decisión B - Opción 2) */}
            <MetricCard
              title="Avance Promedio a la Fecha"
              value={`${analytics.averageProgressDuePct}%`}
              subtitle={`Relativo a ${analytics.dueActivitiesCount} actividades exigibles`}
              badge={{
                text: analytics.averageProgressDuePct >= 70 ? "Al día" : "Atención",
                variant: analytics.averageProgressDuePct >= 70 ? "success" : "warning",
              }}
              progressPct={analytics.averageProgressDuePct}
              progressColor="#5932EA"
              footerNote={`Avance global del programa: ${analytics.averageProgressTotalPct}% (${analytics.totalActivities} actividades)`}
              icon={
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />

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

            {/* KPI 4: Estudiantes en Riesgo Académico */}
            <MetricCard
              title="Estudiantes en Riesgo"
              value={analytics.atRiskCount}
              subtitle="Nota ponderada < 60 o avance < 50%"
              badge={{
                text: analytics.atRiskCount === 0 ? "Sin alertas" : `${analytics.atRiskCount} en alerta`,
                variant: analytics.atRiskCount === 0 ? "success" : "danger",
              }}
              progressPct={(analytics.atRiskCount / Math.max(1, analytics.totalStudents)) * 100}
              progressColor="#EF4444"
              footerNote={`${analytics.regularCount} en nivel regular · ${analytics.excellentCount} destacados`}
              onClick={() => setStatusFilter("riesgo")}
              icon={
                <svg class="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
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

            {/* Gráfica 3: Estado de Cumplimiento de Entregas */}
            <div class="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <h3 class="text-sm font-bold text-gray-900 mb-1">
                  Puntualidad y Cumplimiento
                </h3>
                <p class="text-xs text-gray-500 mb-4">
                  Monitoreo de entregas a tiempo frente a entregas tardías y pendientes.
                </p>
              </div>

              <div class="py-2 flex items-center justify-center">
                <DonutProgress
                  percentage={analytics.averageProgressDuePct}
                  size={140}
                  strokeWidth={14}
                  color="#5932EA"
                  bgColor="#EDE9FE"
                  label="Cumplimiento"
                />
              </div>

              <div class="space-y-2 pt-4 border-t border-gray-100">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span class="text-gray-600">Entregadas a tiempo</span>
                  </div>
                  <span class="font-bold text-gray-900 font-mono">
                    {analytics.submissionsOnTime}
                  </span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span class="text-gray-600">Entregadas con retraso</span>
                  </div>
                  <span class="font-bold text-gray-900 font-mono">
                    {analytics.submissionsLate}
                  </span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span class="text-gray-600">Pendientes o no entregadas</span>
                  </div>
                  <span class="font-bold text-gray-900 font-mono">
                    {analytics.submissionsPendingOrMissing}
                  </span>
                </div>
              </div>
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
    </div>
  );
}
