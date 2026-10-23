// src/utils/userStorage.ts
// Espacio de almacenamiento POR USUARIO para el progreso académico
// (alfabetización, laboratorio de actividades, quizzes): cada cuenta del
// navegador tiene su propio avance, las claves no se comparten.
//
// Convención: "<base>:u:<userId>" cuando hay sesión activa. Sin sesión se usa
// la clave base tal cual (las páginas con AppHeader exigen sesión, así que es
// el caso raro de transición antes del redirect).
//
// Nota: NO se reutiliza el avance histórico guardado en las claves globales
// antiguas (decisión de diseño: cada cuenta empieza de cero).
import { getSession } from "./auth";

/** Id del usuario en sesión activa, o null si no hay sesión. */
export function getSessionUserId(): string | null {
  try {
    return getSession()?.userId ?? null;
  } catch {
    return null;
  }
}

/** Clave de localStorage acotada a la cuenta en sesión. */
export function scopedStorageKey(base: string): string {
  const userId = getSessionUserId();
  return userId ? `${base}:u:${userId}` : base;
}
