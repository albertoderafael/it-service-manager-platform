# DTO y Bean Validation

<p class="lead">La API no expone entidades: recibe y devuelve objetos de transferencia de datos, los DTO. Este capítulo explica por qué, cómo se escriben con <i>records</i> de Java y cómo Bean Validation rechaza una petición incorrecta antes de que llegue al servicio.</p>

## Por qué DTO separados de la entidad [paso 2.5]

Sería posible que el controlador recibiera y devolviera directamente objetos `Application`. Muchos tutoriales lo hacen. El proyecto no, por cuatro motivos:

1. **El contrato de la API es independiente del modelo de datos.** Si mañana la tabla cambia, los clientes no tienen por qué enterarse.
2. **Cada operación acepta solo lo que debe.** El alta no tiene `id` ni `status`; si recibiera la entidad, un cliente podría enviar un `id` o un estado arbitrario.
3. **No se filtran detalles de persistencia.** Serializar una entidad con asociaciones perezosas puede disparar consultas, o fallar con `LazyInitializationException`.
4. **Las reglas de validación de entrada no contaminan la entidad.** Las anotaciones de validación viven en el DTO de cada operación.

El módulo de aplicaciones tiene cuatro DTO:

| DTO | Dirección | Uso |
|---|---|---|
| `ApplicationCreateRequest` | Entrada | `POST /api/applications` |
| `ApplicationUpdateRequest` | Entrada | `PUT /api/applications/{id}` |
| `ApplicationResponse` | Salida | Detalle y elementos del listado |
| `ApplicationPageResponse` | Salida | Listado paginado (capítulo 9) |

## *Records* de Java

Todos los DTO son *records*, disponibles desde Java 16:

```java title="application/dto/ApplicationResponse.java" estado="impl"
public record ApplicationResponse(
        Long id,
        String name,
        String description,
        String criticality,
        String status) {
}
```

Un *record* es una clase inmutable que el compilador completa: atributos `private final`, un constructor con todos ellos, métodos de acceso con el mismo nombre que el atributo (`name()`, no `getName()`), y `equals`, `hashCode` y `toString` basados en todos los valores. Jackson, la librería JSON de Spring, sabe leerlos y escribirlos sin configuración.

::: java
Un *record* sustituye a la clase JavaBean con *getters*, *setters*, constructor vacío, `equals` y `hashCode` generados por el IDE que se usaba como *transfer object* en Java EE. La diferencia esencial es la inmutabilidad: un DTO no debería cambiar después de construirse.
:::

::: atencion Las entidades no pueden ser *records*
JPA necesita crear entidades con un constructor sin argumentos y modificar sus atributos (para el *dirty checking*, entre otras cosas). Un *record* no permite ninguna de las dos cosas. Los *records* son perfectos para DTO y para resultados de consultas, pero no para entidades.
:::

## Las reglas de validación

```java title="application/dto/ApplicationCreateRequest.java" estado="impl"
public record ApplicationCreateRequest(

        @NotBlank
        @Size(max = 100)
        String name,

        @Size(max = 500)
        String description,

        @NotBlank
        @Pattern(regexp = "LOW|MEDIUM|HIGH|CRITICAL")
        String criticality

) {
}
```

```java title="application/dto/ApplicationUpdateRequest.java" estado="impl"
public record ApplicationUpdateRequest(

        @NotBlank
        @Size(max = 100)
        String name,

        @Size(max = 500)
        String description,

        @NotBlank
        @Pattern(regexp = "LOW|MEDIUM|HIGH|CRITICAL")
        String criticality,

        @NotBlank
        @Pattern(regexp = "ACTIVE|INACTIVE")
        String status

) {
}
```

Las anotaciones son de Jakarta Bean Validation, y la implementación que las ejecuta es Hibernate Validator, incluida en `spring-boot-starter-validation`. Las que usa el proyecto:

| Anotación | Rechaza | Acepta `null` |
|---|---|---|
| `@NotNull` | `null` | No |
| `@NotEmpty` | `null` y cadena vacía `""` | No |
| `@NotBlank` | `null`, `""` y cadenas solo con espacios `"  "` | No |
| `@Size(max = n)` | Cadenas de más de *n* caracteres | **Sí** |
| `@Pattern(regexp = …)` | Cadenas que no encajan **completas** con la expresión | **Sí** |

La última columna explica por qué `criticality` lleva dos anotaciones. `@Pattern`, como casi todas las restricciones de Bean Validation, **considera válido el `null`**: la filosofía es que cada anotación comprueba una sola cosa, y la obligatoriedad es asunto de `@NotNull` o `@NotBlank`. Sin `@NotBlank`, una petición sin criticidad pasaría la validación y fallaría después en el `INSERT`, por la restricción `NOT NULL` de la columna.

Por la misma razón, `description` solo lleva `@Size`: es opcional, puede ser `null` y, si viene, no puede pasar de 500 caracteres.

### Cuándo se ejecuta la validación

La validación no ocurre sola: la activa la anotación `@Valid` en el parámetro del controlador.

```java title="application/controller/ApplicationController.java (extracto)" estado="impl"
@PostMapping
public ResponseEntity<ApplicationResponse> createApplication(
        @Valid @RequestBody ApplicationCreateRequest request) {
```

El orden es este:

1. Spring MVC lee el cuerpo de la petición y Jackson lo convierte en un `ApplicationCreateRequest`. Si el JSON está mal formado, falla aquí, con otra excepción (capítulo 10).
2. Como el parámetro tiene `@Valid`, Spring pasa el objeto al validador, que evalúa **todas** las restricciones y reúne todos los errores, no solo el primero.
3. Si hay algún error, Spring lanza `MethodArgumentNotValidException` **sin llamar al método del controlador**. El servicio nunca se ejecuta.
4. El manejador global convierte la excepción en un 400 con la lista de campos inválidos.

::: proyecto
La prueba `shouldReturnBadRequestWhenCreatingInvalidApplication` (capítulo 11) envía un nombre con solo espacios y una criticidad `URGENT`, comprueba que la respuesta contiene un error para cada uno de esos dos campos y verifica con Mockito que `createApplication` del servicio **no se llamó nunca**.
:::

## Dos DTO de entrada, no uno

El alta y la modificación tienen DTO distintos aunque se parezcan mucho. La diferencia está en lo que cada operación permite: al crear, el estado no se elige; al modificar, sí. Con un único DTO compartido, el campo `status` sería opcional en uno y obligatorio en otro, y la validación tendría que distinguir el caso con grupos de validación o con comprobaciones manuales.

::: decision Un DTO por operación
**Motivo:** cada DTO describe exactamente el contrato de su operación y sus reglas se leen sin condiciones. **Alternativa descartada:** un DTO compartido con grupos de validación (`@NotBlank(groups = OnUpdate.class)`), que ahorra una clase a cambio de reglas más difíciles de leer. **Coste:** algo de duplicación entre los dos *records*.
:::

¿Qué ocurre si el cliente envía un `status` al dar de alta? Nada: Spring Boot configura Jackson para **ignorar las propiedades desconocidas**, así que el campo se descarta en silencio. Es cómodo para la compatibilidad entre versiones, aunque puede ocultar errores del cliente.

## Cadenas en lugar de enumerados

Estado y criticidad son `String` en la base de datos, en la entidad y en los DTO, con los valores válidos expresados como expresiones regulares. La alternativa natural en Java habría sido un `enum`:

```java title="Alternativa con enumerados (no está en el proyecto)" estado="pendiente"
public enum Criticality { LOW, MEDIUM, HIGH, CRITICAL }

// en la entidad
@Enumerated(EnumType.STRING)
@Column(nullable = false, length = 20)
private Criticality criticality;
```

::: decision Valores como texto validado
**Motivo:** máxima sencillez al empezar, y el JSON y la base de datos guardan exactamente el mismo texto. **Coste:** la lista de valores válidos se repite en varios sitios (la expresión regular del DTO y, más adelante, las constantes del servicio y el frontend), el compilador no ayuda y nada impide escribir `"ACTVE"` en el código. **Mejora propuesta:** `enum` con `@Enumerated(EnumType.STRING)`, que no cambia ni el JSON ni la columna. Se recoge en el capítulo 24. Si se adopta, nunca debe usarse `EnumType.ORDINAL`, que guarda la posición del valor y se rompe al reordenar el `enum`.
:::

## La misma regla en tres sitios

Una consecuencia de las decisiones anteriores es que la longitud y la obligatoriedad de cada campo aparecen en tres capas, y deben coincidir:

| Campo | Migración V1 | Entidad | DTO de entrada |
|---|---|---|---|
| `name` | `VARCHAR(100) NOT NULL` | `@Column(nullable = false, length = 100)` | `@NotBlank @Size(max = 100)` |
| `description` | `VARCHAR(500)` | `@Column(length = 500)` | `@Size(max = 500)` |
| `criticality` | `VARCHAR(20) NOT NULL` | `@Column(nullable = false, length = 20)` | `@NotBlank @Pattern(...)` |
| `status` | `VARCHAR(20) NOT NULL` | `@Column(nullable = false, length = 20)` | `@NotBlank @Pattern(...)` (solo al modificar) |

Cada capa protege algo distinto: el DTO da un error claro al cliente, la entidad documenta el modelo y la base de datos es la última barrera. El frontend añade una cuarta copia, con Zod, para dar respuesta inmediata en el formulario.

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| Una petición inválida llega al servicio | Falta `@Valid` en el parámetro | Añadirlo |
| Un campo obligatorio vacío pasa la validación | Solo tiene `@Pattern` o `@Size`, que aceptan `null` | Añadir `@NotBlank` o `@NotNull` |
| `value too long for type character varying(100)` desde PostgreSQL | El DTO permite más caracteres que la columna | Alinear `@Size` con la migración |
| `@Pattern` rechaza `"high"` | La expresión distingue mayúsculas y debe encajar completa | Enviar `HIGH`, o ajustar la expresión si se quiere aceptar |
| Un campo enviado por el cliente no llega | Nombre distinto entre el JSON y el componente del *record* | Revisar mayúsculas y nombres |

## Ejercicios

::: ejercicio Todos los errores a la vez
Envía un `POST /api/applications` con este cuerpo: `{"name": "", "description": null, "criticality": "urgent"}`. Analiza la respuesta: ¿cuántos errores de campo aparecen y por qué `description` no figura entre ellos?
:::

::: ejercicio Probar el validador sin Spring
Escribe una prueba unitaria que cree un validador con `Validation.buildDefaultValidatorFactory().getValidator()`, valide un `ApplicationCreateRequest` con un nombre de 101 caracteres y compruebe que hay exactamente una violación, sobre el campo `name`.
:::

::: preguntas
1. Da tres motivos para no exponer la entidad `Application` directamente en la API.
2. ¿Por qué un *record* no puede ser una entidad JPA?
3. ¿Por qué `criticality` necesita `@NotBlank` además de `@Pattern`?
4. ¿Qué excepción lanza Spring cuando falla la validación de un `@RequestBody` y qué ocurre con el método del controlador?
5. ¿Qué inconveniente tiene representar el estado como `String`, y cómo se mejoraría sin cambiar el JSON ni la base de datos?
:::
