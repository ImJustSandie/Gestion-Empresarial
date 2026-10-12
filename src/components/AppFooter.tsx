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
              Aprende hoy. Construye el mañana. No pierdas jamás la esperanza, con Sintaxia todo se alcanza.
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
            <div class="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>Aprende crea y avanza ahora</p>
              <p class="text-slate-400">No dejes que pase tu hora</p>
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
