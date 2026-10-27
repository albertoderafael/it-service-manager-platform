# TanStack Query: el estado del servidor

<p class="lead">Mostrar datos de una API parece sencillo hasta que aparecen los detalles: no repetir peticiones, saber cuándo los datos están desactualizados, mantener la página anterior mientras llega la siguiente, refrescar los listados al guardar, cancelar lo que ya no interesa, reintentar lo que falló. TanStack Query se ocupa de todo eso. Es la librería que más trabajo ahorra en el proyecto, y este capítulo explica su modelo mental y cada decisión de configuración.</p>

## Estado del servidor frente a estado del cliente

El capítulo 7 distinguía varios tipos de estado. El **estado del servidor** tiene características propias que lo hacen muy distinto del resto:

- **No es tuyo.** Lo tiene el backend; en el navegador solo hay una **copia**, que puede quedar desactualizada en cualquier momento porque otro usuario la cambie.
- **Es asíncrono.** Hay que pedirlo y esperar, con estados de carga y de error.
- **Se comparte.** El mismo dato (el catálogo de aplicaciones) puede necesitarse en varias pantallas a la vez.
- **Se invalida.** Cuando alguien crea una aplicación, todos los listados que la incluirían quedan obsoletos.

Gestionarlo con `useState` y `useEffect` obliga a resolver a mano: carga, errores, caché, deduplicación de peticiones simultáneas, cancelación, condiciones de carrera, reintentos y actualización tras modificar. **TanStack Query** (antes React Query) es una **caché de estado del servidor**: tú le dices *qué* datos necesitas y *cómo* obtenerlos, y ella decide *cuándo* pedirlos, los guarda y los comparte.

::: java
La analogía más útil es la **caché de segundo nivel de Hibernate**, o una caché de Spring (`@Cacheable`) con política de expiración y evicción: lecturas que se sirven de la caché si el dato es reciente, entradas identificadas por una clave, y un `@CacheEvict` tras cada escritura. La diferencia es que TanStack Query además **notifica** a los componentes que usan un dato cuando este cambia, para que se vuelvan a renderizar, y refresca en segundo plano.
:::

## El `QueryClient` y la caché

En el centro hay un objeto, el `QueryClient`, creado una vez y puesto a disposición de toda la aplicación por `QueryClientProvider` (capítulo 9). Contiene la **caché de consultas**: un mapa de **claves** a **entradas**.

<figure>
<svg viewBox="0 0 680 220" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="9.5">
  <rect x="10" y="10" width="420" height="200" rx="8" fill="#0b1220"/>
  <text x="220" y="32" text-anchor="middle" font-weight="700" fill="#fff" font-size="11">QueryClient · caché de consultas</text>
  <g font-family="DejaVu Sans Mono" font-size="8.5">
    <rect x="25" y="45" width="390" height="30" rx="4" fill="#10233d"/><text x="35" y="64" fill="#a5f3fc">['applications','list',{page:0,size:10,…}]</text><text x="405" y="64" text-anchor="end" fill="#86efac">fresca</text>
    <rect x="25" y="80" width="390" height="30" rx="4" fill="#10233d"/><text x="35" y="99" fill="#a5f3fc">['applications','list',{page:1,size:10,…}]</text><text x="405" y="99" text-anchor="end" fill="#fde68a">obsoleta</text>
    <rect x="25" y="115" width="390" height="30" rx="4" fill="#10233d"/><text x="35" y="134" fill="#a5f3fc">['applications','list','options']</text><text x="405" y="134" text-anchor="end" fill="#86efac">fresca · 5 min</text>
    <rect x="25" y="150" width="390" height="30" rx="4" fill="#10233d"/><text x="35" y="169" fill="#a5f3fc">['applications','detail',7]</text><text x="405" y="169" text-anchor="end" fill="#cbd5e1">inactiva</text>
    <rect x="25" y="185" width="390" height="18" rx="4" fill="#10233d"/><text x="35" y="198" fill="#a5f3fc">['demands','list',{…}]   …</text>
  </g>
  <rect x="460" y="20" width="210" height="80" rx="8" fill="#ecfeff" stroke="#0891b2"/>
  <text x="565" y="42" text-anchor="middle" font-weight="700">Cada entrada guarda</text>
  <text x="472" y="62">• los datos y el error</text>
  <text x="472" y="76">• cuándo se actualizó</text>
  <text x="472" y="90">• quién la está observando</text>
  <rect x="460" y="115" width="210" height="95" rx="8" fill="#f8fafc" stroke="#94a3b8"/>
  <text x="565" y="137" text-anchor="middle" font-weight="700">Componentes observadores</text>
  <text x="472" y="157">useApplications(params) se</text>
  <text x="472" y="171">suscribe a una clave y se vuelve</text>
  <text x="472" y="185">a renderizar cuando su entrada</text>
  <text x="472" y="199">cambia.</text>
</svg>
<figcaption><b>Figura 17.1.</b> La caché de TanStack Query: una entrada por clave, observada por los componentes que la usan.</figcaption>
</figure>

Si dos componentes piden la misma clave a la vez, TanStack Query hace **una sola petición** y ambos reciben el resultado. Si un componente pide una clave que ya está en caché, recibe los datos **al instante**, y la librería decide si además hay que refrescarlos.

## Anatomía de `useQuery`

```ts title="src/features/applications/api/applications-queries.ts"
export function useApplication(id: number | undefined) {
  return useQuery({
    queryKey: applicationKeys.detail(id ?? -1),
    queryFn: ({ signal }) => applicationsApi.getById(id!, signal),
    enabled: id !== undefined,
    // Un 404 no se reintenta: la aplicación no existe.
    retry: (failureCount, error) =>
      !(isApiError(error) && error.kind === 'not-found') && failureCount < 2,
  })
}
```

| Opción | Qué hace |
|---|---|
| `queryKey` | Identifica la entrada de la caché. Si cambia, es otra consulta (sección 17.6). |
| `queryFn` | Cómo obtener los datos. Recibe, entre otras cosas, una `signal` para cancelar la petición. Debe devolver una promesa o lanzar un error. |
| `enabled` | Si es `false`, la consulta no se ejecuta. Aquí, mientras no haya un `id` válido. |
| `retry` | Cuántas veces reintentar, o una función que lo decide según el error. |
| `staleTime` | Cuánto tiempo se consideran frescos los datos (sección 17.4). |
| `placeholderData` | Qué mostrar mientras se carga la clave nueva (sección 17.7). |

El hook devuelve un objeto con los datos y el estado:

| Propiedad | Significado |
|---|---|
| `data` | Los datos, o `undefined` si aún no hay |
| `error` | El error (en el proyecto, normalmente un `ApiError`) |
| `isPending` | Todavía no hay datos (primera carga, o consulta desactivada) |
| `isError`, `isSuccess` | El último resultado fue un error o un éxito |
| `isFetching` | Hay una petición en curso, sea la primera o un refresco en segundo plano |
| `isPlaceholderData` | Lo que se muestra son datos provisionales de otra clave |
| `refetch()` | Vuelve a pedir los datos (el botón *Reintentar*) |

La distinción entre **`isPending`** («no tengo nada que enseñar») e **`isFetching`** («estoy pidiendo algo») es clave: el listado muestra el esqueleto con `isPending`, pero con `isFetching` solo atenúa la tabla y desactiva la paginación, porque ya hay datos que mostrar.

::: java
`isPending`, `isError` e `isSuccess` son excluyentes, como los estados de un `CompletableFuture` (sin completar, completado con excepción, completado normalmente). `isFetching` es independiente: una entrada puede estar en `success` con datos antiguos y, a la vez, refrescándose.
:::

## El ciclo de vida de los datos

Cada entrada de la caché pasa por estas fases:

<figure>
<svg viewBox="0 0 680 150" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="a17" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="10" y="40" width="110" height="56" rx="8" fill="#f1f5f9" stroke="#94a3b8"/><text x="65" y="64" text-anchor="middle" font-weight="700">Petición</text><text x="65" y="80" text-anchor="middle" font-size="8.5" fill="#475569">primera vez</text>
  <line x1="120" y1="68" x2="168" y2="68" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a17)"/>
  <rect x="170" y="40" width="130" height="56" rx="8" fill="#dcfce7" stroke="#22c55e"/><text x="235" y="64" text-anchor="middle" font-weight="700">Fresca</text><text x="235" y="80" text-anchor="middle" font-size="8.5" fill="#166534">se sirve sin pedir</text>
  <line x1="300" y1="68" x2="348" y2="68" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a17)"/>
  <text x="324" y="58" text-anchor="middle" font-size="8">staleTime</text>
  <rect x="350" y="40" width="150" height="56" rx="8" fill="#fef9c3" stroke="#eab308"/><text x="425" y="62" text-anchor="middle" font-weight="700">Obsoleta</text><text x="425" y="76" text-anchor="middle" font-size="8.5" fill="#854d0e">se sirve y se refresca</text><text x="425" y="88" text-anchor="middle" font-size="8.5" fill="#854d0e">al volver a usarla</text>
  <line x1="500" y1="68" x2="548" y2="68" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a17)"/>
  <text x="524" y="58" text-anchor="middle" font-size="8">sin uso</text>
  <rect x="550" y="40" width="120" height="56" rx="8" fill="#f1f5f9" stroke="#94a3b8"/><text x="610" y="62" text-anchor="middle" font-weight="700">Inactiva</text><text x="610" y="76" text-anchor="middle" font-size="8.5" fill="#475569">se borra tras gcTime</text><text x="610" y="88" text-anchor="middle" font-size="8.5" fill="#475569">(5 min por defecto)</text>
  <path d="M425,96 C425,130 235,130 235,98" fill="none" stroke="#0891b2" stroke-width="1.3" marker-end="url(#a17)"/>
  <text x="330" y="138" text-anchor="middle" font-size="8.5" fill="#0e7490">refresco en segundo plano o invalidación</text>
</svg>
<figcaption><b>Figura 17.2.</b> Fresca, obsoleta, inactiva. Los datos obsoletos no se tiran: se siguen mostrando mientras se refrescan.</figcaption>
</figure>

- **Fresca.** Durante `staleTime` desde la última actualización, la entrada se sirve **sin hacer ninguna petición**.
- **Obsoleta.** Pasado ese tiempo, se sigue mostrando, pero se refresca en segundo plano cuando un componente vuelve a montarse con esa clave, cuando la ventana recupera el foco o cuando se recupera la red (según la configuración).
- **Inactiva.** Cuando ningún componente la observa, la entrada permanece en memoria durante `gcTime` (5 minutos por defecto) por si se vuelve a necesitar, y luego se elimina.

Esta estrategia se llama ***stale-while-revalidate***: mostrar enseguida lo que se tiene y actualizarlo en segundo plano. Es la razón de que volver a un listado ya visitado sea instantáneo.

## La configuración global del proyecto

```ts title="src/app/query-client.ts"
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // No se reintentan errores de cliente (4xx): repetirlos no cambia el resultado.
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})
```

Cada valor es una decisión frente a los valores por defecto de la librería:

| Opción | Por defecto | En el proyecto | Por qué |
|---|---|---|---|
| `staleTime` | 0 (siempre obsoleto) | 30 segundos | Navegar entre listado, detalle y vuelta no dispara peticiones repetidas; medio minuto es un retraso aceptable para datos de gestión |
| `refetchOnWindowFocus` | Activado | Desactivado | Al volver a la pestaña no se refresca todo: evita peticiones y parpadeos inesperados mientras se edita |
| `retry` (consultas) | 3 reintentos | 2, y nunca en 4xx | Un 404 o un 400 no van a cambiar por insistir; un fallo de red o un 503 momentáneo, sí |
| `retry` (mutaciones) | 0 | 0 (explícito) | Repetir automáticamente un alta podría crear duplicados: las escrituras no se reintentan |

El número `30_000` usa separadores numéricos de JavaScript: el guion bajo solo mejora la legibilidad, como en Java.

Las consultas pueden sobrescribir estos valores. El catálogo de aplicaciones para los desplegables, que cambia poco, usa `staleTime: 5 * 60_000`; el detalle cambia la política de reintentos para no insistir con los 404.

## Claves jerárquicas

La clave es lo más importante de una consulta: identifica la entrada de la caché **y** permite invalidarla. El proyecto las genera con una factoría por módulo:

```ts title="src/features/applications/api/applications-queries.ts"
/** Claves de caché jerárquicas para invalidar de forma selectiva. */
export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (params: ApplicationListParams) => [...applicationKeys.lists(), params] as const,
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (id: number) => [...applicationKeys.details(), id] as const,
}
```

| Llamada | Clave | Representa |
|---|---|---|
| `applicationKeys.all` | `['applications']` | Todo lo del módulo |
| `applicationKeys.lists()` | `['applications', 'list']` | Todos los listados, con cualquier filtro |
| `applicationKeys.list(params)` | `['applications', 'list', { status: 'ACTIVE', page: 0, … }]` | Un listado concreto |
| (catálogo de opciones) | `['applications', 'list', 'options']` | El catálogo para desplegables |
| `applicationKeys.details()` | `['applications', 'detail']` | Todos los detalles |
| `applicationKeys.detail(7)` | `['applications', 'detail', 7]` | El detalle de la aplicación 7 |

Dos propiedades hacen que esto funcione:

- **Las claves se comparan por contenido**, no por referencia. TanStack Query las serializa de forma determinista, incluso ordenando las propiedades de los objetos: `{ page: 0, size: 10 }` y `{ size: 10, page: 0 }` son la misma clave. Por eso se pueden incluir los parámetros del listado tal cual: cada combinación de filtros, página y orden tiene su propia entrada.
- **La invalidación funciona por prefijo.** `invalidateQueries({ queryKey: ['applications', 'list'] })` afecta a **todas** las claves que empiezan así: todos los listados con cualquier filtro, y también el catálogo de opciones. Una sola línea marca como obsoleto todo lo que podría haber cambiado.

::: decision Factorías de claves por módulo
Escribir las claves a mano en cada `useQuery` (`['applications', 'list', params]`) funciona, pero basta un error tipográfico para que una invalidación no surta efecto, y nadie lo notaría hasta ver datos antiguos. Centralizar las claves en `applicationKeys` y `demandKeys` garantiza que lectura e invalidación usan exactamente la misma estructura, y documenta la jerarquía de la caché del módulo en cinco líneas.
:::

## Paginación sin parpadeos

Cuando el usuario pasa de la página 1 a la 2, la clave cambia y, en principio, la nueva entrada no tiene datos: la consulta volvería a `isPending` y la tabla se sustituiría por el esqueleto durante un instante. Para evitarlo, el listado usa `placeholderData`:

```ts title="src/features/applications/api/applications-queries.ts"
export function useApplications(params: ApplicationListParams) {
  return useQuery({
    queryKey: applicationKeys.list(params),
    queryFn: ({ signal }) => applicationsApi.list(params, signal),
    // Mantiene la página anterior visible mientras se carga la siguiente.
    placeholderData: keepPreviousData,
  })
}
```

Con `keepPreviousData`, mientras llega la página 2 la consulta sigue devolviendo los datos de la página 1, con `isPlaceholderData` a `true`. La página aprovecha esa señal:

```tsx title="src/features/applications/pages/applications-list-page.tsx"
<ApplicationsTable … isFetching={query.isFetching && query.isPlaceholderData} />
<PaginationBar … disabled={query.isFetching} />
```

La tabla se atenúa (`opacity-60`) para indicar que su contenido va a cambiar, y la paginación se desactiva para evitar clics acumulados. Cuando llegan los datos nuevos, se sustituyen sin que la página cambie de altura ni pierda la posición del desplazamiento.

## Mutaciones: escribir y mantener la caché coherente

Las escrituras usan `useMutation`. Este es el alta de aplicaciones:

```ts title="src/features/applications/api/applications-queries.ts"
export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: ApplicationCreateRequest) => applicationsApi.create(request),
    onSuccess: (created) => {
      queryClient.setQueryData(applicationKeys.detail(created.id), created)
      return queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
    },
  })
}
```

Cuando el servidor confirma el alta, `onSuccess` hace dos cosas con la respuesta:

1. **`setQueryData`** escribe la aplicación creada en la entrada de su detalle. Si el usuario pulsa *Ver detalle*, la ficha aparece al instante, sin petición: el servidor ya nos ha dado los datos.
2. **`invalidateQueries`** marca como obsoletos todos los listados (y el catálogo de opciones). Los que estén en pantalla se refrescan en el acto; los demás, cuando se vuelvan a usar. No se intenta insertar la aplicación nueva en cada listado a mano: con filtros, orden y paginación, calcular dónde iría es complejo y propenso a errores. Es más seguro preguntar al servidor.

Al **devolver** la promesa de `invalidateQueries`, la mutación no se considera terminada hasta que los listados visibles se han refrescado, de modo que el estado `isPending` de la mutación cubre todo el proceso.

La mutación de modificación sigue exactamente el mismo patrón. Fíjate en lo que **no** se invalida: los detalles. El detalle de la aplicación modificada ya se ha actualizado con `setQueryData`, y los demás detalles no han cambiado.

### Usar una mutación desde una página

```tsx title="src/features/applications/pages/application-create-page.tsx (extracto)"
const mutation = useCreateApplication()

const onSubmit = form.handleSubmit(async (values) => {
  try {
    const result = await mutation.mutateAsync({ name: values.name, /* … */ })
    setCreated(result)
    toast.success('Aplicación creada', { description: `«${result.name}» con identificador #${result.id}.` })
  } catch (error) {
    applyServerFieldErrors(error, form.setError, ['name', 'description', 'criticality'])
  }
})
```

| Propiedad o método | Uso en el proyecto |
|---|---|
| `mutateAsync(datos)` | Lanza la mutación y devuelve una promesa: permite usar `await` y `try/catch` en el manejador del formulario |
| `mutate(datos)` | Alternativa sin promesa, con *callbacks*; útil cuando no hay que encadenar nada |
| `isPending` | Desactiva el botón y muestra «Creando…» |
| `isError`, `error` | Alerta con el mensaje sobre el formulario |
| `reset()` | Limpia el estado de la mutación (al pulsar *Crear otra* o *Descartar*) |

## Consultas dependientes y desactivadas

La opción `enabled` permite que una consulta **espere** a tener lo que necesita. El buscador por identificador de *Modificar aplicación* la usa de forma natural:

```tsx title="src/features/applications/pages/application-edit-selector-page.tsx"
const [searchedId, setSearchedId] = useState<number | undefined>()
const query = useApplication(searchedId)   // enabled: searchedId !== undefined
```

Mientras el usuario no busca, `searchedId` es `undefined` y no se hace ninguna petición. Al buscar, la clave pasa a ser `['applications', 'detail', 42]` y la consulta se activa. Si vuelve a buscar el mismo identificador en menos de 30 segundos, la respuesta sale de la caché.

## Cancelación y condiciones de carrera

Imagina que el usuario pulsa rápidamente la página 2 y la 3. Sin control, la respuesta de la página 2 podría llegar **después** de la de la 3 y mostrarse por error: es una **condición de carrera**. TanStack Query la evita porque cada respuesta se guarda en **su propia clave**: la página 2 se guarda en la entrada de la página 2, y la pantalla solo observa la de la página 3.

Además, la `signal` que recibe `queryFn` y que el proyecto pasa hasta `fetch` permite **cancelar** de verdad la petición cuando deja de interesar (por ejemplo, si el usuario sale de la pantalla antes de que llegue). En *Network* la verás como *(canceled)*. El cliente HTTP deja pasar ese error de cancelación sin convertirlo en un error de red (capítulo 15).

## Decisión y alternativas

::: decision TanStack Query para todo el estado del servidor
**Decisión.** Todas las lecturas de la API pasan por `useQuery` y todas las escrituras por `useMutation`, con claves jerárquicas por módulo, una configuración global explícita y, tras cada escritura, actualización del detalle e invalidación de los listados.

**Motivos.** Elimina todo el código de carga, caché, deduplicación, cancelación y reintentos que habría que escribir a mano; da una experiencia más rápida (navegación instantánea a datos ya vistos, paginación sin parpadeos); y hace que las páginas apenas necesiten estado local.

**Alternativas.**

- `useEffect` + `useState`: válido para un único caso trivial; en una aplicación real reinventa una caché con errores.
- Redux Toolkit con RTK Query: equivalente en funcionalidad, pero acoplado a Redux, que el proyecto no necesita (capítulo 9).
- SWR: más ligero y con la misma filosofía *stale-while-revalidate*, pero con menos herramientas para mutaciones e invalidación.
- Cargadores de datos de React Router (`loader`): cargan los datos antes de pintar la ruta; útiles, pero sin una caché compartida tan completa. Pueden combinarse con TanStack Query si se quisiera precargar.
:::

## Errores típicos y depuración

- **Los datos no se actualizan tras guardar.** La mutación no invalida la clave correcta, o la clave de lectura no empieza por el prefijo invalidado. Comprueba que ambas usan la factoría de claves.
- **Peticiones duplicadas o en bucle.** La `queryKey` contiene algo que cambia en cada renderizado (una fecha, un objeto con una función). Las claves deben contener solo datos serializables y estables.
- **`queryFn` devuelve `undefined`.** TanStack Query no admite `undefined` como resultado de una consulta y avisa en consola. Devuelve `null` si no hay datos.
- **La pantalla de carga aparece en cada cambio de página.** Falta `placeholderData: keepPreviousData`.
- **Un error 404 tarda varios segundos en mostrarse.** Se está reintentando: comprueba la política `retry`.
- **Datos de un usuario visibles para otro tras cambiar de sesión** (cuando haya autenticación). Hay que vaciar la caché al cerrar sesión con `queryClient.clear()`.

Para ver la caché por dentro existe **TanStack Query Devtools** (`@tanstack/react-query-devtools`), un panel que lista cada clave, su estado (fresca, obsoleta, inactiva, cargando), sus datos y sus observadores, y permite invalidar o refrescar a mano. El proyecto no lo tiene instalado; añadirlo es el ejercicio 17.1.

## Ejercicios

::: ejercicio Instala las herramientas de TanStack Query
Instala `@tanstack/react-query-devtools` como dependencia de desarrollo y añade `<ReactQueryDevtools initialIsOpen={false} />` dentro de `QueryClientProvider` en `app.tsx` (el componente se excluye automáticamente del *build* de producción). Navega por los listados y detalles y observa cómo aparecen las claves, cómo pasan de frescas a obsoletas a los 30 segundos y qué ocurre en la caché al crear una aplicación.
:::

::: ejercicio Mide el efecto de `staleTime`
Con *Network* abierto, ve del listado de aplicaciones al detalle de una y vuelve al listado, varias veces seguidas. ¿Cuántas peticiones a `/api/applications` ves? Espera 30 segundos y repite. Después cambia temporalmente `staleTime` a `0` y repite el experimento. Resume el compromiso entre frescura de los datos y número de peticiones.
:::

::: ejercicio Precarga el detalle al pasar el ratón
Usa `queryClient.prefetchQuery` para precargar el detalle de una aplicación cuando el usuario pase el ratón por su botón *Ver detalle* en la tabla (`onMouseEnter`). Reutiliza `applicationKeys.detail(id)` y `applicationsApi.getById`. Comprueba en *Network* que la petición sale al pasar el ratón y que al hacer clic la ficha aparece sin estado de carga. ¿En qué casos no compensaría esta técnica?
:::

## Autoevaluación

::: preguntas
1. ¿Qué cuatro características distinguen el estado del servidor del estado del cliente?
2. ¿Qué diferencia hay entre `isPending` e `isFetching`? ¿Qué hace el listado con cada uno?
3. Describe las fases fresca, obsoleta e inactiva de una entrada de la caché.
4. ¿Por qué el proyecto usa `staleTime: 30_000` y desactiva `refetchOnWindowFocus`?
5. ¿Por qué no se reintentan los 4xx ni las mutaciones?
6. ¿Qué invalida `invalidateQueries({ queryKey: applicationKeys.lists() })` y por qué incluye el catálogo de opciones?
7. ¿Qué hacen `setQueryData` e `invalidateQueries` tras crear una aplicación y por qué no se inserta la aplicación en los listados a mano?
8. ¿Cómo evita TanStack Query que la respuesta tardía de una página se muestre en lugar de la actual?
:::
