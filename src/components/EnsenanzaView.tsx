import { useEffect, useState } from "preact/hooks";
import { initAuth, getSession, type Session } from "../utils/auth";
import { initCourses, getCoursesForUser, getActivities, type Course, type Activity } from "../utils/courses";

export default function EnsenanzaView() {
  const [session, setSession] = useState<Session | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

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
      const acts = await getActivities();
      setActivities(acts.filter((a) => cs.some((c) => c.id === a.courseId)));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div class="container mx-auto px-4 py-10"><div class="animate-pulse h-32 bg-gray-100 rounded-xl" /></div>;
  if (!session) return null;

  if (session.role === "sin_asignar") {
    return (
      <div class="container mx-auto px-4 py-8">
        <div class="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <p class="text-2xl">⏳</p>
          <h2 class="font-bold text-amber-800 mt-2">Cuenta sin asignar</h2>
          <p class="text-sm text-amber-700 mt-1">Un administrador debe asignarte rol (Estudiante/Profesor) y un curso. Contacta a <span class="font-mono">administracion@sintaxia.com</span>.</p>
          <a href="/" class="inline-block mt-4 px-6 py-2 rounded-xl bg-amber-600 text-white text-sm">Volver al inicio</a>
        </div>
      </div>
    );
  }

  if (session.role === "admin") {
    return (
      <div class="container mx-auto px-4 py-8">
        <div class="bg-white border rounded-2xl p-8">
          <h1 class="text-2xl font-bold">Módulo de Enseñanza</h1>
          <p class="text-sm text-gray-600 mt-2">Como administrador, gestiona cursos y usuarios desde <a href="/admin" class="text-indigo-600 underline">/admin</a>. Este módulo es la vista por defecto para <b>Estudiantes</b>.</p>
          <div class="mt-4 grid gap-3">
            {courses.length === 0 ? <p class="text-sm text-gray-500">No hay cursos creados aún.</p> : courses.map((c) => (
              <div key={c.id} class="border rounded-xl p-4 flex justify-between"><div><p class="font-mono text-xs font-bold">{c.code}</p><p class="font-medium">{c.name}</p><p class="text-xs text-gray-500">{c.profesorIds.length} prof. • {c.estudianteIds.length} est.</p></div><a href="/actividades" class="text-sm text-indigo-600">→ Cursos/Actividades</a></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div class="container mx-auto px-4 py-8">
        <div class="bg-white border rounded-2xl p-8 text-center">
          <p class="text-3xl">📚</p>
          <h2 class="font-bold mt-2">Sin cursos asignados</h2>
          <p class="text-sm text-gray-600 mt-1">Aún no estás asignado a ningún curso. Un administrador debe asignarte desde el panel de administración.</p>
          <p class="text-xs text-gray-400 mt-2">Tu rol: <span class="font-semibold">{session.role}</span> • {session.email}</p>
          <div class="mt-4 flex justify-center gap-2">
            <a href="/actividades" class="px-4 py-2 rounded-xl border text-sm">Ir a Cursos / Actividades</a>
            <a href="/dashboard" class="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm">Dashboard</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="container mx-auto px-4 py-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 class="text-3xl font-bold">Módulo de Enseñanza</h1>
          <p class="text-sm text-gray-600">Bienvenido, <span class="font-semibold">{session.name}</span> • {session.role === "estudiante" ? "Vista de estudiante" : "Vista de profesor"} • {courses.length} curso(s) asignado(s)</p>
        </div>
        <a href="/actividades" class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">Cursos / Actividades →</a>
      </div>

      <div class="grid gap-6">
        {courses.map((course) => {
          const courseActs = activities.filter((a) => a.courseId === course.id);
          return (
            <div key={course.id} class="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div class="p-6 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <span class="px-2.5 py-1 bg-gray-900 text-white rounded-lg text-xs font-mono font-bold">{course.code}</span>
                    <h3 class="text-xl font-bold mt-2">{course.name}</h3>
                    {course.description && <p class="text-sm text-gray-600 mt-1">{course.description}</p>}
                  </div>
                  <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white border">{courseActs.length} activ.</span>
                </div>
              </div>
              <div class="p-6">
                <p class="text-sm font-semibold text-gray-700 mb-3">Actividades del curso</p>
                {courseActs.length === 0 ? <p class="text-sm text-gray-400 bg-gray-50 border rounded-xl p-4 text-center">No hay actividades aún. {session.role === "profesor" ? "Créalas desde Cursos / Actividades." : "Tu profesor las publicará aquí."}</p> :
                  <div class="grid gap-3">
                    {courseActs.map((act) => (
                      <div key={act.id} class="border rounded-xl p-4 flex justify-between gap-3 hover:bg-gray-50">
                        <div>
                          <p class="font-medium text-sm">{act.title} <span class="ml-2 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border bg-white">{act.type}</span></p>
                          {act.description && <p class="text-xs text-gray-600 mt-1">{act.description}</p>}
                          <p class="text-xs text-gray-400 mt-1">{new Date(act.createdAt).toLocaleDateString("es-CO")} {act.dueDate && `• Entrega: ${new Date(act.dueDate).toLocaleDateString("es-CO")}`}</p>
                        </div>
                      </div>
                    ))}
                  </div>}
                <div class="mt-4 flex gap-2">
                  <a href="/actividades" class="text-sm text-indigo-600 hover:underline">Gestionar en Cursos / Actividades →</a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
