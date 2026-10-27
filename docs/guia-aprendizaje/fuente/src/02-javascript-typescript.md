# JavaScript moderno y TypeScript para un desarrollador Java

<p class="lead">Todo el proyecto está escrito en TypeScript. Este capítulo recorre lo imprescindible del lenguaje con ejemplos sacados del propio código, y se detiene en las diferencias con Java que más confunden al principio: el tipado estructural, las uniones de literales, <code>null</code> frente a <code>undefined</code> y, sobre todo, que los tipos desaparecen al ejecutar.</p>

## JavaScript y TypeScript: qué es cada uno

**JavaScript** es el único lenguaje de programación que ejecutan los navegadores. Su nombre oficial es ECMAScript; desde 2015 (ES2015, también llamado ES6) recibe una versión nueva cada año, y el JavaScript «moderno» de este capítulo es el de esas versiones: `const`, funciones flecha, módulos, clases, `async`/`await`… Es un lenguaje **dinámicamente tipado**: una variable puede contener un número y, tres líneas después, un texto.

**TypeScript** es un **superconjunto** de JavaScript creado por Microsoft: todo JavaScript válido es TypeScript válido, y TypeScript añade una capa de **tipos estáticos** que el compilador comprueba. Al compilar, los tipos se **eliminan** y el resultado es JavaScript corriente.

<figure>
<svg viewBox="0 0 680 190" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10.5">
  <defs><marker id="a3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="10" y="30" width="200" height="120" rx="8" fill="#ecfeff" stroke="#0891b2"/>
  <text x="110" y="52" text-anchor="middle" font-weight="700">applications-api.ts</text>
  <text x="22" y="76" font-family="DejaVu Sans Mono" font-size="9">list: (params: <tspan fill="#0e7490" font-weight="700">ApplicationListParams</tspan>)</text>
  <text x="22" y="92" font-family="DejaVu Sans Mono" font-size="9">  =&gt; apiClient.get&lt;<tspan fill="#0e7490" font-weight="700">ApplicationPage</tspan>&gt;(</text>
  <text x="22" y="108" font-family="DejaVu Sans Mono" font-size="9">       BASE_PATH, toApiQuery(params))</text>
  <text x="110" y="138" text-anchor="middle" font-size="9" fill="#0e7490">tipos visibles para el compilador</text>
  <line x1="210" y1="90" x2="268" y2="90" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a3)"/>
  <rect x="270" y="45" width="140" height="90" rx="8" fill="#0b1220"/>
  <text x="340" y="72" text-anchor="middle" font-weight="700" fill="#fff">Compilación</text>
  <text x="340" y="92" text-anchor="middle" font-size="9" fill="#a5f3fc">tsc: comprueba tipos</text>
  <text x="340" y="106" text-anchor="middle" font-size="9" fill="#a5f3fc">Vite: borra tipos</text>
  <text x="340" y="120" text-anchor="middle" font-size="9" fill="#a5f3fc">(sin comprobarlos)</text>
  <line x1="410" y1="90" x2="468" y2="90" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a3)"/>
  <rect x="470" y="30" width="200" height="120" rx="8" fill="#f8fafc" stroke="#94a3b8"/>
  <text x="570" y="52" text-anchor="middle" font-weight="700">JavaScript ejecutado</text>
  <text x="482" y="76" font-family="DejaVu Sans Mono" font-size="9">list: (params)</text>
  <text x="482" y="92" font-family="DejaVu Sans Mono" font-size="9">  =&gt; apiClient.get(</text>
  <text x="482" y="108" font-family="DejaVu Sans Mono" font-size="9">       BASE_PATH, toApiQuery(params))</text>
  <text x="570" y="138" text-anchor="middle" font-size="9" fill="#475569">ningún tipo llega al navegador</text>
  <text x="340" y="180" text-anchor="middle" font-size="9.5" fill="#475569">Si el backend devuelve otra forma de JSON, nada lo detecta en ejecución.</text>
</svg>
<figcaption><b>Figura 2.1.</b> El borrado de tipos: TypeScript protege en tiempo de compilación, no en tiempo de ejecución.</figcaption>
</figure>

::: java
Java también borra información de tipos (los genéricos, por *type erasure*), pero conserva las clases en ejecución: puedes hacer `instanceof Application` o leer anotaciones por reflexión. En TypeScript **una `interface` no existe en ejecución**: no hay `instanceof Application`, ni reflexión, ni nada que Jackson pueda usar para validar al deserializar. Es la idea más importante del capítulo, y volveremos a ella en la sección 2.6.
:::

## Lo esencial de JavaScript moderno

### Variables: `const` y `let`

```ts
const BASE_PATH = '/applications'   // no se puede reasignar
let response: Response              // se puede reasignar
```

Usa `const` por defecto y `let` solo si necesitas reasignar. Verás `var` en código antiguo: no lo uses, porque su ámbito es la función entera y no el bloque. `const` impide **reasignar la variable**, no modificar el objeto: `const lista = []` admite `lista.push(1)`, igual que una referencia `final` en Java.

### Tipos primitivos, `null` y `undefined`

JavaScript tiene pocos tipos primitivos: `string`, `number` (no hay `int`, `long` ni `double`: todos los números son de coma flotante de 64 bits), `boolean`, `bigint`, `symbol`, y **dos** valores de ausencia:

- `undefined`: «no se ha asignado nada». Es lo que vale una variable sin inicializar, un parámetro que no se ha pasado o una propiedad que no existe.
- `null`: «se ha asignado explícitamente un vacío».

El backend serializa a `null` los campos sin valor (`description: null`), mientras que en el frontend usamos `undefined` para «filtro no seleccionado». Ambas convenciones conviven en el proyecto, como veremos en los tipos.

::: atencion
Compara siempre con `===` y `!==` (igualdad estricta). El operador `==` convierte tipos antes de comparar y produce resultados sorprendentes: `0 == ''` es `true`. La única excepción aceptada por muchos equipos es `x == null`, que es cierto tanto para `null` como para `undefined`.
:::

### Valores «verdaderos» y «falsos»

En una condición, JavaScript convierte cualquier valor a booleano. Son **falsos** (*falsy*): `false`, `0`, `''`, `null`, `undefined` y `NaN`. Todo lo demás es **verdadero** (*truthy*), incluidos `[]` y `{}`. El proyecto lo aprovecha a menudo:

```tsx title="src/features/applications/pages/applications-list-page.tsx"
const hasFilters = !!params.status || !!params.criticality
```

`!!x` convierte cualquier valor a su booleano equivalente: `!!undefined` es `false`; `!!'ACTIVE'` es `true`.

### Objetos y arrays literales

Un objeto se crea directamente, sin clase:

```ts title="src/features/applications/model/constants.ts"
export const DEFAULT_LIST_PARAMS: ApplicationListParams = {
  page: 0,
  size: 10,
  sortField: 'id',
  sortDirection: 'asc',
}
```

### Desestructuración

Extrae propiedades de un objeto o posiciones de un array en variables:

```ts title="src/lib/api-client.ts"
const { method = 'GET', query, body, signal } = options
```

Equivale a cuatro asignaciones `const method = options.method ?? 'GET'`, etc.; el `= 'GET'` es un valor por defecto si la propiedad es `undefined`. Con arrays se desestructura por posición:

```ts title="src/lib/list-params.ts"
const [field, direction] = (value ?? '').split(',')
```

Verás la desestructuración constantemente en React: en los parámetros de los componentes (`function PageHeader({ title, description })`) y en los hooks (`const [open, setOpen] = useState(true)`).

### El operador de propagación (*spread*)

Los tres puntos copian las propiedades de un objeto (o los elementos de un array) dentro de otro:

```tsx title="src/features/applications/pages/applications-list-page.tsx"
setSearchParams(serializeListParams({ ...params, ...patch }), options)
```

`{ ...params, ...patch }` crea un **objeto nuevo** con todas las propiedades de `params` y, encima, las de `patch`: si ambos tienen `page`, gana la de `patch`. Es la forma idiomática de «actualizar» un objeto sin modificar el original, algo esencial en React (capítulo 7).

::: java
Es el equivalente de un *builder* `toBuilder().page(2).build()` o de un `record` con un método *wither*: no se muta el objeto; se crea uno nuevo con los cambios. Los objetos de JavaScript son mutables, pero en el código de React se tratan **como si fueran inmutables**.
:::

### Funciones flecha y funciones como valores

En JavaScript las funciones son valores: se guardan en variables, se pasan como argumentos y se devuelven. La sintaxis más usada es la **función flecha**:

```ts
const doble = (n: number) => n * 2              // cuerpo de una expresión: return implícito
const saluda = (nombre: string) => {             // cuerpo de bloque: return explícito
  const texto = `Hola, ${nombre}`
  return texto
}
```

Todo el objeto `applicationsApi` es un conjunto de funciones flecha guardadas en propiedades:

```ts title="src/features/applications/api/applications-api.ts"
export const applicationsApi = {
  list: (params: ApplicationListParams, signal?: AbortSignal) =>
    apiClient.get<ApplicationPage>(BASE_PATH, toApiQuery(params), signal),

  getById: (id: number, signal?: AbortSignal) =>
    apiClient.get<Application>(`${BASE_PATH}/${id}`, undefined, signal),
  // …
}
```

Y los componentes reciben funciones como propiedades para avisar de lo que ocurre (*callbacks*):

```tsx title="src/features/applications/pages/applications-list-page.tsx"
<PaginationBar
  onPageChange={(page) => updateParams({ page })}
  onSizeChange={(size) => updateParams({ size, page: 0 })}
/>
```

`{ page }` es una abreviatura de `{ page: page }`: si la variable se llama igual que la propiedad, basta con escribirla una vez.

::: java
Las funciones flecha son las lambdas de Java, con dos diferencias: no hace falta ninguna interfaz funcional (`Function<T,R>`, `Consumer<T>`…) porque el tipo es la propia firma, `(page: number) => void`; y pueden capturar y **modificar** variables del ámbito exterior, no solo leer variables *efectivamente finales*.
:::

### Plantillas de texto

Las comillas invertidas permiten interpolar expresiones y escribir varias líneas:

```ts title="src/lib/api-client.ts"
const url = `${API_BASE_URL}${path}${buildQueryString(query)}`
```

### Métodos de array

Los arrays traen métodos equivalentes a los de `java.util.stream`, pero sin `stream()` ni `collect()`: cada uno devuelve directamente un nuevo array o un valor.

| JavaScript | Java Streams | Uso en el proyecto |
|---|---|---|
| `map(fn)` | `map(fn).toList()` | Construir las opciones de un filtro a partir de los valores del enum |
| `filter(fn)` | `filter(fn).toList()` | Descartar elementos |
| `find(fn)` | `filter(fn).findFirst()` | Encontrar el título de la ruta activa |
| `some(fn)`, `every(fn)` | `anyMatch`, `allMatch` | Comprobaciones |
| `includes(x)` | `contains(x)` | Validar que un valor de la URL es un estado permitido |
| `reduce(fn, ini)` | `reduce(ini, fn)` | Acumular |

```ts title="src/features/applications/components/application-filters.tsx"
const STATUS_OPTIONS = APPLICATION_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
  hint: value,
}))
```

Fíjate en los paréntesis alrededor de `{ … }`: sin ellos, las llaves se interpretarían como el cuerpo de la función y no como un objeto devuelto.

Un ejemplo encadenado, del layout:

```ts title="src/components/layout/app-layout.tsx"
const title = [...matches]
  .reverse()
  .map((m) => (m.handle as { title?: string } | undefined)?.title)
  .find(Boolean)
```

`[...matches]` copia el array (porque `reverse()` modifica el original, una excepción incómoda en la API de arrays), lo invierte, extrae el título de cada ruta y se queda con el primero que no sea vacío: `find(Boolean)` usa la propia función `Boolean` como predicado.

### Encadenamiento opcional y fusión de nulos

Dos operadores ahorran gran cantidad de comprobaciones de nulos:

```ts
const totalPages = query.data?.totalPages        // undefined si data es null/undefined
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'   // valor por defecto
```

- `a?.b` devuelve `undefined` si `a` es `null` o `undefined`, en lugar de lanzar un error. También funciona con llamadas: `onNavigate?.()`.
- `a ?? b` devuelve `b` solo si `a` es `null` o `undefined`. Es distinto de `a || b`, que también sustituye `0`, `''` y `false`. Para tamaños de página o números de página, que pueden valer `0`, `??` es el operador correcto.

::: java
`?.` y `??` son lo que `Optional.map(...)` y `Optional.orElse(...)` intentan expresar, pero integrados en el lenguaje y sin envolver el valor.
:::

## Asincronía: promesas y `async`/`await`

Una **promesa** (`Promise<T>`) representa un valor que llegará en el futuro: el resultado de una petición HTTP, por ejemplo. Puede estar pendiente, cumplida (con un valor) o rechazada (con un error).

Las funciones marcadas con `async` devuelven siempre una promesa, y dentro de ellas `await` **suspende la función** —sin bloquear el hilo— hasta que la promesa se resuelve. El corazón del cliente HTTP del proyecto lo muestra:

```ts title="src/lib/api-client.ts (simplificado)"
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal } = options
  const url = `${API_BASE_URL}${path}${buildQueryString(query)}`

  let response: Response
  try {
    response = await fetch(url, { method, signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    throw new ApiError({ message: 'No se puede conectar con el servidor…', status: 0, kind: 'network' })
  }

  if (!response.ok) {
    throw await toApiError(response)
  }
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}
```

Se lee de arriba abajo como código síncrono, y los errores se capturan con `try`/`catch`. Cuando `fetch` falla por un problema de red, la promesa se **rechaza** y el `await` lanza la excepción dentro del `try`. Si la respuesta es un 4xx o un 5xx, `fetch` **no** falla: la promesa se cumple con una respuesta cuyo `ok` vale `false`. Por eso hay que comprobar `response.ok` explícitamente.

::: java
`Promise<T>` es el equivalente de `CompletableFuture<T>`, y `await` es lo que harías con `join()`, con una diferencia fundamental: `await` no bloquea el hilo. Libera el hilo para que el bucle de eventos atienda otras tareas y retoma la función cuando la promesa se resuelve. Se parece más a los hilos virtuales de Java 21 que a `join()` sobre un hilo de plataforma.
:::

### Cancelación con `AbortSignal`

Si el usuario cambia de página antes de que llegue la respuesta, la petición anterior ya no interesa. El parámetro `signal` permite cancelarla: TanStack Query crea un `AbortController` por consulta y pasa su `signal` a `fetch`. Por eso en el bloque `catch` se deja pasar el error de cancelación sin convertirlo en un error de red:

```ts title="src/lib/api-client.ts"
if (error instanceof DOMException && error.name === 'AbortError') throw error
```

## Módulos: `import` y `export`

Cada fichero `.ts` o `.tsx` es un **módulo** con su propio ámbito: lo que no se exporta, no se ve desde fuera.

```ts
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const      // exportación con nombre
export function nextSort(...) { ... }

import { nextSort, PAGE_SIZE_OPTIONS } from '@/lib/list-params' // importación con nombre
import type { SortDirection } from '@/lib/list-params'          // importación solo de tipos
```

Tres detalles del proyecto:

- **Solo exportaciones con nombre.** El proyecto evita `export default`, de modo que cada cosa se importa siempre con el mismo nombre y el editor puede renombrarla de forma segura.
- **`import type`.** Importa solo información de tipos, que desaparece al compilar. La opción `verbatimModuleSyntax` del `tsconfig` lo exige cuando lo importado es solo un tipo (capítulo 5).
- **El alias `@/`.** `@/lib/list-params` significa `src/lib/list-params`. Evita rutas relativas del tipo `../../../lib`. Se configura en `vite.config.ts` y en `tsconfig.app.json`.

::: java
Un módulo es lo más parecido a una clase con miembros `public` (lo exportado) y privados (lo no exportado), pero sin clase: puedes exportar funciones, constantes y tipos sueltos. El alias `@/` cumple la función de la raíz de paquetes `com.albertoderafael.itmanager`.
:::

## El sistema de tipos de TypeScript

### Anotaciones e inferencia

Los tipos se escriben después del nombre, con dos puntos. Pero en la mayoría de los casos **no hace falta escribirlos**: TypeScript los infiere.

```ts
const size = 10                       // inferido: number
function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }  // retorno inferido: string
```

La regla práctica del proyecto: se anotan los **parámetros** de las funciones y las **estructuras públicas** (tipos de DTO, *props* de componentes); el resto se deja a la inferencia.

### `interface` y `type`

Hay dos formas de dar nombre a un tipo:

```ts title="src/features/applications/model/types.ts"
/** ApplicationResponse */
export interface Application {
  id: number
  name: string
  description: string | null
  criticality: ApplicationCriticality
  status: ApplicationStatus
}

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]
```

`interface` describe la forma de un objeto y puede extenderse (`interface B extends A`). `type` puede nombrar **cualquier** tipo: uniones, tuplas, funciones, tipos calculados. En la práctica son intercambiables para objetos; el proyecto usa `interface` para formas de objeto (DTO y *props*) y `type` para todo lo demás.

### Tipado estructural

Esta es la diferencia conceptual más grande con Java. En Java el tipado es **nominal**: un objeto es un `Application` solo si su clase se declaró así. En TypeScript es **estructural**: un valor es compatible con un tipo si **tiene la forma** que el tipo exige, se llame como se llame.

```ts
interface Paginable { page: number; size: number }

const params: ApplicationListParams = { page: 0, size: 10, sortField: 'id', sortDirection: 'asc' }
const p: Paginable = params   // válido: params tiene page y size (y más cosas)
```

`writePaginationParams` en `src/lib/list-params.ts` se aprovecha de ello: acepta `{ page, size, sortField, sortDirection }`, y por eso sirve tanto para los parámetros de aplicaciones como para los de demandas sin que ninguno «implemente» nada.

::: java
Es como si todas las interfaces se implementaran automáticamente: no hay `implements`. Un objeto literal con las propiedades correctas **es** un `Application`. Esto hace innecesarios muchos patrones de Java (adaptadores, mapeadores triviales) y es la razón de que en el frontend no haya clases DTO: basta con objetos planos y tipos que los describen.
:::

### Uniones y tipos literales

Un tipo puede ser una **unión** de varios: `string | null` admite un texto o `null`. Y un tipo puede ser un **valor literal concreto**: el tipo `'asc'` solo admite la cadena `'asc'`. Combinando ambas cosas se obtienen enumeraciones muy ligeras:

```ts title="src/lib/list-params.ts"
export type SortDirection = 'asc' | 'desc'
```

Si escribes `sortDirection: 'ascending'`, el compilador lo rechaza, y el editor te ofrece `'asc'` y `'desc'` al autocompletar.

### El patrón `as const` + `(typeof X)[number]`

El proyecto necesita los valores de cada enumeración **dos veces**: como tipo (para el compilador) y como lista en ejecución (para pintar las opciones de un desplegable o validar la URL). Para no escribirlos dos veces, se declaran una sola vez como array y se **deriva** el tipo:

```ts title="src/features/applications/model/types.ts"
export const APPLICATION_STATUSES = ['ACTIVE', 'INACTIVE'] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]
```

Paso a paso:

1. Sin `as const`, el tipo del array sería `string[]`: se perderían los valores concretos.
2. Con `as const`, el tipo es `readonly ['ACTIVE', 'INACTIVE']`: una tupla de solo lectura con literales exactos.
3. `typeof APPLICATION_STATUSES` toma el **tipo** de esa constante.
4. `[number]` significa «el tipo de cualquier elemento accesible con un índice numérico», es decir, `'ACTIVE' | 'INACTIVE'`.

Si mañana el backend añade `RETIRED`, se añade en un solo sitio y el tipo, los desplegables, la validación de la URL y los esquemas de Zod se actualizan solos.

::: decision Uniones de literales en lugar de `enum`
TypeScript tiene una palabra reservada `enum`, pero el proyecto no la usa. Un `enum` de TypeScript genera código en ejecución (un objeto), tiene particularidades con los valores numéricos y no es compatible con la opción `erasableSyntaxOnly`, que exige que todo lo de TypeScript sea borrable sin más. Las uniones de literales son simples cadenas en ejecución —exactamente lo que viaja en el JSON del backend— y el patrón `as const` da además la lista de valores.
:::

### `Record` y la exhaustividad

`Record<K, V>` es el tipo de un objeto cuyas claves son `K` y cuyos valores son `V`. Combinado con una unión de literales, obliga a cubrir **todos** los casos:

```ts title="src/features/applications/model/constants.ts"
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
}
```

Si se añade `RETIRED` a `APPLICATION_STATUSES` y no se añade aquí su etiqueta, el proyecto **no compila**. Es el equivalente de un `switch` exhaustivo sobre un `enum` sellado de Java 21.

### Propiedades opcionales y nulas

Hay dos formas de expresar «puede no estar», y el proyecto usa cada una con un significado:

```ts title="src/features/applications/model/types.ts"
export interface Application {
  description: string | null        // siempre presente; puede valer null (así lo envía el backend)
}
export interface ApplicationListParams {
  status?: ApplicationStatus        // puede no existir: «sin filtro de estado»
}
```

`status?: ApplicationStatus` equivale a `status?: ApplicationStatus | undefined`: la propiedad puede omitirse. Con `strict` activado (lo está), TypeScript **no deja usar un valor que puede ser `null` o `undefined` sin comprobarlo antes**. Es el mayor salto de seguridad respecto a Java: el equivalente a que el compilador detectara todos los `NullPointerException` posibles.

### Estrechamiento y guardas de tipo

Cuando una variable tiene un tipo unión, TypeScript **estrecha** su tipo según las comprobaciones que haces:

```ts title="src/lib/format.ts"
export function formatDateTime(iso: string | null | undefined, style: 'short' | 'long' = 'short'): string {
  if (!iso) return '—'
  const date = new Date(iso)     // aquí iso ya es string: null y undefined se descartaron arriba
  // …
}
```

Para tipos que el compilador no puede deducir solo, se escriben **guardas de tipo**: funciones que devuelven `valor is Tipo`.

```ts title="src/lib/api-client.ts"
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
```

Tras `if (isApiError(error))`, el compilador sabe que `error` es un `ApiError` y permite acceder a `error.status` o `error.kind`. Observa también el tipo **`unknown`**: es el tipo de algo de lo que no se sabe nada, y obliga a comprobarlo antes de usarlo. Es el tipo de lo que se captura en un `catch`, porque en JavaScript se puede lanzar cualquier cosa, no solo errores.

::: atencion
Existe también el tipo `any`, que **desactiva** la comprobación de tipos para esa variable. Es una vía de escape que contagia: lo que sale de un `any` también es `any`. El proyecto no lo usa; cuando no se conoce un tipo se usa `unknown` y se comprueba.
:::

### Genéricos

Funcionan como en Java, con una sintaxis parecida:

```ts title="src/lib/list-params.ts"
/** Devuelve el valor si pertenece a la lista; si no, undefined. */
export function parseEnumParam<T extends string>(
  allowed: readonly T[],
  value: string | null,
): T | undefined {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : undefined
}
```

`<T extends string>` declara un parámetro de tipo restringido a subtipos de `string`. Al llamar a `parseEnumParam(APPLICATION_STATUSES, search.get('estado'))`, TypeScript infiere que `T` es `'ACTIVE' | 'INACTIVE'` y la función devuelve `ApplicationStatus | undefined`. Una sola función valida estados, criticidades, prioridades y campos de ordenación.

Los componentes también pueden ser genéricos. `FilterSelect<V extends string>` (`src/components/common/filter-select.tsx`) recibe opciones de tipo `V` y llama a `onChange` con un `V`, de modo que el filtro de estado devuelve un `ApplicationStatus` y el de prioridad un `DemandPriority`, sin conversiones.

### Tipos utilitarios

TypeScript permite **calcular tipos a partir de otros**. Los más usados en el proyecto:

| Tipo | Significado | Ejemplo |
|---|---|---|
| `Partial<T>` | Todas las propiedades de `T`, opcionales | `updateParams(patch: Partial<ApplicationListParams>)`: se pasa solo lo que cambia |
| `Record<K, V>` | Objeto con claves `K` y valores `V` | Etiquetas de estado, estilos por tono |
| `readonly T[]` | Array que no se puede modificar | Listas de opciones y transiciones permitidas |
| `ReturnType<F>` | Tipo devuelto por una función | Útil con funciones de librerías |
| `z.infer`, `z.input` | Tipo derivado de un esquema de Zod | Tipos de los formularios (Parte VII) |

### Clases

TypeScript admite clases, pero el código de React apenas las usa: componentes, hooks y utilidades son funciones. La excepción es `ApiError`, que extiende `Error` para poder lanzarse, capturarse e identificarse con `instanceof`:

```ts title="src/lib/api-client.ts"
export class ApiError extends Error {
  readonly status: number
  readonly kind: ApiErrorKind
  readonly fieldErrors: Record<string, string>
  // constructor…
}
```

### Aserciones: `as` y `!`

`valor as Tipo` y `valor!` le dicen al compilador «confía en mí». No convierten nada ni comprueban nada en ejecución; solo silencian al compilador. Por eso se usan con mucha moderación y, cuando aparecen, conviene preguntarse qué garantiza que sean ciertas:

```ts
createRoot(document.getElementById('root')!)   // garantizado: index.html contiene el div
return (text ? JSON.parse(text) : undefined) as T   // confianza en el contrato con el backend
```

## Los tipos desaparecen en ejecución

Volvamos a la idea de la figura 2.1. Cuando el cliente HTTP hace `JSON.parse(text) as T`, TypeScript **cree** que el resultado es un `ApplicationPage`, pero nadie lo ha comprobado. Si el backend cambiara el nombre de `totalElements` a `total`, el proyecto seguiría compilando y el fallo aparecería en ejecución como un `undefined` inesperado.

Por eso los tipos de `model/types.ts` llevan un comentario con el DTO de Spring al que corresponden: son un **espejo manual del contrato**, y mantenerlo sincronizado es responsabilidad del equipo.

::: decision Tipos de DTO escritos a mano y validación en ejecución solo en la entrada del usuario
**Decisión.** Los tipos de los DTO se escriben a mano, alineados con el backend, y las respuestas de la API no se validan en ejecución. Lo que sí se valida en ejecución, con Zod, es lo que introduce el usuario en los formularios.

**Motivos.** El backend es propio y su contrato está controlado; validar cada respuesta añadiría código y coste sin un beneficio claro. La entrada del usuario, en cambio, es la fuente de datos menos fiable y la que necesita mensajes de error comprensibles.

**Alternativas.** Generar los tipos desde la especificación OpenAPI del backend (con herramientas como `openapi-typescript` u `orval`) eliminaría la sincronización manual; es una evolución natural si la API crece o la desarrollan equipos distintos. Validar las respuestas con esquemas de Zod sería lo indicado para APIs de terceros poco fiables.
:::

## Errores típicos y depuración

- **«Object is possibly 'undefined'».** El compilador te avisa de que no has contemplado el caso vacío. No lo silencies con `!`: añade la comprobación (`if (!data) return …`) o usa `?.` y `??`.
- **«Type 'string' is not assignable to type 'ApplicationStatus'».** Estás pasando un texto cualquiera donde se espera uno de los literales. Valídalo antes (como hace `parseEnumParam`) en lugar de forzarlo con `as`.
- **Mutar en lugar de copiar.** `params.page = 2` modifica el objeto original y React puede no enterarse del cambio. Crea uno nuevo: `{ ...params, page: 2 }` (capítulo 7).
- **Olvidar `await`.** Sin `await`, obtienes una promesa en lugar del valor. Si ves en consola `Promise {<pending>}` o un `[object Promise]` en pantalla, falta un `await`.
- **`fetch` no lanza en un 404 ni en un 500.** Hay que comprobar `response.ok`. El cliente del proyecto ya lo hace, pero tenlo en cuenta si escribes llamadas a mano.
- **Errores de tipos que no ves al desarrollar.** Vite no comprueba tipos (sección 4.4). Mira los subrayados del editor y ejecuta `npm run typecheck` antes de dar algo por terminado.

Para depurar, `console.log` sigue siendo útil, pero el depurador es mucho más potente: en la pestaña *Sources* de las DevTools, abre un fichero con Ctrl+P, haz clic en un número de línea para poner un punto de ruptura y podrás inspeccionar variables, avanzar paso a paso y ver la pila de llamadas, como en IntelliJ. También puedes escribir la sentencia `debugger;` en el código para detenerte en ese punto.

## Ejercicios

::: ejercicio Añade un estado a la enumeración
En una rama de pruebas, añade `'RETIRED'` a `APPLICATION_STATUSES` en `src/features/applications/model/types.ts` y ejecuta `npm run typecheck`. ¿Qué ficheros dejan de compilar y por qué? Corrígelos y observa en qué lugares de la interfaz aparece el nuevo estado sin haber tocado nada más. Después deshaz el cambio: el backend no conoce ese estado.
:::

::: ejercicio Escribe una función genérica
Escribe en `src/lib/` una función `groupBy<T, K extends string>(items: readonly T[], key: (item: T) => K): Record<K, T[]>` que agrupe una lista. Úsala mentalmente sobre una página de aplicaciones para agruparlas por criticidad. ¿Qué tipo infiere TypeScript para el resultado? Pista: `reduce` o un bucle `for…of`.
:::

::: ejercicio Estrechamiento con `unknown`
Escribe una función `describeError(error: unknown): string` que devuelva: «Error de red» si es un `ApiError` de tipo `network`; «Datos no válidos: campo1, campo2» si es un `ApiError` con `fieldErrors`; el mensaje si es un `Error` cualquiera; y «Error desconocido» en otro caso. Comprueba que el compilador no te deja acceder a `error.kind` antes de estrechar el tipo.
:::

## Autoevaluación

::: preguntas
1. ¿Qué queda de los tipos de TypeScript cuando el código llega al navegador?
2. ¿Cuál es la diferencia entre `null` y `undefined`, y cómo se usa cada uno en el proyecto?
3. ¿Qué diferencia hay entre `a ?? b` y `a || b`? Pon un ejemplo en el que den resultados distintos.
4. ¿Qué significa que el tipado de TypeScript sea estructural? ¿Qué consecuencia tiene frente a Java?
5. Explica qué hace `(typeof APPLICATION_STATUSES)[number]` y para qué sirve `as const`.
6. ¿Por qué `Record<ApplicationStatus, string>` ayuda a no olvidar casos?
7. ¿Por qué `fetch` exige comprobar `response.ok`?
8. ¿Qué diferencia hay entre `unknown` y `any`?
9. ¿Qué garantiza realmente `JSON.parse(text) as T`?
:::
