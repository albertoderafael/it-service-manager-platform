# Hooks: efectos, memorización y lógica reutilizable

<p class="lead">Los <em>hooks</em> son las funciones con las que un componente accede a las capacidades de React: estado, efectos, contexto, referencias. Las librerías del proyecto exponen también su funcionalidad como hooks (<code>useQuery</code>, <code>useForm</code>, <code>useSearchParams</code>…). Este capítulo explica sus reglas, los tres hooks que más malentendidos generan —<code>useEffect</code>, <code>useMemo</code> y <code>useCallback</code>— y cómo escribir hooks propios.</p>

## Qué es un hook y por qué tiene reglas

Un **hook** es una función cuyo nombre empieza por `use` y que solo puede llamarse durante el renderizado de un componente (o desde otro hook). Ya conoces uno: `useState`. Las dos reglas de los hooks, que ESLint vigila (capítulo 5), son:

1. **Llámalos siempre en el nivel superior** del componente: nunca dentro de un `if`, un bucle, una función anidada o después de un `return` anticipado.
2. **Llámalos solo desde componentes o desde otros hooks**, nunca desde funciones normales.

¿Por qué? Porque React **identifica cada hook por su orden de llamada**. Recuerda que el componente es una función sin memoria propia; React guarda, para cada instancia, una lista con el estado de sus hooks: «el primer hook de `FindById` es un `useState` con valor `'42'`, el segundo es un `useState` con valor `42`…». En cada renderizado, React recorre esa lista en el mismo orden en que se hacen las llamadas.

<figure>
<svg viewBox="0 0 680 175" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <text x="160" y="16" text-anchor="middle" font-weight="700" font-size="11">Llamadas en FindById</text>
  <text x="520" y="16" text-anchor="middle" font-weight="700" font-size="11">Lo que guarda React para esta instancia</text>
  <g font-family="DejaVu Sans Mono" font-size="9">
    <rect x="20" y="28" width="280" height="26" rx="4" fill="#ecfeff" stroke="#67e8f9"/><text x="30" y="45">1 · useNavigate()</text>
    <rect x="20" y="58" width="280" height="26" rx="4" fill="#ecfeff" stroke="#67e8f9"/><text x="30" y="75">2 · useState('')            → value</text>
    <rect x="20" y="88" width="280" height="26" rx="4" fill="#ecfeff" stroke="#67e8f9"/><text x="30" y="105">3 · useState&lt;number&gt;()     → searchedId</text>
    <rect x="20" y="118" width="280" height="26" rx="4" fill="#ecfeff" stroke="#67e8f9"/><text x="30" y="135">4 · useState(false)         → invalid</text>
    <rect x="20" y="148" width="280" height="22" rx="4" fill="#ecfeff" stroke="#67e8f9"/><text x="30" y="163">5 · useApplication(searchedId)</text>
    <rect x="380" y="28" width="280" height="26" rx="4" fill="#f8fafc" stroke="#cbd5e1"/><text x="390" y="45">[0] contexto del router</text>
    <rect x="380" y="58" width="280" height="26" rx="4" fill="#f8fafc" stroke="#cbd5e1"/><text x="390" y="75">[1] '42'</text>
    <rect x="380" y="88" width="280" height="26" rx="4" fill="#f8fafc" stroke="#cbd5e1"/><text x="390" y="105">[2] 42</text>
    <rect x="380" y="118" width="280" height="26" rx="4" fill="#f8fafc" stroke="#cbd5e1"/><text x="390" y="135">[3] false</text>
    <rect x="380" y="148" width="280" height="22" rx="4" fill="#f8fafc" stroke="#cbd5e1"/><text x="390" y="163">[4…] estado interno de useQuery</text>
  </g>
  <g stroke="#0891b2" stroke-dasharray="3 3"><line x1="300" y1="41" x2="380" y2="41"/><line x1="300" y1="71" x2="380" y2="71"/><line x1="300" y1="101" x2="380" y2="101"/><line x1="300" y1="131" x2="380" y2="131"/><line x1="300" y1="159" x2="380" y2="159"/></g>
</svg>
<figcaption><b>Figura 8.1.</b> React asocia cada llamada a un hook con una posición de la lista de esa instancia. Si una llamada se salta en un renderizado, todas las posiciones siguientes se desplazan.</figcaption>
</figure>

Si un hook estuviera dentro de un `if` y en un renderizado no se llamara, todas las posiciones siguientes se desplazarían y cada hook recibiría el estado de otro. Por eso la regla es estricta.

::: proyecto
Fíjate en cómo lo resuelve `ApplicationEditPage`: tiene un retorno anticipado cuando el `id` no es válido, pero **antes** de ese `return` ya ha llamado a todos sus hooks (`useParams`, `useApplication`). El formulario, que usa más hooks (`useForm`, `useUpdateApplication`, `useState`), está en un componente aparte, `ApplicationEditForm`, que solo se monta cuando hay datos. Separar en componentes es la forma natural de «llamar a hooks condicionalmente».
:::

## `useEffect`: sincronizar con el exterior

Los componentes deben ser puros, pero a veces hay que actuar **fuera** de React: cambiar el título de la pestaña, suscribirse a un evento del navegador, iniciar un temporizador, manejar un elemento del DOM que no controla React. Para eso existe `useEffect`:

```tsx
useEffect(() => {
  // código del efecto: se ejecuta DESPUÉS de que React haya aplicado los cambios al DOM
  return () => {
    // limpieza opcional: se ejecuta antes del siguiente efecto y al desmontar
  }
}, [dependencias])
```

La **lista de dependencias** decide cuándo se vuelve a ejecutar:

| Dependencias | Cuándo se ejecuta el efecto |
|---|---|
| `[a, b]` | Tras el primer renderizado y cada vez que `a` o `b` cambian (comparados con `Object.is`) |
| `[]` | Solo tras el primer renderizado (al montar) |
| Sin lista | Tras **cada** renderizado (casi nunca es lo que quieres) |

La forma correcta de pensar un efecto no es «se ejecuta al montar o al actualizar», sino **«mantén sincronizado este sistema externo con estos valores»**.

### Ejemplo 1: el título de la pestaña

```tsx title="src/components/layout/app-layout.tsx"
/** Título de la pestaña a partir del `handle.title` de la ruta activa. */
function useDocumentTitle() {
  const matches = useMatches()
  const title = [...matches]
    .reverse()
    .map((m) => (m.handle as { title?: string } | undefined)?.title)
    .find(Boolean)
  useEffect(() => {
    document.title = title ? `${title} · IT Service Manager` : 'IT Service Manager'
  }, [title])
}
```

`document.title` está fuera de React: es un sistema externo. El título se **calcula** durante el renderizado (es un valor derivado de la ruta activa) y el efecto solo **sincroniza** ese valor con el exterior cada vez que cambia. Cada ruta declara su título en `handle: { title: 'Nueva aplicación' }` (Parte VII).

### Ejemplo 2: corregir una página fuera de rango

```tsx title="src/features/applications/pages/applications-list-page.tsx"
// Si la página solicitada queda fuera de rango (p. ej. tras cambiar datos), ir a la última.
const totalPages = query.data?.totalPages
useEffect(() => {
  if (totalPages !== undefined && totalPages > 0 && params.page > totalPages - 1) {
    updateParams({ page: totalPages - 1 }, { replace: true })
  }
}, [totalPages, params.page, updateParams])
```

Si el usuario tiene guardado un enlace a `?pagina=9` y ahora solo hay 4 páginas, el backend devuelve una página vacía. Cuando llegan los datos y se conoce `totalPages`, el efecto **sincroniza la URL** (un sistema externo, gestionado por el router) llevándola a la última página. `replace: true` sustituye la entrada del historial en lugar de añadir una, para que *atrás* no devuelva al usuario a la página inexistente.

### Cuándo NO usar un efecto

`useEffect` es el hook más usado de más. La documentación de React tiene un artículo entero titulado *You Might Not Need an Effect*. Las situaciones típicas en que **no** hace falta:

| En lugar de un efecto para… | Haz esto |
|---|---|
| Calcular un valor a partir de props o estado | Calcúlalo durante el renderizado (valor derivado, capítulo 7) |
| Responder a una acción del usuario (guardar, navegar) | Hazlo en el manejador del evento (`onSubmit`, `onClick`) |
| Reiniciar el estado cuando cambia una prop | Usa `key` (capítulo 7) |
| Pedir datos al servidor | Usa TanStack Query (Parte VI) |

::: decision Ningún efecto para pedir datos
El patrón clásico `useEffect(() => { fetch(…).then(setData) }, [id])` tiene problemas sutiles: condiciones de carrera si `id` cambia antes de que llegue la respuesta, ninguna caché, peticiones duplicadas, estados de carga y error gestionados a mano. En el proyecto no hay **ni un solo** `fetch` dentro de un efecto: todas las lecturas pasan por `useQuery`. Los únicos efectos del proyecto sincronizan el título del documento y la URL de los listados.
:::

### La limpieza

Si un efecto se suscribe a algo, debe darse de baja en la función de limpieza. Un ejemplo genérico (el proyecto no lo necesita):

```tsx
useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [])
```

Sin la limpieza, cada vez que el componente se montara se añadiría un oyente más, y seguirían activos tras desmontarse.

::: java
La limpieza es el `@PreDestroy` del efecto, o el `close()` de un `try-with-resources`: todo lo que el efecto abre, la limpieza lo cierra. La diferencia es que un efecto puede limpiarse y volver a ejecutarse muchas veces a lo largo de la vida del componente, cada vez que cambian sus dependencias.
:::

## `StrictMode` y la doble ejecución en desarrollo

`main.tsx` envuelve la aplicación en `<StrictMode>`. En **desarrollo** (nunca en producción), este modo hace dos cosas deliberadamente incómodas:

1. **Renderiza cada componente dos veces** y descarta uno de los resultados. Si un componente no es puro (por ejemplo, incrementa un contador global al renderizar), el resultado diferirá y el error aflorará pronto.
2. **Monta, desmonta y vuelve a montar** cada componente la primera vez, ejecutando los efectos, sus limpiezas y otra vez los efectos. Si un efecto no tiene la limpieza correcta, verás el síntoma de inmediato (dos oyentes, dos suscripciones…).

Por eso, en desarrollo, un `console.log` en el cuerpo de un componente aparece dos veces. No es un error: es React comprobando que tu código aguanta lo que en producción puede ocurrir de verdad (por ejemplo, con funcionalidades que conservan el estado de componentes ocultos y los vuelven a montar).

## `useMemo` y `useCallback`: estabilidad de referencias

Cada renderizado vuelve a ejecutar todo el cuerpo del componente. Eso significa que:

- Los cálculos se repiten.
- Los objetos, arrays y funciones creados en el cuerpo son **nuevos** en cada renderizado: `{ a: 1 } !== { a: 1 }`.

Lo primero rara vez importa. Lo segundo importa cuando ese objeto o función se usa como **dependencia** de un efecto o de otro hook: si cambia en cada renderizado, el efecto se ejecuta en cada renderizado.

- **`useMemo(fn, deps)`** ejecuta `fn` y guarda el resultado; en los siguientes renderizados devuelve **el mismo valor** (la misma referencia) mientras las dependencias no cambien.
- **`useCallback(fn, deps)`** hace lo mismo con una función: devuelve la **misma función** mientras las dependencias no cambien. Equivale a `useMemo(() => fn, deps)`.

### La cadena del listado de aplicaciones

El listado los usa juntos, y es un ejemplo muy bueno de por qué:

```tsx title="src/features/applications/pages/applications-list-page.tsx"
const [searchParams, setSearchParams] = useSearchParams()
const params = useMemo(() => parseListParams(searchParams), [searchParams])
const query = useApplications(params)

const updateParams = useCallback(
  (patch: Partial<ApplicationListParams>, options?: { replace?: boolean }) => {
    setSearchParams(serializeListParams({ ...params, ...patch }), options)
  },
  [params, setSearchParams],
)

useEffect(() => {
  if (totalPages !== undefined && totalPages > 0 && params.page > totalPages - 1) {
    updateParams({ page: totalPages - 1 }, { replace: true })
  }
}, [totalPages, params.page, updateParams])
```

Sigue la cadena de dependencias:

1. El efecto depende de `updateParams`. Si fuera una función nueva en cada renderizado, el efecto se ejecutaría en cada renderizado.
2. Por eso `updateParams` se envuelve en `useCallback`, que depende de `params`.
3. Si `params` fuera un objeto nuevo en cada renderizado (`parseListParams` crea uno cada vez que se llama), `updateParams` cambiaría siempre y el `useCallback` no serviría de nada.
4. Por eso `params` se envuelve en `useMemo`, que solo recalcula cuando cambia `searchParams`, es decir, cuando cambia la URL.

Resultado: mientras la URL no cambie, `params`, `updateParams` y el efecto permanecen estables.

### Memorizar un cálculo derivado

```ts title="src/features/demands/components/application-options.ts"
export function useApplicationSelectOptions(ensure?: { id: number; name: string }) {
  const query = useApplicationOptions()
  const ensureId = ensure?.id
  const ensureName = ensure?.name

  const options = useMemo<ApplicationOption[]>(() => {
    const list = (query.data?.content ?? []).map((app) => ({
      value: String(app.id), name: app.name, inactive: app.status === 'INACTIVE',
    }))
    if (ensureId !== undefined && ensureName && !list.some((o) => o.value === String(ensureId))) {
      list.unshift({ value: String(ensureId), name: ensureName, inactive: false })
    }
    return list
  }, [query.data, ensureId, ensureName])
  // …
}
```

Aquí `useMemo` evita transformar hasta mil aplicaciones en cada renderizado del formulario de demandas y, sobre todo, entrega al desplegable **la misma lista** mientras los datos no cambien. Fíjate en un detalle fino: las dependencias son `ensureId` y `ensureName` (valores primitivos), no el objeto `ensure`. Quien llama al hook suele escribir `useApplicationSelectOptions({ id, name })`, que crea un objeto nuevo en cada renderizado; si ese objeto fuera la dependencia, la memorización no serviría de nada.

::: atencion
`useMemo` y `useCallback` **no son gratis**: añaden código, una comparación de dependencias en cada renderizado y la posibilidad de olvidar una dependencia. Úsalos cuando haya un motivo concreto: un cálculo caro, o un valor que es dependencia de un efecto, de otro hook o de un componente memorizado. Envolver por defecto cada función en `useCallback` es un antipatrón frecuente. El proyecto los usa en media docena de sitios, todos justificados.
:::

## Hooks personalizados

Un **hook personalizado** es una función propia cuyo nombre empieza por `use` y que llama a otros hooks. Sirve para **extraer y reutilizar lógica con estado**, del mismo modo que un componente extrae y reutiliza interfaz. Ya has visto varios:

| Hook | Dónde | Qué encapsula |
|---|---|---|
| `useDocumentTitle()` | `app-layout.tsx` | Leer el título de la ruta activa y sincronizarlo con la pestaña |
| `useApplications(params)` | `applications-queries.ts` | La consulta paginada: clave de caché, función de petición, mantener la página anterior |
| `useApplication(id)` | `applications-queries.ts` | El detalle, sin reintentar los 404 |
| `useCreateApplication()` | `applications-queries.ts` | La mutación de alta y la actualización de la caché |
| `useApplicationSelectOptions()` | `application-options.ts` | El catálogo de aplicaciones listo para un desplegable |

Gracias a ellos, una página no sabe nada de claves de caché, de URLs de la API ni de reintentos: llama a `useApplications(params)` y recibe datos, estado de carga y errores.

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

Dos cosas importantes sobre los hooks personalizados:

- **Comparten lógica, no estado.** Si dos componentes llaman a `useDocumentTitle()`, cada uno tiene su propio efecto. (Los hooks de TanStack Query sí comparten datos entre componentes, pero porque la caché vive fuera, en el `QueryClient`, no por ser hooks.)
- **Siguen las reglas de los hooks**, y el prefijo `use` es lo que permite a ESLint comprobarlas.

::: java
Un hook personalizado se parece a un servicio de Spring que encapsula una operación, con una diferencia: no es un *singleton* compartido, sino lógica que se «instala» en cada componente que la llama, con su propio estado. Si necesitas algo compartido de verdad, ese algo vive fuera (una caché, un contexto) y el hook solo da acceso a él.
:::

## Los hooks de las librerías

Casi toda la funcionalidad de las librerías se consume mediante hooks. Esta tabla resume los que verás en el proyecto; cada uno tiene su explicación detallada en su parte.

| Hook | Librería | Qué devuelve |
|---|---|---|
| `useParams()` | React Router | Los parámetros de la ruta (`:id`) |
| `useSearchParams()` | React Router | Los parámetros de la URL y la función para cambiarlos |
| `useNavigate()` | React Router | Una función para navegar por código |
| `useLocation()`, `useMatches()` | React Router | La ruta actual y las rutas que encajan |
| `useQuery()`, `useMutation()` | TanStack Query | Lecturas y escrituras contra la API con su estado |
| `useQueryClient()` | TanStack Query | Acceso a la caché para invalidar o actualizar |
| `useForm()` | React Hook Form | El estado y las operaciones de un formulario |
| `useFormContext()`, `useWatch()` | React Hook Form | Acceso al formulario desde componentes hijos; observar un campo |
| `useId()` | React | Un identificador único y estable para enlazar etiquetas y campos |

## Otros hooks de React

React incluye más hooks, menos frecuentes en una aplicación de gestión:

- **`useRef`**: guarda un valor mutable que **no** provoca renderizados al cambiar, o una referencia a un elemento del DOM (`ref={inputRef}` para darle el foco). Es la vía de escape para lo que no encaja en el modelo declarativo.
- **`useReducer`**: alternativa a `useState` para estados complejos con muchas transiciones, al estilo de una máquina de estados con acciones.
- **`useContext`**: lee un contexto (capítulo 9).
- **`useTransition`**, **`useDeferredValue`**: marcan actualizaciones como no urgentes para mantener la interfaz fluida.
- **`use`**, **`useActionState`**, **`useOptimistic`**: novedades de React 19 para leer promesas y contextos, gestionar el estado de acciones de formularios y mostrar resultados optimistas. En el proyecto, esas necesidades las cubren TanStack Query y React Hook Form.

## Errores típicos y depuración

- **`React Hook "useX" is called conditionally`.** Has llamado a un hook dentro de un `if` o después de un `return`. Muévelo arriba o extrae un componente.
- **Bucle infinito de peticiones o renderizados con un efecto.** Una dependencia es un objeto o función que cambia en cada renderizado, o el efecto actualiza un estado que es su propia dependencia. Revisa la cadena de dependencias como en la sección 8.4.
- **Datos antiguos dentro de un efecto o un *callback*.** Falta una dependencia, y la función «ve» los valores de un renderizado antiguo (un *closure* obsoleto). No silencies el aviso de `exhaustive-deps`: añade la dependencia.
- **Todo aparece dos veces en consola.** Es `StrictMode` en desarrollo (sección 8.3).
- **El efecto se ejecuta antes de que exista el elemento.** No ocurre: los efectos se ejecutan después del *commit*. Si necesitas medir el DOM antes de que el navegador pinte, existe `useLayoutEffect`, pero es raro necesitarlo.

En la pestaña *Components* de React DevTools, los hooks de cada componente aparecen numerados en el panel derecho, en el orden de llamada: es exactamente la lista de la figura 8.1.

## Ejercicios

::: ejercicio Escribe un hook personalizado
Crea en `src/lib/` (o en `src/hooks/`, que el proyecto tiene previsto como alias en `components.json`) un hook `useMediaQuery(query: string): boolean` que devuelva si una consulta de medios CSS se cumple, por ejemplo `'(min-width: 1024px)'`. Usa `window.matchMedia`, un `useState` y un `useEffect` que se suscriba al evento `change` y se dé de baja en la limpieza. Pruébalo mostrando temporalmente «Escritorio» o «Móvil» en la cabecera, y redimensiona la ventana.
:::

::: ejercicio Provoca un bucle con dependencias inestables
En `applications-list-page.tsx`, sustituye temporalmente `useMemo(() => parseListParams(searchParams), [searchParams])` por `parseListParams(searchParams)` a secas. Ejecuta `npm run lint`: ¿qué te dice ESLint? Abre el listado con la pestaña *Profiler* grabando y cambia de página. ¿Se producen renderizados de más? Razona por qué el efecto no provoca un bucle infinito en este caso concreto (pista: mira la condición dentro del efecto). Restaura el código.
:::

::: ejercicio Elimina un efecto innecesario
Este componente hipotético usa un efecto que sobra. Reescríbelo sin `useEffect` y explica por qué tu versión es mejor:

```tsx
function DemandCount({ demands }: { demands: Demand[] }) {
  const [openCount, setOpenCount] = useState(0)
  useEffect(() => {
    setOpenCount(demands.filter((d) => d.status === 'OPEN').length)
  }, [demands])
  return <span>{openCount} abiertas</span>
}
```
:::

## Autoevaluación

::: preguntas
1. ¿Por qué no se puede llamar a un hook dentro de un `if`?
2. ¿Cuál es la forma correcta de pensar en `useEffect`?
3. ¿Qué tres situaciones típicas no necesitan un efecto y qué se hace en su lugar?
4. ¿Qué hace la función de limpieza y cuándo se ejecuta?
5. ¿Qué dos cosas hace `StrictMode` en desarrollo y para qué?
6. ¿Por qué el listado de aplicaciones necesita `useMemo` en `params` para que el `useCallback` de `updateParams` sirva de algo?
7. ¿Por qué `useApplicationSelectOptions` usa `ensureId` y `ensureName` como dependencias en lugar de `ensure`?
8. ¿Qué comparten dos componentes que llaman al mismo hook personalizado?
:::
