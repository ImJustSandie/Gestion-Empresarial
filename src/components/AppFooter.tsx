export default function AppFooter() {
  return (
    <footer class="w-full bg-white border-t border-slate-200/80 py-12 px-6 sm:px-10 lg:px-14 mt-auto">
      <div class="w-full">
        <div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8 md:gap-12 items-start">
          {/* Logo / Identidad */}
          <div class="lg:col-span-2">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-[#5932EA] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                S
              </div>
              <span class="font-extrabold text-slate-900 text-xl tracking-tight leading-none">
                Sintaxia
              </span>
            </div>
            <p class="text-xs sm:text-sm text-slate-500 mt-3 max-w-sm leading-relaxed">
              Aprende crea y avanza ahora<br />
              No dejes que pase tu hora<br />
              No pierdas jamás la esperanza<br />
              Con Sintaxia todo se alcanza
            </p>
          </div>

          {/* Columna Explora */}
          <div>
            <h4 class="font-bold text-slate-900 text-sm mb-4 tracking-tight">
              Explora
            </h4>
            <ul class="space-y-2.5 text-sm text-slate-600">
              <li>
                <a href="/ensenanza" class="hover:text-[#5932EA] transition-colors">
                  Enseñanza
                </a>
              </li>
              <li>
                <a href="/alfabetizacion" class="hover:text-[#5932EA] transition-colors">
                  Alfabetizacion
                </a>
              </li>
              <li>
                <a href="/actividades" class="hover:text-[#5932EA] transition-colors">
                  Cursos / Actividades
                </a>
              </li>
              <li>
                <a href="/dashboard" class="hover:text-[#5932EA] transition-colors">
                  DashBoard
                </a>
              </li>
            </ul>
          </div>

          {/* Columna Ayuda */}
          <div>
            <h4 class="font-bold text-slate-900 text-sm mb-4 tracking-tight">
              Ayuda
            </h4>
            <ul class="space-y-2.5 text-sm text-slate-600">
              <li>
                <a href="#" class="hover:text-[#5932EA] transition-colors">
                  Centro de ayuda
                </a>
              </li>
              <li>
                <a href="#" class="hover:text-[#5932EA] transition-colors">
                  Preguntas frecuentes
                </a>
              </li>
              <li>
                <a href="#" class="hover:text-[#5932EA] transition-colors">
                  Contacto
                </a>
              </li>
              <li>
                <a href="#" class="hover:text-[#5932EA] transition-colors">
                  Términos y condiciones
                </a>
              </li>
            </ul>
          </div>

          {/* Columna Síguenos / Inspiracional */}
          <div>
            <h4 class="font-bold text-slate-900 text-sm mb-4 tracking-tight">
              Síguenos
            </h4>
            <div class="flex items-center gap-3 flex-wrap">
              <span class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#EDE9FE] hover:text-[#5932EA] transition-colors cursor-pointer">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M13.5 21v-7.5h2.5l.5-3h-3V8.6c0-.87.24-1.46 1.49-1.46H16.6V4.44c-.26-.03-1.16-.11-2.2-.11-2.18 0-3.67 1.33-3.67 3.77v2.4H8.23v3h2.5V21z" />
                </svg>
              </span>
              <span class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#EDE9FE] hover:text-[#5932EA] transition-colors cursor-pointer">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#EDE9FE] hover:text-[#5932EA] transition-colors cursor-pointer">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.53 3H20.5l-6.49 7.42L21.5 21h-5.96l-4.67-6.1L5.5 21H2.53l6.94-7.93L2.5 3h6.11l4.22 5.58L17.53 3zm-1.04 16.2h1.65L7.6 4.71H5.83l10.66 14.49z" />
                </svg>
              </span>
              <span class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#EDE9FE] hover:text-[#5932EA] transition-colors cursor-pointer">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6.94 6.75a2.13 2.13 0 1 1 0-4.25 2.13 2.13 0 0 1 0 4.25zM5.1 8.36h3.68V21H5.1zM10.9 8.36h3.53v1.73h.05c.49-.93 1.7-1.91 3.5-1.91 3.74 0 4.43 2.46 4.43 5.66V21h-3.68v-5.86c0-1.4-.03-3.2-1.95-3.2-1.95 0-2.25 1.52-2.25 3.1V21H10.9z" />
                </svg>
              </span>
              <span class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#EDE9FE] hover:text-[#5932EA] transition-colors cursor-pointer">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42A2.5 2.5 0 0 0 2.42 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .42 4.81 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.42-4.81zM10 15.02V8.98L15.2 12z" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        {/* Línea inferior con copyright */}
        <div class="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© 2025 Sintaxia. Todos los derechos reservados.</p>
          <p class="text-slate-400">Plataforma de Gestión Empresarial y Alfabetización en IA</p>
        </div>
      </div>
    </footer>
  );
}
