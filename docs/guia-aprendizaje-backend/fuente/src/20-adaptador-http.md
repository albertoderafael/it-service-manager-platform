# El adaptador HTTP con `RestClient`

<p class="lead">Con el catálogo funcionando en su propio proceso, el servicio de demandas necesitaba una nueva implementación del puerto <code>ApplicationCatalog</code>: una que hablara HTTP. Este capítulo explica <code>RestApplicationCatalog</code>, por qué los tiempos máximos son imprescindibles, cómo se traducen los fallos remotos a códigos que el frontend entiende y cómo se probó el adaptador contra un servidor real.</p>

## `RestClient` y la configuración del adaptador [paso 5.10]

`RestClient` es el cliente HTTP síncrono de Spring, introducido en Spring Framework 6.1. Tiene una API fluida, parecida a la de `WebClient`, pero bloqueante, y es el sustituto natural de `RestTemplate` para código nuevo. En Spring Boot 4 su autoconfiguración llega con un *starter* propio, que el servicio de demandas añadió en este paso:

```xml title="it-service-manager/pom.xml (añadido)" estado="impl"
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-restclient</artifactId>
</dependency>
```

```properties title="it-service-manager/…/application.properties (añadido)" estado="impl"
application-catalog.base-url=http://localhost:8081
```

```java title="demand/adapter/RestApplicationCatalog.java (extracto)" estado="final"
@Service
public class RestApplicationCatalog implements ApplicationCatalog {

    private final RestClient restClient;

    public RestApplicationCatalog(
            RestClient.Builder builder,
            @Value("${application-catalog.base-url}") String baseUrl) {

        this.restClient = builder
                .baseUrl(baseUrl)
                .requestFactory(createRequestFactory())
                .build();
    }

    private static JdkClientHttpRequestFactory createRequestFactory() {

        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();

        JdkClientHttpRequestFactory factory =
                new JdkClientHttpRequestFactory(httpClient);

        factory.setReadTimeout(Duration.ofSeconds(3));

        return factory;
    }
}
```

**`RestClient.Builder` inyectado.** Spring Boot proporciona un *builder* ya configurado con los convertidores de mensajes de la aplicación (el mismo Jackson que usan los controladores). Se inyecta uno nuevo en cada punto de inyección, así que configurarlo aquí no afecta a otros clientes.

**La URL base viene de la configuración.** `@Value("${application-catalog.base-url}")` la lee de `application.properties`, y se puede sobrescribir con una variable de entorno (`APPLICATION_CATALOG_BASE_URL`) en otro entorno, sin recompilar.

**Recibir la URL por constructor** permite que la prueba del adaptador cree la clase con `new` y la apunte a un servidor de pruebas (última sección).

**El adaptador es un `@Service`** que implementa el puerto. Como el módulo de aplicaciones ya no existe en este proceso, `JpaApplicationCatalog` desaparece con él, y `RestApplicationCatalog` es la única implementación: Spring la inyecta en `DemandService` sin que este cambie una línea.

::: nota La transición entre los dos adaptadores
Durante el tiempo en que conviven el monolito con su módulo de aplicaciones y el servicio nuevo, es habitual mantener las dos implementaciones del puerto y elegir una al arrancar con `@Profile` o `@ConditionalOnProperty`, para poder volver atrás cambiando solo la configuración. El código final no conserva ningún mecanismo de ese tipo, así que la guía no puede afirmar cómo se hizo esa transición en el proyecto.
:::

### Por qué los tiempos máximos son imprescindibles

El adaptador configura dos límites:

| Límite | Valor | Qué protege |
|---|---|---|
| Conexión (`connectTimeout`) | 2 s | Que el servicio de demandas espere indefinidamente a que se establezca la conexión TCP |
| Lectura (`setReadTimeout`) | 3 s | Que espere indefinidamente a que llegue la respuesta una vez conectado |

Sin ellos, el `HttpClient` del JDK no impone un límite al tiempo de espera de una respuesta. Si el catálogo se queda colgado (un bloqueo en la base de datos, una pausa larga del recolector de basura), cada petición al servicio de demandas que necesite el catálogo se quedaría esperando. Cada una ocupa un hilo de Tomcat, que por defecto tiene un número limitado. En poco tiempo, todos los hilos estarían bloqueados esperando al catálogo y el servicio de demandas dejaría de responder **a todo**, incluidas las peticiones que no necesitan el catálogo. Es un **fallo en cascada**: el problema de un servicio se propaga al que lo llama.

Con los límites, una petición que no obtiene respuesta en, como mucho, unos cinco segundos falla de forma controlada, libera su hilo y devuelve un error claro.

::: java
Es el equivalente a configurar los tiempos máximos de un cliente remoto en WebSphere (por ejemplo, el tiempo de espera de las peticiones RMI-IIOP o de un cliente JAX-WS). En Java EE solía estar en la configuración del servidor; aquí está en el código del adaptador, junto a la llamada que protege.
:::

## Las dos operaciones del puerto por HTTP

```java title="demand/adapter/RestApplicationCatalog.java · findById" estado="final"
@Override
public Optional<ApplicationSummary> findById(Long id) {

    try {
        return executeRequest(() -> {

            ApplicationSummaryResponse response = restClient.get()
                    .uri("/api/applications/{id}", id)
                    .retrieve()
                    .body(ApplicationSummaryResponse.class);

            return Optional.ofNullable(response)
                    .map(item -> new ApplicationSummary(
                            item.id(),
                            item.name()
                    ));
        });

    } catch (RestClientResponseException ex) {

        if (ex.getStatusCode().value() == 404) {
            return Optional.empty();
        }

        throw ex;
    }
}
```

```java title="demand/adapter/RestApplicationCatalog.java · findByIds" estado="final"
@Override
public Map<Long, ApplicationSummary> findByIds(Set<Long> ids) {

    if (ids.isEmpty()) {
        return Map.of();
    }

    String joinedIds = ids.stream()
            .map(String::valueOf)
            .collect(Collectors.joining(","));

    return executeRequest(() -> {

        ApplicationSummaryResponse[] response = restClient.get()
                .uri("/api/applications/summaries?ids={ids}", joinedIds)
                .retrieve()
                .body(ApplicationSummaryResponse[].class);

        if (response == null) {
            return Map.of();
        }

        return Arrays.stream(response)
                .collect(Collectors.toUnmodifiableMap(
                        ApplicationSummaryResponse::id,
                        item -> new ApplicationSummary(
                                item.id(),
                                item.name()
                        )
                ));
    });
}

private record ApplicationSummaryResponse(
        Long id,
        String name
) {
}
```

**La cadena `get().uri(...).retrieve().body(...)`** construye la petición, la ejecuta y convierte el cuerpo JSON en el tipo indicado. Las variables de la plantilla (`{id}`, `{ids}`) se codifican correctamente en la URL.

**`retrieve()` lanza excepciones ante errores HTTP.** Una respuesta 4xx produce una `HttpClientErrorException` y una 5xx una `HttpServerErrorException`; ambas son subclases de `RestClientResponseException`, que lleva el código de estado.

**Un *record* privado para leer la respuesta.** El adaptador no depende del DTO del catálogo (está en otro proyecto) ni lo copia entero. Declara un *record* con los dos campos que le interesan. La respuesta del detalle trae además descripción, criticidad y estado, pero la configuración de Jackson de Spring Boot **ignora las propiedades desconocidas**, así que esos campos se descartan. Es el principio del *lector tolerante*: leer solo lo que se necesita para que los cambios del proveedor que no afectan a esos campos no rompan al consumidor.

**De la respuesta al dominio.** El adaptador convierte el *record* de transporte en `ApplicationSummary`, el *record* del puerto. Los detalles de HTTP no salen de esta clase.

## Traducir los fallos remotos [paso 5.11]

```java title="demand/adapter/RestApplicationCatalog.java · executeRequest" estado="final"
private <T> T executeRequest(Supplier<T> request) {

    try {
        return request.get();

    } catch (RestClientResponseException ex) {

        if (ex.getStatusCode().is5xxServerError()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Application Catalog is unavailable",
                    ex
            );
        }

        throw ex;

    } catch (ResourceAccessException ex) {

        throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Application Catalog is unavailable",
                ex
        );
    }
}
```

Combinando `executeRequest` con el `catch` de `findById`, cada situación remota tiene una traducción precisa:

<figure>
<svg viewBox="0 0 680 270" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="m20" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="10" y="105" width="130" height="60" rx="8" fill="#0b1220"/><text x="75" y="130" text-anchor="middle" fill="#fff" font-weight="700">RestApplication</text><text x="75" y="145" text-anchor="middle" fill="#fff" font-weight="700">Catalog</text>
  <g font-size="9.5">
    <rect x="190" y="10" width="200" height="36" rx="6" fill="#ecfdf5" stroke="#6ee7b7"/><text x="200" y="26" font-weight="700">200 OK</text><text x="200" y="39" fill="#475569">respuesta del catálogo</text>
    <rect x="190" y="62" width="200" height="36" rx="6" fill="#f8fafc" stroke="#94a3b8"/><text x="200" y="78" font-weight="700">404 (solo findById)</text><text x="200" y="91" fill="#475569">la aplicación no existe</text>
    <rect x="190" y="114" width="200" height="36" rx="6" fill="#fff1f2" stroke="#fda4af"/><text x="200" y="130" font-weight="700">5xx</text><text x="200" y="143" fill="#475569">el catálogo falla</text>
    <rect x="190" y="166" width="200" height="36" rx="6" fill="#fff1f2" stroke="#fda4af"/><text x="200" y="182" font-weight="700">Sin conexión o tiempo agotado</text><text x="200" y="195" fill="#475569">ResourceAccessException</text>
    <rect x="190" y="218" width="200" height="36" rx="6" fill="#fffbeb" stroke="#fcd34d"/><text x="200" y="234" font-weight="700">Otro 4xx (400, 401…)</text><text x="200" y="247" fill="#475569">se relanza tal cual</text>
    <rect x="440" y="10" width="230" height="36" rx="6" fill="#ecfdf5" stroke="#6ee7b7"/><text x="450" y="31">ApplicationSummary / mapa</text>
    <rect x="440" y="62" width="230" height="36" rx="6" fill="#f8fafc" stroke="#94a3b8"/><text x="450" y="78">Optional.empty()</text><text x="450" y="91" fill="#475569">→ el servicio responde 404</text>
    <rect x="440" y="114" width="230" height="88" rx="6" fill="#fff1f2" stroke="#fda4af"/><text x="450" y="148" font-weight="700">503 Service Unavailable</text><text x="450" y="164" fill="#475569">"Application Catalog is unavailable"</text>
    <rect x="440" y="218" width="230" height="36" rx="6" fill="#fffbeb" stroke="#fcd34d"/><text x="450" y="234" font-weight="700">500 sin formato del proyecto</text><text x="450" y="247" fill="#475569">ningún manejador la trata</text>
  </g>
  <g stroke="#0891b2" stroke-width="1.2" fill="none">
    <line x1="140" y1="120" x2="188" y2="28" marker-end="url(#m20)"/><line x1="140" y1="127" x2="188" y2="80" marker-end="url(#m20)"/>
    <line x1="140" y1="135" x2="188" y2="132" marker-end="url(#m20)"/><line x1="140" y1="142" x2="188" y2="184" marker-end="url(#m20)"/>
    <line x1="140" y1="150" x2="188" y2="236" marker-end="url(#m20)"/>
    <line x1="390" y1="28" x2="438" y2="28" marker-end="url(#m20)"/><line x1="390" y1="80" x2="438" y2="80" marker-end="url(#m20)"/>
    <line x1="390" y1="132" x2="438" y2="150" marker-end="url(#m20)"/><line x1="390" y1="184" x2="438" y2="166" marker-end="url(#m20)"/>
    <line x1="390" y1="236" x2="438" y2="236" marker-end="url(#m20)"/>
  </g>
</svg>
<figcaption><b>Figura 20.1.</b> Traducción de las respuestas del catálogo. El caso inferior es un hueco: no está traducido.</figcaption>
</figure>

### 404 frente a 503: dos significados que no deben mezclarse

La distinción más importante del adaptador es entre «la aplicación no existe» y «no puedo saber si existe».

- **404 del catálogo** significa que el catálogo respondió y la aplicación no está. Es una respuesta de negocio: el adaptador devuelve `Optional.empty()` y el servicio de demandas responde al cliente con un 404 `Application not found`, igual que en el monolito.
- **5xx, conexión rechazada o tiempo agotado** significan que no hubo respuesta fiable. Responder 404 aquí sería **mentir**: el frontend diría al usuario que la aplicación no existe cuando en realidad existe y el catálogo está caído. Por eso se responde 503.

| Código | Significado en HTTP | Uso en el proyecto |
|---|---|---|
| 404 Not Found | El recurso no existe | El catálogo confirma que la aplicación no existe |
| 500 Internal Server Error | Error inesperado del propio servidor | Fallos no previstos |
| 502 Bad Gateway | Un servidor intermedio recibió una respuesta inválida de otro | No se usa |
| 503 Service Unavailable | El servicio no puede atender temporalmente | El catálogo no responde o falla |
| 504 Gateway Timeout | Un servidor intermedio no recibió respuesta a tiempo | No se usa; el tiempo agotado también es 503 |

::: decision Un único 503 para toda indisponibilidad del catálogo
**Motivo:** para el cliente del servicio de demandas lo relevante es que la operación no se puede completar **ahora** y que conviene reintentar más tarde. 503 lo expresa, y el frontend lo trata como un error temporal. **Alternativa:** distinguir 502 (respuesta inválida) y 504 (tiempo agotado), más preciso para quien opera el sistema, pero sin diferencia práctica para el usuario. **Detalle:** la excepción original se pasa como causa (tercer argumento), así que queda en el *log* aunque el cliente solo vea el mensaje genérico.
:::

### El hueco de los otros 4xx

Si el catálogo respondiera con un 400 o un 401 (por ejemplo, si algún día exigiera autenticación), `executeRequest` relanzaría la `RestClientResponseException` original. Ningún manejador del proyecto la trata, así que llegaría al frontend como un 500 con el formato por defecto de Spring Boot. Hoy no ocurre, porque el adaptador construye siempre peticiones válidas y el catálogo no tiene seguridad, pero es un caso sin traducir.

::: pendiente Completar la traducción de errores
Traducir cualquier 4xx inesperado del catálogo (salvo el 404 de `findById`) a un 502, porque significa que el servicio de demandas hizo una petición que el catálogo no acepta: un fallo de integración, no del usuario. Y añadir un manejador global para `RestClientException` como red de seguridad.

**Resuelto en la fase 7** (capítulo 25).
:::

## Una llamada remota dentro de una transacción

Hay un efecto del nuevo adaptador que no se ve en su código, sino en el del servicio:

```java title="demand/service/DemandService.java (extracto)" estado="final"
@Transactional
public DemandResponse createDemand(DemandCreateRequest request) {

    ApplicationSummary application = requireApplication(request.applicationId());
    // …
```

`createDemand` es `@Transactional`, y lo primero que hace es llamar al catálogo. La transacción ya está abierta cuando empieza la llamada HTTP, así que **la conexión a la base de datos queda retenida mientras se espera al catálogo**: hasta cinco segundos en el peor caso, sin hacer nada con ella. Con el *pool* por defecto de diez conexiones, diez peticiones simultáneas esperando a un catálogo lento bastarían para que ninguna otra operación del servicio pudiera acceder a la base de datos. Ocurre lo mismo en `updateDemand` y en los métodos de consulta.

En el monolito esto no importaba: la comprobación era una consulta más en la misma conexión. Al convertirse en una llamada remota, el coste cambió sin que el código del servicio cambiara.

::: pendiente Sacar la llamada remota de la transacción
Hacer la llamada al catálogo **antes** de abrir la transacción y abrirla solo para la parte que toca la base de datos. Por ejemplo, separando la orquestación en un método sin `@Transactional` que llama al catálogo y después a otro *bean* transaccional, o usando `TransactionTemplate` para delimitar solo la escritura. La regla general: no mantener transacciones abiertas mientras se espera a la red.

**Resuelto en la fase 7** con `TransactionOperations` (capítulo 25).
:::

## Probar el adaptador contra un servidor real [paso 5.12]

```java title="demand/adapter/RestApplicationCatalogTest.java (extracto)" estado="final"
class RestApplicationCatalogTest {

    private HttpServer server;
    private RestApplicationCatalog catalog;
    private final AtomicInteger requests = new AtomicInteger();

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(
                new InetSocketAddress("127.0.0.1", 0), 0);

        server.createContext("/api/applications", exchange -> {
            requests.incrementAndGet();

            String path = exchange.getRequestURI().getPath();

            if (path.endsWith("/summaries")) {
                respond(exchange, 200,
                        """
                        [
                          {"id":1,"name":"SIGMA"},
                          {"id":2,"name":"ORION"}
                        ]
                        """);
            } else if (path.endsWith("/404")) {
                respond(exchange, 404, "{}");
            } else if (path.endsWith("/500")) {
                respond(exchange, 500, "{}");
            } else if (path.endsWith("/1")) {
                respond(exchange, 200,
                        "{\"id\":1,\"name\":\"SIGMA\"}");
            } else {
                respond(exchange, 404, "{}");
            }
        });

        server.start();

        String baseUrl = "http://127.0.0.1:"
                + server.getAddress().getPort();

        catalog = new RestApplicationCatalog(
                RestClient.builder(), baseUrl);
    }

    @Test
    void fetchesApplicationsInSingleBatch() {
        Map<Long, ?> result = catalog.findByIds(Set.of(1L, 2L));

        assertEquals(2, result.size());
        assertEquals(1, requests.get());
    }

    @Test
    void convertsConnectionFailureTo503() {
        server.stop(0);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> catalog.findById(1L));

        assertEquals(
                HttpStatus.SERVICE_UNAVAILABLE,
                ex.getStatusCode());
    }
}
```

La prueba arranca un **servidor HTTP real**, el que trae el propio JDK (`com.sun.net.httpserver.HttpServer`), en `127.0.0.1` y en el puerto 0, que significa «cualquier puerto libre». El servidor responde según la ruta: lotes, una aplicación existente, un 404 y un 500. El adaptador se crea con `new`, apuntando a ese servidor, sin arrancar Spring.

Las cinco pruebas cubren: encontrar una aplicación, un 404 que se convierte en `Optional.empty()`, el lote en **una sola petición** (el contador `requests`), un 500 que se convierte en 503 y, parando el servidor, un fallo de conexión que también se convierte en 503.

::: decision Un servidor HTTP real en lugar de un simulador de Spring
**Motivo:** el adaptador se prueba de extremo a extremo, con conexiones TCP reales, el `JdkClientHttpRequestFactory` configurado y la deserialización de Jackson. Spring ofrece `MockRestServiceServer`, que intercepta las peticiones dentro del propio `RestClient` y **no** abre conexiones: no habría podido probar un fallo de conexión. **Alternativa:** WireMock, más completo (retrasos, verificación de peticiones), a cambio de una dependencia más. El servidor del JDK no necesita ninguna.
:::

::: pendiente Dos casos sin probar
No hay prueba del tiempo máximo de lectura (un servidor que tarde más de tres segundos en responder) ni de un 4xx distinto del 404. El primero es el escenario más peligroso en producción; se puede probar con un manejador que haga `Thread.sleep` antes de responder, idealmente configurando el adaptador con un límite más corto para que la prueba no tarde.
:::

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| `No qualifying bean of type 'RestClient.Builder'` | Falta `spring-boot-starter-restclient` (Spring Boot 4) | Añadir el *starter* |
| `Could not resolve placeholder 'application-catalog.base-url'` | Falta la propiedad | Añadirla o definir la variable de entorno |
| Todas las operaciones de demandas responden 503 | El catálogo no está arrancado o escucha en otro puerto | Arrancarlo en el 8081 o corregir la URL |
| El servicio de demandas deja de responder cuando el catálogo va lento | Faltan los tiempos máximos o son demasiado largos | Configurarlos en la fábrica de peticiones |
| Error de deserialización al leer el detalle | El *record* de transporte tiene un tipo incompatible con el JSON | Revisar los tipos de `id` y `name` |

## Ejercicios

::: ejercicio Provocar un 503
Con los dos servicios arrancados, para el catálogo y pide desde el frontend o con una petición manual el listado de demandas. Observa la respuesta del servicio de demandas, el mensaje y el tiempo que tarda. Vuelve a arrancar el catálogo y comprueba que todo se recupera sin reiniciar el servicio de demandas.
:::

::: ejercicio Probar el tiempo máximo de lectura
Añade a `RestApplicationCatalogTest` un contexto `/api/applications/slow` cuyo manejador espere cuatro segundos antes de responder, y una prueba que llame a `findById` sobre ese recurso y compruebe que se lanza una `ResponseStatusException` con 503. Piensa cómo podrías evitar que la prueba tarde cuatro segundos.
:::

::: preguntas
1. ¿Qué es un fallo en cascada y cómo lo evitan los tiempos máximos?
2. ¿Por qué el adaptador declara su propio *record* `ApplicationSummaryResponse` en lugar de reutilizar el DTO del catálogo?
3. ¿Por qué un 404 del catálogo se traduce en `Optional.empty()` y un fallo de conexión en un 503, y no en un 404?
4. ¿Qué problema aparece al llamar al catálogo dentro de un método `@Transactional`?
5. ¿Por qué `MockRestServiceServer` no habría servido para probar el fallo de conexión?
:::
