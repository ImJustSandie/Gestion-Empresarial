# Reglas del proyecto

## Descripción general

Aplicación web de gestión empresarial educativa construida con **Astro**, **Preact** y **Tailwind CSS**. La aplicación funciona completamente en el cliente: **no hay backend ni base de datos**. Toda la información se almacena en el `localStorage` del navegador.

## Arquitectura

- **Framework:** Astro 7 con renderizado en el cliente para componentes interactivos.
- **Componentes interactivos:** Preact 10.
- **Estilos:** Tailwind CSS 4.
- **Persistencia:** `localStorage` del navegador. No se debe crear ni consumir ninguna API externa.

## Módulos de la aplicación

La aplicación se divide en tres módulos principales, cada uno con su propia sección bajo `src/pages/`.

### 1. Módulo de enseñanza (`src/pages/ensenanza/`)

- Contenido educativo para la enseñanza.
- Gestión de materiales, lecciones, temas o recursos de aprendizaje.
- Toda la información debe guardarse en `localStorage`.

### 2. Módulo de actividades y tareas (`src/pages/actividades/`)

- Creación y gestión de actividades y tareas.
- Las actividades se dividen entre tres tipos de entidades:
  - **Profesores**
  - **Estudiantes**
  - **Grupos de estudiantes**
- Debe permitir asignar, listar, editar y eliminar actividades/tareas para cada tipo de entidad.
- Toda la información debe guardarse en `localStorage`.

### 3. Módulo de dashboard (`src/pages/dashboard/`)

- Visualización de estadísticas y métricas.
- Los datos mostrados deben provenir de los otros dos módulos (enseñanza y actividades).
- Debe reflejar el estado actual de la información almacenada en `localStorage`.

## Reglas generales de desarrollo

1. **Sin backend en producción:** La app desplegada (GitHub Pages / Vercel estático) no tiene servidor ni consume APIs externas. Excepción: `server/content-server.mjs` es un backend **solo para desarrollo local** (`npm run content:server`) que escribe archivos de contenido en `content/blocks/`; nunca se despliega y el build estático no depende de él.
2. **Sin base de datos:** Toda la persistencia se realiza exclusivamente mediante `localStorage`.
3. **Modularidad:** Cada módulo debe mantener su propia lógica y componentes dentro de su carpeta correspondiente.
4. **Reutilización:** Los componentes compartidos deben ubicarse en `src/components/`.
5. **Tipado:** Usar TypeScript para las entidades y funciones de utilidad, especialmente para la gestión de datos en `localStorage`.
6. **Estilos:** Utilizar Tailwind CSS para todos los estilos de la interfaz.
7. **Rutas:** Cada módulo debe exponer una página principal accesible desde `/ensenanza`, `/actividades` y `/dashboard` respectivamente.

## Convenciones de nomenclatura

- Carpetas de módulos en minúsculas: `ensenanza/`, `actividades/`, `dashboard/`.
- Componentes Preact en PascalCase: `ActivityCard.tsx`, `TeacherList.tsx`.
- Utilidades en camelCase: `storage.ts`, `useLocalStorage.ts`.
- Páginas Astro en minúsculas: `index.astro`.

## Consideraciones sobre `localStorage`

- Usar claves de almacenamiento descriptivas y con prefijo del proyecto cuando sea necesario.
- Ejemplo: `gestion-empresarial:activities`, `gestion-empresarial:teachers`.
- Manejar errores de lectura/escritura y valores por defecto cuando no existan datos.
- Recordar que `localStorage` solo almacena cadenas: serializar con `JSON.stringify` y deserializar con `JSON.parse`.

## Contenido (bloques + lessons)

- Todo el contenido educativo vive en `content/blocks/<bloque>/`: `block.json` (`title`, `description`, `icon?`, `color?`), `order.json` (orden de lessons, opcional) y `lessons/*.lesson`.
- El orden de bloques vive en `content/blocks/order.json`.
- El build de Astro empaqueta ese contenido como HTML estático: lo desplegado muestra el estado del repo al momento del build.
- La página oculta `/editor` gestiona bloques y lessons: con el servidor local escribe directo a `content/blocks/`; sin servidor trabaja con `localStorage` + exportar/descargar el `.lesson`.
