// SubmissionModal.tsx - Entrega de actividad (texto) por parte del estudiante
// y revisión/calificación de entregas por parte del profesor (dual mode).
import { useState } from "preact/hooks";
import {
  type Activity,
  type Course,
  type ActivitySubmission,
  saveSubmission,
  sintaxiaToolHref,
} from "../utils/courses";
import type { Session, User } from "../utils/auth";

export type SubmissionModalMode = "student" | "teacher";

interface Props {
  activity: Activity;
  course: Course;
  mode: SubmissionModalMode;
  session: Session;
  /** Entregas del curso (solo se usan las de la actividad dada) */
  submissions: ActivitySubmission[];
  /** Estudiantes matriculados (solo modo profesor) */
  students: User[];
  onClose: () => void;
  /** Callback tras guardar/actualizar una entrega */
  onSaved: (sub: ActivitySubmission) => void;
}

const STATUS_BADGE: Record<ActivitySubmission["status"], { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-amber-50 border-amber-200/80 text-amber-700" },
  entregado: { label: "Entregado", cls: "bg-sky-50 border-sky-200/80 text-sky-700" },
  calificado: { label: "Calificado", cls: "bg-emerald-50 border-emerald-200/80 text-emerald-700" },
  no_entregado: { label: "Sin entregar", cls: "bg-rose-50 border-rose-200/80 text-rose-700" },
};

function StatusBadge({ sub }: { sub?: ActivitySubmission }) {
  const status = sub?.status ?? "pendiente";
  const badge = STATUS_BADGE[status];
  return (
    <span class={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.cls}`}>
      {badge.label}
      {sub?.status === "calificado" && sub.score !== undefined ? ` · ${sub.score}/100` : ""}
    </span>
  );
}

/** Panel propio de lectura + calificación de una entrega (profesor) */
function ReviewPanel({
  student,
  activity,
  submission,
  onClose,
  onSaved,
}: {
  student: User;
  activity: Activity;
  submission?: ActivitySubmission;
  onClose: () => void;
  onSaved: (sub: ActivitySubmission) => void;
}) {
  const [score, setScore] = useState<string>(
    submission?.score !== undefined ? String(submission.score) : ""
  );
  const [feedback, setFeedback] = useState<string>(submission?.feedback ?? "");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const activityLocked = Boolean(activity.locked);

  const hasContent = Boolean(submission?.content?.trim());

  const handleSubmit = async () => {
    if (!submission && !hasContent) {
      setMsg({ type: "error", text: "El estudiante aún no ha entregado." });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    const numeric = score.trim() === "" ? undefined : Number(score);
    if (numeric !== undefined && (Number.isNaN(numeric) || numeric < 0 || numeric > 100)) {
      setMsg({ type: "error", text: "La nota debe estar entre 0 y 100." });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    // Estado: con nota => calificado; sin nota => vuelve a "entregado" (si hay texto)
    const nextStatus =
      numeric !== undefined
        ? "calificado"
        : hasContent
          ? "entregado"
          : submission?.status ?? "pendiente";
    const res = await saveSubmission({
      id: submission?.id,
      activityId: activity.id,
      courseId: activity.courseId,
      studentId: student.id,
      status: nextStatus,
      submittedAt: submission?.submittedAt,
      content: submission?.content,
      score: numeric,
      maxScore: submission?.maxScore ?? 100,
      feedback: feedback.trim() || undefined,
      locked: submission?.locked,
    });
    onSaved(res.submission);
    setMsg({
      type: "success",
      text: numeric !== undefined ? "Calificación guardada." : "Guardado sin nota (entrega pendiente de nota).",
    });
    setTimeout(() => setMsg(null), 3500);
  };

  /** Bloquear/desbloquear la edición de ESTA entrega por parte del estudiante */
  const toggleLocked = async () => {
    if (!submission) return;
    const res = await saveSubmission({
      id: submission.id,
      activityId: activity.id,
      courseId: activity.courseId,
      studentId: student.id,
      status: submission.status,
      submittedAt: submission.submittedAt,
      content: submission.content,
      score: submission.score,
      maxScore: submission.maxScore,
      feedback: submission.feedback,
      locked: !submission.locked,
    });
    onSaved(res.submission);
    setMsg({ type: "success", text: res.submission.locked ? "Entrega bloqueada para el estudiante." : "Entrega desbloqueada: el estudiante puede editarla de nuevo." });
    setTimeout(() => setMsg(null), 3500);
  };

  return (
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay */}
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel de lectura */}
      <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              class="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Volver a la lista de entregas"
            >
              <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <div class="w-10 h-10 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center text-sm font-bold shrink-0">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div class="min-w-0">
              <h3 class="text-base font-bold text-slate-900 leading-tight truncate">{student.name}</h3>
              <p class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span class="font-mono">{student.codigo || student.email}</span>
                {submission?.submittedAt && (
                  <>
                    <span>·</span>
                    <span>Entregó: {new Date(submission.submittedAt).toLocaleString("es-CO")}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <StatusBadge sub={submission} />
        </div>

        {/* Cuerpo: texto de la entrega en área grande de lectura */}
        <div class="flex-1 overflow-y-auto p-6 sm:p-7">
          {hasContent ? (
            <>
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Entrega del estudiante
              </p>
              <div class="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-5 sm:p-6">
                <p class="text-sm sm:text-base text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {submission?.content}
                </p>
              </div>
            </>
          ) : submission ? (
            <p class="text-sm text-slate-400 text-center py-10">
              La entrega está registrada pero no incluye texto.
            </p>
          ) : (
            <p class="text-sm text-slate-400 text-center py-10">
              El estudiante aún no ha entregado esta actividad.
            </p>
          )}
        </div>

        {/* Pie: calificación siempre disponible (re-calificable) */}
        <div class="border-t border-slate-100 bg-white px-6 py-4 shrink-0">
          {msg && (
            <div
              class={`mb-3 px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                msg.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <span>{msg.type === "success" ? "✓" : "⚠"}</span>
              <span>{msg.text}</span>
            </div>
          )}

          <div class="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-3">
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Nota (0-100)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                placeholder={submission ? "—" : "Sin entrega"}
                value={score}
                onInput={(e) => setScore((e.target as HTMLInputElement).value)}
                disabled={!submission}
                class="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus-within:ring-2 focus-within:ring-[#5932EA]/20 focus-within:border-[#5932EA] transition disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Retroalimentación (visible al estudiante)
              </label>
              <textarea
                placeholder="Comentario para el estudiante (opcional)"
                value={feedback}
                onInput={(e) => setFeedback((e.target as HTMLTextAreaElement).value)}
                disabled={!submission}
                rows={2}
                class="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none resize-y min-h-[70px] focus-within:ring-2 focus-within:ring-[#5932EA]/20 focus-within:border-[#5932EA] transition disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div class="mt-3.5 flex items-center justify-between gap-3 flex-wrap">
            <span class="text-[11px] text-slate-400">
              Puedes volver a calificar o corregir la nota cuando quieras. Vaciar la nota pone la
              entrega en "entregado".
            </span>
            <div class="flex items-center gap-2">
              {/* Bloqueo individual de la entrega (solo si hay entrega) */}
              {submission && (
                <button
                  onClick={toggleLocked}
                  title={activityLocked ? "La actividad completa ya está bloqueada" : undefined}
                  class={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    submission.locked
                      ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200/80"
                      : "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200/80"
                  }`}
                >
                  <span>{submission.locked ? "🔓" : "🔒"}</span>
                  <span>{submission.locked ? "Desbloquear entrega" : "Bloquear edición"}</span>
                </button>
              )}
              <button
                onClick={onClose}
                class="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Volver
              </button>
              <button
                onClick={handleSubmit}
                disabled={!submission}
                class="px-5 py-2.5 rounded-xl bg-[#5932EA] hover:bg-[#4E2AD0] text-white text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Guardar calificación
              </button>
            </div>
          </div>

          {activityLocked && (
            <p class="text-[11px] text-amber-700 mt-2.5 font-medium">
              🔒 Actividad bloqueada: todas las entregas de esta actividad son de solo lectura para
              los estudiantes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Fila de un estudiante en el modo revisión del profesor */
function StudentReviewRow({
  student,
  activity,
  submission,
  onSaved,
}: {
  student: User;
  activity: Activity;
  submission?: ActivitySubmission;
  onSaved: (sub: ActivitySubmission) => void;
}) {
  const [reviewing, setReviewing] = useState(false);
  const hasContent = Boolean(submission?.content?.trim());

  return (
    <div class="border border-slate-200/90 rounded-2xl p-4 bg-slate-50/50">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center text-xs font-bold shrink-0">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-800 truncate">{student.name}</p>
            <p class="text-[11px] text-slate-400 font-mono">{student.codigo || student.email}</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          <StatusBadge sub={submission} />
          {submission ? (
            <button
              onClick={() => setReviewing(true)}
              class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#5932EA] hover:bg-[#4E2AD0] transition-all cursor-pointer shrink-0 shadow-sm flex items-center gap-1.5"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {hasContent ? "Leer y calificar" : "Revisar entrega"}
            </button>
          ) : (
            <span class="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 bg-white border border-slate-200/90 shrink-0">
              Sin entrega
            </span>
          )}
        </div>
      </div>

      {reviewing && (
        <ReviewPanel
          student={student}
          activity={activity}
          submission={submission}
          onClose={() => setReviewing(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

export default function SubmissionModal({
  activity,
  mode,
  session,
  submissions,
  students,
  onClose,
  onSaved,
}: Props) {
  const isStudent = mode === "student";
  const mySub = submissions.find((s) => s.activityId === activity.id && s.studentId === session.userId);
  const actSubs = submissions.filter((s) => s.activityId === activity.id);
  const graded = actSubs.filter((s) => s.status === "calificado").length;

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal */}
      <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div class="px-6 py-5 border-b border-slate-100 bg-white">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex items-center gap-2.5 flex-wrap">
                <h3 class="text-lg font-bold text-slate-900 leading-tight truncate">
                  {activity.title}
                </h3>
                <span
                  class={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    activity.type === "tarea"
                      ? "bg-indigo-50 border-indigo-200/80 text-indigo-700"
                      : activity.type === "evaluacion"
                        ? "bg-amber-50 border-amber-200/80 text-amber-700"
                        : "bg-purple-50 border-purple-200/80 text-purple-700"
                  }`}
                >
                  {activity.type}
                </span>
                {activity.sintaxia && (
                  <a
                    href={sintaxiaToolHref(activity.sintaxia)}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir la actividad de SintaxIA vinculada (pestaña nueva)"
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-[#EDE9FE] border-[#DDD6FE] text-[#6D28D9] hover:bg-[#DDD6FE] transition cursor-pointer"
                  >
                    <span>✨</span>
                    <span>SintaxIA Tool</span>
                  </a>
                )}
              </div>
              <p class="text-xs text-slate-500 mt-1">
                {isStudent
                  ? "Escribe tu entrega en texto y envíala a tu profesor."
                  : `Entregas: ${actSubs.length} de ${students.length} estudiantes · ${graded} calificadas`}
              </p>
            </div>
            <button
              onClick={onClose}
              class="text-slate-400 hover:text-slate-700 transition p-1 cursor-pointer shrink-0"
              aria-label="Cerrar"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {isStudent ? (
          <StudentForm activity={activity} studentId={session.userId} submission={mySub} onSaved={onSaved} />
        ) : (
          <div class="overflow-y-auto p-4 sm:p-6 space-y-3">
            {students.length === 0 ? (
              <p class="text-sm text-slate-400 text-center py-10">
                No hay estudiantes matriculados en este curso.
              </p>
            ) : (
              students.map((st) => (
                <StudentReviewRow
                  key={st.id}
                  student={st}
                  activity={activity}
                  submission={actSubs.find((s) => s.studentId === st.id)}
                  onSaved={onSaved}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Formulario de entrega del estudiante */
function StudentForm({
  activity,
  studentId,
  submission,
  onSaved,
}: {
  activity: Activity;
  studentId: string;
  submission?: ActivitySubmission;
  onSaved: (sub: ActivitySubmission) => void;
}) {
  const [text, setText] = useState<string>(submission?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Bloqueo efectivo: por actividad (profesor) o de esta entrega concreta
  const locked = Boolean(activity.locked) || Boolean(submission?.locked);

  const handleSubmit = async () => {
    if (!text.trim()) {
      setMsg({ type: "error", text: "Escribe tu entrega antes de enviar." });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    setSaving(true);
    const previouslyGraded = submission?.status === "calificado" && submission?.score !== undefined;
    // Reenviar siempre está permitido; si ya estaba calificada se conserva la nota
    // anterior (visible) y la entrega vuelve a quedar como "entregada" para revisión.
    const res = await saveSubmission({
      id: submission?.id,
      activityId: activity.id,
      courseId: activity.courseId,
      studentId,
      status: "entregado",
      submittedAt: new Date().toISOString(),
      content: text.trim(),
      score: submission?.score,
      maxScore: submission?.maxScore ?? 100,
      feedback: submission?.feedback,
    });
    setSaving(false);
    setMsg({
      type: "success",
      text: previouslyGraded
        ? `Entrega reenviada (nota anterior: ${submission?.score}/100). Tu profesor puede revisarla de nuevo.`
        : "Entrega enviada. Tu profesor ya puede revisarla.",
    });
    onSaved(res.submission);
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <div class="overflow-y-auto p-4 sm:p-6">
      {/* SintaxIA Tools: acceso directo al caso vinculado (estudiante) */}
      {activity.sintaxia && (
        <a
          href={sintaxiaToolHref(activity.sintaxia)}
          target="_blank"
          rel="noreferrer"
          class="block rounded-2xl border border-[#5932EA]/25 bg-[#5932EA]/[0.05] p-4 mb-4 transition hover:bg-[#5932EA]/[0.09] cursor-pointer group"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-9 h-9 rounded-xl bg-[#5932EA] text-white flex items-center justify-center shrink-0">
                <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
                  <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
                </svg>
              </span>
              <div class="min-w-0">
                <p class="text-sm font-bold text-[#5932EA] leading-tight">
                  Abre la actividad de SintaxIA
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5 truncate">
                  Resuélvela en la pestaña nueva y luego describe tu resultado en el campo de entrega.
                </p>
              </div>
            </div>
            <span class="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white bg-[#5932EA] group-hover:bg-[#4E2AD0] transition shrink-0">
              Abrir
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </span>
          </div>
        </a>
      )}

      {/* Instrucciones de la actividad */}
      {activity.description && (
        <div class="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 mb-5">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Instrucciones
          </p>
          <p class="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {activity.description}
          </p>
          <p class="text-[11px] text-slate-400 mt-2 font-medium">
            Creada: {new Date(activity.createdAt).toLocaleDateString("es-CO")}
            {activity.dueDate && ` · Vence: ${new Date(activity.dueDate).toLocaleDateString("es-CO")}`}
          </p>
        </div>
      )}

      {/* Estado de mi entrega */}
      <div class="flex items-center gap-2 mb-3">
        <StatusBadge sub={submission} />
        {submission?.submittedAt && (
          <span class="text-[11px] text-slate-400 font-medium">
            Última entrega: {new Date(submission.submittedAt).toLocaleString("es-CO")}
          </span>
        )}
      </div>

      {submission?.status === "calificado" && (
        <div class="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 mb-4">
          <p class="text-sm font-bold text-emerald-800">
            Nota: {submission.score ?? "—"} / {submission.maxScore}
          </p>
          {submission.feedback && (
            <p class="text-xs text-emerald-700 mt-1.5 leading-relaxed whitespace-pre-wrap">
              {submission.feedback}
            </p>
          )}
        </div>
      )}

      {/* Entrega modificada tras una calificación previa */}
      {submission && submission.status !== "calificado" && submission.score !== undefined && (
        <div class="rounded-2xl border border-sky-200/80 bg-sky-50/60 p-4 mb-4">
          <p class="text-sm font-bold text-sky-800">Nota anterior: {submission.score} / {submission.maxScore}</p>
          {submission.feedback && (
            <p class="text-xs text-sky-700 mt-1.5 leading-relaxed whitespace-pre-wrap">
              {submission.feedback}
            </p>
          )}
          <p class="text-[11px] text-sky-600 mt-2 font-medium">
            Tu entrega fue modificada después de esta calificación: tu profesor puede revisarla y
            ajustar la nota.
          </p>
        </div>
      )}

      {/* Banner de bloqueo por el profesor */}
      {locked && (
        <div class="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 mb-4 flex items-start gap-2.5">
          <span class="text-base shrink-0">🔒</span>
          <div>
            <p class="text-sm font-bold text-amber-800">Entrega bloqueada</p>
            <p class="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Tu profesor bloqueó esta entrega: no puedes editarla en este momento.
            </p>
          </div>
        </div>
      )}

      <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
        Tu entrega (texto)
      </label>
      <textarea
        placeholder="Escribe aquí tu desarrollo, conclusión o respuesta de la actividad…"
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        rows={7}
        disabled={locked}
        class="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none resize-y min-h-[140px] focus-within:ring-2 focus-within:ring-[#5932EA]/20 focus-within:border-[#5932EA] transition disabled:opacity-60 disabled:cursor-not-allowed"
      />

      <div class="mt-4 flex items-center justify-between gap-3 flex-wrap">
        {msg ? (
          <span
            class={`text-xs font-medium ${
              msg.type === "success" ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {msg.type === "success" ? "✓" : "⚠"} {msg.text}
          </span>
        ) : (
          <span class="text-[11px] text-slate-400">
            {locked
              ? "Entrega bloqueada por el profesor."
              : submission
                ? "Puedes editar y reenviar tu entrega las veces que necesites."
                : "Aún no has entregado esta actividad."}
          </span>
        )}
        {!locked && (
          <button
            onClick={handleSubmit}
            disabled={saving}
            class="px-6 py-2.5 rounded-xl bg-[#5932EA] hover:bg-[#4E2AD0] text-white text-sm font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>↑</span>
            <span>{saving ? "Enviando…" : submission ? "Guardar cambios" : "Entregar"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
