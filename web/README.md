# IT Service Manager — Frontend

Frontend de **IT Service & Demand Manager**: gestión de servicios IT, aplicaciones, demandas,
incidencias, equipos y SLA. Consume exclusivamente la API REST del backend
(dos microservicios Java 21 + Spring Boot 4.1.1 + PostgreSQL).

## Stack

| Área | Tecnología |
|---|---|
| Base | React 19 + TypeScript + Vite 8 |
| Estilos | Tailwind CSS 4 + componentes shadcn/ui (Radix UI) |
| Navegación | React Router |
| Estado remoto | TanStack Query |
| Formularios | React Hook Form + Zod |
| Pruebas | Vitest |

## Puesta en marcha

Requisitos: Node.js 22.12 o superior (22 LTS o 24 LTS) y los dos servicios del backend arrancados (puertos 8080 y 8081), en el IDE o con Docker Compose.

```bash
npm install
npm run dev        # http://localhost:5173
```

Otros comandos:

```bash
npm run build      # comprobación de tipos + build de producción en dist/
npm run lint       # ESLint
npm run test       # pruebas unitarias (Vitest)
npm run typecheck  # solo comprobación de tipos
```

### Conexión con el backend

El backend son dos microservicios: el **catálogo de aplicaciones** (puerto 8081) y el
**servicio de demandas** (puerto 8080). En desarrollo, Vite hace de proxy y el navegador
ve un único origen, así que no hace falta CORS:

| Ruta | Destino |
|---|---|
| `/api/applications/**` | `http://localhost:8081` |
| `/api/demands/**` | `http://localhost:8080` |

Variables (copiar `.env.example` a `.env.local` solo si hay que cambiarlas):

- `VITE_API_BASE_URL`: URL base de la API usada por el navegador (por defecto `/api`).
- `VITE_APPLICATION_API_TARGET`: destino del proxy del catálogo (por defecto `http://localhost:8081`).
- `VITE_DEMAND_API_TARGET`: destino del proxy de demandas (por defecto `http://localhost:8080`).

### Docker

El `Dockerfile` compila la aplicación y la sirve con **nginx**, que además reenvía
`/api/applications` y `/api/demands` a cada servicio (configuración en `docker/nginx.conf`).
Se usa desde el Docker Compose de la carpeta `platform/` de este repositorio, que levanta todo el
sistema en **http://localhost:8088**.

## Arquitectura

Organización **por funcionalidad (feature-based)**: cada módulo de negocio agrupa su
acceso a la API, su modelo, sus componentes y sus páginas. Lo transversal vive fuera.

```
src/
├── app/                      # Arranque: providers, router, QueryClient
├── components/
│   ├── ui/                   # Componentes shadcn/ui (button, table, select, form…)
│   ├── layout/               # Layout: menú lateral, cabecera, configuración de navegación
│   └── common/               # Piezas compartidas entre módulos: cabecera de página, paginación,
│                             # estados, badges, filtros, campos de formulario, cabecera ordenable…
├── features/
│   ├── applications/
│   │   ├── api/              # Endpoints (applications-api) y hooks de TanStack Query
│   │   ├── model/            # Tipos (DTO), constantes, esquemas Zod, parámetros de URL
│   │   ├── components/       # Tabla, filtros, badges, campos de formulario, ficha
│   │   ├── pages/            # Pantallas del módulo
│   │   └── routes.ts         # Rutas del módulo (carga diferida por página)
│   └── demands/              # Misma estructura; model/status-rules.ts con las transiciones
├── lib/                      # Cliente HTTP, errores de formulario, parámetros de listado, fechas
└── pages/                    # Páginas globales (404, error)
```

Decisiones principales:

- **Sin datos simulados**: todas las pantallas llaman a la API real a través de `lib/api-client.ts`.
- **Cliente HTTP propio sobre `fetch`** (sin axios): centraliza la URL base y convierte
  cualquier error en `ApiError`, reconociendo el formato `ApiErrorResponse` del backend
  (`status`, `error`, `message`, `fieldErrors`) y el formato por defecto de Spring.
- **Estado del listado en la URL** (`?estado=ACTIVE&criticidad=HIGH&pagina=2&tamano=20&orden=name,desc`):
  se puede recargar, compartir y navegar con atrás/adelante.
- **TanStack Query** con claves jerárquicas (`applications/list`, `applications/detail`):
  tras crear o modificar se actualiza el detalle en caché y se invalidan los listados.
- **Validación en cliente alineada con el backend** (`@NotBlank`, `@Size`, `@Pattern`); los
  `fieldErrors` que devuelva el servidor se muestran en el campo correspondiente.
- **Carga diferida por ruta** para mantener pequeño el bundle inicial.
- **Menú declarativo** (`components/layout/navigation.ts`): los módulos Incidencias,
  Equipos y Configuración están previstos y marcados como «Pronto».
- **Infraestructura común sin duplicar**: lo que comparten los módulos (badges de estado y nivel,
  cabecera ordenable, filtros, campos de formulario, aviso de recurso inexistente, utilidades de
  URL y paginación) vive en `components/common` y `lib`. Un módulo nuevo solo aporta su dominio.

## Módulo de aplicaciones

| Ruta | Pantalla | API |
|---|---|---|
| `/aplicaciones` | Consulta con filtros, paginación, tamaño de página y ordenación | `GET /api/applications` |
| `/aplicaciones/nueva` | Alta | `POST /api/applications` |
| `/aplicaciones/modificar` | Búsqueda por ID o selección en catálogo | `GET /api/applications/{id}`, `GET /api/applications` |
| `/aplicaciones/:id` | Detalle | `GET /api/applications/{id}` |
| `/aplicaciones/:id/editar` | Modificación | `GET` + `PUT /api/applications/{id}` |

## Módulo de demandas

| Ruta | Pantalla | API |
|---|---|---|
| `/demandas` | Consulta con filtros por aplicación, estado y prioridad; paginación y ordenación | `GET /api/demands`, `GET /api/applications` (filtro) |
| `/demandas/nueva` | Alta (estado inicial `OPEN` asignado por el backend). Admite `?aplicacion=ID` | `POST /api/demands`, `GET /api/applications` (selector) |
| `/demandas/modificar` | Búsqueda por ID o selección en el listado | `GET /api/demands/{id}`, `GET /api/demands` |
| `/demandas/:id` | Detalle con fechas, aplicación y ciclo de vida | `GET /api/demands/{id}` |
| `/demandas/:id/editar` | Modificación (título, descripción, prioridad, estado y aplicación) | `GET` + `PUT /api/demands/{id}` |

- **Transiciones de estado** (`model/status-rules.ts`, reflejo de `Demand.changeStatus()`):
  `OPEN → IN_PROGRESS | CANCELLED`, `IN_PROGRESS → COMPLETED | CANCELLED`; `COMPLETED` y
  `CANCELLED` son finales. El selector solo habilita el estado actual y sus transiciones válidas,
  y el esquema Zod lo vuelve a comprobar. Si aun así el servidor responde `409`, se muestra el
  motivo y se ofrece recargar los datos actuales.
- **Demandas finalizadas**: como en el backend, se pueden seguir editando título, descripción,
  prioridad y aplicación; solo el estado queda bloqueado.
- **Selector de aplicación**: datos reales de `GET /api/applications` (todas, activas e inactivas;
  las inactivas se marcan). La API no tiene endpoint de "todas", así que se pide una página de
  hasta 1000 ordenada por nombre.
- **Fechas**: `createdAt`/`updatedAt` llegan como `Instant` (ISO-8601 UTC) y se muestran en hora local.
- Desde el detalle de una aplicación, «Ver demandas» abre el listado filtrado por esa aplicación.

## Notas de integración con el backend

Detectadas al revisar el contrato; ninguna bloquea el funcionamiento actual:

1. **CORS**: no configurado. Resuelto en desarrollo con el proxy de Vite.
2. **Ordenación por criticidad**: se guarda como texto, por lo que el orden es alfabético
   (CRITICAL, HIGH, LOW, MEDIUM) y no por severidad. Para ordenar por nivel habría que
   persistir un valor ordinal o ordenar con una expresión `CASE` en el backend.
3. **Búsqueda por nombre**: la API no ofrece filtro por nombre; «Modificar aplicación»
   permite buscar por ID o seleccionar en el catálogo filtrado.
4. **Parámetros no validados**: valores de `status`/`criticality` o campos de `sort` no
   válidos no devuelven 400 (un campo de ordenación inexistente probablemente produce un 500).
   El frontend solo envía valores válidos.
5. **Errores no controlados**: los que no pasan por `GlobalExceptionHandler` (JSON mal formado,
   ID no numérico, 500) llegan con el formato por defecto de Spring; el frontend los muestra
   con un mensaje genérico.
6. **Demandas · N+1**: `DemandService.toResponse()` lee `demand.getApplication().getName()` sobre una
   relación `LAZY`, lo que genera una consulta adicional por cada aplicación distinta de la página. Un
   `@EntityGraph(attributePaths = "application")` en el repositorio lo resolvería.
7. **Demandas · ordenación**: prioridad y estado se guardan como texto, así que se ordenan
   alfabéticamente (igual que la criticidad de las aplicaciones).
8. **Demandas · `updatedAt`**: `Demand.update()` actualiza la fecha en cada `PUT` aunque no cambie ningún dato.
