# Las pruebas del módulo Application

<p class="lead">El módulo de aplicaciones cierra su fase con pruebas automáticas de dos tipos: pruebas unitarias del servicio, que no arrancan Spring, y pruebas de la capa web, que arrancan solo los controladores. Este capítulo explica las dos, qué garantiza cada una y qué queda fuera de su alcance.</p>

## Tres niveles de prueba

| Nivel | Qué arranca | Velocidad | Qué demuestra | En el proyecto |
|---|---|---|---|---|
| Unitaria | Nada: `new` y *mocks* | Milisegundos | La lógica de una clase aislada | `ApplicationServiceTest`, `DemandTest` |
| De capa (*slice*) | Una parte de Spring: la capa web | Pocos segundos | El contrato HTTP: rutas, JSON, validación, códigos | `ApplicationControllerTest` |
| De integración | Toda la aplicación y un PostgreSQL real | Decenas de segundos | Que las capas funcionan juntas: SQL, Flyway, transacciones | Capítulo 16 |

Cuanto más abajo en la tabla, más realista y más lenta es la prueba. Lo razonable es tener muchas pruebas rápidas para la lógica y unas pocas de integración para lo que solo se puede comprobar con todo montado.

### El punto de partida

La versión publicada en GitHub solo tiene la prueba que genera Spring Initializr:

```java title="ItServiceManagerApplicationTests.java (versión de GitHub)" estado="impl"
@SpringBootTest
class ItServiceManagerApplicationTests {

    @Test
    void contextLoads() {
    }
}
```

Parece trivial, pero `@SpringBootTest` arranca el contexto completo: conecta con la base de datos, ejecuta Flyway y valida el esquema. Por eso necesita un PostgreSQL configurado, y la guía de instalación del repositorio advierte que solo debe ejecutarse contra una base de datos de pruebas. Es una prueba de integración disfrazada, y depende del entorno de quien la ejecuta. El capítulo 16 explica cómo se resolvió.

::: reconstruido
Las pruebas que siguen se muestran tal como están en el código final del módulo de aplicaciones, donde se conservaron al extraerlo (capítulo 19). El documento de verificación del refactor confirma que el monolito ya tenía una batería de pruebas antes de la fase 5, pero no se conserva su versión exacta. Lo único que cambia respecto al monolito es el paquete.
:::

## Probar el servicio con Mockito [paso 2.11]

```java title="application/service/ApplicationServiceTest.java (extracto)" estado="final"
@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    private ApplicationService applicationService;

    @BeforeEach
    void setUp() {
        applicationService = new ApplicationService(applicationRepository);
    }

    @Test
    void shouldThrowNotFoundWhenApplicationDoesNotExist() {

        when(applicationRepository.findById(999L))
                .thenReturn(Optional.empty());

        ResponseStatusException exception =
                assertThrows(
                        ResponseStatusException.class,
                        () -> applicationService.getApplicationById(999L)
                );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals(
                "Application not found: 999",
                exception.getReason()
        );
    }
}
```

La prueba no arranca Spring. `@ExtendWith(MockitoExtension.class)` activa Mockito en JUnit 5, `@Mock` crea un doble del repositorio y el servicio se construye con `new`, gracias a la inyección por constructor (capítulo 2). El *mock* devuelve lo que se le indica con `when(...).thenReturn(...)`, y la prueba comprueba el comportamiento del servicio: el código 404 y el mensaje exacto.

### Probar el alta sin base de datos

```java title="application/service/ApplicationServiceTest.java (extracto)" estado="final"
@Test
void shouldCreateApplicationWithActiveStatus() {

    ApplicationCreateRequest request =
            new ApplicationCreateRequest(
                    "TEST_APP",
                    "Aplicación creada desde test",
                    "HIGH"
            );

    when(applicationRepository.save(
            org.mockito.ArgumentMatchers.any(Application.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

    ApplicationResponse response =
            applicationService.createApplication(request);

    assertEquals("TEST_APP", response.name());
    assertEquals("HIGH", response.criticality());
    assertEquals("ACTIVE", response.status());

    verify(applicationRepository).save(
            org.mockito.ArgumentMatchers.any(Application.class));
}
```

`thenAnswer` permite devolver algo calculado a partir de la llamada: aquí, la misma entidad que recibió `save`. Así la prueba puede comprobar que el servicio construyó la entidad con el estado `ACTIVE`, aunque el DTO de entrada no lo traía. `verify` comprueba que `save` se llamó exactamente una vez.

### Probar que **no** se llama a `save`

```java title="application/service/ApplicationServiceTest.java (extracto)" estado="final"
@Test
void shouldUpdateExistingApplicationWithoutCallingSave() {

    Application application = new Application(
            "TEST_APP",
            "Descripción original",
            "LOW",
            "ACTIVE"
    );

    when(applicationRepository.findById(1L))
            .thenReturn(Optional.of(application));

    ApplicationUpdateRequest request =
            new ApplicationUpdateRequest(
                    "TEST_APP_UPDATED",
                    "Descripción modificada",
                    "CRITICAL",
                    "INACTIVE"
            );

    ApplicationResponse response =
            applicationService.updateApplication(1L, request);

    assertEquals("TEST_APP_UPDATED", response.name());
    assertEquals("INACTIVE", response.status());

    verify(applicationRepository, never())
            .save(any(Application.class));
}
```

Esta prueba fija por escrito la decisión del capítulo 7: la modificación se apoya en el *dirty checking*. Si alguien añade un `save` innecesario, la prueba falla y obliga a reconsiderarlo.

::: atencion Lo que esta prueba no puede demostrar
Sin Spring ni base de datos no hay transacción ni contexto de persistencia: la prueba demuestra que la entidad cambia en memoria, **no que el cambio llegue a PostgreSQL**. Eso solo lo puede comprobar una prueba de integración, que el proyecto incorpora más adelante con `flush` y una consulta posterior.
:::

El resto de pruebas del servicio cubre la búsqueda correcta, la modificación de un `id` inexistente y, una vez añadida la validación del paso 2.9, los filtros inválidos y un campo de ordenación inventado.

## Probar el controlador con `@WebMvcTest` y MockMvc

```java title="application/controller/ApplicationControllerTest.java (extracto)" estado="final"
@WebMvcTest(ApplicationController.class)
class ApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ApplicationService applicationService;

    @Test
    void shouldCreateApplication() throws Exception {

        ApplicationResponse response =
                new ApplicationResponse(
                        5L,
                        "TEST_APP",
                        "Aplicación creada desde test MVC",
                        "HIGH",
                        "ACTIVE"
                );

        when(applicationService.createApplication(
                any(ApplicationCreateRequest.class)))
                .thenReturn(response);

        String requestBody = """
                {
                  "name": "TEST_APP",
                  "description": "Aplicación creada desde test MVC",
                  "criticality": "HIGH"
                }
                """;

        mockMvc.perform(post("/api/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(header().string(
                        "Location",
                        "/api/applications/5"))
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }
}
```

**`@WebMvcTest(ApplicationController.class)`** arranca un contexto de Spring reducido: el controlador indicado, los `@RestControllerAdvice`, Jackson, la validación y la configuración de Spring MVC. **No** carga servicios, repositorios ni la base de datos. En Spring Boot 4, esta anotación la aporta `spring-boot-starter-webmvc-test`.

**`@MockitoBean`** registra un *mock* de Mockito como *bean* del contexto, en lugar del servicio real que no se ha cargado. Sustituye a `@MockBean`, que Spring Boot marcó como obsoleto en la versión 3.4 y que ya no existe en Spring Boot 4.

**`MockMvc`** ejecuta peticiones contra el `DispatcherServlet` **sin abrir un puerto de red**. La petición recorre los mismos pasos que una real (resolución de la ruta, Jackson, validación, manejadores de errores), pero en memoria.

**`jsonPath("$.id")`** consulta el cuerpo JSON de la respuesta con expresiones JsonPath.

### La validación, comprobada desde fuera

```java title="application/controller/ApplicationControllerTest.java (extracto)" estado="final"
@Test
void shouldReturnBadRequestWhenCreatingInvalidApplication() throws Exception {

    String requestBody = """
            {
              "name": " ",
              "description": "Aplicación inválida",
              "criticality": "URGENT"
            }
            """;

    mockMvc.perform(post("/api/applications")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(requestBody))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.fieldErrors.name").exists())
            .andExpect(jsonPath("$.fieldErrors.criticality").exists());

    verify(applicationService, never())
            .createApplication(any(ApplicationCreateRequest.class));
}
```

Esta prueba ejerce tres capas reales a la vez: Bean Validation, el `GlobalExceptionHandler` y el formato `ApiErrorResponse`. Y comprueba lo más importante: que una petición inválida **nunca llega al servicio**.

::: decision Pruebas de capa web con *mocks* del servicio
**Motivo:** el contrato HTTP (rutas, códigos, cabeceras, formato de error) se prueba en segundos y sin base de datos, y cada prueba falla por una sola razón. **Alternativa:** probarlo todo con `@SpringBootTest` y un servidor real, más realista pero mucho más lento y frágil. **Complemento:** las pruebas de integración con PostgreSQL real del capítulo 16.
:::

## Ejecutar las pruebas

```powershell
.\mvnw.cmd test                                     # todas
.\mvnw.cmd test -Dtest=ApplicationServiceTest       # una clase
.\mvnw.cmd test -Dtest="ApplicationServiceTest#shouldCreate*"   # métodos por patrón
```

Maven ejecuta las pruebas con el *plugin* Surefire, que por defecto busca clases cuyo nombre termina en `Test` o `Tests`. Una clase llamada `PruebasServicio` no se ejecutaría sin configuración adicional.

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| `NoSuchBeanDefinitionException: ApplicationService` en un `@WebMvcTest` | Falta el `@MockitoBean` del servicio | Declararlo en la prueba |
| `UnnecessaryStubbingException` | Se preparó un `when(...)` que la prueba nunca usa | Eliminarlo; Mockito estricto avisa de preparación sobrante |
| `contextLoads` falla en otra máquina | Necesita una base de datos configurada | Usar Testcontainers (capítulo 16) |
| `jsonPath` no encuentra el campo | El JSON no tiene la forma esperada | Añadir `.andDo(print())` para ver la respuesta completa |
| Una clase de pruebas no se ejecuta | Su nombre no termina en `Test` o `Tests` | Renombrarla |

## Ejercicios

::: ejercicio Una prueba nueva de servicio
Escribe una prueba unitaria que compruebe que `updateApplication` lanza un 404 con el mensaje `Application not found: 42` cuando el repositorio no encuentra el `id` 42, y que en ese caso tampoco se llama a `save`.
:::

::: ejercicio Probar la cabecera de un error
Escribe una prueba `@WebMvcTest` que haga `GET /api/applications/abc` y compruebe que la respuesta es 400, con `error` igual a `VALIDATION_ERROR` y un mensaje que nombra el parámetro `id`. ¿Hace falta preparar algún comportamiento del *mock* del servicio? ¿Por qué?
:::

::: preguntas
1. ¿Por qué `contextLoads` no es realmente una prueba unitaria?
2. ¿Qué hace `thenAnswer(invocation -> invocation.getArgument(0))` y por qué se usa en la prueba del alta?
3. ¿Qué carga y qué no carga `@WebMvcTest`?
4. ¿Qué sustituye `@MockitoBean` y por qué es necesario en las pruebas de controlador?
5. ¿Qué no puede demostrar la prueba `shouldUpdateExistingApplicationWithoutCallingSave`?
:::
