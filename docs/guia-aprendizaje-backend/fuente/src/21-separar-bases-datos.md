# Separar las bases de datos

<p class="lead">Con el catálogo sirviendo los datos por HTTP, la tabla <code>applications</code> de la base de datos de demandas había quedado como una copia obsoleta, unida a las demandas por una clave foránea. Este capítulo explica las dos migraciones que cortaron ese último vínculo, la funcionalidad que hubo que retirar y las pruebas que verifican el resultado.</p>

## La migración V4 elimina la clave foránea [paso 5.13]

```sql title="V4__detach_demands_from_applications.sql" estado="impl"
ALTER TABLE demands
    DROP CONSTRAINT fk_demands_application;
```

```sql title="V5__drop_legacy_applications.sql" estado="impl"
DROP TABLE applications;
```

Dos migraciones de una línea, pero con consecuencias importantes. Conviene entender por qué son dos, por qué en este orden y qué garantías se pierden.

**Por qué hace falta quitar la clave foránea.** Desde el paso 5.10, las aplicaciones nuevas se crean en el catálogo, en otra base de datos. Si la clave foránea siguiera existiendo, una demanda sobre una aplicación creada después de la separación fallaría al insertarse: su `application_id` no existiría en la tabla local `applications`, que ya nadie actualiza. La restricción, que antes protegía la integridad, ahora impediría trabajar.

**Por qué en este orden.** PostgreSQL no permite borrar una tabla a la que hace referencia una clave foránea (salvo con `DROP TABLE … CASCADE`, que borraría la restricción sin dejar constancia explícita en el historial). Primero se elimina la restricción y después la tabla.

**Por qué dos migraciones.** Cada una tiene un propósito distinto: V4 desacopla las demandas, V5 retira datos heredados. En el historial de Flyway quedan como dos pasos con nombre propio, y cada una se aplica en su propia transacción.

**Qué se conserva.** La columna `application_id` y su índice `idx_demands_application_id` siguen en `demands`: el filtro por aplicación los sigue usando. Lo que cambia es su significado: ya no es una clave foránea, sino una **referencia a un recurso de otro servicio**.

::: atencion La V5 no tiene vuelta atrás
`DROP TABLE` borra los datos. Flyway no deshace migraciones, y aunque se escribiera una V6 que recreara la tabla, estaría vacía. Antes de aplicar la V5 en cualquier base de datos con datos reales hay que asegurarse de que esos datos ya están en el catálogo (paso 5.9) y de que existe una copia de seguridad. En el proyecto, los datos se habían trasladado y verificado antes.
:::

### ¿Era imprescindible la V5?

Técnicamente no. Con `ddl-auto=validate`, Hibernate comprueba que existan las tablas y columnas de las entidades, pero **ignora las tablas que no corresponden a ninguna entidad**. El servicio de demandas habría arrancado igual con la tabla `applications` todavía ahí.

Se eliminó porque dejarla habría creado **dos fuentes de verdad**: unos datos de aplicaciones en el catálogo, que se actualizan, y otros en la base de datos de demandas, que se quedan congelados. Tarde o temprano, alguien consultaría la copia equivocada.

::: decision Eliminar la copia heredada
**Motivo:** cada dato tiene un único dueño; una tabla huérfana con datos que parecen válidos es una fuente segura de errores. **Alternativa:** renombrarla (por ejemplo, `applications_legacy`) durante un tiempo de transición antes de borrarla, una práctica prudente cuando hay dudas sobre si algún proceso la sigue usando.
:::

### El historial se reproduce entero

Una consecuencia de que las migraciones sean inmutables y solo hacia delante es que **una base de datos nueva del servicio de demandas reproduce toda la historia**: V1 crea `applications`, V2 la llena, V3 crea `demands` con su clave foránea, V4 la quita y V5 borra `applications`. Es lo que ocurre cada vez que una prueba de integración arranca su contenedor de PostgreSQL.

Funciona y es la garantía de que todas las bases de datos tienen el mismo historial. Su coste es que el servicio de demandas arrastra para siempre la creación de una tabla que ya no le pertenece. En proyectos con un historial largo se suele resolver con una **línea base** (*baseline*): un *script* que crea directamente el estado actual para las instalaciones nuevas, mientras las existentes siguen su historial.

## El estado final de la arquitectura

<figure>
<svg viewBox="0 0 680 290" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="m21" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="200" y="10" width="280" height="44" rx="8" fill="#fff7ed" stroke="#fdba74"/><text x="340" y="30" text-anchor="middle" font-weight="700">Frontend React</text><text x="340" y="45" text-anchor="middle" font-size="9" fill="#475569">proxy de Vite: /api/applications y /api/demands</text>
  <rect x="40" y="95" width="250" height="90" rx="10" fill="#ecfeff" stroke="#0891b2" stroke-width="1.4"/>
  <text x="165" y="117" text-anchor="middle" font-weight="700">it-service-manager · 8080</text>
  <text x="165" y="135" text-anchor="middle" font-size="9.5">DemandController · DemandService</text>
  <text x="165" y="151" text-anchor="middle" font-size="9.5">puerto ApplicationCatalog</text>
  <text x="165" y="167" text-anchor="middle" font-size="9.5" font-weight="700" fill="#0e7490">RestApplicationCatalog (RestClient)</text>
  <rect x="390" y="95" width="250" height="90" rx="10" fill="#f0fdfa" stroke="#14b8a6" stroke-width="1.4"/>
  <text x="515" y="117" text-anchor="middle" font-weight="700">application-catalog-service · 8081</text>
  <text x="515" y="135" text-anchor="middle" font-size="9.5">ApplicationController · ApplicationService</text>
  <text x="515" y="151" text-anchor="middle" font-size="9.5">GET /{id} · GET /summaries?ids=</text>
  <text x="515" y="167" text-anchor="middle" font-size="9.5">POST · PUT · GET listado</text>
  <line x1="290" y1="150" x2="388" y2="150" stroke="#0891b2" stroke-width="1.6" marker-end="url(#m21)"/>
  <text x="339" y="142" text-anchor="middle" font-size="9" fill="#0e7490">HTTP</text>
  <text x="339" y="165" text-anchor="middle" font-size="8.5" fill="#475569">2 s / 3 s</text>
  <rect x="40" y="220" width="250" height="56" rx="8" fill="#0b1220"/><text x="165" y="241" text-anchor="middle" fill="#fff" font-weight="700">it_service_manager</text><text x="165" y="258" text-anchor="middle" fill="#a5f3fc" font-size="9">demands (application_id sin FK)</text>
  <rect x="390" y="220" width="250" height="56" rx="8" fill="#0b1220"/><text x="515" y="241" text-anchor="middle" fill="#fff" font-weight="700">application_db</text><text x="515" y="258" text-anchor="middle" fill="#a5f3fc" font-size="9">applications</text>
  <text x="340" y="252" text-anchor="middle" font-size="8.5" fill="#475569">misma instancia</text><text x="340" y="264" text-anchor="middle" font-size="8.5" fill="#475569">PostgreSQL (5433)</text>
  <g stroke="#0891b2" stroke-width="1.4"><line x1="300" y1="54" x2="200" y2="93" marker-end="url(#m21)"/><line x1="380" y1="54" x2="480" y2="93" marker-end="url(#m21)"/>
  <line x1="165" y1="185" x2="165" y2="218" marker-end="url(#m21)"/><line x1="515" y1="185" x2="515" y2="218" marker-end="url(#m21)"/></g>
</svg>
<figcaption><b>Figura 21.1.</b> Arquitectura al final de la fase 5. El frontend habla con los dos servicios; el de demandas consulta el catálogo por HTTP; cada servicio es dueño de su base de datos.</figcaption>
</figure>

## Retirar la ordenación por nombre de aplicación [paso 5.14]

El adaptador `JpaDemandQueries` del capítulo 18 ordenaba por nombre uniendo `demands` y `applications` en la misma base de datos. Tras la V5, esa unión es imposible: las aplicaciones están en otra base de datos, detrás de otro servicio. El adaptador se retiró, y con él la posibilidad de ordenar por nombre:

```java title="demand/service/DemandService.java (extracto)" estado="final"
private static final Set<String> VALID_SORT_FIELDS = Set.of(
        "id",
        "title",
        "priority",
        "status",
        "updatedAt"
);
```

Una petición con `sort=application.name` recibe ahora un 400 `Invalid demand sort field: application.name`. Una prueba de integración lo fija:

```java title="DemandIntegrationTest.java (extracto)" estado="final"
@Test
void shouldRejectSortingByApplicationName() {

    ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> demandService.getDemands(
                    null,
                    null,
                    null,
                    PageRequest.of(
                            0, 10,
                            Sort.by("application.name"))));

    assertEquals(
            HttpStatus.BAD_REQUEST,
            exception.getStatusCode());

    assertEquals(
            "Invalid demand sort field: application.name",
            exception.getReason());
}
```

::: decision Retirar una funcionalidad antes que implementarla mal
**Motivo:** las alternativas eran peores. Ordenar cada página en memoria da resultados incorrectos (capítulo 18). Pedir todas las demandas y todos los nombres para ordenar en memoria no escala. **Alternativas para recuperarla en el futuro:** guardar una copia del nombre de la aplicación en cada demanda (desnormalización), que exige mantenerla actualizada cuando el nombre cambie en el catálogo, normalmente con eventos; o una vista de lectura que combine datos de ambos servicios. Ambas son proyectos en sí mismos.
:::

::: proyecto
El frontend seguía ofreciendo la ordenación por aplicación en la tabla de demandas, así que esa columna produce un 400 si se pulsa. La guía del frontend documenta el desajuste en sus notas de integración. Es el ejemplo más claro de que separar servicios puede cambiar el contrato con los clientes, y de que esos cambios deben comunicarse y coordinarse.
:::

## Probar Demand sin clave foránea [paso 5.15]

Las pruebas de integración del servicio de demandas arrancan un PostgreSQL real con Testcontainers, pero **no** arrancan el catálogo. En su lugar, simulan el puerto:

```java title="DemandIntegrationTest.java (extracto)" estado="final"
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

    @Autowired
    private DemandRepository demandRepository;

    @Autowired
    private EntityManager entityManager;

    @MockitoBean
    private ApplicationCatalog catalog;
}
```

`@MockitoBean` sobre el puerto sustituye a `RestApplicationCatalog` en el contexto de la prueba. Todo lo demás es real: Spring, Flyway con las cinco migraciones, Hibernate, las transacciones y PostgreSQL. Es la ventaja de haber definido un puerto: la frontera con el otro servicio es exactamente el punto donde se corta la prueba.

### Una referencia que no existe en ninguna parte

```java title="DemandIntegrationTest.java (extracto)" estado="final"
@Test
void shouldPersistApplicationIdWithoutForeignKey() {

    Long externalApplicationId = 999999L;

    Demand demand = new Demand(
            "External application reference",
            "Verify persistence without a database FK",
            "HIGH",
            "OPEN",
            externalApplicationId);

    Demand saved = demandRepository.saveAndFlush(demand);

    entityManager.clear();

    Demand reloaded = demandRepository.findById(saved.getId())
            .orElseThrow();

    assertEquals(
            externalApplicationId,
            reloaded.getApplicationId());
}
```

La prueba guarda una demanda con un identificador de aplicación que no existe en ninguna base de datos, fuerza el `INSERT` con `saveAndFlush`, vacía el contexto con `clear()` y la relee **desde PostgreSQL**. Si la clave foránea siguiera existiendo, el `flush` fallaría. Demuestra que la V4 se aplicó.

::: reconstruido
Durante la fase del monolito con puerto (pasos 5.2 a 5.6), el documento del refactor menciona pruebas de «conservación de la FK», es decir, la comprobación opuesta: que la restricción seguía activa mientras las dos tablas convivían. Esta prueba es su contrapartida tras la V4. La versión anterior no se conserva.
:::

### Una página, una llamada

```java title="DemandIntegrationTest.java (extracto)" estado="final"
@Test
void shouldFetchCatalogOnceForAWholePage() {

    for (int i = 0; i < 12; i++) {
        demandRepository.save(
                new Demand("Batch " + i, null, "HIGH", "OPEN", 7L));
    }

    entityManager.flush();
    entityManager.clear();

    when(catalog.findByIds(Set.of(7L)))
            .thenReturn(Map.of(
                    7L,
                    new ApplicationSummary(7L, "External app")));

    var page = demandService.getDemands(
            7L, null, null,
            PageRequest.of(0, 10, Sort.by("id")));

    assertEquals(10, page.content().size());
    assertEquals(12, page.totalElements());

    verify(catalog, times(1)).findByIds(Set.of(7L));
    verify(catalog, never()).findById(anyLong());
}
```

Es la versión de integración de la prueba unitaria del capítulo 18, ahora con PostgreSQL real: doce demandas, una página de diez, el total correcto (doce, calculado por la consulta de recuento) y exactamente **una** llamada al catálogo, nunca una por demanda.

### El nombre siempre es el actual

La prueba `shouldComposeListWithCurrentNames` crea una demanda cuando la aplicación se llama «Original», cambia la respuesta del catálogo simulado a «Renamed» y comprueba que tanto el detalle como el listado muestran el nombre nuevo. Es una consecuencia directa del diseño: el servicio de demandas no guarda el nombre, lo pide cada vez. Lo que se pierde en rendimiento y en disponibilidad se gana en consistencia: el nombre nunca está desactualizado.

| Prueba de `DemandIntegrationTest` | Qué garantiza |
|---|---|
| `shouldCreateDemandLinkedToExternalApplication` | El alta completa funciona con el catálogo y PostgreSQL |
| `shouldComposeListWithCurrentNames` | Detalle y listado muestran el nombre actual del catálogo |
| `shouldFetchCatalogOnceForAWholePage` | Una sola llamada por página, con paginación correcta |
| `shouldPersistApplicationIdWithoutForeignKey` | La clave foránea ya no existe |
| `shouldLoadApplicationIdWithoutAnEntityAssociation` | La referencia escalar se carga bien con `Specification` (heredera de la prueba del grafo de entidad) |
| `shouldRejectSortingByApplicationName` | La ordenación por nombre se rechaza con 400 |

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| `cannot drop table applications because other objects depend on it` | Se intentó la V5 sin la V4 | Eliminar primero la restricción |
| `insert or update on table "demands" violates foreign key constraint` | La V4 no se aplicó en esa base de datos | Revisar `flyway_schema_history` |
| 400 al ordenar la tabla de demandas por aplicación | Funcionalidad retirada en el paso 5.14 | Quitar la opción del frontend |
| Las pruebas de integración intentan llamar al puerto 8081 | Falta el `@MockitoBean` del puerto | Simular `ApplicationCatalog` en la prueba |

## Ejercicios

::: ejercicio Leer el historial completo
Conéctate a la base de datos de demandas y consulta `flyway_schema_history`. Comprueba que aparecen las cinco migraciones y explica qué tablas y restricciones existían después de cada una.
:::

::: ejercicio Diseñar la desnormalización
Propón cómo recuperar la ordenación por nombre de aplicación añadiendo una columna `application_name` a `demands`. Escribe la migración, indica en qué momentos habría que rellenarla o actualizarla y qué pasaría si una aplicación se renombra en el catálogo. ¿Qué mecanismo usarías para enterarte de ese cambio?
:::

::: preguntas
1. ¿Por qué la clave foránea tuvo que eliminarse antes de que las aplicaciones nuevas se crearan solo en el catálogo?
2. ¿Por qué no se podía ejecutar la V5 antes que la V4?
3. Si Hibernate ignora las tablas sin entidad, ¿por qué se eliminó la tabla `applications`?
4. ¿Qué sustituye `@MockitoBean` en `DemandIntegrationTest`, y qué partes del sistema siguen siendo reales?
5. ¿Qué demuestra `shouldPersistApplicationIdWithoutForeignKey` y por qué necesita `saveAndFlush` y `clear`?
:::
