import { useEffect, useState, useMemo } from "preact/hooks";
import { initAuth, getSession, type Session } from "../utils/auth";
import { initCourses, getCoursesForUser, getActivities, COURSE_COLORS, type Course, type Activity } from "../utils/courses";

export default function EnsenanzaView() {
  const [session, setSession] = useState<Session | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

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
      const cs = await getCoursesForUser(s.userId, s.role);
      setCourses(cs);
      const acts = await getActivities();
      setActivities(acts.filter((a) => cs.some((c) => c.id === a.courseId)));
      setLoading(false);
    })();
  }, []);

  const filteredCourses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [courses, searchTerm]);

  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const paginatedCourses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCourses.slice(start, start + PAGE_SIZE);
  }, [filteredCourses, page]);

  if (loading) {
    return (
      <div class="w-full px-6 sm:px-10 lg:px-14 py-12">
        <div class="animate-pulse space-y-4">
          <div class="h-6 w-48 bg-slate-200 rounded-lg" />
          <div class="h-10 w-96 bg-slate-200 rounded-xl" />
          <div class="h-4 w-72 bg-slate-100 rounded" />
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} class="h-56 bg-slate-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (session.role === "sin_asignar") {
    return (
      <div class="w-full px-6 sm:px-10 lg:px-14 py-12">
        <div class="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center max-w-xl mx-auto shadow-sm">
          <p class="text-3xl">⏳</p>
          <h2 class="font-bold text-amber-800 text-lg mt-2">Cuenta sin asignar</h2>
          <p class="text-sm text-amber-700 mt-1">
            Un administrador debe asignarte rol (Estudiante/Profesor) y un curso. Contacta a{" "}
            <span class="font-mono font-semibold">administracion@sintaxia.com</span>.
          </p>
          <a
            href="/"
            class="inline-block mt-5 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="w-full px-6 sm:px-10 lg:px-14 py-8">
      {/* Encabezado Principal según Imagen 1 */}
      <div class="mb-8">
        <p class="text-sm sm:text-base font-semibold text-[#6C5CE7] mb-1">
          Explora y Aprende
        </p>
        <h1 class="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight mb-2">
          Modulo de Enseñanza
        </h1>
        <p class="text-sm sm:text-base text-slate-500 max-w-2xl leading-relaxed">
          Descubre todos tus cursos disponibles y comenza con tu alfabetizaion en IA
        </p>
      </div>

      {/* Barra de Búsqueda */}
      <div class="relative max-w-md mb-8">
        <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 1114 0z"
            />
          </svg>
        </span>
        <input
          type="text"
          value={searchTerm}
          onInput={(e) => {
            setSearchTerm((e.target as HTMLInputElement).value);
            setPage(1);
          }}
          placeholder="Buscar curso"
          class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20 focus:border-[#6C5CE7] transition shadow-xs"
        />
      </div>

      {/* Grid de Cursos o Estado Vacío */}
      {courses.length === 0 ? (
        <div class="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-xs">
          <div class="w-16 h-16 rounded-2xl bg-indigo-50 text-[#6C5CE7] flex items-center justify-center text-3xl mx-auto mb-4">
            📚
          </div>
          <h2 class="text-xl font-bold text-slate-900 mb-2">Sin cursos asignados</h2>
          <p class="text-sm text-slate-500 mb-6 leading-relaxed">
            Aún no estás asignado a ningún curso. Un administrador debe asignarte desde el panel de administración.
          </p>
          <div class="flex items-center justify-center gap-3">
            <a
              href="/actividades"
              class="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Ir a Cursos / Actividades
            </a>
            <a
              href="/alfabetizacion"
              class="px-5 py-2.5 rounded-xl bg-[#5932EA] hover:bg-[#4E2AD0] text-white text-sm font-semibold transition"
            >
              Ver Alfabetización IA
            </a>
          </div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
          No se encontraron cursos que coincidan con &quot;<span class="font-semibold">{searchTerm}</span>&quot;.
        </div>
      ) : (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedCourses.map((course) => {
            const courseActs = activities.filter((a) => a.courseId === course.id);

            return (
              <div
                key={course.id}
                class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div class="flex items-start gap-4">
                    {/* Ícono del curso: color + logo elegidos (fallback: rueda morada) */}
                    <div
                      class="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
                      style={course.color && COURSE_COLORS[course.color] ? { background: `linear-gradient(135deg, ${COURSE_COLORS[course.color].from}, ${COURSE_COLORS[course.color].to})` } : { background: "linear-gradient(135deg, #7C5CE9, #5E3FE6)" }}
                    >
                      {course.icon ? (
                        <img
                          src={`/Images/Logos/${course.icon}`}
                          alt={course.name}
                          class="w-9 h-9 object-contain drop-shadow-sm"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (!target.src.includes("/images/logos/")) {
                              target.src = `/images/logos/${course.icon}`;
                            }
                          }}
                        />
                      ) : (
                        <svg
                          class="w-7 h-7 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 2v3m0 14v3M2 12h3m14 0h3m-3.5-6.5l-2.1 2.1m-8.8 8.8l-2.1 2.1m0-13l2.1 2.1m8.8 8.8l2.1 2.1" />
                          <path d="M12 6a6 6 0 0 1 6 6m-6 6a6 6 0 0 1-6-6" opacity="0.6" />
                        </svg>
                      )}
                    </div>

                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-semibold text-slate-400 font-mono tracking-wider">
                        {course.code}
                      </p>
                      <h3
                        class="text-lg font-bold text-slate-900 mt-0.5 leading-snug truncate"
                        title={course.name}
                      >
                        {course.name}
                      </h3>
                      <p class="text-xs text-slate-400 mt-0.5">
                        {course.profesorIds.length} prof. - {course.estudianteIds.length} est.
                      </p>
                    </div>
                  </div>

                  {course.description && (
                    <p class="text-xs sm:text-sm text-slate-500 line-clamp-3 mt-4 leading-relaxed">
                      {course.description}
                    </p>
                  )}
                </div>

                <div class="mt-6 pt-3 border-t border-slate-100">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-slate-400 font-medium">
                      {courseActs.length} {courseActs.length === 1 ? "actividad" : "actividades"}
                    </span>
                    <a
                      href="/actividades"
                      class="text-xs sm:text-sm font-semibold text-[#6C5CE7] hover:text-[#5E3FE6] transition flex items-center gap-1"
                    >
                      Ver curso →
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginador según Imagen 1 */}
      {totalPages > 1 && (
        <div class="mt-12 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            class="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition cursor-pointer"
          >
            &lt;
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              class={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition cursor-pointer ${
                page === p
                  ? "bg-[#5932EA] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            class="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition cursor-pointer"
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}

