# Application Catalog Service

Microservicio del **catálogo de aplicaciones** de IT Service & Demand Manager. Es el único
dueño de los datos de aplicaciones; el resto de servicios los consultan por su API.

Java 21 · Spring Boot 4.1.1 · Spring Data JPA · PostgreSQL 18 · Flyway ·
JUnit 5 · Mockito · Testcontainers · Actuator

## API

| Método y ruta | Descripción | Errores |
|---|---|---|
| `GET /api/applications?status&criticality&page&size&sort` | Listado paginado con filtros | 400 |
| `GET /api/applications/{id}` | Detalle | 404 |
| `GET /api/applications/summaries?ids=1,2,3` | Resúmenes `{id, name}` por lote; los inexistentes no aparecen | 400 |
| `POST /api/applications` | Alta (estado inicial `ACTIVE`) | 400 |
| `PUT /api/applications/{id}` | Modificación | 400, 404 |
| `GET /actuator/health` | Estado del servicio y de su base de datos | — |

Las aplicaciones no se borran: se marcan como `INACTIVE`.

## Configuración

| Variable | Por defecto | Descripción |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5433/application_db` | Base de datos |
| `DB_USERNAME` | `application_user` | Usuario |
| `DB_PASSWORD` | — (obligatoria; también se admite `APPLICATION_DB_PASSWORD`) | Contraseña |
| `SERVER_PORT` | `8081` | Puerto HTTP |
| `SHOW_SQL` | `false` | Mostrar el SQL de Hibernate |

## Ejecución

- **Todo el sistema:** con Docker Compose desde la carpeta [`platform/`](../../platform/README.md) de este repositorio.
- **Desde el IDE:** con PostgreSQL en marcha, define `DB_PASSWORD` y arranca
  `ApplicationCatalogServiceApplication` (puerto 8081).
- **Imagen:** `docker build -t application-catalog-service:local .`

## Pruebas

```powershell
.\mvnw.cmd test     # requiere Docker en marcha (Testcontainers)
```

## Origen

El servicio nació al extraer el módulo de aplicaciones del monolito original
(`it-service-manager`). Los datos se trasladaron conservando sus identificadores, que
el servicio de demandas usa como referencia. La migración V1 crea solo la estructura.
