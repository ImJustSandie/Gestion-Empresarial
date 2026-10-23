// src/components/dashboard/StudentDetailModal.tsx
import type { StudentCourseMetric, CourseAnalyticsSummary } from "../../utils/dashboardAnalytics";
import LineChart, { type LineDataPoint } from "./LineChart";
import DonutProgress from "./DonutProgress";

interface StudentDetailModalProps {
  student: StudentCourseMetric | null;
  courseSummary: CourseAnalyticsSummary;
  onClose: () => void;
}

export default function StudentDetailModal({
  student,
  courseSummary,
  onClose,
}: StudentDetailModalProps) {
  if (!student) return null;

  // Preparar puntos de datos para la gráfica de línea
  const lineData: LineDataPoint[] = student.timeline.map((item) => ({
    label: item.activityTitle,
    studentScore: item.studentScore,
    groupAvg: item.groupAverageScore,
  }));

  const statusBadge = {
    excelente: { label: "Desempeño Destacado", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    regular: { label: "Desempeño Regular", class: "bg-amber-50 text-amber-700 border-amber-200" },
    riesgo: { label: "Alerta Académica / En Riesgo", class: "bg-rose-50 text-rose-700 border-rose-200" },
  }[student.status];

  const typeLabels: Record<string, string> = {
    evaluacion: "Evaluación (50%)",
    tarea: "Tarea (30%)",
    actividad: "Actividad (20%)",
  };

  return (
    <div class="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div
        class="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <div class="p-6 border-b border-gray-100 flex items-start justify-between gap-4 bg-gray-50/50">
          <div class="flex items-center gap-4 min-w-0">
            <div
              class={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border shrink-0 ${student.avatarColor}`}
            >
              {student.name.charAt(0)}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-xl font-bold text-gray-900 truncate">{student.name}</h3>
                <span
                  class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge.class}`}
                >
                  {statusBadge.label}
                </span>
              </div>
              <p class="text-xs text-gray-500 mt-0.5">
                Código: <span class="font-mono font-semibold text-gray-700">{student.codigo}</span> · {student.email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            class="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
            title="Cerrar detalle"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cuerpo del Modal con scroll */}
        <div class="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Fila de Métricas Comparativas */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KPI 1: Rendimiento Ponderado */}
            <div class="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Rendimiento Ponderado
                </p>
                <div class="flex items-baseline gap-2 mt-1">
                  <span class="text-2xl font-black text-gray-900">{student.weightedScore}</span>
                  <span class="text-xs text-gray-400">/ 100 pts</span>
                </div>
                <p class="text-[11px] text-gray-500 mt-1">
                  Promedio del curso: <span class="font-semibold text-gray-700">{courseSummary.averageWeightedScore} pts</span>
                </p>
              </div>
              <div class="shrink-0">
                <DonutProgress
                  percentage={student.weightedScore}
                  size={64}
                  strokeWidth={7}
                  color={student.weightedScore >= 75 ? "#10B981" : student.weightedScore >= 60 ? "#F59E0B" : "#EF4444"}
                  bgColor="#E2E8F0"
                />
              </div>
            </div>

            {/* KPI 2: Tasa de Aprobación */}
            <div class="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tasa de Aprobación
                </p>
                <div class="flex items-baseline gap-2 mt-1">
                  <span class="text-2xl font-black text-gray-900">{student.approvalRate}%</span>
                </div>
                <p class="text-[11px] text-gray-500 mt-1">
                  Media del curso: <span class="font-semibold text-gray-700">{courseSummary.averageApprovalRate}%</span>
                </p>
              </div>
              <div class="shrink-0">
                <DonutProgress
                  percentage={student.approvalRate}
                  size={64}
                  strokeWidth={7}
                  color="#5932EA"
                  bgColor="#EDE9FE"
                />
              </div>
            </div>

            {/* KPI 3: Avance a la Fecha */}
            <div class="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Avance a la Fecha
                </p>
                <div class="flex items-baseline gap-2 mt-1">
                  <span class="text-2xl font-black text-gray-900">{student.progressDuePct}%</span>
                </div>
                <p class="text-[11px] text-gray-500 mt-1">
                  {student.submittedCount} de {student.dueActivitiesCount} actividades exigibles
                </p>
              </div>
              <div class="shrink-0">
                <DonutProgress
                  percentage={student.progressDuePct}
                  size={64}
                  strokeWidth={7}
                  color="#3B82F6"
                  bgColor="#DBEAFE"
                />
              </div>
            </div>
          </div>

          {/* Gráfica de Tendencia Temporal */}
          <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
            <div class="flex items-center justify-between mb-2">
              <div>
                <h4 class="text-sm font-bold text-gray-900">
                  Trayectoria y Rendimiento Temporal
                </h4>
                <p class="text-xs text-gray-500">
                  Comparación cronológica de notas del estudiante frente a la media del grupo
                </p>
              </div>
            </div>
            <LineChart data={lineData} studentName={student.name} height={210} />
          </div>

          {/* Historial Detallado de Actividades */}
          <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
            <h4 class="text-sm font-bold text-gray-900 mb-3">
              Detalle de Entregas y Calificaciones
            </h4>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-semibold">
                    <th class="py-2.5 px-3">Actividad</th>
                    <th class="py-2.5 px-3">Tipo</th>
                    <th class="py-2.5 px-3">Fecha Límite</th>
                    <th class="py-2.5 px-3">Estado</th>
                    <th class="py-2.5 px-3 text-right">Nota Estudiante</th>
                    <th class="py-2.5 px-3 text-right">Media Grupo</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  {student.timeline.map((item) => {
                    const statusConfig = {
                      calificado: { label: "Calificado", class: "bg-emerald-50 text-emerald-700" },
                      entregado: { label: "Entregado", class: "bg-blue-50 text-blue-700" },
                      pendiente: { label: "Por Vencer", class: "bg-gray-100 text-gray-600" },
                      no_entregado: { label: "No Entregado", class: "bg-rose-50 text-rose-700 font-bold" },
                    }[item.status] || { label: item.status, class: "bg-gray-100 text-gray-700" };

                    return (
                      <tr key={item.activityId} class="hover:bg-gray-50/70 transition-colors">
                        <td class="py-3 px-3 font-medium text-gray-800">
                          {item.activityTitle}
                        </td>
                        <td class="py-3 px-3 text-gray-500">
                          {typeLabels[item.activityType] || item.activityType}
                        </td>
                        <td class="py-3 px-3 text-gray-500">
                          {item.dueDate ? new Date(item.dueDate).toLocaleDateString("es-ES") : "Sin fecha"}
                        </td>
                        <td class="py-3 px-3">
                          <span
                            class={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${statusConfig.class}`}
                          >
                            {statusConfig.label}
                          </span>
                        </td>
                        <td class="py-3 px-3 text-right font-mono font-bold">
                          {item.studentScore !== null ? (
                            <span
                              class={
                                item.studentScore >= 75
                                  ? "text-emerald-600"
                                  : item.studentScore >= 60
                                  ? "text-amber-600"
                                  : "text-rose-600"
                              }
                            >
                              {item.studentScore} pts
                            </span>
                          ) : (
                            <span class="text-gray-400">—</span>
                          )}
                        </td>
                        <td class="py-3 px-3 text-right font-mono text-gray-500">
                          {item.groupAverageScore !== null ? `${item.groupAverageScore} pts` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer del Modal */}
        <div class="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            class="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-medium text-xs hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Volver a la vista general
          </button>
        </div>
      </div>
    </div>
  );
}
