// src/utils/auth.ts - Persistencia en JSON local (sin localStorage para usuarios)
import initialUsers from "../data/users.json";

export type Role = "admin" | "profesor" | "estudiante" | "sin_asignar";
// compatibilidad: "user" legacy = sin_asignar
export type LegacyRole = Role | "user";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  codigo?: string; // 7 dígitos: profesor 100XXXX, estudiante 600XXXX
  createdAt: string;
}

export interface Session {
  userId: string;
  email: string;
  name: string;
  role: Role;
  codigo?: string;
  loggedAt: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  profesor: "Profesor",
  estudiante: "Estudiante",
  sin_asignar: "Sin asignar",
};

export const ROLE_OPTIONS: { value: Role; label: string; desc: string }[] = [
  { value: "sin_asignar", label: "Sin asignar", desc: "Pendiente de asignación" },
  { value: "estudiante", label: "Estudiante", desc: "Acceso a actividades de estudiante" },
  { value: "profesor", label: "Profesor", desc: "Gestión de actividades y grupos" },
  { value: "admin", label: "Administrador", desc: "Acceso total + gestión de usuarios" },
];

export const ADMIN_CREDENTIALS = {
  email: "administracion@sintaxia.com",
  password: "12345678",
  name: "Administración",
} as const;

// Clave solo para sesión (sessionStorage, no localStorage). Usuarios van en JSON/IndexedDB.
const SESSION_KEY = "gestion-empresarial:session";
const IDB_DB_NAME = "gestion-empresarial";
const IDB_STORE = "kv";
const IDB_USERS_KEY = "users-json";

// Normaliza roles legacy y asegura tipos válidos
function normalizeRole(role: string): Role {
  const r = role?.toLowerCase();
  if (r === "admin") return "admin";
  if (r === "profesor") return "profesor";
  if (r === "estudiante") return "estudiante";
  if (r === "sin_asignar" || r === "sin asignar" || r === "user" || r === "usuario") return "sin_asignar";
  return "sin_asignar";
}

function isValidCodigo(codigo: string | undefined, role: Role): boolean {
  if (!codigo) return false;
  if (!/^\d{7}$/.test(codigo)) return false;
  if (role === "profesor") return codigo.startsWith("100");
  if (role === "estudiante") return codigo.startsWith("600");
  return false;
}

function generateCodigoForRole(role: "profesor" | "estudiante", existing: Set<string>): string {
  const prefix = role === "profesor" ? "100" : "600";
  let code: string;
  let attempts = 0;
  do {
    const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    code = `${prefix}${suffix}`;
    attempts++;
    if (attempts > 200) throw new Error("No se pudo generar código único");
  } while (existing.has(code));
  return code;
}

function migrateUsers(users: any[]): User[] {
  // primero normalizar roles
  const normalized = users.map((u) => ({
    ...u,
    role: normalizeRole(u.role),
  })) as User[];

  // recolectar códigos existentes válidos para evitar duplicados
  const existingCodes = new Set<string>(
    normalized.filter((u) => u.codigo && /^\d{7}$/.test(u.codigo)).map((u) => u.codigo as string)
  );

  // asignar / corregir códigos para profesor/estudiante
  for (const u of normalized) {
    if (u.role === "profesor" || u.role === "estudiante") {
      if (!isValidCodigo(u.codigo, u.role)) {
        // si tenía código inválido, liberar si estaba en set
        if (u.codigo) existingCodes.delete(u.codigo);
        const newCode = generateCodigoForRole(u.role, existingCodes);
        u.codigo = newCode;
        existingCodes.add(newCode);
      }
    } else {
      // admin / sin_asignar no debe tener código único de 7 con prefijo, limpiar si es inválido
      if (u.codigo && (u.codigo.startsWith("100") || u.codigo.startsWith("600"))) {
        // si es código tipo estudiante/profesor pero rol no corresponde, limpiar
        if (!isValidCodigo(u.codigo, u.role)) {
          delete u.codigo;
        }
      }
    }
  }
  return normalized;
}

// Cache en memoria sincronizado con JSON importado
let usersCache: User[] = migrateUsers([...(initialUsers as User[])]);
let cacheHydrated = false;
let hydratePromise: Promise<void> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

// ---------- IndexedDB helpers (JSON local) ----------
function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser() || !("indexedDB" in window)) {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await idbOpen();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await idbOpen();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // fallback silencioso: no persistido
  }
}

// ---------- Persistencia JSON ----------
async function persistUsersToIDB(users: User[]): Promise<void> {
  const json = JSON.stringify(users, null, 2);
  await idbSet(IDB_USERS_KEY, json);
}

async function hydrateFromJson(): Promise<void> {
  if (cacheHydrated) return;
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    // 1) Intentar cargar desde IndexedDB (JSON local en el navegador)
    const idbRaw = await idbGet(IDB_USERS_KEY);
    if (idbRaw) {
      try {
        const parsed = JSON.parse(idbRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const before = JSON.stringify(parsed);
          usersCache = migrateUsers(parsed as User[]);
          // asegurar admin existe
          ensureAdminInCache();
          // si la migración generó códigos, persistir
          if (JSON.stringify(usersCache) !== before) {
            await persistUsersToIDB(usersCache);
          }
          cacheHydrated = true;
          return;
        }
      } catch {}
    }

    // 2) Intentar cargar desde /data/users.json (archivo JSON local público)
    if (isBrowser()) {
      try {
        const res = await fetch("/data/users.json", { cache: "no-store" });
        if (res.ok) {
          const parsed = (await res.json()) as User[];
          if (Array.isArray(parsed)) {
            usersCache = migrateUsers(parsed);
            ensureAdminInCache();
            // guardar en IndexedDB para futuras cargas
            await persistUsersToIDB(usersCache);
            cacheHydrated = true;
            return;
          }
        }
      } catch {}
    }

    // 3) Fallback: usar import inicial
    usersCache = migrateUsers([...(initialUsers as User[])]);
    ensureAdminInCache();
    await persistUsersToIDB(usersCache);
    cacheHydrated = true;
  })();

  return hydratePromise;
}

function ensureAdminInCache(): void {
  const exists = usersCache.some(
    (u) => u.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase()
  );
  if (!exists) {
    usersCache = [
      {
        id: "admin-001",
        name: ADMIN_CREDENTIALS.name,
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
        role: "admin",
        createdAt: new Date().toISOString(),
      },
      ...usersCache,
    ];
  }
}

// ---------- API pública ----------

// Inicialización explícita para componentes (await antes de operar)
export async function initAuth(): Promise<void> {
  await hydrateFromJson();
  // sincronizar código en sesión si cambió por migración/asignación
  if (isBrowser()) {
    const sess = getSession();
    if (sess) {
      const user = findUserByEmail(sess.email);
      if (user && user.codigo !== sess.codigo) {
        saveSession({ ...sess, codigo: user.codigo, role: user.role });
      }
    }
  }
}

// Versión síncrona (usa cache). Llamar initAuth() antes para asegurar hidratación.
export function getUsers(): User[] {
  return [...usersCache];
}

export async function getUsersAsync(): Promise<User[]> {
  await hydrateFromJson();
  return [...usersCache];
}

export async function saveUsers(users: User[]): Promise<void> {
  usersCache = [...users];
  ensureAdminInCache();
  await persistUsersToIDB(usersCache);
}

export async function ensureAdminAccount(): Promise<void> {
  await hydrateFromJson();
  const before = usersCache.length;
  ensureAdminInCache();
  if (usersCache.length !== before) {
    await persistUsersToIDB(usersCache);
  }
}

export function findUserByEmail(email: string): User | undefined {
  return usersCache.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
}

export async function findUserByEmailAsync(email: string): Promise<User | undefined> {
  await hydrateFromJson();
  return findUserByEmail(email);
}

export function findUserByCodigo(codigo: string): User | undefined {
  const c = codigo.trim();
  if (!/^\d{7}$/.test(c)) return undefined;
  return usersCache.find((u) => u.codigo === c);
}

export async function findUserByCodigoAsync(codigo: string): Promise<User | undefined> {
  await hydrateFromJson();
  return findUserByCodigo(codigo);
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; message: string; user?: User }> {
  await hydrateFromJson();

  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();
  const password = data.password;

  if (!name || !email || !password) {
    return { success: false, message: "Todos los campos son obligatorios." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: "El correo no tiene un formato válido." };
  }
  if (password.length < 6) {
    return {
      success: false,
      message: "La contraseña debe tener al menos 6 caracteres.",
    };
  }
  if (findUserByEmail(email)) {
    return { success: false, message: "Ya existe una cuenta con ese correo." };
  }

  const role: User["role"] =
    email === ADMIN_CREDENTIALS.email.toLowerCase() ? "admin" : "sin_asignar";

  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    email,
    password,
    role,
    createdAt: new Date().toISOString(),
  };

  usersCache = [...usersCache, newUser];
  await persistUsersToIDB(usersCache);
  return { success: true, message: "Cuenta creada correctamente.", user: newUser };
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<{ success: boolean; message: string; session?: Session }> {
  await hydrateFromJson();

  const email = data.email.trim().toLowerCase();
  const password = data.password;

  if (!email || !password) {
    return { success: false, message: "Correo y contraseña son obligatorios." };
  }

  const user = findUserByEmail(email);
  if (!user) {
    return { success: false, message: "No existe una cuenta con ese correo." };
  }
  if (user.password !== password) {
    return { success: false, message: "Contraseña incorrecta." };
  }

  const session: Session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    codigo: user.codigo,
    loggedAt: new Date().toISOString(),
  };
  saveSession(session);
  return { success: true, message: "Sesión iniciada.", session };
}

// ---------- Sesión (sessionStorage, no localStorage) ----------
export function saveSession(session: Session): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export function getSession(): Session | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function logout(): void {
  clearSession();
}

export function getCurrentUser(): User | null {
  const session = getSession();
  if (!session) return null;
  return findUserByEmail(session.email) ?? null;
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

// ---------- Administración de usuarios (solo admin) ----------
export async function updateUserRole(
  userId: string,
  newRole: Role
): Promise<{ success: boolean; message: string }> {
  await hydrateFromJson();
  const idx = usersCache.findIndex((u) => u.id === userId);
  if (idx === -1) return { success: false, message: "Usuario no encontrado." };
  const target = usersCache[idx];
  // No permitir cambiar el propio admin principal por error
  if (target.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() && newRole !== "admin") {
    return { success: false, message: "No se puede degradar la cuenta principal de administración." };
  }
  if (!["admin", "profesor", "estudiante", "sin_asignar"].includes(newRole)) {
    return { success: false, message: "Rol no válido." };
  }

  let newCodigo: string | undefined = target.codigo;

  if (newRole === "profesor" || newRole === "estudiante") {
    const existingCodes = new Set(usersCache.filter((u, i) => i !== idx && u.codigo).map((u) => u.codigo as string));
    // si ya tiene código válido para el nuevo rol y no es duplicado, mantenerlo
    if (!isValidCodigo(target.codigo, newRole) || existingCodes.has(target.codigo as string)) {
      newCodigo = generateCodigoForRole(newRole, existingCodes);
    } else {
      newCodigo = target.codigo;
    }
  } else {
    // admin y sin_asignar no llevan código de 7 con prefijo
    newCodigo = undefined;
  }

  usersCache[idx] = { ...target, role: newRole, codigo: newCodigo };
  await persistUsersToIDB(usersCache);
  // Si es el usuario en sesión, actualizar sesión
  const sess = getSession();
  if (sess && sess.userId === userId) {
    saveSession({ ...sess, role: newRole, codigo: newCodigo });
  }
  const codeInfo = newCodigo ? ` Código: ${newCodigo}.` : "";
  return { success: true, message: `Rol actualizado a ${ROLE_LABELS[newRole]}.${codeInfo}` };
}

export async function deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
  await hydrateFromJson();
  const target = usersCache.find((u) => u.id === userId);
  if (!target) return { success: false, message: "Usuario no encontrado." };
  if (target.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase()) {
    return { success: false, message: "No se puede eliminar la cuenta de administración principal." };
  }
  usersCache = usersCache.filter((u) => u.id !== userId);
  await persistUsersToIDB(usersCache);
  return { success: true, message: "Usuario eliminado." };
}

export async function getUsersFiltered(query: string, roleFilter: Role | "todos"): Promise<User[]> {
  await hydrateFromJson();
  let list = [...usersCache];
  if (roleFilter !== "todos") {
    list = list.filter((u) => u.role === roleFilter);
  }
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }
  return list;
}

export function isAdmin(session: Session | null): boolean {
  return session?.role === "admin";
}

// Utilidad: exportar JSON para descarga manual (respaldo)
export function exportUsersJson(): string {
  return JSON.stringify(usersCache, null, 2);
}

export async function resetUsersToInitial(): Promise<void> {
  usersCache = migrateUsers([...(initialUsers as User[])]);
  ensureAdminInCache();
  await persistUsersToIDB(usersCache);
}
