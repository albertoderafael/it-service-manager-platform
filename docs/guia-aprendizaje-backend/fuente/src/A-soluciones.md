# Soluciones y respuestas

<p class="lead">Soluciones de los ejercicios y respuestas de la autoevaluación de cada capítulo. Cada bloque enlaza de vuelta con su enunciado. Muchos ejercicios admiten más de una solución correcta: lo importante es el razonamiento.</p>

## Capítulo 2. Del servidor de aplicaciones a Spring Boot 4

::: solucion 2.1
En el informe aparecen en la sección *Positive matches*. La autoconfiguración del `DataSource` se activa porque existe la clase `DataSource` y un *driver* JDBC en el *classpath* y no hay ningún *bean* `DataSource` definido por el proyecto (`@ConditionalOnMissingBean`). La de Flyway se activa porque la clase `Flyway` está en el *classpath*, hay un `DataSource` disponible y la propiedad `spring.flyway.enabled` no es `false`. En Spring Boot 4 esta autoconfiguración solo existe si está el módulo que aporta `spring-boot-starter-flyway`.
:::

::: solucion 2.2
La aplicación arranca, pero `GET /api/applications` devuelve 404: el controlador está fuera del paquete `com.albertoderafael.itmanager` y sus subpaquetes, así que `@ComponentScan` no lo encuentra y no se registra ninguna ruta. No hay error al arrancar porque nadie depende del controlador. Si se moviera un servicio, en cambio, el arranque fallaría con `NoSuchBeanDefinitionException` en el controlador que lo necesita.
:::

::: respuestas 2
1. Porque el *parent* `spring-boot-starter-parent` importa una lista de materiales (BOM) que fija versiones compatibles de todas las librerías del ecosistema, incluido Hibernate.
2. `@SpringBootConfiguration` (la clase es fuente de configuración), `@EnableAutoConfiguration` (activa la autoconfiguración según el *classpath*) y `@ComponentScan` (busca componentes en el paquete de la clase y sus subpaquetes).
3. Flyway está en el *classpath* pero no se ejecuta al arrancar, porque la autoconfiguración está en el módulo que aporta el *starter*. Las tablas no se crean y la validación de Hibernate falla.
4. Dependencias obligatorias e inmutables (`final`), clases instanciables con `new` en pruebas unitarias, dependencias visibles en la firma y ciclos detectados al arrancar.
5. Las dependencias entre módulos eran visibles como `import` entre paquetes (`itmanager.demand` importando de `itmanager.application`), lo que permitió localizar exactamente los puntos de contacto que había que cortar.
:::

## Capítulo 3. PostgreSQL en Docker y la configuración

::: solucion 3.1
`docker compose ps` muestra el estado `running (healthy)` cuando `pg_isready` responde. Con `\dt` aparecen las tablas del esquema `public`; en el servicio de demandas actual, `demands` y `flyway_schema_history` (la tabla `applications` la eliminó la V5).
:::

::: solucion 3.2
La aplicación no arranca. El mensaje es del tipo `Schema-validation: missing column [owner] in table [applications]`, y lo produce Hibernate durante la creación del `EntityManagerFactory`, al validar el esquema por `ddl-auto=validate`. Flyway ya ha terminado y no ha encontrado ninguna migración nueva.
:::

::: respuestas 3
1. Para no chocar con una instalación local de PostgreSQL que use el puerto estándar 5432. Dentro del contenedor sigue siendo el 5432.
2. El contenedor se para y se elimina, pero el volumen con nombre se conserva, y con él los datos. No hay que añadir `-v`, que eliminaría también los volúmenes.
3. Docker Compose. Spring Boot no lee ficheros `.env`; necesita variables de entorno reales.
4. `validate` solo comprueba que el esquema coincide con las entidades y falla si no; `update` intenta modificar el esquema sin control ni historial. Con Flyway como única fuente de verdad, `validate` detecta desajustes sin tocar nada.
5. `LazyInitializationException`. Es una ventaja porque obliga a cargar los datos necesarios dentro del servicio y hace visibles consultas que con OSIV pasarían inadvertidas.
:::

## Capítulo 4. Migraciones de esquema con Flyway

::: solucion 4.1
`installed_rank` es el orden de aplicación; `version` y `description` salen del nombre del fichero; `checksum` es la huella del contenido, que Flyway compara en cada arranque; `success` indica si la migración terminó bien. En el servicio de demandas aparecen cinco filas, de la V1 a la V5.
:::

::: solucion 4.2
Fichero `V6__restrict_application_criticality.sql` (o el siguiente número libre) con:

```sql
ALTER TABLE applications
    ADD CONSTRAINT chk_applications_criticality
    CHECK (criticality IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));
```

No se puede editar la V1 porque ya está aplicada en otras bases de datos: su *checksum* cambiaría, Flyway se negaría a arrancar en todas ellas y, además, la restricción nunca llegaría a las bases de datos existentes, que no vuelven a ejecutar la V1. Hoy la tabla vive en `application_db`, así que la migración iría en el proyecto del catálogo.
:::

::: respuestas 4
1. Qué migraciones se han aplicado, en qué orden, cuándo y con qué resultado. El *checksum* sirve para detectar que el contenido de una migración aplicada ha cambiado.
2. Primero Flyway migra y después Hibernate valida. Importa porque Hibernate debe validar el esquema ya migrado; al revés fallaría en cuanto hubiera una migración pendiente.
3. `BY DEFAULT` permite insertar valores explícitos en la columna; `ALWAYS` lo prohíbe salvo con `OVERRIDING SYSTEM VALUE`.
4. Porque su V2 tiene otro contenido y, por tanto, otro *checksum*: Flyway detectaría la discrepancia y no arrancaría.
5. Porque reescribe el historial para que coincida con los ficheros, ocultando que la base de datos se creó con un contenido distinto del que hay ahora en el repositorio.
:::

## Capítulo 5. La entidad Application y el contexto de persistencia

::: solucion 5.1
La primera petición produce un `SELECT` y un `UPDATE`. La segunda, con los mismos datos, solo el `SELECT`: al hacer *flush*, Hibernate compara con la instantánea, no encuentra diferencias y no genera `UPDATE`. (En las demandas no ocurre así, porque `update(...)` cambia siempre `updatedAt`.)
:::

::: solucion 5.2
Las dos instancias son la misma (`==` devuelve `true`) y solo hay un `SELECT`: la segunda búsqueda se resuelve en el contexto de persistencia. Con `entityManager.clear()` entre ambas, el contexto se vacía, la primera instancia queda separada, hay dos `SELECT` y `==` devuelve `false` (aunque representen la misma fila).
:::

::: respuestas 5
1. JPA es la especificación (anotaciones e interfaces); Hibernate es la implementación que genera SQL y gestiona el contexto; Spring Data JPA es una capa superior que genera repositorios a partir de interfaces.
2. Porque una entidad nueva tiene `id` nulo, y Spring Data usa ese nulo para distinguir entidades nuevas de existentes. Un `long` primitivo valdría 0.
3. JPA lo necesita para instanciar entidades por reflexión, pero no debe usarse desde el código para crear entidades vacías e incompletas.
4. El valor actual de cada atributo de las entidades gestionadas con la instantánea guardada al cargarlas.
5. Porque el `id` lo asigna la base de datos al insertar, y Hibernate necesita conocerlo de inmediato para registrar la entidad, así que ejecuta cada `INSERT` en el momento en lugar de agruparlos en el *flush*.
:::

## Capítulo 6. Repositorios de Spring Data

::: solucion 6.1
Con `size=1` hay dos consultas: la página trae un elemento, igual al tamaño pedido, así que Spring Data no puede deducir el total y lanza el `count`. Con `size=50` hay una sola: la página trae menos elementos que el tamaño pedido y es la primera, así que el total es exactamente ese número.
:::

::: solucion 6.2
`Page<Application> findByNameContainingIgnoreCase(String text, Pageable pageable);` La consulta esperada es, en esencia, `select … from applications a where upper(a.name) like upper(?) escape '\' order by … offset … fetch first …`, con el parámetro envuelto en `%…%`, más la consulta de recuento con la misma condición.
:::

::: respuestas 6
1. `SimpleJpaRepository`.
2. Si la entidad es nueva (`id` nulo), llama a `persist`; si no, a `merge`.
3. Al arrancar la aplicación, cuando se crean los repositorios.
4. Una consulta trae los datos de la página y otra cuenta el total. Se ahorra la segunda cuando puede deducir el total, por ejemplo si la primera página trae menos elementos que el tamaño pedido.
5. Se une a la transacción existente (propagación `REQUIRED`), en lugar de abrir una nueva.
:::

## Capítulo 7. El servicio y las transacciones

::: solucion 7.1
Con `IllegalStateException`, que es no comprobada, la transacción se deshace y el cambio no se guarda. Con una `IOException` declarada en el método, la transacción **se confirma**: Spring no hace *rollback* ante excepciones comprobadas por defecto, así que el `UPDATE` llega a la base de datos aunque el cliente reciba un error.
:::

::: solucion 7.2
La llamada interna no pasa por el proxy, así que la anotación del método llamado se ignora y sigue activa la transacción de `getApplications`, de solo lectura. Con `readOnly`, Hibernate no hace *flush* automático, así que la modificación lo más probable es que no llegue a la base de datos, sin ningún error. Aunque no fuera así, el comportamiento dependería de un detalle invisible en el código, que es precisamente el problema.
:::

::: respuestas 7
1. Porque la entidad está gestionada y Hibernate detecta el cambio al hacer *flush* antes del *commit*. La condición imprescindible es que el método sea transaccional.
2. `REQUIRED`: se une a una transacción existente o abre una si no hay ninguna.
3. Ante excepciones no comprobadas (`RuntimeException` y subclases) y `Error`.
4. Una llamada de un método a otro del mismo *bean* que no pasa por el proxy; como el proxy es quien aplica la transacción, la anotación del método llamado no tiene efecto.
5. Porque dentro de la transacción la entidad está gestionada y se pueden cargar sus asociaciones perezosas; fuera, con `open-in-view=false`, fallaría.
:::

## Capítulo 8. DTO y Bean Validation

::: solucion 8.1
Aparecen dos errores de campo: `name` (`@NotBlank` rechaza la cadena vacía) y `criticality` (`urgent` no encaja con `@Pattern`, que distingue mayúsculas). `description` no aparece porque es `null` y `@Size`, su única restricción, acepta `null`.
:::

::: solucion 8.2
```java
Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
var request = new ApplicationCreateRequest("x".repeat(101), null, "HIGH");
var violations = validator.validate(request);
assertEquals(1, violations.size());
assertEquals("name",
        violations.iterator().next().getPropertyPath().toString());
```
:::

::: respuestas 8
1. El contrato de la API queda independiente del modelo; cada operación acepta solo los campos que debe; no se filtran detalles de persistencia ni se disparan cargas perezosas; las reglas de entrada no contaminan la entidad.
2. Porque JPA necesita un constructor sin argumentos y modificar los atributos, y un *record* es inmutable y no tiene constructor vacío.
3. Porque `@Pattern` considera válido el `null`; sin `@NotBlank`, un valor ausente pasaría la validación.
4. `MethodArgumentNotValidException`. El método del controlador no llega a ejecutarse.
5. Los valores válidos se repiten como texto en varios sitios y el compilador no ayuda. Se mejoraría con un `enum` y `@Enumerated(EnumType.STRING)`, que mantiene el mismo texto en el JSON y en la columna.
:::

## Capítulo 9. El controlador REST y el contrato HTTP

::: solucion 9.1
Con `sort=name,desc`, la página 0 contiene SIGMA y la página 1, ORION (orden alfabético descendente). En ambas, `totalElements` es 2 y `totalPages` es 2, porque el tamaño es 1.
:::

::: solucion 9.2
Entre el controlador y el servicio aparecen clases de Spring AOP: un proxy (su nombre contiene `$$SpringCGLIB$$` o similar), `CglibAopProxy`, `ReflectiveMethodInvocation` y `TransactionInterceptor`, que es quien abre y cierra la transacción. Por encima del controlador se ven `DispatcherServlet` y los adaptadores de Spring MVC.
:::

::: respuestas 9
1. `@RestController` añade `@ResponseBody`: el valor devuelto se serializa como cuerpo de la respuesta en lugar de interpretarse como nombre de una vista.
2. `page`, `size` y `sort`. Las páginas empiezan en 0.
3. El tamaño pasaría a 20 y no habría orden definido, así que los resultados podrían variar entre peticiones y páginas.
4. Porque la forma JSON de `PageImpl` es interna de Spring Data y puede cambiar; un DTO propio fija el contrato con el frontend.
5. El `INSERT` se ejecuta al llamar a `save` (por `IDENTITY`); la conexión se devuelve al *pool* al confirmar la transacción, antes de serializar la respuesta.
:::

## Capítulo 10. El tratamiento de errores

::: solucion 10.1
Nombre vacío: 400 `VALIDATION_ERROR` con `fieldErrors.name`. `id` inexistente: 404 `RESOURCE_ERROR`. `id` no numérico: 400 `VALIDATION_ERROR` con «Invalid value for parameter: id». JSON mal formado: 400 `VALIDATION_ERROR` con «Malformed request body». `sort=pepito`: 400 `RESOURCE_ERROR` con «Invalid application sort field: pepito», porque procede de una `ResponseStatusException`.
:::

::: solucion 10.2
```java
private static final Logger log =
        LoggerFactory.getLogger(GlobalExceptionHandler.class);

@ExceptionHandler(Exception.class)
public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {
    log.error("Unexpected error", ex);
    return ResponseEntity.internalServerError().body(new ApiErrorResponse(
            500, "INTERNAL_ERROR", "Unexpected error", Map.of()));
}
```
No interfiere porque Spring elige el manejador con el tipo más específico: `MethodArgumentNotValidException` o `ResponseStatusException` siguen yendo a sus manejadores, y solo lo que no encaja con ninguno llega a `Exception`.
:::

::: respuestas 10
1. `VALIDATION_ERROR`: la petición está mal construida (campos, tipos, JSON). `RESOURCE_ERROR`: errores que el servicio expresa con un código HTTP, como 404, 409 o los 400 de filtros.
2. `putIfAbsent` conserva un único mensaje por campo; `LinkedHashMap` mantiene el orden en que aparecieron los errores.
3. El que declara el tipo más específico de la jerarquía de la excepción.
4. La primera versión devolvía un 500 (la consulta fallaba con una propiedad inexistente). Después del paso 2.9 devuelve un 400 con el campo inválido en el mensaje.
5. Para no exponer al cliente detalles internos del analizador JSON ni nombres de clases.
:::

## Capítulo 11. Las pruebas del módulo Application

::: solucion 11.1
```java
@Test
void shouldThrowNotFoundWhenUpdatingApplication42() {
    when(applicationRepository.findById(42L)).thenReturn(Optional.empty());
    var request = new ApplicationUpdateRequest("APP", null, "HIGH", "ACTIVE");

    var ex = assertThrows(ResponseStatusException.class,
            () -> applicationService.updateApplication(42L, request));

    assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    assertEquals("Application not found: 42", ex.getReason());
    verify(applicationRepository, never()).save(any(Application.class));
}
```
:::

::: solucion 11.2
```java
@Test
void shouldRejectNonNumericId() throws Exception {
    mockMvc.perform(get("/api/applications/abc"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.message")
                    .value("Invalid value for parameter: id"));
}
```
No hace falta preparar el *mock*: la conversión de `abc` a `Long` falla antes de invocar el controlador, así que el servicio nunca se llama.
:::

::: respuestas 11
1. Porque `@SpringBootTest` arranca el contexto completo y necesita una base de datos real configurada.
2. Devuelve como resultado de `save` el mismo objeto que recibió. Así se puede comprobar el estado con el que el servicio construyó la entidad.
3. Carga el controlador indicado, los `@ControllerAdvice`, Jackson, la validación y Spring MVC. No carga servicios, repositorios ni base de datos.
4. Sustituye a `@MockBean` (eliminado en Spring Boot 4). Es necesario porque el controlador necesita un `ApplicationService` y `@WebMvcTest` no carga servicios.
5. Que el cambio llegue a PostgreSQL: sin transacción ni contexto de persistencia reales, solo demuestra el cambio en memoria.
:::

## Capítulo 12. El modelo de la demanda

::: solucion 12.1
```java
@Test
void shouldAllowOpenToCancelled() {
    Demand demand = createDemand("OPEN");
    assertDoesNotThrow(() -> demand.changeStatus("CANCELLED"));
    assertEquals("CANCELLED", demand.getStatus());
}

@Test
void shouldAllowInProgressToCancelled() {
    Demand demand = createDemand("IN_PROGRESS");
    assertDoesNotThrow(() -> demand.changeStatus("CANCELLED"));
    assertEquals("CANCELLED", demand.getStatus());
}

@Test
void shouldRejectCancelledToOpen() {
    Demand demand = createDemand("CANCELLED");
    assertThrows(IllegalStateException.class, () -> demand.changeStatus("OPEN"));
    assertEquals("CANCELLED", demand.getStatus());
}

@Test
void shouldRejectCompletedToCancelled() {
    Demand demand = createDemand("COMPLETED");
    assertThrows(IllegalStateException.class, () -> demand.changeStatus("CANCELLED"));
    assertEquals("COMPLETED", demand.getStatus());
}
```
:::

::: solucion 12.2
Con `@PreUpdate`, la fecha se asignaría durante el *flush*, que ocurre al confirmar la transacción (paso 11 de la figura 9.1). Pero el DTO se construye antes (paso 10). El cliente recibiría en la respuesta el `updatedAt` anterior, aunque en la base de datos quedaría el nuevo; la siguiente consulta mostraría otra fecha.
:::

::: respuestas 12
1. Porque PostgreSQL crea índices automáticamente para claves primarias y restricciones únicas, pero no para claves foráneas.
2. Un instante en el tiempo, normalizado a UTC; no guarda la zona horaria original.
3. `EAGER`. Se cambió a `LAZY` para no cargar la aplicación en cada consulta de demandas y decidir explícitamente cuándo cargarla.
4. Porque el formulario de modificación envía siempre el estado; si solo cambia el título, el estado llega igual y no debe rechazarse.
5. Para que el dominio no dependa de HTTP. El servicio traduce la excepción al código adecuado (409).
:::

## Capítulo 13. Consultas dinámicas con `Specification`

::: solucion 13.1
```java
if (text != null && !text.isBlank()) {
    String pattern = "%" + text.toLowerCase() + "%";
    specification = specification.and((root, query, cb) ->
            cb.like(cb.lower(root.get("title")), pattern));
}
```
SQL esperado: `… where 1=1 and lower(d1_0.title) like ? …`. En un caso real conviene escapar `%` y `_` del texto del usuario.
:::

::: solucion 13.2
La primera consulta trae la página con `where … d1_0.status = ?` y `fetch first 1 rows only`; la segunda es un `select count(d1_0.id) from demands d1_0 where … d1_0.status = ?`. Ambas aplican la misma especificación.
:::

::: respuestas 13
1. Porque cada combinación de filtros presentes y ausentes necesita su propio método: con *n* filtros, 2ⁿ combinaciones.
2. Un predicado siempre verdadero. Sirve como elemento neutro sobre el que encadenar los `and` de los filtros informados.
3. Cuando Spring Data construye la consulta, al ejecutar `findAll`, no al declararlas.
4. `JpaSpecificationExecutor<T>`.
5. Una unión entre `demands` y `applications`. Funcionaba porque ambas tablas estaban en la misma base de datos.
:::

## Capítulo 14. Carga perezosa y el problema N+1

::: solucion 14.1
Con las estadísticas activadas, Hibernate registra al final de cada sesión cuántas sentencias JDBC ejecutó. En una prueba automática se puede obtener `Statistics` desde la `SessionFactory` (`entityManagerFactory.unwrap(SessionFactory.class).getStatistics()`), ponerla a cero, ejecutar el listado y comprobar que `getPrepareStatementCount()` no supera el número esperado (por ejemplo, dos: datos y recuento).
:::

::: solucion 14.2
Sin grafo: 1 (datos) + 1 (recuento, porque la página está llena y no se puede deducir el total) + 4 (una por aplicación distinta, gracias a la caché del contexto) = 6. Con grafo: 1 + 1 = 2. Con carga por lotes de tamaño 10: 1 + 1 + 1 (las cuatro aplicaciones en un solo `IN`) = 3.
:::

::: respuestas 14
1. Porque una consulta trae *N* entidades y luego se ejecuta una más por cada una al acceder a la asociación. El número real de consultas extra es el de entidades asociadas distintas, gracias al contexto de persistencia.
2. `open-in-view=false` obliga a construir los DTO dentro del servicio, donde los accesos son visibles; `show-sql=true` muestra las consultas repetidas.
3. Indica a Spring Data que cargue la asociación `application` en la misma consulta, con una unión.
4. Porque una asociación a uno no multiplica filas; una colección sí, y Hibernate tendría que paginar en memoria.
5. Porque si la entidad asociada ya estuviera en el contexto, aparecería cargada aunque el grafo no funcionara.
:::

## Capítulo 15. Servicio, ciclo de vida y API de demandas

::: solucion 15.1
El servicio responde 409. Al lanzar `changeStatus` la excepción, el servicio la traduce a `ResponseStatusException`, no comprobada, y el proxy transaccional deshace la transacción. El cambio de título, hecho por `update(...)` en memoria, nunca llega a la base de datos.
:::

::: solucion 15.2
Hay que preparar dos *mocks*: el repositorio de demandas (`findById` devuelve una demanda creada con estado `COMPLETED`) y la dependencia que resuelve la aplicación (en el código final, `catalog.findById(…)` devuelve un `ApplicationSummary`; en el monolito, `applicationRepository.findById(…)`). Después:
```java
var ex = assertThrows(ResponseStatusException.class,
        () -> service.updateDemand(9L,
                new DemandUpdateRequest("T", null, "HIGH", "IN_PROGRESS", 7L)));
assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
assertEquals("Invalid demand status transition: COMPLETED -> IN_PROGRESS",
        ex.getReason());
```
:::

::: respuestas 15
1. Un 404 `Application not found: <id>`. Sobre una aplicación `INACTIVE` la demanda se crea: solo se comprueba la existencia.
2. Primero la existencia de la demanda, después la de la aplicación y por último la validez de la transición.
3. Porque la excepción no comprobada provoca el *rollback* y Hibernate no hace *flush* de la entidad modificada.
4. Un 400 indica una petición mal construida; un 409, una petición correcta que choca con el estado actual del recurso.
5. Que si el constructor cambia y falta un *mock*, Mockito puede inyectar `null` sin fallar, mientras que `new` no compilaría.
:::

## Capítulo 16. El monolito terminado

::: solucion 16.1
`docker ps` muestra un contenedor `postgres:18` con un nombre aleatorio y un puerto publicado alto y aleatorio (por ejemplo, `0.0.0.0:55012->5432/tcp`), además del contenedor auxiliar de Testcontainers (Ryuk), que se encarga de limpiar. Al terminar la prueba ambos desaparecen; el contenedor de desarrollo sigue en el 5433 con sus datos.
:::

::: solucion 16.2
Orden razonable de más fácil a más difícil: 2 y 3 (cambiar dependencias de código detrás de una interfaz), 1 (cambiar el modelo a un identificador), 4 (sustituir la unión por una consulta por lotes), 7 (aceptar transacciones locales), 6 (migración para eliminar la clave foránea, irreversible) y 5 (imposible de mantener; hay que retirarlo o rediseñarlo). La fase 5 siguió prácticamente ese orden.
:::

::: respuestas 16
1. Crea los detalles de conexión a partir del contenedor (URL, usuario, contraseña) y tienen prioridad sobre `spring.datasource.*` de `application.properties`.
2. Para que el contenedor se arranque una vez para toda la clase, en lugar de uno por método.
3. Cada prueba se ejecuta en una transacción que se deshace al terminar. Como nunca se confirma, Hibernate puede no enviar el SQL, y hay que forzarlo con `flush()` para comprobarlo.
4. Saber si existe y conocer su nombre.
5. Porque no basta con cambiar código Java: implican renunciar a consultas que hoy funcionan o cambiar el esquema de la base de datos.
:::

## Capítulo 17. Decidir la extracción

::: solucion 17.1
El catálogo de aplicaciones seguiría siendo el primero: lo usan Demandas e Incidencias y no depende de nadie. Equipos sería el siguiente candidato si Incidencias lo referencia y no depende de otros módulos. Incidencias y Demandas, que dependen de los anteriores, serían los últimos. El criterio es extraer primero lo que otros usan y no depende de nadie.
:::

::: solucion 17.2
1) Crear un módulo Maven `common-errors` con `ApiErrorResponse` y el manejador, sin usarlo todavía. 2) Hacer que un servicio dependa de él y elimine su copia, comprobando sus pruebas. 3) Repetir con el otro servicio. 4) Publicar la librería con versión. Después de cada paso, todo compila y las pruebas pasan. (También es razonable decidir que una librería compartida acopla los servicios y no merece la pena por dos clases.)
:::

::: respuestas 17
1. Porque es un dato de referencia que usan otros módulos, cambia a otro ritmo y no depende de nadie; extraerlo no exige llamadas de vuelta.
2. Por ejemplo: la llamada remota puede fallar o tardar (tiempos máximos, 503); las transacciones dejan de ser compartidas (sin clave foránea); no se pueden unir datos de las dos bases de datos (consulta por lotes, ordenación retirada).
3. Introducir una abstracción entre el consumidor y la implementación, cambiar la implementación detrás de ella y retirar lo antiguo, manteniendo el sistema funcionando en cada paso.
4. Porque son los únicos irreversibles; se hacen cuando todo lo demás está probado.
5. Que una demanda apunte a una aplicación inexistente. Se mitiga comprobando la existencia en el servicio y no borrando aplicaciones.
:::

## Capítulo 18. Una frontera dentro del monolito

::: solucion 18.1
Desde la raíz del proyecto: buscar `import com.albertoderafael.itmanager.application` en `src/main/java/com/albertoderafael/itmanager/demand`; no debe haber resultados. Con ArchUnit, una prueba con una regla del tipo `noClasses().that().resideInAPackage("..demand..").should().dependOnClassesThat().resideInAPackage("..application..")` fallaría en cuanto alguien añadiera esa dependencia.
:::

::: solucion 18.2
```java
Page<DemandResponse> responsePage = demands.map(demand -> {
    ApplicationSummary application = applications.get(demand.getApplicationId());
    String name = application == null ? null : application.name();
    return toResponse(demand, demand.getApplicationId(), name);
});
```
(con un `toResponse` que reciba el `id` y el nombre). El contrato cambia: `applicationName` puede ser `null` y el frontend debe mostrarlo como «no disponible». En `DemandCatalogTest` habría que añadir una prueba con una aplicación ausente que compruebe que la página se devuelve con `applicationName` nulo en esa fila.
:::

::: respuestas 18
1. El consumidor. Así la dependencia apunta hacia el núcleo y cambiar de adaptador no obliga a cambiar quien usa el puerto.
2. Porque expresa solo lo necesario, no expone el modelo interno y puede construirse igual desde JPA que desde una respuesta HTTP.
3. No. La columna es la misma y la clave foránea se mantuvo; solo cambió la forma de verla en Java.
4. Una llamada para la página de diez demandas (con tres identificadores) y ninguna para la página vacía.
5. Porque la paginación ya se aplicó; ordenar los elementos de una página no los convierte en los que corresponden a esa página en el orden global.
:::

## Capítulo 19. Nace `application-catalog-service`

::: solucion 19.1
`ids=1,2,999` devuelve dos resúmenes (el 999 no existe y no aparece). `ids=1&ids=2` devuelve lo mismo que `ids=1,2`: Spring acepta ambas formas. `ids=abc` devuelve un 400 `VALIDATION_ERROR` con «Invalid value for parameter: ids».
:::

::: solucion 19.2
Un fichero `/docker-entrypoint-initdb.d/10-application-db.sh` (los `.sql` no expanden variables) con:
```bash
#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE USER application_user WITH PASSWORD '${APPLICATION_DB_PASSWORD}';
  CREATE DATABASE application_db OWNER application_user;
EOSQL
```
y la variable `APPLICATION_DB_PASSWORD` pasada al contenedor en `compose.yaml` desde el entorno. No se ejecutaría sobre el volumen existente porque la imagen oficial solo ejecuta esos *scripts* cuando el directorio de datos está vacío, es decir, la primera vez.
:::

::: respuestas 19
1. Que cada servicio es el único dueño de sus datos y los demás acceden a ellos solo por su API. No lo invalida porque la separación es lógica: bases de datos y usuarios distintos.
2. Porque los datos reales venían del monolito con sus identificadores; una V2 con datos de ejemplo habría ocupado o duplicado esos identificadores.
3. Elige la ruta más específica: un segmento literal (`/summaries`) gana a una variable (`/{id}`).
4. Porque las demandas existentes apuntan a las aplicaciones por su `id`. Después hay que ajustar la secuencia con `setval` para que las nuevas aplicaciones no reutilicen identificadores.
5. Demuestra que el `UPDATE` es SQL válido (el `flush` no falla), pero no que los valores leídos vengan de PostgreSQL, porque sin `clear()` la entidad se lee de la memoria.
:::

## Capítulo 20. El adaptador HTTP con `RestClient`

::: solucion 20.1
Con el catálogo parado, el listado de demandas responde 503 «Application Catalog is unavailable» casi al instante: el sistema operativo rechaza la conexión de inmediato porque no hay nadie escuchando en el 8081, sin esperar al tiempo máximo de conexión. Al arrancar el catálogo, la siguiente petición funciona sin reiniciar el servicio de demandas, porque cada petición abre su propia conexión.
:::

::: solucion 20.2
Añadir en `setUp` un contexto `/api/applications/slow` cuyo manejador haga `Thread.sleep(4000)` antes de responder, y una prueba que llame a `catalog.findById(...)` de forma que la ruta termine en `/slow` (por ejemplo, ajustando el servidor para que esa ruta responda a un `id` concreto) y espere una `ResponseStatusException` con 503. Para no esperar cuatro segundos, se puede hacer configurable el tiempo de lectura (por constructor o propiedad) y usar, por ejemplo, 200 ms en la prueba con un retraso de 500 ms.
:::

::: respuestas 20
1. La propagación del fallo de un servicio al que lo llama, por ejemplo agotando sus hilos en esperas indefinidas. Los tiempos máximos acotan la espera, liberan los recursos y convierten el problema en un error controlado.
2. Porque no depende del DTO de otro proyecto y solo lee los campos que necesita (lector tolerante); los demás se ignoran.
3. Porque un 404 es una respuesta de negocio («no existe»), mientras que un fallo de conexión significa «no puedo saberlo»; responder 404 en ese caso sería falso.
4. La transacción retiene una conexión a la base de datos mientras espera la respuesta HTTP, lo que puede agotar el *pool*.
5. Porque intercepta las peticiones dentro del propio `RestClient` sin abrir conexiones reales, así que no puede simular un servidor inaccesible.
:::

## Capítulo 21. Separar las bases de datos

::: solucion 21.1
Cinco filas: tras V1 existe `applications`; tras V2 tiene dos filas; tras V3 existe `demands` con la clave foránea hacia `applications`; tras V4 la clave foránea ha desaparecido; tras V5 ya no existe `applications` y solo queda `demands` (más el historial de Flyway).
:::

::: solucion 21.2
Migración `V6__add_application_name_to_demands.sql` con `ALTER TABLE demands ADD COLUMN application_name VARCHAR(100);`, seguida de un relleno inicial con los nombres obtenidos del catálogo (un proceso puntual, no SQL, porque los datos están en otra base de datos) y, después, `NOT NULL` si se quiere. Habría que escribirla al crear y al modificar una demanda (el servicio ya tiene el nombre en ese momento). Si una aplicación se renombra, las demandas mostrarían el nombre antiguo hasta actualizarse; para enterarse, el catálogo podría publicar un evento «aplicación renombrada» que el servicio de demandas consumiera para actualizar sus filas.
:::

::: respuestas 21
1. Porque las aplicaciones creadas en el catálogo no existirían en la tabla local, y la clave foránea impediría guardar demandas sobre ellas.
2. Porque PostgreSQL no permite borrar una tabla referenciada por una clave foránea.
3. Para no dejar una segunda fuente de verdad con datos congelados que alguien podría consultar por error.
4. Sustituye al adaptador `RestApplicationCatalog` (el puerto `ApplicationCatalog`). Siguen siendo reales Spring, Flyway, Hibernate, las transacciones y PostgreSQL.
5. Que se puede guardar una referencia a una aplicación inexistente, es decir, que la clave foránea ya no existe. `saveAndFlush` fuerza el `INSERT` y `clear` obliga a releer de la base de datos.
:::

## Capítulo 22. Validar el sistema completo

::: solucion 22.1
En condiciones normales, la comprobación 3 tarda unos milisegundos más que la consulta de un monolito por la llamada HTTP. Con el catálogo parado, responde casi al instante con 503 porque la conexión se rechaza de inmediato (no hay proceso escuchando en el puerto); el tiempo máximo de conexión solo se agotaría si el servidor no respondiera en absoluto, por ejemplo por un cortafuegos que descarta paquetes.
:::

::: solucion 22.2
Maven muestra al final `Tests run: 18` en el catálogo y `Tests run: 35` en demandas si todas se ejecutan. Una prueba que falle se localiza por su clase: las de `*ServiceTest` y `DemandTest` son unitarias (capítulos 11, 12 y 18), las de `*ControllerTest` son de capa web (11, 15), `RestApplicationCatalogTest` es del adaptador (20) y las de `*IntegrationTest` y `*ApplicationTests` necesitan Docker (16, 19, 21).
:::

::: respuestas 22
1. Porque no llama al catálogo al arrancar, solo cuando una petición lo necesita. Implica que haber arrancado no garantiza que pueda trabajar.
2. La 5 frente a la 8: una aplicación inexistente da 404 y un catálogo parado da 503.
3. Porque las respuestas del catálogo en las pruebas de demandas están escritas a mano (*mocks* y servidor del JDK); nada contrasta esas respuestas con el catálogo real.
4. Se perdió la ordenación por aplicación, la integridad garantizada por la base de datos y la sencillez (latencia, nuevo modo de fallo). Se ganó un dueño y una API para el catálogo, bases de datos independientes, despliegues separados y preparación para nuevos módulos.
5. El final del paso 5.6: monolito con el puerto `ApplicationCatalog` y su adaptador JPA.
:::

## Capítulo 23. Errores y lecciones aprendidas

::: solucion 23.1
Una priorización razonable pone primero el 1 (transacción abierta durante la llamada HTTP: con un catálogo lento puede dejar sin conexiones a todo el servicio; se detecta con una prueba que simule un catálogo lento y peticiones concurrentes), el 3 (una referencia rota bloquea todo el listado; prueba con una aplicación ausente) y el 8 (sin prueba del tiempo de lectura, el escenario más peligroso no está protegido; prueba con un servidor que responde tarde). El 12 va el último: no tiene efecto funcional.
:::

::: solucion 23.2
Inyectar el `EntityManager` en la prueba (`@Autowired private EntityManager entityManager;`) y, justo después de `applicationRepository.flush();`, añadir `entityManager.clear();`. Así, el `findById` posterior ejecuta un `SELECT` real y los valores comprobados vienen de PostgreSQL.
:::

::: respuestas 23
1. Que el código del servicio se escribió suponiendo una llamada local (rápida, siempre disponible, sin datos ausentes) y no se revisó al pasar a una llamada remota.
2. Porque no es reproducible: no hay procedimiento escrito para repetirlo en otro entorno, y dejó un volcado con datos reales en la carpeta del proyecto.
3. Una prueba de contrato entre frontend y backend, o una prueba del frontend que valide sus campos de ordenación contra la lista del servidor.
4. El análisis estático del IDE, un formateador automático, o herramientas en el *build* como Checkstyle o SpotBugs.
5. La sexta: «Ver pasar la suite es parte del trabajo».
:::

## Capítulo 24. Estado final y próximos pasos

::: solucion 24.1
Una selección razonable: ejecutar las dos suites (terminado cuando ambas pasan y el resultado queda registrado); sacar la llamada al catálogo de la transacción (prueba que verifique que no hay transacción activa durante la llamada, por ejemplo con `TransactionSynchronizationManager.isActualTransactionActive()` en un *mock* del catálogo); traducir 4xx a 502 (prueba en `RestApplicationCatalogTest`); *script* de inicialización de `application_db` (crear un volumen nuevo y arrancar el catálogo sin pasos manuales); y prueba del tiempo de lectura (la del ejercicio 20.2).
:::

::: solucion 24.2
Añadir a `postgres` el volumen `postgres_data:/var/lib/postgresql`, el `healthcheck` con `pg_isready` y los *scripts* de inicialización; publicar `8081:8081` y `8080:8080`; y para cada servicio un `healthcheck` como `curl -f http://localhost:8081/actuator/health` (si la imagen incluye `curl`). En los proyectos haría falta añadir `spring-boot-starter-actuator` y exponer el *endpoint* de salud. El servicio de demandas podría depender del catálogo con `condition: service_healthy`, aunque no es imprescindible, porque arranca sin él.
:::

::: respuestas 24
1. Solo el contenedor de PostgreSQL 18.6, con su volumen y su comprobación de salud.
2. Porque todo lo demás se construiría sobre una base cuyo funcionamiento no se ha verificado.
3. Deja de llamar durante un tiempo a un servicio que está fallando y responde de inmediato, sin consumir recursos esperando; el tiempo máximo solo acota cada espera individual.
4. Porque dentro de la red de Compose los servicios se comunican por los puertos internos de los contenedores; el 5433 es solo el puerto publicado en el equipo.
5. Que dos modificaciones simultáneas se pisen sin saberlo. El conflicto produciría un 409.
:::

## Capítulo 25. Cerrar la separación

::: solucion 25.1
Como `DemandIntegrationTest` es `@Transactional`, cada prueba se ejecuta dentro de una transacción abierta por la propia prueba, y `isActualTransactionActive()` devolvería `true` aunque el servicio no abriera ninguna. La comprobación solo tiene sentido en una clase de prueba **sin** `@Transactional` (limpiando los datos a mano al terminar, o en una base de datos propia). Dentro de `thenAnswer` se comprueba `assertFalse(TransactionSynchronizationManager.isActualTransactionActive())` y se devuelve el `ApplicationSummary`; si alguien vuelve a poner `@Transactional` en el servicio, la prueba falla.
:::

::: solucion 25.2
Leer una demanda es **mostrar** algo que ya existe: si su aplicación desapareció, la información más útil es la demanda con un aviso, no un error que oculta todo el listado. Crear o modificar es **aceptar** datos nuevos: guardar una demanda que apunta a una aplicación inexistente crearía a sabiendas un dato incoherente. Si el alta degradara, un usuario podría crear demandas con un `applicationId` mal escrito, que aparecerían para siempre como «Aplicación no disponible» sin que nadie supiera que el error fue al darlas de alta.
:::

::: respuestas 25
1. Porque `save()` de `SimpleJpaRepository` abre y cierra su propia transacción. El servicio ya no necesita una transacción alrededor de todo el método, y así la llamada al catálogo queda fuera.
2. Delimita la transacción solo alrededor de la parte que escribe en la base de datos, después de la llamada remota. `@Transactional` abarca el método entero.
3. Porque un 404 de `findById` es una respuesta de negocio («no existe»), no un fallo. Capturándolo dentro de la petición, todo lo que llega a `executeRequest` es un fallo y se traduce a 502 o 503.
4. Que las excepciones propias de Spring MVC (ruta inexistente, verbo no permitido…) se conviertan en un 500 y una URL mal escrita parezca un fallo del servidor.
5. Que se usa `DB_PASSWORD` si existe y, si no, `APPLICATION_DB_PASSWORD`. No tiene un valor por defecto real porque un servicio sin contraseña debe negarse a arrancar, y una contraseña escrita en el código acabaría en el repositorio.
:::

## Capítulo 26. Imágenes de contenedor

::: solucion 26.1
Al cambiar una clase, todos los pasos hasta `COPY src ./src` aparecen como `CACHED` (incluida la descarga de dependencias) y solo se repiten la compilación y la última capa de la imagen: unos segundos. Al cambiar el `pom.xml`, la caché se invalida desde `COPY pom.xml`, Maven vuelve a ejecutar `dependency:go-offline` y el *build* tarda como la primera vez. Docker reutiliza las capas hasta la primera instrucción cuyo resultado cambia.
:::

::: solucion 26.2
`docker history` lista las capas de la más reciente a la más antigua. Las cuatro creadas por `COPY --from=build` corresponden a `dependencies/` (la más grande, decenas de megas), `spring-boot-loader/` (pequeña), `snapshot-dependencies/` (vacía o casi) y `application/` (unos kilobytes). Al modificar una clase solo cambia la capa de `application/`.
:::

::: respuestas 26
1. Los *endpoints* bajo `/actuator`, los indicadores de salud (base de datos, disco, estado del proceso) y, con `probes.enabled`, los grupos `liveness` y `readiness`.
2. Porque el servicio de demandas sigue siendo útil con el catálogo caído; si su salud dependiera de él, un orquestador podría reiniciarlo o retirarlo por un fallo ajeno y provocar un fallo en cascada.
3. Una imagen más pequeña y con menos superficie de ataque: no lleva Maven, ni el JDK completo, ni el código fuente.
4. Para que la descarga de dependencias quede en una capa que se reutiliza mientras el `pom.xml` no cambie; al modificar el código solo se repite la compilación.
5. El propio contenedor. Desde él se llega al PostgreSQL publicado en tu equipo con el nombre especial `host.docker.internal`.
:::

## Capítulo 27. La plataforma con Docker Compose

::: solucion 27.1
Con `docker compose down` (sin `-v`) se eliminan los contenedores; al volver a arrancar con `POSTGRES_VOLUME=itsp_prueba`, PostgreSQL encuentra el volumen vacío, crea `it_service_manager` y `itmanager` a partir de las variables `POSTGRES_*` y ejecuta el *script* de `postgres/init`, que crea `application_user` y `application_db`. Al arrancar, Flyway migra cada base de datos desde cero (V1 a V5 en demandas, V1 en el catálogo). En pgAdmin, una conexión con `application_user` a `it_service_manager` debe fallar con un error de permiso de conexión. Al terminar: `down`, restaurar `POSTGRES_VOLUME` y `up -d`; el volumen de prueba se puede eliminar con `docker volume rm itsp_prueba`, porque no contiene nada que conservar.
:::

::: solucion 27.2
Se quitarían los bloques `ports` de `postgres`, `application-catalog-service` y `demand-service`, y quedaría solo `8088:80` en `web`. Dejarían de funcionar pgAdmin y Spring Tools contra la base de datos de Docker, y Vite, que llega a los servicios por los puertos 8080 y 8081. Para conservar las dos formas, el `compose.yaml` base publicaría solo `web`, y un `compose.override.yaml` (que Compose aplica automáticamente si existe) añadiría los demás puertos para desarrollo. En un entorno real se arrancaría solo con el fichero base (`docker compose -f compose.yaml up -d`).
:::

::: respuestas 27
1. Para que ningún servicio sea dueño de la infraestructura común; la plataforma es la que conoce el sistema completo y cada servicio solo sabe construirse a sí mismo.
2. Un volumen normal es propiedad del proyecto y `down -v` lo elimina; uno externo nunca lo crea ni lo borra Compose, ni siquiera con `-v`.
3. Porque dentro de la red los contenedores se comunican por sus puertos internos; el 5433 es solo el puerto publicado en el equipo anfitrión.
4. Solo cuando el volumen de datos está vacío (instalación nueva). La contraseña llega como variable de entorno y se pasa a `psql` como variable para que `:'app_password'` la inserte correctamente entrecomillada, sin escribirla en el fichero.
5. Que nginx no pueda arrancar si un servicio todavía no existe: con el nombre en una variable y el DNS de Docker, el nombre se resuelve en cada petición y solo falla la ruta del servicio parado.
:::

