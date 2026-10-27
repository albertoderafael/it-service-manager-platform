# Anatomía de un módulo

<p class="lead">Los dos módulos del proyecto, aplicaciones y demandas, tienen exactamente la misma estructura interna: <code>api</code>, <code>model</code>, <code>components</code>, <code>pages</code> y <code>routes.ts</code>. Este capítulo disecciona el de aplicaciones carpeta por carpeta, explica qué responsabilidad tiene cada una y cómo fluyen los datos entre ellas, y termina con la receta para crear un módulo nuevo.</p>

## Vista general

```text
features/applications/
├── model/                      Dominio: sin React, sin HTTP
│   ├── types.ts                  Tipos alineados con los DTO del backend y enumerados
│   ├── constants.ts              Etiquetas, valores por defecto y límites
│   ├── schemas.ts                Validación de formularios (Zod)
│   ├── schemas.test.ts
│   ├── list-params.ts            Estado del listado: URL ↔ parámetros ↔ consulta a la API
│   └── list-params.test.ts
├── api/                        Acceso a datos
│   ├── applications-api.ts       Un método por endpoint del controlador
│   └── applications-queries.ts   Hooks de TanStack Query y claves de caché
├── components/                 Presentación específica del módulo
│   ├── applications-table.tsx
│   ├── application-filters.tsx
│   ├── application-badges.tsx
│   ├── application-form-fields.tsx
│   └── application-summary.tsx
├── pages/                      Una pantalla por ruta: orquestan todo lo anterior
│   ├── applications-list-page.tsx
│   ├── application-create-page.tsx
│   ├── application-detail-page.tsx
│   ├── application-edit-page.tsx
│   └── application-edit-selector-page.tsx
└── routes.ts                   Rutas del módulo con carga diferida
```

Las cuatro carpetas son **capas** con una dirección de dependencia clara:

<figure>
<svg viewBox="0 0 680 250" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10.5">
  <defs><marker id="a14" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="10" y="20" width="130" height="50" rx="8" fill="#0b1220"/><text x="75" y="42" text-anchor="middle" font-weight="700" fill="#fff">routes.ts</text><text x="75" y="58" text-anchor="middle" font-size="8.5" fill="#a5f3fc">carga diferida</text>
  <line x1="140" y1="45" x2="198" y2="45" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a14)"/>
  <rect x="200" y="20" width="160" height="50" rx="8" fill="#ecfeff" stroke="#0891b2"/><text x="280" y="42" text-anchor="middle" font-weight="700">pages/</text><text x="280" y="58" text-anchor="middle" font-size="8.5" fill="#0e7490">orquestan: URL, datos, estados</text>
  <line x1="360" y1="40" x2="438" y2="30" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a14)"/>
  <line x1="280" y1="70" x2="280" y2="128" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a14)"/>
  <rect x="440" y="10" width="170" height="44" rx="8" fill="#f8fafc" stroke="#94a3b8"/><text x="525" y="30" text-anchor="middle" font-weight="700">components/</text><text x="525" y="45" text-anchor="middle" font-size="8.5" fill="#475569">pintan lo que reciben por props</text>
  <rect x="200" y="130" width="160" height="50" rx="8" fill="#ecfeff" stroke="#0891b2"/><text x="280" y="152" text-anchor="middle" font-weight="700">api/</text><text x="280" y="168" text-anchor="middle" font-size="8.5" fill="#0e7490">hooks de consulta + endpoints</text>
  <line x1="280" y1="180" x2="280" y2="208" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a14)"/>
  <rect x="190" y="210" width="180" height="34" rx="8" fill="#fff7ed" stroke="#fdba74"/><text x="280" y="231" text-anchor="middle" font-weight="700">lib/api-client.ts → fetch</text>
  <rect x="440" y="130" width="170" height="50" rx="8" fill="#f1f5f9" stroke="#475569"/><text x="525" y="152" text-anchor="middle" font-weight="700">model/</text><text x="525" y="168" text-anchor="middle" font-size="8.5" fill="#475569">tipos, reglas, esquemas, URL</text>
  <line x1="360" y1="155" x2="438" y2="155" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a14)"/>
  <line x1="525" y1="54" x2="525" y2="128" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a14)"/>
  <line x1="350" y1="70" x2="450" y2="130" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a14)"/>
  <text x="560" y="98" font-size="8.5" fill="#475569">todos usan model/;</text>
  <text x="560" y="110" font-size="8.5" fill="#475569">model/ no usa a nadie</text>
</svg>
<figcaption><b>Figura 14.1.</b> Capas de un módulo. Las páginas orquestan; <code>model/</code> es la base que no depende de ninguna otra capa del módulo.</figcaption>
</figure>

::: java
La correspondencia con un módulo de Spring es casi directa: `model/types.ts` son los DTO; `model/` en general, el dominio y sus reglas; `api/` es el cliente de la API (como un `RestClient` o un cliente de Feign, más una caché); `pages/` hace el papel de los controladores, que reciben la petición (la URL), llaman a los servicios y eligen la vista; y `components/` son las vistas. `routes.ts` sería el `@RequestMapping` del módulo.
:::

## `model/`: el dominio sin dependencias

`model/` es la capa más importante y la más sencilla: **no importa React ni hace peticiones**. Solo contiene tipos, datos y funciones puras. Por eso es la que tiene pruebas unitarias.

### `types.ts`: el contrato con el backend

```ts title="src/features/applications/model/types.ts (extracto)"
/**
 * Tipos del dominio "Aplicaciones", alineados con los DTO del backend
 * (paquete com.albertoderafael.itmanager.application.dto).
 */
export const APPLICATION_STATUSES = ['ACTIVE', 'INACTIVE'] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

/** ApplicationResponse */
export interface Application { id: number; name: string; description: string | null; /* … */ }

/** ApplicationCreateRequest */
export interface ApplicationCreateRequest { name: string; description: string | null; criticality: ApplicationCriticality }

/** ApplicationPageResponse (paginación 0-based de Spring Data). */
export interface ApplicationPage { content: Application[]; page: number; size: number; totalElements: number; totalPages: number }

/** Campos por los que se permite ordenar (propiedades de la entidad Application). */
export const APPLICATION_SORT_FIELDS = ['id', 'name', 'criticality', 'status'] as const

/** Criterios de consulta del listado. */
export interface ApplicationListParams {
  status?: ApplicationStatus
  criticality?: ApplicationCriticality
  page: number
  size: number
  sortField: ApplicationSortField
  sortDirection: SortDirection
}
```

Dos clases de tipos conviven aquí: los que **reflejan el backend** (cada uno con el nombre del DTO en su comentario) y los que son **propios del frontend**, como `ApplicationListParams`, que describe los criterios de consulta tal como los maneja la interfaz. La lista de campos de ordenación también es un contrato: son propiedades de la entidad JPA que Spring Data acepta en `sort`.

### `constants.ts`: etiquetas y valores alineados

```ts title="src/features/applications/model/constants.ts (extracto)"
export const STATUS_LABELS: Record<ApplicationStatus, string> = { ACTIVE: 'Activa', INACTIVE: 'Inactiva' }

/** Valores por defecto: coinciden con @PageableDefault(size = 10, sort = "id", ASC) del backend. */
export const DEFAULT_LIST_PARAMS: ApplicationListParams = { page: 0, size: 10, sortField: 'id', sortDirection: 'asc' }

export const NAME_MAX_LENGTH = 100
export const DESCRIPTION_MAX_LENGTH = 500
```

La API habla en códigos (`ACTIVE`); la interfaz, en español (*Activa*). La traducción vive en un único sitio. Los valores por defecto del listado coinciden con los del controlador de Spring, y las longitudes máximas, con las anotaciones `@Size` de los DTO: esos números los usan tanto los esquemas de validación como los contadores de caracteres de los campos.

### `list-params.ts`: tres representaciones del mismo estado

El estado de un listado existe en **tres formas**, y este fichero traduce entre ellas:

| Representación | Ejemplo | Quién la usa |
|---|---|---|
| URL del navegador | `?estado=ACTIVE&pagina=2&orden=name,desc` | El usuario: la ve, la comparte, la guarda |
| Objeto de la interfaz | `{ status: 'ACTIVE', page: 1, sortField: 'name', sortDirection: 'desc', … }` | Los componentes |
| Consulta a la API | `?status=ACTIVE&page=1&size=10&sort=name,desc` | Spring Data (`Pageable`) |

```ts title="src/features/applications/model/list-params.ts (extracto)"
export function parseListParams(search: URLSearchParams): ApplicationListParams { /* URL → objeto, validando */ }
export function serializeListParams(params: ApplicationListParams): URLSearchParams { /* objeto → URL */ }
export function toApiQuery(params: ApplicationListParams) { /* objeto → consulta de Spring */ }
```

Fíjate en las diferencias deliberadas: la URL usa nombres en español y páginas desde 1 (es lo que ve el usuario), mientras que la API usa los nombres del backend y páginas desde 0. La validación al leer la URL es estricta: un `?estado=FOO` o un `?pagina=-3` se descartan y se usan los valores por defecto, porque la URL la puede escribir cualquiera. Lo genérico (paginación, orden, enumerados) está en `lib/list-params.ts`; aquí solo queda lo propio del listado. Lo estudiaremos a fondo en la Parte VII.

### `schemas.ts` y las reglas de dominio

`schemas.ts` contiene los esquemas de Zod que validan los formularios, alineados con Bean Validation (Parte VII). Y en el módulo de demandas, `model/` incluye además **reglas de negocio**:

```ts title="src/features/demands/model/status-rules.ts (extracto)"
/*
 * Reglas de transición de estado. Reflejan Demand.changeStatus() del backend.
 * El backend sigue siendo la autoridad: si rechaza un cambio, responde 409.
 */
const NEXT_STATUSES: Record<DemandStatus, readonly DemandStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}
export function canTransition(from: DemandStatus, to: DemandStatus): boolean { /* … */ }
```

Que estas reglas vivan en `model/` y no dentro del formulario permite probarlas de forma aislada (`status-rules.test.ts`) y usarlas en varios sitios: el desplegable de estado, el esquema de validación y el diagrama del ciclo de vida (`StatusFlow`). Lo veremos en el capítulo 22.

## `api/`: acceso a los datos

Dos ficheros con responsabilidades separadas.

**`applications-api.ts`** es una traducción directa del controlador REST: un método por endpoint, sin lógica.

```ts title="src/features/applications/api/applications-api.ts"
const BASE_PATH = '/applications'

/** Acceso a los endpoints de ApplicationController (/api/applications). */
export const applicationsApi = {
  list: (params: ApplicationListParams, signal?: AbortSignal) =>
    apiClient.get<ApplicationPage>(BASE_PATH, toApiQuery(params), signal),
  getById: (id: number, signal?: AbortSignal) =>
    apiClient.get<Application>(`${BASE_PATH}/${id}`, undefined, signal),
  create: (request: ApplicationCreateRequest) => apiClient.post<Application>(BASE_PATH, request),
  update: (id: number, request: ApplicationUpdateRequest) =>
    apiClient.put<Application>(`${BASE_PATH}/${id}`, request),
}
```

**`applications-queries.ts`** envuelve esos métodos en hooks de TanStack Query (`useApplications`, `useApplication`, `useCreateApplication`, `useUpdateApplication`, `useApplicationOptions`) y define las claves de caché. Es la única puerta de entrada a los datos para el resto del módulo: **ninguna página llama directamente a `applicationsApi`**. El capítulo 17 está dedicado a este fichero.

::: decision Separar los endpoints de la caché
Separar `-api.ts` (qué peticiones existen) de `-queries.ts` (cómo se cachean y se invalidan) mantiene cada fichero con una sola razón para cambiar: un endpoint nuevo en el backend toca el primero; una nueva estrategia de caché, el segundo. Además, los métodos de `-api.ts` son funciones normales que se pueden usar fuera de React, por ejemplo en una prueba o en un cargador de rutas.
:::

## `components/`: presentación del módulo

Los componentes del módulo **saben del dominio, pero no de dónde vienen los datos**. Reciben objetos ya cargados y funciones de aviso por props:

| Componente | Recibe | Hace |
|---|---|---|
| `ApplicationsTable` | Lista de aplicaciones, orden actual, `onSortChange`, modo | Pinta la tabla con cabeceras ordenables y acciones por fila |
| `ApplicationFilters` | Filtros actuales, `onChange` | Pinta los dos filtros y «Limpiar filtros» |
| `StatusBadge`, `CriticalityBadge` | Un estado o una criticidad | Traducen el valor a `StatusPill` o `LevelBadge` |
| `NameField`, `CriticalityField`… | Nada (leen el formulario del contexto) | Campos configurados con etiquetas y límites del dominio |
| `ApplicationSummary` | Una aplicación | Ficha de solo lectura |

Al no hacer peticiones, son reutilizables: la tabla y los filtros sirven igual en el listado principal (con estado en la URL) y en el selector del catálogo (con estado local), como vimos en el capítulo 7.

## `pages/`: la orquestación

Cada página corresponde a **una ruta** y es el único lugar donde se juntan todas las piezas. Una página típica:

1. Lee lo que necesita de la URL (`useParams`, `useSearchParams`) y lo valida con funciones de `model/` o `lib/`.
2. Pide los datos con los hooks de `api/`.
3. Decide qué estado mostrar (cargando, error, vacío, datos).
4. Compone los componentes comunes y del módulo, pasándoles datos y manejadores.
5. Gestiona las acciones del usuario: navegar, enviar formularios, mostrar notificaciones.

El listado de aplicaciones, que ya conoces bien, sigue exactamente este guion. Las páginas son los ficheros más largos del módulo, y es normal: es donde vive la lógica de la pantalla. Lo que no es normal, y conviene evitar, es que contengan reglas de negocio o lógica reutilizable: eso baja a `model/` o a un hook.

## `routes.ts`: el punto de montaje

```ts title="src/features/applications/routes.ts (extracto)"
export const applicationRoutes: RouteObject = {
  path: 'aplicaciones',
  children: [
    {
      index: true,
      handle: { title: 'Consultar aplicaciones' },
      lazy: () =>
        import('./pages/applications-list-page').then((m) => ({ Component: m.ApplicationsListPage })),
    },
    { path: 'nueva', handle: { title: 'Nueva aplicación' }, lazy: () => /* … */ },
    { path: 'modificar', handle: { title: 'Modificar aplicación' }, lazy: () => /* … */ },
    { path: ':id', handle: { title: 'Detalle de aplicación' }, lazy: () => /* … */ },
    { path: ':id/editar', handle: { title: 'Modificar aplicación' }, lazy: () => /* … */ },
  ],
}
```

El módulo **declara** sus rutas y el router de la aplicación las **monta** con una línea (`applicationRoutes` en `app/router.tsx`). Cada página se carga bajo demanda, y `handle.title` da el título de la pestaña (capítulo 8). Las rutas tienen nombres en español porque forman parte de la interfaz que ve el usuario, mientras que el código usa el inglés del dominio del backend. Lo veremos con detalle en el capítulo 18.

## Dos módulos lado a lado

La mejor prueba de que la estructura funciona es comparar ambos módulos:

| Pieza | Aplicaciones | Demandas |
|---|---|---|
| Tipos y enumerados | `ApplicationStatus`, `ApplicationCriticality` | `DemandStatus`, `DemandPriority` |
| Ordenación | `id`, `name`, `criticality`, `status` | además `application.name`, `createdAt`, `updatedAt` |
| Filtros del listado | estado, criticidad | aplicación, estado, prioridad |
| Endpoints | `applications-api.ts` | `demands-api.ts` |
| Hooks y claves de caché | `applicationKeys`, `useApplications`… | `demandKeys`, `useDemands`… |
| Reglas de dominio | — | `status-rules.ts` y el componente `StatusFlow` |
| Dependencias de otros módulos | ninguna | catálogo de aplicaciones (`application-options.ts`) |
| Páginas | listado, alta, detalle, modificación, selector | las mismas cinco |

Si sabes dónde está algo en un módulo, sabes dónde está en el otro. Las diferencias son exactamente las del dominio: las demandas tienen un ciclo de vida y pertenecen a una aplicación.

::: atencion
La simetría tiene un pequeño desajuste que conviene conocer: en aplicaciones, las funciones de la URL se llaman `parseListParams` y `serializeListParams`; en demandas, `parseDemandListParams` y `serializeDemandListParams`. Ambas convenciones funcionan, pero un proyecto debería elegir una. Son detalles así los que una revisión de código debe detectar antes de que se conviertan en costumbre.
:::

## Receta: crear un módulo nuevo

Con todo lo anterior, añadir un módulo (por ejemplo, Incidencias) es seguir una lista de pasos conocida. La desarrollaremos completa en el capítulo 26; este es el esquema:

1. **Leer el contrato del backend**: controlador, DTO, validaciones, enumerados, paginación por defecto y errores posibles.
2. **`model/types.ts`**: enumerados con `as const`, interfaces de respuesta, creación, modificación y página; campos de ordenación; parámetros del listado.
3. **`model/constants.ts`**: etiquetas, valores por defecto alineados con `@PageableDefault`, longitudes máximas.
4. **`model/list-params.ts`** y **`model/schemas.ts`**, con sus pruebas.
5. **`api/<módulo>-api.ts`** y **`api/<módulo>-queries.ts`** con claves jerárquicas.
6. **`components/`**: indicadores (tonos y niveles), filtros, tabla, campos de formulario y ficha.
7. **`pages/`**: listado, alta, detalle, modificación y selector.
8. **`routes.ts`** y registro en `app/router.tsx`.
9. **Menú**: entrada en `components/layout/navigation.ts` (quitar `comingSoon`).
10. **Proxy**: si lo sirve otro servicio, regla en `vite.config.ts`.
11. **Verificación**: `typecheck`, `lint`, `test` y prueba manual con el backend real.

## Errores típicos y depuración

- **Una página llama directamente a `fetch` o a `applicationsApi`.** Se salta la caché y sus invalidaciones; usa siempre el hook de `-queries.ts`.
- **Etiquetas en español repartidas por los componentes.** Llévalas a `constants.ts` con un `Record` exhaustivo.
- **Un tipo del frontend que ya no coincide con el DTO.** Revisa los tipos cada vez que cambie el backend; el comentario con el nombre del DTO ayuda a localizarlos.
- **Componentes del módulo que hacen peticiones.** Pierden la reutilización. Pásales los datos desde la página.

## Ejercicios

::: ejercicio Compara dos ficheros paralelos
Abre en dos paneles `features/applications/pages/applications-list-page.tsx` y `features/demands/pages/demands-list-page.tsx`. Anota todas las diferencias. ¿Cuántas se deben al dominio (filtros distintos) y cuántas son accidentales? ¿Merecería la pena extraer más código común? Razona los pros y contras.
:::

::: ejercicio Verifica el contrato de ordenación
El frontend ofrece ordenar las demandas por los campos de `DEMAND_SORT_FIELDS` (`model/types.ts`). En el backend, `DemandService` valida el parámetro `sort` contra su propia lista, `VALID_SORT_FIELDS`, y responde `400 Invalid demand sort field: …` si no lo reconoce. Compara ambas listas (solo lectura: no modifiques el backend). ¿Qué columnas de la tabla de demandas producirían un error? Con el backend arrancado, pulsa esas cabeceras y observa *Network* y lo que ve el usuario. Propón dos soluciones, una en cada lado, y razona cuál preferirías.
:::

::: ejercicio Diseña el `model/` de Incidencias
Sin escribir todavía componentes, escribe el borrador de `features/incidents/model/types.ts` y `constants.ts` para un módulo de incidencias con: identificador, título, descripción opcional, severidad (cuatro niveles), estado (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), aplicación afectada y fechas de creación y resolución. Incluye los parámetros del listado y las etiquetas en español. ¿Qué decisiones tomas sin conocer todavía el backend y cómo las marcarías como pendientes?
:::

## Autoevaluación

::: preguntas
1. ¿Qué contiene cada una de las cuatro carpetas de un módulo y cuál es la dirección de dependencia entre ellas?
2. ¿Por qué `model/` no importa React ni hace peticiones?
3. ¿Qué dos clases de tipos conviven en `types.ts`?
4. ¿Cuáles son las tres representaciones del estado de un listado y quién usa cada una?
5. ¿Qué diferencia hay entre `applications-api.ts` y `applications-queries.ts`?
6. ¿Por qué los componentes del módulo no hacen peticiones?
7. ¿Qué cinco cosas hace una página típica?
8. ¿Qué pasos son necesarios para que un módulo nuevo aparezca y funcione en la aplicación?
:::
