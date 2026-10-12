# AGENTS.md — Guía para agentes IA del proyecto "Gestión Empresarial"

> Lee este archivo antes de hacer cualquier cambio. Contiene toda la arquitectura, asi mismo, actualizar este archivo cada vez que se realicen cambios grandes en la arquitectura del mismo
> convenciones y recetas para modificar el proyecto sin tener que explorarlo desde cero.
> Idioma del proyecto y de la UI: **español**. Responde y documenta en español.

---

## 1. Qué es este proyecto (descripción general)

Plataforma web educativa **"Gestión Empresarial" (marca UI: Sintaxia)** construida con
**Astro 7 + Preact 10 + Tailwind CSS 4**. Es un sitio **100 % estático en producción**:
no hay backend ni base de datos desplegada.

Dos grandes frentes funcionales:

1. **Gestión académica** — login/roles, cursos, actividades/tareas, administración
   de usuarios, dashboard (placeholder).
2. **Alfabetización en IA generativa** — el corazón de contenido: 5 bloques,
   ~33 lecciones (`.lesson`), visor de lecciones, 3 tipos de actividades
   interactivas y un editor oculto de contenido.

Toda la persistencia de usuario/contenido en el navegador es **local**:
`localStorage` (progreso, sesión, quizzes, overrides) + **IndexedDB**
(usuarios, cursos, actividades como "JSON local").

---

## 2. Stack y requisitos

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | Astro `^7.2.10` (`astro.config.mjs`) | `output` por defecto (estático). Integración `preact()` + plugin Vite de `tailwindcss()` |
| UI interactiva | Preact `^10.29.8` (`@astrojs/preact`) | Todo lo interactivo es componente `.tsx` con `client:load` |
| Estilos | Tailwind CSS `^4.3.3` (`@tailwindcss/vite`) | Un solo CSS global: `src/styles/global.css` → `@import "tailwindcss";` |
| Lenguaje | TypeScript estricto (`tsconfig.json` extiende `astro/tsconfigs/strict`, `jsx: react-jsx`, `jsxImportSource: preact`) | Tipar entidades y utils |
| Persistencia | `localStorage` + IndexedDB (DB `gestion-empresarial`, store `kv`) | Sin backend en producción |
| Backend dev-only | `server/content-server.mjs` (solo `node:http` + `node:fs`, sin dependencias) | Puerto `127.0.0.1:8787`. Nunca se despliega |
| Node | `>=22.12.0` (`package.json`) | |

---

## 3. Comandos (desde la raíz)

| Comando | Qué hace |
|---|---|
| `npm install` | Instalar dependencias |
| `npm run dev` | Solo frontend Astro en `http://localhost:4321` |
| `npm run content:server` (`node server/content-server.mjs`) | Solo backend de contenido dev-only en `http://127.0.0.1:8787` |
| `npm run dev:all` (`node server/dev-all.mjs`) | **Recomendado en local**: frontend + content-server juntos, con apagado conjunto |
| `npm run build` | Build estático a `./dist/` (congela `content/blocks/` como HTML) |
| `npm run preview` | Previsualizar el build |

Variables: `CONTENT_PORT` cambia el puerto del content-server (defecto `8787`).

---

## 4. Estructura de carpetas (mapa)

```text
/
├── AGENTS.md                    ← este archivo
├── RULES.md                     ← reglas originales del proyecto (no borrar)
├── astro.config.mjs             ← preact() + tailwindcss()
├── package.json / tsconfig.json
├── content/blocks/              ← CONTENIDO EDUCATIVO (fuente de verdad en build)
│   ├── order.json               ← orden de bloques ["bloque-1",...,"bloque-5"]
│   └── <bloque-id>/
│       ├── block.json           ← { title, short?, description, icon?, color? }
│       ├── order.json           ← orden de lessons del bloque (opcional)
│       ├── lessons/*.lesson     ← lecciones (formato propio, ver §7)
│       └── images/<lesson-id>/<archivo> ← imágenes de cada lección
├── src/
│   ├── pages/                   ← rutas Astro (cada .astro = ruta)
│   │   ├── index.astro          ← / (login Auth)
│   │   ├── ensenanza.astro      ← /ensenanza
│   │   ├── actividades.astro    ← /actividades (cursos/actividades)
│   │   ├── dashboard.astro      ← /dashboard (placeholder "en construcción")
│   │   ├── admin.astro          ← /admin (solo rol admin)
│   │   ├── editor.astro         ← /editor (OCULTA, noindex, editor de contenido)
│   │   ├── alfabetizacion.astro ← /alfabetizacion (portada de bloques)
│   │   ├── lecciones/[id].astro ← /lecciones/:id (visor, getStaticPaths de todas)
│   │   └── alfabetizacion/
│   │       ├── actividades.astro                ← /alfabetizacion/actividades (índice)
│   │       └── actividades/
│   │           ├── elegir.astro / detector.astro / prompt-lab.astro  ← portadas por tipo
│   │           └── elegir/[slug].astro, detector/[slug].astro,
│   │               prompt-lab/[slug].astro       ← caso concreto por slug
│   ├── components/              ← Preact interactivos (ver §6)
│   ├── utils/                   ← lógica pura (ver §6)
│   ├── data/                    ← JSON fuente: users.json, courses.json,
│   │                              actividades-{elegir,detector,promptlab}.json,
│   │                              alfabetizacion.ts (legacy)
│   ├── types/lesson.d.ts        ← declara `*.lesson?raw` como string
│   └── styles/global.css        ← solo `@import "tailwindcss";`
├── server/
│   ├── content-server.mjs       ← API dev-only de bloques/lessons/imágenes
│   ├── dev-all.mjs              ← lanza frontend + content-server
│   └── migrate-alfabetizacion.mjs ← script de migración puntual (legacy)
├── public/
│   ├── data/users.json, courses.json ← copia pública para `fetch("/data/...")`
│   ├── images/logos/*.png     ← logos de curso (`logo-01.png`…`logo-15.png` desde `public/Images/Logos/`)
│   ├── Images/Logos/          ← logos individuales 200×200 (fuente de `/images/logos/`)
│   ├── Images/Iconos educativos.png ← sprite legacy (1536×1024, 20 logos; no usar como fuente)
│   ├── lessons/ / multimedia/   ← assets estáticos legacy
│   └── favicon.svg / favicon.ico
└── dist/                        ← build (generado, no editar)
```

---

## 5. Rutas y navegación

- `/` — login/registro + estado de sesión (`Auth.tsx`). Redirige por rol:
  `admin → /admin`, `profesor → /actividades`, `estudiante → /ensenanza`,
  `sin_asignar → se queda en /` con aviso.
- `/ensenanza` — `EnsenanzaView.tsx`: explorador de **cursos del usuario** (búsqueda,
  grid paginado 6 por página, tarjeta con color + logo del curso y nº de
  actividades), estado "sin asignar" y estado vacío. Es la landing del `estudiante`.
- `/alfabetizacion` — `AlfabetizacionView.tsx` (5 bloques desde `content/blocks/`).
  Query `?bloque=<id>` para volver al bloque tras ver una lección.
- `/lecciones/:id` — visor de lección (`LessonRenderer.tsx` + navegación
  anterior/siguiente dentro del bloque).
- `/actividades` — `ActividadesView.tsx` (cursos + actividades por curso).
- `/alfabetizacion/actividades` — índice de tipos (`ActividadesIndice.tsx`).
- `/alfabetizacion/actividades/elegir|detector|prompt-lab` — portada de cada tipo
  (`TipoActividad.tsx`).
- `/alfabetizacion/actividades/<tipo>/<slug>` — caso concreto
  (`ElegirRespuesta.tsx`, `DetectorAlucinaciones.tsx`, `PromptLab.tsx`).
- `/dashboard` — **placeholder**: tarjeta "en construcción". Aquí irán métricas
  agregadas de enseñanza + actividades (leer de `localStorage`/IndexedDB).
- `/admin` — `AdminPanel.tsx` con 2 pestañas: **Usuarios** (roles, códigos,
  crear/eliminar) y **Cursos** (crear con color + logo, gestionar asignación de
  profesores/estudiantes por lista o por código único, exportar JSON). Solo admin.
- `/editor` — **oculta** (`<meta robots noindex>`, no está en el nav):
  `LessonStudio.tsx` = editor de bloques + lessons + imágenes.

`AppHeader.tsx` es el header global: recibe `currentPath` (marca el enlace activo),
exige sesión (si no hay, redirige a `/`), muestra nav según rol
(estudiante/profesor/admin) con versión desktop + móvil, marca Sintaxia,
avatar, nombre, email, rol, código y botón "Cerrar Sesion".

`AppFooter.tsx` es el footer global (sin props, sin auth-guard): marca Sintaxia,
tagline, columnas **Explora** (Enseñanza / Alfabetizacion / Cursos·Actividades /
DashBoard), **Ayuda** (enlaces `#`) y **Síguenos**, más la barra de copyright.

**Patrón de layout de páginas (estético):** todas las páginas principales importan
`AppHeader` + `AppFooter` y usan `<body class="bg-gray-50 text-gray-900 min-h-screen
flex flex-col">`, con el contenido en un `flex-1` (para pegar el footer al fondo) y
`<AppFooter client:load />` al final. **Excepción:** `/editor` (`editor.astro`) no usa
footer.

---

## 6. Componentes y utils (qué toca cada archivo)

### 6.1 `src/components/` (Preact, todos usados con `client:load`)

| Archivo | Responsabilidad | No tocar / cuidado |
|---|---|---|
| `AppHeader.tsx` | Auth-guard + nav por rol; prop `currentPath`; marca Sintaxia; botón "Cerrar Sesion" | Cambiar nav aquí afecta a todas las páginas |
| `AppFooter.tsx` | Footer global de marca (Explora / Ayuda / Síguenos + copyright) | Sin props y sin auth-guard; solo maquetación |
| `Auth.tsx` | Login/registro/sesión, export `users.json` | Usa `src/utils/auth.ts` |
| `AdminPanel.tsx` | Panel admin en 2 pestañas: **Usuarios** (listar/buscar/filtrar, cambiar rol, eliminar, stats por rol, exportar `users.json`) y **Cursos** (crear con color `COURSE_COLORS` + logo `COURSE_LOGOS`, gestionar asignación de profesores/estudiantes por lista **o por código único `600XXXX`** vía `findUserByCodigo`, exportar `courses.json`) | Solo rol `admin`; usa `utils/auth.ts` + `utils/courses.ts` |
| `EnsenanzaView.tsx` | Explorador de cursos del usuario logueado: búsqueda, grid paginado (6/pág.), tarjeta por curso (código, color+logo, nº profes/estudiantes y actividades), estados "sin asignar"/vacío | Lee `getCoursesForUser` + `getActivities` de `utils/courses.ts`; redirige a `/` si no hay sesión |
| `ActividadesView.tsx` | Cursos + actividades (crear/asignar/listar/borrar) | Usa `src/utils/courses.ts` + `SelectMenu.tsx` para los desplegables de curso/tipo |
| `SelectMenu.tsx` | Dropdown reutilizable estilo marca (reemplaza `<select>` nativo): trigger + panel `rounded-2xl`, estados seleccionado/activo, cierre al clic fuera/Escape y navegación por teclado (`ArrowUp/Down`, `Enter`/`Space`, `Tab`). Props: `options` (`{value,label,meta?}`), `value`, `onChange`, `ariaLabel`, `icon`, `wrapperClass`, `textClass`, `placeholder` | Genérico; no meter lógica de negocio |
| `AlfabetizacionView.tsx` | Portada de bloques, progreso por bloque | Lee `BLOQUES_ALFABETIZACION` de `alfabetizacionContent.ts` |
| `ActividadesIndice.tsx` | Índice de los 3 tipos de actividades | Lee `TIPOS_ACTIVIDADES` |
| `TipoActividad.tsx` | Portada de un tipo (lista de casos + estado) | Lee `listaPorTipo()` + `estadoCaso()` |
| `ElegirRespuesta.tsx` | Actividad "¿Cuál respuesta elegirías?" (A/B/C) | Datos de `actividades-elegir.json` |
| `DetectorAlucinaciones.tsx` | Actividad forense (clasificar afirmaciones) | Datos de `actividades-detector.json` |
| `PromptLab.tsx` | Actividad "arma tu prompt por piezas" | Datos de `actividades-promptlab.json` |
| `QuizBlock.tsx` | Quiz inline dentro de lecciones | Guarda en `localStorage` clave `gestion-empresarial:quiz` |
| `LessonRenderer.tsx` | Render de `Lesson` (celdas → HTML + richtext + imágenes) | Presentacional; el parseo vive en `utils/lesson.ts` |
| `LessonStudio.tsx` | Editor completo (bloques/lessons/imágenes, dual backend/local) | El más complejo; usa `utils/contentApi.ts` + `utils/lessons.ts` |
| `LessonCellEditor.tsx` / `LessonCellForm.tsx` | Edición de una celda / crear celda | Operan con `moveCell/createCell/cellWithText` de `utils/lesson.ts` |
| `LessonOrderEditor.tsx` | Reordenar lessons (guarda en `localStorage`) | Aviso: permanente solo vía `/editor` + backend |
| `RichToolbar.tsx` | Barra de formato richtext (`** * __ `code` == ==`, `{color}`, `{bg}`, `{font}`, `{size}`) | Valida con `utils/richtext.ts` |
| `SplitView.tsx` | Layout editor/preview (reparto en `localStorage`) | Clave `gestion-empresarial:editor-split` |

### 6.2 `src/utils/` (lógica pura, sin diseño)

| Archivo | Responsabilidad |
|---|---|
| `lesson.ts` | **Núcleo `.lesson`**: tipos `LessonMeta/LessonBlock/Lesson`, `parseLesson()`, `serializeLesson()`, `moveCell/createCell/cellToEditable/cellWithText/parseQuizText/quizToEditable`. Las celdas tienen `id` estable vía `{#id}` |
| `lessons.ts` | Carga contenido vía `import.meta.glob` (`block.json`, `order.json`, `*.lesson?raw`), códigos posicionales `N.M`, overrides de navegador (`lesson-custom`, `lesson-draft`, `lessons-order`). API: `getAllBlocks/getBlock/getAllLessons/getLessonsByBlock/getLessonById/moveId` |
| `lessonImages.ts` | Resuelve `images/<file>` → URL Vite desde `content/blocks/<b>/images/<lesson>/`. Absolutas/http/data: pasan intactas |
| `richtext.ts` | Sintaxis inline + validación (`toSafeColor`, `fontStackFor`, `clampSize`, paletas). Antídoto contra inyección de estilos |
| `contentApi.ts` | Cliente del content-server (`http://127.0.0.1:8787`). `backendAvailable()` con caché 10 s. `api.blocks/createBlock/updateBlock/deleteBlock/saveBlocksOrder/lessonSource/saveLessonSource/createLesson/deleteLesson/saveLessonsOrder/moveLesson/listImages/uploadImage` |
| `auth.ts` | Usuarios + sesión. Roles `admin/profesor/estudiante/sin_asignar` (+ legacy `user`). Códigos: profesor `100XXXX`, estudiante `600XXXX`. Búsqueda por código con `findUserByCodigo`/`findUserByCodigoAsync`. Admin seed `administracion@sintaxia.com / 12345678`. Persistencia: IndexedDB `users-json` + `fetch("/data/users.json")` + import inicial; sesión en `localStorage` |
| `courses.ts` | Cursos (`code` auto de 6 dígitos) + actividades (`tarea/actividad/evaluacion`), asignación de usuarios. API: `getCourses/getCoursesForUser/createCourse/deleteCourse/assignUserToCourse/unassignUserFromCourse/getActivities/createActivity/deleteActivity/exportCoursesJson/exportActivitiesJson`. Campos opcionales de apariencia: `color` (clave de `COURSE_COLORS`, `COURSE_COLOR_IDS` = 15 colores) e `icon` (logo `logo-01.png`…`logo-15.png` de `/images/logos/`, `COURSE_LOGOS`). IndexedDB `courses-json` + `activities-json` |
| `alfabetizacionContent.ts` | Adapta `content/blocks/` → `{ Bloque, Subtema }` para la vista. Convenciones: `## Temáticas|Temas + lista`, `## Referentes + lista`, `## Alcance + párrafos`, `> Actividad: ...`; sin sección Temáticas, los `##/###` son temáticas |
| `alfabetizacionActividades.ts` | Tipos + carga de los 3 JSON de actividades, índice `MODULOS_ACTIVIDADES`, `TIPOS_ACTIVIDADES`, `actividadPorSlug`, persistencia `gestion-empresarial:actividades-v2`, `estadoCaso()` |

### 6.3 `src/data/`

`users.json` (seed, solo admin), `courses.json` (`[]`), `actividades-elegir.json`,
`actividades-detector.json`, `actividades-promptlab.json` (casos por tipo;
**añadir un objeto = nuevo caso, las rutas se generan solas**),
`alfabetizacion.ts` (módulo legacy, preferir `utils/alfabetizacionContent.ts`).

### 6.4 Sistema de diseño (marca Sintaxia)

- **Paleta de marca** (violeta Sintaxia), usada como valores hex arbitrarios de Tailwind
  (`bg-[#5932EA]`, `text-[#5932EA]`, …):
  - Primario: `#5932EA`
  - Variantes/hover: `#7C5CE9`, `#6C5CE7`, `#5E3FE6`
  - Badges/acentos: `#6D28D9` (texto) sobre `#EDE9FE` (fondo)
- Se aplica en `AppHeader.tsx`, `AppFooter.tsx`, `EnsenanzaView.tsx` y
  `AlfabetizacionView.tsx` (logo "S", enlaces/nav activos, botones, barras de progreso,
  badges de rol).
- **Sin CSS global extra:** `src/styles/global.css` sigue siendo solo
  `@import "tailwindcss";`; todo el estilo son clases utilitarias en los componentes.
- **Layout de páginas:** header sticky (`bg-white/95 backdrop-blur-md`) + footer de marca
  pegado al fondo (ver §5). El contenido principal vive en un `flex-1`.
- **Marca UI:** "Sintaxia" (caja "S" + wordmark) enlaza a `/`; alias del proyecto
  "Gestión Empresarial" (títulos de página).

---

## 7. Sistema de contenido (bloques + `.lesson`) — lo más importante

### 7.1 Estructura en disco

- `content/blocks/order.json`: array de ids de bloque = orden global.
- `content/blocks/<bloque>/block.json`: `{ title, short?, description, icon?, color? }`.
- `content/blocks/<bloque>/order.json`: array de ids de lesson = orden del bloque.
- `content/blocks/<bloque>/lessons/<lesson-id>.lesson`: la lección.
- `content/blocks/<bloque>/images/<lesson-id>/<file>`: imágenes (se crea al subir
  la primera). Extensiones: `png/jpg/jpeg/webp/gif/svg/avif`, máx 8 MB.

Slugs válidos: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` (minúsculas, números, guiones).

### 7.2 Formato `.lesson`

```text
---
title: Mi lección            # obligatorio (frontmatter YAML mínimo)
description: Resumen corto   # opcional; también id/code/block
---

# Título {#titulo}            ← cada bloque es una CELDA con {#id-estable}

Párrafo de texto… {#intro}

## Sección {#seccion}

- Punto 1 {#lista-id}        ← el {#id} de la 1ª línea nombra TODA la lista
- Punto 2

> Una cita {#cita}

![Alt](images/foto.jpg) {#img-1}   ← relativa → content/.../images/<lesson>/foto.jpg

--- {#corte}                 ← divisor

:::quiz {#quiz-1}            ← bloque quiz; correcta con `- [x]`
Pregunta…
- [x] Opción correcta
- Opción B
> Explicación opcional
:::
```

Tipos de celda (`LessonBlock`): `h1/h2/h3/paragraph/image/quote/list/quiz/divider`.
Richtext inline (ver `richtext.ts`): `**negrita** *cursiva* __subrayado__`
`` `código` `` `==resaltado==` `{color:red|texto}` `{bg:yellow|texto}`
`{font:Georgia|texto}` `{size:20|texto}`.

### 7.3 Reglas de código y orden

- El `code` es **posicional y automático**: `<nº bloque>.<posición>` (base 1).
  Nunca se edita a mano; `lessons.ts:assignCodes()` y el content-server lo recalculan.
- Orden de bloques: `content/blocks/order.json`. Orden de lessons:
  `content/blocks/<b>/order.json` (fallback: orden por `code`).
- Mover celdas = reordenar array `blocks` + `serializeLesson()`.
  Mover lessons = reordenar ids + guardar `order.json`.
- Build estático **congela** el contenido del repo: lo desplegado = estado al hacer
  `npm run build`. Los overrides de `localStorage` solo se ven en ese navegador.

### 7.4 Editor `/editor` (dual)

- **Con backend** (`npm run content:server` o `dev:all`): escribe directo a
  `content/blocks/` vía `utils/contentApi.ts` (CRUD bloques/lessons/órdenes/
  mover entre bloques/imágenes base64).
- **Sin backend**: modo navegador — guarda en `localStorage`
  (`lesson-custom:{id}`, `lesson-draft:{id}`, `lessons-order`) + botón
  exportar/descargar el `.lesson` para luego copiarlo al repo.

---

## 8. Auth, roles y persistencia (claves exactas)

| Dato | Dónde vive | Clave / detalle |
|---|---|---|
| Sesión | `localStorage` | `gestion-empresarial:session` (+ migración legacy de `sessionStorage`) |
| Usuarios | IndexedDB `gestion-empresarial/kv:users-json` → `fetch /data/users.json` → import `src/data/users.json` | Roles `admin/profesor/estudiante/sin_asignar`; códigos profesor `100XXXX`, estudiante `600XXXX` |
| Cursos/Actividades | IndexedDB `courses-json`, `activities-json` | Código curso auto 6 dígitos; tipos `tarea/actividad/evaluacion` |
| Progreso alfabetización | `localStorage` | `gestion-empresarial:alfabetizacion-progress` |
| Progreso actividades lab | `localStorage` | `gestion-empresarial:actividades-v2` |
| Quizzes inline | `localStorage` | `gestion-empresarial:quiz` |
| Overrides editor | `localStorage` | `gestion-empresarial:lessons-order`, `gestion-empresarial:lesson-custom:{id}`, `gestion-empresarial:lesson-draft:{id}` |
| Split editor | `localStorage` | `gestion-empresarial:editor-split` |

Admin seed: `administracion@sintaxia.com` / `12345678` (asegurado por
`ensureAdminAccount()`; `updateUserRole/deleteUser` protegen esa cuenta).
`public/data/*.json` son copias para el `fetch` inicial; la fuente editable en
código es `src/data/*.json`.

---

## 9. API dev-only (`server/content-server.mjs`)

Base `http://127.0.0.1:8787`. Solo `GET/POST/PATCH/PUT/DELETE/OPTIONS` + CORS `*`.
Límite cuerpo 2 MB (imágenes base64: 8 MB decodificados).

```text
GET    /api/health
GET    /api/blocks                          → [{ id,title,short?,description,icon,color, lessons:[{id,title,code}] }]
POST   /api/blocks                          { id?, title*, description?, icon?, color? }
PUT    /api/blocks-order                    { ids: [...] }  # debe contener EXACTO los existentes
PATCH  /api/blocks/:id                      { title?, short?, description?, icon?, color? }
DELETE /api/blocks/:id                      # borra carpeta + actualiza order.json
POST   /api/blocks/:id/lessons              { id?, title?, source? }
PUT    /api/blocks/:id/lessons-order        { ids: [...] }
GET    /api/blocks/:bid/lessons/:lid        → { id, source }
PUT    /api/blocks/:bid/lessons/:lid        { source }
DELETE /api/blocks/:bid/lessons/:lid        # borra .lesson + carpeta images/<lid>
GET    /api/blocks/:bid/lessons/:lid/images → { images: [{file, src:"images/<file>"}] }
POST   /api/blocks/:bid/lessons/:lid/images { filename, data(base64) }
POST   /api/lessons/move                    { lessonId, from, to }  # mueve .lesson + images/
```

Protecciones: validación de slug (anti path-traversal), `409` si existe,
`400` para ids/JSON inválidos, `404` para bloque/lección inexistente.

---

## 10. Convenciones obligatorias (de `RULES.md`)

1. **Sin backend en producción**: no crear ni consumir APIs externas (excepción:
   `content-server` solo local). El build no depende de él.
2. **Sin base de datos**: solo `localStorage`/IndexedDB.
3. **Modularidad**: cada módulo en su carpeta; compartidos en `src/components/`.
4. **TypeScript** para entidades y utils de datos.
5. **Tailwind** para todo estilo (clases utilitarias; no CSS suelto salvo global).
6. **Rutas**: `/ensenanza`, `/actividades`, `/dashboard` (+ `/alfabetizacion`,
   `/lecciones/:id`, `/admin`, `/editor` oculta).
7. Nombres: carpetas minúsculas, componentes Preact `PascalCase.tsx`,
   utils `camelCase.ts`, páginas `minusculas.astro`.
8. Claves `localStorage` descriptivas con prefijo `gestion-empresarial:`.
   Serializar con `JSON.stringify/parse`, con defaults y try/catch.
9. **Identidad visual**: usar la paleta de marca Sintaxia de §6.4 (primario `#5932EA`)
   para elementos de identidad (logo, nav activo, botones, badges, progreso).

---

## 11. Recetas para cambios típicos (cómo hacerlo)

- **Nueva lección**: crea `content/blocks/<bloque>/lessons/<slug>.lesson`
  (frontmatter `title`), o usa `/editor` con backend → POST lesson + orden.
  Añade el id a `content/blocks/<bloque>/order.json` si quieres posición fija.
- **Nuevo bloque**: carpeta + `block.json` + `lessons/`, o `/editor` → POST block;
  se añade a `content/blocks/order.json`. `code` se recalcula solo.
- **Reordenar**: editar `order.json` correspondiente, o `/editor` (PUT orders),
  o `LessonOrderEditor` (solo navegador).
- **Mover lección de bloque**: `POST /api/lessons/move` (mueve `.lesson` +
  `images/<id>/`) — no copiar a mano o huérfanas las imágenes.
- **Nueva imagen**: `images/<file>` en el `.lesson` + archivo en
  `content/blocks/<b>/images/<lesson>/<file>` (vía editor o a mano).
  Usa extensiones permitidas; `resolveLessonImage()` la empaqueta con Vite.
- **Nueva actividad lab**: añade objeto al JSON del tipo en `src/data/`
  (`slug` único dentro del tipo). Portadas, rutas `[slug]` e índice se generan solos.
- **Nuevo curso/actividad académica**: vía UI (`ActividadesView`) o
  `createCourse/createActivity` en `utils/courses.ts`. Código de curso: auto 6 dígitos.
  Opcional: `color` (clave de `COURSE_COLORS`) e `icon` (`logo-01.png`…`logo-15.png` de
  `public/images/logos/`, fuente original `public/Images/Logos/`).
- **Nuevo rol/permiso**: `auth.ts` (`Role`, `normalizeRole`, `updateUserRole`) +
  `AppHeader.tsx` (nav) + `Auth.tsx` (redirecciones) + guard en `admin.astro`.
- **Dashboard real**: sustituir el placeholder de `dashboard.astro` por un
  componente Preact que lea IndexedDB (`getCourses/getActivities`) +
  `localStorage` (progreso, quizzes) y agregue métricas.
- **Nuevo estilo global**: solo `src/styles/global.css` + clases Tailwind en
  componentes. No introducir frameworks CSS nuevos.

---

## 12. Errores comunes (no cometer)

- Editar `dist/` (se regenera) o esperar que `localStorage`/IndexedDB cambie lo
  desplegado (el build congela `content/`).
- Poner `code` a mano en frontmatter (se sobrescribe por posición).
- Usar rutas absolutas `/images/...` para imágenes de lección (rompe el empaquetado;
  usar `images/<file>` relativo).
- Crear endpoints/consumir APIs en producción o añadir dependencias de servidor.
- Olvidar `client:load` en componentes Preact interactivos (Astro los renderiza
  estático sin él) o acceder a `window/localStorage` fuera de `useEffect`
  (rompe SSR/build — usar guard `isBrowser()`).
- Cambiar la forma de `LessonBlock` sin actualizar `parseLesson` +
  `serializeLesson` + `LessonRenderer` + editores de celda a la vez.
- Borrar/renombrar claves de `localStorage`/IndexedDB sin migrar (se pierde
  progreso de usuarios).

---

## 13. Estado actual y deuda conocida

- Rediseño estético aplicado: `AppHeader` + `AppFooter` con marca Sintaxia y paleta
  violeta (§6.4); todas las páginas principales usan el layout header + `flex-1` + footer
  (excepto `/editor`, sin footer).
- `/dashboard` es placeholder (pendiente de implementar métricas).
- `README.md` aún es el template de Astro (desactualizado; la doc real es este
  archivo + `RULES.md`).
- `src/data/alfabetizacion.ts` es legacy (la vista usa `alfabetizacionContent.ts`
  desde `content/blocks/`).
- `public/lessons/` y `public/multimedia/` son assets legacy (las imágenes
  actuales viven en `content/blocks/*/images/`).
- `server/migrate-alfabetizacion.mjs` es script puntual (no parte del flujo).
- `src/data/actividades-elegir.json` presenta caracteres con encoding corrupto
  (revisar antes de editar a mano; preferir edición vía script).

---

## 14. Checklist antes de entregar un cambio

1. `npm run build` pasa sin errores (importante: valida `getStaticPaths` de
   `/lecciones/[id]` y los `import.meta.glob` de contenido).
2. Probar con `npm run dev:all`: sesión por rol, navegación, persistencia tras
   recargar, y (si toca contenido) guardar vía backend + recargar build.
3. Respetar convenciones §10 y no dejar `console.log` ni secretos.
4. Si cambia contenido, verificar `order.json` + `code N.M` recalculado.
5. Si cambia persistencia, documentar la clave en §8 de este archivo.
