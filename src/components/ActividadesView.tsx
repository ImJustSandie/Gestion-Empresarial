import { useEffect, useState } from "preact/hooks";
import { initAuth, getSession, type Session } from "../utils/auth";
import { initCourses, getCoursesForUser, getActivities, createActivity, deleteActivity, type Course, type Activity } from "../utils/courses";

export default function ActividadesView() {
  const [session, setSession] = useState<Session | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<Activity["type"]>("tarea");
  const [dueDate, setDueDate] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const refresh = async (cs?: Course[]) => {
    const list = cs ?? courses;
    const acts = await getActivities();
    // filtrar solo actividades de cursos asignados (o todos si admin)
    setActivities(acts.filter((a) => list.some((c) => c.id === a.courseId) || list.length === 0));
  };

  useEffect(() => {
    (async () => {
      await initAuth();
      await initCourses();
      const s = getSession();
      if (!s) { window.location.href = "/"; return; }
      setSession(s);
      if (s.role === "sin_asignar") { setLoading(false); return; }
      const cs = await getCoursesForUser(s.userId, s.role);
      setCourses(cs);
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
    const res = await createActivity({ courseId: selectedCourse, title, description: desc, type, dueDate: dueDate || undefined, createdBy: session.userId });
    setMsg({ type: res.success ? "success" : "error", text: res.message });
    if (res.success) {
      setTitle(""); setDesc(""); setDueDate("");
      await refresh();
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar actividad?")) return;
    await deleteActivity(id);
    await refresh();
  };

  if (loading) return <div class="container mx-auto px-4 py-10"><div class="animate-pulse h-32 bg-gray-100 rounded-xl" /></div>;
  if (!session) return null;

  if (session.role === "sin_asignar") {
    return (
      <div class="container mx-auto px-4 py-8">
        <div class="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <p class="text-2xl">⏳</p><h2 class="font-bold text-amber-800 mt-2">Cuenta sin asignar</h2>
          <p class="text-sm text-amber-700 mt-1">Debes ser asignado a un curso por un administrador.</p>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div class="container mx-auto px-4 py-8">
        <div class="bg-white border rounded-2xl p-8 text-center">
          <p class="text-3xl">📝</p><h2 class="font-bold mt-2">Sin cursos asignados</h2>
          <p class="text-sm text-gray-600 mt-1">Un administrador debe asignarte a un curso desde <span class="font-mono">/admin → Cursos</span>.</p>
          <a href="/ensenanza" class="inline-block mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm">Ir a Enseñanza</a>
        </div>
      </div>
    );
  }

  const filteredActs = selectedCourse ? activities.filter((a) => a.courseId === selectedCourse) : activities;

  return (
    <div class="container mx-auto px-4 py-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 class="text-3xl font-bold">Cursos / Actividades</h1>
          <p class="text-sm text-gray-600">{session.role === "profesor" ? "Gestiona actividades de tus cursos" : "Actividades de tus cursos"} • {session.name} ({session.role})</p>
        </div>
        <a href="/ensenanza" class="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-gray-50">← Enseñanza</a>
      </div>

      <div class="bg-white border rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div class="flex-1">
          <label class="text-xs font-semibold text-gray-600">Curso activo</label>
          <select value={selectedCourse} onChange={(e) => setSelectedCourse((e.target as HTMLSelectElement).value)} class="mt-1 w-full px-4 py-2.5 rounded-xl border bg-white text-sm">
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
        </div>
        <div class="text-xs text-gray-500 self-end pb-2">{courses.find((c) => c.id === selectedCourse)?.description ?? ""}</div>
      </div>

      {msg && <div class={`mb-4 p-3 rounded-xl text-sm border ${msg.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>{msg.text}</div>}

      {(session.role === "profesor" || session.role === "admin") && (
        <form onSubmit={handleCreate} class="bg-white border rounded-2xl p-6 mb-6">
          <h3 class="font-semibold">Crear actividad</h3>
          <p class="text-xs text-gray-500 mb-3">Solo profesores (y admin) pueden crear. Se guardará en JSON local (IndexedDB).</p>
          <div class="grid sm:grid-cols-2 gap-3">
            <input placeholder="Título" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} required class="px-4 py-2.5 rounded-xl border text-sm" />
            <select value={type} onChange={(e) => setType((e.target as HTMLSelectElement).value as any)} class="px-4 py-2.5 rounded-xl border bg-white text-sm">
              <option value="tarea">Tarea</option>
              <option value="actividad">Actividad</option>
              <option value="evaluacion">Evaluación</option>
            </select>
          </div>
          <textarea placeholder="Descripción" value={desc} onInput={(e) => setDesc((e.target as HTMLTextAreaElement).value)} rows={2} class="mt-3 w-full px-4 py-2.5 rounded-xl border text-sm" />
          <div class="mt-3 flex gap-3">
            <input type="date" value={dueDate} onInput={(e) => setDueDate((e.target as HTMLInputElement).value)} class="px-4 py-2.5 rounded-xl border text-sm" />
            <button type="submit" class="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">+ Crear</button>
          </div>
        </form>
      )}

      {session.role === "estudiante" && (
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-6 text-sm text-emerald-800">Vista de estudiante: solo lectura. Tus profesores publican actividades aquí.</div>
      )}

      <div class="bg-white border rounded-xl overflow-hidden">
        <div class="px-6 py-4 border-b bg-gray-50 flex justify-between"><h3 class="font-semibold">Actividades ({filteredActs.length})</h3><span class="text-xs text-gray-500">{courses.find((c) => c.id === selectedCourse)?.code}</span></div>
        {filteredActs.length === 0 ? <p class="p-8 text-center text-sm text-gray-400">No hay actividades para este curso.</p> : (
          <div class="divide-y">
            {filteredActs.map((act) => (
              <div key={act.id} class="p-4 flex justify-between gap-3 hover:bg-gray-50">
                <div>
                  <p class="font-medium text-sm">{act.title} <span class="ml-2 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border bg-white">{act.type}</span></p>
                  {act.description && <p class="text-xs text-gray-600 mt-1">{act.description}</p>}
                  <p class="text-xs text-gray-400 mt-1">Creada {new Date(act.createdAt).toLocaleDateString("es-CO")} {act.dueDate && `• Vence ${new Date(act.dueDate).toLocaleDateString("es-CO")}`}</p>
                </div>
                {(session.role === "profesor" || session.role === "admin") && <button onClick={() => handleDelete(act.id)} class="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs h-fit">Eliminar</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
