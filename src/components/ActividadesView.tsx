import { useEffect, useState } from "preact/hooks";
import { initAuth, getSession, getUsersAsync, type Session, type User } from "../utils/auth";
import {
  initCourses,
  getCoursesForUser,
  getActivities,
  getSubmissions,
  setActivityLock,
  createActivity,
  deleteActivity,
  sintaxiaToolHref,
  type Course,
  type Activity,
  type ActivitySubmission,
  type SintaxiaToolRef,
} from "../utils/courses";
import { MODULOS_ACTIVIDADES, TIPOS_ACTIVIDADES, type TipoActividad } from "../utils/alfabetizacionActividades";
import SelectMenu from "./SelectMenu";
import SubmissionModal, { type SubmissionModalMode } from "./SubmissionModal";

export default function ActividadesView() {
  const [session, setSession] = useState<Session | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState<{ activity: Activity; mode: SubmissionModalMode } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<Activity["type"]>("tarea");
  const [dueDate, setDueDate] = useState("");
  const [sintaxiaOpen, setSintaxiaOpen] = useState(false);
  const [sintaxiaTipo, setSintaxiaTipo] = useState<TipoActividad | null>(null);
  const [sintaxiaSlug, setSintaxiaSlug] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const refresh = async (cs?: Course[]) => {
    const list = cs ?? courses;
    const acts = await getActivities();
    setActivities(acts.filter((a) => list.some((c) => c.id === a.courseId) || list.length === 0));
  };

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
      if (s.role === "sin_asignar") {
        setLoading(false);
        return;
      }
      const [cs, subs, us] = await Promise.all([
        getCoursesForUser(s.userId, s.role),
        getSubmissions(),
        getUsersAsync(),
      ]);
      setCourses(cs);
      setSubmissions(subs);
      setUsers(us);
      if (cs.length > 0) setSelectedCourse(cs[0].id);
      const acts = await getActivities();
      setActivities(acts.filter((a) => cs.some((c) => c.id === a.courseId)));
      setLoading(false);
    })();
  }, []);

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    if (!session || !selectedCourse) return;
    if (session.role !== "profesor" && session.role !== "admin") {
      setMsg({ type: "error", text: "Solo profesores y administradores pueden crear actividades." });
      return;
    }
    const res = await createActivity({
      courseId: selectedCourse,
      title,
      description: desc,
      type,
      dueDate: dueDate || undefined,
      sintaxia: sintaxiaTipo
        ? { tipo: sintaxiaTipo, slug: sintaxiaSlug || undefined }
        : undefined,
      createdBy: session.userId,
    });
    setMsg({ type: res.success ? "success" : "error", text: res.message });
    if (res.success) {
      setTitle("");
      setDesc("");
      setDueDate("");
      setSintaxiaTipo(null);
      setSintaxiaSlug("");
      await refresh();
    }
    setTimeout(() => setMsg(null), 3500);
  };

  /** Etiqueta legible de una herramienta SintaxIA vinculada (tipo único en alfabetizacionActividades) */
  const sintaxiaLabel = (ref: SintaxiaToolRef): string => {
    if (ref.slug) {
      const caso = MODULOS_ACTIVIDADES.find((m) => m.tipo === ref.tipo && m.slug === ref.slug);
      return caso ? caso.titulo : "Caso SintaxIA";
    }
    const tipo = TIPOS_ACTIVIDADES.find((t) => t.tipo === ref.tipo);
    return tipo ? `${tipo.titulo} (al azar)` : "SintaxIA Tool";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta actividad?")) return;
    await deleteActivity(id);
    await refresh();
  };

  /** Bloquear/desbloquear edición de entregas de la actividad (profesor) */
  const handleToggleLock = async (act: Activity) => {
    const res = await setActivityLock(act.id, !act.locked);
    setMsg({ type: res.success ? "success" : "error", text: res.message });
    if (res.success) {
      setActivities((prev) => prev.map((a) => (a.id === act.id ? { ...a, locked: !act.locked } : a)));
    }
    setTimeout(() => setMsg(null), 3500);
  };

  if (loading) {
    return (
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="animate-pulse space-y-5">
          <div class="h-8 w-64 bg-slate-200 rounded-xl" />
          <div class="h-4 w-80 bg-slate-100 rounded-lg" />
          <div class="h-24 bg-slate-100 rounded-2xl" />
          <div class="h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (session.role === "sin_asignar") {
    return (
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div class="bg-amber-50 border border-amber-200 rounded-3xl p-8 sm:p-10 text-center shadow-xs">
          <div class="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl mx-auto mb-3">
            ⏳
          </div>
          <h2 class="text-xl font-bold text-amber-900">Cuenta sin asignar</h2>
          <p class="text-sm text-amber-700 mt-2 max-w-md mx-auto leading-relaxed">
            Tu cuenta aún no tiene un rol o curso asignado. Contacta a un administrador para que active tus permisos.
          </p>
          <a
            href="/"
            class="inline-block mt-5 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition shadow-sm"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div class="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center shadow-xs">
          <div class="w-16 h-16 rounded-2xl bg-indigo-50 text-[#6C5CE7] flex items-center justify-center text-3xl mx-auto mb-4">
            📚
          </div>
          <h2 class="text-xl font-bold text-slate-900 mb-2">Sin cursos asignados</h2>
          <p class="text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
            Aún no estás asignado a ningún curso. Un administrador debe asignarte desde el panel de administración.
          </p>
          <div class="flex items-center justify-center gap-3">
            <a
              href="/ensenanza"
              class="px-5 py-2.5 rounded-xl bg-[#5932EA] hover:bg-[#4E2AD0] text-white text-sm font-semibold transition shadow-sm"
            >
              Ir a Enseñanza
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* Curso activo y actividades filtradas */
  const currentCourse = courses.find((c) => c.id === selectedCourse) || courses[0];
  const filteredActs = selectedCourse ? activities.filter((a) => a.courseId === selectedCourse) : activities;
  const enrolledStudents = users.filter((u) => currentCourse?.estudianteIds.includes(u.id));
  const isStudentRole = session?.role === "estudiante";
  const isTeacherRole = session?.role === "profesor" || session?.role === "admin";

  /** Actualiza una entrega en el estado local (tras guardar en el modal) */
  const applySavedSubmission = (sub: ActivitySubmission) => {
    setSubmissions((prev) => [
      ...prev.filter((s) => !(s.activityId === sub.activityId && s.studentId === sub.studentId)),
      sub,
    ]);
  };

  return (
    <div class="relative w-full overflow-hidden min-h-[calc(100vh-160px)]">
      {/* Decoración de constelación/red izquierda */}
      <div class="absolute -left-6 top-10 sm:left-2 sm:top-14 w-44 h-72 pointer-events-none select-none opacity-40 z-0">
        <svg viewBox="0 0 160 260" fill="none" class="w-full h-full stroke-[#7C5CE9]/40">
          <circle cx="25" cy="40" r="3.5" fill="#7C5CE9" />
          <circle cx="85" cy="20" r="2.5" fill="#7C5CE9" />
          <circle cx="55" cy="95" r="3.5" fill="#7C5CE9" />
          <circle cx="125" cy="85" r="2.5" fill="#7C5CE9" />
          <circle cx="35" cy="160" r="3" fill="#7C5CE9" />
          <circle cx="95" cy="175" r="2.5" fill="#7C5CE9" />
          <circle cx="145" cy="150" r="2.5" fill="#7C5CE9" />
          <line x1="25" y1="40" x2="85" y2="20" stroke-width="1.2" />
          <line x1="25" y1="40" x2="55" y2="95" stroke-width="1.2" />
          <line x1="85" y1="20" x2="125" y2="85" stroke-width="1.2" />
          <line x1="55" y1="95" x2="125" y2="85" stroke-width="1.2" />
          <line x1="55" y1="95" x2="35" y2="160" stroke-width="1.2" />
          <line x1="55" y1="95" x2="95" y2="175" stroke-width="1.2" />
          <line x1="35" y1="160" x2="95" y2="175" stroke-width="1.2" />
          <line x1="95" y1="175" x2="145" y2="150" stroke-width="1.2" />
          <line x1="125" y1="85" x2="145" y2="150" stroke-width="1.2" />
        </svg>
      </div>

      {/* Decoración de constelación/red derecha */}
      <div class="absolute -right-6 bottom-16 sm:right-2 sm:bottom-20 w-44 h-72 pointer-events-none select-none opacity-40 z-0">
        <svg viewBox="0 0 160 260" fill="none" class="w-full h-full stroke-[#7C5CE9]/40">
          <circle cx="45" cy="65" r="2.5" fill="#7C5CE9" />
          <circle cx="115" cy="35" r="3.5" fill="#7C5CE9" />
          <circle cx="135" cy="110" r="2.5" fill="#7C5CE9" />
          <circle cx="75" cy="130" r="3.5" fill="#7C5CE9" />
          <circle cx="145" cy="180" r="2.5" fill="#7C5CE9" />
          <circle cx="65" cy="205" r="3" fill="#7C5CE9" />
          <line x1="45" y1="65" x2="115" y2="35" stroke-width="1.2" />
          <line x1="115" y1="35" x2="135" y2="110" stroke-width="1.2" />
          <line x1="45" y1="65" x2="75" y2="130" stroke-width="1.2" />
          <line x1="135" y1="110" x2="75" y2="130" stroke-width="1.2" />
          <line x1="75" y1="130" x2="65" y2="205" stroke-width="1.2" />
          <line x1="135" y1="110" x2="145" y2="180" stroke-width="1.2" />
          <line x1="65" y1="205" x2="145" y2="180" stroke-width="1.2" />
        </svg>
      </div>

      {/* Contenido principal centrado */}
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Encabezado: Título y Botón Enseñanza */}
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <h1 class="text-3xl sm:text-[34px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
              Cursos / Actividades
            </h1>
            <p class="text-sm text-slate-500 font-normal mt-1.5">
              Actividades de tus cursos · {session.name} ({session.role})
            </p>
          </div>
          <a
            href="/ensenanza"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold shadow-2xs transition-all w-fit self-start sm:self-auto cursor-pointer"
          >
            <span>←</span>
            <span>Enseñanza</span>
          </a>
        </div>

        {/* Tarjeta 1: Curso activo */}
        <div class="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] mb-6">
          <label class="block text-xs font-semibold text-slate-500 mb-2">
            Curso activo
          </label>
          <SelectMenu
            ariaLabel="Seleccionar curso activo"
            wrapperClass="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-[#5932EA]/20 focus-within:border-[#5932EA] transition"
            icon={
              <svg
                class="w-5 h-5 text-slate-600 shrink-0 mr-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            }
            options={courses.map((c) => ({ value: c.id, label: c.name, meta: c.code }))}
            value={selectedCourse}
            onChange={setSelectedCourse}
            placeholder="Selecciona un curso"
          />
        </div>

        {/* Mensajes de notificación */}
        {msg && (
          <div
            class={`mb-6 p-4 rounded-xl text-sm font-medium border flex items-center justify-between transition-all shadow-xs ${
              msg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div class="flex items-center gap-2.5">
              <span class="text-base">{msg.type === "success" ? "✓" : "⚠"}</span>
              <span>{msg.text}</span>
            </div>
            <button
              onClick={() => setMsg(null)}
              class="text-xs opacity-60 hover:opacity-100 cursor-pointer p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tarjeta 2: Crear actividad (Profesores y Admin) */}
        {(session.role === "profesor" || session.role === "admin") && (
          <form
            onSubmit={handleCreate}
            class="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] mb-6"
          >
            <h2 class="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Crear actividad
            </h2>
            <p class="text-xs text-slate-400 mt-1 mb-5">
              Solo profesores (y admin) pueden crear actividades.
            </p>

            {/* Fila 1: Título y Tipo */}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Input Título con ícono 'T' */}
              <div class="relative flex items-center rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#5932EA]/20 focus-within:border-[#5932EA] transition">
                <svg
                  class="w-4 h-4 text-slate-400 shrink-0 mr-2.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="4 7 4 4 20 4 20 7" />
                  <line x1="9" y1="20" x2="15" y2="20" />
                  <line x1="12" y1="4" x2="12" y2="20" />
                </svg>
                <input
                  type="text"
                  placeholder="Título"
                  value={title}
                  onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
                  required
                  class="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
                />
              </div>

              {/* Select Tipo con ícono de lista */}
              <SelectMenu
                ariaLabel="Tipo de actividad"
                wrapperClass="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#5932EA]/20 focus-within:border-[#5932EA] transition"
                textClass="text-sm font-medium text-slate-800"
                icon={
                  <svg
                    class="w-4 h-4 text-slate-400 shrink-0 mr-2.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                }
                options={[
                  { value: "tarea", label: "Tarea" },
                  { value: "actividad", label: "Actividad" },
                  { value: "evaluacion", label: "Evaluación" },
                ]}
                value={type}
                onChange={(v) => setType(v as Activity["type"])}
              />
            </div>

            {/* Fila 2: Textarea Descripción con ícono de documento */}
            <div class="relative rounded-xl border border-slate-200/90 bg-white p-3.5 mt-4 flex items-start gap-2.5 focus-within:ring-2 focus-within:ring-[#5932EA]/20 focus-within:border-[#5932EA] transition">
              <svg
                class="w-4 h-4 text-slate-400 shrink-0 mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <textarea
                placeholder="Descripción"
                value={desc}
                onInput={(e) => setDesc((e.target as HTMLTextAreaElement).value)}
                rows={3}
                class="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none resize-y min-h-[75px]"
              />
            </div>

            {/* Fila 2.5: SintaxIA Tools (vincular caso de alfabetización) */}
            <div class="mt-4 rounded-2xl border border-[#5932EA]/20 bg-[#5932EA]/[0.04] overflow-hidden">
              <button
                type="button"
                onClick={() => setSintaxiaOpen((v) => !v)}
                class="w-full px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer text-left transition hover:bg-[#5932EA]/[0.07]"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <span class="w-9 h-9 rounded-xl bg-[#5932EA] text-white flex items-center justify-center shrink-0">
                    <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
                      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
                    </svg>
                  </span>
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-[#5932EA] leading-tight">
                      SintaxIA Tools
                      {sintaxiaTipo && (
                        <span class="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold align-middle bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE] uppercase tracking-wider">
                          Vinculada
                        </span>
                      )}
                    </p>
                    <p class="text-[11px] text-slate-500 mt-0.5">
                      Vincula un caso de alfabetización en IA (elegir · detector · prompt lab) a esta actividad.
                    </p>
                  </div>
                </div>
                <svg
                  class={`w-4 h-4 text-[#5932EA] shrink-0 transition-transform ${sintaxiaOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {sintaxiaOpen && (
                <div class="px-4 pb-4 space-y-3">
                  {/* Paso 1: elegir tipo de herramienta */}
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {TIPOS_ACTIVIDADES.map((t) => {
                      const activo = sintaxiaTipo === t.tipo;
                      const nCasos = MODULOS_ACTIVIDADES.filter((m) => m.tipo === t.tipo).length;
                      return (
                        <button
                          type="button"
                          key={t.tipo}
                          onClick={() => {
                            // toggle: clic de nuevo desvincula
                            if (activo) {
                              setSintaxiaTipo(null);
                              setSintaxiaSlug("");
                            } else {
                              setSintaxiaTipo(t.tipo);
                              setSintaxiaSlug("");
                            }
                          }}
                          class={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition cursor-pointer ${
                            activo
                              ? "border-[#5932EA] bg-[#5932EA]/10 ring-1 ring-[#5932EA]/40"
                              : "border-slate-200/90 bg-white hover:border-[#7C5CE9]"
                          }`}
                        >
                          <span class="text-lg shrink-0">{t.icono}</span>
                          <span class="min-w-0">
                            <span class={`block text-xs font-bold truncate ${activo ? "text-[#5932EA]" : "text-slate-800"}`}>
                              {t.titulo}
                            </span>
                            <span class="block text-[10px] text-slate-400 font-medium">
                              {nCasos} caso{nCasos === 1 ? "" : "s"}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Paso 2: elegir caso concreto del tipo (opcional) */}
                  {sintaxiaTipo && (
                    <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                      <SelectMenu
                        ariaLabel="Caso de SintaxIA"
                        wrapperClass="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#5932EA]/20 focus-within:border-[#5932EA] transition"
                        icon={
                          <svg
                            class="w-4 h-4 text-slate-400 shrink-0 mr-2.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <polygon points="12 2 2 7 12 12 22 7" />
                            <polyline points="2 17 12 22 22 17" />
                            <polyline points="2 12 12 17 22 12" />
                          </svg>
                        }
                        options={[
                          { value: "", label: "Cualquier caso (el estudiante recibe uno al azar)" },
                          ...MODULOS_ACTIVIDADES.filter((m) => m.tipo === sintaxiaTipo).map((m) => ({
                            value: m.slug,
                            label: `Caso ${m.numero} · ${m.titulo}`,
                          })),
                        ]}
                        value={sintaxiaSlug}
                        onChange={setSintaxiaSlug}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSintaxiaTipo(null);
                          setSintaxiaSlug("");
                        }}
                        class="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/90 transition cursor-pointer"
                      >
                        Quitar vínculo
                      </button>
                      <p class="sm:col-span-2 text-[11px] text-slate-400 mt-0.5">
                        Al abrir la actividad, el estudiante podrá entrar directo al caso
                        seleccionado{!sintaxiaSlug && " (o a la portada del tipo para elegir un caso al azar)"}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fila 3: Fecha de entrega + Botón Crear */}
            <div class="mt-4 flex flex-wrap items-center gap-3">
              <div class="relative flex items-center rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#5932EA]/20 focus-within:border-[#5932EA] transition w-48 sm:w-56">
                <svg
                  class="w-4 h-4 text-slate-400 shrink-0 mr-2.5 pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <input
                  type="date"
                  value={dueDate}
                  onInput={(e) => setDueDate((e.target as HTMLInputElement).value)}
                  class="w-full bg-transparent text-sm text-slate-700 outline-none cursor-pointer"
                />
              </div>

              <button
                type="submit"
                class="px-6 py-2.5 rounded-xl bg-[#5932EA] hover:bg-[#4E2AD0] text-white text-sm font-semibold shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>+</span>
                <span>Crear</span>
              </button>
            </div>
          </form>
        )}

        {/* Banner para rol estudiante */}
        {isStudentRole && (
          <div class="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 mb-6 text-xs sm:text-sm text-indigo-900 flex items-center gap-2.5 shadow-xs">
            <svg
              class="w-5 h-5 text-[#5932EA] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>
              Vista de estudiante: revisa las actividades de tus cursos y entrega tu respuesta en
              texto. Tu profesor la revisará y calificará.
            </span>
          </div>
        )}

        {/* Tarjeta 3: Lista de actividades */}
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          {/* Cabecera de la tarjeta */}
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white gap-3">
            <div class="flex items-center gap-2.5 flex-wrap">
              <h3 class="font-bold text-slate-900 text-sm sm:text-base">
                Actividades ({filteredActs.length})
              </h3>
              {isTeacherRole && (() => {
                const pendientes = submissions.filter(
                  (s) => s.courseId === currentCourse?.id && s.status === "entregado"
                ).length;
                return pendientes > 0 ? (
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-sky-50 border-sky-200/80 text-sky-700">
                    {pendientes} por revisar
                  </span>
                ) : null;
              })()}
            </div>
            <span class="text-xs sm:text-sm font-mono font-medium text-slate-400">
              {currentCourse?.code}
            </span>
          </div>

          {/* Cuerpo: Estado vacío o Listado */}
          {filteredActs.length === 0 ? (
            <div class="py-14 sm:py-20 text-center text-sm text-slate-400 font-normal">
              No hay actividades para este curso.
            </div>
          ) : (
            <div class="divide-y divide-slate-100">
              {filteredActs.map((act) => (
                <div
                  key={act.id}
                  class="p-5 sm:px-6 sm:py-5 flex items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2.5 flex-wrap">
                      <h4 class="font-bold text-slate-900 text-sm sm:text-base">
                        {act.title}
                      </h4>
                      <span
                        class={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          act.type === "tarea"
                            ? "bg-indigo-50 border-indigo-200/80 text-indigo-700"
                            : act.type === "evaluacion"
                              ? "bg-amber-50 border-amber-200/80 text-amber-700"
                              : "bg-purple-50 border-purple-200/80 text-purple-700"
                        }`}
                      >
                        {act.type}
                      </span>
                      {(() => {
                        const ref = act.sintaxia;
                        if (!ref) return null;
                        return (
                          <a
                            href={sintaxiaToolHref(ref)}
                            target="_blank"
                            rel="noreferrer"
                            title={`SintaxIA Tool: ${sintaxiaLabel(ref)} (abre en pestaña nueva)`}
                            class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-[#EDE9FE] border-[#DDD6FE] text-[#6D28D9] hover:bg-[#DDD6FE] transition cursor-pointer"
                          >
                            <span class="not-italic">✨</span>
                            <span class="max-w-[180px] truncate">{sintaxiaLabel(ref)}</span>
                            <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                              <line x1="7" y1="17" x2="17" y2="7" />
                              <polyline points="7 7 17 7 17 17" />
                            </svg>
                          </a>
                        );
                      })()}
                    </div>

                    {act.description && (
                      <p class="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                        {act.description}
                      </p>
                    )}

                    <div class="flex items-center gap-2 text-xs text-slate-400 mt-2 font-medium flex-wrap">
                      <span>
                        Creada: {new Date(act.createdAt).toLocaleDateString("es-CO")}
                      </span>
                      {act.dueDate && (
                        <>
                          <span>•</span>
                          <span class="text-slate-500 font-semibold">
                            Vence: {new Date(act.dueDate).toLocaleDateString("es-CO")}
                          </span>
                        </>
                      )}
                      {act.dueDate && (() => {
                        const vencida = new Date(act.dueDate) < new Date(new Date().toDateString());
                        const miSub = isStudentRole
                          ? submissions.find((s) => s.activityId === act.id && s.studentId === session!.userId)
                          : undefined;
                        return vencida && miSub?.status !== "entregado" && miSub?.status !== "calificado" ? (
                          <span class="text-rose-500 font-semibold">• Vencida</span>
                        ) : null;
                      })()}
                      {(() => {
                        const miSub = isStudentRole
                          ? submissions.find((s) => s.activityId === act.id && s.studentId === session!.userId)
                          : undefined;
                        return act.locked || miSub?.locked ? (
                          <span class="text-amber-600 font-semibold">• 🔒 Bloqueada</span>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  <div class="flex flex-col items-end gap-2 shrink-0">
                    {/* Estado de mi entrega (estudiante) */}
                    {isStudentRole && (() => {
                      const miSub = submissions.find((s) => s.activityId === act.id && s.studentId === session!.userId);
                      if (!miSub) return null;
                      return (
                        <span
                          class={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            miSub.status === "calificado"
                              ? "bg-emerald-50 border-emerald-200/80 text-emerald-700"
                              : miSub.status === "entregado"
                                ? "bg-sky-50 border-sky-200/80 text-sky-700"
                                : ""
                          }`}
                        >
                          {miSub.status === "calificado"
                            ? `Calificada · ${miSub.score ?? "—"}/100`
                            : "Entregada"}
                        </span>
                      );
                    })()}

                    <div class="flex items-center gap-2">
                      {/* Botón de entrega / revisión según rol */}
                      {isStudentRole ? (
                        <button
                          onClick={() => setModal({ activity: act, mode: "student" })}
                          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#5932EA] hover:bg-[#4E2AD0] transition-all cursor-pointer shrink-0 shadow-sm"
                        >
                          {submissions.some((s) => s.activityId === act.id && s.studentId === session!.userId)
                            ? "Ver mi entrega"
                            : "Entregar"}
                        </button>
                      ) : (
                        isTeacherRole && (
                          <button
                            onClick={() => setModal({ activity: act, mode: "teacher" })}
                            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#5932EA] bg-[#5932EA]/5 hover:bg-[#5932EA]/10 border border-[#5932EA]/20 transition-all cursor-pointer shrink-0"
                          >
                            Revisar entregas
                          </button>
                        )
                      )}

                      {isTeacherRole && (
                        <button
                          onClick={() => handleToggleLock(act)}
                          title={act.locked ? "Desbloquear edición de entregas" : "Bloquear edición de entregas"}
                          class={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                            act.locked
                              ? "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200/80"
                              : "text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-50 border-slate-200/90"
                          }`}
                        >
                          {act.locked ? "🔓 Desbloquear" : "🔒 Bloquear"}
                        </button>
                      )}

                      {isTeacherRole && (
                        <button
                          onClick={() => handleDelete(act.id)}
                          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition-all cursor-pointer shrink-0"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de entrega / revisión */}
        {modal && (
          <SubmissionModal
            activity={modal.activity}
            course={currentCourse}
            mode={modal.mode}
            session={session}
            submissions={submissions.filter((s) => s.courseId === currentCourse.id)}
            students={enrolledStudents}
            onClose={() => setModal(null)}
            onSaved={applySavedSubmission}
          />
        )}
      </div>
    </div>
  );
}

