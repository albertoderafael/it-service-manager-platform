# El tratamiento de errores

<p class="lead">Un cliente necesita distinguir entre «has enviado algo mal», «eso no existe» y «algo ha fallado en el servidor», y necesita recibirlo siempre con la misma forma. Este capítulo explica el formato de error del proyecto, cómo Spring elige el manejador de cada excepción y cómo el tratamiento se fue ampliando.</p>

## Un formato de error común [paso 2.8]

Todas las respuestas de error del proyecto tienen la misma estructura:

```java title="exception/ApiErrorResponse.java" estado="impl"
public record ApiErrorResponse(
        int status,
        String error,
        String message,
        Map<String, String> fieldErrors
) {
}
```

| Campo | Contenido |
|---|---|
| `status` | El código HTTP, repetido en el cuerpo para comodidad del cliente |
| `error` | Una categoría estable: `VALIDATION_ERROR` o `RESOURCE_ERROR` |
| `message` | Un texto legible |
| `fieldErrors` | Mapa campo → mensaje; vacío si el error no es de campos |

La primera versión del manejador global trataba dos casos:

```java title="exception/GlobalExceptionHandler.java (versión de GitHub)" estado="impl"
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException ex) {

        Map<String, String> fieldErrors = new LinkedHashMap<>();

        ex.getBindingResult().getFieldErrors().forEach(error ->
            fieldErrors.putIfAbsent(
                error.getField(),
                error.getDefaultMessage()
            )
        );

        ApiErrorResponse body = new ApiErrorResponse(
            400,
            "VALIDATION_ERROR",
            "La petición contiene campos inválidos",
            fieldErrors
        );

        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatus(
            ResponseStatusException ex) {

        ApiErrorResponse body = new ApiErrorResponse(
            ex.getStatusCode().value(),
            "RESOURCE_ERROR",
            ex.getReason(),
            Map.of()
        );

        return ResponseEntity
                .status(ex.getStatusCode())
                .body(body);
    }
}
```

El primer manejador recoge los errores de Bean Validation. Recorre los errores de campo y guarda **uno por campo** (`putIfAbsent` conserva el primero), en un `LinkedHashMap` para mantener el orden. Si un campo viola dos restricciones, como un nombre vacío que incumple `@NotBlank`, el cliente recibe un único mensaje para ese campo.

El segundo traduce cualquier `ResponseStatusException` lanzada por el servicio: toma su código HTTP y su motivo (`getReason()`), que es el texto pasado al constructor.

```json title="400: petición inválida"
{
  "status": 400,
  "error": "VALIDATION_ERROR",
  "message": "La petición contiene campos inválidos",
  "fieldErrors": {
    "name": "no debe estar vacío",
    "criticality": "debe coincidir con \"LOW|MEDIUM|HIGH|CRITICAL\""
  }
}
```

```json title="404: recurso inexistente"
{
  "status": 404,
  "error": "RESOURCE_ERROR",
  "message": "Application not found: 999",
  "fieldErrors": {}
}
```

::: nota El idioma de los mensajes de campo
Los mensajes de `fieldErrors` son los mensajes por defecto de Hibernate Validator, que se eligen según el idioma de la petición o de la JVM: en un equipo configurado en español aparecen en español. El resto de los mensajes del proyecto están escritos en inglés en el código, salvo el texto general de validación, que está en español. El frontend no muestra estos textos directamente, sino que usa `status`, `error` y los nombres de los campos, así que la mezcla no afecta al usuario, pero es una incoherencia a corregir.
:::

## Cómo encuentra Spring el manejador

`@RestControllerAdvice` marca una clase cuyos métodos `@ExceptionHandler` se aplican a **todos** los controladores. Cuando un controlador (o algo que se ejecuta por él, como la validación o el servicio) lanza una excepción, Spring MVC la intercepta y busca un manejador:

1. Primero, métodos `@ExceptionHandler` en el propio controlador.
2. Después, en las clases `@ControllerAdvice` y `@RestControllerAdvice`.
3. Entre los candidatos, elige el que declara **el tipo más específico** de la jerarquía de la excepción.
4. Si no hay ninguno, la excepción sigue su camino: Spring aplica sus resolutores por defecto y, en último término, Spring Boot responde con su propio formato de error.

::: java
El equivalente en JAX-RS es un `ExceptionMapper<T>` registrado como `@Provider`. La idea es idéntica: un único punto que traduce excepciones a respuestas HTTP. La diferencia es que en Spring un mismo *advice* agrupa varios manejadores como métodos.
:::

## Rechazar filtros y ordenaciones desconocidos [paso 2.9]

En la primera versión, un filtro inventado devolvía una página vacía y un campo de ordenación inexistente provocaba un error 500. Más adelante el servicio empezó a validar sus parámetros de consulta:

```java title="application/service/ApplicationService.java (extracto)" estado="despues"
private static final Set<String> VALID_STATUSES = Set.of(
        "ACTIVE",
        "INACTIVE"
);

private static final Set<String> VALID_CRITICALITIES = Set.of(
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
);

private static final Set<String> VALID_SORT_FIELDS = Set.of(
        "id",
        "name",
        "criticality",
        "status"
);

@Transactional(readOnly = true)
public ApplicationPageResponse getApplications(
        String status,
        String criticality,
        Pageable pageable) {

    Page<Application> applications;

    validateStatus(status);
    validateCriticality(criticality);
    validateSort(pageable.getSort());

    // … mismas cuatro ramas que en la primera versión
}

private void validateSort(Sort sort) {
    for (Sort.Order order : sort) {
        if (!VALID_SORT_FIELDS.contains(order.getProperty())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid application sort field: " + order.getProperty()
            );
        }
    }
}
```

`validateStatus` y `validateCriticality` siguen el mismo patrón, con los mensajes `Invalid application status: X` e `Invalid application criticality: X`. Como lanzan `ResponseStatusException`, el manejador existente ya los convierte en respuestas 400 sin tocarlo.

::: reconstruido
Este fragmento procede del código final del módulo de aplicaciones, donde se conserva sin cambios (capítulo 19), porque la versión del monolito en la que se introdujo la validación no se conserva. Lo seguro es que la copia publicada en GitHub no la tiene y que el servicio de demandas del monolito sí validaba sus filtros con este mismo patrón (capítulo 13). Por eso se marca como añadido después, sin fecha exacta.
:::

::: decision Lista blanca de campos de ordenación
**Motivo:** el cliente solo puede ordenar por campos que la API ofrece de forma deliberada. Un campo desconocido es un error del cliente (400), no del servidor (500), y el mensaje dice cuál es. Además, la lista evita que la API dependa de los nombres internos de la entidad. **Coste:** la lista debe mantenerse cuando cambian los campos ordenables, y el frontend debe conocerla.
:::

## Tipos incorrectos y cuerpos mal formados [paso 2.10]

Dos errores de cliente no los cubrían los manejadores iniciales: un parámetro que no se puede convertir al tipo esperado (`/api/applications/abc`, cuando `id` es `Long`) y un cuerpo JSON que no se puede leer (una coma de más, un texto donde se esperaba un objeto). Se añadieron dos manejadores:

```java title="exception/GlobalExceptionHandler.java (añadidos)" estado="despues"
@ExceptionHandler(MethodArgumentTypeMismatchException.class)
public ResponseEntity<ApiErrorResponse> handleTypeMismatch(
        MethodArgumentTypeMismatchException ex) {

    ApiErrorResponse body = new ApiErrorResponse(
            400,
            "VALIDATION_ERROR",
            "Invalid value for parameter: " + ex.getName(),
            Map.of()
    );

    return ResponseEntity.badRequest().body(body);
}

@ExceptionHandler(HttpMessageNotReadableException.class)
public ResponseEntity<ApiErrorResponse> handleUnreadableMessage(
        HttpMessageNotReadableException ex) {

    ApiErrorResponse body = new ApiErrorResponse(
            400,
            "VALIDATION_ERROR",
            "Malformed request body",
            Map.of()
    );

    return ResponseEntity.badRequest().body(body);
}
```

Sin ellos, Spring ya respondía con un 400, pero con el formato de error por defecto de Spring Boot, distinto del del proyecto. El frontend habría tenido que entender dos formatos. Ahora ambos casos llegan como `VALIDATION_ERROR`.

Observa que el mensaje del cuerpo mal formado es genérico: no incluye `ex.getMessage()`, que contendría detalles internos del analizador JSON y nombres de clases Java. No conviene exponer esa información a un cliente.

## Lo que todavía no está cubierto

El manejador cubre los casos habituales, pero no todos. Estas excepciones siguen llegando al cliente con el formato por defecto de Spring Boot (`timestamp`, `status`, `error`, `path`) o, peor, como un 500:

| Situación | Excepción | Respuesta actual |
|---|---|---|
| Falta un parámetro obligatorio | `MissingServletRequestParameterException` | 400 con formato de Spring Boot |
| Verbo no permitido (`DELETE`) | `HttpRequestMethodNotSupportedException` | 405 con formato de Spring Boot |
| Violación de una restricción de la base de datos | `DataIntegrityViolationException` | 500 |
| Cualquier error inesperado | `Exception` | 500 con formato de Spring Boot |

::: pendiente Cerrar el tratamiento de errores
Añadir un manejador de último recurso para `Exception` que registre el error completo en el *log* y devuelva un 500 con el formato del proyecto y un mensaje genérico. Valorar también el estándar **Problem Details** (RFC 9457), que Spring soporta con la clase `ProblemDetail` y la propiedad `spring.mvc.problemdetails.enabled`. Adoptarlo cambiaría el contrato con el frontend, así que debería hacerse de forma coordinada.

**Resuelto en la fase 7** (capítulo 25): manejador de último recurso y manejador de parámetros ausentes. Problem Details sigue siendo una opción futura.
:::

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| Un error llega con `timestamp` y `path` en lugar de `fieldErrors` | Ningún manejador del proyecto cubre esa excepción | Añadir el manejador o revisar el tipo exacto |
| `message` es `null` en un 404 | La `ResponseStatusException` se creó sin motivo | Pasar siempre el texto como segundo argumento |
| El manejador no se ejecuta | La clase no está en un paquete escaneado | Comprobar que cuelga del paquete raíz |
| Se exponen trazas o nombres de clases | Se copió `ex.getMessage()` al cuerpo | Usar mensajes propios y registrar el detalle en el *log* |

## Ejercicios

::: ejercicio Recorrer todos los formatos
Provoca, con peticiones manuales, cada uno de estos casos y anota la respuesta: un alta con nombre vacío, un detalle con `id` inexistente, un detalle con `id` no numérico, un alta con JSON mal formado y un listado con `sort=pepito`. Clasifica cada respuesta por su campo `error`.
:::

::: ejercicio Diseñar el manejador de último recurso
Escribe un método `@ExceptionHandler(Exception.class)` para `GlobalExceptionHandler` que devuelva un 500 con el formato del proyecto, el mensaje `Unexpected error` y que registre la excepción completa con un *logger*. Explica por qué no interfiere con los manejadores más específicos.
:::

::: preguntas
1. ¿Qué significan las categorías `VALIDATION_ERROR` y `RESOURCE_ERROR`?
2. ¿Por qué el manejador de validación usa `putIfAbsent` y un `LinkedHashMap`?
3. Si dos métodos `@ExceptionHandler` pueden tratar una excepción, ¿cuál elige Spring?
4. ¿Qué devolvía la primera versión ante `sort=pepito`, y qué devuelve después del paso 2.9?
5. ¿Por qué el manejador de cuerpos mal formados no incluye el mensaje de la excepción?
:::
