# React Router: rutas, navegación y carga diferida

<p class="lead">El router decide qué se pinta para cada URL. En el proyecto define el armazón común, monta las rutas de cada módulo, carga cada página bajo demanda, da título a las pestañas y captura los errores inesperados. Este capítulo recorre la tabla de rutas completa y todas las formas de navegar que usa la aplicación.</p>

## Qué hace un router en una SPA

El capítulo 1 explicó que en una SPA la URL cambia sin recargar la página gracias a la History API. Un **router** convierte esa URL en interfaz:

1. Mantiene sincronizada la URL con el historial del navegador (atrás, adelante, enlaces directos, recargas).
2. Compara la URL con una **tabla de rutas** y decide qué componentes corresponden.
3. Ofrece componentes y hooks para navegar (`Link`, `useNavigate`) y para leer la URL (`useParams`, `useSearchParams`).

**React Router** es el router más extendido del ecosistema. Desde la versión 7 se importa del paquete `react-router` (antes, `react-router-dom`); el proyecto usa la versión 8.

::: java
La tabla de rutas cumple el papel de los `@RequestMapping` de Spring MVC: asocia patrones de URL (`/aplicaciones/{id}/editar`) con quien los atiende. La diferencia es que aquí el «controlador» es un componente que se ejecuta en el navegador y la «respuesta» es interfaz, no HTML generado en el servidor. Y las rutas se anidan: una ruta padre aporta un armazón común que envuelve a sus hijas, algo parecido a una plantilla de diseño (*layout*) de Thymeleaf aplicada por jerarquía de URL.
:::

## Tres formas de usar React Router

React Router ofrece tres modos de uso, con capacidades crecientes:

| Modo | Cómo se declara | Qué aporta |
|---|---|---|
| Declarativo | `<BrowserRouter><Routes><Route … /></Routes></BrowserRouter>` en JSX | Lo básico: emparejar URL y componentes, navegar |
| **De datos** | `createBrowserRouter([…])` + `<RouterProvider>` | Además: carga diferida con `lazy`, límites de error por ruta, `handle`, cargadores y acciones de datos |
| *Framework* | Plugin de Vite y rutas por ficheros | Además: renderizado en servidor, división automática del código… |

El proyecto usa el **modo de datos**, pero **sin cargadores de datos** (`loader`): los datos los gestiona TanStack Query (capítulo 17). Del modo de datos aprovecha la carga diferida, los elementos de error por ruta, el `handle` para los títulos y `useMatches`. El modo *framework* quedó descartado en el capítulo 1 por requerir un servidor Node.

## La tabla de rutas

```tsx title="src/app/router.tsx"
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    // Se muestra mientras se descarga la página inicial (rutas con carga diferida).
    hydrateFallbackElement: <LoadingState className="min-h-svh" />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <Navigate to="/aplicaciones" replace /> },
          applicationRoutes,
          demandRoutes,
          // Futuros módulos: incidencias, equipos, configuración.
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
```

Una vez montadas las rutas de los módulos, el árbol completo es este:

<figure>
<svg viewBox="0 0 680 300" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="9.5">
  <rect x="10" y="10" width="200" height="36" rx="6" fill="#0b1220"/><text x="20" y="26" fill="#fff" font-weight="700">/  ·  AppLayout</text><text x="20" y="39" fill="#a5f3fc" font-size="8.5">menú, cabecera, &lt;Outlet/&gt;</text>
  <rect x="40" y="56" width="220" height="30" rx="6" fill="#fff7ed" stroke="#fdba74"/><text x="50" y="75" font-weight="700">(sin ruta) · errorElement: RouteErrorPage</text>
  <g font-family="DejaVu Sans Mono" font-size="8.8" xml:space="preserve" style="white-space:pre">
    <rect x="70" y="96" width="250" height="22" rx="4" fill="#f8fafc" stroke="#cbd5e1"/><text x="78" y="111">index → &lt;Navigate to="/aplicaciones"/&gt;</text>
    <rect x="70" y="124" width="180" height="22" rx="4" fill="#ecfeff" stroke="#67e8f9"/><text x="78" y="139">aplicaciones</text>
    <rect x="70" y="236" width="180" height="22" rx="4" fill="#ecfeff" stroke="#67e8f9"/><text x="78" y="251">demandas</text>
    <rect x="70" y="266" width="250" height="22" rx="4" fill="#f8fafc" stroke="#cbd5e1"/><text x="78" y="281">*  → NotFoundPage</text>
    <text x="110" y="160">index     → ApplicationsListPage</text>
    <text x="110" y="174">nueva     → ApplicationCreatePage</text>
    <text x="110" y="188">modificar → ApplicationEditSelectorPage</text>
    <text x="110" y="202">:id       → ApplicationDetailPage</text>
    <text x="110" y="216">:id/editar→ ApplicationEditPage</text>
  </g>
  <g stroke="#94a3b8" fill="none"><path d="M30,46 V71 H40"/><path d="M60,86 V107 H70"/><path d="M60,107 V135 H70"/><path d="M60,135 V247 H70"/><path d="M60,247 V277 H70"/><path d="M95,146 V212"/></g>
  <text x="400" y="120" font-size="9.5" fill="#0f172a" font-weight="700">URL → componentes pintados</text>
  <g font-size="9" fill="#475569">
    <text x="400" y="142">/aplicaciones</text><text x="400" y="154" fill="#0e7490">AppLayout › ApplicationsListPage</text>
    <text x="400" y="176">/aplicaciones/7/editar</text><text x="400" y="188" fill="#0e7490">AppLayout › ApplicationEditPage (id = "7")</text>
    <text x="400" y="210">/demandas/nueva?aplicacion=3</text><text x="400" y="222" fill="#0e7490">AppLayout › DemandCreatePage</text>
    <text x="400" y="244">/</text><text x="400" y="256" fill="#0e7490">redirige a /aplicaciones</text>
    <text x="400" y="278">/cualquier-otra-cosa</text><text x="400" y="290" fill="#0e7490">AppLayout › NotFoundPage</text>
  </g>
</svg>
<figcaption><b>Figura 18.1.</b> Árbol de rutas de la aplicación. Cada URL activa una cadena de rutas, de la raíz a la hoja, y cada una aporta su componente.</figcaption>
</figure>

Repasemos cada pieza:

- **La ruta raíz** (`path: '/'`) pinta `AppLayout`. Como todas las demás rutas son hijas suyas, el menú y la cabecera están siempre presentes.
- **Una ruta sin `path`** agrupa a todas las hijas para darles un `errorElement` común. Una ruta sin ruta propia no consume ningún segmento de la URL: solo sirve para envolver (capítulo 9).
- **La ruta índice** (`index: true`) es la que se pinta cuando la URL coincide exactamente con la del padre (`/`). Aquí redirige a `/aplicaciones`.
- **Las rutas de los módulos** se importan de cada módulo y se montan como un objeto más del array.
- **La ruta comodín** (`path: '*'`) encaja con cualquier URL que no haya encajado antes: la página 404.

## Rutas anidadas y `<Outlet />`

Cuando la URL es `/aplicaciones/7/editar`, React Router encuentra la cadena de rutas que encaja: raíz → grupo de error → `aplicaciones` → `:id/editar`. Cada ruta de la cadena pinta su componente, y cada padre indica **dónde** va el hijo con `<Outlet />`:

```tsx title="src/components/layout/app-layout.tsx (extracto)"
<main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
  <Outlet />
</main>
```

Las rutas que no tienen `element` propio (como `aplicaciones` o el grupo de error) simplemente dejan pasar a su hijo.

Fíjate en que las rutas hijas se escriben **sin barra inicial**: `'aplicaciones'`, `'nueva'`, `':id/editar'`. Son **relativas** a su padre, así que `nueva` dentro de `aplicaciones` corresponde a `/aplicaciones/nueva`. Esto permite que cada módulo declare sus rutas sin saber dónde se montará.

### ¿`nueva` o `:id`?

La URL `/aplicaciones/nueva` encajaría en principio con dos rutas: `nueva` y `:id` (con `id = "nueva"`). React Router no elige por orden de declaración, sino por **puntuación**: un segmento estático (`nueva`) vale más que uno dinámico (`:id`). Por eso `/aplicaciones/nueva` y `/aplicaciones/modificar` llegan a sus páginas, y solo lo demás llega a la de detalle.

## Parámetros de ruta

Los segmentos que empiezan por dos puntos son **parámetros**. Se leen con `useParams`:

```tsx title="src/features/applications/pages/application-detail-page.tsx"
const { id: rawId } = useParams()
const id = parseEntityId(rawId)
const query = useApplication(id)
```

Dos detalles importantes:

- **Los parámetros siempre son texto** (o `undefined`). `useParams()` devuelve `{ id: '7' }`, no el número 7.
- **La URL la puede escribir cualquiera.** Antes de usar el parámetro hay que validarlo:

```ts title="src/lib/route-params.ts"
/** Convierte un parámetro de ruta (:id) en un identificador numérico válido. */
export function parseEntityId(raw: string | null | undefined): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : undefined
}
```

Solo dígitos, entero seguro y positivo. `/aplicaciones/abc`, `/aplicaciones/-1` o `/aplicaciones/1.5` producen `undefined`, y la página muestra el aviso de recurso inexistente **sin hacer ninguna petición** al backend. Si el identificador es válido pero no existe, la consulta devuelve un 404 y se muestra el mismo aviso.

::: java
Es la diferencia entre `@PathVariable Long id` (Spring convierte y, si no puede, responde 400) y recibir un `String` y convertirlo a mano. En el frontend no hay conversión automática, así que la validación es responsabilidad de quien lee el parámetro. Que el backend también lo valide (el `MethodArgumentTypeMismatchException` del capítulo 15) es la segunda línea de defensa.
:::

## Navegar

El proyecto usa cuatro mecanismos, cada uno para una situación.

**1. `Link`, para enlaces que el usuario pulsa.** Genera un `<a href>` real (accesible, que se puede abrir en otra pestaña) e intercepta el clic para navegar sin recargar:

```tsx
<Link to="/aplicaciones/nueva">…</Link>
<Link to={`/demandas?aplicacion=${id}`}>Ver demandas</Link>
```

**2. `NavLink`, para enlaces que deben saber si están activos.** Los del menú lateral (capítulo 12). Su `className` puede ser una función que recibe `{ isActive }`, y la prop `end` exige coincidencia exacta.

**3. `useNavigate`, para navegar desde código**, cuando la navegación es consecuencia de algo que no es un enlace:

```tsx title="src/features/applications/pages/application-edit-selector-page.tsx"
const navigate = useNavigate()
// …
<ApplicationsTable … mode="select" onSelect={(app) => navigate(`/aplicaciones/${app.id}/editar`)} />
```

**4. `<Navigate />`, para redirigir al renderizar**: la ruta índice redirige a `/aplicaciones` en cuanto se pinta.

### Añadir o sustituir en el historial

Por defecto, navegar **añade** una entrada al historial (como `history.pushState`), y el botón *atrás* vuelve a la página anterior. Con `replace`, la navegación **sustituye** la entrada actual (`history.replaceState`):

- `<Navigate to="/aplicaciones" replace />`: si el usuario abre `/` y es redirigido, al pulsar *atrás* no vuelve a `/` (que le redirigiría otra vez, atrapándolo).
- `updateParams({ page: totalPages - 1 }, { replace: true })`: la corrección automática de una página fuera de rango no deja una entrada «rota» en el historial (capítulo 19).

Y una excepción deliberada: `RouteErrorPage` usa `window.location.assign('/aplicaciones')`, una **recarga completa**, para empezar de cero tras un error inesperado (capítulo 9).

## Carga diferida de las páginas

Cada ruta de módulo declara su página con `lazy`:

```ts title="src/features/applications/routes.ts (extracto)"
{
  path: ':id/editar',
  handle: { title: 'Modificar aplicación' },
  lazy: () =>
    import('./pages/application-edit-page').then((m) => ({ Component: m.ApplicationEditPage })),
},
```

`lazy` es una función que devuelve una promesa con las propiedades de la ruta que faltan; aquí, `Component`. El router la ejecuta **la primera vez** que la ruta se activa, descarga el *chunk* de la página (capítulo 1) y guarda el resultado para las siguientes. El `.then(m => ({ Component: m.ApplicationEditPage }))` adapta la exportación con nombre del módulo al formato que espera el router.

Mientras se descarga:

- En la **carga inicial** (abrir directamente una URL), el router muestra `hydrateFallbackElement`: el `LoadingState` a pantalla completa.
- En una **navegación posterior**, mantiene la pantalla actual hasta que la nueva está lista. Con *chunks* de pocos kilobytes, suele ser imperceptible.

::: decision Carga diferida por página
**Decisión.** Cada página es un *chunk* independiente; el *bundle* inicial contiene React, el router, TanStack Query, el layout y los componentes comunes.

**Motivos.** El primer pintado es más rápido y el coste de añadir módulos no recae sobre quien solo usa uno. La sintaxis está concentrada en `routes.ts`, así que las páginas son componentes normales que no saben que se cargan bajo demanda.

**Coste.** Una pequeña espera la primera vez que se visita cada página. Si llegara a notarse, React Router permite precargar el código de una ruta al pasar el ratón por un enlace.
:::

## `handle` y `useMatches`: metadatos de las rutas

Cada ruta puede llevar un objeto `handle` con datos arbitrarios. El proyecto lo usa para el título de la pestaña:

```ts
{ path: 'nueva', handle: { title: 'Nueva aplicación' }, lazy: … }
```

`useMatches()` devuelve la cadena de rutas activas, de la raíz a la hoja, con su `handle`. El hook `useDocumentTitle` del layout (capítulo 8) recorre esa cadena desde la hoja y toma el primer título que encuentra:

```tsx title="src/components/layout/app-layout.tsx"
const matches = useMatches()
const title = [...matches]
  .reverse()
  .map((m) => (m.handle as { title?: string } | undefined)?.title)
  .find(Boolean)
```

La ventaja es que **cada ruta declara su título junto a su definición**, en lugar de que cada página tenga que acordarse de cambiar `document.title`. El mismo mecanismo serviría para construir unas migas de pan automáticas.

## Errores y páginas inexistentes

Hay tres situaciones distintas, y el proyecto da a cada una su respuesta:

| Situación | Ejemplo | Quién responde |
|---|---|---|
| La URL no corresponde a ninguna ruta | `/informes` | Ruta comodín `*` → `NotFoundPage`, dentro del layout |
| La URL encaja, pero el recurso no existe o el `id` no es válido | `/aplicaciones/999999`, `/demandas/abc` | La propia página → `ResourceNotFound` con enlace a su listado |
| Un componente falla al renderizarse | Un error de programación | `errorElement` → `RouteErrorPage`, dentro del layout |

`RouteErrorPage` obtiene el error con `useRouteError()` y distingue con `isRouteErrorResponse()` las respuestas de error que lanza el propio router (con `status` y `statusText`) de los errores normales de JavaScript.

## El diseño de las URL

Las URL forman parte de la interfaz: el usuario las ve, las guarda y las comparte. El proyecto sigue unos criterios coherentes:

| Criterio | Ejemplo |
|---|---|
| En español, como el resto de la interfaz | `/aplicaciones`, `/demandas/nueva` |
| Recurso en plural, identificador después | `/demandas/7` |
| Acciones como segmento final | `/aplicaciones/7/editar` |
| Filtros y estado del listado en la consulta | `/demandas?aplicacion=3&estado=OPEN&pagina=2` |
| Enlaces profundos entre módulos | *Ver demandas* → `/demandas?aplicacion=7`; `/demandas/nueva?aplicacion=7` preselecciona la aplicación |

Mientras tanto, el código y la API usan los nombres en inglés del dominio del backend (`applications`, `demands`). La traducción ocurre en dos sitios: las rutas y los parámetros de la URL (capítulo 19).

::: decision Router de datos sin cargadores
**Decisión.** `createBrowserRouter` con rutas por módulo, carga diferida, `errorElement` y `handle`, pero sin `loader` ni `action`: los datos se piden desde los componentes con TanStack Query.

**Motivos.** Un único mecanismo para los datos (con su caché, sus invalidaciones y sus estados explícitos) en lugar de dos. Los cargadores obligan a esperar los datos antes de pintar la ruta; el proyecto prefiere pintar la página enseguida con un esqueleto de carga.

**Alternativas.** Cargadores de React Router combinados con TanStack Query (`queryClient.ensureQueryData` dentro del `loader`) para empezar a pedir los datos en paralelo a la descarga del código; **TanStack Router**, con rutas y parámetros de búsqueda totalmente tipados, una opción atractiva para proyectos que empiezan desde cero.
:::

## Errores típicos y depuración

- **`useNavigate() may be used only in the context of a <Router> component`.** El componente se renderiza fuera del `RouterProvider`, típicamente en una prueba o en `App` por encima del router.
- **Una ruta hija no se pinta.** Su padre no tiene `<Outlet />`, o la ruta se declaró con barra inicial (`'/nueva'`), lo que la convierte en absoluta.
- **Al pulsar *atrás* el usuario vuelve a una página que le redirige otra vez.** Falta `replace` en la redirección.
- **Un enlace recarga la página entera.** Se ha usado `<a href>` en lugar de `Link` para una ruta interna.
- **`/aplicaciones/abc` hace una petición al backend.** Falta validar el parámetro antes de usarlo.
- **404 al recargar en producción.** Es el servidor, no el router: falta el *fallback* a `index.html` (capítulo 16).

## Ejercicios

::: ejercicio Añade una ruta de informes
Crea una página `ApplicationsReportPage` sencilla (un `PageHeader` y un texto) y móntala en `/aplicaciones/informe` con carga diferida y título propio. Comprueba: que el título de la pestaña cambia, que se descarga un *chunk* nuevo al visitarla y que no la confunde con `:id`. ¿Qué ocurre si la declaras después de `:id` en el array?
:::

::: ejercicio Migas de pan automáticas
Añade a algunas rutas un `handle: { crumb: 'Aplicaciones' }` (y `crumb` en las hijas) y crea un componente `Breadcrumbs` en el layout que use `useMatches()` para pintar la ruta de migas con enlaces a cada nivel (`match.pathname`). ¿Cómo mostrarías en la miga de un detalle el nombre de la aplicación en lugar de «Detalle»? Pista: piensa en qué datos tiene la página y cuáles el layout.
:::

::: ejercicio Navega desde código con estado
Al crear una aplicación, en lugar de mostrar la tarjeta de resultado, navega al detalle de la aplicación creada llamando a `navigate` con la ruta `/aplicaciones/` seguida de `result.id`. ¿Aparece la ficha sin estado de carga? ¿Por qué? (Recuerda `setQueryData` del capítulo 17.) Valora qué experiencia es mejor para el usuario y deshaz el cambio si prefieres la original.
:::

## Autoevaluación

::: preguntas
1. ¿Qué tres modos ofrece React Router y cuál usa el proyecto?
2. ¿Para qué sirve una ruta sin `path` como la que contiene el `errorElement`?
3. ¿Qué hace `<Outlet />` y quién lo usa en el proyecto?
4. ¿Por qué `/aplicaciones/nueva` no llega a la página de detalle con `id = "nueva"`?
5. ¿Por qué hay que validar los parámetros de ruta y qué hace `parseEntityId`?
6. ¿Cuándo se usa `Link`, `NavLink`, `useNavigate` y `<Navigate />`?
7. ¿Qué diferencia hay entre navegar con y sin `replace`?
8. ¿Qué muestra el router mientras descarga una página en la carga inicial y en una navegación posterior?
9. ¿Qué tres situaciones de «no encontrado» o error distingue el proyecto y quién responde a cada una?
:::
