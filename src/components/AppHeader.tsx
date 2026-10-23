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
      <header class="border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-[0_2px_12px_rgba(0,0,0,0.04)] w-full">
        <div class="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between">
          <div class="h-8 w-32 bg-gray-100 animate-pulse rounded-xl" />
        </div>
      </header>
    );
  }

  if (!session) return null;

  const baseNavEstudiante = [
    { href: "/ensenanza", label: "Enseñanza" },
    { href: "/alfabetizacion", label: "Alfabetizacion IA" },
    { href: "/actividades", label: "Cursos/Actividades" },
  ];
  const baseNavProfesor = [
    { href: "/ensenanza", label: "Enseñanza" },
    { href: "/alfabetizacion", label: "Alfabetizacion IA" },
    { href: "/actividades", label: "Cursos/Actividades" },
    { href: "/dashboard", label: "DashBoard" },
  ];
  const baseNavAdmin = [
    { href: "/admin", label: "Admin" },
    { href: "/ensenanza", label: "Enseñanza" },
    { href: "/alfabetizacion", label: "Alfabetizacion IA" },
    { href: "/actividades", label: "Cursos/Actividades" },
    { href: "/dashboard", label: "DashBoard" },
  ];
  const navItems =
    session.role === "admin"
      ? baseNavAdmin
      : session.role === "profesor"
      ? baseNavProfesor
      : baseNavEstudiante;

  return (
    <header class="border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-[0_2px_12px_rgba(0,0,0,0.04)] w-full">
      <div class="w-full px-4 sm:px-8 lg:px-12 py-3.5 flex items-center justify-between gap-6">
        {/* Lado izquierdo: Logo + Navegación */}
        <div class="flex items-center gap-6 lg:gap-10">
          <a href="/" class="flex items-center group">
            <img
              src="/Images/sintaxia-logo.png"
              alt="Sintaxia"
              class="h-9 w-auto"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.src.includes("/images/sintaxia-logo.png")) {
                  target.src = "/images/sintaxia-logo.png";
                }
              }}
            />
          </a>

          {/* Navegación Desktop */}
          <nav class="hidden md:flex items-center gap-1 lg:gap-4">
            {navItems.map((item) => {
              const isActive = currentPath.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  class={`pb-2 pt-1 px-3 text-sm transition-all block text-center min-w-[70px] ${
                    isActive
                      ? "text-[#5932EA] font-semibold border-b-2 border-[#5932EA]"
                      : "text-slate-500 hover:text-slate-900 font-medium"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Lado derecho: Acciones + Cerrar Sesión + Avatar + Perfil */}
        <div class="flex items-center gap-3 sm:gap-4">
          {/* Botón Cerrar Sesión */}
          <button
            onClick={handleLogout}
            class="px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-[#5932EA] hover:bg-[#4E2AD0] text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow transition-all cursor-pointer whitespace-nowrap"
          >
            Cerrar sesión
          </button>

          {/* Información de usuario */}
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-full bg-[#5932EA] text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
              {session.name ? session.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div class="hidden sm:flex flex-col items-start leading-tight">
              <span class="text-sm font-bold text-[#1E293B] leading-tight">
                {session.name}
              </span>
              <span class="text-xs text-slate-500 leading-tight truncate max-w-[140px]">
                {session.email}
              </span>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EDE9FE] text-[#6D28D9]">
                  {session.role === "admin"
                    ? "Admin"
                    : session.role === "profesor"
                      ? "Profesor"
                      : session.role === "estudiante"
                        ? "Estudiante"
                        : "Sin asignar"}
                </span>
                {session.codigo && (
                  <span class="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                    {session.codigo}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación Mobile */}
      <div class="md:hidden border-t border-slate-100 bg-white px-3 py-2 flex gap-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = currentPath.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              class={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-[#EDE9FE] text-[#6C5CE7] font-semibold"
                  : "text-slate-600 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </div>
    </header>
  );
}
