import { useState, useEffect } from "preact/hooks";
import {
  initAuth,
  ensureAdminAccount,
  createUser,
  loginUser,
  getSession,
  clearSession,
  exportUsersJson,
  type Session,
} from "../utils/auth";

type Mode = "login" | "register";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [session, setSession] = useState<Session | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      await initAuth();
      await ensureAdminAccount();
      const s = getSession();
      setSession(s);
      setHydrated(true);
      // Redirección automática por rol
      if (s) {
        const dest = s.role === "admin" ? "/admin" : s.role === "profesor" ? "/actividades" : s.role === "estudiante" ? "/ensenanza" : null;
        if (dest) {
          setTimeout(() => {
            window.location.href = dest;
          }, 600);
        }
      }
    })();
  }, []);

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setMessage({ type: "success", text: "Sesión cerrada correctamente." });
    setEmail("");
    setPassword("");
    setName("");
  };

  const handleExportJson = () => {
    const json = exportUsersJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "register") {
        const result = await createUser({ name, email, password });
        if (result.success && result.user) {
          const loginResult = await loginUser({ email, password });
          if (loginResult.success && loginResult.session) {
            setSession(loginResult.session);
            if (loginResult.session.role === "admin") {
              setMessage({ type: "success", text: "¡Cuenta creada! Redirigiendo al panel de administración..." });
              setTimeout(() => (window.location.href = "/admin"), 700);
            } else if (loginResult.session.role === "sin_asignar") {
              setMessage({ type: "success", text: "¡Cuenta creada! Quedas como 'Sin asignar' hasta que un administrador te asigne rol y curso." });
            } else {
              setMessage({ type: "success", text: "¡Cuenta creada! Redirigiendo..." });
              const d = loginResult.session.role === "profesor" ? "/actividades" : "/ensenanza";
              setTimeout(() => (window.location.href = d), 700);
            }
          } else {
            setMessage({ type: "success", text: result.message + " Ahora puedes iniciar sesión." });
            setMode("login");
          }
        } else {
          setMessage({ type: "error", text: result.message });
        }
      } else {
        const result = await loginUser({ email, password });
        if (result.success && result.session) {
          setSession(result.session);
          if (result.session.role === "admin") {
            setMessage({ type: "success", text: `¡Bienvenido, ${result.session.name}! Redirigiendo al panel...` });
            setTimeout(() => (window.location.href = "/admin"), 700);
          } else if (result.session.role === "sin_asignar") {
            setMessage({ type: "success", text: `¡Bienvenido, ${result.session.name}! Tu cuenta está “Sin asignar” — contacta a un administrador.` });
          } else if (result.session.role === "profesor") {
            setMessage({ type: "success", text: `¡Bienvenido Profesor ${result.session.name}! Redirigiendo a Actividades...` });
            setTimeout(() => (window.location.href = "/actividades"), 700);
          } else if (result.session.role === "estudiante") {
            setMessage({ type: "success", text: `¡Bienvenido ${result.session.name}! Redirigiendo a Enseñanza...` });
            setTimeout(() => (window.location.href = "/ensenanza"), 700);
          } else {
            setMessage({ type: "success", text: `¡Bienvenido, ${result.session.name}!` });
          }
        } else {
          setMessage({ type: "error", text: result.message });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <div class="min-h-[520px] flex items-center justify-center">
        <div class="animate-pulse text-gray-400 text-sm">Cargando JSON local...</div>
      </div>
    );
  }

  if (session) {
    return (
      <div class="w-full max-w-md mx-auto">
        <div class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div class="bg-gradient-to-br from-indigo-600 to-violet-600 px-8 py-8 text-white text-center">
            <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur">
              <span class="text-2xl font-bold">{session.name.charAt(0).toUpperCase()}</span>
            </div>
            <h2 class="text-xl font-semibold">¡Sesión iniciada!</h2>
            <p class="text-indigo-100 text-sm mt-1">{session.email}</p>
            <span class="inline-flex mt-3 px-3 py-1 bg-white/20 rounded-full text-xs font-medium tracking-wide uppercase backdrop-blur">
              {session.role === "admin"
                ? "Administrador"
                : session.role === "profesor"
                  ? "Profesor"
                  : session.role === "estudiante"
                    ? "Estudiante"
                    : "Sin asignar"}
            </span>
            {session.codigo && (
              <div class="mt-3 inline-flex flex-col items-center">
                <span class="text-xs text-indigo-200">Código único</span>
                <span class="mt-1 px-3 py-1 bg-white text-indigo-700 rounded-lg font-mono font-bold text-sm tracking-widest">{session.codigo}</span>
                <span class="text-[10px] text-indigo-200 mt-1">{session.role === "profesor" ? "100XXXX (profesor)" : "600XXXX (estudiante)"}</span>
              </div>
            )}
          </div>

          <div class="p-6 sm:p-8">
            {session.role === "sin_asignar" && (
              <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
                <p class="text-xs font-semibold text-amber-800">Cuenta sin asignar</p>
                <p class="text-xs text-amber-700 mt-1">Un administrador debe asignarte rol de Estudiante o Profesor en /admin.</p>
              </div>
            )}
            <div class="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
              <p class="text-sm text-gray-600 text-center">
                Has iniciado sesión correctamente. Accede a los módulos de la plataforma:
              </p>
            </div>

            {session.role === "admin" && (
              <a
                href="/admin"
                class="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition group mb-3"
              >
                <span class="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center">⚙️</span>
                <div class="flex-1">
                  <p class="font-medium text-gray-900 text-sm">Panel de Administración</p>
                  <p class="text-xs text-gray-500">Gestión de usuarios y asignación de roles</p>
                </div>
                <span class="text-amber-600">→</span>
              </a>
            )}

            <div class="grid gap-3 mb-6">
              <a
                href="/ensenanza"
                class="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition group"
              >
                <span class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                  📚
                </span>
                <div class="flex-1">
                  <p class="font-medium text-gray-900 text-sm">Módulo de Enseñanza</p>
                  <p class="text-xs text-gray-500">Contenido educativo y recursos</p>
                </div>
                <span class="text-gray-400 group-hover:text-indigo-600">→</span>
              </a>

              <a
                href="/actividades"
                class="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition group"
              >
                <span class="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition">
                  📝
                </span>
                <div class="flex-1">
                  <p class="font-medium text-gray-900 text-sm">Actividades y Tareas</p>
                  <p class="text-xs text-gray-500">Gestión para profesores y estudiantes</p>
                </div>
                <span class="text-gray-400 group-hover:text-indigo-600">→</span>
              </a>

              <a
                href="/dashboard"
                class="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition group"
              >
                <span class="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                  📊
                </span>
                <div class="flex-1">
                  <p class="font-medium text-gray-900 text-sm">Dashboard</p>
                  <p class="text-xs text-gray-500">Estadísticas y métricas</p>
                </div>
                <span class="text-gray-400 group-hover:text-indigo-600">→</span>
              </a>
            </div>

            <button
              onClick={handleLogout}
              class="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition text-sm"
            >
              Cerrar sesión
            </button>

            <button
              onClick={handleExportJson}
              class="w-full mt-3 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-black transition"
            >
              Descargar users.json (respaldo)
            </button>

            {message && (
              <div
                class={`mt-4 p-3 rounded-lg text-sm text-center ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>
        <p class="text-center text-xs text-gray-400 mt-4">
          Sesión en sessionStorage • JSON local (IndexedDB + /data/users.json) •{" "}
          <span class="font-mono">{new Date(session.loggedAt).toLocaleString("es-CO")}</span>
        </p>
      </div>
    );
  }

  return (
    <div class="w-full max-w-md mx-auto">
      <div class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div class="px-8 pt-8 pb-6 text-center">
          <div class="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span class="text-white text-xl font-bold">S</span>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Gestión Empresarial</h1>
          <p class="text-sm text-gray-500 mt-1">Plataforma educativa • Sintaxia</p>
        </div>

        <div class="px-6 sm:px-8">
          <div class="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage(null);
              }}
              class={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${
                mode === "login"
                  ? "bg-white shadow-sm text-gray-900 border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setMessage(null);
              }}
              class={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${
                mode === "register"
                  ? "bg-white shadow-sm text-gray-900 border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Crear cuenta
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} class="px-6 sm:px-8 pb-8 space-y-4">
          {mode === "register" && (
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-1.5">
                Nombre completo
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onInput={(e) => setName((e.target as HTMLInputElement).value)}
                placeholder="Ej: Juan Pérez"
                required={mode === "register"}
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition text-sm placeholder:text-gray-400"
              />
            </div>
          )}

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1.5">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="correo@ejemplo.com"
              required
              autocomplete="email"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition text-sm placeholder:text-gray-400"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1.5">
              Contraseña
            </label>
            <div class="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                placeholder={mode === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"}
                required
                autocomplete={mode === "login" ? "current-password" : "new-password"}
                class="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition text-sm placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.59 9.59 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {message && (
            <div
              class={`p-3 rounded-xl text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            class="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition text-sm"
          >
            {loading ? (
              <span class="inline-flex items-center gap-2">
                <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Procesando...
              </span>
            ) : mode === "login" ? (
              "Iniciar sesión"
            ) : (
              "Crear cuenta"
            )}
          </button>

          <p class="text-center text-xs text-gray-500 pt-2">
            {mode === "login" ? (
              <>
                ¿No tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setMessage(null);
                  }}
                  class="text-indigo-600 font-medium hover:text-indigo-700 hover:underline"
                >
                  Regístrate aquí
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setMessage(null);
                  }}
                  class="text-indigo-600 font-medium hover:text-indigo-700 hover:underline"
                >
                  Inicia sesión
                </button>
              </>
            )}
          </p>
        </form>

        <div class="bg-gray-50 border-t border-gray-100 px-6 sm:px-8 py-4">
          <p class="text-xs text-gray-400 text-center leading-relaxed">
            <span class="font-medium text-gray-500">Cuenta demo administrador:</span>
            <br />
            <span class="font-mono text-gray-600">administracion@sintaxia.com</span> •{" "}
            <span class="font-mono text-gray-600">12345678</span>
          </p>
        </div>
      </div>

      <p class="text-center text-xs text-gray-400 mt-6">
        Usuarios guardados en JSON local (<code class="bg-gray-100 px-1 rounded">src/data/users.json</code> + IndexedDB +{" "}
        <code class="bg-gray-100 px-1 rounded">/data/users.json</code>).
      </p>
    </div>
  );
}
