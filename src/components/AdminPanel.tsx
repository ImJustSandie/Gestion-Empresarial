import { useEffect, useState } from "preact/hooks";
import {
  initAuth,
  getSession,
  getUsersAsync,
  updateUserRole,
  deleteUser,
  exportUsersJson,
  findUserByCodigo,
  ROLE_LABELS,
  ROLE_OPTIONS,
  type User,
  type Role,
  type Session,
} from "../utils/auth";
import {
  initCourses,
  getCourses,
  createCourse,
  deleteCourse,
  assignUserToCourse,
  unassignUserFromCourse,
  exportCoursesJson,
  COURSE_COLORS,
  COURSE_COLOR_IDS,
  COURSE_LOGOS,
  type Course,
} from "../utils/courses";
import SelectMenu from "./SelectMenu";

type Tab = "usuarios" | "cursos";

export default function AdminPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "todos">("todos");
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("usuarios");

  // Cursos state
  const [courses, setCourses] = useState<Course[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [assignProf, setAssignProf] = useState("");
  const [assignEst, setAssignEst] = useState("");
  const [assignEstCode, setAssignEstCode] = useState("");

  useEffect(() => {
    (async () => {
      await initAuth();
      await initCourses();
      const s = getSession();
      if (!s || s.role !== "admin") {
        window.location.href = "/";
        return;
      }
      setSession(s);
      const [list, clist] = await Promise.all([getUsersAsync(), getCourses()]);
      setUsers(list);
      setCourses(clist);
      setLoading(false);
    })();
  }, []);

  const refreshUsers = async () => setUsers(await getUsersAsync());
  const refreshCourses = async () => setCourses(await getCourses());

  const filtered = users.filter((u) => {
    if (roleFilter !== "todos" && u.role !== roleFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.codigo && u.codigo.includes(q));
    }
    return true;
  });

  const stats = {
    total: users.length,
    sin_asignar: users.filter((u) => u.role === "sin_asignar").length,
    estudiante: users.filter((u) => u.role === "estudiante").length,
    profesor: users.filter((u) => u.role === "profesor").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  const profesores = users.filter((u) => u.role === "profesor");
  const estudiantes = users.filter((u) => u.role === "estudiante");

  const handleRoleChange = async (user: User, newRole: Role) => {
    if (user.role === newRole) return;
    setPendingId(user.id);
    setActionMsg(null);
    const res = await updateUserRole(user.id, newRole);
    setActionMsg({ type: res.success ? "success" : "error", text: res.message });
    if (res.success) await refreshUsers();
    setPendingId(null);
    setTimeout(() => setActionMsg(null), 3000);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`¿Eliminar a ${user.name} (${user.email})?`)) return;
    setPendingId(user.id);
    const res = await deleteUser(user.id);
    setActionMsg({ type: res.success ? "success" : "error", text: res.message });
    if (res.success) await refreshUsers();
    setPendingId(null);
    setTimeout(() => setActionMsg(null), 3000);
  };

  const handleCreateCourse = async (e: Event) => {
    e.preventDefault();
    if (!session) return;
    const res = await createCourse({ name: newName, description: newDesc, color: newColor || undefined, icon: newIcon || undefined, createdBy: session.userId });
    setActionMsg({ type: res.success ? "success" : "error", text: res.message });
    if (res.success) {
      setNewName(""); setNewDesc(""); setNewColor(""); setNewIcon("");
      await refreshCourses();
    }
    setTimeout(() => setActionMsg(null), 3000);
  };

  const handleAssign = async (courseId: string, userId: string, role: "profesor" | "estudiante") => {
    if (!userId) return;
    const res = await assignUserToCourse(courseId, userId, role);
    setActionMsg({ type: res.success ? "success" : "error", text: res.message });
    if (res.success) await refreshCourses();
    if (role === "profesor") setAssignProf(""); else setAssignEst("");
    setTimeout(() => setActionMsg(null), 2500);
  };

  const handleAssignEstByCode = async (courseId: string) => {
    const code = assignEstCode.trim();
    if (!code) return;
    if (!/^\d{7}$/.test(code)) {
      setActionMsg({ type: "error", text: "El código debe tener 7 números." });
      setTimeout(() => setActionMsg(null), 2500);
      return;
    }
    if (!code.startsWith("600")) {
      setActionMsg({ type: "error", text: "Solo códigos de estudiante (600XXXX) pueden usarse aquí." });
      setTimeout(() => setActionMsg(null), 2500);
      return;
    }
    const user = findUserByCodigo(code);
    if (!user) {
      setActionMsg({ type: "error", text: `No existe estudiante con código ${code}.` });
      setTimeout(() => setActionMsg(null), 2500);
      return;
    }
    if (user.role !== "estudiante") {
      setActionMsg({ type: "error", text: `El código ${code} pertenece a ${user.name} con rol ${ROLE_LABELS[user.role]}, no es estudiante.` });
      setTimeout(() => setActionMsg(null), 2500);
      return;
    }
    const course = courses.find((c) => c.id === courseId);
    if (course?.estudianteIds.includes(user.id)) {
      setActionMsg({ type: "error", text: `${user.name} ya está asignado a este curso.` });
      setTimeout(() => setActionMsg(null), 2500);
      return;
    }
    const res = await assignUserToCourse(courseId, user.id, "estudiante");
    setActionMsg({ type: res.success ? "success" : "error", text: res.success ? `${user.name} (${code}) asignado correctamente.` : res.message });
    if (res.success) {
      await refreshCourses();
      setAssignEstCode("");
    }
    setTimeout(() => setActionMsg(null), 2500);
  };

  const handleUnassign = async (courseId: string, userId: string) => {
    const res = await unassignUserFromCourse(courseId, userId);
    setActionMsg({ type: res.success ? "success" : "error", text: res.message });
    if (res.success) await refreshCourses();
    setTimeout(() => setActionMsg(null), 2500);
  };

  const handleExport = (type: "users" | "courses") => {
    const json = type === "users" ? exportUsersJson() : exportCoursesJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

  const roleBadgeClass = (role: Role) => {
    switch (role) {
      case "admin": return "bg-amber-100 text-amber-800 border-amber-200";
      case "profesor": return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "estudiante": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "sin_asignar": return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const userById = (id: string) => users.find((u) => u.id === id);

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
        {/* Encabezado */}
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <h1 class="text-3xl sm:text-[34px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
              Panel de Administración
            </h1>
            <p class="text-sm text-slate-500 font-normal mt-1.5">
              Gestión integral • <span class="font-mono text-slate-700">{session.email}</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2 self-start sm:self-auto">
            <button
              onClick={() => handleExport(tab === "usuarios" ? "users" : "courses")}
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <svg class="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Exportar {tab === "usuarios" ? "usuarios" : "cursos"} JSON</span>
            </button>
            <a
              href="/"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <span>←</span>
              <span>Volver</span>
            </a>
          </div>
        </div>

        {/* Pestañas */}
        <div class="flex bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => setTab("usuarios")}
            class={`px-6 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${tab === "usuarios" ? "bg-white shadow-xs border border-slate-200 text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setTab("cursos")}
            class={`px-6 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${tab === "cursos" ? "bg-white shadow-xs border border-slate-200 text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            Cursos
          </button>
        </div>

        {actionMsg && (
          <div
            class={`mb-6 p-4 rounded-xl text-sm font-medium border flex items-center justify-between transition-all shadow-xs ${
              actionMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div class="flex items-center gap-2.5">
              {actionMsg.type === "success" ? (
                <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : (
                <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              )}
              <span>{actionMsg.text}</span>
            </div>
            <button onClick={() => setActionMsg(null)} class="text-xs opacity-60 hover:opacity-100 cursor-pointer p-1">
              ✕
            </button>
          </div>
        )}

        {tab === "usuarios" ? (
          <>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              <div class="bg-white border border-slate-200/90 rounded-2xl p-4 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)]"><p class="text-2xl font-bold text-slate-900">{stats.total}</p><p class="text-xs uppercase tracking-wide text-slate-500">Total</p></div>
              <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)]"><p class="text-2xl font-bold text-amber-700">{stats.sin_asignar}</p><p class="text-xs uppercase tracking-wide text-amber-700">Sin asignar</p></div>
              <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)]"><p class="text-2xl font-bold text-emerald-700">{stats.estudiante}</p><p class="text-xs uppercase tracking-wide text-emerald-700">Estudiantes</p></div>
              <div class="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)]"><p class="text-2xl font-bold text-indigo-700">{stats.profesor}</p><p class="text-xs uppercase tracking-wide text-indigo-700">Profesores</p></div>
              <div class="bg-slate-900 rounded-2xl p-4 text-center text-white shadow-[0_2px_12px_rgba(0,0,0,0.02)]"><p class="text-2xl font-bold">{stats.admin}</p><p class="text-xs text-slate-300 uppercase tracking-wide">Admins</p></div>
            </div>

            {stats.sin_asignar > 0 && (
              <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <svg class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div><p class="text-sm font-semibold text-amber-800">{stats.sin_asignar} pendiente(s) de asignación</p><p class="text-xs text-amber-700 mt-1">Los nuevos usuarios quedan "Sin asignar". Asigna Estudiante/Profesor y luego asígnalos a un curso en la pestaña Cursos.</p></div>
              </div>
            )}

            <div class="bg-white border border-slate-200/90 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div class="flex-1 relative flex items-center rounded-xl border border-slate-200/90 bg-white px-3.5 focus-within:ring-2 focus-within:ring-[#5932EA]/20 focus-within:border-[#5932EA] transition">
                <svg class="w-4 h-4 text-slate-400 shrink-0 mr-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo o código..."
                  value={query}
                  onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                  class="w-full py-2.5 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
                />
              </div>
              <SelectMenu
                ariaLabel="Filtrar por rol"
                wrapperClass="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#5932EA]/20 focus-within:border-[#5932EA] transition sm:w-56"
                textClass="text-sm font-semibold text-slate-800"
                icon={
                  <svg class="w-4 h-4 text-slate-400 shrink-0 mr-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                }
                options={[{ value: "todos", label: "Todos los roles" }, ...ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))]}
                value={roleFilter}
                onChange={(v) => setRoleFilter(v as Role | "todos")}
              />
            </div>

            <div class="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-slate-50 border-b border-slate-200/90"><tr class="text-left text-xs uppercase tracking-wide text-slate-500"><th class="px-4 py-3">Usuario</th><th class="px-4 py-3">Correo</th><th class="px-4 py-3">Código</th><th class="px-4 py-3">Rol</th><th class="px-4 py-3">Asignar rol</th><th class="px-4 py-3">Creado</th><th class="px-4 py-3 text-right">Acciones</th></tr></thead>
                  <tbody class="divide-y divide-slate-100">
                    {filtered.length === 0 ? <tr><td colSpan={7} class="px-6 py-10 text-center text-slate-400">No se encontraron usuarios.</td></tr> :
                      filtered.map((u) => (
                        <tr key={u.id} class={`hover:bg-slate-50/60 transition-colors ${pendingId === u.id ? "opacity-60" : ""}`}>
                          <td class="px-4 py-3"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C5CE9] to-[#5932EA] flex items-center justify-center text-white text-xs font-bold">{u.name.charAt(0).toUpperCase()}</div><span class="font-medium text-slate-800">{u.name}</span></div></td>
                          <td class="px-4 py-3 font-mono text-xs text-slate-600">{u.email}</td>
                          <td class="px-4 py-3">
                            {u.codigo ? (
                              <span class={`inline-flex px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${u.role === "profesor" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                                {u.codigo}
                              </span>
                            ) : (
                              <span class="text-xs text-slate-400">—</span>
                            )}
                            {u.codigo && <span class="ml-1 text-[10px] text-slate-400">{u.role === "profesor" ? "100XXXX" : u.role === "estudiante" ? "600XXXX" : ""}</span>}
                          </td>
                          <td class="px-4 py-3"><span class={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${roleBadgeClass(u.role)}`}>{ROLE_LABELS[u.role]}</span></td>
                          <td class="px-4 py-3">
                            <select value={u.role} onChange={(e) => handleRoleChange(u, (e.target as HTMLSelectElement).value as Role)} disabled={pendingId === u.id} class="px-2 py-1.5 rounded-lg border border-slate-200/90 bg-white text-xs focus:border-[#5932EA] outline-none cursor-pointer">
                              <option value="sin_asignar">Sin asignar</option>
                              <option value="estudiante">Estudiante</option>
                              <option value="profesor">Profesor</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td class="px-4 py-3 text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString("es-CO")}</td>
                          <td class="px-4 py-3 text-right"><button onClick={() => handleDelete(u)} disabled={pendingId === u.id || u.email === "administracion@sintaxia.com"} class="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/80 text-xs font-semibold hover:bg-rose-100 transition cursor-pointer disabled:opacity-40">Eliminar</button></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div class="bg-slate-50 border-t border-slate-200/90 px-4 py-2 text-xs text-slate-500">
                Profesor: <span class="font-mono font-bold">100XXXX</span> (7 dígitos) • Estudiante: <span class="font-mono font-bold">600XXXX</span> • Generación automática y única.
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Crear curso */}
            <form onSubmit={handleCreateCourse} class="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 mb-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <h3 class="text-base sm:text-lg font-bold text-slate-900 leading-tight">Crear nuevo curso</h3>
              <p class="text-xs text-slate-400 mt-1 mb-4">El código se genera automáticamente (6 números). Asigna nombre y descripción.</p>
              <div class="bg-indigo-50/70 border border-indigo-200/80 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                <span class="w-8 h-8 rounded-lg bg-[#5932EA] text-white flex items-center justify-center text-[10px] font-bold shrink-0">auto</span>
                <div>
                  <p class="text-xs font-semibold text-indigo-800">Código automático de 6 dígitos</p>
                  <p class="text-xs text-indigo-600">Ej: 482913 • Se asigna al crear y es único.</p>
                </div>
              </div>
              <input
                placeholder="Nombre del curso (ej: Gestión Empresarial 101)"
                value={newName}
                onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
                required
                class="w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white focus:border-[#5932EA] focus:ring-2 focus:ring-[#5932EA]/20 outline-none text-sm transition"
              />
              <textarea
                placeholder="Descripción (opcional)"
                value={newDesc}
                onInput={(e) => setNewDesc((e.target as HTMLTextAreaElement).value)}
                rows={2}
                class="mt-3 w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white focus:border-[#5932EA] focus:ring-2 focus:ring-[#5932EA]/20 outline-none text-sm transition"
              />

              {/* Color del módulo */}
              <div class="mt-4">
                <p class="text-xs font-semibold text-slate-700 mb-1.5">Color del módulo</p>
                <div class="flex flex-wrap gap-2">
                  {COURSE_COLOR_IDS.map((key) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setNewColor(newColor === key ? "" : key)}
                      class={`h-10 w-10 rounded-xl border-2 flex items-center justify-center text-white text-sm font-bold shadow-sm transition cursor-pointer ${newColor === key ? "border-slate-900 scale-110" : "border-slate-200 hover:border-slate-400"}`}
                      style={{ background: `linear-gradient(135deg, ${COURSE_COLORS[key].from}, ${COURSE_COLORS[key].to})` }}
                      title={COURSE_COLORS[key].label}
                    >
                      {newColor === key ? "✓" : ""}
                    </button>
                  ))}
                  {newColor && (
                    <button type="button" onClick={() => setNewColor("")} class="h-10 px-3 rounded-xl border border-slate-200/90 text-xs text-slate-500 hover:bg-slate-50 transition cursor-pointer">
                      Sin color
                    </button>
                  )}
                </div>
              </div>

              {/* Logo del módulo */}
              <div class="mt-4">
                <p class="text-xs font-semibold text-slate-700 mb-1.5">Logo del módulo</p>
                <div class="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1.5">
                  {COURSE_LOGOS.map((file) => (
                    <button
                      type="button"
                      key={file}
                      onClick={() => setNewIcon(newIcon === file ? "" : file)}
                      class={`aspect-square rounded-lg border-2 bg-violet-300 overflow-hidden flex items-center justify-center p-0.5 transition cursor-pointer ${newIcon === file ? "border-[#5932EA] ring-2 ring-[#5932EA]/30" : "border-violet-400 hover:border-violet-600"}`}
                      title={`Logo ${file}`}
                    >
                      <img
                        src={`/Images/Logos/${file}`}
                        alt={`Logo ${file}`}
                        class="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          if (!target.src.includes("/images/logos/")) {
                            target.src = `/images/logos/${file}`;
                          }
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" class="mt-5 px-6 py-2.5 rounded-xl bg-[#5932EA] hover:bg-[#4E2AD0] text-white text-sm font-semibold shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer">
                <span>+</span>
                <span>Crear curso</span>
              </button>
              {profesores.length === 0 && estudiantes.length === 0 && <p class="text-xs text-amber-600 mt-2">Aún no hay profesores/estudiantes con rol asignado para vincular.</p>}
            </form>

            {courses.length === 0 ? (
              <div class="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-slate-500 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <svg class="w-10 h-10 mx-auto text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <p class="font-medium mt-2 text-slate-700">No hay cursos creados</p>
                <p class="text-sm">Crea tu primer curso arriba.</p>
              </div>
            ) : (
              <div class="grid gap-4">
                {courses.map((course) => {
                  const profs = course.profesorIds.map(userById).filter(Boolean) as User[];
                  const ests = course.estudianteIds.map(userById).filter(Boolean) as User[];
                  const isOpen = selectedCourse === course.id;
                  return (
                    <div key={course.id} class="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                      <div class="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="flex items-start gap-3">
                          <div
                            class="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                            style={course.color && COURSE_COLORS[course.color] ? { background: `linear-gradient(135deg, ${COURSE_COLORS[course.color].from}, ${COURSE_COLORS[course.color].to})` } : { background: "linear-gradient(135deg, #7C5CE9, #5E3FE6)" }}
                          >
                            {course.icon ? (
                              <img
                                src={`/Images/Logos/${course.icon}`}
                                alt={course.name}
                                class="w-8 h-8 object-contain drop-shadow-sm"
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  if (!target.src.includes("/images/logos/")) {
                                    target.src = `/images/logos/${course.icon}`;
                                  }
                                }}
                              />
                            ) : (
                              <span class="text-xs font-bold">S</span>
                            )}
                          </div>
                          <div>
                            <div class="flex items-center gap-2">
                              <span class="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-mono font-bold">{course.code}</span>
                              <span class="text-xs text-slate-400">{new Date(course.createdAt).toLocaleDateString("es-CO")}</span>
                            </div>
                            <h4 class="font-semibold text-slate-900 mt-1">{course.name}</h4>
                            {course.description && <p class="text-sm text-slate-600 mt-1">{course.description}</p>}
                            <p class="text-xs text-slate-500 mt-2">{profs.length} profesor(es) • {ests.length} estudiante(s)</p>
                          </div>
                        </div>
                        <div class="flex gap-2 shrink-0">
                          <button onClick={() => setSelectedCourse(isOpen ? null : course.id)} class="px-4 py-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition cursor-pointer">{isOpen ? "Cerrar" : "Gestionar"}</button>
                          <button onClick={async () => { if (confirm(`¿Eliminar curso ${course.code}?`)) { await deleteCourse(course.id); await refreshCourses(); } }} class="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/80 text-sm font-semibold hover:bg-rose-100 transition cursor-pointer">Eliminar</button>
                        </div>
                      </div>

                      {isOpen && (
                        <div class="border-t border-slate-200/90 bg-slate-50 p-5 grid sm:grid-cols-2 gap-6">
                          <div>
                            <p class="text-sm font-semibold text-slate-900">Profesores asignados</p>
                            <div class="mt-2 space-y-2">
                              {profs.length === 0 ? <p class="text-xs text-slate-400">Ninguno</p> : profs.map((p) => (
                                <div key={p.id} class="flex items-center justify-between bg-white border border-slate-200/90 rounded-lg px-3 py-2 text-sm">
                                  <span class="text-slate-800">{p.name} <span class="text-xs text-slate-500 font-mono">({p.email})</span> <span class="ml-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-mono text-xs font-bold">{p.codigo}</span></span>
                                  <button onClick={() => handleUnassign(course.id, p.id)} class="text-xs text-rose-600 hover:underline cursor-pointer shrink-0">Quitar</button>
                                </div>
                              ))}
                            </div>
                            <div class="mt-3 flex gap-2">
                              <SelectMenu
                                ariaLabel="Seleccionar profesor"
                                wrapperClass="flex-1 rounded-lg border border-slate-200/90 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-[#5932EA]/20 focus-within:border-[#5932EA] transition"
                                textClass="text-sm font-medium text-slate-800"
                                options={profesores.filter((p) => !course.profesorIds.includes(p.id)).map((p) => ({ value: p.id, label: `${p.name} — ${p.email}`, meta: p.codigo }))}
                                value={assignProf}
                                onChange={setAssignProf}
                                placeholder="Seleccionar profesor..."
                              />
                              <button onClick={() => handleAssign(course.id, assignProf, "profesor")} disabled={!assignProf} class="px-4 py-2 rounded-lg bg-[#5932EA] hover:bg-[#4E2AD0] text-white text-sm font-semibold transition cursor-pointer disabled:opacity-40">Asignar</button>
                            </div>
                          </div>

                          <div>
                            <p class="text-sm font-semibold text-slate-900">Estudiantes asignados</p>
                            <div class="mt-2 space-y-2">
                              {ests.length === 0 ? <p class="text-xs text-slate-400">Ninguno</p> : ests.map((e) => (
                                <div key={e.id} class="flex items-center justify-between bg-white border border-slate-200/90 rounded-lg px-3 py-2 text-sm">
                                  <span class="text-slate-800">{e.name} <span class="text-xs text-slate-500 font-mono">({e.email})</span> <span class="ml-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-mono text-xs font-bold">{e.codigo}</span></span>
                                  <button onClick={() => handleUnassign(course.id, e.id)} class="text-xs text-rose-600 hover:underline cursor-pointer shrink-0">Quitar</button>
                                </div>
                              ))}
                            </div>
                            <div class="mt-3 flex gap-2">
                              <SelectMenu
                                ariaLabel="Seleccionar estudiante"
                                wrapperClass="flex-1 rounded-lg border border-slate-200/90 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-[#5932EA]/20 focus-within:border-[#5932EA] transition"
                                textClass="text-sm font-medium text-slate-800"
                                options={estudiantes.filter((e) => !course.estudianteIds.includes(e.id)).map((e) => ({ value: e.id, label: `${e.name} — ${e.email}`, meta: e.codigo }))}
                                value={assignEst}
                                onChange={setAssignEst}
                                placeholder="Seleccionar estudiante..."
                              />
                              <button onClick={() => handleAssign(course.id, assignEst, "estudiante")} disabled={!assignEst} class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition cursor-pointer disabled:opacity-40">Asignar</button>
                            </div>
                            <div class="mt-3 pt-3 border-t border-slate-200/90">
                              <p class="text-xs font-semibold text-slate-700 mb-1.5">O añadir por código único</p>
                              <div class="flex gap-2">
                                <input
                                  placeholder="Ej: 6001234"
                                  value={assignEstCode}
                                  onInput={(e) => setAssignEstCode((e.target as HTMLInputElement).value)}
                                  maxLength={7}
                                  inputMode="numeric"
                                  pattern="\d{7}"
                                  class="flex-1 px-3 py-2 rounded-lg border border-slate-200/90 bg-white focus:border-[#5932EA] focus:ring-2 focus:ring-[#5932EA]/20 outline-none text-sm font-mono transition"
                                />
                                <button
                                  onClick={() => handleAssignEstByCode(course.id)}
                                  disabled={!assignEstCode.trim()}
                                  class="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-black transition cursor-pointer disabled:opacity-40"
                                >
                                  Añadir por código
                                </button>
                              </div>
                              <p class="text-[11px] text-slate-500 mt-1">Formato estudiante: <span class="font-mono font-bold">600XXXX</span> (7 dígitos). Lista y código son intercambiables.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
