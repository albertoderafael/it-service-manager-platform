# El monolito terminado

<p class="lead">Al terminar el módulo de demandas, el backend estaba completo para lo que el frontend necesitaba. Antes de seguir, conviene detenerse: revisar el conjunto, asegurar las pruebas contra una base de datos real y, sobre todo, mirar con atención el único punto en el que los dos módulos se tocan.</p>

## El monolito completo [paso 4.1]

<figure>
<svg viewBox="0 0 680 300" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="m16" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker>
  <marker id="m16r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#be123c"/></marker></defs>
  <rect x="10" y="10" width="140" height="44" rx="8" fill="#fff7ed" stroke="#fdba74"/><text x="80" y="30" text-anchor="middle" font-weight="700">Frontend React</text><text x="80" y="45" text-anchor="middle" font-size="9" fill="#475569">proxy de Vite: /api</text>
  <rect x="190" y="10" width="480" height="220" rx="10" fill="#f8fafc" stroke="#0b1220" stroke-width="1.4"/>
  <text x="430" y="30" text-anchor="middle" font-weight="700">it-service-manager · un proceso · puerto 8080</text>
  <rect x="210" y="45" width="200" height="150" rx="8" fill="#ecfeff" stroke="#0891b2"/>
  <text x="310" y="63" text-anchor="middle" font-weight="700" fill="#0e7490">application</text>
  <g text-anchor="middle" font-size="9.5"><text x="310" y="85">ApplicationController</text><text x="310" y="105">ApplicationService</text><text x="310" y="125">ApplicationRepository</text><text x="310" y="145">Application (entidad)</text></g>
  <rect x="450" y="45" width="200" height="150" rx="8" fill="#ecfeff" stroke="#0891b2"/>
  <text x="550" y="63" text-anchor="middle" font-weight="700" fill="#0e7490">demand</text>
  <g text-anchor="middle" font-size="9.5"><text x="550" y="85">DemandController</text><text x="550" y="105">DemandService</text><text x="550" y="125">DemandRepository (+ grafo)</text><text x="550" y="145">Demand (entidad)</text></g>
  <text x="430" y="215" text-anchor="middle" font-size="9" fill="#475569">exception · GlobalExceptionHandler · ApiErrorResponse (compartido)</text>
  <g stroke="#be123c" stroke-width="1.5" fill="none" stroke-dasharray="5 3">
    <line x1="490" y1="101" x2="400" y2="121" marker-end="url(#m16r)"/>
    <line x1="490" y1="141" x2="400" y2="141" marker-end="url(#m16r)"/>
  </g>
  <rect x="190" y="245" width="480" height="45" rx="8" fill="#0b1220"/>
  <text x="430" y="264" text-anchor="middle" fill="#fff" font-weight="700">PostgreSQL · it_service_manager</text>
  <text x="430" y="280" text-anchor="middle" fill="#a5f3fc" font-size="9">applications ← fk_demands_application ← demands</text>
  <line x1="150" y1="32" x2="188" y2="32" stroke="#0891b2" stroke-width="1.4" marker-end="url(#m16)"/>
  <line x1="430" y1="230" x2="430" y2="243" stroke="#0891b2" stroke-width="1.4" marker-end="url(#m16)"/>
</svg>
<figcaption><b>Figura 16.1.</b> El monolito terminado. Las flechas discontinuas son las dependencias del módulo de demandas hacia el de aplicaciones: el servicio usa su repositorio y la entidad tiene una asociación con la suya.</figcaption>
</figure>

| Aspecto | Estado al final de la fase 4 |
|---|---|
| Proceso | Una aplicación Spring Boot, puerto 8080 |
| Base de datos | Una, `it_service_manager`, migraciones V1 a V3 |
| Módulos | `application` y `demand`, más `exception` compartido |
| *Endpoints* | 4 de aplicaciones y 4 de demandas |
| Integridad | Clave foránea entre `demands` y `applications` |
| Transacciones | Locales; crear una demanda lee la aplicación en la misma transacción |
| Pruebas | Unitarias, de capa web y de integración con PostgreSQL real |

El frontend consume las dos APIs a través del proxy de desarrollo de Vite, que reenvía todo lo que empieza por `/api` al puerto 8080. Para el navegador, frontend y backend comparten origen, así que no hace falta configurar CORS.

::: proyecto
Un detalle del contrato quedó desalineado entre los dos lados: el frontend ofrece ordenar las demandas por más campos de los que el backend acepta en su lista blanca, y el backend responde a esos casos con un 400. La guía del frontend lo documenta con una prueba que lo demuestra. En la fase 5 la discrepancia crece, porque uno de esos campos, el nombre de la aplicación, deja de estar disponible (capítulo 21).
:::

## Pruebas contra un PostgreSQL real con Testcontainers [paso 4.2]

La prueba `contextLoads` original dependía de que cada desarrollador tuviera un PostgreSQL configurado (capítulo 11). La solución fue que la propia prueba arranque su base de datos en Docker con **Testcontainers**:

```java title="ItServiceManagerApplicationTests.java" estado="impl"
@Testcontainers
@SpringBootTest
class ItServiceManagerApplicationTests {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:18");

    @Test
    void contextLoads() {
    }
}
```

```xml title="pom.xml (dependencias de prueba añadidas)" estado="impl"
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-testcontainers</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers-junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers-postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

### Qué ocurre al ejecutar la prueba

1. **`@Testcontainers`** activa la extensión de JUnit 5 que gestiona los contenedores declarados en la clase.
2. **`@Container`** sobre un atributo `static` indica que el contenedor se arranca **una vez para toda la clase**, antes de la primera prueba, y se para al terminar. Sin `static`, se arrancaría uno nuevo para cada método.
3. Testcontainers pide a Docker un contenedor `postgres:18`, con la base de datos y el usuario que configura por defecto, y lo publica en **un puerto aleatorio libre** del equipo. Espera a que PostgreSQL acepte conexiones.
4. **`@ServiceConnection`** hace que Spring Boot lea del contenedor la URL, el usuario y la contraseña reales, y cree con ellos los detalles de conexión del `DataSource`, **por encima** de lo que diga `application.properties`. No hay que escribir ninguna URL.
5. **`@SpringBootTest`** arranca la aplicación completa contra esa base de datos vacía: Flyway aplica V1 a V3, Hibernate valida el esquema y el contexto queda listo.
6. Al terminar, el contenedor se elimina con todos sus datos.

<figure>
<svg viewBox="0 0 680 150" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="m16b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <g text-anchor="middle">
    <rect x="10" y="40" width="140" height="60" rx="8" fill="#0b1220"/><text x="80" y="64" fill="#fff" font-weight="700">JUnit + extensión</text><text x="80" y="80" fill="#a5f3fc" font-size="9">@Testcontainers</text>
    <rect x="190" y="40" width="140" height="60" rx="8" fill="#ecfeff" stroke="#0891b2"/><text x="260" y="64" font-weight="700">Docker</text><text x="260" y="80" font-size="9" fill="#475569">postgres:18 · puerto aleatorio</text>
    <rect x="370" y="40" width="140" height="60" rx="8" fill="#ecfeff" stroke="#0891b2"/><text x="440" y="64" font-weight="700">@ServiceConnection</text><text x="440" y="80" font-size="9" fill="#475569">URL, usuario, contraseña</text>
    <rect x="550" y="40" width="120" height="60" rx="8" fill="#ecfeff" stroke="#0891b2"/><text x="610" y="64" font-weight="700">Spring Boot</text><text x="610" y="80" font-size="9" fill="#475569">Flyway + Hibernate</text>
  </g>
  <g stroke="#0891b2" stroke-width="1.4"><line x1="150" y1="70" x2="188" y2="70" marker-end="url(#m16b)"/><line x1="330" y1="70" x2="368" y2="70" marker-end="url(#m16b)"/><line x1="510" y1="70" x2="548" y2="70" marker-end="url(#m16b)"/></g>
  <text x="340" y="130" text-anchor="middle" font-size="9" fill="#475569">la base de datos de desarrollo y su volumen no se tocan en ningún momento</text>
</svg>
<figcaption><b>Figura 16.2.</b> Una prueba con Testcontainers crea su propio PostgreSQL desechable y conecta la aplicación a él.</figcaption>
</figure>

::: decision PostgreSQL real en lugar de una base de datos en memoria
**Motivo:** las pruebas se ejecutan contra el mismo motor y la misma versión mayor que el entorno real, con las mismas migraciones de Flyway, los mismos tipos (`TIMESTAMP WITH TIME ZONE`, columnas de identidad) y las mismas restricciones. **Alternativa descartada:** H2 en memoria, más rápida y sin Docker, pero con otro dialecto SQL: una migración válida en H2 puede fallar en PostgreSQL y al revés. **Coste:** las pruebas de integración necesitan Docker en marcha y tardan más.
:::

::: java
En Java EE las pruebas de integración solían necesitar Arquillian y un servidor de aplicaciones gestionado, o una base de datos compartida del equipo, con el riesgo de que dos ejecuciones se pisaran. Testcontainers da a cada ejecución su propia base de datos limpia.
:::

### Una prueba de integración del monolito

Con la infraestructura lista, las pruebas de integración pueden comprobar lo que las unitarias no alcanzan: que el SQL funciona, que la transacción se confirma y que Flyway deja la base de datos como Hibernate espera.

```java title="DemandIntegrationTest.java (monolito)" estado="reconstruido"
@Testcontainers
@SpringBootTest
@Transactional
class DemandIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres =
            new PostgreSQLContainer("postgres:18")
                    .withDatabaseName("it_service_manager")
                    .withUsername("itmanager")
                    .withPassword("test");

    @Autowired
    private DemandService demandService;

    @Test
    void shouldCreateDemandLinkedToApplication() {

        // La aplicación 1 la crea la migración V2
        var response = demandService.createDemand(
                new DemandCreateRequest(
                        "Adaptación a la nueva normativa",
                        "Incorporar nuevos tipos de expediente",
                        "HIGH",
                        1L));

        assertNotNull(response.id());
        assertEquals("OPEN", response.status());
        assertEquals("SIGMA", response.applicationName());
        assertNotNull(response.createdAt());
    }
}
```

::: reconstruido
La declaración del contenedor y el cuerpo de la prueba proceden de `shouldCreateDemandLinkedToExternalApplication`, en el código final. En el monolito no hacía falta simular el catálogo: la aplicación existía de verdad en la base de datos de la prueba, creada por la migración V2.
:::

**`@Transactional` en la clase de prueba** tiene un efecto distinto que en el código de producción: cada método de prueba se ejecuta en una transacción que **se deshace al terminar**. Así, lo que crea una prueba no lo ve la siguiente, y todas parten del estado que dejan las migraciones.

::: atencion Una transacción que nunca se confirma
Como la transacción de la prueba se deshace, Hibernate puede no llegar a enviar nunca el SQL a la base de datos: el `UPDATE` de una modificación se queda pendiente hasta un *flush* que no llega. Por eso las pruebas de integración del proyecto llaman a `flush()` o `saveAndFlush()` cuando quieren comprobar que el SQL realmente funciona, y a `clear()` cuando quieren releer de la base de datos en lugar de la memoria.
:::

::: leccion Dos versiones de la misma clase
`ItServiceManagerApplicationTests` usa `org.testcontainers.containers.PostgreSQLContainer<?>`, la clase clásica, genérica; las pruebas de integración más recientes usan `org.testcontainers.postgresql.PostgreSQLContainer`, sin genérico, la ubicación que introdujo Testcontainers 2 y que sustituye a la anterior, marcada como obsoleta. Las dos funcionan, pero conviene unificar en la nueva. Se recoge en el capítulo 23.
:::

## El acoplamiento entre Demand y Application [paso 4.3]

El monolito funciona y está probado. Pero la figura 16.1 tiene dos flechas discontinuas que conviene examinar, porque determinan cuánto costaría separar los módulos. Revisando el código, el módulo de demandas dependía del de aplicaciones en siete puntos:

| # | Punto de contacto | Dónde | Tipo |
|---|---|---|---|
| 1 | La entidad `Demand` tiene un atributo `Application` | Modelo | Código |
| 2 | `DemandService` usa `ApplicationRepository` para comprobar que existe | Servicio | Código |
| 3 | `toResponse` navega por la asociación para obtener el nombre | Servicio | Código |
| 4 | `@EntityGraph` une las dos tablas en el listado | Repositorio | SQL |
| 5 | `sort=application.name` ordena con una unión | Repositorio | SQL |
| 6 | `fk_demands_application` | Base de datos | Esquema |
| 7 | Crear una demanda lee la aplicación en la misma transacción | Servicio | Transacción |

Lo que el módulo de demandas necesita de una aplicación es muy poco: **saber si existe** y **conocer su nombre**. Sin embargo, para obtener esas dos cosas, depende de la entidad completa, del repositorio, de la tabla y de que ambas estén en la misma base de datos.

Mientras todo sea un monolito, esa dependencia es cómoda. Pero si el catálogo de aplicaciones tuviera que vivir aparte (porque lo usan otros sistemas, porque lo mantiene otro equipo o porque escala de forma distinta), cada uno de esos siete puntos sería un obstáculo. Y los obstáculos no son iguales: los puntos 1 a 3 se resuelven cambiando código Java; los 4 y 5 obligan a renunciar a consultas SQL que hoy funcionan; el 6 exige una migración; y el 7 cambia las garantías de consistencia.

::: decision Detenerse antes de crecer
**Motivo:** antes de añadir más módulos (incidencias, equipos), interesaba saber si la estructura aguantaría una separación. Identificar los puntos de contacto con el código delante permitió estimar el coste real de extraer el catálogo. **Consecuencia:** esta tabla se convirtió en la lista de trabajo de la fase 5.
:::

## Balance del monolito

| Fortalezas | Debilidades |
|---|---|
| Una sola unidad que desplegar y depurar | Los módulos solo están separados por convención |
| Transacciones ACID entre módulos sin esfuerzo | El módulo de demandas conoce la estructura interna del de aplicaciones |
| Integridad referencial garantizada por la base de datos | No se puede escalar ni desplegar un módulo por separado |
| Consultas que unen datos de ambos módulos | Un cambio en `Application` puede romper `Demand` |
| Pruebas de integración completas con un solo contenedor | La base de datos es un punto de acoplamiento compartido |

Un monolito así no es un error. Para un equipo pequeño y un dominio todavía en evolución, suele ser la mejor opción. La fase 5 no se emprendió porque el monolito fallara, sino para aprender a separarlo bien y para preparar una arquitectura en la que el catálogo pudiera servir a otros módulos.

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| `Could not find a valid Docker environment` | Docker Desktop no está arrancado | Arrancarlo antes de las pruebas de integración |
| Las pruebas de integración tardan mucho la primera vez | Docker descarga la imagen `postgres:18` | Solo ocurre la primera vez |
| Una prueba ve datos de otra | Falta `@Transactional` en la clase o se confirma explícitamente | Mantener el *rollback* automático |
| Una prueba de modificación pasa aunque el SQL sea incorrecto | El *flush* nunca ocurrió | Llamar a `flush()` antes de comprobar |
| `@ServiceConnection` no tiene efecto | Falta la dependencia `spring-boot-testcontainers` | Añadirla con *scope* `test` |

## Ejercicios

::: ejercicio Observar el contenedor efímero
Ejecuta una prueba de integración y, mientras corre, lista los contenedores con `docker ps`. Identifica el contenedor de PostgreSQL de la prueba y su puerto publicado. Comprueba que desaparece al terminar y que tu contenedor de desarrollo sigue intacto.
:::

::: ejercicio Clasificar el acoplamiento
Para cada uno de los siete puntos de contacto de la tabla, indica qué tendría que cambiar si las aplicaciones pasaran a estar en otra base de datos, y ordénalos de más fácil a más difícil de resolver. Compara tu orden con el que siguió la fase 5.
:::

::: preguntas
1. ¿Qué hace `@ServiceConnection` y qué propiedades de `application.properties` deja sin efecto?
2. ¿Por qué el contenedor se declara como atributo `static`?
3. ¿Qué efecto tiene `@Transactional` en una clase de pruebas, y por qué obliga a usar `flush()` en algunas comprobaciones?
4. ¿Qué dos cosas necesita realmente el módulo de demandas de una aplicación?
5. ¿Por qué los puntos de contacto de tipo SQL son más difíciles de eliminar que los de código?
:::
