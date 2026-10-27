# Ejercicio guiado: el módulo de Incidencias

<p class="lead">Este último capítulo no explica nada nuevo: te propone construir tú el tercer módulo de la aplicación, Incidencias, aplicando todo lo anterior. Está organizado en pasos con puntos de control, empieza por un contrato de API que puedes implementar en tu proyecto de backend y deja el código de los ficheros más instructivos para que lo compares con el tuyo. Es el examen final de la guía.</p>

## El objetivo

Al terminar, el menú lateral tendrá el módulo **Incidencias** activo (sin la etiqueta «Pronto») con las mismas cinco pantallas que los otros módulos: consulta con filtros, alta, búsqueda para modificar, detalle y modificación. Una incidencia:

- Pertenece a una aplicación (como las demandas).
- Tiene una **severidad** de cuatro niveles.
- Sigue un **ciclo de vida** con una particularidad nueva: se puede **reabrir**.
- Registra cuándo se creó, cuándo se modificó y **cuándo se resolvió**.

::: atencion
La norma del proyecto se mantiene: **nada de datos simulados en la aplicación**. El frontend de Incidencias solo funcionará cuando exista el endpoint en el backend. Por eso el paso 0 es el contrato: puedes implementarlo en tu proyecto de backend (Java 21, Spring Boot, JPA y PostgreSQL, como el servicio de demandas) y construir el frontend en paralelo, probando cada pantalla en cuanto el endpoint correspondiente esté disponible.
:::

## Paso 0 · El contrato de la API

Propuesta de contrato, siguiendo las convenciones de los servicios existentes. Si al implementarlo en el backend cambias algo, adapta el frontend: el contrato manda.

| Método y ruta | Cuerpo | Respuesta | Errores |
|---|---|---|---|
| `GET /api/incidents?applicationId&status&severity&page&size&sort` | — | `IncidentPageResponse` | 400 si el filtro u orden no son válidos |
| `GET /api/incidents/{id}` | — | `IncidentResponse` | 404 |
| `POST /api/incidents` | `IncidentCreateRequest` | `IncidentResponse` (201) | 400 con `fieldErrors`; 404 si la aplicación no existe; 503 si el catálogo no responde |
| `PUT /api/incidents/{id}` | `IncidentUpdateRequest` | `IncidentResponse` | 400, 404, **409** si la transición no es válida, 503 |

```java title="DTO propuestos (backend)"
public record IncidentCreateRequest(
        @NotBlank @Size(max = 150) String title,
        @Size(max = 2000) String description,
        @NotNull @Pattern(regexp = "LOW|MEDIUM|HIGH|CRITICAL") String severity,
        @NotNull Long applicationId) { }

public record IncidentUpdateRequest(
        @NotBlank @Size(max = 150) String title,
        @Size(max = 2000) String description,
        @NotNull @Pattern(regexp = "LOW|MEDIUM|HIGH|CRITICAL") String severity,
        @NotNull @Pattern(regexp = "OPEN|IN_PROGRESS|RESOLVED|CLOSED") String status,
        @NotNull Long applicationId) { }

public record IncidentResponse(
        Long id, String title, String description, String severity, String status,
        Long applicationId, String applicationName,
        Instant createdAt, Instant updatedAt, Instant resolvedAt) { }
```

**Ciclo de vida propuesto.** `OPEN → IN_PROGRESS | CLOSED`; `IN_PROGRESS → RESOLVED`; `RESOLVED → CLOSED | IN_PROGRESS` (reabrir); `CLOSED` es final. Al pasar a `RESOLVED` se fija `resolvedAt`; al reabrir, se borra. Paginación por defecto: `@PageableDefault(size = 10, sort = "id", direction = DESC)`. Campos de ordenación admitidos: `id`, `title`, `severity`, `status`, `createdAt`, `updatedAt`.

<figure>
<svg viewBox="0 0 680 170" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10.5">
  <defs><marker id="a26" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker>
  <marker id="a26o" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#c2410c"/></marker></defs>
  <rect x="20" y="30" width="120" height="40" rx="20" fill="#e0f2fe" stroke="#0284c7"/><text x="80" y="55" text-anchor="middle" font-weight="700">OPEN</text>
  <rect x="200" y="30" width="140" height="40" rx="20" fill="#fef9c3" stroke="#ca8a04"/><text x="270" y="55" text-anchor="middle" font-weight="700">IN_PROGRESS</text>
  <rect x="400" y="30" width="120" height="40" rx="20" fill="#dcfce7" stroke="#16a34a"/><text x="460" y="55" text-anchor="middle" font-weight="700">RESOLVED</text>
  <rect x="560" y="110" width="110" height="40" rx="8" fill="#f1f5f9" stroke="#64748b" stroke-width="2"/><text x="615" y="135" text-anchor="middle" font-weight="700">CLOSED</text>
  <line x1="140" y1="50" x2="198" y2="50" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a26)"/>
  <line x1="340" y1="45" x2="398" y2="45" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a26)"/>
  <path d="M400,62 C380,95 360,95 340,62" fill="none" stroke="#c2410c" stroke-width="1.5" marker-end="url(#a26o)"/>
  <text x="370" y="104" text-anchor="middle" font-size="9" fill="#c2410c">reabrir</text>
  <path d="M520,55 C590,60 615,80 615,108" fill="none" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a26)"/>
  <path d="M80,70 C80,150 400,140 558,130" fill="none" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a26)"/>
  <text x="300" y="150" text-anchor="middle" font-size="9" fill="#475569">cerrar sin resolver (duplicada, no reproducible…)</text>
</svg>
<figcaption><b>Figura 26.1.</b> Ciclo de vida propuesto para una incidencia. A diferencia de las demandas, un estado no final puede volver atrás (reabrir).</figcaption>
</figure>

**Punto de control 0.** Con el backend arrancado, `GET /api/incidents` responde una página vacía y `POST` crea una incidencia (pruébalo con la consola del navegador, como en el ejercicio 15.1, o con un cliente HTTP).

## Paso 1 · Conectar el servicio

Si las incidencias las sirve el servicio de demandas (8080), no hay que tocar nada más que una regla del proxy; si las sirve un servicio nuevo, usa su puerto y una variable propia.

```ts title="vite.config.ts (regla añadida)"
'/api/incidents': {
  target: env.VITE_INCIDENT_API_TARGET || 'http://localhost:8080',
  changeOrigin: true,
},
```

Documenta la variable en `.env.example` (y corrige de paso la nota 12 del capítulo 25). Reinicia `npm run dev`.

## Paso 2 · `model/`: tipos, constantes y reglas

Crea `src/features/incidents/model/`. Este es el `types.ts` completo, porque fija las bases de todo lo demás:

```ts title="src/features/incidents/model/types.ts"
import type { SortDirection } from '@/lib/list-params'

/**
 * Tipos del dominio "Incidencias", alineados con los DTO del backend
 * (IncidentResponse, IncidentCreateRequest, IncidentUpdateRequest).
 */
export const INCIDENT_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export const INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]

/** IncidentResponse. Fechas: java.time.Instant en ISO-8601 (UTC). */
export interface Incident {
  id: number
  title: string
  description: string | null
  severity: IncidentSeverity
  status: IncidentStatus
  applicationId: number
  applicationName: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export interface IncidentCreateRequest {
  title: string
  description: string | null
  severity: IncidentSeverity
  applicationId: number
}

export interface IncidentUpdateRequest extends IncidentCreateRequest {
  status: IncidentStatus
}

export interface IncidentPage {
  content: Incident[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** Debe coincidir con los campos que valida el backend. */
export const INCIDENT_SORT_FIELDS = ['id', 'title', 'severity', 'status', 'createdAt', 'updatedAt'] as const
export type IncidentSortField = (typeof INCIDENT_SORT_FIELDS)[number]

export interface IncidentListParams {
  applicationId?: number
  status?: IncidentStatus
  severity?: IncidentSeverity
  page: number
  size: number
  sortField: IncidentSortField
  sortDirection: SortDirection
}
```

Después, por analogía con demandas:

- **`constants.ts`**: etiquetas (`OPEN: 'Abierta'`, `IN_PROGRESS: 'En curso'`, `RESOLVED: 'Resuelta'`, `CLOSED: 'Cerrada'`; severidades *Baja*, *Media*, *Alta*, *Crítica*), `DEFAULT_INCIDENT_LIST_PARAMS` alineado con `@PageableDefault`, `TITLE_MAX_LENGTH = 150` y `DESCRIPTION_MAX_LENGTH = 2000`.
- **`status-rules.ts`**: la tabla de transiciones de la figura 26.1 y las mismas funciones que en demandas.

```ts title="src/features/incidents/model/status-rules.ts (núcleo)"
const NEXT_STATUSES: Record<IncidentStatus, readonly IncidentStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
}
```

- **`list-params.ts`**: `parseIncidentListParams`, `serializeIncidentListParams` y `toIncidentApiQuery`, con los parámetros de URL `aplicacion`, `estado` y `severidad`. Elige una convención de nombres y anótala (capítulo 14).
- **`schemas.ts`**: `incidentCreateSchema` y `createIncidentUpdateSchema(currentStatus)`, con `applicationId` de texto a número y el `superRefine` de transiciones.

::: proyecto
Fíjate en lo que **no** hay que escribir: la validación genérica de la URL (`lib/list-params.ts`), los campos de formulario, los indicadores, la paginación, los estados de carga y error, el cliente HTTP. Todo eso es común (ADR-008). El módulo nuevo solo aporta su dominio.
:::

**Punto de control 2.** Escribe las pruebas de `model/` antes de seguir: transiciones (incluida la reapertura y que `CLOSED` es final), límites de longitud, reversibilidad de la URL y que `?orden=application.name,asc` se descarta. `npm run test` y `npm run typecheck` en verde.

## Paso 3 · `api/`: endpoints y caché

```ts title="src/features/incidents/api/incidents-queries.ts (claves)"
export const incidentKeys = {
  all: ['incidents'] as const,
  lists: () => [...incidentKeys.all, 'list'] as const,
  list: (params: IncidentListParams) => [...incidentKeys.lists(), params] as const,
  details: () => [...incidentKeys.all, 'detail'] as const,
  detail: (id: number) => [...incidentKeys.details(), id] as const,
}
```

`incidents-api.ts` y los hooks `useIncidents`, `useIncident`, `useCreateIncident` y `useUpdateIncident` son copias adaptadas de los de demandas: `keepPreviousData` en el listado, sin reintentos para el 404 en el detalle, `setQueryData` + invalidación de listados en las mutaciones.

::: nota
Piensa en las relaciones de caché entre módulos. Si en el futuro el detalle de una aplicación muestra un contador de incidencias abiertas, crear una incidencia debería invalidar también esa consulta. Hoy no es necesario, pero es el tipo de dependencia que conviene anotar al diseñar las claves.
:::

## Paso 4 · `components/`

| Componente | Base | Particularidad |
|---|---|---|
| `incident-badges.tsx` | `StatusPill`, `LevelBadge` | Tonos: `OPEN` → `info`, `IN_PROGRESS` → `warning`, `RESOLVED` → `success`, `CLOSED` → `neutral`; severidad → niveles 1 a 4 |
| `incident-filters.tsx` | `FilterSelect` + `useApplicationSelectOptions` | Mismo patrón que los filtros de demandas |
| `incident-form-fields.tsx` | Campos genéricos | `ApplicationField` puede reutilizar la misma lógica que demandas: valora si moverlo a un sitio común |
| `incidents-table.tsx` | `Table`, `SortableTableHead` | Columna de severidad y fecha de creación |
| `incident-summary.tsx` | `DetailField`, `LongText`, `formatDateTime` | Muestra `resolvedAt` solo si existe |
| `incident-status-flow.tsx` | Como `StatusFlow` | Debe dibujar la reapertura |

::: decision ¿Dónde vive el campo de aplicación?
`ApplicationField` y `useApplicationSelectOptions` están hoy en `features/demands/components`. Si incidencias los importa de demandas, se crea una dependencia entre dos módulos que no tienen relación de dominio entre sí. Las dos opciones razonables son moverlos a `features/applications` como parte de su API para otros módulos (junto a `useApplicationOptions`), o a `components/common` si se generalizan. La primera respeta mejor el dominio: el catálogo de aplicaciones es cosa del módulo de aplicaciones. Es una buena ocasión para escribir el ADR correspondiente.
:::

## Paso 5 · `pages/` y `routes.ts`

Crea las cinco páginas partiendo de las de demandas, con estas diferencias:

- **Listado** (`/incidencias`): filtros de aplicación, estado y severidad; *Nueva incidencia* como acción principal.
- **Alta** (`/incidencias/nueva`): admite `?aplicacion=ID` para preseleccionar; mensaje específico si la aplicación ya no existe (404).
- **Detalle** (`/incidencias/:id`): ficha, ciclo de vida y, si está resuelta, cuánto tardó en resolverse (diferencia entre `createdAt` y `resolvedAt`).
- **Modificación** (`/incidencias/:id/editar`): `key` por identificador, *resolver* memorizado por estado actual, tratamiento del 409 con *Recargar datos actuales*.
- **Selector** (`/incidencias/modificar`): búsqueda por ID y selección del catálogo.

```ts title="src/features/incidents/routes.ts (inicio)"
export const incidentRoutes: RouteObject = {
  path: 'incidencias',
  children: [
    {
      index: true,
      handle: { title: 'Consultar incidencias' },
      lazy: () => import('./pages/incidents-list-page').then((m) => ({ Component: m.IncidentsListPage })),
    },
    // nueva, modificar, :id, :id/editar
  ],
}
```

## Paso 6 · Integrar en la aplicación

1. **Router**: añade `incidentRoutes` en `app/router.tsx`, antes de la ruta comodín.
2. **Menú**: en `navigation.ts`, sustituye la entrada `comingSoon` de Incidencias por un módulo con `basePath: '/incidencias'` y sus tres acciones.
3. **Enlaces cruzados**: en el detalle de una aplicación, un botón *Ver incidencias* que lleve a `/incidencias?aplicacion=ID`.

**Punto de control 6.** Recorrido completo contra el backend real: crear una incidencia desde el detalle de una aplicación, verla en el listado filtrado, pasarla a *En curso*, a *Resuelta* (comprueba que aparece la fecha de resolución), reabrirla y cerrarla. Provoca un 409 con dos pestañas, como en el ejercicio 22.1.

## Paso 7 · Verificación final

| Comprobación | Comando o acción |
|---|---|
| Tipos | `npm run typecheck` |
| Estilo y reglas de *hooks* | `npm run lint` |
| Pruebas | `npm run test` (las de `model/` nuevas incluidas) |
| *Build* de producción | `npm run build`; comprueba que hay *chunks* de las páginas de incidencias |
| Estados de cada pantalla | Carga, error (detén el backend), vacío (filtros sin resultados), datos |
| Accesibilidad | Recorrido completo con teclado; etiquetas de los botones de icono |
| Móvil | Modo de dispositivo de las DevTools; menú lateral en el panel deslizante |
| Documentación | ADR de las decisiones nuevas; notas de integración si aparece alguna |

## Retos adicionales

Cuando el módulo funcione, estas ampliaciones ponen a prueba la arquitectura:

- **SLA por severidad.** Un plazo objetivo de resolución por severidad (por ejemplo, 4 horas para *Crítica*) y un indicador en el listado: en plazo, en riesgo, incumplido. ¿Lo calcula el backend o el frontend? ¿Qué pasa con la zona horaria y los fines de semana?
- **Equipos.** Asignar cada incidencia a un equipo, con su propio módulo (`features/teams`) y el patrón del catálogo para el desplegable.
- **Panel de control.** Una página de inicio con indicadores: incidencias abiertas por severidad, demandas por estado, aplicaciones críticas. ¿Qué endpoints de agregación harían falta para no descargar todos los datos?

## Ejercicios

::: ejercicio Pruebas de las reglas de incidencias
Escribe `src/features/incidents/model/status-rules.test.ts` con al menos cinco pruebas: transiciones permitidas, transiciones prohibidas (incluida `IN_PROGRESS → CLOSED`), la reapertura, que `CLOSED` es el único estado final y los estados seleccionables desde `RESOLVED`.
:::

::: ejercicio Duración de la resolución
Escribe en `src/lib/format.ts` una función `formatDuration(fromIso: string, toIso: string): string` que devuelva textos como «3 h 25 min» o «2 d 4 h», con sus pruebas. Úsala en el detalle de una incidencia resuelta. ¿Por qué esta función no depende de la zona horaria, a diferencia de `formatDateTime`?
:::

::: ejercicio Mueve el catálogo de aplicaciones
Haz la refactorización propuesta en la decisión del paso 4: mueve `useApplicationSelectOptions` y `ApplicationField` (o su lógica) al módulo de aplicaciones como API para otros módulos, actualiza demandas para usarla y comprueba con `npm run typecheck`, `npm run lint` y `npm run test` que nada se ha roto. Actualiza la regla de ESLint del ejercicio 13.2 si la añadiste.
:::

## Autoevaluación

::: preguntas
1. ¿Por qué el primer paso es el contrato de la API y no el código del frontend?
2. ¿Qué diferencia el ciclo de vida de una incidencia del de una demanda y cómo se refleja en `status-rules.ts`?
3. ¿Qué partes del módulo no hay que escribir porque ya son comunes?
4. ¿Por qué no conviene que incidencias importe el campo de aplicación desde demandas?
5. ¿Qué tres cambios fuera de `features/incidents` hacen falta para integrar el módulo?
6. ¿Qué comprobaciones forman la verificación final?
:::
