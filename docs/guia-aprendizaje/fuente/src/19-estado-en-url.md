# El estado del listado en la URL

<p class="lead">Los filtros, la página, el tamaño y el orden de los listados no viven en el estado de React, sino en la barra de direcciones. Esta decisión, aparentemente pequeña, condiciona el diseño de las páginas de listado, de varias funciones de <code>lib/</code> y de sus pruebas. Este capítulo explica el porqué, el diseño de los parámetros y el ciclo completo desde un clic hasta la petición al backend.</p>

## Por qué en la URL

Compara dos versiones del listado de aplicaciones. En la primera, los filtros se guardan con `useState`; en la segunda, en la URL.

| Situación | Con `useState` | Con la URL |
|---|---|---|
| El usuario recarga la página (F5) | Pierde filtros, página y orden | Lo conserva todo |
| Envía el enlace a un compañero («mira estas aplicaciones críticas inactivas») | El compañero ve el listado sin filtrar | Ve exactamente lo mismo |
| Guarda la vista en marcadores | Imposible | Funciona |
| Entra en un detalle y pulsa *atrás* | Vuelve al listado reiniciado (página 1, sin filtros) | Vuelve a la misma página con los mismos filtros |
| Recorre las páginas y pulsa *atrás* | Sale del listado | Vuelve a la página anterior del listado |

Para un listado de gestión, que el usuario consulta, filtra y comparte a diario, la diferencia es enorme. Por eso el proyecto lo trata como **estado de navegación** (capítulo 7). El selector del catálogo de *Modificar aplicación* es la excepción consciente: es un componente auxiliar y usa `useState`.

::: java
Es lo mismo que en una aplicación JSP o Thymeleaf bien hecha: un formulario de búsqueda con `method="GET"` deja los criterios en la URL (`/aplicaciones?estado=ACTIVE&page=2`), y el controlador los lee con `@RequestParam`. En una SPA es fácil caer en la tentación de guardarlo todo en memoria y perder esas ventajas; el proyecto las recupera de forma deliberada.
:::

## El diseño de los parámetros

```text
/aplicaciones?estado=INACTIVE&criticidad=HIGH&pagina=3&tamano=20&orden=name,desc
/demandas?aplicacion=7&estado=OPEN&prioridad=CRITICAL&orden=updatedAt,desc
```

| Decisión | Motivo |
|---|---|
| Nombres en español (`estado`, `pagina`, `tamano`, `orden`) | La URL forma parte de la interfaz que ve el usuario |
| Valores con los códigos del backend (`INACTIVE`, `HIGH`) | Son estables e inequívocos; las etiquetas pueden cambiar o traducirse |
| Páginas desde 1 | Es como cuenta un usuario; Spring Data cuenta desde 0 y la conversión se hace en el código |
| Orden como `campo,dirección` | Mismo formato que el `sort` de Spring Data, fácil de leer |
| **Se omiten los valores por defecto** | La URL del listado sin filtros es simplemente `/aplicaciones`, limpia y estable |
| Sin `ñ` ni tildes (`tamano`, `pagina`) | Evitan la codificación `%C3%B1` en la barra de direcciones |

Los nombres de los parámetros de paginación son comunes a todos los listados:

```ts title="src/lib/list-params.ts"
/** Nombres de los parámetros de paginación en la URL (comunes a todos los listados). */
export const PAGINATION_URL_KEYS = { page: 'pagina', size: 'tamano', sort: 'orden' } as const
```

## El ciclo completo

El capítulo 14 presentó las tres representaciones del estado de un listado. Este es el ciclo que las conecta cuando el usuario cambia algo:

<figure>
<svg viewBox="0 0 680 290" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="9.5">
  <defs><marker id="a19" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="250" y="10" width="180" height="44" rx="8" fill="#fff7ed" stroke="#fdba74"/><text x="340" y="28" text-anchor="middle" font-weight="700">1 · Clic en «Página 3»</text><text x="340" y="44" text-anchor="middle" font-size="8.5">onPageChange(2)</text>
  <rect x="470" y="70" width="200" height="50" rx="8" fill="#ecfeff" stroke="#0891b2"/><text x="570" y="90" text-anchor="middle" font-weight="700">2 · updateParams({ page: 2 })</text><text x="570" y="106" text-anchor="middle" font-size="8.5">serializeListParams({...params, ...patch})</text>
  <rect x="470" y="150" width="200" height="50" rx="8" fill="#0b1220"/><text x="570" y="170" text-anchor="middle" font-weight="700" fill="#fff">3 · setSearchParams(…)</text><text x="570" y="186" text-anchor="middle" font-size="8.5" fill="#a5f3fc">URL: ?pagina=3 · nueva entrada en el historial</text>
  <rect x="250" y="230" width="180" height="50" rx="8" fill="#ecfeff" stroke="#0891b2"/><text x="340" y="250" text-anchor="middle" font-weight="700">4 · El router renderiza</text><text x="340" y="266" text-anchor="middle" font-size="8.5">useSearchParams() → parseListParams()</text>
  <rect x="10" y="150" width="200" height="50" rx="8" fill="#ecfeff" stroke="#0891b2"/><text x="110" y="170" text-anchor="middle" font-weight="700">5 · useApplications(params)</text><text x="110" y="186" text-anchor="middle" font-size="8.5">clave nueva: [..., 'list', {page: 2, …}]</text>
  <rect x="10" y="70" width="200" height="50" rx="8" fill="#fff7ed" stroke="#fdba74"/><text x="110" y="90" text-anchor="middle" font-weight="700">6 · GET /api/applications</text><text x="110" y="106" text-anchor="middle" font-size="8.5">toApiQuery → ?page=2&amp;size=10&amp;sort=id,asc</text>
  <g stroke="#0891b2" stroke-width="1.4" fill="none">
    <path d="M430,32 C520,32 570,45 570,68" marker-end="url(#a19)"/>
    <line x1="570" y1="120" x2="570" y2="148" marker-end="url(#a19)"/>
    <path d="M570,200 C570,240 500,255 432,255" marker-end="url(#a19)"/>
    <path d="M250,255 C150,255 110,230 110,202" marker-end="url(#a19)"/>
    <line x1="110" y1="150" x2="110" y2="122" marker-end="url(#a19)"/>
    <path d="M110,70 C110,40 180,32 248,32" marker-end="url(#a19)" stroke-dasharray="4 3"/>
  </g>
  <text x="150" y="40" font-size="8.5" fill="#0e7490">7 · llegan los datos</text>
  <text x="340" y="140" text-anchor="middle" font-size="9" fill="#475569">La URL es la única</text>
  <text x="340" y="153" text-anchor="middle" font-size="9" fill="#475569">fuente de verdad:</text>
  <text x="340" y="166" text-anchor="middle" font-size="9" fill="#475569">la página no guarda</text>
  <text x="340" y="179" text-anchor="middle" font-size="9" fill="#475569">ninguna copia</text>
</svg>
<figcaption><b>Figura 19.1.</b> Del clic a la petición. La página nunca modifica los parámetros directamente: modifica la URL y vuelve a leerla.</figcaption>
</figure>

La idea clave es que **la URL es la única fuente de verdad**. La página no tiene un `useState` con los filtros que haya que mantener sincronizado con la URL: los **calcula** a partir de ella en cada renderizado. Cuando el usuario pulsa *atrás*, la URL cambia, la página se vuelve a renderizar con los parámetros anteriores, y TanStack Query sirve esos datos desde la caché. No hay ningún código específico para el botón *atrás*: funciona solo.

## Leer y validar

```tsx title="src/features/applications/pages/applications-list-page.tsx"
const [searchParams, setSearchParams] = useSearchParams()
const params = useMemo(() => parseListParams(searchParams), [searchParams])
```

`useSearchParams` de React Router devuelve un objeto `URLSearchParams` con la consulta actual y una función para cambiarla. `parseListParams` lo convierte en un `ApplicationListParams` tipado y **válido**:

```ts title="src/features/applications/model/list-params.ts"
export function parseListParams(search: URLSearchParams): ApplicationListParams {
  const sort = parseSortParam(search.get('orden'), APPLICATION_SORT_FIELDS, {
    field: DEFAULT_LIST_PARAMS.sortField,
    direction: DEFAULT_LIST_PARAMS.sortDirection,
  })
  return {
    status: parseEnumParam(APPLICATION_STATUSES, search.get('estado')),
    criticality: parseEnumParam(APPLICATION_CRITICALITIES, search.get('criticidad')),
    page: parsePageParam(search.get('pagina'), DEFAULT_LIST_PARAMS.page),
    size: parseSizeParam(search.get('tamano'), DEFAULT_LIST_PARAMS.size),
    sortField: sort.field,
    sortDirection: sort.direction,
  }
}
```

Cada parámetro se valida con una función genérica de `lib/list-params.ts`, y **cualquier valor no válido se sustituye por el valor por defecto** en lugar de provocar un error:

| Función | Acepta | Ejemplos rechazados |
|---|---|---|
| `parseEnumParam(allowed, value)` | Solo valores de la lista | `estado=FOO`, `estado=active` (mayúsculas obligatorias) |
| `parsePageParam(value)` | Enteros ≥ 1 en la URL; devuelve página 0-based | `pagina=0`, `pagina=-1`, `pagina=abc` |
| `parseSizeParam(value, fallback)` | Solo las opciones del selector: 5, 10, 20, 50 | `tamano=7`, `tamano=10000` |
| `parseSortParam(value, fields, fallback)` | Campo de la lista y dirección `asc`/`desc`, validados por separado | `orden=password,up` → campo y dirección por defecto |
| `parseIdParam(value)` | Enteros positivos | `aplicacion=0`, `aplicacion=1.5` |

¿Por qué tanto rigor? Porque **la URL es una entrada del usuario**: puede venir de un enlace antiguo, de un marcador de cuando existían otros filtros o de alguien que la edita a mano. Validarla evita enviar al backend valores que no entiende (que responderían con un 400 o, como vimos en el capítulo 14, con un error por campo de ordenación no admitido) y limita lo que se puede pedir: nadie puede solicitar una página de diez mil elementos cambiando `tamano`.

::: java
Es la validación de `@RequestParam` que harías con Bean Validation o con un `Converter` de Spring, pero con una política distinta: en lugar de responder 400, se corrige silenciosamente al valor por defecto. Para una URL que escribe o pega el usuario, «mostrar algo razonable» es mejor experiencia que una pantalla de error.
:::

## Escribir

El camino inverso convierte los parámetros en URL **omitiendo los valores por defecto**:

```ts title="src/features/applications/model/list-params.ts"
/** Serializa a URL omitiendo los valores por defecto para mantenerla limpia. */
export function serializeListParams(params: ApplicationListParams): URLSearchParams {
  const search = new URLSearchParams()
  if (params.status) search.set('estado', params.status)
  if (params.criticality) search.set('criticidad', params.criticality)
  writePaginationParams(search, params, DEFAULT_LIST_PARAMS)
  return search
}
```

```ts title="src/lib/list-params.ts"
/** Escribe paginación y orden en la URL omitiendo los valores por defecto. */
export function writePaginationParams(search, current, defaults): void {
  if (current.page > 0) search.set(PAGINATION_URL_KEYS.page, String(current.page + 1))
  if (current.size !== defaults.size) search.set(PAGINATION_URL_KEYS.size, String(current.size))
  if (current.sortField !== defaults.sortField || current.sortDirection !== defaults.sortDirection) {
    search.set(PAGINATION_URL_KEYS.sort, `${current.sortField},${current.sortDirection}`)
  }
}
```

Lectura y escritura son **inversas**: serializar unos parámetros y volver a leerlos debe dar exactamente los mismos parámetros. Es una propiedad que se prueba explícitamente (sección 19.10).

## Actualizar desde la página

Todos los cambios pasan por una única función de la página:

```tsx title="src/features/applications/pages/applications-list-page.tsx"
const updateParams = useCallback(
  (patch: Partial<ApplicationListParams>, options?: { replace?: boolean }) => {
    setSearchParams(serializeListParams({ ...params, ...patch }), options)
  },
  [params, setSearchParams],
)
```

Recibe solo lo que cambia (`Partial<…>`), lo combina con los parámetros actuales, serializa y escribe la URL. Los componentes la usan así:

```tsx title="src/features/applications/pages/applications-list-page.tsx"
<ApplicationFilters … onChange={(filters) => updateParams({ ...filters, page: 0 })} />
<PaginationBar …
  onPageChange={(page) => updateParams({ page })}
  onSizeChange={(size) => updateParams({ size, page: 0 })}
/>
const handleSortChange = (field: ApplicationSortField) => updateParams({ ...nextSort(params, field), page: 0 })
```

Fíjate en `page: 0` en los filtros, en el tamaño y en el orden. **Cualquier cambio que altere el conjunto de resultados o su orden vuelve a la primera página.** Si el usuario está en la página 5 y filtra por *Crítica*, quizá solo haya una página de resultados; y si cambia el orden, «la página 5» deja de tener sentido. Solo el cambio de página conserva lo demás.

`nextSort` decide la siguiente ordenación al pulsar una cabecera: si es la misma columna, alterna entre ascendente y descendente; si es otra, empieza en ascendente.

### Corregir una página fuera de rango

Si el usuario abre un enlace guardado con `?pagina=9` y ahora solo hay 4 páginas, el backend devuelve una página vacía. El efecto que vimos en el capítulo 8 lo corrige cuando llegan los datos:

```tsx title="src/features/applications/pages/applications-list-page.tsx"
const totalPages = query.data?.totalPages
useEffect(() => {
  if (totalPages !== undefined && totalPages > 0 && params.page > totalPages - 1) {
    updateParams({ page: totalPages - 1 }, { replace: true })
  }
}, [totalPages, params.page, updateParams])
```

## El historial: añadir o sustituir

| Acción | Historial | Motivo |
|---|---|---|
| Cambiar de página, filtro, tamaño u orden | Añade una entrada | El usuario espera que *atrás* deshaga su última acción de navegación |
| Corrección automática de página fuera de rango | Sustituye la entrada | No es una acción del usuario; volver a la página inexistente no tiene sentido |

Una consecuencia interesante: como cada cambio crea una entrada, pulsar *atrás* varias veces recorre el historial de filtros y páginas del usuario. Hay equipos que prefieren que los filtros usen `replace` para que *atrás* salga directamente del listado. Ambas opciones son razonables; lo importante es elegirla de forma consciente y aplicarla igual en todos los listados.

## La URL y la caché, juntas

Cada combinación de parámetros es una clave distinta de TanStack Query (capítulo 17). La URL y la caché forman así un sistema muy eficiente:

- Volver a una combinación ya visitada en los últimos 30 segundos no hace ninguna petición.
- El botón *atrás* muestra al instante el listado anterior, con su página y sus filtros.
- Los parámetros por defecto se omiten de la URL, pero sí forman parte de la clave: `/aplicaciones` y `/aplicaciones?pagina=1` producen los mismos parámetros y, por tanto, la misma entrada de caché.

## Enlaces profundos entre pantallas

Al vivir en la URL, el estado de un listado se puede **construir desde otra pantalla** con un simple enlace:

```tsx title="src/features/applications/pages/application-detail-page.tsx"
<Link to={`/demandas?aplicacion=${id}`}>
  <ClipboardList /> Ver demandas
</Link>
```

El detalle de una aplicación lleva al listado de demandas ya filtrado por ella, sin compartir ningún estado entre módulos: el listado de demandas lee `aplicacion` de la URL como si lo hubiera elegido el usuario en el filtro. Del mismo modo, la página de alta de demandas lee `?aplicacion=3` para preseleccionar la aplicación (capítulo 22).

## Pruebas

Las funciones de lectura y escritura son funciones puras, el candidato perfecto para pruebas unitarias:

```ts title="src/features/applications/model/list-params.test.ts (extracto)"
it('descarta valores no válidos en la URL', () => {
  const params = parseListParams(
    new URLSearchParams('estado=FOO&criticidad=x&pagina=-1&tamano=7&orden=password,up'),
  )
  expect(params).toEqual({ ...DEFAULT_LIST_PARAMS, status: undefined, criticality: undefined })
})

it('serializa omitiendo los valores por defecto y es reversible', () => {
  expect(serializeListParams(DEFAULT_LIST_PARAMS).toString()).toBe('')
  const original = { status: 'ACTIVE' as const, criticality: 'CRITICAL' as const, page: 1, size: 50,
                     sortField: 'status' as const, sortDirection: 'desc' as const }
  expect(parseListParams(serializeListParams(original))).toEqual(original)
})
```

La segunda prueba comprueba las dos propiedades clave del diseño: los valores por defecto producen una URL vacía, y serializar y volver a leer es la identidad. Las funciones genéricas tienen sus propias pruebas en `src/lib/list-params.test.ts`.

::: decision El estado de los listados vive en la URL
**Decisión.** Filtros, página, tamaño y orden de los listados principales se guardan en la URL, con nombres en español, páginas desde 1 y valores por defecto omitidos. La página los deriva de la URL en cada renderizado, los valida con funciones puras y probadas, y los actualiza escribiendo la URL.

**Motivos.** Recargar, compartir, guardar y navegar con el historial funcionan sin código adicional, y la URL se convierte en la única fuente de verdad, sin copias que sincronizar.

**Coste.** Más código que un `useState`: funciones de lectura, escritura y validación por módulo, y la disciplina de no guardar copias del estado. Las partes genéricas se escribieron una vez en `lib/list-params.ts`.

**Alternativas.** Estado local (solo para listados auxiliares, como el selector del catálogo); librerías como `nuqs`, que gestionan parámetros de URL tipados con una API parecida a `useState`; TanStack Router, que valida los parámetros de búsqueda con esquemas.
:::

## Errores típicos y depuración

- **El listado no se actualiza al cambiar un filtro.** Se está guardando el filtro en un `useState` en lugar de en la URL, o `params` no se recalcula porque falta `searchParams` en las dependencias del `useMemo`.
- **Al filtrar, aparece una página vacía.** No se ha reiniciado `page: 0` al cambiar el filtro.
- **La URL se llena de valores por defecto** (`?pagina=1&tamano=10&orden=id,asc`). Falta omitirlos al serializar.
- **Un valor de la URL produce un error del backend.** No se ha validado al leer: añade el valor a la lista permitida o corrige la función de lectura.
- **El botón *atrás* no vuelve a la página anterior del listado.** Se está usando `replace` donde debería añadirse una entrada, o se navega por otro mecanismo que no pasa por el router.

## Ejercicios

::: ejercicio Añade un filtro de texto a la URL
Imagina que el backend añade un parámetro `name` para buscar aplicaciones por nombre. Añade al listado un campo de búsqueda cuyo valor viva en la URL como `?buscar=…`: amplía `ApplicationListParams`, `parseListParams`, `serializeListParams`, `toApiQuery` y sus pruebas. ¿Debería cada pulsación de tecla crear una entrada en el historial? ¿Y una petición al backend? Investiga qué es un *debounce* y propón cómo aplicarlo.
:::

::: ejercicio Escribe una prueba que falle
En `list-params.test.ts` de demandas, escribe una prueba que compruebe que `parseDemandListParams` descarta `?orden=createdAt,asc`. Ejecútala: ¿pasa o falla con el código actual? Relaciónalo con el desajuste del capítulo 14 y explica qué cambio en `DEMAND_SORT_FIELDS` la haría pasar.
:::

::: ejercicio Extrae un hook genérico
Las páginas de listado de aplicaciones y demandas repiten la lectura de la URL con `useMemo`, la función `updateParams` con `useCallback` y el efecto de corrección de página. Escribe en `src/lib/` (o en `src/hooks/`) un hook `useUrlListState<P>(parse, serialize)` que devuelva `{ params, updateParams }` y úsalo en ambas páginas. ¿Dónde dejarías el efecto de corrección de página y por qué?
:::

## Autoevaluación

::: preguntas
1. Enumera cuatro situaciones en las que guardar el estado del listado en la URL mejora la experiencia frente a `useState`.
2. ¿Por qué la URL usa los códigos del backend (`ACTIVE`) y no las etiquetas (*Activa*)?
3. ¿Por qué se omiten los valores por defecto al escribir la URL?
4. ¿Qué significa que la URL sea la única fuente de verdad del listado?
5. ¿Qué ocurre si la URL contiene `?tamano=10000&estado=FOO`?
6. ¿Por qué los cambios de filtro, tamaño y orden reinician la página a 0?
7. ¿Cuándo se usa `replace` al escribir la URL del listado y por qué?
8. ¿Cómo consigue el detalle de una aplicación abrir el listado de demandas ya filtrado?
9. ¿Qué dos propiedades del diseño comprueba la prueba de reversibilidad?
:::
