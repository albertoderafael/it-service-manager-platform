# El servicio y las transacciones

<p class="lead">El servicio es la capa donde viven los casos de uso: consultar, ver un detalle, dar de alta y modificar. También es donde empiezan y terminan las transacciones. Este capítulo recorre <code>ApplicationService</code> tal como se escribió en la primera versión y explica qué hace Spring cuando ve <code>@Transactional</code>.</p>

## El papel del servicio

En la arquitectura del proyecto cada capa tiene una responsabilidad clara:

| Capa | Responsabilidad | No debe… |
|---|---|---|
| Controlador | Traducir HTTP a llamadas Java y viceversa | Contener reglas de negocio ni acceder a repositorios |
| **Servicio** | Casos de uso, reglas, transacciones y conversión entidad → DTO | Conocer detalles de HTTP más allá de lo imprescindible |
| Repositorio | Acceso a datos | Contener reglas de negocio |
| Entidad | Estado y reglas propias del objeto | Saber cómo se persiste o cómo se expone |

El servicio recibe DTO de entrada, trabaja con entidades y devuelve DTO de salida. **Las entidades nunca salen del servicio**: el controlador no ve un solo objeto `Application`.

## Consulta, detalle y alta [paso 2.3]

### La consulta del listado

```java title="application/service/ApplicationService.java (versión de GitHub)" estado="impl"
@Transactional(readOnly = true)
public ApplicationPageResponse getApplications(
        String status,
        String criticality,
        Pageable pageable) {

    Page<Application> applications;

    if (status != null && criticality != null) {
        applications = applicationRepository
                .findByStatusAndCriticality(status, criticality, pageable);
    } else if (status != null) {
        applications = applicationRepository
                .findByStatus(status, pageable);
    } else if (criticality != null) {
        applications = applicationRepository
                .findByCriticality(criticality, pageable);
    } else {
        applications = applicationRepository.findAll(pageable);
    }

    Page<ApplicationResponse> responsePage =
            applications.map(this::toResponse);

    return new ApplicationPageResponse(
            responsePage.getContent(),
            responsePage.getNumber(),
            responsePage.getSize(),
            responsePage.getTotalElements(),
            responsePage.getTotalPages()
    );
}
```

Con dos filtros opcionales hay cuatro combinaciones, y cada una tiene su método de repositorio. Es explícito y fácil de seguir. También deja ver el límite del enfoque: con tres filtros serían ocho ramas. El módulo de demandas, con tres filtros, tomó otro camino (capítulo 13).

`Page.map` transforma cada entidad en su DTO conservando los metadatos de paginación. El resultado se copia a `ApplicationPageResponse`, un DTO propio cuyo motivo explica el capítulo 9.

En esta primera versión los filtros no se validan: un estado inventado, como `status=PEPITO`, simplemente devuelve una página vacía. Más adelante se añadió la validación (capítulo 10).

### El detalle con 404

```java title="application/service/ApplicationService.java" estado="impl"
@Transactional(readOnly = true)
public ApplicationResponse getApplicationById(Long id) {

    var application = applicationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Application not found: " + id
            ));

    return toResponse(application);
}
```

`findById` devuelve un `Optional<Application>`. Si está vacío, `orElseThrow` lanza una `ResponseStatusException` con estado 404 y un mensaje que incluye el identificador. Esa excepción la captura el manejador global (capítulo 10) y la convierte en una respuesta JSON.

### El alta

```java title="application/service/ApplicationService.java" estado="impl"
@Transactional
public ApplicationResponse createApplication(
        ApplicationCreateRequest request) {

    Application application = new Application(
            request.name(),
            request.description(),
            request.criticality(),
            "ACTIVE"
    );

    Application saved = applicationRepository.save(application);

    return toResponse(saved);
}
```

Dos decisiones se ven en este método. La primera: **el estado inicial lo decide el servidor**. El DTO de alta no tiene campo `status`; toda aplicación nueva nace `ACTIVE`. La segunda: se usa el valor devuelto por `save`, que es la entidad gestionada y ya tiene `id`, porque el `INSERT` se ejecutó inmediatamente (capítulo 5).

## Modificar sin llamar a `save` [paso 2.4]

```java title="application/service/ApplicationService.java" estado="impl"
@Transactional
public ApplicationResponse updateApplication(
        Long id,
        ApplicationUpdateRequest request) {

    Application application = applicationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Application not found: " + id
            ));

    application.update(
            request.name(),
            request.description(),
            request.criticality(),
            request.status()
    );

    return toResponse(application);
}
```

No hay ninguna llamada a `save`. La secuencia es esta:

1. Spring abre una transacción y, con ella, un contexto de persistencia.
2. `findById` carga la entidad, que queda **gestionada**, y Hibernate guarda su instantánea.
3. `update` cambia sus atributos en memoria.
4. `toResponse` construye el DTO con los valores nuevos.
5. Al salir del método, Spring confirma la transacción. Antes del `COMMIT`, Hibernate hace *flush*, compara con la instantánea y emite el `UPDATE`.

Si en el paso 3 o 4 se lanzara una excepción no comprobada, la transacción se desharía y no habría `UPDATE`.

::: decision Confiar en el *dirty checking* en lugar de llamar a `save`
**Motivo:** el código refleja cómo funciona JPA de verdad: una entidad gestionada se sincroniza sola. Llamar a `save` no aporta nada y sugiere que sin él no se guardaría. **Prueba:** el test `shouldUpdateExistingApplicationWithoutCallingSave` (capítulo 11) verifica explícitamente que `save` no se llama. **Requisito:** el método debe ser transaccional; sin `@Transactional`, la entidad quedaría separada al volver de `findById` y el cambio se perdería.
:::

## `@Transactional` por dentro

`@Transactional` no es magia del compilador: es un **proxy**. Al arrancar, Spring detecta que `ApplicationService` tiene métodos transaccionales y, en lugar de inyectar la clase tal cual en el controlador, inyecta un objeto intermediario que la envuelve.

<figure>
<svg viewBox="0 0 680 190" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="m7" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <g text-anchor="middle">
    <rect x="10" y="60" width="130" height="50" rx="8" fill="#f8fafc" stroke="#94a3b8"/><text x="75" y="82" font-weight="700">Controlador</text><text x="75" y="97" font-size="9" fill="#475569">llama a updateApplication</text>
    <rect x="190" y="20" width="300" height="150" rx="10" fill="#ecfeff" stroke="#0891b2" stroke-dasharray="5 3"/>
    <text x="340" y="38" font-weight="700" fill="#0e7490">Proxy transaccional (generado por Spring)</text>
    <rect x="210" y="50" width="120" height="36" rx="6" fill="#fff" stroke="#67e8f9"/><text x="270" y="72">1. begin</text>
    <rect x="350" y="50" width="120" height="36" rx="6" fill="#0b1220"/><text x="410" y="66" fill="#fff" font-weight="700">ApplicationService</text><text x="410" y="79" fill="#a5f3fc" font-size="9">2. tu método</text>
    <rect x="210" y="120" width="120" height="36" rx="6" fill="#fff" stroke="#67e8f9"/><text x="270" y="136">3a. flush + commit</text><text x="270" y="149" font-size="9" fill="#475569">si termina bien</text>
    <rect x="350" y="120" width="120" height="36" rx="6" fill="#fff" stroke="#fda4af"/><text x="410" y="136">3b. rollback</text><text x="410" y="149" font-size="9" fill="#475569">si RuntimeException</text>
    <rect x="540" y="60" width="130" height="50" rx="8" fill="#f8fafc" stroke="#94a3b8"/><text x="605" y="82" font-weight="700">PostgreSQL</text><text x="605" y="97" font-size="9" fill="#475569">conexión del pool</text>
  </g>
  <g stroke="#0891b2" stroke-width="1.3" fill="none">
    <line x1="140" y1="85" x2="188" y2="85" marker-end="url(#m7)"/>
    <line x1="330" y1="68" x2="348" y2="68" marker-end="url(#m7)"/>
    <line x1="410" y1="86" x2="300" y2="118" marker-end="url(#m7)"/>
    <line x1="410" y1="86" x2="410" y2="118" marker-end="url(#m7)"/>
    <line x1="490" y1="85" x2="538" y2="85" marker-end="url(#m7)"/>
  </g>
</svg>
<figcaption><b>Figura 7.1.</b> El controlador habla con un proxy. El proxy abre la transacción, delega en el método real y, según cómo termine, confirma o deshace.</figcaption>
</figure>

De este mecanismo se derivan las reglas que hay que conocer:

**Propagación.** Por defecto es `REQUIRED`: si ya hay una transacción en curso, el método se une a ella; si no, abre una. Por eso los métodos del repositorio, que también son transaccionales, participan en la transacción del servicio en lugar de abrir otra.

**Reglas de *rollback*.** Por defecto, la transacción se deshace ante una excepción **no comprobada** (`RuntimeException` y sus subclases) o un `Error`, y **se confirma** ante una excepción comprobada. `ResponseStatusException` es no comprobada, así que un 404 lanzado a mitad de un método deshace todo lo hecho hasta ese momento.

**Autoinvocación.** Si un método de `ApplicationService` llama a otro método de la misma clase, la llamada no pasa por el proxy y su `@Transactional` se ignora. Las anotaciones transaccionales solo tienen efecto en llamadas que llegan desde fuera del *bean*.

**Visibilidad.** Las anotaciones se colocan en métodos públicos. El proyecto anota los métodos y no la clase, de forma que cada método declara si lee o escribe.

::: java
Es el equivalente a las transacciones gestionadas por el contenedor de un EJB `@Stateless`, con `REQUIRED` como valor por defecto en ambos casos. Hay una diferencia importante: en EJB, una excepción de aplicación comprobada tampoco provocaba *rollback* salvo que se marcara con `@ApplicationException(rollback = true)`; en Spring, el equivalente es `@Transactional(rollbackFor = ...)`. La trampa de la autoinvocación también existía en EJB cuando se llamaba a un método con `this.` en lugar de a través del contexto del contenedor.
:::

## Excepciones HTTP en el servicio

El servicio lanza `ResponseStatusException`, una clase de Spring Web que lleva dentro un código HTTP. Es una concesión consciente: el servicio queda ligeramente acoplado a HTTP.

::: decision `ResponseStatusException` en el servicio
**Motivo:** simplicidad. Una sola clase cubre 404, 400 y 409, el manejador global la traduce de forma uniforme, y no hace falta una jerarquía de excepciones propia para un proyecto de este tamaño. **Alternativa:** excepciones de dominio (`ApplicationNotFoundException`, `InvalidStatusTransitionException`) que el manejador global traduce a códigos HTTP. Es más limpio, porque el servicio no sabe nada de HTTP, y se recoge como mejora en el capítulo 24.
:::

## Convertir a DTO dentro de la transacción

```java title="application/service/ApplicationService.java" estado="impl"
private ApplicationResponse toResponse(Application application) {

    return new ApplicationResponse(
            application.getId(),
            application.getName(),
            application.getDescription(),
            application.getCriticality(),
            application.getStatus()
    );
}
```

La conversión ocurre **antes de que termine la transacción**, mientras la entidad está gestionada. Con `open-in-view=false` esto es imprescindible en cuanto la entidad tenga asociaciones perezosas: fuera de la transacción no se podrían cargar. En `Application` no hay asociaciones, pero la costumbre se estableció desde el principio, y en el módulo de demandas resultó decisiva.

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| Una modificación no se guarda | Falta `@Transactional` en el método del servicio | Añadirlo |
| Se guarda a medias tras un error | La excepción era comprobada y no provocó *rollback* | Usar excepciones no comprobadas o `rollbackFor` |
| Un método interno no abre transacción | Se llama desde la misma clase (autoinvocación) | Mover la lógica a otro *bean* o anotar el método llamado desde fuera |
| `TransactionRequiredException` | Una operación de escritura se ejecutó sin transacción | Revisar que el método de entrada sea `@Transactional` |
| Se escribe en un método `readOnly` y no se guarda | `readOnly` desactiva el *flush* automático | Quitar `readOnly` en métodos que modifican |

## Ejercicios

::: ejercicio Ver el *rollback* en acción
En una rama de trabajo, añade al final de `updateApplication`, después de `application.update(...)`, una línea que lance `new IllegalStateException("prueba")`. Envía una modificación y comprueba en la base de datos que el cambio no se guardó. Repite con una excepción comprobada declarada en el método (por ejemplo, `java.io.IOException`) y compara.
:::

::: ejercicio Detectar la autoinvocación
Explica qué ocurriría si `getApplications`, anotado con `readOnly = true`, llamara internamente a un método público de la misma clase anotado con `@Transactional` (sin `readOnly`) que modifica una entidad. ¿Qué transacción estaría activa y qué pasaría con el cambio?
:::

::: preguntas
1. ¿Por qué el servicio no llama a `save` al modificar una aplicación, y qué condición es imprescindible para que funcione?
2. ¿Qué propagación tiene `@Transactional` por defecto y qué significa?
3. ¿Ante qué tipo de excepciones hace Spring *rollback* por defecto?
4. ¿Qué es la autoinvocación y por qué hace que se ignore `@Transactional`?
5. ¿Por qué la conversión a DTO se hace dentro del método transaccional?
:::
