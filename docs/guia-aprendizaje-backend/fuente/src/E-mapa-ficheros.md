# Mapa comentado de ficheros

<p class="lead">Los ficheros de los tres proyectos del backend, con una línea que explica para qué sirven y el capítulo donde se estudian. Los ficheros de configuración local de los IDE y las carpetas generadas (<code>target</code>, <code>.mvn</code>) se omiten.</p>

## Repositorio publicado: `it-service-demand-manager` (fase 2)

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `README.md` | Estado, tecnologías y alcance de la copia pública | 1 |
| `docs/instalacion.md` | Puesta en marcha con variables de entorno y advertencia sobre Flyway | 3, 4 |
| `docs/arquitectura.md` | Resumen de capas y *endpoints* | 9 |
| `backend/pom.xml` | *Starters* de Spring Boot 4.1.1 y Java 21 | 2 |
| `backend/…/application.properties` | Conexión por `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | 3 |
| `backend/…/V1__create_applications.sql` | Tabla `applications` | 4 |
| `backend/…/V2__insert_initial_applications.sql` | Datos ficticios (distintos del proyecto local) | 4 |
| `backend/…/application/**` | Módulo de aplicaciones completo | 5-9 |
| `backend/…/exception/**` | Formato de error y manejador con dos casos | 10 |
| `backend/…/ItServiceManagerApplicationTests.java` | `contextLoads` sin Testcontainers | 11 |
| `frontend/**` | Primera versión del frontend (fuera del alcance de esta guía) | — |

## `it-service-manager`: servicio de demandas (puerto 8080)

### Raíz

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `pom.xml` | *Starters*, Testcontainers, `spring-boot-starter-restclient` y Actuator | 2, 16, 20, 26 |
| `Dockerfile`, `.dockerignore` | Imagen en dos etapas con el JAR por capas | 26 |
| `README.md` | API, variables, ejecución, pruebas y migraciones | 27 |
| `.gitignore` | Excluye `.env`, volcados y `.metadata/` | 25 |
| `compose.yaml` | PostgreSQL 18.6 con volumen, salud y puerto 5433. **Retirado en la fase 7** | 3, 27 |
| `.env` | Contraseña del Compose antiguo; no versionado ni reproducido en la guía | 3 |
| `applications_backup.sql`, `it_service_manager_backup.dump` | Volcados de datos; no reproducidos en la guía; conviene retirarlos | 19, 23 |
| `docs/frontera-catalogo.md` | Diseño del puerto, la consulta por lotes y la ordenación por nombre | 18 |
| `docs/verificacion-refactor.md` | Estado de entrega del refactor y verificación pendiente | 18, 23 |
| `HELP.md` | Enlaces generados por Spring Initializr | — |

### `src/main`

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `ItServiceManagerApplication.java` | Clase principal | 2 |
| `resources/application.properties` | Conexión, JPA, URL del catálogo y Actuator por variables de entorno | 3, 20, 25, 26 |
| `resources/application-docker.properties` | Perfil `docker`: conexión al 5433. **Retirado en la fase 7** | 3, 25 |
| `db/migration/V1__create_applications.sql` | Tabla heredada `applications` | 4 |
| `db/migration/V2__insert_initial_applications.sql` | SIGMA y ORION | 4 |
| `db/migration/V3__create_demands.sql` | Tabla `demands`, clave foránea e índices | 12 |
| `db/migration/V4__detach_demands_from_applications.sql` | Elimina la clave foránea | 21 |
| `db/migration/V5__drop_legacy_applications.sql` | Elimina la tabla heredada | 21 |
| `demand/entity/Demand.java` | Entidad con `applicationId`, fechas y máquina de estados | 12, 18 |
| `demand/repository/DemandRepository.java` | `JpaRepository` + `JpaSpecificationExecutor` | 13 |
| `demand/service/DemandService.java` | Casos de uso, validación, lotes, 404, 409 y transacciones cortas | 13, 15, 18, 25 |
| `demand/controller/DemandController.java` | *Endpoints* `/api/demands` | 15 |
| `demand/dto/DemandCreateRequest.java`, `DemandUpdateRequest.java` | Entrada validada | 15 |
| `demand/dto/DemandResponse.java`, `DemandPageResponse.java` | Salida | 15 |
| `demand/port/ApplicationCatalog.java` | Puerto de solo lectura | 18 |
| `demand/port/ApplicationSummary.java` | *Record* que cruza la frontera | 18 |
| `demand/adapter/RestApplicationCatalog.java` | Adaptador HTTP con tiempos máximos, 503 y 502 | 20, 25 |
| `exception/ApiErrorResponse.java` | Formato de error | 10 |
| `exception/GlobalExceptionHandler.java` | Seis manejadores, incluido el de último recurso | 10, 25 |

### `src/test`

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `ItServiceManagerApplicationTests.java` | Arranque completo con Testcontainers (clase clásica) | 16 |
| `demand/entity/DemandTest.java` | Transiciones de estado (5) | 12 |
| `demand/service/DemandServiceTest.java` | Validación de filtros y orden (3) | 15 |
| `demand/service/DemandCatalogTest.java` | Uso del puerto: alta, ausencias, lotes, degradación (10) | 18, 25 |
| `demand/controller/DemandControllerTest.java` | Contrato HTTP con MockMvc (8) | 15 |
| `demand/adapter/RestApplicationCatalogTest.java` | Adaptador contra un servidor HTTP del JDK (7) | 20, 25 |
| `demand/DemandIntegrationTest.java` | PostgreSQL real, catálogo simulado, sin clave foránea (6) | 21 |

## `application-catalog-service`: catálogo (puerto 8081)

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `pom.xml` | *Starters* y módulos de prueba de Spring Boot 4, Testcontainers y Actuator | 19, 26 |
| `Dockerfile`, `.dockerignore`, `README.md` | Imagen del servicio y documentación | 26, 27 |
| `resources/application.properties` | Puerto 8081, `application_db` y Actuator, por variables de entorno | 19, 25, 26 |
| `db/migration/V1__create_applications.sql` | Tabla `applications`, sin datos | 19 |
| `ApplicationCatalogServiceApplication.java` | Clase principal | 19 |
| `application/entity/Application.java` | Entidad sin *setters* con `update` | 5 |
| `application/repository/ApplicationRepository.java` | Consultas derivadas paginadas | 6 |
| `application/service/ApplicationService.java` | Casos de uso, validación de filtros y resúmenes por lote | 7, 10, 19 |
| `application/controller/ApplicationController.java` | *Endpoints*, incluido `/summaries` | 9, 19 |
| `application/dto/*` | Entrada, salida, página y `ApplicationSummaryResponse` | 8, 9, 19 |
| `exception/*` | Formato de error y seis manejadores | 10, 25 |
| `test/…/ApplicationCatalogServiceApplicationTests.java` | Arranque con Testcontainers (clase de Testcontainers 2) | 19 |
| `test/…/service/ApplicationServiceTest.java` | Servicio con Mockito (8) | 11 |
| `test/…/controller/ApplicationControllerTest.java` | Contrato HTTP con MockMvc (7) | 11, 19 |
| `test/…/ApplicationIntegrationTest.java` | Catálogo vacío tras Flyway; alta y modificación reales (2) | 19 |

## `it-service-platform`: el sistema completo (fase 7)

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `compose.yaml` | PostgreSQL, los dos servicios y el frontend; volumen externo, salud y dependencias | 27 |
| `postgres/init/10-application-db.sh` | Crea `application_db` y su usuario en instalaciones nuevas | 27 |
| `.env.example` | Plantilla de las contraseñas (`.env` no se versiona) | 27 |
| `.gitignore`, `.gitattributes` | Excluyen `.env` y fuerzan LF en los *scripts* | 27 |
| `README.md` | Arranque, comandos y decisiones | 27 |

## `it-service-manager-web`: ficheros de despliegue

| Fichero | Para qué sirve | Cap. |
|---|---|---|
| `Dockerfile`, `.dockerignore` | Compila con Node y sirve con nginx | 27 |
| `docker/nginx.conf` | Proxy inverso hacia los dos servicios y *fallback* de la SPA | 27 |
| `docs/guia-aprendizaje-backend/` | Esta guía y su fuente | — |

## Dónde está cada concepto

| Concepto | Fichero de referencia |
|---|---|
| *Dirty checking* | `ApplicationService.updateApplication`, `DemandService.updateDemand` |
| Máquina de estados en la entidad | `Demand.changeStatus` |
| `Specification` | `DemandService.getDemands` |
| Consulta por lotes | `DemandService.getDemands` + `RestApplicationCatalog.findByIds` |
| Puertos y adaptadores | `demand/port/*` + `demand/adapter/*` |
| Tiempos máximos | `RestApplicationCatalog.createRequestFactory` |
| Transacción delimitada en el código | `DemandService.updateDemand` (`TransactionOperations`) |
| Comprobaciones de salud | `application.properties` (Actuator) + `healthcheck` en `compose.yaml` |
| Imagen por capas | `Dockerfile` de cada servicio |
| Proxy inverso | `it-service-manager-web/docker/nginx.conf` |
| 404 frente a 503 | `RestApplicationCatalog.findById` y `executeRequest` |
| Testcontainers | `*IntegrationTest`, `*ApplicationTests` |
| Formato de error | `GlobalExceptionHandler` en ambos servicios |
