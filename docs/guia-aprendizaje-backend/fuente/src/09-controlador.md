# El controlador REST y el contrato HTTP

<p class="lead">El controlador es la puerta de entrada: convierte peticiones HTTP en llamadas al servicio y resultados en respuestas HTTP. Este capítulo explica <code>ApplicationController</code>, cómo Spring construye un <code>Pageable</code> a partir de la URL, por qué la página se devuelve en un DTO propio y, al final, el recorrido completo de una petición por todas las capas.</p>

## Exponer `/api/applications` [paso 2.6]

```java title="application/controller/ApplicationController.java" estado="impl"
@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @GetMapping
    public ApplicationPageResponse getApplications(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String criticality,
            @PageableDefault(
                    size = 10,
                    sort = "id",
                    direction = Sort.Direction.ASC
            ) Pageable pageable) {

        return applicationService.getApplications(
                status,
                criticality,
                pageable);
    }

    @GetMapping("/{id}")
    public ApplicationResponse getApplicationById(@PathVariable Long id) {
        return applicationService.getApplicationById(id);
    }

    @PostMapping
    public ResponseEntity<ApplicationResponse> createApplication(
            @Valid @RequestBody ApplicationCreateRequest request) {

        ApplicationResponse created =
                applicationService.createApplication(request);

        URI location = URI.create(
                "/api/applications/" + created.id()
        );

        return ResponseEntity
                .created(location)
                .body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApplicationResponse> updateApplication(
            @PathVariable Long id,
            @Valid @RequestBody ApplicationUpdateRequest request) {

        ApplicationResponse response =
                applicationService.updateApplication(id, request);

        return ResponseEntity.ok(response);
    }
}
```

**`@RestController`** combina `@Controller` y `@ResponseBody`: el valor que devuelve cada método se serializa directamente como cuerpo de la respuesta (JSON, con Jackson), en lugar de interpretarse como el nombre de una vista.

**`@RequestMapping("/api/applications")`** fija el prefijo común. Cada método añade su parte con `@GetMapping`, `@PostMapping` o `@PutMapping`.

**`@RequestParam(required = false)`** lee un parámetro de la cadena de consulta (`?status=ACTIVE`). Si no viene, el valor es `null`, y el servicio interpreta `null` como «sin filtro».

**`@PathVariable Long id`** extrae el segmento `{id}` de la ruta y lo convierte a `Long`. Si no es un número (`/api/applications/abc`), la conversión falla antes de llegar al método; el capítulo 10 explica cómo se responde a eso.

**El alta devuelve `201 Created`** con una cabecera `Location` que apunta al recurso nuevo, y el propio recurso en el cuerpo. Es la respuesta que HTTP prevé para una creación, y permite al cliente conocer el `id` y la URL sin otra petición. La modificación devuelve `200 OK` con el recurso actualizado.

::: java
Es el equivalente directo de un recurso JAX-RS: `@Path` se convierte en `@RequestMapping`, `@GET` en `@GetMapping`, `@QueryParam` en `@RequestParam`, `@PathParam` en `@PathVariable`, y `Response.created(uri).entity(x).build()` en `ResponseEntity.created(uri).body(x)`. El servlet frontal de Spring, `DispatcherServlet`, hace el papel del servlet de la implementación JAX-RS del servidor.
:::

::: nota La URL de `Location`
La cabecera se construye como URI relativa (`/api/applications/5`). HTTP lo permite y el cliente la resuelve contra la URL de la petición. Si se quisiera absoluta, `ServletUriComponentsBuilder.fromCurrentRequest()` la construiría a partir de la petición en curso.
:::

## Cómo construye Spring un `Pageable`

El parámetro `Pageable pageable` no lleva `@RequestParam`. Lo rellena un componente de Spring Data Web, `PageableHandlerMethodArgumentResolver`, que lee tres parámetros de la URL:

| Parámetro | Significado | Ejemplo |
|---|---|---|
| `page` | Número de página, **empezando en 0** | `page=2` |
| `size` | Elementos por página | `size=25` |
| `sort` | Propiedad y, opcionalmente, dirección; se puede repetir | `sort=name,desc&sort=id` |

`@PageableDefault(size = 10, sort = "id", direction = ASC)` define qué se usa cuando el cliente no envía esos parámetros: primera página, diez elementos, ordenados por `id` ascendente. Sin la anotación, el tamaño por defecto sería 20 y no habría orden, lo que da resultados no deterministas entre páginas.

Spring Data limita además el tamaño máximo de página (2000 por defecto), de modo que una petición con `size=1000000` no carga la tabla entera.

::: atencion El campo de ordenación lo elige el cliente
`sort` acepta cualquier texto. Spring Data lo traduce a un `ORDER BY` sobre la propiedad de la entidad con ese nombre. Si la propiedad no existe, la consulta falla con una excepción que, sin tratamiento, llega al cliente como un error 500. En la primera versión no había ninguna comprobación; más adelante se añadió una lista de campos permitidos (capítulo 10).
:::

## La página en un DTO propio [paso 2.7]

El servicio devuelve un `ApplicationPageResponse`, no el `Page<ApplicationResponse>` de Spring Data:

```java title="application/dto/ApplicationPageResponse.java" estado="impl"
public record ApplicationPageResponse(
        List<ApplicationResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
```

```json title="Respuesta de GET /api/applications?size=2"
{
  "content": [
    { "id": 1, "name": "SIGMA", "description": "Portal de gestión de expedientes",
      "criticality": "HIGH", "status": "ACTIVE" },
    { "id": 2, "name": "ORION", "description": "Aplicación backend",
      "criticality": "MEDIUM", "status": "ACTIVE" }
  ],
  "page": 0,
  "size": 2,
  "totalElements": 2,
  "totalPages": 1
}
```

Serializar directamente un `Page` produce un JSON con muchos campos internos (`pageable`, `sort`, `first`, `last`, `numberOfElements`…) cuya forma depende de la implementación `PageImpl` y puede cambiar entre versiones de Spring Data. De hecho, Spring Data avisa en el *log* cuando detecta que se serializa un `PageImpl` tal cual y recomienda no hacerlo.

::: decision DTO de página propio
**Motivo:** el contrato con el frontend queda fijado por el proyecto, con cinco campos estables y con nombre propio, y no depende de una clase interna de Spring Data. **Alternativa:** activar `@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)`, que hace que Spring Data serialice un `PagedModel` estable. Habría funcionado, pero con un formato anidado (`content` y `page`) que el proyecto no controla.
:::

## El recorrido completo de una petición

Con todas las capas construidas, es el momento de seguir una petición de alta de principio a fin.

<figure>
<svg viewBox="0 0 680 420" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="9.5">
  <defs><marker id="m9" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker>
  <marker id="m9b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#c2410c"/></marker></defs>
  <g text-anchor="middle">
    <rect x="20" y="10" width="260" height="34" rx="6" fill="#0b1220"/><text x="150" y="25" fill="#fff" font-weight="700">1. Petición HTTP</text><text x="150" y="37" fill="#a5f3fc" font-size="8.5">POST /api/applications + JSON</text>
    <rect x="20" y="60" width="260" height="34" rx="6" fill="#f8fafc" stroke="#94a3b8"/><text x="150" y="75" font-weight="700">2. Tomcat → DispatcherServlet</text><text x="150" y="87" font-size="8.5" fill="#475569">elige el método por URL y verbo</text>
    <rect x="20" y="110" width="260" height="34" rx="6" fill="#f8fafc" stroke="#94a3b8"/><text x="150" y="125" font-weight="700">3. Jackson: JSON → record DTO</text><text x="150" y="137" font-size="8.5" fill="#475569">ApplicationCreateRequest</text>
    <rect x="20" y="160" width="260" height="34" rx="6" fill="#f5f3ff" stroke="#c4b5fd"/><text x="150" y="175" font-weight="700">4. Bean Validation (@Valid)</text><text x="150" y="187" font-size="8.5" fill="#475569">si falla: 400 sin llamar al método</text>
    <rect x="20" y="210" width="260" height="34" rx="6" fill="#ecfeff" stroke="#0891b2"/><text x="150" y="225" font-weight="700">5. ApplicationController</text><text x="150" y="237" font-size="8.5" fill="#475569">delega en el servicio</text>
    <rect x="20" y="260" width="260" height="34" rx="6" fill="#ecfeff" stroke="#0891b2"/><text x="150" y="275" font-weight="700">6. Proxy transaccional + servicio</text><text x="150" y="287" font-size="8.5" fill="#475569">begin · new Application(..., "ACTIVE")</text>
    <rect x="20" y="310" width="260" height="34" rx="6" fill="#ecfeff" stroke="#0891b2"/><text x="150" y="325" font-weight="700">7. Repositorio → Hibernate</text><text x="150" y="337" font-size="8.5" fill="#475569">save → persist → INSERT inmediato</text>
    <rect x="20" y="360" width="260" height="34" rx="6" fill="#0b1220"/><text x="150" y="375" fill="#fff" font-weight="700">8. HikariCP → JDBC → PostgreSQL</text><text x="150" y="387" fill="#a5f3fc" font-size="8.5">INSERT … RETURNING id</text>
    <rect x="400" y="360" width="260" height="34" rx="6" fill="#fff7ed" stroke="#fdba74"/><text x="530" y="375" font-weight="700">9. Entidad con id</text><text x="530" y="387" font-size="8.5" fill="#475569">gestionada en el contexto</text>
    <rect x="400" y="300" width="260" height="34" rx="6" fill="#fff7ed" stroke="#fdba74"/><text x="530" y="315" font-weight="700">10. toResponse → ApplicationResponse</text><text x="530" y="327" font-size="8.5" fill="#475569">dentro de la transacción</text>
    <rect x="400" y="240" width="260" height="34" rx="6" fill="#fff7ed" stroke="#fdba74"/><text x="530" y="255" font-weight="700">11. flush + COMMIT</text><text x="530" y="267" font-size="8.5" fill="#475569">la conexión vuelve al pool</text>
    <rect x="400" y="180" width="260" height="34" rx="6" fill="#fff7ed" stroke="#fdba74"/><text x="530" y="195" font-weight="700">12. ResponseEntity.created(location)</text><text x="530" y="207" font-size="8.5" fill="#475569">estado 201 + cabecera Location</text>
    <rect x="400" y="120" width="260" height="34" rx="6" fill="#fff7ed" stroke="#fdba74"/><text x="530" y="135" font-weight="700">13. Jackson: DTO → JSON</text><text x="530" y="147" font-size="8.5" fill="#475569">cuerpo de la respuesta</text>
    <rect x="400" y="60" width="260" height="34" rx="6" fill="#0b1220"/><text x="530" y="75" fill="#fff" font-weight="700">14. Respuesta HTTP 201</text><text x="530" y="87" fill="#a5f3fc" font-size="8.5">al cliente</text>
    <rect x="400" y="10" width="260" height="34" rx="6" fill="#fff1f2" stroke="#fda4af"/><text x="530" y="25" font-weight="700">Si algo lanza una excepción</text><text x="530" y="37" font-size="8.5" fill="#475569">rollback · GlobalExceptionHandler · JSON</text>
  </g>
  <g stroke="#0891b2" stroke-width="1.2">
    <line x1="150" y1="44" x2="150" y2="58" marker-end="url(#m9)"/><line x1="150" y1="94" x2="150" y2="108" marker-end="url(#m9)"/>
    <line x1="150" y1="144" x2="150" y2="158" marker-end="url(#m9)"/><line x1="150" y1="194" x2="150" y2="208" marker-end="url(#m9)"/>
    <line x1="150" y1="244" x2="150" y2="258" marker-end="url(#m9)"/><line x1="150" y1="294" x2="150" y2="308" marker-end="url(#m9)"/>
    <line x1="150" y1="344" x2="150" y2="358" marker-end="url(#m9)"/>
  </g>
  <g stroke="#c2410c" stroke-width="1.2">
    <line x1="280" y1="377" x2="398" y2="377" marker-end="url(#m9b)"/>
    <line x1="530" y1="360" x2="530" y2="336" marker-end="url(#m9b)"/><line x1="530" y1="300" x2="530" y2="276" marker-end="url(#m9b)"/>
    <line x1="530" y1="240" x2="530" y2="216" marker-end="url(#m9b)"/><line x1="530" y1="180" x2="530" y2="156" marker-end="url(#m9b)"/>
    <line x1="530" y1="120" x2="530" y2="96" marker-end="url(#m9b)"/>
  </g>
</svg>
<figcaption><b>Figura 9.1.</b> Flujo completo de un alta: HTTP → controlador → DTO → Bean Validation → servicio → repositorio → Hibernate → PostgreSQL, y la vuelta hasta la respuesta 201.</figcaption>
</figure>

Algunos puntos de la figura merecen un comentario:

- **Paso 4.** Si la validación falla, el flujo salta directamente al manejador de errores. No se abre ninguna transacción ni se toca la base de datos.
- **Paso 7.** Con `IDENTITY`, el `INSERT` se ejecuta en este momento y no en el *commit*, porque Hibernate necesita el `id`. PostgreSQL lo devuelve en la misma sentencia.
- **Paso 10.** El DTO se construye antes del *commit*. Si el *commit* fallara (por ejemplo, por una restricción de la base de datos comprobada al final), el cliente recibiría un error y no un 201.
- **Paso 11.** La conexión se devuelve al *pool* al terminar la transacción, antes de serializar la respuesta. Con `open-in-view=false` la conexión no se retiene mientras Jackson escribe el JSON.

## El contrato HTTP del módulo

| Método y ruta | Éxito | Errores posibles |
|---|---|---|
| `GET /api/applications?status&criticality&page&size&sort` | 200 + página | 400 (a partir del paso 2.9) |
| `GET /api/applications/{id}` | 200 + aplicación | 404, 400 si el `id` no es numérico |
| `POST /api/applications` | 201 + `Location` + aplicación | 400 por validación o JSON mal formado |
| `PUT /api/applications/{id}` | 200 + aplicación | 400, 404 |

No hay `DELETE`: las aplicaciones no se borran, se marcan como `INACTIVE`. Es una decisión de negocio que conserva el histórico y que, más adelante, evitó un problema de integridad cuando las demandas empezaron a referenciar aplicaciones.

::: proyecto
Este contrato es exactamente el que consume el frontend del proyecto a través del proxy de desarrollo de Vite, que reenvía `/api` al puerto 8080. La guía del frontend describe el otro lado: el cliente HTTP, los tipos de TypeScript alineados con estos DTO y el manejo del formato de error del capítulo 10.
:::

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| `415 Unsupported Media Type` en un `POST` | Falta la cabecera `Content-Type: application/json` | Enviarla |
| La primera página parece la segunda | El cliente numera las páginas desde 1 | `page` empieza en 0 |
| El orden cambia entre peticiones idénticas | No hay criterio de orden estable | Mantener `sort=id` como orden por defecto o secundario |
| 500 al ordenar por un campo | La propiedad no existe en la entidad | Ver la validación de campos de ordenación (capítulo 10) |
| La respuesta tiene campos `pageable`, `first`, `last`… | Se devolvió un `Page` directamente | Copiarlo a un DTO de página |

## Ejercicios

::: ejercicio Explorar el `Pageable`
Pide `GET /api/applications?page=0&size=1&sort=name,desc` y después `GET /api/applications?page=1&size=1&sort=name,desc`. Comprueba que entre las dos respuestas aparecen las dos aplicaciones iniciales en el orden esperado y que `totalPages` vale 2.
:::

::: ejercicio Seguir el flujo con el depurador
Pon puntos de ruptura en `ApplicationController.createApplication`, en `ApplicationService.createApplication` y en `toResponse`. Envía un alta y, en cada parada, observa en la pila de llamadas las clases de Spring que hay entre el controlador y el servicio. Identifica el proxy transaccional.
:::

::: preguntas
1. ¿Qué diferencia hay entre `@Controller` y `@RestController`?
2. ¿Qué tres parámetros de la URL lee el resolvedor de `Pageable` y desde qué número empiezan las páginas?
3. ¿Qué pasaría con el orden de los resultados si se quitara `@PageableDefault`?
4. ¿Por qué el proyecto no devuelve directamente el `Page` de Spring Data?
5. En el flujo de un alta, ¿en qué momento se ejecuta el `INSERT` y en cuál se devuelve la conexión al *pool*?
:::
