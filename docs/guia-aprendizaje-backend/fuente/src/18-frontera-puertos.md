# Una frontera dentro del monolito: puertos y adaptadores

<p class="lead">El primer tramo de la extracción no creó ningún servicio. Cambió la forma en que el módulo de demandas obtiene lo que necesita de las aplicaciones, de modo que deje de importar cómo y dónde se guardan. Este capítulo explica el puerto <code>ApplicationCatalog</code>, el paso de la asociación a un identificador, la consulta por lotes y el aislamiento de la ordenación por nombre.</p>

## Puertos y adaptadores en pocas palabras

La arquitectura de **puertos y adaptadores** (también llamada hexagonal) separa el núcleo de una aplicación de sus detalles técnicos:

- Un **puerto** es una interfaz que el núcleo define con sus propios términos: «necesito saber si existe una aplicación y cómo se llama».
- Un **adaptador** es una implementación de esa interfaz con una tecnología concreta: con JPA, con HTTP, con un fichero.

El punto clave es **quién es dueño de la interfaz**. El puerto pertenece a quien lo usa (el módulo de demandas), no a quien lo implementa. Así, la dependencia apunta hacia el núcleo, y cambiar de adaptador no obliga a tocar el núcleo. Es el principio de inversión de dependencias aplicado a la frontera entre módulos.

<figure>
<svg viewBox="0 0 680 230" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="m18" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker>
  <marker id="m18r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#be123c"/></marker></defs>
  <text x="165" y="18" text-anchor="middle" font-weight="700">Antes (fase 4)</text>
  <text x="510" y="18" text-anchor="middle" font-weight="700">Después (pasos 5.2 a 5.4)</text>
  <g text-anchor="middle">
    <rect x="20" y="40" width="130" height="50" rx="8" fill="#ecfeff" stroke="#0891b2"/><text x="85" y="62" font-weight="700">DemandService</text><text x="85" y="77" font-size="9" fill="#475569">Demand → Application</text>
    <rect x="190" y="40" width="130" height="50" rx="8" fill="#fff7ed" stroke="#fdba74"/><text x="255" y="62" font-weight="700">ApplicationRepository</text><text x="255" y="77" font-size="9" fill="#475569">entidad Application</text>
    <rect x="360" y="40" width="130" height="50" rx="8" fill="#ecfeff" stroke="#0891b2"/><text x="425" y="62" font-weight="700">DemandService</text><text x="425" y="77" font-size="9" fill="#475569">Demand: Long applicationId</text>
    <rect x="530" y="40" width="130" height="50" rx="8" fill="#0b1220"/><text x="595" y="62" font-weight="700" fill="#fff">ApplicationCatalog</text><text x="595" y="77" font-size="9" fill="#a5f3fc">puerto (de demand)</text>
    <rect x="530" y="150" width="130" height="50" rx="8" fill="#fff7ed" stroke="#fdba74"/><text x="595" y="172" font-weight="700">JpaApplicationCatalog</text><text x="595" y="187" font-size="9" fill="#475569">adaptador (de application)</text>
    <rect x="360" y="150" width="130" height="50" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-dasharray="4 3"/><text x="425" y="172" font-weight="700" fill="#64748b">RestApplicationCatalog</text><text x="425" y="187" font-size="9" fill="#64748b">llegará en el paso 5.10</text>
  </g>
  <line x1="150" y1="65" x2="188" y2="65" stroke="#be123c" stroke-width="1.5" marker-end="url(#m18r)"/>
  <line x1="490" y1="65" x2="528" y2="65" stroke="#0891b2" stroke-width="1.5" marker-end="url(#m18)"/>
  <line x1="595" y1="150" x2="595" y2="92" stroke="#0891b2" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#m18)"/>
  <line x1="470" y1="150" x2="560" y2="92" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#m18)"/>
  <text x="165" y="120" text-anchor="middle" font-size="9" fill="#be123c">demand depende de la entidad</text>
  <text x="165" y="134" text-anchor="middle" font-size="9" fill="#be123c">y del repositorio de application</text>
  <text x="603" y="125" font-size="9" fill="#0e7490">implementa</text>
</svg>
<figcaption><b>Figura 18.1.</b> Inversión de la dependencia. Después del cambio, el servicio de demandas solo conoce una interfaz propia; el adaptador implementa esa interfaz.</figcaption>
</figure>

::: java
Si alguna vez definiste una interfaz de negocio local en un EJB y dejaste que el contenedor inyectara la implementación por JNDI, ya conoces la mitad de la idea. La otra mitad es la propiedad: aquí la interfaz la escribe el consumidor, con exactamente lo que necesita, y no el proveedor con todo lo que ofrece.
:::

## El puerto `ApplicationCatalog` [paso 5.2]

```java title="demand/port/ApplicationCatalog.java" estado="impl"
/** Read-only module boundary. No persistence entities cross this contract. */
public interface ApplicationCatalog {
    Optional<ApplicationSummary> findById(Long id);

    /** Returns existing applications only; missing IDs are absent from the map. */
    Map<Long, ApplicationSummary> findByIds(Set<Long> ids);
}
```

```java title="demand/port/ApplicationSummary.java" estado="impl"
public record ApplicationSummary(Long id, String name) {
}
```

Cada detalle del contrato es deliberado:

- **Vive en el paquete `demand.port`.** Lo define el consumidor.
- **Es de solo lectura.** El comentario lo dice expresamente: el módulo de demandas no crea ni modifica aplicaciones.
- **No cruza ninguna entidad.** Devuelve `ApplicationSummary`, un *record* inmutable con los dos únicos datos que Demand necesita. Nada de proxies de Hibernate, nada de asociaciones perezosas, nada que dependa de un contexto de persistencia.
- **`findById` devuelve `Optional`.** «No existe» es un resultado normal, no una excepción. El servicio decide qué hacer con él.
- **`findByIds` devuelve un mapa con los que existen.** Los identificadores que no existen simplemente no aparecen. Así, una sola llamada sirve para una página entera, y el servicio puede detectar los ausentes.

::: decision Un *record* de dos campos en lugar de la entidad
**Motivo:** el contrato expresa exactamente la necesidad (existencia y nombre), no expone el modelo interno del otro módulo y será idéntico tanto si los datos vienen de JPA como de HTTP. **Alternativa descartada:** devolver la entidad `Application`, que habría mantenido el acoplamiento con su estructura y, en la fase siguiente, habría sido imposible de reproducir desde una respuesta HTTP.
:::

## De la asociación a un identificador [paso 5.3]

El segundo cambio afecta a la entidad. El atributo `Application application` se sustituye por un número:

```java title="demand/entity/Demand.java (extracto)" estado="refactor"
@Column(name = "application_id", nullable = false)
private Long applicationId;

public Demand(
        String title,
        String description,
        String priority,
        String status,
        Long applicationId) {

    this.title = title;
    this.description = description;
    this.priority = priority;
    this.status = status;
    this.applicationId = applicationId;
}

public void update(
        String title,
        String description,
        String priority,
        Long applicationId) {

    this.title = title;
    this.description = description;
    this.priority = priority;
    this.applicationId = applicationId;
    this.updatedAt = Instant.now();
}
```

La columna es la misma, `application_id`. **El esquema no cambia**: no hay migración nueva y la clave foránea sigue en la base de datos, protegiendo la integridad durante toda la transición. Lo único que cambia es cómo lo ve Java: antes, un objeto; ahora, un valor.

Los efectos se propagan a tres sitios, todos pequeños:

| Sitio | Antes | Después |
|---|---|---|
| Filtro del listado | `root.get("application").get("id")` | `root.get("applicationId")` |
| Repositorio | Grafo de entidad sobre `application` | Sin grafo: no hay asociación que cargar |
| Pruebas de dominio | Creaban la demanda con un objeto `Application` | La crean con un identificador |

La entidad `Demand` ya no importa nada del módulo de aplicaciones. Es el primer punto de la tabla del capítulo 16 que desaparece.

## El catálogo con JPA dentro del monolito [paso 5.4]

Mientras ambos módulos convivan en el mismo proceso, el puerto se implementa con el repositorio de siempre:

```java title="application/integration/JpaApplicationCatalog.java" estado="reconstruido"
@Component
class JpaApplicationCatalog implements ApplicationCatalog {

    private final ApplicationRepository applicationRepository;

    JpaApplicationCatalog(ApplicationRepository applicationRepository) {
        this.applicationRepository = applicationRepository;
    }

    @Override
    public Optional<ApplicationSummary> findById(Long id) {
        return applicationRepository.findById(id)
                .map(application -> new ApplicationSummary(
                        application.getId(), application.getName()));
    }

    @Override
    public Map<Long, ApplicationSummary> findByIds(Set<Long> ids) {
        return applicationRepository.findAllById(ids).stream()
                .collect(Collectors.toUnmodifiableMap(
                        Application::getId,
                        application -> new ApplicationSummary(
                                application.getId(), application.getName())));
    }
}
```

::: reconstruido
El documento `frontera-catalogo.md` describe esta clase: «`JpaApplicationCatalog`, dentro del módulo Application, implementa el contrato usando el repositorio existente». El código no se conserva, porque se retiró al extraer el catálogo. La implementación mostrada es la mínima que cumple el contrato del puerto y reproduce lo que hace el adaptador HTTP final con los datos que recibe. Se desconoce el paquete exacto.
:::

Observa la dirección de las dependencias: el módulo de **aplicaciones** depende del puerto definido en el módulo de **demandas**. Es intencionado y temporal: es el módulo que provee los datos quien se adapta al contrato del que los consume.

El servicio de demandas, por su parte, ya solo conoce el puerto:

```java title="demand/service/DemandService.java (extracto)" estado="final"
@Transactional
public DemandResponse createDemand(
        DemandCreateRequest request) {

    ApplicationSummary application = requireApplication(request.applicationId());

    Demand demand = new Demand(
            request.title(),
            request.description(),
            request.priority(),
            "OPEN",
            application.id()
    );

    Demand saved = demandRepository.save(demand);

    return toResponse(saved, application);
}

private ApplicationSummary requireApplication(Long id) {
    return applicationCatalog.findById(id).orElseThrow(() -> applicationNotFound(id));
}

private ResponseStatusException applicationNotFound(Long id) {
    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found: " + id);
}
```

`toResponse` recibe ahora dos argumentos: la demanda y el resumen de su aplicación. El nombre ya no sale de navegar por una asociación, sino del catálogo. El mismo resumen que se usó para comprobar la existencia sirve para construir la respuesta, sin una segunda consulta.

## Una consulta por página [paso 5.5]

Sin asociación ni grafo de entidad, el listado necesita otra forma de obtener los nombres sin caer en el N+1: pedirle al catálogo, **de una sola vez**, todas las aplicaciones de la página.

```java title="demand/service/DemandService.java · getDemands (extracto)" estado="final"
Page<Demand> demands =
        demandRepository.findAll(specification, pageable);
Set<Long> ids = demands.getContent().stream()
        .map(Demand::getApplicationId).collect(Collectors.toSet());
Map<Long, ApplicationSummary> applications = ids.isEmpty()
        ? Map.of() : applicationCatalog.findByIds(ids);
Page<DemandResponse> responsePage = demands.map(demand -> {
    ApplicationSummary application = applications.get(demand.getApplicationId());
    if (application == null) {
        throw applicationNotFound(demand.getApplicationId());
    }
    return toResponse(demand, application);
});
```

1. Se obtiene la página de demandas, con sus filtros, orden y paginación, como siempre.
2. Se reúnen los identificadores de aplicación **distintos** en un `Set`: diez demandas de dos aplicaciones producen un conjunto de dos elementos.
3. Si la página está vacía, no se llama al catálogo.
4. Se hace **una única llamada** `findByIds` y se obtiene un mapa.
5. Cada demanda busca su nombre en el mapa, en memoria.

El número de consultas al catálogo es siempre **una por página** (o cero), sea cual sea el tamaño de la página. Con JPA, `findAllById` se traduce en un `SELECT … WHERE id IN (…)`. Con HTTP será una única petición. La lógica del servicio no cambiará.

::: decision Si falta una aplicación, falla la página entera
**Comportamiento:** si el catálogo no devuelve alguna de las aplicaciones de la página, el servicio lanza un 404 `Application not found` y el listado completo falla. **Motivo:** una demanda sin aplicación es un dato incoherente, y ocultarlo sería peor. **Alternativa:** degradar con elegancia, mostrando esa fila con un nombre como «Aplicación no disponible», para que una referencia rota no impida ver el resto. En el monolito, con clave foránea, el caso no puede darse; tras la separación de bases de datos sí podría, y por eso se recoge como mejora en el capítulo 24. **Cambiado en la fase 7** (capítulo 25): ahora la fila se devuelve con `applicationName: null`.
:::

### Probar la consulta por lotes

```java title="demand/service/DemandCatalogTest.java (extracto)" estado="final"
@Test
void listUsesOneBatchForDistinctIdsAndPreservesPageMetadata() {
    var pageable = PageRequest.of(1, 3);
    when(repository.findAll(
            org.mockito.ArgumentMatchers
                    .<Specification<Demand>>any(),
            eq(pageable)))
            .thenReturn(new PageImpl<>(
                    List.of(demand(7L), demand(2L), demand(7L)),
                    pageable,
                    12));
    when(catalog.findByIds(Set.of(7L, 2L))).thenReturn(Map.of(
            7L, new ApplicationSummary(7L, "Seven"), 2L, new ApplicationSummary(2L, "Two")));
    var response = service.getDemands(null, null, null, pageable);
    assertEquals(List.of("Seven", "Two", "Seven"),
            response.content().stream().map(item -> item.applicationName()).toList());
    assertEquals(1, response.page());
    assertEquals(3, response.size());
    assertEquals(12, response.totalElements());
    assertEquals(4, response.totalPages());
    verify(catalog).findByIds(Set.of(7L, 2L));
    verifyNoMoreInteractions(catalog);
}
```

La prueba prepara una página de tres demandas con dos aplicaciones distintas (la 7 repetida) y comprueba cuatro cosas: que se llama al catálogo **una vez** con el conjunto `{7, 2}`, que cada demanda recibe su nombre en el orden correcto, que los metadatos de paginación se conservan (página 1 de 4, doce elementos en total) y, con `verifyNoMoreInteractions`, que no hubo ninguna otra llamada al catálogo. La sintaxis `ArgumentMatchers.<Specification<Demand>>any()` indica a Java el tipo genérico del comodín, que no puede deducir por sí solo.

La misma clase, `DemandCatalogTest`, tiene siete pruebas: alta con datos del catálogo, alta y modificación con aplicación inexistente, modificación que cambia la referencia sin llamar a `save`, el lote, la página vacía (con `verifyNoInteractions(catalog)`) y el detalle con el nombre actual.

## Aislar la ordenación por nombre [paso 5.6]

Quedaba un punto de contacto que no se podía resolver con el puerto: ordenar las demandas por el **nombre** de su aplicación (`sort=application.name`). Con la asociación eliminada, Spring Data ya no puede añadir la unión automáticamente.

La tentación es ordenar en memoria: obtener la página, pedir los nombres y ordenarla en Java. Pero eso es **incorrecto**. La paginación ya se ha aplicado: ordenar los diez elementos de la página dos no los convierte en los elementos once a veinte del orden global por nombre. Para ordenar bien, la base de datos tiene que ordenar **todo el conjunto filtrado antes de paginar**, y para eso necesita los nombres.

La solución fue aislar esa consulta concreta en un adaptador propio del monolito:

```java title="demand/port/DemandQueries.java y integration/JpaDemandQueries.java" estado="reconstruido"
public interface DemandQueries {
    Page<Demand> find(Specification<Demand> filters, Pageable pageable);
}

@Component
class JpaDemandQueries implements DemandQueries {

    // Ordenaciones locales: el repositorio de siempre.
    // Ordenación por application.name: consulta Criteria que une
    // Demand y Application por applicationId = id, aplica los mismos
    // filtros, la dirección pedida y las ordenaciones secundarias,
    // pagina en la base de datos y calcula el total con otra consulta.
    @Override
    public Page<Demand> find(Specification<Demand> filters, Pageable pageable) {
        if (!sortsByApplicationName(pageable.getSort())) {
            return demandRepository.findAll(filters, pageable);
        }
        return findSortedByApplicationName(filters, pageable);
    }
}
```

::: reconstruido
El documento `frontera-catalogo.md` describe este adaptador con precisión: «`DemandQueries` aísla esa lectura. Su implementación `integration.JpaDemandQueries` usa el repositorio habitual para las ordenaciones locales y una consulta Criteria entre Demand y Application exclusivamente cuando se ordena por nombre». También dice que «la consulta respeta filtros, ordenaciones secundarias, dirección y total de elementos» y que «la FK garantiza que la unión no pierda ni multiplique demandas». El esqueleto mostrado refleja esa descripción; el cuerpo de la consulta Criteria no se conserva y no se reproduce para no inventarlo.
:::

Sin asociación, la unión ya no se puede expresar navegando por un atributo. La Criteria API permite declarar **dos raíces** en la misma consulta (`query.from(Demand.class)` y `query.from(Application.class)`) y relacionarlas con una condición de igualdad entre `applicationId` e `id`. Es una unión explícita entre entidades que no tienen asociación mapeada.

El documento del proyecto es muy claro sobre la naturaleza de esta pieza:

> Este adaptador es deliberadamente propio del monolito: todavía conoce ambas entidades. […] Antes de extraer Application a otro proceso habrá que reemplazar también este adaptador, además de la implementación del catálogo. No bastará con cambiar el catálogo por HTTP para conservar la ordenación global por nombre.

::: decision Un acoplamiento temporal, explícito y aislado
**Motivo:** mantener la funcionalidad existente mientras dure el monolito, sin cargar todo el catálogo ni todas las demandas en memoria, y dejar el acoplamiento en **una sola clase** con nombre propio en lugar de repartido por el servicio. **Consecuencia conocida:** cuando las bases de datos se separen, esta consulta no podrá existir. La decisión sobre qué hacer entonces (retirar la funcionalidad, como se hizo en el capítulo 21, o copiar los nombres en el servicio de demandas) se pospuso conscientemente.
:::

## Cómo se preparó y verificó este refactor

El refactor de los pasos 5.2 a 5.6 se preparó en una copia de trabajo, y su documento de entrega deja constancia de algo importante:

> El refactor está preparado en esta copia de trabajo. No se ha aplicado a `C:\Workspace\it-service-manager` […]. Se conservan los 35 casos existentes, adaptando los *fixtures* y la comprobación de la antigua asociación JPA. Se añaden 12 casos: 7 unitarios y 5 de integración. […] La suite NO ha podido ejecutarse.

Es decir, el cambio se entregó con pruebas nuevas, pero **sin haber visto pasar la suite**: la compilación con Maven falló en aquel entorno por problemas de acceso a los JAR. El propio documento lo dice sin rodeos y deja como pendiente ejecutar `mvnw.cmd test` en un entorno normal antes de incorporar el cambio.

::: leccion Un cambio no está terminado hasta que las pruebas pasan donde importa
El documento hizo lo correcto: no afirmó que las pruebas pasaran y dejó la verificación como pendiente explícito. La lección es tratar ese pendiente como bloqueante: ninguna fase posterior debería construirse sobre un refactor cuya suite no se ha ejecutado. El capítulo 22 retoma la ejecución de las suites, y el 23 recoge el episodio.
:::

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| El listado vuelve a hacer una consulta por demanda | Se llama a `findById` del catálogo dentro del `map` | Reunir los identificadores y usar `findByIds` |
| Se llama al catálogo con una página vacía | Falta la comprobación del conjunto vacío | Devolver `Map.of()` sin llamar |
| La ordenación por nombre «funciona» pero las páginas no cuadran | Se ordenó cada página en memoria | Ordenar en la base de datos antes de paginar |
| El módulo de demandas sigue importando `Application` | Queda algún uso de la entidad (en pruebas, en DTO) | Buscar los `import` del paquete `application` en `demand` |
| `NoUniqueBeanDefinitionException: ApplicationCatalog` | Hay dos implementaciones del puerto activas a la vez | Activar solo una (ver el capítulo 20) |

## Ejercicios

::: ejercicio Comprobar la frontera
Con una búsqueda en el IDE o con `grep`, comprueba que ningún fichero del paquete `demand` (en `src/main`) importa nada de `itmanager.application`. Explica qué tendría que pasar para que una herramienta como ArchUnit convirtiera esta comprobación en una prueba automática.
:::

::: ejercicio Diseñar la degradación
Modifica, sobre el papel, el bloque `demands.map(...)` para que una aplicación ausente no haga fallar la página, sino que la fila muestre `applicationName` como `null` y el resto funcione. ¿Qué cambiaría en el contrato con el frontend? ¿Qué prueba de `DemandCatalogTest` habría que adaptar?
:::

::: preguntas
1. ¿Quién es el dueño de la interfaz en la arquitectura de puertos y adaptadores, y por qué importa?
2. ¿Por qué el puerto devuelve `ApplicationSummary` y no la entidad `Application`?
3. ¿Cambió el esquema de la base de datos al sustituir la asociación por `applicationId`?
4. ¿Cuántas llamadas al catálogo hace el listado para una página de diez demandas de tres aplicaciones? ¿Y para una página vacía?
5. ¿Por qué ordenar cada página en memoria no es una forma correcta de ordenar por nombre de aplicación?
:::
