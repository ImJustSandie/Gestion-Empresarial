// src/utils/lessonImages.ts
// Resuelve `images/<archivo>` (ruta relativa dentro del .lesson) a la URL
// empaquetada por Vite desde `content/blocks/<bloque>/images/<lesson>/`.
// Rutas absolutas (/...), http(s) y data: pasan intactas.
// No sabe nada de diseño: solo mapea rutas.

const imageModules = import.meta.glob<string>(
  "../../content/blocks/*/images/*/*.{png,jpg,jpeg,webp,gif,svg,avif}",
  { eager: true, query: "?url", import: "default" },
);

const urlByKey = new Map<string, string>();
for (const [p, url] of Object.entries(imageModules)) {
  const m = p
    .replace(/\\/g, "/")
    .match(/content\/blocks\/([^/]+)\/images\/([^/]+)\/(.+)$/);
  if (m && typeof url === "string") urlByKey.set(`${m[1]}/${m[2]}/${m[3]}`, url);
}

export function resolveLessonImage(blockId: string | undefined, lessonId: string | undefined, src: string): string {
  if (!src || !blockId || !lessonId) return src;
  if (/^(https?:|data:|\/)/.test(src)) return src;
  if (!src.startsWith("images/")) return src;
  const file = src.slice("images/".length);
  return urlByKey.get(`${blockId}/${lessonId}/${file}`) ?? src;
}
