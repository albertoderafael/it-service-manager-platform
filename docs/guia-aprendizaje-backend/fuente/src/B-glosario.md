# Glosario

<p class="lead">Términos técnicos usados en la guía, en orden alfabético. Entre paréntesis, el capítulo donde se explican con más detalle.</p>

## A – D

| Término | Definición |
|---|---|
| Actuator | Módulo de Spring Boot que expone información operativa; en el proyecto, solo `/actuator/health` (26) |
| Adaptador | Implementación de un puerto con una tecnología concreta: `JpaApplicationCatalog`, `RestApplicationCatalog` (18, 20) |
| `ApiErrorResponse` | *Record* con el formato común de error del proyecto: `status`, `error`, `message`, `fieldErrors` (10) |
| `ApplicationCatalog` | Puerto de solo lectura que el módulo de demandas usa para conocer las aplicaciones (18) |
| `ApplicationSummary` | *Record* con el `id` y el nombre de una aplicación; lo único que cruza la frontera (18) |
| Autoconfiguración | Mecanismo de Spring Boot que crea *beans* según lo que hay en el *classpath* y la configuración (2) |
| Autoinvocación | Llamada entre métodos del mismo *bean* que no pasa por el proxy y anula `@Transactional` (7) |
| Base de datos por servicio | Patrón en el que cada servicio es el único dueño de sus datos (19) |
| Bean Validation | Especificación de validación declarativa con anotaciones; la implementa Hibernate Validator (8) |
| *Bind mount* | Montaje de una carpeta del equipo dentro de un contenedor, como `postgres/init` (27) |
| BOM | Lista de materiales que fija versiones compatibles de un conjunto de librerías (2) |
| *Branch by abstraction* | Técnica de cambio gradual: abstracción, nueva implementación detrás y retirada de la antigua (17) |
| Capa (de imagen) | Resultado de una instrucción del Dockerfile; Docker las guarda en caché y las reutiliza (26) |
| *Checksum* | Huella del contenido de una migración que Flyway usa para detectar cambios (4) |
| Clave foránea | Restricción que obliga a que un valor exista en otra tabla (12, 21) |
| Consulta derivada | Método de repositorio cuya consulta se genera a partir de su nombre (6) |
| Consulta por lotes | Pedir de una vez todos los datos que necesita una página (18) |
| Contenedor | Proceso aislado que se ejecuta a partir de una imagen (26) |
| Contexto de persistencia | Conjunto de entidades que gestiona un `EntityManager`; dura lo que la transacción (5) |
| Cortacircuitos (*circuit breaker*) | Mecanismo que deja de llamar a un servicio que falla durante un tiempo (24) |
| Criteria API | API de JPA para construir consultas con objetos Java (13) |
| `ddl-auto` | Propiedad que indica a Hibernate qué hacer con el esquema al arrancar (3) |
| Desnormalización | Copiar un dato de otro origen para poder consultarlo localmente (21) |
| *Dirty checking* | Comparación automática de entidades gestionadas con su instantánea para generar `UPDATE` (5) |
| Docker Compose | Herramienta que define y arranca varios contenedores relacionados con un fichero `compose.yaml` (27) |
| `.dockerignore` | Lista de ficheros que no se envían al construir una imagen (26) |
| DTO | Objeto de transferencia de datos entre la API y el exterior (8) |

## E – N

| Término | Definición |
|---|---|
| `EntityGraph` | Indicación de qué asociaciones cargar junto con la entidad en la misma consulta (14) |
| `EntityManager` | Interfaz de JPA para operar con entidades y su contexto de persistencia (5) |
| `ErrorResponse` | Interfaz de Spring que implementan las excepciones con código HTTP propio (25) |
| Estado gestionado (*managed*) | Entidad vigilada por el contexto de persistencia (5) |
| Estado separado (*detached*) | Entidad cuyo contexto se cerró; sus cambios ya no se sincronizan (5) |
| Fallo en cascada | Propagación del fallo de un servicio a los que lo llaman (20) |
| *Flush* | Envío a la base de datos de los cambios pendientes del contexto de persistencia (5) |
| Flyway | Herramienta de migraciones versionadas del esquema (4) |
| *Healthcheck* | Comando que Docker ejecuta periódicamente para marcar un contenedor como `healthy` o `unhealthy` (27) |
| Hibernate | Implementación de JPA usada por Spring Boot (5) |
| HikariCP | *Pool* de conexiones JDBC que usa Spring Boot por defecto (3) |
| `host.docker.internal` | Nombre con el que un contenedor llega al equipo anfitrión en Docker Desktop (26) |
| `IDENTITY` | Estrategia de generación de identificadores por columna de identidad de la base de datos (5) |
| Imagen | Sistema de ficheros de solo lectura con todo lo necesario para ejecutar una aplicación (26) |
| Inversión de dependencias | Principio por el que el código de alto nivel define las interfaces que implementa el de bajo nivel (18) |
| JAR por capas | Extracción del JAR de Spring Boot en carpetas separadas para aprovechar la caché de capas (26) |
| JPA (Jakarta Persistence) | Especificación estándar de persistencia de objetos en Java (5) |
| `JpaRepository` | Interfaz de Spring Data que reúne las operaciones CRUD, paginación y extras de JPA (6) |
| `JpaSpecificationExecutor` | Interfaz que añade a un repositorio consultas con `Specification` (13) |
| `LAZY` / `EAGER` | Modos de carga de una asociación: bajo demanda o siempre (12) |
| `LazyInitializationException` | Excepción al acceder a una asociación perezosa sin contexto de persistencia (3, 14) |
| Lector tolerante | Consumidor que solo lee los campos que necesita e ignora el resto (20) |
| Línea base (*baseline*) | *Script* que crea directamente el estado actual del esquema para instalaciones nuevas (21) |
| `@MockitoBean` | Anotación que registra un *mock* como *bean* en un contexto de prueba (11) |
| MockMvc | Herramienta que ejecuta peticiones contra Spring MVC sin abrir puertos (11) |
| Monolito modular | Aplicación única organizada en módulos con fronteras claras (1, 16) |
| Multietapa (*multi-stage*) | Dockerfile con varias etapas: una compila y otra ejecuta solo con lo necesario (26) |
| N+1 | Problema de rendimiento: una consulta más por cada elemento de una lista (14) |

## O – Z

| Término | Definición |
|---|---|
| *Open Session in View* (OSIV) | Patrón que mantiene el contexto de persistencia abierto durante toda la petición HTTP (3) |
| `Pageable` / `Page` | Petición de página (número, tamaño, orden) y resultado con metadatos (6, 9) |
| Perfil | Conjunto de configuración que se activa por nombre, como `docker` (3) |
| *Probes* (`liveness`, `readiness`) | Grupos de salud que indican si el proceso vive y si puede recibir tráfico (26) |
| Problem Details | Formato estándar de errores HTTP (RFC 9457) soportado por Spring con `ProblemDetail` (10) |
| Propagación | Regla que decide qué hace un método transaccional si ya hay una transacción en curso (7) |
| Proxy | Objeto intermediario generado por Spring o Hibernate: transaccional, de repositorio o de carga perezosa (6, 7, 12) |
| Proxy inverso | Servidor que recibe las peticiones y las reenvía al servicio adecuado; en el proyecto, nginx (27) |
| Prueba de contrato | Prueba que verifica que proveedor y consumidor de una API están de acuerdo en su forma (22) |
| Puerto | Interfaz definida por el núcleo de una aplicación con lo que necesita del exterior (18) |
| *Record* | Clase inmutable de Java con constructor, accesos, `equals` y `hashCode` generados (8) |
| `ResponseStatusException` | Excepción de Spring que lleva un código HTTP y un motivo (7, 10) |
| `RestClient` | Cliente HTTP síncrono y fluido de Spring (20) |
| `@RestControllerAdvice` | Clase con manejadores de excepciones aplicables a todos los controladores (10) |
| *Rollback* | Deshacer una transacción (7, 15) |
| `@ServiceConnection` | Anotación que conecta Spring Boot a un contenedor de Testcontainers (16) |
| `SimpleJpaRepository` | Clase que implementa los métodos heredados de `JpaRepository` (6) |
| `Slice` | Resultado paginado sin recuento total (6) |
| SPA *fallback* | Regla que devuelve `index.html` para cualquier ruta de la aplicación de una sola página (27) |
| `Specification` | Condición reutilizable y combinable de Spring Data basada en la Criteria API (13) |
| *Starter* | Dependencia que agrupa librerías y activa su autoconfiguración (2) |
| Testcontainers | Librería que arranca contenedores Docker desde las pruebas (16) |
| Tiempo máximo (*timeout*) | Límite de espera de conexión o de lectura en una llamada remota (20) |
| `TIMESTAMP WITH TIME ZONE` | Tipo de PostgreSQL que guarda un instante en UTC (12) |
| `@Transactional` | Anotación que delimita una transacción alrededor de un método (7) |
| `TransactionOperations` | Interfaz de `TransactionTemplate` para delimitar una transacción en el código (25) |
| Volumen externo | Volumen que Compose usa pero nunca crea ni borra (27) |
| `@WebMvcTest` | Prueba que arranca solo la capa web de Spring MVC (11) |
