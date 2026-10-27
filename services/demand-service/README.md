# Demand Service (`it-service-manager`)

Microservicio de **demandas** de IT Service & Demand Manager: peticiones de evolución
y mantenimiento asociadas a las aplicaciones del catálogo, con su ciclo de vida.

Java 21 · Spring Boot 4.1.1 · Spring Data JPA · PostgreSQL 18 · Flyway · RestClient ·
JUnit 5 · Mockito · Testcontainers · Actuator

## API

| Método y ruta | Descripción | Errores |
|---|---|---|
| `GET /api/demands?applicationId&status&priority&page&size&sort` | Listado paginado con filtros | 400, 503 |
| `GET /api/demands/{id}` | Detalle | 404, 503 |
| `POST /api/demands` | Alta (estado inicial `OPEN`) | 400, 404 (aplicación), 503 |
| `PUT /api/demands/{id}` | Modificación y cambio de estado | 400, 404, 409, 503 |
| `GET /actuator/health` | Estado del servicio y de su base de datos | — |

Ciclo de vida: `OPEN → IN_PROGRESS → COMPLETED`, y `OPEN | IN_PROGRESS → CANCELLED`.
Una transición inválida responde **409**.

## Relación con el catálogo de aplicaciones

Cada demanda guarda solo el identificador de su aplicación (`application_id`, sin clave
foránea). El nombre se obtiene del **Application Catalog Service** por HTTP a través del
puerto `ApplicationCatalog` y su adaptador `RestApplicationCatalog`:

- una sola consulta por lotes (`/api/applications/summaries`) por página del listado;
- tiempos máximos de 2 s (conexión) y 3 s (lectura);
- 404 del catálogo → «la aplicación no existe»; caída o 5xx → **503**; respuesta
  inesperada → **502**;
- las llamadas al catálogo se hacen fuera de cualquier transacción de base de datos;
- si una aplicación ya no existe, la demanda se devuelve con `applicationName: null`.

## Configuración

| Variable | Por defecto | Descripción |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5433/it_service_manager` | Base de datos |
| `DB_USERNAME` | `itmanager` | Usuario |
| `DB_PASSWORD` | — (obligatoria) | Contraseña |
| `APPLICATION_CATALOG_BASE_URL` | `http://localhost:8081` | URL del catálogo |
| `SHOW_SQL` | `false` | Mostrar el SQL de Hibernate |

## Ejecución

- **Todo el sistema:** con Docker Compose desde la carpeta [`platform/`](../../platform/README.md) de este repositorio.
- **Desde el IDE:** con PostgreSQL y el catálogo en marcha, define `DB_PASSWORD` y
  arranca `ItServiceManagerApplication` (puerto 8080).
- **Imagen:** `docker build -t demand-service:local .`

## Pruebas

```powershell
.\mvnw.cmd test     # requiere Docker en marcha (Testcontainers)
```

Pruebas de dominio, servicio, capa web (MockMvc), adaptador HTTP contra un servidor real
del JDK e integración con PostgreSQL 18 en Testcontainers.

## Migraciones (Flyway)

| Versión | Cambio |
|---|---|
| V1, V2 | Tabla `applications` y datos iniciales (etapa monolito) |
| V3 | Tabla `demands` con clave foránea e índices |
| V4 | Elimina la clave foránea hacia `applications` |
| V5 | Elimina la tabla heredada `applications` (ya vive en el catálogo) |

Las migraciones aplicadas no se modifican nunca.
