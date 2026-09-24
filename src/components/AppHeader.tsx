import { useEffect, useState } from "preact/hooks";
import { initAuth, getSession, clearSession, type Session } from "../utils/auth";

interface Props {
  currentPath?: string;
}

export default function AppHeader({ currentPath = "" }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      await initAuth();
      const s = getSession();
      if (!s) {
        window.location.href = "/";
        return;
      }
      setSession(s);
      setHydrated(true);
    })();
  }, []);

  const handleLogout = () => {
    clearSession();
    window.location.href = "/";
  };

  if (!hydrated) {
    return (
      <header class="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div class="container mx-auto px-4 py-3 flex items-center justify-between">
          <div class="h-6 w-32 bg-gray-100 animate-pulse rounded" />
        </div>
      </header>
    );
  }

  if (!session) return null;

  const baseNavEstudiante = [
    { href: "/ensenanza", label: "Enseñanza", icon: "📚" },
    { href: "/actividades", label: "Cursos / Actividades", icon: "📝" },
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
  ];
  const baseNavProfesor = [
    { href: "/actividades", label: "Cursos / Actividades", icon: "📝" },
    { href: "/ensenanza", label: "Enseñanza", icon: "📚" },
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
  ];
  const baseNav = session.role === "profesor" ? baseNavProfesor : baseNavEstudiante;
  const navItems = session.role === "admin" ? [{ href: "/admin", label: "Admin", icon: "⚙️" }, ...baseNav] : baseNav;

  return (
    <header class="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div class="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div class="flex items-center gap-6">
          <a href="/" class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
              <span class="text-white text-sm font-bold">S</span>
            </div>
            <span class="font-semibold text-gray-900 hidden sm:inline">Sintaxia</span>
          </a>

          <nav class="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentPath.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  class={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span>{item.icon}</span> {item.label}
                </a>
              );
            })}
          </nav>
        </div>

        <div class="flex items-center gap-3">
          <div class="hidden sm:flex flex-col items-end">
            <span class="text-sm font-medium text-gray-900 leading-none">{session.name}</span>
            <span class="text-xs text-gray-500">{session.email}</span>
            {session.codigo && <span class="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-900 text-white tracking-wider">{session.codigo}</span>}
          </div>
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
            {session.name.charAt(0).toUpperCase()}
          </div>
          <span
            class={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ${
              session.role === "admin"
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : session.role === "profesor"
                  ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                  : session.role === "estudiante"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
            }`}
          >
            {session.role === "admin"
              ? "Admin"
              : session.role === "profesor"
                ? "Profesor"
                : session.role === "estudiante"
                  ? "Estudiante"
                  : "Sin asignar"}
          </span>
          <button
            onClick={handleLogout}
            class="ml-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
          >
            Salir
          </button>
        </div>
      </div>

      <div class="md:hidden border-t border-gray-100 bg-white px-2 py-2 flex gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = currentPath.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              class={`flex-1 text-center px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                isActive ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {item.icon} {item.label}
            </a>
          );
        })}
      </div>
    </header>
  );
}
