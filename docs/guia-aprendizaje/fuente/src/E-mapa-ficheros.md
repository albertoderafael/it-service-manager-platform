# Mapa comentado de ficheros

<p class="lead">Todos los ficheros del proyecto, con una línea que explica para qué sirven y el capítulo de la guía donde se estudian. Úsalo como índice para encontrar código o como lista de comprobación al crear un módulo nuevo.</p>

## Raíz del proyecto

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `package.json` | Nombre, scripts, dependencias y versión mínima de Node | 3 |
| `package-lock.json` | Versiones exactas de todas las dependencias | 3 |
| `index.html` | HTML de partida con `div#root` y el script de entrada | 1 |
| `vite.config.ts` | Plugins, alias `@`, puerto, proxy a los dos servicios y configuración de Vitest | 4, 23 |
| `tsconfig.json` | Referencias a los dos subproyectos de TypeScript | 5 |
| `tsconfig.app.json` | TypeScript del código de navegador (`src/`), modo estricto | 5 |
| `tsconfig.node.json` | TypeScript de `vite.config.ts` (entorno Node) | 5 |
| `eslint.config.js` | Reglas de ESLint (JS, TypeScript, *hooks*, React Refresh) | 5 |
| `components.json` | Configuración de la CLI de shadcn/ui | 11 |
| `.env.example` | Variables de entorno documentadas (pendiente de actualizar) | 4, 25 |
| `.gitignore` | Ficheros excluidos de Git (`node_modules`, `dist`, `*.local`…) | 3 |
| `README.md` | Puesta en marcha y resumen de la arquitectura | — |
| `public/favicon.svg` | Icono de la pestaña, copiado tal cual a `dist/` | 4 |
| `docs/guia-aprendizaje/` | Esta guía y su fuente | — |

## `src/` (raíz)

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `main.tsx` | Punto de entrada: monta `App` en `#root` dentro de `StrictMode` | 1, 8 |
| `index.css` | Tailwind, animaciones, fuente Inter, tokens de diseño y estilos base | 10 |
| `vite-env.d.ts` | Tipos de `import.meta.env` y de Vite | 4 |

## `src/app/`: arranque

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `app.tsx` | Proveedores globales: TanStack Query, *tooltips*, router y notificaciones | 1, 9 |
| `router.tsx` | Tabla de rutas: layout, límite de error, redirección inicial, módulos y 404 | 18 |
| `query-client.ts` | Configuración global de TanStack Query (`staleTime`, reintentos) | 17 |

## `src/components/layout/`: armazón

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `app-layout.tsx` | Armazón con menú, cabecera y `<Outlet />`; título de la pestaña | 12, 8 |
| `sidebar-nav.tsx` | Menú lateral: grupos desplegables por módulo y módulos «Pronto» | 12 |
| `navigation.ts` | Definición declarativa de los módulos y acciones del menú | 12 |
| `app-header.tsx` | Cabecera fija y menú móvil en panel deslizante | 12 |
| `brand.tsx` | Logotipo en SVG | 12 |

## `src/components/common/`: piezas compartidas

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `page-header.tsx` | Cabecera de página: contexto, título, descripción y acciones | 6 |
| `state-views.tsx` | `LoadingState`, `EmptyState` y `ErrorState` | 6, 12, 15 |
| `table-skeleton.tsx` | Esqueleto de carga de las tablas | 12 |
| `resource-not-found.tsx` | Aviso de recurso inexistente con enlace al listado | 12, 18 |
| `pagination-bar.tsx` | Paginación con filas por página y rango mostrado | 6, 19 |
| `sortable-table-head.tsx` | Cabecera de columna ordenable con `aria-sort` | 6 |
| `filter-select.tsx` | Desplegable de filtro con opción «Todos» (genérico) | 2, 11 |
| `badges.tsx` | `StatusPill` (estados) y `LevelBadge` (niveles 1 a 4) | 10, 12 |
| `form-fields.tsx` | Campos de formulario genéricos y contador de caracteres | 20 |
| `detail-field.tsx` | Par etiqueta/valor y texto largo para fichas | 12 |
| `row-action.tsx` | Botón de icono con *tooltip* para acciones de fila | 9 |

## `src/components/ui/`: componentes de shadcn/ui

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `button.tsx` | Botón con variantes (incluida `brand`) y `asChild` | 11 |
| `badge.tsx` | Etiqueta genérica | 11 |
| `card.tsx` | Tarjeta y sus partes | 9 |
| `table.tsx` | Tabla y sus partes | 11 |
| `input.tsx`, `textarea.tsx`, `label.tsx` | Controles de formulario | 11 |
| `select.tsx` | Desplegable sobre Radix | 11 |
| `form.tsx` | Integración con React Hook Form mediante contextos | 9, 20 |
| `alert.tsx` | Alertas (incluidas las variantes `success` e `info`) | 11 |
| `separator.tsx`, `skeleton.tsx` | Separador y bloque de carga | 11 |
| `collapsible.tsx` | Sección plegable (grupos del menú) | 12 |
| `sheet.tsx` | Panel lateral (diálogo de Radix) | 11, 12 |
| `tooltip.tsx` | *Tooltips* y su proveedor | 11 |
| `sonner.tsx` | Contenedor de notificaciones configurado con el tema | 11 |

## `src/lib/`: utilidades sin interfaz

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `api-client.ts` | Cliente HTTP, `ApiError` e interpretación de errores | 15 |
| `api-client.test.ts` | Pruebas de la consulta y de los formatos de error | 23 |
| `list-params.ts` | Utilidades genéricas de paginación, orden y enumerados en la URL | 19 |
| `list-params.test.ts` | Sus pruebas | 23 |
| `route-params.ts` | Validación de identificadores de ruta | 18 |
| `form-errors.ts` | Errores de validación del servidor → campos del formulario | 15, 20 |
| `format.ts` | Formato de fechas en hora local | 22 |
| `utils.ts` | `cn()` | 10 |

## `src/pages/`: páginas globales

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `not-found-page.tsx` | Página 404 (ruta comodín) | 18 |
| `route-error-page.tsx` | Página de error de renderizado (`errorElement`) | 9, 18 |

## `src/features/applications/`: módulo de aplicaciones

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `routes.ts` | Rutas del módulo con carga diferida y títulos | 14, 18 |
| `model/types.ts` | Tipos alineados con los DTO, enumerados y parámetros del listado | 2, 14 |
| `model/constants.ts` | Etiquetas, valores por defecto y longitudes máximas | 14 |
| `model/list-params.ts` (+ `.test.ts`) | URL ↔ parámetros ↔ consulta de Spring | 19 |
| `model/schemas.ts` (+ `.test.ts`) | Esquemas de Zod de alta y modificación | 20 |
| `api/applications-api.ts` | Un método por endpoint | 14, 15 |
| `api/applications-queries.ts` | Claves de caché y hooks de consulta y mutación; catálogo para otros módulos | 17 |
| `components/applications-table.tsx` | Tabla con cabeceras ordenables y modos gestión/selección | 6 |
| `components/application-filters.tsx` | Filtros de estado y criticidad | 6, 19 |
| `components/application-badges.tsx` | Estado y criticidad → indicadores comunes | 12 |
| `components/application-form-fields.tsx` | Campos configurados del formulario | 9, 20 |
| `components/application-summary.tsx` | Ficha de solo lectura | 12 |
| `pages/applications-list-page.tsx` | Consulta con filtros, orden y paginación en la URL | 19, 21 |
| `pages/application-create-page.tsx` | Alta y resultado del servidor | 20, 21 |
| `pages/application-detail-page.tsx` | Detalle y enlace a sus demandas | 21 |
| `pages/application-edit-selector-page.tsx` | Búsqueda por ID y selección en el catálogo | 7, 21 |
| `pages/application-edit-page.tsx` | Modificación con `key`, cambios pendientes y resultado | 7, 20, 21 |

## `src/features/demands/`: módulo de demandas

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `routes.ts` | Rutas del módulo | 18 |
| `model/types.ts` | Tipos, enumerados y campos de ordenación (ver nota 1 del cap. 25) | 14, 25 |
| `model/constants.ts` | Etiquetas, valores por defecto (orden descendente) y longitudes | 22 |
| `model/list-params.ts` (+ `.test.ts`) | URL del listado con filtro por aplicación | 19 |
| `model/schemas.ts` (+ `.test.ts`) | Esquemas de Zod; el de modificación depende del estado actual | 20, 22 |
| `model/status-rules.ts` (+ `.test.ts`) | Máquina de estados e interpretación del 409 | 22 |
| `api/demands-api.ts` | Endpoints | 14 |
| `api/demands-queries.ts` | Claves de caché y hooks | 17 |
| `components/application-options.ts` | Catálogo de aplicaciones para desplegables (dependencia entre módulos) | 13, 22 |
| `components/demand-filters.tsx` | Filtros de aplicación, estado y prioridad | 22 |
| `components/demand-badges.tsx` | Estado y prioridad → indicadores comunes | 12 |
| `components/demand-form-fields.tsx` | Campos, selector de aplicación y selector de estado con transiciones | 20, 22 |
| `components/demand-summary.tsx` | Ficha con fechas | 22 |
| `components/demands-table.tsx` | Tabla con enlace a la aplicación y fecha de modificación | 22 |
| `components/status-flow.tsx` | Diagrama del ciclo de vida | 22 |
| `pages/demands-list-page.tsx` | Consulta | 22 |
| `pages/demand-create-page.tsx` | Alta con aplicación preseleccionable por URL | 22 |
| `pages/demand-detail-page.tsx` | Detalle y ciclo de vida | 22 |
| `pages/demand-edit-selector-page.tsx` | Búsqueda para modificar | 21, 22 |
| `pages/demand-edit-page.tsx` | Modificación, conflicto 409 y recarga | 22 |

## Para un módulo nuevo

La estructura de cualquier módulo nuevo debería reproducir la de la última tabla. Usa esta lista como comprobación (capítulos 14 y 26):

```text
src/features/<módulo>/
├── routes.ts
├── model/   types.ts · constants.ts · list-params.ts · schemas.ts · (reglas).ts · *.test.ts
├── api/     <módulo>-api.ts · <módulo>-queries.ts
├── components/  badges · filters · form-fields · summary · table
└── pages/   list · create · detail · edit-selector · edit
+ app/router.tsx · components/layout/navigation.ts · vite.config.ts (proxy)
```
