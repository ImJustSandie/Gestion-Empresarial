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
  type Course,
} from "../utils/courses";

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
    const res = await createCourse({ name: newName, description: newDesc, createdBy: session.userId });
    setActionMsg({ type: res.success ? "success" : "error", text: res.message });
    if (res.success) {
      setNewName(""); setNewDesc("");
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
      <div class="max-w-6xl mx-auto px-4 py-10">
        <div class="animate-pulse space-y-4">
          <div class="h-8 bg-gray-200 rounded w-1/3" />
          <div class="h-32 bg-gray-100 rounded-xl" />
          <div class="h-64 bg-gray-100 rounded-xl" />
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
      case "sin_asignar": return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const userById = (id: string) => users.find((u) => u.id === id);

  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Panel de Administración</h1>
          <p class="text-sm text-gray-500 mt-1">
            Gestión integral • <span class="font-mono text-gray-700">{session.email}</span>
          </p>
        </div>
        <div class="flex gap-2">
          <button onClick={() => handleExport(tab === "usuarios" ? "users" : "courses")} class="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition">
            Exportar {tab === "usuarios" ? "usuarios" : "cursos"} JSON
          </button>
          <a href="/" class="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-black transition">← Volver</a>
        </div>
      </div>

      <div class="flex bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        <button onClick={() => setTab("usuarios")} class={`px-6 py-2 rounded-lg text-sm font-medium transition ${tab === "usuarios" ? "bg-white shadow border border-gray-200 text-gray-900" : "text-gray-500"}`}>Usuarios</button>
        <button onClick={() => setTab("cursos")} class={`px-6 py-2 rounded-lg text-sm font-medium transition ${tab === "cursos" ? "bg-white shadow border border-gray-200 text-gray-900" : "text-gray-500"}`}>Cursos</button>
      </div>

      {actionMsg && (
        <div class={`mb-4 p-3 rounded-xl text-sm border ${actionMsg.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>{actionMsg.text}</div>
      )}

      {tab === "usuarios" ? (
        <>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <div class="bg-white border border-gray-200 rounded-xl p-4 text-center"><p class="text-2xl font-bold">{stats.total}</p><p class="text-xs uppercase text-gray-500">Total</p></div>
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center"><p class="text-2xl font-bold text-amber-700">{stats.sin_asignar}</p><p class="text-xs uppercase text-amber-700">Sin asignar</p></div>
            <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center"><p class="text-2xl font-bold text-emerald-700">{stats.estudiante}</p><p class="text-xs uppercase text-emerald-700">Estudiantes</p></div>
            <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center"><p class="text-2xl font-bold text-indigo-700">{stats.profesor}</p><p class="text-xs uppercase text-indigo-700">Profesores</p></div>
            <div class="bg-gray-900 rounded-xl p-4 text-center text-white"><p class="text-2xl font-bold">{stats.admin}</p><p class="text-xs text-gray-300 uppercase">Admins</p></div>
          </div>

          {stats.sin_asignar > 0 && (
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
              <span class="text-amber-600 text-xl">⚠</span>
              <div><p class="text-sm font-semibold text-amber-800">{stats.sin_asignar} pendiente(s) de asignación</p><p class="text-xs text-amber-700 mt-1">Los nuevos usuarios quedan “Sin asignar”. Asigna Estudiante/Profesor y luego asígnalos a un curso en la pestaña Cursos.</p></div>
            </div>
          )}

          <div class="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
            <div class="flex-1 relative">
              <input type="text" placeholder="Buscar por nombre, correo o código..." value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none text-sm" />
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter((e.target as HTMLSelectElement).value as any)} class="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium">
              <option value="todos">Todos los roles</option>
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-200"><tr class="text-left text-xs uppercase text-gray-500"><th class="px-4 py-3">Usuario</th><th class="px-4 py-3">Correo</th><th class="px-4 py-3">Código</th><th class="px-4 py-3">Rol</th><th class="px-4 py-3">Asignar rol</th><th class="px-4 py-3">Creado</th><th class="px-4 py-3 text-right">Acciones</th></tr></thead>
                <tbody class="divide-y divide-gray-100">
                  {filtered.length === 0 ? <tr><td colSpan={7} class="px-6 py-10 text-center text-gray-400">No se encontraron usuarios.</td></tr> :
                    filtered.map((u) => (
                      <tr key={u.id} class={`hover:bg-gray-50 ${pendingId === u.id ? "opacity-60" : ""}`}>
                        <td class="px-4 py-3"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">{u.name.charAt(0).toUpperCase()}</div><span class="font-medium">{u.name}</span></div></td>
                        <td class="px-4 py-3 font-mono text-xs text-gray-600">{u.email}</td>
                        <td class="px-4 py-3">
                          {u.codigo ? (
                            <span class={`inline-flex px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${u.role === "profesor" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                              {u.codigo}
                            </span>
                          ) : (
                            <span class="text-xs text-gray-400">—</span>
                          )}
                          {u.codigo && <span class="ml-1 text-[10px] text-gray-400">{u.role === "profesor" ? "100XXXX" : u.role === "estudiante" ? "600XXXX" : ""}</span>}
                        </td>
                        <td class="px-4 py-3"><span class={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${roleBadgeClass(u.role)}`}>{ROLE_LABELS[u.role]}</span></td>
                        <td class="px-4 py-3"><select value={u.role} onChange={(e) => handleRoleChange(u, (e.target as HTMLSelectElement).value as Role)} disabled={pendingId === u.id} class="px-2 py-1.5 rounded-lg border text-xs"><option value="sin_asignar">Sin asignar</option><option value="estudiante">Estudiante</option><option value="profesor">Profesor</option><option value="admin">Admin</option></select></td>
                        <td class="px-4 py-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString("es-CO")}</td>
                        <td class="px-4 py-3 text-right"><button onClick={() => handleDelete(u)} disabled={pendingId === u.id || u.email === "administracion@sintaxia.com"} class="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs disabled:opacity-40">Eliminar</button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div class="bg-gray-50 border-t px-4 py-2 text-xs text-gray-500">
              Profesor: <span class="font-mono font-bold">100XXXX</span> (7 dígitos) • Estudiante: <span class="font-mono font-bold">600XXXX</span> • Generación automática y única.
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Crear curso */}
          <form onSubmit={handleCreateCourse} class="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 class="font-semibold text-gray-900 mb-1">Crear nuevo curso</h3>
            <p class="text-xs text-gray-500 mb-4">El código se genera automáticamente (6 números). Asigna nombre y descripción.</p>
            <div class="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-3 flex items-center gap-3">
              <span class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">auto</span>
              <div>
                <p class="text-xs font-semibold text-indigo-800">Código automático de 6 dígitos</p>
                <p class="text-xs text-indigo-600">Ej: 482913 • Se asigna al crear y es único.</p>
              </div>
            </div>
            <input placeholder="Nombre del curso (ej: Gestión Empresarial 101)" value={newName} onInput={(e) => setNewName((e.target as HTMLInputElement).value)} required class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm" />
            <textarea placeholder="Descripción (opcional)" value={newDesc} onInput={(e) => setNewDesc((e.target as HTMLTextAreaElement).value)} rows={2} class="mt-3 w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm" />
            <button type="submit" class="mt-3 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">+ Crear curso</button>
            {profesores.length === 0 && estudiantes.length === 0 && <p class="text-xs text-amber-600 mt-2">Aún no hay profesores/estudiantes con rol asignado para vincular.</p>}
          </form>

          {courses.length === 0 ? (
            <div class="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
              <p class="text-lg">📚</p><p class="font-medium mt-2">No hay cursos creados</p><p class="text-sm">Crea tu primer curso arriba.</p>
            </div>
          ) : (
            <div class="grid gap-4">
              {courses.map((course) => {
                const profs = course.profesorIds.map(userById).filter(Boolean) as User[];
                const ests = course.estudianteIds.map(userById).filter(Boolean) as User[];
                const isOpen = selectedCourse === course.id;
                return (
                  <div key={course.id} class="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div class="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="px-2.5 py-1 bg-gray-900 text-white rounded-lg text-xs font-mono font-bold">{course.code}</span>
                          <span class="text-xs text-gray-500">{new Date(course.createdAt).toLocaleDateString("es-CO")}</span>
                        </div>
                        <h4 class="font-semibold text-gray-900 mt-1">{course.name}</h4>
                        {course.description && <p class="text-sm text-gray-600 mt-1">{course.description}</p>}
                        <p class="text-xs text-gray-500 mt-2">{profs.length} profesor(es) • {ests.length} estudiante(s)</p>
                      </div>
                      <div class="flex gap-2">
                        <button onClick={() => setSelectedCourse(isOpen ? null : course.id)} class="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">{isOpen ? "Cerrar" : "Gestionar"}</button>
                        <button onClick={async () => { if (confirm(`¿Eliminar curso ${course.code}?`)) { await deleteCourse(course.id); await refreshCourses(); } }} class="px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm">Eliminar</button>
                      </div>
                    </div>

                    {isOpen && (
                      <div class="border-t border-gray-200 bg-gray-50 p-5 grid sm:grid-cols-2 gap-6">
                        <div>
                          <p class="text-sm font-semibold text-gray-900">Profesores asignados</p>
                          <div class="mt-2 space-y-2">
                            {profs.length === 0 ? <p class="text-xs text-gray-400">Ninguno</p> : profs.map((p) => (
                              <div key={p.id} class="flex items-center justify-between bg-white border rounded-lg px-3 py-2 text-sm">
                                <span>{p.name} <span class="text-xs text-gray-500 font-mono">({p.email})</span> <span class="ml-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-mono text-xs font-bold">{p.codigo}</span></span>
                                <button onClick={() => handleUnassign(course.id, p.id)} class="text-xs text-red-600 hover:underline">Quitar</button>
                              </div>
                            ))}
                          </div>
                          <div class="mt-3 flex gap-2">
                            <select value={assignProf} onChange={(e) => setAssignProf((e.target as HTMLSelectElement).value)} class="flex-1 px-3 py-2 rounded-lg border text-sm bg-white">
                              <option value="">Seleccionar profesor...</option>
                              {profesores.filter((p) => !course.profesorIds.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.name} — {p.email}</option>)}
                            </select>
                            <button onClick={() => handleAssign(course.id, assignProf, "profesor")} disabled={!assignProf} class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-40">Asignar</button>
                          </div>
                        </div>

                        <div>
                          <p class="text-sm font-semibold text-gray-900">Estudiantes asignados</p>
                          <div class="mt-2 space-y-2">
                            {ests.length === 0 ? <p class="text-xs text-gray-400">Ninguno</p> : ests.map((e) => (
                              <div key={e.id} class="flex items-center justify-between bg-white border rounded-lg px-3 py-2 text-sm">
                                <span>{e.name} <span class="text-xs text-gray-500 font-mono">({e.email})</span> <span class="ml-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-mono text-xs font-bold">{e.codigo}</span></span>
                                <button onClick={() => handleUnassign(course.id, e.id)} class="text-xs text-red-600 hover:underline">Quitar</button>
                              </div>
                            ))}
                          </div>
                          <div class="mt-3 flex gap-2">
                            <select value={assignEst} onChange={(e) => setAssignEst((e.target as HTMLSelectElement).value)} class="flex-1 px-3 py-2 rounded-lg border text-sm bg-white">
                              <option value="">Seleccionar estudiante...</option>
                              {estudiantes.filter((e) => !course.estudianteIds.includes(e.id)).map((e) => <option key={e.id} value={e.id}>{e.codigo} — {e.name} — {e.email}</option>)}
                            </select>
                            <button onClick={() => handleAssign(course.id, assignEst, "estudiante")} disabled={!assignEst} class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-40">Asignar</button>
                          </div>
                          <div class="mt-3 pt-3 border-t border-gray-200">
                            <p class="text-xs font-semibold text-gray-700 mb-1.5">O añadir por código único</p>
                            <div class="flex gap-2">
                              <input
                                placeholder="Ej: 6001234"
                                value={assignEstCode}
                                onInput={(e) => setAssignEstCode((e.target as HTMLInputElement).value)}
                                maxLength={7}
                                inputMode="numeric"
                                pattern="\d{7}"
                                class="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm font-mono"
                              />
                              <button
                                onClick={() => handleAssignEstByCode(course.id)}
                                disabled={!assignEstCode.trim()}
                                class="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-black disabled:opacity-40 transition"
                              >
                                Añadir por código
                              </button>
                            </div>
                            <p class="text-[11px] text-gray-500 mt-1">Formato estudiante: <span class="font-mono font-bold">600XXXX</span> (7 dígitos). Lista y código son intercambiables.</p>
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
  );
}
