// src/components/PersonajeIcon.tsx
// Icono de personaje (PNG con transparencia) del laboratorio de actividades.
// Sigue el patrón de marca del proyecto: intenta /Images/... y si el hosting
// distingue mayúsculas hace fallback a /images/.... La animación NO vive aquí:
// el padre la aplica con utilidades Tailwind (animate-levitar / animate-inclinar,
// definidas en src/styles/global.css).
import type { CSSProperties } from "preact";

interface PersonajeIconProps {
  /** Ruta pública del personaje, p. ej. "/Images/Personajes/x.png". */
  src: string;
  alt?: string;
  class?: string;
  style?: CSSProperties;
  loading?: "lazy" | "eager";
}

export default function PersonajeIcon({ src, alt = "", class: className, style, loading = "lazy" }: PersonajeIconProps) {
  const fallback = src.replace("/Images/", "/images/");
  return (
    <img
      src={src}
      alt={alt}
      class={className}
      style={style}
      loading={loading}
      draggable={false}
      onError={(e) => {
        const el = e.currentTarget;
        if (fallback !== src && !el.src.endsWith(fallback)) el.src = fallback;
      }}
    />
  );
}
