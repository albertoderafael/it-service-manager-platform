# Equivalencias Java EE ↔ Spring Boot

<p class="lead">Tabla de traducción para quien viene de Java EE sobre WebSphere. La columna de notas señala dónde la equivalencia no es exacta.</p>

## Plataforma y despliegue

| Java EE / WebSphere | Spring Boot | Notas |
|---|---|---|
| Servidor de aplicaciones instalado aparte | Tomcat embebido en el JAR | La aplicación contiene su servidor (2) |
| EAR con WAR y EJB-JAR | Un JAR ejecutable | `java -jar` o `mvnw spring-boot:run` |
| Consola de administración | `application.properties`, variables de entorno, perfiles | La configuración viaja con el código, salvo los secretos (3) |
| Origen de datos JNDI | `spring.datasource.*` + HikariCP | El *pool* lo crea la aplicación (3) |
| Descriptores `web.xml`, `ejb-jar.xml` | Anotaciones + autoconfiguración | Sin XML en el proyecto |
| Librerías compartidas del servidor | Dependencias Maven gestionadas por el BOM | Cada servicio lleva las suyas (2) |
| Varias aplicaciones en un servidor | Un proceso por servicio | Puertos 8080 y 8081 (19) |

## Componentes y dependencias

| Java EE | Spring | Notas |
|---|---|---|
| `@Stateless` EJB | `@Service` | Los *beans* de Spring son *singleton* por defecto, no un *pool* de instancias |
| `@EJB`, `@Inject` | Inyección por constructor | Sin anotación si hay un único constructor (2) |
| Descubrimiento de componentes al desplegar | `@ComponentScan` desde la clase principal | Solo en el paquete raíz y subpaquetes (2) |
| `@Produces` (CDI) | Métodos `@Bean` en una clase `@Configuration` | No se usan en el proyecto |
| Interceptores (`@AroundInvoke`) | Spring AOP (proxies) | `@Transactional` funciona así (7) |
| Búsqueda JNDI de un EJB remoto | Cliente HTTP (`RestClient`) a otro servicio | Ver «llamadas remotas» (20) |

## Web y REST

| JAX-RS | Spring MVC | Notas |
|---|---|---|
| `@Path` | `@RequestMapping` | (9) |
| `@GET`, `@POST`, `@PUT` | `@GetMapping`, `@PostMapping`, `@PutMapping` | |
| `@QueryParam` | `@RequestParam` | |
| `@PathParam` | `@PathVariable` | |
| Parámetro de entidad del cuerpo | `@RequestBody` | Con `@Valid` para validar (8) |
| `Response.created(uri).entity(x)` | `ResponseEntity.created(uri).body(x)` | (9) |
| `ExceptionMapper<T>` | `@RestControllerAdvice` + `@ExceptionHandler` | Varios manejadores en una clase (10) |
| Servlet de la implementación JAX-RS | `DispatcherServlet` | |
| JSON-B / JSON-P | Jackson | Spring Boot 4 usa Jackson 3 |

## Persistencia

| Java EE | Spring | Notas |
|---|---|---|
| `javax.persistence` | `jakarta.persistence` | Mismo API, otro paquete (5) |
| OpenJPA / EclipseLink | Hibernate | |
| `@PersistenceContext EntityManager` en un DAO | Repositorio de Spring Data (interfaz) | La implementación se genera (6) |
| JPQL con `TypedQuery` | Consultas derivadas, `@Query`, `Specification` | (6, 13) |
| `persistence.xml` | `spring.jpa.*` | Sin fichero de unidad de persistencia |
| Contexto de persistencia ligado a la transacción JTA | Contexto ligado a la transacción de Spring | Igual con `open-in-view=false` (3, 5) |
| *Scripts* SQL entregados al equipo de base de datos | Migraciones Flyway versionadas | Con historial en la propia base de datos (4) |

## Transacciones

| Java EE | Spring | Notas |
|---|---|---|
| Transacciones gestionadas por el contenedor (CMT) | `@Transactional` | Proxy en lugar de contenedor EJB (7) |
| `@TransactionAttribute(REQUIRED)` | `@Transactional` (propagación `REQUIRED`) | Mismo valor por defecto |
| `@ApplicationException(rollback = true)` | `@Transactional(rollbackFor = …)` | Las comprobadas no hacen *rollback* por defecto en ninguno |
| JTA y transacciones XA entre recursos | Transacciones locales por servicio | El proyecto no usa transacciones distribuidas (17) |
| `EJBException` envolviendo la excepción | La excepción llega intacta al manejador | (15) |

## Validación

| Java EE | Spring | Notas |
|---|---|---|
| Bean Validation (`javax.validation`) | Bean Validation (`jakarta.validation`) | Misma especificación (8) |
| Validación automática en JAX-RS con `@Valid` | `@Valid` en el parámetro del controlador | Lanza `MethodArgumentNotValidException` |
| *Transfer Object* JavaBean | *Record* de Java | Inmutable (8) |

## Pruebas

| Java EE | Spring | Notas |
|---|---|---|
| Arquillian con servidor gestionado | `@SpringBootTest` | Arranca la aplicación completa en el proceso de la prueba (11, 16) |
| Base de datos de pruebas compartida | Testcontainers con PostgreSQL desechable | Una por ejecución (16) |
| Pruebas del recurso JAX-RS con cliente HTTP | `@WebMvcTest` + MockMvc | Sin abrir puertos (11) |
| Mockito | Mockito + `@MockitoBean` | (11) |

## Llamadas remotas

| Java EE | Spring | Notas |
|---|---|---|
| EJB remoto (RMI-IIOP) | `RestClient` sobre HTTP/JSON | Contrato explícito en lugar de interfaz Java compartida (20) |
| Tiempos de espera configurados en el servidor | Tiempos máximos en la fábrica de peticiones | En el código del adaptador (20) |
| `RemoteException` | `ResourceAccessException`, `RestClientResponseException` | Traducidas a 503 en el proyecto (20) |
| Interfaz remota compartida en un JAR cliente | *Record* privado del consumidor | Lector tolerante (20) |

## Despliegue

| Java EE / WebSphere | Spring Boot y contenedores | Notas |
|---|---|---|
| Servidor instalado y configurado por administración | Imagen con el JRE y la aplicación | Se comporta igual en cualquier máquina (26) |
| EAR desplegado en un servidor | Contenedor ejecutado a partir de una imagen | La imagen es la clase; el contenedor, la instancia (26) |
| Estado del servidor en la consola de administración | `/actuator/health` y el *healthcheck* de Docker | (26, 27) |
| IBM HTTP Server con el *plugin* de WebSphere | nginx como proxy inverso | Sirve el estático y reenvía las peticiones (27) |
| Varios servidores y orígenes de datos configurados a mano | `compose.yaml` versionado | Todo el sistema en un fichero (27) |
| Transacciones gestionadas por el bean (`UserTransaction`) | `TransactionOperations` / `TransactionTemplate` | Sin `try`/`finally` manual (25) |

