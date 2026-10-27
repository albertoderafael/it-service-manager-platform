# El módulo de aplicaciones de principio a fin

<p class="lead">Ya conoces todas las piezas por separado. Este capítulo las recorre juntas, siguiendo al usuario por cada pantalla del módulo de aplicaciones: qué ficheros intervienen, en qué orden, qué viaja por la red y qué ocurre en la caché. Es el capítulo para leer con la aplicación abierta y las DevTools a la vista.</p>

## El mapa del módulo

| Ruta | Pantalla | Página | Llamadas a la API |
|---|---|---|---|
| `/aplicaciones` | Consulta con filtros, paginación y orden | `ApplicationsListPage` | `GET /api/applications?status&criticality&page&size&sort` |
| `/aplicaciones/nueva` | Alta | `ApplicationCreatePage` | `POST /api/applications` |
| `/aplicaciones/modificar` | Buscar por ID o elegir del catálogo | `ApplicationEditSelectorPage` | `GET /api/applications/{id}`, `GET /api/applications` |
| `/aplicaciones/:id` | Detalle | `ApplicationDetailPage` | `GET /api/applications/{id}` |
| `/aplicaciones/:id/editar` | Modificación | `ApplicationEditPage` | `GET` y `PUT /api/applications/{id}` |

En el backend, cada fila corresponde a un método del controlador de aplicaciones, que en desarrollo atiende el servicio del puerto 8081 a través del proxy de Vite.

## Recorrido 1: consultar el catálogo

El usuario pulsa *Consultar aplicaciones* en el menú lateral.

<figure>
<svg viewBox="0 0 680 330" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="9">
  <defs><marker id="a21" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker></defs>
  <g font-weight="700" font-size="9.5">
    <rect x="5" y="5" width="100" height="28" rx="5" fill="#f1f5f9" stroke="#94a3b8"/><text x="55" y="23" text-anchor="middle">Usuario / menú</text>
    <rect x="120" y="5" width="100" height="28" rx="5" fill="#0b1220"/><text x="170" y="23" text-anchor="middle" fill="#fff">Router</text>
    <rect x="235" y="5" width="120" height="28" rx="5" fill="#ecfeff" stroke="#0891b2"/><text x="295" y="23" text-anchor="middle">ApplicationsListPage</text>
    <rect x="370" y="5" width="110" height="28" rx="5" fill="#ecfeff" stroke="#0891b2"/><text x="425" y="23" text-anchor="middle">TanStack Query</text>
    <rect x="495" y="5" width="80" height="28" rx="5" fill="#f8fafc" stroke="#94a3b8"/><text x="535" y="23" text-anchor="middle">api-client</text>
    <rect x="590" y="5" width="85" height="28" rx="5" fill="#fff7ed" stroke="#fdba74"/><text x="632" y="23" text-anchor="middle">Proxy + :8081</text>
  </g>
  <g stroke="#cbd5e1" stroke-dasharray="3 3"><line x1="55" y1="33" x2="55" y2="325"/><line x1="170" y1="33" x2="170" y2="325"/><line x1="295" y1="33" x2="295" y2="325"/><line x1="425" y1="33" x2="425" y2="325"/><line x1="535" y1="33" x2="535" y2="325"/><line x1="632" y1="33" x2="632" y2="325"/></g>
  <g stroke="#475569" fill="none">
    <line x1="55" y1="52" x2="167" y2="52" marker-end="url(#a21)"/>
    <line x1="170" y1="78" x2="292" y2="78" marker-end="url(#a21)"/>
    <line x1="295" y1="122" x2="422" y2="122" marker-end="url(#a21)"/>
    <line x1="425" y1="150" x2="532" y2="150" marker-end="url(#a21)"/>
    <line x1="535" y1="172" x2="629" y2="172" marker-end="url(#a21)"/>
    <line x1="632" y1="200" x2="538" y2="200" marker-end="url(#a21)"/>
    <line x1="535" y1="222" x2="428" y2="222" marker-end="url(#a21)"/>
    <line x1="425" y1="248" x2="298" y2="248" marker-end="url(#a21)"/>
  </g>
  <g fill="#0f172a">
    <text x="60" y="47">NavLink /aplicaciones</text>
    <text x="175" y="73">lazy(): descarga el chunk y pinta la página</text>
    <text x="300" y="91" fill="#0e7490">parseListParams(URL) → valores por defecto</text>
    <text x="300" y="103" fill="#0e7490">isPending → TableSkeleton</text>
    <text x="300" y="117">useApplications(params)</text>
    <text x="430" y="145">queryFn(signal)</text>
    <text x="540" y="158" font-size="7.8">GET /api/applications</text><text x="540" y="168" font-size="7.8">?page=0&amp;size=10&amp;sort=id,asc</text>
    <text x="540" y="195">200 { content, page, … }</text>
    <text x="430" y="217">JSON → ApplicationPage</text>
    <text x="300" y="243">caché: clave nueva · data</text>
  </g>
  <rect x="235" y="262" width="250" height="56" rx="6" fill="#dcfce7" stroke="#22c55e"/>
  <text x="245" y="279" font-size="9">Nuevo renderizado: data.content.length &gt; 0</text>
  <text x="245" y="293" font-size="9">→ ApplicationsTable + PaginationBar</text>
  <text x="245" y="307" font-size="9">«Mostrando 1–10 de N»</text>
</svg>
<figcaption><b>Figura 21.1.</b> Primera visita al listado. Las flechas son llamadas o respuestas; cada columna, una pieza del sistema.</figcaption>
</figure>

| Paso | Fichero | Qué ocurre |
|---|---|---|
| 1 | `components/layout/sidebar-nav.tsx` | `NavLink` navega a `/aplicaciones` sin recargar |
| 2 | `features/applications/routes.ts` | La ruta índice ejecuta `lazy()`: se descarga el *chunk* de la página |
| 3 | `components/layout/app-layout.tsx` | `useDocumentTitle` lee `handle.title` y pone «Consultar aplicaciones · IT Service Manager» |
| 4 | `pages/applications-list-page.tsx` | `parseListParams` convierte la URL vacía en los valores por defecto |
| 5 | `api/applications-queries.ts` | `useApplications` busca la clave en la caché; no existe → `isPending` |
| 6 | `components/common/table-skeleton.tsx` | Se pinta el esqueleto de la tabla |
| 7 | `model/list-params.ts` → `api/applications-api.ts` → `lib/api-client.ts` | `toApiQuery` construye `page=0&size=10&sort=id,asc`; `apiRequest` hace el `fetch` |
| 8 | `vite.config.ts` | El proxy reenvía `/api/applications` al servicio de aplicaciones |
| 9 | TanStack Query | Guarda la respuesta en la clave y notifica a la página |
| 10 | `components/applications-table.tsx`, `pagination-bar.tsx` | Se pinta la tabla con indicadores y la paginación |

### Interacciones del listado

| El usuario… | La página llama a | URL resultante | ¿Petición? |
|---|---|---|---|
| Filtra por criticidad *Alta* | `updateParams({ criticality: 'HIGH', page: 0 })` | `?criticidad=HIGH` | Sí, clave nueva |
| Pulsa la cabecera *Nombre* | `updateParams({ ...nextSort(params, 'name'), page: 0 })` | `?criticidad=HIGH&orden=name,asc` | Sí |
| Pulsa de nuevo *Nombre* | Alterna la dirección | `…&orden=name,desc` | Sí |
| Elige 20 filas por página | `updateParams({ size: 20, page: 0 })` | `…&tamano=20` | Sí |
| Pasa a la página 2 | `updateParams({ page: 1 })` | `…&pagina=2` | Sí; la tabla anterior se atenúa mientras tanto |
| Pulsa *atrás* | (el navegador) | Vuelve a la URL anterior | No, si han pasado menos de 30 s |
| Pulsa *Limpiar filtros* | `updateParams({ status: undefined, criticality: undefined, page: 0 })` | `/aplicaciones` (más orden y tamaño, si no son los de por defecto) | Probablemente no: está en caché |

Y los estados posibles de la tarjeta: esqueleto (primera carga), error con *Reintentar* (sin datos), franja de aviso sobre los datos anteriores (error al actualizar), vacío con «Limpiar filtros» o vacío con «Nueva aplicación» según haya filtros o no, y tabla con paginación.

## Recorrido 2: ver el detalle

Desde la tabla, el usuario pulsa el icono del ojo de una fila. `RowAction` es un `Link` con *tooltip* a `/aplicaciones/7`.

1. La ruta `:id` carga `ApplicationDetailPage`.
2. `useParams()` devuelve `{ id: '7' }` y `parseEntityId` lo convierte en `7`. Si no fuera válido, se mostraría `ResourceNotFound` sin petición.
3. `useApplication(7)` pide `GET /api/applications/7`. Mientras tanto, la cabecera muestra «Aplicación #7» y la tarjeta, un `LoadingState`.
4. Con los datos, el título pasa a ser el nombre de la aplicación, aparecen las acciones *Ver demandas* y *Modificar*, y `ApplicationSummary` pinta la ficha.
5. Si la respuesta es un 404, la consulta **no reintenta** (política propia de `useApplication`) y se muestra `ResourceNotFound`.

*Ver demandas* enlaza con `/demandas?aplicacion=7`: el listado de demandas, ya filtrado, sin compartir estado entre módulos (capítulo 19).

## Recorrido 3: dar de alta

El usuario pulsa *Nueva aplicación*.

| Momento | Qué ve el usuario | Qué ocurre por dentro |
|---|---|---|
| Al entrar | Formulario vacío, criticidad sin elegir | `useForm` con `EMPTY_FORM` y `zodResolver(applicationCreateSchema)` |
| Escribe el nombre | El contador avanza (`4/100`) | `useWatch` renderiza solo el contador |
| Pulsa *Crear* sin criticidad | «Selecciona una criticidad.» bajo el campo, foco en él | `handleSubmit` valida con Zod; no hay petición |
| Elige criticidad | El error desaparece | Revalidación al cambiar (tras el primer intento) |
| Pulsa *Crear* | Botón «Creando…» desactivado | `mutateAsync` → `POST /api/applications` con `{ name, description: null, criticality }` |
| Responde el servidor con la aplicación creada | Notificación «Aplicación creada» y tarjeta con los datos registrados | `setQueryData(detail(id))` + invalidación de listados; `setCreated(result)` |
| Pulsa *Ver detalle* | La ficha aparece **sin estado de carga** | El detalle ya estaba en caché por `setQueryData` |
| Pulsa *Crear otra* | Formulario vacío de nuevo | `form.reset(EMPTY_FORM)`, `mutation.reset()`, `setCreated(null)` |

Si el servidor rechaza el alta, la alerta muestra su mensaje y los `fieldErrors` aparecen en sus campos (capítulo 20). El identificador y el estado inicial los asigna el servidor, y la página lo explica en su descripción: es información que evita dudas al usuario.

## Recorrido 4: modificar

Hay dos caminos para llegar a la modificación.

**Desde el menú: *Modificar aplicación*.** La página de selección ofrece dos tarjetas:

- **Buscar por identificador** (`FindById`): un campo controlado con `useState`. Al enviar, se valida el texto con `parseEntityId` y se guarda en `searchedId`, lo que activa `useApplication(searchedId)` (consulta dependiente, capítulo 17). Si existe, se muestra un resumen y el botón *Modificar*, que navega con `useNavigate`.
- **Seleccionar del catálogo** (`PickFromCatalog`): la misma tabla y los mismos filtros del listado, en modo `select` y con su estado en `useState` (capítulo 7). *Seleccionar* navega a la edición.

**Desde el listado o el detalle:** el icono del lápiz o el botón *Modificar* llevan directamente a `/aplicaciones/7/editar`.

En la página de edición:

1. Se valida el `id` y se pide el detalle (si se viene del detalle, sale de la caché al instante).
2. Con los datos, se monta `ApplicationEditForm` con `key={application.id}` (capítulo 7) y `defaultValues: toFormValues(application)`.
3. El identificador se muestra en un campo desactivado con un candado: no es modificable.
4. El pie indica «Sin cambios pendientes» o «Hay cambios sin guardar» según `isDirty`, y los botones *Descartar* y *Guardar cambios* solo se activan con cambios.
5. Al guardar: `PUT /api/applications/7` con el DTO completo (nombre, descripción, criticidad y estado). Con éxito, el formulario se reinicia con la respuesta, aparece la tarjeta «Datos actualizados» y la notificación.
6. En cuanto el usuario vuelve a editar, la tarjeta de confirmación desaparece: `showUpdated` es un valor derivado de `!isDirty`.

::: proyecto
La modificación envía **todos** los campos con `PUT`, no solo los que cambian. Es lo que espera el contrato del backend (`ApplicationUpdateRequest` con todos los campos y Bean Validation sobre ellos). Si en el futuro hubiera ediciones parciales, el método adecuado sería `PATCH`, y el cliente HTTP ya lo admite (capítulo 15).
:::

## La caché a lo largo de una sesión

Sigamos una sesión real y lo que contiene la caché en cada momento:

| Acción | Peticiones | Estado relevante de la caché |
|---|---|---|
| Abre `/aplicaciones` | `GET list(página 1)` | `list{p0}` fresca |
| Pasa a la página 2 | `GET list(página 2)` | `list{p0}`, `list{p1}` frescas |
| Abre el detalle de la 7 | `GET detail(7)` | + `detail(7)` |
| Pulsa *atrás* (antes de 30 s) | Ninguna | `list{p1}` sale de la caché |
| Modifica la 7 y guarda | `PUT`; después `GET list(página 2)` | `detail(7)` actualizado con la respuesta; listados invalidados, el visible se refresca |
| Va a *Nueva demanda* | `GET list(options)` y otras de demandas | + `list(options)`, fresca 5 min |
| Crea una aplicación desde otra pestaña del navegador | — | Esta pestaña no se entera (cada pestaña tiene su propia caché) |
| Vuelve al listado pasados 30 s | Se muestra la caché y `GET list(página 2)` en segundo plano | Aparece la aplicación creada en la otra pestaña |

La penúltima fila es importante: TanStack Query mantiene coherente lo que hace **este** usuario en **esta** pestaña. Los cambios de otros se ven cuando los datos se consideran obsoletos y se refrescan. Para una aplicación de gestión es suficiente; si se necesitara ver cambios ajenos en tiempo real, habría que añadir notificaciones del servidor (WebSocket o *Server-Sent Events*) que invalidaran las claves afectadas.

## El contrato con el backend

| Aspecto | Contrato | Cómo lo refleja el frontend |
|---|---|---|
| Paginación | Spring Data `Pageable`, página 0-based, `@PageableDefault(size = 10, sort = "id", ASC)` | `DEFAULT_LIST_PARAMS` coincide; conversión 1-based ↔ 0-based en la URL |
| Respuesta paginada | `ApplicationPageResponse { content, page, size, totalElements, totalPages }` | `ApplicationPage` |
| Filtros | `status`, `criticality` opcionales | Se omiten si están vacíos (`buildQueryString`) |
| Ordenación | Propiedades de la entidad: `id`, `name`, `criticality`, `status` | `APPLICATION_SORT_FIELDS`; solo se envían esos campos |
| Validación | `@NotBlank`, `@Size(max = 100)` el nombre, `@Size(max = 500)` la descripción | Esquemas de Zod con las mismas constantes |
| Errores | `ApiErrorResponse` (400 con `fieldErrors`, 404) | `ApiError` + `applyServerFieldErrors` + `ResourceNotFound` |

Dos limitaciones del contrato, detectadas al construir el módulo, condicionan la interfaz:

- **La criticidad se ordena alfabéticamente.** Se guarda como texto, así que ordenar por criticidad da `CRITICAL, HIGH, LOW, MEDIUM`, no el orden de severidad. El frontend no puede corregirlo sin cargar todos los datos; la solución está en el backend (un valor ordinal o una expresión `CASE` en la consulta).
- **No hay búsqueda por nombre.** Por eso *Modificar aplicación* ofrece búsqueda por identificador y selección en el catálogo filtrado, en lugar de un buscador de texto.

Ambas se recogerán en las notas de integración del capítulo 25.

## Errores típicos y depuración

Ante cualquier comportamiento extraño en este módulo, recorre la cadena de la figura 21.1 de izquierda a derecha:

1. **¿La URL es la esperada?** Mira la barra de direcciones: los parámetros de la URL deciden todo lo demás.
2. **¿La página interpreta bien la URL?** Con React DevTools, inspecciona `ApplicationsListPage` y mira el valor de `params` (en los *hooks*, el `Memo`).
3. **¿Se hace la petición correcta?** En *Network*, revisa la URL final, los parámetros y el cuerpo.
4. **¿Qué responde el backend?** Pestaña *Response*.
5. **¿Qué hay en la caché?** Con TanStack Query Devtools (ejercicio 17.1), busca la clave.
6. **¿Qué estado pinta la página?** `isPending`, `isError`, `data`…

## Ejercicios

::: ejercicio Traza una sesión completa
Con *Network* y React DevTools abiertos, realiza esta secuencia y anota cada petición y cada cambio de URL: listado → filtro *Inactiva* → página 2 (si existe) → detalle de una aplicación → *Modificar* → cambia la criticidad y guarda → *Volver al listado*. ¿Qué peticiones se hicieron tras guardar y por qué? ¿Cuáles no se hicieron gracias a la caché?
:::

::: ejercicio Mejora la confirmación del alta
Tras crear una aplicación, la página ofrece *Crear otra*, *Volver al listado* y *Ver detalle*. Añade un cuarto botón, *Crear demanda para esta aplicación*, que lleve a `/demandas/nueva` con la aplicación preseleccionada. ¿Qué parámetro de la URL lo hace posible y qué página lo lee?
:::

::: ejercicio Avisa de los cambios sin guardar
Si el usuario tiene cambios sin guardar en la edición y pulsa un enlace del menú, los pierde sin aviso. Investiga el hook `useBlocker` de React Router y úsalo para pedir confirmación cuando `isDirty` sea verdadero. Añade también un aviso al cerrar la pestaña con el evento `beforeunload`. ¿En qué casos no debería bloquearse la navegación (pista: justo después de guardar)?
:::

## Autoevaluación

::: preguntas
1. ¿Qué cinco rutas tiene el módulo y qué endpoint usa cada una?
2. ¿En qué orden intervienen el router, la página, TanStack Query y el cliente HTTP en la primera visita al listado?
3. ¿Por qué al pulsar *atrás* desde un detalle el listado aparece al instante?
4. ¿Qué pasa si el usuario pulsa *Crear* sin elegir la criticidad?
5. ¿Por qué la ficha aparece sin carga al pulsar *Ver detalle* tras un alta?
6. ¿Qué dos caminos llevan a la edición desde el menú y qué estado usa cada uno?
7. ¿Por qué la modificación envía todos los campos con `PUT`?
8. ¿Se entera una pestaña de los cambios hechos en otra? ¿Cuándo los verá?
9. ¿Qué dos limitaciones del contrato del backend condicionan la interfaz del módulo?
:::
