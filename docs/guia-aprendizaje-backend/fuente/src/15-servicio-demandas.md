# Servicio, ciclo de vida y API de demandas

<p class="lead">Con el modelo y las consultas listos, faltaban los casos de uso: crear una demanda sobre una aplicación existente, consultarla y modificarla respetando su ciclo de vida. Este capítulo explica cómo el servicio del monolito resolvió la referencia a la aplicación, por qué una transición inválida es un 409 y cómo se probó todo.</p>

## Crear una demanda [paso 3.7]

Crear una demanda exige que la aplicación indicada exista. En el monolito, el servicio de demandas lo comprobaba usando directamente el repositorio del otro módulo:

```java title="demand/service/DemandService.java · createDemand (monolito)" estado="reconstruido"
@Service
public class DemandService {

    private final DemandRepository demandRepository;
    private final ApplicationRepository applicationRepository;  // otro módulo

    @Transactional
    public DemandResponse createDemand(DemandCreateRequest request) {

        Application application = applicationRepository
                .findById(request.applicationId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Application not found: " + request.applicationId()
                ));

        Demand demand = new Demand(
                request.title(),
                request.description(),
                request.priority(),
                "OPEN",
                application
        );

        Demand saved = demandRepository.save(demand);

        return toResponse(saved);
    }
}
```

::: reconstruido
El código final conserva la misma secuencia (comprobar la aplicación, crear con estado `OPEN`, guardar, responder) y el mismo mensaje de error, pero obtiene la aplicación a través de un puerto (capítulo 18). El documento del refactor afirma que, tras él, «Demand y su servicio no conocen la entidad ni el repositorio Application», lo que confirma que antes sí los conocían. El uso de `ApplicationRepository` es la forma directa de hacerlo en el monolito.
:::

El método repite el patrón del alta de aplicaciones, con dos diferencias:

- **El estado inicial es `OPEN`**, siempre. El DTO de alta no tiene campo de estado.
- **Una aplicación inexistente es un 404**, con el mensaje `Application not found: <id>`. Se podría discutir si debería ser un 400 o un 422, porque el recurso que se intenta crear es la demanda, no la aplicación. El proyecto eligió 404 por coherencia con el resto de búsquedas por `id`, y el frontend lo interpreta como «la aplicación seleccionada ya no existe».

La comprobación verifica **existencia**, no estado: una demanda puede crearse sobre una aplicación `INACTIVE`. Es una regla de negocio deliberada, recogida en el documento `frontera-catalogo.md`.

Observa la línea marcada con el comentario: el servicio de demandas depende de un repositorio del módulo de aplicaciones. En el monolito funciona y es lo más sencillo, pero es exactamente el tipo de dependencia que el capítulo 16 identificará como problema.

### Los DTO de demandas

```java title="demand/dto/DemandCreateRequest.java" estado="impl"
public record DemandCreateRequest(

        @NotBlank
        @Size(max = 150)
        String title,

        @Size(max = 1000)
        String description,

        @NotBlank
        @Pattern(regexp = "LOW|MEDIUM|HIGH|CRITICAL")
        String priority,

        @NotNull
        Long applicationId
) {
}
```

`DemandUpdateRequest` añade `status`, con `@NotBlank` y `@Pattern(regexp = "OPEN|IN_PROGRESS|COMPLETED|CANCELLED")`. El identificador de aplicación usa `@NotNull`, porque es un número y `@NotBlank` solo se aplica a texto.

La respuesta incluye datos de la propia demanda y dos de su aplicación, el `id` y el nombre, para que el frontend pueda mostrar la tabla sin hacer otra petición por fila:

```java title="demand/dto/DemandResponse.java" estado="impl"
public record DemandResponse(
        Long id,
        String title,
        String description,
        String priority,
        String status,
        Long applicationId,
        String applicationName,
        Instant createdAt,
        Instant updatedAt
) {
}
```

## Modificar y cambiar de estado

```java title="demand/service/DemandService.java · updateDemand (monolito)" estado="reconstruido"
@Transactional
public DemandResponse updateDemand(Long id, DemandUpdateRequest request) {

    Demand demand = demandRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Demand not found: " + id
            ));

    Application application = applicationRepository
            .findById(request.applicationId())
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Application not found: " + request.applicationId()
            ));

    demand.update(
            request.title(),
            request.description(),
            request.priority(),
            application
    );

    try {
        demand.changeStatus(request.status());
    } catch (IllegalStateException ex) {
        throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                ex.getMessage()
        );
    }

    return toResponse(demand);
}
```

::: reconstruido
El bloque `try`/`catch` y el orden de las operaciones son idénticos en el código final; solo cambia cómo se obtiene la aplicación.
:::

El orden de las comprobaciones define qué error recibe el cliente cuando hay varios problemas a la vez: primero, que la demanda exista (404 `Demand not found`); después, que exista la aplicación (404 `Application not found`); por último, que la transición sea válida (409).

### Qué pasa con los cambios cuando la transición falla

Fíjate en el orden: `update(...)` **ya ha modificado** título, descripción, prioridad y aplicación cuando `changeStatus` lanza la excepción. ¿Se guardan esos cambios?

No. El servicio captura la `IllegalStateException` y lanza una `ResponseStatusException`, que es no comprobada. Al salir del método con esa excepción, el proxy transaccional **deshace la transacción**. Hibernate nunca hace *flush*, así que la entidad modificada en memoria se descarta junto con el contexto de persistencia. La operación es todo o nada, sin que el código tenga que deshacer nada a mano.

::: java
Es exactamente el comportamiento de una transacción gestionada por el contenedor ante una `RuntimeException` en un EJB, con la diferencia de que allí el contenedor envolvía la excepción en una `EJBException`. Aquí la excepción llega intacta al manejador global.
:::

### Por qué 409 Conflict

Una transición inválida no es un error de formato: el JSON es correcto y el estado `OPEN` es un valor válido. El problema es que **choca con el estado actual del recurso**. Para eso está el código 409 Conflict: la petición no puede completarse porque entra en conflicto con el estado del recurso en el servidor.

| Código | Cuándo se usa en el proyecto |
|---|---|
| 400 Bad Request | La petición está mal construida: campos inválidos, filtros desconocidos |
| 404 Not Found | El recurso, o uno al que se hace referencia, no existe |
| 409 Conflict | La petición es correcta, pero choca con el estado actual |

El frontend aprovecha esta distinción: ante un 409 muestra el mensaje de transición inválida y ofrece recargar la demanda, porque lo más probable es que otra persona la haya cambiado mientras tanto.

::: decision Cambios de estado a través de `PUT`
**Motivo:** el formulario de modificación edita todos los campos, incluido el estado, y los envía juntos; un único *endpoint* mantiene la API pequeña. La regla de transición se aplica igual. **Alternativa:** un *endpoint* específico, como `PATCH /api/demands/{id}/status` o `POST /api/demands/{id}/start`, que expresa mejor la intención y facilita permisos distintos por acción. Podría añadirse si las transiciones se complican.
:::

## El controlador de demandas

```java title="demand/controller/DemandController.java (extracto)" estado="impl"
@RestController
@RequestMapping("/api/demands")
public class DemandController {

    @PostMapping
    public ResponseEntity<DemandResponse> createDemand(
            @Valid @RequestBody DemandCreateRequest request) {

        DemandResponse response = demandService.createDemand(request);

        return ResponseEntity
                .created(URI.create("/api/demands/" + response.id()))
                .body(response);
    }

    @GetMapping
    public DemandPageResponse getDemands(
            @RequestParam(required = false) Long applicationId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @PageableDefault(size = 10, sort = "id",
                    direction = Sort.Direction.ASC) Pageable pageable) {

        return demandService.getDemands(
                applicationId, status, priority, pageable);
    }

    // GET /{id} y PUT /{id}: igual que en aplicaciones
}
```

El controlador es casi idéntico al de aplicaciones, con un filtro más. `applicationId` es `Long`: si llega un valor no numérico, el manejador de tipos incorrectos responde con un 400 (capítulo 10).

| Método y ruta | Éxito | Errores posibles |
|---|---|---|
| `GET /api/demands?applicationId&status&priority&page&size&sort` | 200 + página | 400 |
| `GET /api/demands/{id}` | 200 + demanda | 404 |
| `POST /api/demands` | 201 + `Location` + demanda | 400, 404 (aplicación) |
| `PUT /api/demands/{id}` | 200 + demanda | 400, 404 (demanda o aplicación), 409 |

## Probar el dominio, el servicio y el controlador [paso 3.8]

Las pruebas del módulo siguen la misma estrategia que las de aplicaciones: el dominio con pruebas unitarias puras (`DemandTest`, capítulo 12), el servicio con Mockito y el controlador con `@WebMvcTest`.

### El 409, comprobado desde HTTP

```java title="demand/controller/DemandControllerTest.java (extracto)" estado="final"
@Test
void shouldReturnConflictForInvalidStatusTransition()
        throws Exception {

    when(demandService.updateDemand(
            eq(1L),
            any(DemandUpdateRequest.class)))
            .thenThrow(new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Invalid demand status transition: IN_PROGRESS -> OPEN"
            ));

    String requestBody = """
            {
              "title": "Adaptacion a la nueva normativa",
              "description": "Intento invalido",
              "priority": "CRITICAL",
              "status": "OPEN",
              "applicationId": 1
            }
            """;

    mockMvc.perform(put("/api/demands/1")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(requestBody))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.status").value(409))
            .andExpect(jsonPath("$.error").value("RESOURCE_ERROR"))
            .andExpect(jsonPath("$.message").value(
                    "Invalid demand status transition: IN_PROGRESS -> OPEN"));
}
```

La prueba no comprueba la regla de transición (eso lo hace `DemandTest`), sino el contrato: que una `ResponseStatusException` con 409 llega al cliente con el formato de error del proyecto. Cada nivel prueba lo suyo.

La clase tiene ocho pruebas: alta correcta con `Location`, alta inválida (con `verify(..., never())`), detalle, detalle inexistente, modificación, conflicto y dos filtros inválidos.

### El servicio con `@InjectMocks`

```java title="demand/service/DemandServiceTest.java (extracto, monolito)" estado="reconstruido"
@ExtendWith(MockitoExtension.class)
public class DemandServiceTest {

    @Mock
    private DemandRepository demandRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @InjectMocks
    private DemandService demandService;

    @Test
    void shouldRejectInvalidSortField() {

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> demandService.getDemands(
                        null, null, null,
                        PageRequest.of(0, 10, Sort.by("pepito"))));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Invalid demand sort field: pepito",
                exception.getReason());
    }
}
```

A diferencia de `ApplicationServiceTest`, que construía el servicio con `new`, esta clase usa `@InjectMocks`: Mockito crea el servicio e inyecta en su constructor los *mocks* declarados. Es más breve, pero menos explícito, y si el constructor cambia, Mockito puede inyectar `null` en silencio en lugar de fallar al compilar.

::: nota El segundo *mock*
La única diferencia con la versión final es el segundo *mock*: en el monolito el servicio dependía de `ApplicationRepository`; en la fase 5 esa dependencia cambia (capítulo 18) y la prueba cambia con ella. Las tres pruebas de esta clase validan parámetros antes de consultar nada, así que su cuerpo es idéntico en ambas versiones.
:::

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| Una transición inválida devuelve 500 | La `IllegalStateException` no se captura en el servicio | Traducirla a `ResponseStatusException` 409 |
| Una transición inválida guarda los demás cambios | La excepción lanzada es comprobada, o se captura sin relanzar | Relanzar una excepción no comprobada para provocar el *rollback* |
| `applicationId` nulo pasa la validación | Se usó `@NotBlank` en un `Long` | Usar `@NotNull` |
| `@InjectMocks` deja un atributo a `null` | El constructor cambió y falta un `@Mock` | Declarar todos los *mocks* o construir con `new` |

## Ejercicios

::: ejercicio Comprobar el todo o nada
Con el backend arrancado, toma una demanda en estado `IN_PROGRESS` y envía un `PUT` que cambie el título **y** pida volver a `OPEN`. Verifica el 409 y, después, consulta la demanda para comprobar que el título no cambió. Explica qué componente ha evitado que se guardara.
:::

::: ejercicio Una prueba de servicio con transición inválida
Escribe una prueba unitaria de `updateDemand` en la que el repositorio devuelva una demanda `COMPLETED` y la petición pida `IN_PROGRESS`. Comprueba que se lanza una `ResponseStatusException` con estado 409 y el mensaje exacto. Indica qué *mocks* necesitas preparar.
:::

::: preguntas
1. ¿Qué devuelve el servicio si se intenta crear una demanda sobre una aplicación inexistente? ¿Y sobre una `INACTIVE`?
2. ¿En qué orden se comprueban los errores en `updateDemand`?
3. ¿Por qué no se guardan los cambios de título cuando `changeStatus` lanza la excepción?
4. ¿Qué diferencia hay entre un 400 y un 409 en este proyecto?
5. ¿Qué riesgo tiene `@InjectMocks` frente a construir el servicio con `new`?
:::
