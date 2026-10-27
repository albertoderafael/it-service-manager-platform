# Estado final y próximos pasos

<p class="lead">Este último capítulo hace inventario: qué está construido y funcionando, qué no lo está, y en qué orden conviene abordar lo que queda. Es también el punto de partida para la siguiente etapa del proyecto.</p>

## Qué está hecho [paso 6.5]

### `application-catalog-service` (puerto 8081) {{final}}

| Área | Estado |
|---|---|
| API | Listado con filtros, paginación y ordenación validada; detalle; alta; modificación; resúmenes por lote |
| Persistencia | Base de datos propia `application_db`, migración V1, `ddl-auto=validate` |
| Validación | Bean Validation en los DTO; listas blancas de filtros y campos de ordenación |
| Errores | Formato `ApiErrorResponse` con cuatro manejadores |
| Pruebas | 18: unitarias, de capa web y de integración con Testcontainers |

### `it-service-manager`, servicio de demandas (puerto 8080) {{final}}

| Área | Estado |
|---|---|
| API | Listado con tres filtros y ordenación validada; detalle; alta; modificación con ciclo de vida |
| Dominio | Máquina de estados en la entidad; fechas en UTC |
| Persistencia | Base de datos `it_service_manager`, migraciones V1 a V5, sin clave foránea hacia aplicaciones |
| Integración | Puerto `ApplicationCatalog` con adaptador HTTP: tiempos máximos, consulta por lotes, 404 y 503 diferenciados |
| Errores | Formato `ApiErrorResponse` con cuatro manejadores |
| Pruebas | 35: dominio, servicio, capa web, adaptador con servidor HTTP real e integración con Testcontainers |

### Entorno de desarrollo {{final}}

- PostgreSQL 18.6 en Docker, con volumen persistente y comprobación de salud, definido en el `compose.yaml` del proyecto de demandas.
- Las dos bases de datos en esa misma instancia, publicada en el puerto 5433.
- Los dos servicios se arrancan como procesos locales con Maven; el frontend los consume a través del proxy de Vite.

## Qué no está hecho

Para evitar malentendidos, conviene decirlo explícitamente:

- **No hay despliegue conjunto en contenedores.** El `compose.yaml` solo levanta PostgreSQL. Los dos servicios no tienen imagen Docker ni se arrancan con Compose. (Resuelto en la fase 7, capítulos 26 y 27).
- **No hay seguridad.** Ninguno de los dos servicios autentica ni autoriza peticiones. La comunicación entre ellos tampoco está protegida.
- **No hay integración continua.** Las suites se ejecutan a mano.
- **No hay observabilidad.** No hay comprobaciones de salud expuestas por los servicios, métricas ni trazas distribuidas. (Las comprobaciones de salud llegaron en el capítulo 26).
- **No hay documentación de la API generada** (OpenAPI).
- **No se ha verificado en esta guía que las suites pasen** (capítulo 22). (Verificado después: todas pasan).

## Próximos pasos, por prioridad

### Prioridad 1: verificar y cerrar la fase 5 {{pendiente}}

| Tarea | Por qué | Capítulo |
|---|---|---|
| Ejecutar las dos suites y registrar el resultado | Nada de lo demás tiene sentido sobre una base sin verificar | 18, 22 |
| Sacar la llamada al catálogo de las transacciones | Evita agotar el *pool* de conexiones | 20 |
| Traducir los 4xx inesperados del catálogo a 502 | Errores coherentes para el frontend | 20 |
| Alinear la configuración por defecto con el puerto del contenedor | Arranque sin sorpresas | 3 |
| Versionar la creación de `application_db` | Reproducibilidad del entorno | 19 |
| Retirar el volcado de datos de la carpeta del proyecto | Datos reales fuera del repositorio | 19 |
| Completar las pruebas: `CANCELLED`, tiempo de lectura, relectura con `clear()` | Cubrir los huecos conocidos | 12, 19, 20 |
| Unificar la clase de Testcontainers | Eliminar la API obsoleta | 16 |
| Coordinar con el frontend los campos de ordenación | Contrato coherente | 21 |

### Prioridad 2: robustez {{pendiente}}

- **Manejador de último recurso** para cualquier excepción, con registro completo en el *log* y un 500 con el formato del proyecto.
- **Degradación del listado** cuando falte una aplicación, en lugar de fallar la página.
- **Comprobaciones de salud** con Spring Boot Actuator (`/actuator/health`), que permiten saber si un servicio está vivo y si puede trabajar.
- **Reintentos y cortacircuitos** para las llamadas al catálogo, por ejemplo con Resilience4j: un reintento con espera para las lecturas, que son idempotentes, y un cortacircuitos que deje de llamar durante un tiempo a un catálogo que está fallando, respondiendo 503 de inmediato.
- **Enumerados** con `@Enumerated(EnumType.STRING)` para estados, prioridades y criticidades.
- **Excepciones de dominio** en lugar de `ResponseStatusException` en los servicios.

### Prioridad 3: operación {{pendiente}}

- **Imágenes de contenedor** para ambos servicios. Spring Boot puede construirlas sin escribir un `Dockerfile` con `spring-boot:build-image`.
- **Despliegue conjunto con Docker Compose**: PostgreSQL con los *scripts* de inicialización de ambas bases de datos, los dos servicios con sus variables de entorno y dependencias de arranque basadas en las comprobaciones de salud. El esquema siguiente es una **propuesta**, no algo implementado:

```yaml title="Propuesta de compose para el sistema completo (no implementada)" estado="pendiente"
services:
  postgres:
    image: postgres:18.6
    # … volumen, healthcheck y scripts en /docker-entrypoint-initdb.d

  application-catalog:
    image: application-catalog-service:0.0.1-SNAPSHOT
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/application_db
      APPLICATION_DB_PASSWORD: ${APPLICATION_DB_PASSWORD}
    depends_on:
      postgres: { condition: service_healthy }

  demands:
    image: it-service-manager:0.0.1-SNAPSHOT
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/it_service_manager
      DB_PASSWORD: ${DB_PASSWORD}
      APPLICATION_CATALOG_BASE_URL: http://application-catalog:8081
    depends_on:
      postgres: { condition: service_healthy }
```

Dentro de la red de Compose, los servicios se encuentran por su nombre (`postgres`, `application-catalog`) y usan los puertos internos, no los publicados. Por eso la URL de la base de datos usa el 5432 y no el 5433.

- **Observabilidad**: métricas con Micrometer y trazas distribuidas que sigan una petición desde el servicio de demandas hasta el catálogo. Spring Boot instrumenta automáticamente los `RestClient` construidos con el *builder* autoconfigurado, que es precisamente como lo construye el adaptador.
- **Documentación de la API** con OpenAPI.
- **Pruebas de contrato** entre el servicio de demandas (consumidor) y el catálogo (proveedor).
- **Integración continua** que ejecute ambas suites en cada cambio.

### Prioridad 4: dominio {{pendiente}}

- **Concurrencia optimista** con `@Version` en las entidades, para que dos personas que modifican la misma demanda a la vez no se pisen sin saberlo; un conflicto produciría un 409, que el frontend ya sabe tratar.
- **Nuevos módulos** (incidencias, equipos) que usen el catálogo a través de su API, siguiendo el patrón del puerto y el adaptador.
- **Seguridad**: autenticación de usuarios y, entre servicios, credenciales propias para que el catálogo sepa quién lo llama.

## Lo que vino después

Este capítulo describe el estado al terminar la fase 6, y así se ha dejado, porque la guía es cronológica. Pero la lista de prioridades no se quedó en papel: la **fase 7** (capítulos 25 a 27) ejecutó casi entera la prioridad 1, buena parte de la 2 y el despliegue con contenedores de la 3.

| Pendiente de este capítulo | Dónde se resolvió |
|---|---|
| Ejecutar las suites | Capítulo 22 (resultado) y capítulo 25 (pruebas nuevas) |
| Llamada al catálogo fuera de la transacción | Capítulo 25, paso 7.2 |
| Traducción de 4xx inesperados a 502 y manejador de último recurso | Capítulo 25, paso 7.3 |
| Degradación del listado | Capítulo 25, paso 7.4 |
| Configuración por defecto alineada con el contenedor | Capítulo 25, paso 7.5 |
| Comprobaciones de salud | Capítulo 26, paso 7.6 |
| Imágenes de contenedor | Capítulo 26, pasos 7.7 y 7.8 |
| Versionar la creación de `application_db` | Capítulo 27, paso 7.10 |
| Despliegue conjunto con Docker Compose | Capítulo 27 |

Siguen pendientes la seguridad, la integración continua, las métricas y trazas, OpenAPI, las pruebas de contrato, los reintentos y cortacircuitos, los enumerados, las excepciones de dominio, la concurrencia optimista, las pruebas que faltan (transiciones hacia `CANCELLED`, tiempo máximo de lectura, relectura con `clear()`), la unificación de la clase de Testcontainers y la coordinación de los campos de ordenación con el frontend.

## Ejercicios

::: ejercicio Planificar la siguiente iteración
Elige cinco tareas de las prioridades 1 y 2 que harías en una primera iteración de dos semanas. Para cada una, indica cómo comprobarías que está terminada (qué prueba o qué comprobación manual).
:::

::: ejercicio Completar la propuesta de Compose
Completa el esquema de la propuesta de Docker Compose: añade el volumen y la comprobación de salud de PostgreSQL, los puertos publicados de los dos servicios y una comprobación de salud para cada servicio basada en Actuator. Indica qué tendrías que añadir a los proyectos para que esa comprobación funcione.
:::

::: preguntas
1. ¿Qué levanta exactamente el `compose.yaml` actual del proyecto?
2. ¿Por qué la verificación de las suites es la primera tarea de la lista?
3. ¿Qué aporta un cortacircuitos frente a un simple tiempo máximo?
4. Dentro de la red de Docker Compose, ¿por qué la URL de la base de datos usaría el puerto 5432 y no el 5433?
5. ¿Qué problema resolvería `@Version` y qué código HTTP produciría un conflicto?
:::
