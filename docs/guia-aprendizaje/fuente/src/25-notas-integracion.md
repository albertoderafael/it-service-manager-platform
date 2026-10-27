# Notas de integración con el backend

<p class="lead">Escribir esta guía ha obligado a leer con lupa el frontend y, en modo de solo lectura, el backend. De esa lectura han salido desajustes, fragilidades y oportunidades de mejora en la frontera entre ambos. Este capítulo las reúne en un único inventario priorizado, con su causa y una propuesta para cada lado, y termina con un procedimiento para que el contrato no vuelva a desincronizarse.</p>

## La frontera actual

<figure>
<svg viewBox="0 0 680 210" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="9.5">
  <defs><marker id="a25" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="10" y="40" width="190" height="130" rx="8" fill="#ecfeff" stroke="#0891b2"/>
  <text x="105" y="62" text-anchor="middle" font-weight="700" font-size="10.5">it-service-manager-web</text>
  <text x="22" y="84">model/types.ts · DTO a mano</text>
  <text x="22" y="100">constants.ts · @Size, @PageableDefault</text>
  <text x="22" y="116">*_SORT_FIELDS · campos de orden</text>
  <text x="22" y="132">status-rules.ts · Demand.changeStatus()</text>
  <text x="22" y="148">api-client.ts · ApiErrorResponse</text>
  <line x1="200" y1="105" x2="258" y2="105" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a25)"/>
  <text x="229" y="96" text-anchor="middle" font-size="8.5">/api/*</text>
  <rect x="260" y="70" width="110" height="70" rx="8" fill="#0b1220"/>
  <text x="315" y="100" text-anchor="middle" font-weight="700" fill="#fff">Proxy</text>
  <text x="315" y="116" text-anchor="middle" font-size="8.5" fill="#a5f3fc">Vite / inverso</text>
  <line x1="370" y1="90" x2="438" y2="62" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a25)"/>
  <line x1="370" y1="120" x2="438" y2="148" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a25)"/>
  <rect x="440" y="20" width="230" height="70" rx="8" fill="#fff7ed" stroke="#fdba74"/>
  <text x="555" y="42" text-anchor="middle" font-weight="700" font-size="10.5">Servicio de aplicaciones · :8081</text>
  <text x="452" y="62">/api/applications · /{id} · /summaries?ids=</text>
  <text x="452" y="78" fill="#9a3412">código no disponible en esta revisión</text>
  <rect x="440" y="120" width="230" height="70" rx="8" fill="#fff7ed" stroke="#fdba74"/>
  <text x="555" y="142" text-anchor="middle" font-weight="700" font-size="10.5">Servicio de demandas · :8080</text>
  <text x="452" y="162">/api/demands · PostgreSQL · Flyway</text>
  <text x="452" y="178">RestApplicationCatalog → :8081</text>
  <line x1="555" y1="120" x2="555" y2="92" stroke="#c2410c" stroke-width="1.5" marker-end="url(#a25)"/>
</svg>
<figcaption><b>Figura 25.1.</b> Los puntos del frontend que replican el contrato del backend (izquierda) son los que pueden desincronizarse.</figcaption>
</figure>

::: nota
**Alcance de la revisión.** Del backend se ha leído el repositorio `it-service-manager` (el servicio de demandas). El código del servicio de aplicaciones no estaba disponible, así que lo que se dice de él procede de cómo lo consume el frontend, de cómo lo consume el servicio de demandas (`RestApplicationCatalog`) y del análisis inicial del contrato. Ninguna nota ha requerido modificar el backend.
:::

## Inventario priorizado

La prioridad combina el impacto para el usuario y el riesgo de que el problema pase desapercibido.

| # | Nota | Prioridad | Lado que debe actuar | Estado |
|---|---|---|---|---|
| 1 | Campos de ordenación de demandas desalineados | **Alta** | Frontend (ya) y backend (decidir) | Abierta |
| 2 | El 409 de transición se interpreta leyendo un texto | Media | Backend (código y campos) y frontend | Abierta |
| 3 | Sin control de concurrencia en las modificaciones | Media | Backend y frontend | Abierta |
| 4 | Mensajes de error en idiomas mezclados | Media | Backend (códigos estables) | Abierta |
| 5 | Enumerados ordenados alfabéticamente | Media | Backend | Abierta |
| 6 | Sin búsqueda por nombre de aplicación | Media | Backend, después frontend | Abierta |
| 7 | Catálogo de desplegables limitado a 1000 elementos | Baja | Backend y frontend | Abierta |
| 8 | Contrato replicado a mano en el frontend | Media | Ambos (OpenAPI) | Propuesta |
| 9 | Errores no controlados con el formato por defecto de Spring | Baja | Backend | Parcialmente resuelta |
| 10 | `updatedAt` cambia en cada `PUT` aunque no haya cambios | Baja | Backend | Abierta |
| 11 | Indisponibilidad del catálogo de aplicaciones | Informativa | Frontend (opcional) | Gestionada |
| 12 | `.env.example` obsoleto | Baja | Frontend | Abierta |
| 13 | Despliegue: sin CORS ni proxy de producción definidos | Informativa | Infraestructura | Pendiente de despliegue |
| 14 | Consulta N+1 al resolver el nombre de la aplicación | — | Backend | **Resuelta** |

## Las notas, una a una

### 1. Campos de ordenación de demandas desalineados

**Síntoma.** En el listado de demandas, ordenar por *Aplicación* o por *Creación* muestra un error: `400 Invalid demand sort field: application.name` (o `createdAt`). Una URL guardada con ese orden falla siempre.

**Causa.** El frontend ofrece `DEMAND_SORT_FIELDS = ['id', 'title', 'application.name', 'priority', 'status', 'createdAt', 'updatedAt']`, pero `DemandService` valida contra `VALID_SORT_FIELDS = ['id', 'title', 'priority', 'status', 'updatedAt']`. Al separar las aplicaciones en otro servicio, la entidad `Demand` dejó de tener una relación con `Application` (solo guarda `applicationId`), y ordenar por su nombre ya no es posible en la base de datos de demandas. La lista del frontend no se actualizó.

**Propuesta.**
- *Frontend (inmediato):* alinear `DEMAND_SORT_FIELDS` con el backend y pintar esas columnas como no ordenables (ejercicio 22.2), con la prueba del ejercicio 19.2.
- *Backend (decisión):* volver a admitir `createdAt`, que es una columna propia. Para ordenar por nombre de aplicación, o se guarda una copia del nombre en la demanda (actualizada por eventos o al consultar), o se acepta como limitación del diseño distribuido.

### 2. El 409 de transición se interpreta leyendo un texto

**Síntoma.** Ninguno hoy. El riesgo es que, si alguien cambia el mensaje `Invalid demand status transition: X -> Y`, el frontend deje de reconocerlo y muestre un mensaje técnico en inglés.

**Causa.** `GlobalExceptionHandler` devuelve todos los `ResponseStatusException` con `error: 'RESOURCE_ERROR'` y el motivo en `message`. El frontend extrae los estados con una expresión regular (`parseTransitionError`).

**Propuesta.** Que el backend devuelva un código específico y los datos estructurados, por ejemplo:

```json
{ "status": 409, "error": "INVALID_STATUS_TRANSITION", "message": "…",
  "details": { "from": "COMPLETED", "to": "CANCELLED" } }
```

El frontend comprobaría `error.code === 'INVALID_STATUS_TRANSITION'` y leería los estados de `details`, sin depender del texto.

### 3. Sin control de concurrencia en las modificaciones

**Síntoma.** Si dos usuarios editan la misma aplicación o demanda, gana el último en guardar sin que el primero se entere. Solo los cambios de estado de demandas tienen una protección parcial (el 409 de transición).

**Propuesta.** Concurrencia optimista: un campo `@Version` en las entidades, expuesto en los DTO de respuesta y exigido en los de modificación (o mediante cabeceras `ETag`/`If-Match`). Ante una versión distinta, el backend responde 409; el frontend ya tiene el patrón de alerta con *Recargar datos actuales* (capítulo 22) y solo habría que generalizarlo.

### 4. Mensajes de error en idiomas mezclados

**Síntoma.** El usuario ve mensajes en español («La petición contiene campos inválidos») junto a otros en inglés («Application not found: 99», «Application Catalog is unavailable», «Invalid value for parameter: id»), y los `fieldErrors` de Bean Validation dependen de la configuración regional del servidor.

**Propuesta.** Separar el **código** (estable, para las máquinas) del **mensaje** (para las personas). Con códigos estables (`APPLICATION_NOT_FOUND`, `CATALOG_UNAVAILABLE`…), el frontend puede traducir con un diccionario y usar el mensaje del servidor solo como respaldo. Mientras tanto, configurar los mensajes de validación en español en el backend (`ValidationMessages_es.properties` o mensajes explícitos en las anotaciones) unificaría al menos los errores por campo.

### 5. Enumerados ordenados alfabéticamente

**Síntoma.** Ordenar por criticidad, prioridad o estado da `CRITICAL, HIGH, LOW, MEDIUM` en lugar del orden lógico.

**Causa.** Se guardan como texto (`VARCHAR`), y la base de datos ordena alfabéticamente.

**Propuesta.** En el backend, ordenar con una expresión `CASE` cuando el campo de orden sea un enumerado, o persistir un valor ordinal adicional. El frontend no puede corregirlo sin descargar todos los datos.

### 6. Sin búsqueda por nombre de aplicación

**Síntoma.** *Modificar aplicación* obliga a buscar por identificador o a recorrer el catálogo; el listado no tiene buscador de texto.

**Propuesta.** Un parámetro opcional `name` (búsqueda parcial, sin distinguir mayúsculas) en `GET /api/applications`. El frontend lo incorporaría como en el ejercicio 19.1, con *debounce*.

### 7. Catálogo de desplegables limitado a 1000 elementos

**Síntoma.** Ninguno con el volumen actual. Con más de mil aplicaciones, el desplegable de demandas mostraría solo las primeras y un aviso.

**Propuesta.** Con la búsqueda por nombre (nota 6), sustituir el desplegable por un selector con búsqueda que consulte al backend mientras se escribe. El servicio de aplicaciones ya expone un endpoint ligero, `GET /api/applications/summaries?ids=…` (lo usa el servicio de demandas), que podría ampliarse con búsqueda por nombre para este fin.

### 8. Contrato replicado a mano en el frontend

**Síntoma.** Las notas 1 y 2 son consecuencia de la misma causa: el frontend replica a mano tipos, longitudes, listas de campos y reglas del backend.

**Propuesta.** Publicar la especificación OpenAPI de cada servicio con `springdoc-openapi` y generar los tipos del frontend con `openapi-typescript` (ADR-022). No resuelve las reglas de negocio (la máquina de estados), pero sí tipos, enumerados y parámetros. Para lo que siga siendo manual, el procedimiento de la última sección.

### 9. Errores no controlados con el formato por defecto de Spring

**Estado.** El `GlobalExceptionHandler` actual ya cubre los casos más frecuentes que antes llegaban con el formato por defecto: identificadores no numéricos (`MethodArgumentTypeMismatchException`) y JSON mal formado (`HttpMessageNotReadableException`). Siguen llegando con el formato por defecto los errores 500 no previstos y algunos casos concretos, como una respuesta 4xx del catálogo distinta de 404, que `RestApplicationCatalog` relanza sin traducir. El frontend los muestra con un mensaje genérico, así que el impacto es bajo.

**Propuesta.** Un manejador genérico de `Exception` que devuelva `ApiErrorResponse` con un 500 y un mensaje neutro (y registre el detalle en el log del servidor).

### 10. `updatedAt` cambia en cada `PUT`

**Causa.** `Demand.update()` actualiza la fecha aunque los valores no cambien.

**Mitigación en el frontend.** El botón *Guardar* está desactivado sin cambios (`isDirty`), así que un uso normal no la provoca. **Propuesta en el backend:** actualizar la fecha solo si algún campo cambia.

### 11. Indisponibilidad del catálogo de aplicaciones

**Comportamiento actual.** Si el servicio de aplicaciones no responde, el de demandas devuelve **503 «Application Catalog is unavailable»** al crear, modificar o consultar demandas (necesita resolver el nombre de la aplicación). El frontend lo muestra como error del servidor, con reintento en las consultas. Es coherente, pero significa que el módulo de demandas depende por completo del de aplicaciones.

**Posible mejora (backend).** Degradar con elegancia en las lecturas: devolver las demandas con `applicationName: null` si el catálogo no responde, y que el frontend muestre «Aplicación #7 (no disponible)». Es una decisión de diseño distribuido que merece su propio ADR.

### 12. `.env.example` obsoleto

Documenta `VITE_API_PROXY_TARGET`, que la configuración ya no usa; las variables reales son `VITE_DEMAND_API_TARGET` y `VITE_APPLICATION_API_TARGET` (ejercicio 4.2). Es un arreglo de dos líneas en el frontend.

### 13. Despliegue

No hay todavía configuración de producción. La recomendación (capítulo 16) es un proxy inverso o pasarela que sirva la SPA y reparta `/api/applications` y `/api/demands`, lo que evita configurar CORS en los servicios.

### 14. Consulta N+1 al resolver el nombre de la aplicación (resuelta)

El análisis inicial detectó que el listado de demandas hacía una consulta adicional por cada aplicación distinta. Tras la separación de servicios, `DemandService` reúne los identificadores de la página y llama **una sola vez** a `ApplicationCatalog.findByIds()`, que se traduce en una petición a `/api/applications/summaries?ids=…`. La documentación del backend (`docs/frontera-catalogo.md`) lo describe y lo cubre con pruebas. Se mantiene en el inventario como ejemplo de nota cerrada.

## Deudas internas del frontend

Además de la frontera con el backend, la revisión ha dejado algunas mejoras pendientes en el propio frontend, de menor importancia:

| Deuda | Propuesta | Capítulo |
|---|---|---|
| Sin pruebas de componentes ni de extremo a extremo | Testing Library para componentes comunes; Playwright para los recorridos principales | 23 |
| Sin formateador automático | Prettier + plugin de clases de Tailwind | 5 |
| Modo oscuro preparado pero no definido | Tokens oscuros y conmutador | 10 |
| `ApplicationSummary` duplica `DetailField` y `LongText` | Usar los componentes comunes | 12 |
| Nombres distintos para las funciones de URL entre módulos | Unificar convención | 14 |
| Lectura de URL y `updateParams` repetidos en las páginas de listado | Hook `useUrlListState` | 19 |
| Sin aviso al abandonar un formulario con cambios | `useBlocker` y `beforeunload` | 21 |

## Procedimiento: cuando cambia el backend

Mientras el contrato se replique a mano, este procedimiento evita la mayoría de los desajustes. Úsalo cada vez que cambie un controlador, un DTO, una validación o una regla de dominio:

1. **Leer el cambio en el backend**: controlador (rutas, parámetros, `@PageableDefault`), DTO (campos, tipos, `@NotBlank`, `@Size`), excepciones nuevas y su traducción en `GlobalExceptionHandler`, listas de validación como `VALID_SORT_FIELDS`, reglas de dominio.
2. **Localizar el reflejo en el frontend**: `model/types.ts` (busca el nombre del DTO en los comentarios), `model/constants.ts`, `*_SORT_FIELDS`, `model/schemas.ts`, `status-rules.ts`, los `-api.ts`.
3. **Actualizar primero las pruebas** de `model/` para que expresen el nuevo contrato y fallen.
4. **Actualizar el código** hasta que pasen, y ejecutar `npm run typecheck`: los `Record` exhaustivos y los tipos derivados señalarán todo lo que falta.
5. **Probar a mano** el recorrido afectado contra el backend real, con *Network* abierto.
6. **Registrar** el cambio: si es una decisión, un ADR; si es una limitación, una nota en este inventario.

::: java
Es la disciplina de los *consumer-driven contracts* (por ejemplo, con Spring Cloud Contract o Pact) aplicada a mano: el consumidor (el frontend) declara en sus pruebas qué espera del proveedor (el backend). El paso natural siguiente, cuando el proyecto crezca, es automatizarla con OpenAPI o con pruebas de contrato compartidas.
:::

## Ejercicios

::: ejercicio Prioriza con tu criterio
Reordena las notas 1 a 13 según tu criterio de jefe de proyecto, considerando esfuerzo e impacto. Agrúpalas en tres iteraciones de trabajo, indicando en cada una qué hace el equipo de frontend y qué el de backend, y qué dependencias hay entre ambas.
:::

::: ejercicio Diseña el contrato de errores
Diseña una versión 2 de `ApiErrorResponse` con códigos estables y detalles estructurados que resuelva las notas 2 y 4. Escribe el `record` de Java y el tipo de TypeScript equivalente, y adapta `toApiError` y `parseTransitionError` para que funcionen con ambos formatos (el antiguo y el nuevo) durante la transición.
:::

::: ejercicio Prueba el procedimiento
Elige un cambio pequeño del backend (por ejemplo, ampliar la longitud máxima del título de una demanda a 200 caracteres) y aplica el procedimiento completo de la última sección en una rama del frontend: lista los ficheros que tocarías, escribe primero la prueba que falla y después el cambio. ¿Cuántos ficheros has tenido que cambiar? ¿Lo habría detectado el compilador si te hubieras olvidado de alguno?
:::

## Autoevaluación

::: preguntas
1. ¿Qué cinco puntos del frontend replican el contrato del backend?
2. ¿Cuál es la causa de fondo del desajuste de ordenación de demandas?
3. ¿Por qué es frágil la interpretación actual del 409 y cómo se resolvería?
4. ¿Qué es la concurrencia optimista y qué parte del frontend ya está preparada para ella?
5. ¿Por qué conviene separar el código de error del mensaje?
6. ¿Qué ocurre hoy si el servicio de aplicaciones cae mientras se usa el módulo de demandas?
7. ¿Qué nota del análisis inicial está resuelta y cómo?
8. Resume los seis pasos del procedimiento a seguir cuando cambia el backend.
:::
