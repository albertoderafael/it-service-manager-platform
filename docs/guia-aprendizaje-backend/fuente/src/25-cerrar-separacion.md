# Cerrar la separación

<p class="lead">La fase 5 dejó dos servicios que funcionaban, y la fase 6 una lista de defectos y pendientes. La fase 7 empezó corrigiendo los que afectaban a la robustez antes de meter nada en contenedores. Este capítulo cuenta esos cambios: la red de seguridad con Git, la llamada remota fuera de la transacción, la traducción completa de errores, la degradación del listado y la configuración por variables de entorno.</p>

## Por qué una fase más

La revisión del capítulo 23 encontró defectos que no se veían mientras todo funcionaba en local, pero que habrían aparecido en cuanto los servicios corrieran en contenedores, con la red de por medio. Meterlos en Docker tal cual habría trasladado los problemas a un entorno donde son más difíciles de diagnosticar.

El plan siguió el principio de la fase 5: pasos pequeños, cada uno comprobado, y lo más arriesgado al final.

| Bloque | Pasos | Qué resuelve |
|---|---|---|
| Robustez (este capítulo) | 7.1 a 7.5 | Defectos 1, 2, 3, 4, 9 y 12 del capítulo 23 |
| Imágenes (capítulo 26) | 7.6 a 7.8 | Comprobaciones de salud e imagen de cada servicio |
| Plataforma (capítulo 27) | 7.9 a 7.13 | Sistema completo con Docker Compose |

Hubo también un cambio de método. Hasta la fase 6 la regla era no modificar los proyectos del backend; en esta fase se editaron directamente, pero con una condición: no se podía compilar desde el entorno de edición, así que **cada cambio se verificaba ejecutando las suites en Windows** antes de hacer su commit. Es la lección del capítulo 23 aplicada: ningún paso se da por terminado sin ver pasar las pruebas.

## Una red de seguridad: Git antes de tocar nada [paso 7.1]

Los proyectos locales no tenían historial. Antes del primer cambio, cada servicio se convirtió en un repositorio con un commit inicial que recoge el estado validado:

```powershell title="Estado inicial de cada servicio" estado="impl"
git init
git add .
git status          # revisar ANTES del commit
git commit -m "Estado inicial: microservicio de demandas validado"
```

El `git status` previo no es un trámite: en el primer intento aparecieron decenas de ficheros de `.metadata/`, la carpeta en la que Eclipse guarda su espacio de trabajo (índices, *logs*, historial del IDE). No son código, cambian cada vez que se abre el IDE y no deben versionarse. Se añadieron al `.gitignore` junto con los ficheros que nunca deben llegar a un repositorio:

```text title="it-service-manager/.gitignore (añadido)" estado="impl"
### Secretos y volcados locales (no versionar) ###
.env
/applications_backup.sql
/it_service_manager_backup.dump
*.dump

### Espacio de trabajo de Eclipse ###
.metadata/
```

`git rm -r --cached .metadata` sacó la carpeta del índice sin borrarla del disco.

::: atencion La identidad de los commits es pública
Git graba en cada commit el nombre y el correo del autor, y GitHub los muestra. Para no publicar el correo personal se usa la dirección anónima que proporciona GitHub (de la forma `12345678+usuario@users.noreply.github.com`), configurada una sola vez con `git config --global user.email`. Conviene activar también en GitHub la opción que rechaza los *push* que expongan el correo real.
:::

::: java
En Java EE el control de versiones solía ser CVS, Subversion o ClearCase, con un servidor central. Git es distribuido: el repositorio completo vive en tu máquina, los commits son locales e instantáneos y publicarlos (`push`) es un paso aparte. Por eso es barato hacer un commit por cada paso pequeño.
:::

## La llamada remota, fuera de la transacción [paso 7.2]

El defecto más serio del capítulo 23 era este: `DemandService` era `@Transactional` y llamaba al catálogo por HTTP dentro de la transacción, de modo que cada conexión a la base de datos quedaba retenida mientras se esperaba a otro servicio (capítulo 20).

La corrección consiste en que **ninguna llamada al catálogo ocurra con una transacción abierta**:

```java title="demand/service/DemandService.java (extracto)" estado="final"
@Service
public class DemandService {

    private final DemandRepository demandRepository;
    private final ApplicationCatalog applicationCatalog;
    private final TransactionOperations transactions;

    public DemandResponse createDemand(DemandCreateRequest request) {

        // 1. Llamada remota, sin transacción abierta.
        ApplicationSummary application = requireApplication(request.applicationId());

        Demand demand = new Demand(
                request.title(),
                request.description(),
                request.priority(),
                "OPEN",
                application.id()
        );

        // 2. Escritura: save() abre y cierra su propia transacción.
        Demand saved = demandRepository.save(demand);

        return toResponse(saved, application.name());
    }

    public DemandResponse updateDemand(
            Long id,
            DemandUpdateRequest request) {

        // 1. La demanda debe existir (lectura corta del repositorio).
        findDemand(id);

        // 2. Llamada remota, sin transacción abierta.
        ApplicationSummary application = requireApplication(request.applicationId());

        // 3. Transacción corta: recargar, modificar (dirty checking) y confirmar.
        return transactions.execute(transaction -> {

            Demand demand = findDemand(id);

            demand.update(
                    request.title(),
                    request.description(),
                    request.priority(),
                    application.id()
            );

            try {
                demand.changeStatus(request.status());
            } catch (IllegalStateException ex) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        ex.getMessage()
                );
            }

            return toResponse(demand, application.name());
        });
    }
}
```

Cada método resuelve el problema de una forma:

| Método | Antes | Ahora |
|---|---|---|
| `createDemand` | Transacción alrededor de catálogo + `save` | Catálogo sin transacción; `save` usa la transacción propia de `SimpleJpaRepository` |
| `getDemandById` | Transacción de solo lectura alrededor de todo | `findById` con su transacción; el catálogo después |
| `getDemands` | Ídem | `findAll` (datos y recuento en una transacción de solo lectura); la consulta por lotes al catálogo después |
| `updateDemand` | Transacción alrededor de todo | Comprobación corta, catálogo, y transacción corta solo para la escritura |

Las lecturas no pierden nada al salir de la transacción del servicio: la entidad `Demand` solo tiene atributos simples (desde el paso 5.3 no hay asociaciones perezosas), así que construir el DTO fuera de la transacción es seguro.

### `TransactionOperations`: una transacción delimitada en el código

`updateDemand` necesita el *dirty checking* (capítulo 5), y el *dirty checking* necesita una transacción. Pero no puede ser `@Transactional` en todo el método, porque incluiría la llamada remota. La solución es **delimitar la transacción en el código**:

```java
return transactions.execute(transaction -> {
    // aquí dentro hay transacción: lo que se modifique se escribe al salir
});
```

`TransactionOperations` es la interfaz de `TransactionTemplate`, la forma programática de usar transacciones en Spring. Spring Boot crea automáticamente un `TransactionTemplate` cuando hay un único gestor de transacciones, así que basta con pedirlo en el constructor. El comportamiento es el mismo que el de `@Transactional`: si el bloque lanza una excepción no comprobada (el 409 de la transición inválida), la transacción se deshace; si termina bien, se confirma.

::: java
Es el equivalente a las transacciones gestionadas por el bean (BMT) de EJB con `UserTransaction.begin()` y `commit()`, pero sin tener que escribir el `try`/`finally`: la plantilla abre, confirma o deshace por ti. Como en EJB, lo habitual es la versión declarativa; la programática se reserva para cuando hay que delimitar solo una parte del método, como aquí.
:::

### Por qué se lee la demanda dos veces

`updateDemand` busca la demanda antes de llamar al catálogo y otra vez dentro de la transacción. No es un descuido:

- **La primera lectura conserva el orden de los errores** que fijaban las pruebas: si la demanda no existe, el cliente recibe «Demand not found» sin que se llegue a llamar al catálogo.
- **La segunda carga la entidad dentro de la transacción**, para que quede gestionada y el *dirty checking* funcione. Además, si alguien borrara la demanda entre las dos lecturas, la segunda lo detectaría.

Es una consulta por clave primaria más a cambio de no retener una conexión durante una llamada HTTP: un intercambio claramente favorable.

### Las pruebas, sin Spring

Las pruebas unitarias construyen el servicio con una implementación de `TransactionOperations` que ejecuta el bloque sin transacción:

```java title="demand/service/DemandCatalogTest.java (extracto)" estado="final"
@BeforeEach
void setUp() {
    // Sin Spring: las transacciones se ejecutan como simples llamadas.
    service = new DemandService(repository, catalog, TransactionOperations.withoutTransaction());
}
```

Antes estas clases usaban `@InjectMocks`. Al añadir un tercer argumento al constructor, Mockito habría inyectado `null` en silencio (el riesgo que señalaba el capítulo 15). Construir el servicio con `new` hace que un cambio de constructor no compile, que es exactamente lo que se quiere.

## Una traducción de errores completa [paso 7.3]

El adaptador HTTP dejaba sin traducir los 4xx distintos del 404 (capítulo 20). La versión final separa la respuesta de negocio («no existe») de todo lo demás:

```java title="demand/adapter/RestApplicationCatalog.java (extracto)" estado="final"
@Override
public Optional<ApplicationSummary> findById(Long id) {

    return executeRequest(() -> {
        try {
            ApplicationSummaryResponse response = restClient.get()
                    .uri("/api/applications/{id}", id)
                    .retrieve()
                    .body(ApplicationSummaryResponse.class);

            return Optional.ofNullable(response)
                    .map(ApplicationSummaryResponse::toSummary);

        } catch (HttpClientErrorException.NotFound ex) {
            // Respuesta de negocio: el catálogo confirma que no existe.
            return Optional.empty();
        }
    });
}

private <T> T executeRequest(Supplier<T> request) {

    try {
        return request.get();

    } catch (RestClientResponseException ex) {

        if (ex.getStatusCode().is5xxServerError()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, UNAVAILABLE, ex);
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY, BAD_GATEWAY, ex);

    } catch (ResourceAccessException ex) {

        throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE, UNAVAILABLE, ex);

    } catch (RestClientException ex) {

        // Por ejemplo, un cuerpo que no se puede convertir a JSON.
        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY, BAD_GATEWAY, ex);
    }
}
```

El 404 se captura **dentro** de la petición, con la subclase específica `HttpClientErrorException.NotFound`, así que nunca llega a `executeRequest`. Todo lo que sale de la petición es, por tanto, un fallo:

| Situación | Antes | Ahora |
|---|---|---|
| 404 en `findById` | `Optional.empty()` | Igual |
| 5xx, conexión rechazada, tiempo agotado | 503 | Igual |
| Otro 4xx (400, 401…) | Se relanzaba: 500 con otro formato | **502** |
| Respuesta que no se puede leer | 500 | **502** |

El orden de los bloques `catch` importa: `RestClientResponseException` y `ResourceAccessException` son subclases de `RestClientException`, así que la general va al final. Java no compilaría al revés.

De paso se limpió el fichero: el `import` duplicado de `Duration`, el `import` sin usar y la sangría mezclada que recogía el defecto 12.

Dos pruebas nuevas en `RestApplicationCatalogTest` cubren los casos añadidos: un servidor que responde 400 y otro que responde 200 con un cuerpo que no es JSON. Ambos deben producir un 502.

### El manejador de último recurso

El tratamiento de errores del proyecto tenía huecos (capítulo 10). Se añadieron dos manejadores en los dos servicios:

```java title="exception/GlobalExceptionHandler.java (añadido)" estado="final"
@ExceptionHandler(MissingServletRequestParameterException.class)
public ResponseEntity<ApiErrorResponse> handleMissingParameter(
        MissingServletRequestParameterException ex) {

    ApiErrorResponse body = new ApiErrorResponse(
            400,
            "VALIDATION_ERROR",
            "Missing required parameter: " + ex.getParameterName(),
            Map.of()
    );

    return ResponseEntity.badRequest().body(body);
}

@ExceptionHandler(Exception.class)
public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {

    if (ex instanceof ErrorResponse errorResponse) {
        HttpStatusCode status = errorResponse.getStatusCode();
        String detail = errorResponse.getBody().getDetail();

        ApiErrorResponse body = new ApiErrorResponse(
                status.value(),
                "RESOURCE_ERROR",
                detail != null ? detail : "Request could not be processed",
                Map.of()
        );

        return ResponseEntity.status(status).body(body);
    }

    log.error("Unexpected error", ex);

    ApiErrorResponse body = new ApiErrorResponse(
            500,
            "INTERNAL_ERROR",
            "Unexpected error",
            Map.of()
    );

    return ResponseEntity.internalServerError().body(body);
}
```

El detalle importante es la interfaz **`ErrorResponse`**. Las excepciones que Spring MVC lanza por sí mismo (ruta inexistente, verbo no permitido, tipo de contenido no soportado…) la implementan y llevan su propio código HTTP. Un manejador de `Exception` ingenuo las convertiría todas en 500: una URL mal escrita parecería un fallo del servidor. Comprobando `ErrorResponse`, esas excepciones conservan su código y solo lo realmente inesperado se convierte en 500, se registra completo en el *log* y llega al cliente con un mensaje genérico.

::: proyecto
El primer efecto visible de este manejador llegó por casualidad. Al probar `/actuator/health` (capítulo 26) en un servicio arrancado antes de añadir Actuator, la respuesta fue `{"status":404,"error":"RESOURCE_ERROR","message":"No static resource actuator/health."}`: un 404 correcto, **con el formato del proyecto**. Antes, esa misma petición habría devuelto el formato por defecto de Spring Boot.
:::

## Degradar en lugar de fallar [paso 7.4]

El capítulo 18 decidió que, si el catálogo no devolvía alguna aplicación de la página, el listado entero fallaba con un 404. Tras separar las bases de datos esa situación puede darse, y fallar toda la página por una referencia rota es desproporcionado. La versión final devuelve la fila con el nombre a `null`:

```java title="demand/service/DemandService.java · getDemands (extracto)" estado="final"
// Una aplicación ausente del catálogo no tumba la página: la fila se
// devuelve con applicationName = null y el frontend la marca como no disponible.
Page<DemandResponse> responsePage = demands.map(demand -> {
    ApplicationSummary application = applications.get(demand.getApplicationId());
    return toResponse(demand, application == null ? null : application.name());
});
```

El detalle hace lo mismo con un método propio:

```java title="demand/service/DemandService.java (extracto)" estado="final"
/** Nombre actual de la aplicación, o null si ya no existe en el catálogo. */
private String currentApplicationName(Long applicationId) {
    return applicationCatalog.findById(applicationId)
            .map(ApplicationSummary::name)
            .orElse(null);
}
```

La regla queda así: **leer** una demanda nunca falla porque falte su aplicación; **crear o modificar** una demanda sí exige que la aplicación exista (404). Es la distinción entre mostrar datos que ya existen y aceptar datos nuevos.

| Situación | Respuesta |
|---|---|
| Listado con una aplicación ausente | 200; esa fila con `applicationName: null` |
| Detalle con la aplicación ausente | 200 con `applicationName: null` |
| Alta o modificación con una aplicación inexistente | 404 `Application not found` |
| Catálogo caído | 503 en todos los casos |

El cambio de contrato se coordinó con el frontend: el tipo `applicationName` pasó a ser `string | null`, y las cuatro pantallas que lo muestran usan el texto «Aplicación no disponible». Tres pruebas nuevas de `DemandCatalogTest` fijan el comportamiento: la fila sin aplicación en el listado, el detalle sin aplicación y que una demanda inexistente se rechaza sin llamar al catálogo.

### Mensajes de error para personas

El frontend mostraba tal cual el texto del servidor, de modo que con el catálogo caído el usuario leía «Application Catalog is unavailable». Los textos de los errores 5xx son técnicos, y además están en inglés. El cliente HTTP del frontend pasó a traducirlos **por código HTTP, no por texto**:

```ts title="it-service-manager-web · src/lib/api-client.ts (extracto)" estado="final"
function serverErrorMessage(status: number): string {
  switch (status) {
    case 502:
      return 'El catálogo de aplicaciones ha respondido de forma inesperada. Inténtalo de nuevo más tarde.'
    case 503:
      return 'El catálogo de aplicaciones no está disponible en este momento. Inténtalo de nuevo en unos segundos.'
    default:
      return 'Se ha producido un error inesperado en el servidor. Inténtalo de nuevo más tarde.'
  }
}
```

Hoy los únicos 502 y 503 con el formato del backend los produce el servicio de demandas cuando no puede consultar el catálogo, y por eso el mensaje puede nombrarlo. El aviso de «datos sin actualizar» de los listados incluye ahora la causa.

## La configuración, en variables de entorno [paso 7.5]

Una imagen de contenedor debe ser **la misma en cualquier entorno**; lo que cambia de un entorno a otro tiene que llegar de fuera. La configuración de los dos servicios pasó a leerse entera de variables de entorno, con valores por defecto pensados para desarrollo:

```properties title="it-service-manager/src/main/resources/application.properties" estado="final"
spring.application.name=it-service-manager

# PostgreSQL
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5433/it_service_manager}
spring.datasource.username=${DB_USERNAME:itmanager}
spring.datasource.password=${DB_PASSWORD}

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.open-in-view=false
spring.jpa.show-sql=${SHOW_SQL:false}

# Catálogo de aplicaciones (dentro de Docker: http://application-catalog-service:8081)
application-catalog.base-url=${APPLICATION_CATALOG_BASE_URL:http://localhost:8081}
```

La sintaxis `${VARIABLE:valor}` significa «el valor de la variable, o este si no existe». Cada decisión del fichero tiene su motivo:

- **El valor por defecto del puerto es el 5433**, el del contenedor. Esto resuelve el defecto 4: la configuración por defecto coincide con la forma habitual de trabajar, y el perfil `docker` deja de ser necesario. Se retiró `application-docker.properties`.
- **La contraseña no tiene valor por defecto.** Sin `DB_PASSWORD`, el servicio no arranca. Es preferible a arrancar con una contraseña vacía o, peor, con una escrita en el código.
- **`show-sql` pasa a ser `false` por defecto.** En un contenedor, el SQL en la consola solo añade ruido. Para verlo en desarrollo basta con definir `SHOW_SQL=true`.

En el catálogo, la contraseña admite dos nombres:

```properties title="application-catalog-service · application.properties (extracto)" estado="final"
spring.datasource.password=${DB_PASSWORD:${APPLICATION_DB_PASSWORD}}
```

Es un marcador anidado: primero `DB_PASSWORD` y, si no existe, el nombre antiguo, `APPLICATION_DB_PASSWORD`. Así los dos servicios usan el mismo nombre de variable (cada contenedor tiene su propio entorno, así que no chocan) sin romper la configuración de ejecución que ya existía en el IDE.

::: proyecto Una confirmación inesperada
Al retirar el perfil `docker` de la configuración de ejecución de Spring Tools apareció un segundo argumento: `--spring.profiles.active=local-rest`. Ese perfil ya no hacía nada (el código no contiene ningún `@Profile`), pero es el rastro de la transición del capítulo 20, en la que convivieron el adaptador JPA y el REST. La guía la había descrito como probable sin poder afirmarla; la configuración del IDE la confirmó.
:::

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| `NullPointerException` en `transactions.execute` en una prueba | El servicio se creó con `@InjectMocks` y falta `TransactionOperations` | Construirlo con `new` y `TransactionOperations.withoutTransaction()` |
| Un cambio en `updateDemand` no se guarda | La modificación se hizo fuera del bloque `execute` | Recargar y modificar la entidad dentro del bloque |
| Una URL inexistente responde 500 | El manejador de `Exception` no distingue `ErrorResponse` | Respetar el código de las excepciones de Spring MVC |
| `Could not resolve placeholder 'DB_PASSWORD'` | Falta la variable en el entorno | Definirla en el IDE, en `.env` o en el contenedor |
| El IDE sigue conectando al 5432 | Sigue activo un perfil o un argumento antiguo | Revisar los argumentos de la configuración de ejecución |
| El frontend muestra «null» como nombre de aplicación | El tipo no admitía `null` | Tipo `string | null` y texto alternativo |

## Ejercicios

::: ejercicio Comprobar que no hay transacción durante la llamada
Escribe una prueba de integración que simule el catálogo con `@MockitoBean` y, dentro de la respuesta simulada de `findById` (con `thenAnswer`), compruebe con `TransactionSynchronizationManager.isActualTransactionActive()` que no hay ninguna transacción activa. Ten en cuenta que la clase `DemandIntegrationTest` es `@Transactional`: ¿qué tendrías que cambiar para que la prueba tenga sentido?
:::

::: ejercicio La regla de la degradación
Explica por qué el listado y el detalle degradan (`applicationName: null`) mientras que el alta y la modificación responden 404. Pon un ejemplo de lo que pasaría si el alta también degradara.
:::

::: preguntas
1. ¿Por qué `createDemand` ya no necesita `@Transactional` y, aun así, el `INSERT` se hace dentro de una transacción?
2. ¿Qué aporta `TransactionOperations` frente a `@Transactional` en `updateDemand`?
3. ¿Por qué el 404 del catálogo se captura dentro de la petición y no en `executeRequest`?
4. ¿Qué problema evita comprobar `ErrorResponse` en el manejador de último recurso?
5. ¿Qué significa `${DB_PASSWORD:${APPLICATION_DB_PASSWORD}}` y por qué la contraseña no tiene un valor por defecto real?
:::
