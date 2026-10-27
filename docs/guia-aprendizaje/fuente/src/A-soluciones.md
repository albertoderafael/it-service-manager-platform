# Soluciones y respuestas

<p class="lead">Cada solución enlaza de vuelta con su ejercicio, y cada bloque de respuestas con las preguntas de su capítulo. Intenta resolverlos antes de mirar: el valor del ejercicio está en el intento.</p>

## Capítulo 1 · Cómo funciona una aplicación web moderna

::: solucion 1.1
1. La primera petición, de tipo *document*, es `GET /aplicaciones`. Vite devuelve el `index.html` (aunque no exista ningún fichero con ese nombre) con una pequeña inyección de su cliente de recarga en caliente.
2. A continuación aparecen `main.tsx`, `index.css`, `app.tsx`, `router.tsx`… En desarrollo Vite **no empaqueta**: sirve cada módulo por separado, ya transformado a JavaScript, y el navegador pide cada `import` (capítulo 4). Verás también módulos de `node_modules` precompilados, en rutas como `/node_modules/.vite/deps/`.
3. `GET /api/applications?page=0&size=10&sort=id,asc` con estado `200` y un JSON con la forma `{ content: [...], page, size, totalElements, totalPages }`.

Al navegar a *Demandas* **no** se vuelve a pedir `index.html`: el router cambia la URL con la History API. Solo aparecen el módulo de la página de demandas (carga diferida) y las peticiones `GET /api/demands…` y, para el filtro, `GET /api/applications…`.
:::

::: solucion 1.2
1. Se muestra el estado de error del listado («No se han podido cargar los datos») con el botón *Reintentar*. En *Network*, la petición a `/api/applications` termina con un **500 generado por el propio proxy de Vite**, que no consigue conectar con el backend; en la terminal de `npm run dev` verás un aviso `http proxy error … ECONNREFUSED`. Nuestro cliente HTTP convierte la respuesta en un `ApiError` de tipo `server`. Observa también que la petición aparece **tres veces**: la configuración de TanStack Query reintenta dos veces los errores que no son 4xx (capítulo 17).
2. La genera **React**. En *Network* la petición del documento devuelve `200` con el mismo `index.html` de siempre; después el router no encuentra ninguna ruta que encaje y pinta `NotFoundPage` gracias a la ruta comodín `{ path: '*' }` de `router.tsx`.
:::

::: solucion 1.3
En `dist/assets` encontrarás un `index-<hash>.js` (el *bundle* inicial: React, el router, el layout…), un `index-<hash>.css` y varios ficheros con nombres como `applications-list-page-<hash>.js` o `application-edit-page-<hash>.js`. Cada página con `lazy()` produce su propio *chunk*; el código compartido entre varias páginas se extrae a *chunks* comunes.

Con `npm run preview` (que sirve `dist/`) y la aplicación abierta en `/demandas`, el *chunk* `applications-list-page-…js` no aparece en *Network* hasta que pulsas *Consultar aplicaciones* en el menú.
:::

::: respuestas 1
1. La primera vez, un `index.html` casi vacío junto con el JavaScript y el CSS de la aplicación. Después, solo datos JSON a través de la API.
2. Porque el frontend se ejecuta en una máquina que controla el usuario: puede modificarse o saltarse llamando a la API directamente. La validación del frontend mejora la experiencia de uso; la autoridad es el backend.
3. Es el árbol de objetos que el navegador construye a partir del HTML. Lo que se ve en pantalla es siempre el reflejo del DOM actual; si JavaScript lo modifica, la pantalla cambia.
4. Delegando la operación lenta al navegador y registrando una función que se ejecutará cuando termine. El bucle de eventos ejecuta esa función cuando el hilo queda libre.
5. Crea una raíz de React ligada a `div#root` y le indica que dibuje el componente `App` dentro. Desde ese momento React gestiona todo el contenido de ese elemento.
6. Porque al recargar o abrir un enlace directo, el navegador pide al servidor una ruta como `/demandas/7` que no existe como fichero. El servidor debe devolver `index.html` para que el router de React resuelva la ruta en el navegador.
7. El primero es una importación estática: se resuelve al construir y el módulo forma parte del mismo *bundle*. El segundo es una importación dinámica: devuelve una promesa, se resuelve en ejecución y genera un *chunk* aparte que se descarga bajo demanda.
8. Para poder guardar los ficheros en la caché del navegador de forma indefinida: si el contenido cambia, cambia el nombre, de modo que nunca se sirve una versión antigua por error.
:::

## Capítulo 2 · JavaScript moderno y TypeScript

::: solucion 2.1
Dejan de compilar los objetos `Record<ApplicationStatus, …>` que no tienen la nueva clave: como mínimo `STATUS_LABELS` en `model/constants.ts` y `STATUS_TONES`, que asigna un tono de color a cada estado en `components/application-badges.tsx`. El error es del tipo *Property 'RETIRED' is missing in type … but required in type 'Record<ApplicationStatus, string>'*. Es exactamente la exhaustividad de la sección 2.5.

Una vez añadidas la etiqueta y el tono, el nuevo estado aparece **sin tocar nada más** en: el filtro de estado del listado y del selector (que se construyen con `APPLICATION_STATUSES.map`), el desplegable de estado del formulario de modificación, la validación del parámetro `?estado=` de la URL (`parseEnumParam`) y el esquema de Zod (`z.enum(APPLICATION_STATUSES)`). Todo deriva de la misma constante.
:::

::: solucion 2.2
```ts
export function groupBy<T, K extends string>(
  items: readonly T[],
  key: (item: T) => K,
): Partial<Record<K, T[]>> {
  const result: Partial<Record<K, T[]>> = {}
  for (const item of items) {
    const k = key(item)
    ;(result[k] ??= []).push(item)
  }
  return result
}

const porCriticidad = groupBy(page.content, (app) => app.criticality)
// tipo inferido: Partial<Record<ApplicationCriticality, Application[]>>
```

La firma pedida devolvía `Record<K, T[]>`, pero es más honesto devolver `Partial<Record<K, T[]>>`: si ninguna aplicación es `CRITICAL`, esa clave no existirá, y el tipo debe obligar a quien lo use a contemplarlo (`porCriticidad.CRITICAL ?? []`). Este tipo de matiz es justo lo que el modo estricto te ayuda a ver. TypeScript infiere `T = Application` y `K = ApplicationCriticality` a partir de los argumentos. El operador `??=` asigna solo si el valor es `null` o `undefined`; el punto y coma inicial evita que la línea se interprete como continuación de la anterior.
:::

::: solucion 2.3
```ts
import { isApiError } from '@/lib/api-client'

export function describeError(error: unknown): string {
  if (isApiError(error)) {
    if (error.kind === 'network') return 'Error de red'
    const campos = Object.keys(error.fieldErrors)
    if (campos.length > 0) return `Datos no válidos: ${campos.join(', ')}`
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Error desconocido'
}
```

Si escribes `error.kind` antes del `if (isApiError(error))`, el compilador responde *'error' is of type 'unknown'*. Dentro del `if`, la guarda de tipo ha estrechado `error` a `ApiError`. Ten en cuenta que el orden importa: `ApiError` también es un `Error`, así que la comprobación más específica debe ir primero.
:::

::: respuestas 2
1. Nada: se eliminan al compilar. El navegador ejecuta JavaScript sin ninguna información de tipos.
2. `undefined` significa «no asignado» y `null`, «vacío asignado explícitamente». El backend envía `null` en los campos sin valor (`description: null`); el frontend usa `undefined` (propiedades opcionales) para «sin filtro».
3. `??` solo sustituye `null` y `undefined`; `||` sustituye cualquier valor falso. Con `const page = 0`, `page ?? 1` vale `0` y `page || 1` vale `1`.
4. Que un valor es compatible con un tipo si tiene la forma requerida, sin declararlo. No hace falta `implements`, y basta con objetos literales donde en Java usarías clases DTO.
5. `as const` hace que el array tenga tipo de tupla de solo lectura con los literales exactos, en lugar de `string[]`. `(typeof X)[number]` obtiene la unión de los tipos de sus elementos: `'ACTIVE' | 'INACTIVE'`. Así se declara la lista una vez y se deriva el tipo.
6. Porque exige una entrada para cada valor de la unión: si se añade un valor nuevo y falta su entrada, el proyecto no compila.
7. Porque `fetch` solo rechaza la promesa ante errores de red. Una respuesta 4xx o 5xx es una respuesta válida para `fetch`, con `ok` a `false`.
8. `unknown` obliga a comprobar el tipo antes de usar el valor; `any` desactiva la comprobación y se contagia a todo lo que toca.
9. Nada en ejecución: solo le dice al compilador que trate el resultado como `T`. Si el JSON no tiene esa forma, el error aparecerá más adelante, en ejecución.
:::

## Capítulo 3 · Node.js, npm y el ecosistema de paquetes

::: solucion 3.1
`npm ls react` muestra `react@19.3.0` en la raíz y, debajo, todos los paquetes que lo declaran como dependencia (`@tanstack/react-query`, `lucide-react`, `react-hook-form`, `sonner`, cada subpaquete de `radix-ui`…) marcados como `deduped`: todos comparten **la misma copia**. Es importante, porque dos copias de React en un mismo *bundle* producen errores muy confusos con los hooks.

`npm explain @radix-ui/react-select` responde:

```text
@radix-ui/react-select@2.3.7
  @radix-ui/react-select@"2.3.7" from radix-ui@1.6.7
    radix-ui@"^1.6.7" from the root project
```

Lo introduce el paquete unificado `radix-ui`, que agrupa todos los primitivos de Radix. El proyecto solo declara `radix-ui`, y es `components/ui/select.tsx` quien usa la parte del desplegable.
:::

::: solucion 3.2
La clasificación depende del momento en que lo ejecutes, pero el criterio es: si la columna *Wanted* es mayor que *Current*, basta `npm update`; si *Latest* es mayor que *Wanted* y comparte versión mayor, el rango del `package.json` lo impide (raro con `^`); si *Latest* tiene otra versión mayor, es un salto mayor que requiere decisión.

Para Zod 3 → 4, los cambios que afectan al proyecto están en los esquemas de los formularios: la opción `errorMap` de `z.enum(…, { errorMap })` se sustituye por la opción `error`. Habría que revisar `features/applications/model/schemas.ts` y `features/demands/model/schemas.ts`, ejecutar sus pruebas (`schemas.test.ts`) y comprobar `@hookform/resolvers`, cuyo `zodResolver` admite ambas versiones en sus versiones recientes.
:::

::: solucion 3.3
`npm run dev` arranca sin quejarse y la aplicación funciona: Vite elimina los tipos sin comprobarlos (sección 4.4). Solo el editor subraya el error. `npm run build`, en cambio, falla en el primer paso, `tsc -b`, con un error del tipo *Type '"ACTIVA"' is not assignable to type 'ApplicationStatus'*, y por culpa del `&&` nunca llega a ejecutar `vite build`: no se genera `dist/`.
:::

::: respuestas 3
1. No. Node solo ejecuta las herramientas de desarrollo y construcción (Vite, TypeScript, ESLint, Vitest). En producción se sirven ficheros estáticos.
2. Si el código acaba en el *bundle* que descarga el usuario (`dependencies`) o solo se usa al desarrollar (`devDependencies`).
3. `^5.103.2` admite cualquier `5.x.y` igual o superior a `5.103.2`. `~5.103.2` admite solo `5.103.x` igual o superior a `5.103.2`.
4. Fija la versión exacta, el origen y la suma de verificación de cada paquete, incluidos los transitivos. Se versiona para que todo el equipo y la integración continua instalen exactamente lo mismo.
5. En integración continua o cuando quieres una instalación limpia y reproducible: `npm ci` instala exactamente el *lockfile* y falla si no coincide con `package.json`.
6. Porque es grande, depende del sistema operativo en algunos paquetes y se regenera de forma determinista con `npm install` a partir del *lockfile*.
7. Que los ficheros `.js` del proyecto son módulos ES (`import`/`export`) y no CommonJS.
8. `tsc -b` falla y, por el `&&`, `vite build` no se ejecuta: no se genera una versión de producción con errores de tipos.
:::

## Capítulo 4 · Vite: el entorno de desarrollo y construcción

::: solucion 4.1
En el primer caso el texto escrito se conserva: Fast Refresh sustituye el componente y mantiene su estado (incluido el del formulario). Al añadir `export const PRUEBA = 1`, el fichero deja de exportar solo componentes: Vite no puede aplicar Fast Refresh con seguridad y hace una **recarga completa**, de modo que se pierde lo escrito. ESLint marca la línea con *Fast refresh only works when a file only exports components*. Es la razón de que las constantes vivan en ficheros `.ts` separados.
:::

::: solucion 4.2
```bash title=".env.example"
# URL base de la API usada por el navegador. Por defecto /api (proxy de Vite en desarrollo).
VITE_API_BASE_URL=/api
# Destino del proxy para /api/applications (servicio de aplicaciones).
VITE_APPLICATION_API_TARGET=http://localhost:8081
# Destino del proxy para /api/demands (servicio de demandas).
VITE_DEMAND_API_TARGET=http://localhost:8080
```

Con `VITE_APPLICATION_API_TARGET=http://localhost:9999` en `.env.local` (y Vite reiniciado), el listado de aplicaciones muestra el estado de error, la terminal registra `http proxy error: /api/applications?… ECONNREFUSED` y en *Network* las peticiones a `/api/applications` responden con un 500 del proxy. El módulo de demandas sigue funcionando, salvo su filtro por aplicación, que también consulta `/api/applications`.
:::

::: solucion 4.3
El *chunk* inicial `index-<hash>.js` suele ser el mayor: contiene React, React DOM, React Router, TanStack Query, el layout y los componentes comunes. En `dist/index.html` aparece como `<script type="module" crossorigin src="/assets/index-<hash>.js">`, junto a un `<link rel="stylesheet">` para el CSS. Al buscar `/api` en ese fichero encontrarás la cadena `"/api"` del cliente HTTP: como no hay `VITE_API_BASE_URL` definida, `import.meta.env.VITE_API_BASE_URL` se ha sustituido por `undefined` y queda el valor por defecto. Es probable que el minificador haya simplificado la expresión `undefined ?? "/api"` hasta dejar solo la cadena: el código de producción no se parece al fuente, y por eso existen los *source maps*.
:::

::: respuestas 4
1. En desarrollo, el navegador entiende módulos ES y transformar ficheros sueltos bajo demanda es instantáneo. En producción, cientos de peticiones serían lentas, y conviene optimizar, minificar y dividir en *chunks*.
2. Vite empaqueta cada dependencia de `node_modules` en un único módulo ES (convirtiendo CommonJS si hace falta) y lo guarda en `node_modules/.vite/deps`.
3. HMR es el mecanismo general de sustituir un módulo en caliente; Fast Refresh es su integración con React, que vuelve a renderizar el componente modificado conservando su estado.
4. Porque Vite elimina los tipos sin comprobarlos. En producción lo impide el `tsc -b` que precede a `vite build` en el script `build`.
5. Porque Vite resuelve los ficheros al construir y TypeScript comprueba los tipos, y cada herramienta tiene su propia configuración.
6. Solo las que empiezan por `VITE_`. Se incrustan como texto en el JavaScript que descarga cualquier usuario.
7. Evita las restricciones de origen cruzado (CORS) haciendo que el navegador hable solo con Vite, que reenvía al backend. En producción no hay servidor de Vite: hace falta un proxy inverso o CORS en el backend.
8. Al servicio de demandas: `GET http://localhost:8080/api/demands/7` (o al destino de `VITE_DEMAND_API_TARGET`).
:::

## Capítulo 5 · Configuración de TypeScript, ESLint y calidad del código

::: solucion 5.1
Con `strict: false` desaparecen errores, pero no porque el código sea mejor: el compilador deja de comprobar los nulos. Con el modo estricto, escribir `query.data.name` sin comprobación produce *'query.data' is possibly 'undefined'*. Sin modo estricto compila, y en ejecución, durante la carga (cuando `data` aún es `undefined`), React lanzaría *TypeError: Cannot read properties of undefined (reading 'name')* y la página se sustituiría por `RouteErrorPage`.
:::

::: solucion 5.2
`npm run lint` informa de *React Hook "useState" is called conditionally. React Hooks must be called in the exact same order in every component render* (`react-hooks/rules-of-hooks`, error) y de *React Hook useEffect has a missing dependency: '…'. Either include it or remove the dependency array* (`react-hooks/exhaustive-deps`, aviso).

La primera regla existe porque React identifica cada hook por su orden de llamada: si un hook se llama en unos renderizados y en otros no, los siguientes reciben el estado de otro (capítulo 8, figura 8.1).
:::

::: solucion 5.3
`document.title = 'x'` en `vite.config.ts` falla en el subproyecto **node** (*Cannot find name 'document'*), porque `tsconfig.node.json` solo incluye `lib: ["ES2023"]`, sin DOM. `process.env.HOME` en `main.tsx` falla en el subproyecto **app** (*Cannot find name 'process'*), porque `tsconfig.app.json` limita los tipos globales a `vite/client`, sin los de Node. Cada línea habría fallado en ejecución en su entorno.
:::

::: respuestas 5
1. Porque hay código para dos entornos distintos (navegador y Node) con APIs globales diferentes, y cada uno necesita sus propias bibliotecas de tipos.
2. Vite (con Oxc) en desarrollo y Rolldown en el *build*. TypeScript solo comprueba.
3. Usar `import type` para las importaciones que solo traen tipos. Permite a Vite eliminar esas importaciones procesando cada fichero de forma aislada.
4. `strictNullChecks`: impide usar valores que pueden ser `null` o `undefined` sin comprobarlos.
5. Patrones válidos pero problemáticos: un hook llamado dentro de un `if`, una dependencia olvidada en un efecto, una variable que nunca se reasigna declarada con `let`, código inalcanzable, `any` explícito.
6. Porque los componentes generados por shadcn/ui exportan sus variantes junto al componente, lo que dispara la regla de Fast Refresh, y no conviene reescribir ese código.
7. Recorre las referencias de proyecto, comprueba cada subproyecto en orden y guarda información incremental para acelerar las siguientes ejecuciones.
:::

## Capítulo 6 · Componentes, JSX y props

::: solucion 6.1
La cadena aproximada es `App → QueryClientProvider → TooltipProvider → RouterProvider → … → AppLayout → Outlet → … → ApplicationsListPage → Card → ApplicationsTable → Table → TableHeader → TableRow → SortableTableHead`. Entre medias verás componentes internos de React Router y de Radix. Las props de `ApplicationsTable` son `applications` (array de 10 elementos por defecto), `sortField`, `sortDirection`, `onSortChange`, `isFetching`. Al pulsar la cabecera *Nombre* cambian `sortField` (`'name'`), `sortDirection` y, al llegar los datos, `applications`. `onSortChange` también cambia de referencia, porque `handleSortChange` se crea en cada renderizado de la página.
:::

::: solucion 6.2
```tsx title="src/components/common/count-badge.tsx"
import { cn } from '@/lib/utils'

interface CountBadgeProps {
  count: number
  /** Nombre en singular y plural, p. ej. { one: 'aplicación', other: 'aplicaciones' }. */
  label: { one: string; other: string }
  tone?: 'neutral' | 'brand'
}

export function CountBadge({ count, label, tone = 'neutral' }: CountBadgeProps) {
  const text = count === 0 ? `Sin ${label.other}` : `${count} ${count === 1 ? label.one : label.other}`
  return (
    <span className={cn(
      'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
      tone === 'brand' ? 'bg-cyan-50 text-cyan-800' : 'bg-slate-100 text-slate-700',
    )}>
      {text}
    </span>
  )
}
```

Con una única cadena `label` no se puede formar bien el plural en español, así que la solución cambia la prop a un objeto con ambas formas: diseñar bien las props es parte del ejercicio. En la página: `description={data ? <CountBadge count={data.totalElements} label={{ one: 'aplicación', other: 'aplicaciones' }} /> : '…'}`. Funciona porque `description` es de tipo `ReactNode`.
:::

::: solucion 6.3
Datos: `page`, `size`, `totalElements`, `totalPages`, `pageSizeOptions`, `disabled`. Eventos: `onPageChange`, `onSizeChange`. El componente no guarda la página porque **no es su dueño**: la página actual vive en la URL y la gestiona `ApplicationsListPage`; la barra solo la muestra y avisa de los cambios (flujo unidireccional). Con `disabled`, todos los botones y el selector se desactivan, lo que evita pedir otra página mientras se carga una. La página se muestra como `page + 1` porque Spring Data numera las páginas desde 0 y los usuarios, desde 1.
:::

::: respuestas 6
1. Que el componente describe cómo debe verse la interfaz para unos datos, y React calcula los cambios del DOM. Por ejemplo, el listado describe qué mostrar en cada estado de la consulta en lugar de mostrar u ocultar elementos a mano.
2. En llamadas a `jsx(tipo, props)` que devuelven elementos de React: objetos ligeros que describen la interfaz. Un componente devuelve un árbol de esos objetos.
3. Porque JSX interpreta los nombres en minúscula como etiquetas HTML y los que empiezan por mayúscula como componentes.
4. Llama a una función que ha recibido por props (por ejemplo, `onSortChange`) para que el padre, dueño del dato, lo cambie.
5. `children` es el contenido entre las etiquetas del componente. Las props que reciben interfaz se tipan como `ReactNode`.
6. Cargando, error sin datos, vacío y con datos. Para que el usuario siempre sepa qué está pasando, incluso cuando algo falla.
7. Para identificar cada elemento entre renderizados y conservar o mover correctamente su DOM y su estado. El índice describe la posición, no la identidad, y falla al reordenar, filtrar o insertar.
8. La primera pasa la función para que se ejecute al hacer clic; la segunda la ejecuta durante el renderizado y pasa su resultado.
9. Porque si `count` es 0, la expresión vale `0`, y React pinta los números (aunque sean falsos).
:::

## Capítulo 7 · Estado, renderizado y reconciliación

::: solucion 7.1
Al buscar, la consola muestra primero `antes undefined` (o el identificador de la búsqueda anterior): dentro del manejador, `searchedId` es el valor de la instantánea actual; `setSearchedId` solo programa el siguiente renderizado. Después aparecen dos líneas `render 42` (y más, cuando la consulta cambia de estado). El doble `render` se debe a `StrictMode`, que en desarrollo ejecuta cada renderizado dos veces para detectar componentes impuros (sección 8.3).
:::

::: solucion 7.2
Al cambiar de página no ocurre nada: ni cambia la tabla ni el número de página. `setParams(params)` recibe **la misma referencia** que ya tenía el estado; `Object.is` concluye que no ha cambiado y React descarta el renderizado. Peor aún, el objeto del estado ha quedado modificado en silencio, de modo que el siguiente cambio legítimo (por ejemplo, un filtro) arrastrará esa página «fantasma».
:::

::: solucion 7.3
Sin la `key` y con la aplicación 2 en caché, tras pulsar *Siguiente* el título de la página cambia a «Modificar «nombre de la 2»», pero el formulario sigue mostrando el nombre modificado de la 1 y su indicador de cambios sin guardar. Si guardaras, ¡enviarías los datos de la 1 a la 2! Con la `key`, el formulario se recrea y muestra los datos de la 2.

Si no visitas antes la aplicación 2, sus datos no están en caché: la consulta pasa por `isPending`, la página muestra `LoadingState` **en lugar** del formulario (un componente de otro tipo en esa posición), así que React desmonta el formulario y lo vuelve a crear al llegar los datos. El problema queda oculto y solo aparece cuando hay caché: un error de los que se escapan en las pruebas manuales. La `key` lo resuelve en todos los casos.
:::

::: solucion 7.4
(a) **Estado de URL** si se quiere poder enlazar directamente a una pestaña (`?pestana=historial`); estado local si no importa. (b) **URL**, junto al resto de filtros del listado, por coherencia y para poder compartirlo; además debería enviarse al backend, que hoy no ofrece filtro por nombre. (c) **Almacenamiento del navegador** (`localStorage`) leído por un contexto o un hook en el layout: es una preferencia de usuario que debe sobrevivir a recargas, no un dato de navegación. (d) **Caché del servidor** (TanStack Query), como el catálogo de aplicaciones de los desplegables. (e) **Formulario** (React Hook Form): es un dato más del formulario, que se muestra condicionalmente con `useWatch` sobre el campo de estado y se valida con el esquema.
:::

::: respuestas 7
1. Las props las define el padre y son de solo lectura; el estado lo define y lo cambia el propio componente, y React lo conserva entre renderizados.
2. Ejecutar la función del componente para obtener la descripción de la interfaz. No implica tocar el DOM: eso ocurre en el *commit*, solo con las diferencias.
3. Vale 1, porque ambas llamadas calculan `0 + 1` con la instantánea. Con actualizaciones funcionales, `setCount((c) => c + 1)` dos veces, valdría 2.
4. Renderizado: se ejecutan los componentes, se obtiene el nuevo árbol y se compara con el anterior. *Commit*: se aplican al DOM solo las diferencias y después se ejecutan los efectos.
5. Destruye el componente anterior con todo su subárbol y su estado, y crea el nuevo desde cero.
6. Porque React compara referencias con `Object.is`: el objeto modificado es la misma referencia y React concluye que no ha cambiado.
7. El listado principal necesita que su estado sea recargable, enlazable y navegable con el historial. El selector del catálogo es auxiliar dentro de otra pantalla y eso no aporta nada.
8. Un valor que se calcula a partir de props, estado o datos durante el renderizado. Es preferible porque nunca se desincroniza con su origen.
9. Para que, al cambiar de aplicación, React trate el formulario como un componente nuevo y lo reinicie con los valores de la aplicación correcta.
:::

## Capítulo 8 · Hooks

::: solucion 8.1
```ts title="src/hooks/use-media-query.ts"
import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()                          // por si la consulta ha cambiado
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
```

El valor inicial se calcula con una función (`useState(() => …)`), que React solo ejecuta en el primer renderizado. El efecto se suscribe al cambio y la limpieza se da de baja; depende de `query` para volver a suscribirse si cambia. La versión 7 del plugin de ESLint puede avisar de la llamada síncrona a `setMatches` dentro del efecto (`set-state-in-effect`); en este caso se puede eliminar esa línea, porque el estado ya se inicializa con el valor correcto. La alternativa más idiomática para suscribirse a fuentes externas es el hook `useSyncExternalStore` de React.
:::

::: solucion 8.2
ESLint avisa en el `useCallback`: *The 'params' object makes the dependencies of useCallback Hook change on every render*. En el *Profiler* verás que el efecto vuelve a ejecutarse en cada renderizado, porque `updateParams` es una función nueva cada vez. No hay bucle infinito porque el cuerpo del efecto solo llama a `updateParams` cuando la página está fuera de rango: en el caso normal, el efecto se ejecuta, no cambia nada y termina. El código es correcto por casualidad; bastaría con que el efecto tuviera otra lógica para provocar un bucle.
:::

::: solucion 8.3
```tsx
function DemandCount({ demands }: { demands: Demand[] }) {
  const openCount = demands.filter((d) => d.status === 'OPEN').length
  return <span>{openCount} abiertas</span>
}
```

Es un valor derivado. La versión con efecto renderiza dos veces en cada cambio (primero con el recuento antiguo, después con el nuevo), muestra durante un instante un valor incorrecto y añade estado que puede desincronizarse. Si el cálculo fuera caro, se envolvería en `useMemo(…, [demands])`, pero sigue sin hacer falta un efecto.
:::

::: respuestas 8
1. Porque React identifica cada hook por su orden de llamada; si un hook se salta en un renderizado, los siguientes reciben el estado de otro.
2. Como una sincronización de un sistema externo con ciertos valores, que se repite cuando esos valores cambian; no como un evento del ciclo de vida.
3. Calcular valores derivados (se calculan al renderizar), responder a acciones del usuario (se hace en el manejador) y reiniciar estado al cambiar una prop (se usa `key`). Y pedir datos, para lo que se usa TanStack Query.
4. Deshace lo que hizo el efecto (darse de baja, cancelar un temporizador). Se ejecuta antes de volver a ejecutar el efecto y al desmontar el componente.
5. Renderiza cada componente dos veces para detectar impurezas, y monta, desmonta y vuelve a montar para detectar efectos sin limpieza correcta.
6. Porque `params` es dependencia de `updateParams`: si fuera un objeto nuevo en cada renderizado, `useCallback` devolvería también una función nueva cada vez.
7. Porque quien llama suele crear el objeto `ensure` en cada renderizado; con valores primitivos, la comparación detecta cambios reales y no cambios de referencia.
8. Solo la lógica: cada llamada tiene su propio estado y sus propios efectos. Comparten datos únicamente si el hook lee algo que vive fuera, como la caché de TanStack Query.
:::

## Capítulo 9 · Composición, contexto y límites de error

::: solucion 9.1
`FormProvider` provee el objeto completo devuelto por `useForm` (`control`, `register`, `formState`…); `FormField` provee `{ name: 'name' }`; `FormItem` provee `{ id }` con un identificador generado por `useId()` (una cadena opaca, cuyo formato exacto varía entre versiones de React). `FormLabel` llama a `useFormField()`, que lee `FormItemContext` y construye `formItemId`: ese identificador seguido de `-form-item`. Lo usa en `htmlFor`. `FormControl` usa el mismo `formItemId` como `id` y, mediante `Slot`, lo pone en el `<input>`. En *Elements* verás que el atributo `for` de la etiqueta y el `id` del `<input>` tienen exactamente el mismo valor, terminado en `-form-item`.
:::

::: solucion 9.2
```tsx title="src/components/layout/density.tsx (esbozo)"
type Density = 'comfortable' | 'compact'
const DensityContext = createContext<{ density: Density; toggle: () => void } | null>(null)

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensity] = useState<Density>('comfortable')
  const value = useMemo(
    () => ({ density, toggle: () => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact')) }),
    [density],
  )
  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>
}

export function useDensity() {
  const ctx = useContext(DensityContext)
  if (!ctx) throw new Error('useDensity debe usarse dentro de DensityProvider')
  return ctx
}
```

El valor por defecto `null` y la comprobación en `useDensity` detectan el uso fuera del proveedor. El `useMemo` evita que el objeto `value` cambie en cada renderizado del proveedor y renderice a los consumidores sin motivo. Para que React Refresh funcione, este fichero exporta un componente y un hook; ESLint puede pedir separarlos.

Sobre dónde guardarlo: el **contexto** basta para compartirlo entre la cabecera y la tabla durante la sesión; la **URL** no es adecuada, porque no es navegación; el **almacenamiento del navegador** (`localStorage`) añade persistencia entre recargas. Lo más completo es combinar los dos últimos: el proveedor inicializa el estado desde `localStorage` y lo guarda al cambiar.
:::

::: solucion 9.3
Con el `throw` dentro del `map`, el contenido de la página se sustituye por *Se ha producido un error inesperado — Fallo de prueba*, y **el menú lateral y la cabecera siguen funcionando**, porque el `errorElement` está dentro de `AppLayout`. En la consola verás el error y la pila de componentes.

Con el `throw` en un `onClick`, la página no cambia: el error aparece en la consola como no capturado (*Uncaught Error*), pero `RouteErrorPage` no se muestra. Los límites de error solo capturan errores producidos durante el renderizado, en efectos o en constructores; un manejador de eventos se ejecuta fuera de ese proceso, cuando React ya terminó de renderizar.
:::

::: respuestas 9
1. Por composición: envolviendo el componente en otro que fija algunas props, o dejando huecos (`children`, props de tipo `ReactNode`, componentes compuestos) que rellena quien lo usa.
2. Pasar un dato por varios niveles de componentes que no lo usan solo para que llegue a uno que sí. Acopla los intermedios y complica los cambios.
3. `createContext` para crearlo, un proveedor (`Context.Provider`) para ofrecer un valor a un subárbol y `useContext` para leerlo.
4. Por contexto: `<Form {...form}>` provee el formulario y `TextInputField` lo obtiene con `useFormContext()`.
5. Porque un componente solo ve los contextos de sus antepasados, y las páginas que pinta el router necesitan el `QueryClient` para usar consultas.
6. Que cada cambio renderiza a todos los consumidores, lo que puede provocar muchos renderizados innecesarios.
7. Hace que `Button` no pinte su propio `<button>`, sino que fusione sus props y estilos en su único hijo (por ejemplo, un `Link`).
8. Para que un error en una página sustituya solo el contenido y el menú lateral y la cabecera sigan disponibles.
9. No: un error en un `onClick` no se captura. Los errores de la API tampoco, porque son asíncronos; se gestionan explícitamente con el estado de error de TanStack Query.
:::

## Capítulo 10 · Tailwind CSS 4

::: solucion 10.1
- `sticky top-0`: la cabecera se desplaza con la página hasta tocar el borde superior y ahí se queda fija.
- `z-30`: queda por encima del contenido (pero por debajo del menú lateral, `z-40`, y de los paneles, `z-50`).
- `flex h-16 items-center gap-3`: fila de 4 rem de alto, con los elementos centrados verticalmente y separados 0,75 rem.
- `border-b`: línea inferior con el color de borde del tema.
- `bg-card/85`: fondo blanco al 85 % de opacidad.
- `px-4` y `lg:px-8`: relleno horizontal de 1 rem, 2 rem desde 1024 px, alineado con el `main`.
- `backdrop-blur`: desenfoca lo que pasa por debajo.
- `supports-[backdrop-filter]:bg-card/70`: si el navegador soporta el desenfoque, el fondo baja al 70 % de opacidad; si no, se queda en el 85 % para que el texto siga siendo legible.

En las DevTools, al desplazar un listado largo, verás la tabla pasar difuminada por debajo de la cabecera.
:::

::: solucion 10.2
```ts title="src/components/common/badges.tsx"
export type Tone = 'success' | 'neutral' | 'info' | 'brand' | 'warning' | 'danger' | 'violet'

const PILL_TONES: Record<Tone, { pill: string; dot: string }> = {
  // …
  violet: { pill: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500' },
}
```

Gracias al `Record<Tone, …>`, si añades `'violet'` al tipo y olvidas la entrada, el proyecto no compila. Con la versión dinámica (`` `bg-${color}-50` ``), el texto `bg-violet-50` no aparece literalmente en ningún fichero; Tailwind no lo encuentra al analizar el código y no genera su regla: la clase está en el elemento, pero no tiene efecto. Solo funcionaría por casualidad si otra parte del código usara la misma clase completa.
:::

::: solucion 10.3
```css title="src/index.css (añadido)"
.dark {
  --background: oklch(0.17 0.03 262);
  --foreground: oklch(0.95 0.01 250);
  --card: oklch(0.21 0.035 262);
  --card-foreground: oklch(0.95 0.01 250);
  --muted: oklch(0.26 0.03 260);
  --muted-foreground: oklch(0.72 0.03 255);
  --border: oklch(0.3 0.03 260);
  /* además: --popover, --input, --secondary, --accent… */
}
```

Al añadir la clase `dark` a `<html>`, cambian el fondo, las tarjetas, los textos y los bordes, porque todos usan tokens. No cambian los elementos con **colores escritos directamente**: los indicadores de estado (`bg-emerald-50 text-emerald-700`), la alerta de éxito, los textos `text-white` o el `toaster`, configurado con `theme="light"`. Para un modo oscuro completo habría que añadir variantes `dark:` en esos componentes o convertir también esos colores en tokens.
:::

::: respuestas 10
1. Colisiones de nombres, CSS que solo crece por miedo a borrar, inconsistencia visual y tener que saltar entre el componente y su hoja de estilos.
2. 1 rem (16 px): cuatro pasos de 0,25 rem. Una escala común hace que los espaciados de todas las pantallas encajen.
3. «En fila a partir de 640 px». Para algo solo en móvil: clase sin prefijo y anulación en el punto de ruptura, como `block lg:hidden`.
4. Radix pone `data-state="open"` en el disparador, marcado con la clase `group`, y la flecha tiene `group-data-[state=open]:rotate-90` y `transition-transform`.
5. Porque Tailwind genera el CSS buscando las clases como texto en el código fuente, y esa clase solo existe en ejecución.
6. Variables CSS con los valores en `:root`; el puente `@theme inline` que convierte cada variable en un token de Tailwind; y los estilos base en `@layer base`.
7. Es perceptualmente uniforme: la luminosidad se corresponde con la claridad percibida, lo que facilita crear variantes y combinaciones coherentes.
8. `clsx` une clases y descarta las falsas, pero no sabe que `px-2` y `px-4` chocan; `twMerge` resuelve el conflicto quedándose con la última.
9. Cuando el valor se calcula en ejecución a partir de datos, como la altura de cada barra de `LevelBadge`.
:::

## Capítulo 11 · shadcn/ui y Radix

::: solucion 11.1
`dialog.tsx` envuelve el primitivo `Dialog` de Radix y exporta `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription` y `DialogClose`. Un esbozo para la página de modificación:

```tsx
const [confirmOpen, setConfirmOpen] = useState(false)
// …
<Button type="button" variant="ghost" onClick={() => setConfirmOpen(true)} disabled={!isDirty || mutation.isPending}>
  <RotateCcw /> Descartar
</Button>
<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>¿Descartar los cambios?</DialogTitle>
      <DialogDescription>Se perderán las modificaciones que no has guardado.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setConfirmOpen(false)}>Seguir editando</Button>
      <Button variant="destructive" onClick={() => { form.reset(); mutation.reset(); setConfirmOpen(false) }}>
        Descartar
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

El diálogo se controla con estado local, igual que el `Sheet` de la cabecera. Radix aporta gratis el foco atrapado, el cierre con *Escape* y el bloqueo del desplazamiento.
:::

::: solucion 11.2
```ts title="src/components/ui/button.tsx (variante añadida)"
success: 'bg-success text-white shadow-xs hover:bg-success/90',
```

`--color-success` ya existe en `@theme inline`, así que `bg-success` está disponible. `VariantProps<typeof buttonVariants>` deriva ahora para `variant` el tipo `'default' | 'brand' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success' | null | undefined`, y el editor ofrece la nueva variante al autocompletar. No hay que tocar ningún otro tipo: está todo derivado de la definición.
:::

::: solucion 11.3
Con *Tab* el foco recorre: botón del menú (solo en móvil), enlaces del menú, *Nueva aplicación*, los dos filtros, *Limpiar filtros* (si está activo), las cabeceras ordenables, las acciones de cada fila y la paginación. En el filtro de estado, *Intro* o *Espacio* abren la lista, las flechas recorren las opciones, *Intro* selecciona y el foco vuelve al disparador. En el disparador verás `role="combobox"`, `aria-expanded="false"` que pasa a `"true"` al abrir y `aria-controls` apuntando al `id` de la lista.

En el menú móvil, el foco no sale del panel aunque sigas pulsando *Tab* (*focus trap*), *Escape* lo cierra y el foco vuelve al botón que lo abrió. Todo ello lo aporta el `Dialog` de Radix que hay debajo del `Sheet`.
:::

::: respuestas 11
1. Que implementa comportamiento, accesibilidad y estado de los componentes, pero no trae ningún estilo.
2. Por ejemplo: apertura y navegación con teclado, cierre con *Escape* o al hacer clic fuera, devolución del foco, atributos ARIA y posicionamiento de la lista.
3. Renderiza el contenido al final del `<body>` para que no lo recorte un `overflow: hidden` ni lo tape otro elemento por los `z-index`.
4. Porque no es una dependencia: su CLI copia el código de cada componente en el proyecto.
5. `cva` define las clases comunes y las de cada variante; `VariantProps` deriva de esa definición los tipos de las props `variant` y `size`.
6. Porque sus props se tipan como `React.ComponentProps<'button'>` y se propagan al elemento con `{...props}`.
7. Porque el `Select` de Radix solo trabaja con cadenas.
8. El `Dialog` de Radix: hereda la captura del foco, el cierre con *Escape*, el bloqueo del desplazamiento y la accesibilidad de un diálogo modal.
9. Que las mejoras del catálogo no llegan solas: hay que reaplicarlas a mano sobre el código propio.
:::

## Capítulo 12 · El layout y el sistema visual

::: solucion 12.1
Con `basePath: '/incidencias'`, `comingSoon` eliminado y dos `items`, el grupo aparece en el menú y los enlaces navegan, pero cada uno muestra la página 404 de la aplicación: el router no tiene rutas para `/incidencias`, así que encaja la ruta comodín `{ path: '*', element: <NotFoundPage /> }`. Faltaría crear el módulo con sus páginas, declarar `incidentRoutes` en su `routes.ts` y registrarlas en `app/router.tsx`, además de la regla del proxy si lo sirve otro servicio.
:::

::: solucion 12.2
```tsx
const storageKey = `nav-open:${module.id}`
const [open, setOpen] = useState(() => {
  try {
    return localStorage.getItem(storageKey) !== 'false'
  } catch {
    return true
  }
})

const handleOpenChange = (next: boolean) => {
  setOpen(next)
  try { localStorage.setItem(storageKey, String(next)) } catch { /* almacenamiento no disponible */ }
}
// <Collapsible open={open} onOpenChange={handleOpenChange}>
```

El valor se guarda **en el manejador**: es la respuesta a una acción del usuario, no una sincronización con el renderizado (capítulo 8). La inicialización con una función hace que `localStorage` se lea una sola vez, en el primer renderizado. Los `try/catch` cubren navegadores con el almacenamiento bloqueado. Como `SidebarNav` también se usa en el panel móvil, la preferencia se comparte entre ambos.
:::

::: solucion 12.3
```tsx
import { DetailField, LongText } from '@/components/common/detail-field'

export function ApplicationSummary({ application, columns = 2, className }: { /* … */ }) {
  const twoColumns = columns === 2
  return (
    <dl className={cn('grid gap-x-8 gap-y-5', twoColumns && 'sm:grid-cols-2', className)}>
      <DetailField label="Identificador"><span className="font-mono text-sm">#{application.id}</span></DetailField>
      {/* … */}
      <DetailField label="Descripción" className={twoColumns ? 'sm:col-span-2' : undefined}>
        <LongText value={application.description} />
      </DetailField>
    </dl>
  )
}
```

Se gana una única definición del aspecto de las fichas: si cambia el estilo de las etiquetas, cambia en aplicaciones y demandas a la vez. El riesgo es pequeño pero real: hay que comprobar que el aspecto es idéntico (clases, texto vacío por defecto «Sin descripción») y que nadie dependía del componente privado. Es una refactorización sin cambio de comportamiento, que conviene hacer en un *commit* separado.
:::

::: respuestas 12
1. Menú lateral, cabecera y cabecera de página son fijas en su forma; la zona variable es el `<Outlet />` con la página activa.
2. Porque en móviles la barra del navegador aparece y desaparece; `svh` usa la altura visible real y evita saltos.
3. La estructura de navegación es un dato que se puede leer y cambiar sin tocar la presentación, y añadir un módulo es añadir datos.
4. Para exigir coincidencia exacta de la ruta y que un enlace no quede activo en las rutas que empiezan por la suya.
5. El panel deslizante (`Sheet`) contiene el mismo `SidebarNav`, al que se pasa `onNavigate` para cerrarlo al navegar.
6. Para que guíe la vista hacia lo importante: la acción principal, la ubicación actual y el foco.
7. Que el nivel se lee por el número de barras, sin depender del color.
8. Mantiene los datos anteriores y muestra una franja de aviso encima en lugar de sustituirlos por el error.
:::

## Capítulo 13 · Organización por funcionalidad

::: solucion 13.1
`demand-edit-page.tsx` importa de: React y librerías (`react`, `react-router`, `react-hook-form`, `@hookform/resolvers/zod`, `sonner`, `lucide-react`); `components/ui` (alert, button, card, form, input, label, separator); `components/common` (page-header, resource-not-found, state-views); `lib` (api-client, form-errors, route-params); y del propio módulo, unas ocho importaciones repartidas entre `api/` (consultas), `components/` (campos, ficha, ciclo de vida), y `model/` (constantes, esquemas, reglas de estado, tipos). Cumple todas las reglas: ninguna importación de otro módulo ni de `app/`. La dependencia de aplicaciones llega indirectamente a través del campo *Aplicación*, que usa `application-options.ts`.
:::

::: solucion 13.2
```js title="eslint.config.js (bloques añadidos)"
{
  files: ['src/components/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{ group: ['@/features/*'], message: 'components/ y lib/ no pueden depender de los módulos.' }],
    }],
  },
},
{
  files: ['src/features/applications/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{ group: ['@/features/demands/*'], message: 'Aplicaciones no puede depender de Demandas.' }],
    }],
  },
},
```

`npm run lint` pasa sin errores con el código actual. Si añades en `pagination-bar.tsx` una importación de `@/features/applications/model/types`, ESLint muestra el mensaje configurado. Para reglas más completas (por ejemplo, «cada módulo solo puede importar la API pública de otro») existen plugins dedicados, como `eslint-plugin-boundaries`.
:::

::: solucion 13.3
(a) `components/common` (o una función en `lib/format.ts` y un componente común que la use): no sabe nada del dominio. (b) `features/incidents/model/types.ts`. (c) La apariencia del semáforo en `components/common` si otros módulos pueden necesitarla (como `StatusPill`); la correspondencia entre niveles de SLA y colores, en el módulo. (d) `features/incidents/model/` (por ejemplo, `sla-rules.ts`), como función pura con sus pruebas, igual que `status-rules.ts`. (e) El hook que obtiene los equipos debería vivir en el módulo de equipos (`features/teams/api/`) y exponerse para otros módulos, como hace `useApplicationOptions`; mientras no exista ese módulo, puede empezar en incidencias y moverse después.
:::

::: respuestas 13
1. Por tipo técnico, el código de una funcionalidad se reparte en carpetas por clase de artefacto; por funcionalidad, cada módulo agrupa todo lo suyo y solo lo transversal vive fuera.
2. `app/`, para registrar las rutas de todos los módulos en el router.
3. Porque dejaría de ser común: dependería del dominio y crearía dependencias en ambas direcciones.
4. Es unidireccional, estrecha (un hook y una constante pensados para ello), está concentrada en un único fichero y refleja una relación real del dominio.
5. Si necesita saber algo del dominio, si lo usan varios módulos o es un patrón claro, y separar la apariencia del significado.
6. `StatusPill` y `LevelBadge` (comunes) definen el aspecto de un estado o un nivel; `application-badges.tsx` (del módulo) decide qué tono o nivel corresponde a cada valor del dominio.
7. Porque las funciones normales se prueban y reutilizan sin montar componentes, también fuera de React.
8. Valores que llegan como `undefined` en ejecución y errores del tipo *Cannot access 'X' before initialization*.
:::

## Capítulo 14 · Anatomía de un módulo

::: solucion 14.1
Las diferencias **de dominio**: el *hook* de datos (`useDemands`), los componentes de filtros y tabla, las funciones de la URL, los textos y los filtros que cuentan para `hasFilters` (aplicación, estado y prioridad). Las **accidentales**: los nombres de las funciones de la URL (`parseDemandListParams` frente a `parseListParams`) y pequeñas diferencias de redacción u orden. La estructura es idéntica: lectura de la URL con `useMemo`, `updateParams` con `useCallback`, el efecto de corrección de página, la cadena de estados y la paginación.

Extraer más código común (por ejemplo, un hook `useUrlListState(parse, serialize)` que devuelva `params` y `updateParams`, o un componente `ListPageLayout`) eliminaría duplicación. A favor: un único sitio que corregir. En contra: más abstracción que entender, y el riesgo de que el tercer módulo no encaje. Con dos módulos casi idénticos y un tercero en camino, el hook de estado en la URL sí parece justificado; un componente de página genérico, probablemente todavía no.
:::

::: solucion 14.2
El frontend ofrece `id`, `title`, `application.name`, `priority`, `status`, `createdAt` y `updatedAt`. El backend acepta `id`, `title`, `priority`, `status` y `updatedAt`. Por tanto, **ordenar por *Aplicación* o por fecha de creación produce un `400 Invalid demand sort field`**. El usuario ve el estado de error del listado con ese mensaje, y la URL queda con `?orden=createdAt,asc`, así que al recargar se repite el error.

El origen está en la separación de las aplicaciones en otro servicio: la ordenación por nombre de aplicación necesitaba una consulta que unía ambas tablas, y ya no es posible en la base de datos de demandas. Soluciones: en el **frontend**, alinear `DEMAND_SORT_FIELDS` con la lista del backend (quitar `application.name` y `createdAt`, o hacer esas columnas no ordenables) y, de paso, que una URL antigua con esos valores se descarte al leerla; en el **backend**, volver a admitir `createdAt` (es una columna propia de `Demand`, fácil de añadir) y decidir cómo ordenar por nombre de aplicación (por ejemplo, guardando una copia del nombre en la demanda). Lo razonable es ambas: corregir ya el frontend para no ofrecer lo que el backend rechaza, y decidir en el backend si se recupera la funcionalidad. Es una de las notas de integración del capítulo 25.
:::

::: solucion 14.3
```ts title="features/incidents/model/types.ts (borrador)"
export const INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]

export const INCIDENT_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

/** IncidentResponse (PENDIENTE: confirmar nombres con el DTO del backend). */
export interface Incident {
  id: number
  title: string
  description: string | null
  severity: IncidentSeverity
  status: IncidentStatus
  applicationId: number
  applicationName: string      // PENDIENTE: ¿lo devuelve el backend, como en demandas?
  createdAt: string            // Instant ISO-8601
  resolvedAt: string | null
}

export interface IncidentListParams {
  applicationId?: number
  status?: IncidentStatus
  severity?: IncidentSeverity
  page: number
  size: number
  sortField: IncidentSortField  // PENDIENTE: lista validada por el backend
  sortDirection: SortDirection
}
```

```ts title="features/incidents/model/constants.ts (borrador)"
export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  OPEN: 'Abierta', IN_PROGRESS: 'En curso', RESOLVED: 'Resuelta', CLOSED: 'Cerrada',
}
export const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica',
}
// PENDIENTE: alinear con @PageableDefault y @Size del backend
export const DEFAULT_INCIDENT_LIST_PARAMS: IncidentListParams = { page: 0, size: 10, sortField: 'id', sortDirection: 'desc' }
```

Las decisiones sin backend (nombres de campos, si llega el nombre de la aplicación, campos ordenables, valores por defecto, longitudes) se marcan con comentarios `PENDIENTE` y se resuelven leyendo el controlador y los DTO cuando existan. Lo que sí puede decidirse ya es la estructura y las etiquetas.
:::

::: respuestas 14
1. `model/` (tipos, constantes, esquemas, reglas, URL), `api/` (endpoints y consultas), `components/` (presentación del módulo) y `pages/` (orquestación). Las páginas usan todo; los componentes y la API usan `model/`; `model/` no usa a nadie.
2. Para ser una base estable, reutilizable y fácil de probar con pruebas unitarias sencillas.
3. Los que reflejan los DTO del backend y los propios del frontend, como los criterios del listado.
4. La URL (la ve y comparte el usuario), el objeto de la interfaz (lo usan los componentes) y la consulta a la API (la espera Spring Data).
5. `-api.ts` contiene un método por endpoint, sin lógica; `-queries.ts` envuelve esos métodos en hooks de TanStack Query con sus claves de caché e invalidaciones.
6. Para ser reutilizables con datos de cualquier origen y mantener la carga de datos en un único sitio por pantalla.
7. Leer y validar la URL, pedir los datos, decidir qué estado mostrar, componer los componentes y gestionar las acciones del usuario.
8. Crear el módulo, declarar sus rutas y registrarlas en el router, añadir su entrada al menú y, si lo sirve otro servicio, la regla del proxy.
:::

## Capítulo 15 · El cliente HTTP y la gestión de errores

::: solucion 15.1
(a) `GET /api/applications/999999` → **404** con cuerpo `{ status: 404, error: 'RESOURCE_ERROR', message: 'Application not found: 999999', fieldErrors: {} }` (si el servicio de aplicaciones usa el mismo formato que el de demandas). `kind: 'not-found'`; el usuario ve el aviso de aplicación inexistente. En *Network* verás una sola petición: los 404 no se reintentan.

(b) `POST /api/applications` con nombre vacío → **400** con `error: 'VALIDATION_ERROR'`, `message: 'La petición contiene campos inválidos'` y `fieldErrors: { name: '…' }` con el mensaje de Bean Validation. `kind: 'validation'`. Si llegara desde el formulario, `applyServerFieldErrors` lo colocaría bajo el campo *Nombre*.

(c) Con el servicio de aplicaciones detenido, *Nueva demanda* llama a `/api/applications` para el desplegable: el proxy de Vite responde **500** (o 502) sin el formato del backend y la terminal muestra `ECONNREFUSED`; `kind: 'server'` y mensaje por defecto, tras dos reintentos. Si intentas guardar la demanda, el servicio de demandas no puede validar la aplicación y responde **503** con `message: 'Application Catalog is unavailable'`: también `kind: 'server'`, esta vez con el mensaje del backend.
:::

::: solucion 15.2
```ts title="src/lib/api-client.ts"
export const apiClient = {
  // …
  delete: <T = void>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
}
```

```ts title="src/lib/api-client.test.ts"
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from './api-client'

describe('apiClient.delete', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('devuelve undefined con una respuesta 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiClient.delete('/applications/7')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/applications/7', expect.objectContaining({ method: 'DELETE' }))
  })
})
```

El genérico con valor por defecto `T = void` documenta que normalmente no se espera cuerpo. La segunda aserción comprueba además la URL construida y el método.
:::

::: solucion 15.3
En `apiRequest`, se obtendría el *token* de un único sitio (por ejemplo, una función `getAccessToken()` de un módulo de autenticación) y se añadiría a las cabeceras una entrada `Authorization` con el valor `Bearer ` seguido del *token*, solo cuando exista (con el mismo *spread* condicional que ya se usa para `Content-Type`). Para el 401, tras `toApiError`, si `status === 401` se notificaría a un único gestor (un evento o una función registrada por el módulo de autenticación) que limpie la sesión, vacíe la caché de TanStack Query y redirija al inicio de sesión; además, se añadiría `401` a la lista de errores que no se reintentan (ya lo cubre la regla de 4xx).

Sobre el almacenamiento: **en memoria** es lo más seguro frente a XSS, pero se pierde al recargar; **`localStorage`** sobrevive a recargas, pero cualquier script inyectado puede leerlo; una **cookie `HttpOnly`** emitida por el backend no es accesible desde JavaScript (la opción más robusta frente a XSS), y con la topología de mismo origen (capítulo 16) funciona sin CORS, aunque exige protección CSRF. En aplicaciones empresariales, la opción habitual es la *cookie* `HttpOnly` gestionada por el backend o por una pasarela.
:::

::: respuestas 15
1. La URL base, las cabeceras, la serialización a JSON, los parámetros vacíos, la comprobación de `ok`, la interpretación de los errores, los fallos de red y la cancelación.
2. Porque el cuerpo puede estar vacío o no ser JSON; leerlo como texto permite decidir antes de parsear sin provocar excepciones.
3. Se omite de la cadena de consulta, y para Spring un parámetro ausente significa «sin filtro».
4. `network` (sin conexión), `validation` (errores por campo o datos no válidos), `not-found` (aviso de inexistente), `client` (mensaje; en demandas el 409 tiene tratamiento propio) y `server` (error con reintento).
5. Porque puede recibir JSON del backend, el formato por defecto de Spring, HTML de un proxy o nada, y siempre debe producir un error válido.
6. Un 400 con `VALIDATION_ERROR` y `fieldErrors`; el frontend coloca cada mensaje en su campo con `applyServerFieldErrors`.
7. Porque repetir una petición incorrecta da el mismo resultado; solo tiene sentido reintentar fallos transitorios.
8. En `apiRequest`, porque es el único punto por el que pasan todas las peticiones.
:::

## Capítulo 16 · CORS, proxy y despliegue

::: solucion 16.1
Con `VITE_API_BASE_URL=http://localhost:8081/api`, el navegador llama directamente al servicio de aplicaciones, que es otro origen. La consola muestra *Access to fetch at 'http://localhost:8081/api/applications?…' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource*. En *Network* la petición aparece como fallida (*CORS error*), aunque el servidor sí la ha recibido y respondido. `fetch` rechaza la promesa, así que la interfaz recibe un `ApiError` de tipo `network` («No se puede conectar con el servidor»). El proxy ya no interviene porque solo actúa sobre rutas relativas a `localhost:5173` que empiezan por `/api/...`.
:::

::: solucion 16.2
```bash
npm run build
docker run --rm -p 8088:80 \
  -v "$PWD/dist:/usr/share/nginx/html:ro" \
  -v "$PWD/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:1.27-alpine
```

En `nginx.conf`, los destinos son `proxy_pass http://host.docker.internal:8081;` y `http://host.docker.internal:8080;`. En Linux puede hacer falta añadir `--add-host=host.docker.internal:host-gateway`. Al abrir `http://localhost:8088/demandas/1` y recargar, `try_files` devuelve `index.html` y React Router pinta la ficha. Los ficheros de `/assets/` llegan con `Cache-Control: public, max-age=31536000, immutable`, e `index.html` con `no-cache`.
:::

::: solucion 16.3
Una propuesta razonable: **opción A con el balanceador**. Reglas por prefijo: `/api/applications/*` al servicio de aplicaciones, `/api/demands/*` al de demandas, y todo lo demás a un contenedor Nginx con el `dist/` (o al almacenamiento estático, si el balanceador puede enrutar a él). El frontend se construye una vez con `/api` relativo y la imagen se promociona entre entornos. Configuración necesaria: las reglas del balanceador, el Nginx con *fallback* y cabeceras de caché, HTTPS en el balanceador y cabeceras de seguridad. Riesgos: que el orden de las reglas del balanceador envíe las rutas de la API al contenedor de la SPA (se probaría con una batería de rutas tras cada cambio), y la caché de `index.html` tras un despliegue. La CDN con dominio propio (opción B) se descartaría salvo que el rendimiento global lo exigiera, porque obligaría a configurar CORS en los dos servicios y a construir por entorno.
:::

::: respuestas 16
1. Esquema, host y puerto. No: cambia el puerto.
2. Al usuario: impide que una web maliciosa lea, con las credenciales del usuario, datos de otra web en la que está autenticado.
3. Un `OPTIONS` automático que el navegador envía antes de ciertas peticiones entre orígenes (métodos distintos de GET/HEAD/POST, cabeceras o tipos de contenido no simples) para preguntar si están permitidas.
4. Porque el navegador solo habla con Vite (mismo origen) y Vite reenvía al backend desde Node, donde no aplica la política del mismo origen.
5. Proxy inverso con mismo origen (la recomendada), orígenes distintos con CORS en el backend, y la SPA servida por el propio backend.
6. Porque el JavaScript llama a `/api` de su propio origen y es el proxy de cada entorno quien sabe dónde están los servicios; no hay URLs del entorno incrustadas en el *build*.
7. `index.html`: `no-cache`. `assets/`: caché de larga duración e inmutable, porque sus nombres cambian con el contenido.
8. No. CORS solo controla qué páginas pueden leer las respuestas en un navegador; cualquier cliente fuera del navegador puede llamar a la API, y la protección es la autenticación y la autorización del backend.
:::

## Capítulo 17 · TanStack Query

::: solucion 17.1
```bash
npm install -D @tanstack/react-query-devtools
```

```tsx title="src/app/app.tsx"
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
// …
<QueryClientProvider client={queryClient}>
  {/* … */}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

Aparece un botón flotante que abre el panel. Verás `["applications","list",{…}]` en verde (fresca) y, a los 30 segundos, en amarillo (obsoleta); al salir de la pantalla, en gris (inactiva). Al crear una aplicación, `["applications","detail",<id>]` aparece ya con datos sin haber hecho ninguna petición (`setQueryData`), y los listados pasan a obsoletos y se refrescan. Ten en cuenta que el paquete se instala como dependencia de desarrollo pero se importa desde `src`, así que Vite lo procesa; la librería devuelve un componente vacío en producción.
:::

::: solucion 17.2
Dentro de los 30 segundos, solo hay una petición al listado (la primera) y una al detalle: al volver, el listado sale de la caché sin petición. Pasados los 30 segundos, al volver se muestra al instante el listado en caché y se lanza una petición en segundo plano. Con `staleTime: 0`, cada vuelta al listado provoca una petición (aunque la pantalla se pinta igualmente al instante con los datos en caché). El compromiso: un `staleTime` alto reduce peticiones y carga del backend a costa de mostrar datos de hasta ese tiempo de antigüedad; uno bajo maximiza la frescura con más tráfico. Para datos de gestión que cambian con poca frecuencia, 30 segundos es un buen punto medio, y las invalidaciones tras escribir garantizan que lo que cambia el propio usuario se ve al momento.
:::

::: solucion 17.3
```tsx title="src/features/applications/components/applications-table.tsx (idea)"
const queryClient = useQueryClient()
const prefetchDetail = (id: number) =>
  queryClient.prefetchQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: ({ signal }) => applicationsApi.getById(id, signal),
  })
// …
<div onMouseEnter={() => prefetchDetail(app.id)}>
  <RowAction to={`/aplicaciones/${app.id}`} label={`Ver detalle de ${app.name}`}><Eye /></RowAction>
</div>
```

`prefetchQuery` respeta el `staleTime`: si el detalle ya está fresco, no hace nada. Importar `applicationKeys` y `applicationsApi` desde un componente del propio módulo es correcto; para no acoplar la tabla a la caché, lo más limpio sería exponer un hook `usePrefetchApplication()` en `applications-queries.ts`. No compensa cuando la petición es cara, cuando hay muchas filas y el usuario recorre la tabla con el ratón (decenas de peticiones inútiles), o en dispositivos táctiles, donde no existe el evento de pasar el ratón.
:::

::: respuestas 17
1. No es del cliente (solo hay una copia), es asíncrono, se comparte entre pantallas y queda obsoleto cuando cambia en el servidor.
2. `isPending`: no hay datos que mostrar; `isFetching`: hay una petición en curso. El listado muestra el esqueleto con el primero y, con el segundo, atenúa la tabla y desactiva la paginación.
3. Fresca: se sirve sin pedir durante `staleTime`. Obsoleta: se sirve y se refresca al volver a usarse. Inactiva: sin observadores, se conserva durante `gcTime` y después se elimina.
4. Para no repetir peticiones al navegar entre pantallas y para evitar refrescos y parpadeos inesperados al volver a la pestaña.
5. Los 4xx no cambian por repetirlos; las mutaciones podrían duplicar escrituras.
6. Todas las consultas cuya clave empieza por `['applications', 'list']`: todos los listados con cualquier parámetro y el catálogo de opciones, cuya clave cuelga de ese prefijo.
7. `setQueryData` guarda la respuesta como detalle (disponible al instante) e `invalidateQueries` marca los listados como obsoletos para que se refresquen. Insertar a mano exigiría replicar filtros, orden y paginación del servidor.
8. Cada respuesta se guarda en la entrada de su propia clave, y la pantalla solo observa la clave actual; además, la petición que ya no interesa se cancela con su `signal`.
:::

## Capítulo 18 · React Router

::: solucion 18.1
```tsx title="src/features/applications/pages/applications-report-page.tsx"
import { PageHeader } from '@/components/common/page-header'

export function ApplicationsReportPage() {
  return <PageHeader eyebrow="Aplicaciones" title="Informe de aplicaciones" description="Próximamente." />
}
```

```ts title="src/features/applications/routes.ts (nueva hija)"
{
  path: 'informe',
  handle: { title: 'Informe de aplicaciones' },
  lazy: () =>
    import('./pages/applications-report-page').then((m) => ({ Component: m.ApplicationsReportPage })),
},
```

Al visitar `/aplicaciones/informe`, la pestaña muestra «Informe de aplicaciones · IT Service Manager» y en *Network* aparece un *chunk* nuevo (en desarrollo, el módulo de la página). No se confunde con `:id` y **da igual dónde la declares**: React Router puntúa las rutas y un segmento estático gana a uno dinámico, sea cual sea el orden del array.
:::

::: solucion 18.2
```tsx title="src/components/layout/breadcrumbs.tsx"
import { Link, useMatches } from 'react-router'

export function Breadcrumbs() {
  const crumbs = useMatches()
    .map((m) => ({ pathname: m.pathname, crumb: (m.handle as { crumb?: string } | undefined)?.crumb }))
    .filter((m): m is { pathname: string; crumb: string } => Boolean(m.crumb))

  return (
    <nav aria-label="Migas de pan" className="mb-2 text-xs text-muted-foreground">
      {crumbs.map((c, i) => (
        <span key={c.pathname}>
          {i > 0 && ' / '}
          {i < crumbs.length - 1 ? <Link to={c.pathname} className="hover:underline">{c.crumb}</Link> : c.crumb}
        </span>
      ))}
    </nav>
  )
}
```

El filtro usa una guarda de tipo para que TypeScript sepa que `crumb` ya no es `undefined`. El último elemento no es enlace (es la página actual). Para el nombre de la aplicación, el layout no tiene sus datos: los tiene la página. Opciones: que la miga lea el detalle de la caché con `useQueryClient().getQueryData(applicationKeys.detail(id))` usando el parámetro de la ruta, o que el `handle.crumb` sea una función que reciba los parámetros (`crumb: (params) => …`). La primera es sencilla porque el detalle ya está en caché cuando se pinta la página.
:::

::: solucion 18.3
```tsx
const navigate = useNavigate()
// en onSubmit, tras mutateAsync:
toast.success('Aplicación creada', { description: `«${result.name}» con identificador #${result.id}.` })
navigate(`/aplicaciones/${result.id}`)
```

La ficha aparece **sin estado de carga**, porque `useCreateApplication` ya guardó la aplicación creada en `applicationKeys.detail(id)` con `setQueryData`: `useApplication(id)` encuentra los datos frescos en la caché. Sobre la experiencia: ir al detalle es más directo si lo habitual es crear una aplicación y trabajar con ella; la tarjeta de resultado original es mejor si se crean varias seguidas (*Crear otra*). Una opción intermedia es navegar al detalle y ofrecer en la notificación una acción «Crear otra».
:::

::: respuestas 18
1. Declarativo, de datos y *framework*. El proyecto usa el modo de datos, sin cargadores.
2. Para agrupar rutas bajo un elemento común, aquí un `errorElement`, sin consumir ningún segmento de la URL.
3. Marca dónde se pinta la ruta hija activa; lo usa `AppLayout` dentro de `<main>`.
4. Porque React Router puntúa las rutas y un segmento estático (`nueva`) vale más que uno dinámico (`:id`).
5. Porque la URL la puede escribir cualquiera y los parámetros llegan como texto. `parseEntityId` solo acepta enteros seguros positivos y devuelve `undefined` en otro caso, evitando peticiones inútiles.
6. `Link` para enlaces que pulsa el usuario; `NavLink` para enlaces que deben saber si están activos (menú); `useNavigate` para navegar desde código tras una acción; `<Navigate />` para redirigir al renderizar.
7. Sin `replace` se añade una entrada al historial; con `replace` se sustituye la actual, de modo que *atrás* no vuelve a ella.
8. En la carga inicial, `hydrateFallbackElement` (el `LoadingState` a pantalla completa); en una navegación posterior, mantiene la pantalla actual hasta que la nueva está lista.
9. URL sin ruta (ruta comodín → `NotFoundPage`), recurso inexistente o `id` inválido (la página → `ResourceNotFound`) y error de renderizado (`errorElement` → `RouteErrorPage`).
:::

## Capítulo 19 · El estado del listado en la URL

::: solucion 19.1
Se añadiría `search?: string` a `ApplicationListParams`; en `parseListParams`, `search: search.get('buscar')?.trim() || undefined` (quizá con una longitud máxima); en `serializeListParams`, `if (params.search) search.set('buscar', params.search)`; y en `toApiQuery`, `name: params.search`. Las pruebas: lectura, omisión cuando está vacío y reversibilidad.

No conviene que cada pulsación cree una entrada en el historial ni una petición. Un ***debounce*** retrasa la acción hasta que el usuario deja de escribir un tiempo (por ejemplo, 300 ms). Una forma de hacerlo: el campo de texto tiene su propio `useState` (valor inmediato, para que escribir sea fluido) y un efecto con `setTimeout` que, pasado ese tiempo sin cambios, llama a `updateParams({ search: valor, page: 0 }, { replace: true })`, con su limpieza (`clearTimeout`). El `replace` evita llenar el historial con cada palabra a medio escribir.
:::

::: solucion 19.2
```ts title="src/features/demands/model/list-params.test.ts (prueba añadida)"
it('descarta campos de ordenación que el backend no admite', () => {
  const params = parseDemandListParams(new URLSearchParams('orden=createdAt,asc'))
  expect(params.sortField).toBe(DEFAULT_DEMAND_LIST_PARAMS.sortField)
})
```

Con el código actual **falla**: `createdAt` está en `DEMAND_SORT_FIELDS`, así que `parseSortParam` lo acepta como válido y el listado acabaría pidiendo un orden que el backend rechaza con un 400. Al quitar `createdAt` (y `application.name`) de `DEMAND_SORT_FIELDS`, la validación lo descarta y la prueba pasa. Es un ejemplo de prueba que documenta un contrato con el backend: si la lista vuelve a divergir, la prueba lo dirá.
:::

::: solucion 19.3
```ts title="src/hooks/use-url-list-state.ts"
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

export function useUrlListState<P extends object>(
  parse: (search: URLSearchParams) => P,
  serialize: (params: P) => URLSearchParams,
) {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useMemo(() => parse(searchParams), [parse, searchParams])
  const updateParams = useCallback(
    (patch: Partial<P>, options?: { replace?: boolean }) =>
      setSearchParams(serialize({ ...params, ...patch }), options),
    [params, serialize, setSearchParams],
  )
  return { params, updateParams }
}
```

En la página: `const { params, updateParams } = useUrlListState(parseListParams, serializeListParams)`. Funciona sin más precauciones porque `parseListParams` y `serializeListParams` son funciones de módulo, con referencia estable; si se pasaran funciones creadas en el componente, la memorización dejaría de servir. El efecto de corrección de página puede ir en otro hook, `useClampPage(totalPages, page, updateParams)`, o quedarse en la página: depende de los datos de la consulta (`totalPages`), que el hook de la URL no conoce, y mezclar ambas cosas lo acoplaría a TanStack Query.
:::

::: respuestas 19
1. Recargar la página, compartir el enlace, guardarlo en marcadores y volver con *atrás* desde un detalle conservando filtros y página (además de recorrer las páginas con el historial).
2. Porque los códigos son estables e inequívocos; las etiquetas pueden cambiar o traducirse y romperían los enlaces guardados.
3. Para que la URL del listado sin cambios sea limpia (`/aplicaciones`) y estable.
4. Que la página no guarda ninguna copia de los parámetros: los calcula de la URL en cada renderizado y los cambia escribiendo en la URL.
5. Ambos valores se descartan al leer: se usan el tamaño por defecto (10) y ningún filtro de estado.
6. Porque cambian el conjunto de resultados o su orden, y la página actual deja de tener sentido (o de existir).
7. En la corrección automática de una página fuera de rango, porque no es una acción del usuario y volver a ella con *atrás* no tendría sentido.
8. Con un enlace a `/demandas?aplicacion=7`: el listado de demandas lee el parámetro como su filtro.
9. Que los valores por defecto producen una URL vacía y que serializar y volver a leer devuelve exactamente los mismos parámetros.
:::

## Capítulo 20 · React Hook Form y Zod

::: solucion 20.1
```ts title="src/features/applications/model/schemas.ts (campo añadido)"
const ownerField = z
  .string()
  .trim()
  .email('Introduce un correo electrónico válido.')
  .or(z.literal(''))

export const applicationCreateSchema = z.object({
  name: nameField,
  description: descriptionField,
  criticality: criticalityField,
  owner: ownerField,
})
```

`OwnerField` sería un `TextInputField` con `name="owner"`, etiqueta «Responsable» y descripción «Opcional.» (y `maxLength`, por ejemplo 254). Pruebas: vacío válido, correo válido, `'no-es-un-correo'` inválido. Hay que añadir `owner: ''` a `EMPTY_FORM` y a `toFormValues`.

Si se enviara en el DTO, depende de la configuración de Jackson en el backend: por defecto, Spring Boot **ignora** las propiedades desconocidas (`FAIL_ON_UNKNOWN_PROPERTIES` desactivado), así que el campo se perdería en silencio y el usuario creería haberlo guardado. Si estuviera activado, la petición fallaría con un 400. En ambos casos, enviar campos que el contrato no define es un error.
:::

::: solucion 20.2
- **`onSubmit`**: no molesta mientras se rellena el formulario por primera vez; los errores aparecen todos al enviar. Ideal para formularios cortos como estos.
- **`onTouched`**: valida cada campo al salir de él y, después, al cambiar; da información temprana sin interrumpir mientras se escribe, pero puede mostrar errores en campos que el usuario solo ha atravesado con el tabulador.
- **`onChange`**: valida en cada pulsación; da la respuesta más inmediata, pero muestra errores mientras el usuario aún está escribiendo (por ejemplo, «correo no válido» tras la primera letra) y provoca más renderizados.
:::

::: solucion 20.3
Con el error simulado, el mensaje «ya existe una aplicación con ese nombre» aparece bajo el campo *Nombre*, con el campo marcado como inválido, y la alerta general muestra «La petición contiene campos inválidos». `applyServerFieldErrors` solo actúa porque `kind` es `validation` y `name` está en la lista de campos conocidos; si el error viniera para un campo que no existe en el formulario (por ejemplo, `code`), no se asignaría a ningún campo y solo quedaría la alerta. En cuanto el usuario modifica el nombre, React Hook Form revalida el campo con el esquema y el error de servidor desaparece.
:::

::: respuestas 20
1. Zod describe las reglas, valida y transforma los datos y deriva sus tipos; React Hook Form gestiona valores, errores, estado de modificación, envío y reinicio.
2. `z.string().trim().min(1, '…')`. `trim()` es necesario para que una cadena de solo espacios cuente como vacía, igual que en `@NotBlank`.
3. `z.input` es el tipo que maneja el formulario antes de validar; `z.output`, el que se obtiene tras validar y transformar. `applicationId` entra como `string` (el desplegable) y sale como `number` (el DTO).
4. Porque guarda el estado en un almacén propio y solo renderiza los componentes suscritos a lo que cambia (cada campo, el contador con `useWatch`).
5. Valida al enviar y, tras el primer intento, al cambiar cada campo. Se eligió para no mostrar errores antes de que el usuario haya intentado enviar.
6. Porque no es un `<select>` nativo: hay que conectar `value`, `onValueChange`, `onBlur` y `ref` por separado.
7. `null` en la API se convierte en `''` al cargar (`?? ''`), y una descripción vacía o de espacios se envía como `null` (`normalizeDescription`).
8. Para que el formulario refleje lo que realmente quedó guardado y para que esos valores sean la nueva referencia de `isDirty`.
9. Para añadir una validación que depende del estado actual de la demanda: rechazar las transiciones no permitidas con un error en el campo `status`.
:::

## Capítulo 21 · El módulo de aplicaciones de principio a fin

::: solucion 21.1
Una traza típica: `GET list` (página 1) → al filtrar, `GET list?status=INACTIVE` → página 2, `GET list?status=INACTIVE&page=1` → detalle, `GET /api/applications/7` → *Modificar*: **ninguna petición** si no han pasado 30 segundos (el detalle está en caché y fresco) → guardar: `PUT /api/applications/7` y, como no hay ningún listado en pantalla, ningún `GET` inmediato: los listados se marcan como obsoletos → *Volver al listado*: se muestra al instante la versión en caché de `/aplicaciones` y se refresca en segundo plano (`GET list`), porque fue invalidada. Si la aplicación modificada dejara de cumplir el filtro, desaparecería de la lista tras ese refresco.
:::

::: solucion 21.2
```tsx title="src/features/applications/pages/application-create-page.tsx (en CreatedResult)"
<Button asChild variant="outline">
  <Link to={`/demandas/nueva?aplicacion=${application.id}`}>
    <ClipboardList /> Crear demanda para esta aplicación
  </Link>
</Button>
```

Lo hace posible el parámetro `aplicacion` de la URL, que lee `DemandCreatePage` con `parseIdParam(searchParams.get('aplicacion'))` para inicializar el formulario con la aplicación preseleccionada. El desplegable encontrará la nueva aplicación en el catálogo porque la invalidación de `lists()` tras el alta refresca también la clave de opciones.
:::

::: solucion 21.3
```tsx title="src/features/applications/pages/application-edit-page.tsx (idea)"
const blocker = useBlocker(
  ({ currentLocation, nextLocation }) => isDirty && !mutation.isPending && currentLocation.pathname !== nextLocation.pathname,
)

useEffect(() => {
  if (!isDirty) return
  const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
  window.addEventListener('beforeunload', onBeforeUnload)
  return () => window.removeEventListener('beforeunload', onBeforeUnload)
}, [isDirty])

// Si blocker.state === 'blocked', se muestra un diálogo con blocker.proceed() y blocker.reset()
```

`useBlocker` recibe una función que decide si bloquear cada navegación interna; cuando bloquea, `blocker.state` vale `'blocked'` y se puede mostrar un diálogo (el del ejercicio 11.1) que llame a `proceed()` o `reset()`. `beforeunload` cubre el cierre de la pestaña o la recarga, donde el navegador muestra su propio aviso genérico. No debe bloquearse **justo después de guardar**: como `form.reset(result)` deja `isDirty` en `false`, la navegación posterior ya no se bloquea; y tampoco mientras se está guardando, para no interferir con una navegación tras el éxito.
:::

::: respuestas 21
1. `/aplicaciones` (GET listado), `/aplicaciones/nueva` (POST), `/aplicaciones/modificar` (GET detalle y GET listado), `/aplicaciones/:id` (GET detalle) y `/aplicaciones/:id/editar` (GET y PUT).
2. El router carga la página con `lazy`, la página interpreta la URL y llama a `useApplications`, TanStack Query detecta que no hay datos y ejecuta la `queryFn`, que usa el cliente HTTP; la respuesta vuelve a la caché y la página se renderiza con los datos.
3. Porque la URL anterior produce los mismos parámetros, es decir, la misma clave de caché, y sus datos siguen frescos o, al menos, disponibles.
4. `handleSubmit` valida con Zod, muestra «Selecciona una criticidad.» bajo el campo, pone el foco en él y no hace ninguna petición.
5. Porque la mutación de alta guardó la respuesta en la clave del detalle con `setQueryData`.
6. Buscar por identificador (estado local del campo y `searchedId`, que activa una consulta dependiente) y seleccionar del catálogo (parámetros del listado en `useState`).
7. Porque el contrato del backend (`ApplicationUpdateRequest`) define la modificación completa del recurso con todos sus campos validados.
8. No: cada pestaña tiene su propia caché. Los verá cuando los datos se consideren obsoletos y se refresquen (a partir de 30 segundos, al volver a usarlos).
9. La ordenación alfabética de la criticidad (se guarda como texto) y la ausencia de búsqueda por nombre.
:::

## Capítulo 22 · El módulo de demandas

::: solucion 22.1
En la segunda pestaña, que cree que la demanda está *Abierta*, *Completada* aparece desactivada: `OPEN → COMPLETED` no es una transición válida y el desplegable no la permite (capa 1). En el segundo experimento, la segunda pestaña envía *Cancelada* creyendo que el estado es `OPEN`: para el cliente, una transición válida. El servidor, que tiene la demanda en `COMPLETED`, responde **409** con `message: 'Invalid demand status transition: COMPLETED -> CANCELLED'`. El usuario ve «Cambio rechazado por el servidor · El servidor no permite pasar de «Completada» a «Cancelada». Puede que la demanda haya cambiado mientras la editabas.» Al pulsar *Recargar datos actuales*, se pide de nuevo la demanda, el formulario muestra el estado *Completada*, el desplegable queda desactivado (estado final) y desaparece la alerta.
:::

::: solucion 22.2
```ts title="src/features/demands/model/types.ts"
export const DEMAND_SORT_FIELDS = ['id', 'title', 'priority', 'status', 'updatedAt'] as const
```

`npm run typecheck` señala `demands-table.tsx`, donde `SortableTableHead field="application.name"` y `field="createdAt"` ya no son valores de `DemandSortField`. Esas columnas pasan a `TableHead` normales. Hay que revisar también las pruebas de `list-params.test.ts` que usaran esos campos, y añadir la del ejercicio 19.2. Con el cambio, `?orden=createdAt,asc` se descarta al leer la URL y se usa el orden por defecto (`id` descendente). Conviene recoger en las notas de integración la pregunta abierta para el backend: ¿se vuelve a admitir `createdAt`?
:::

::: solucion 22.3
```tsx title="src/features/demands/components/status-actions.tsx (idea)"
const ACTION_LABELS: Partial<Record<DemandStatus, string>> = {
  IN_PROGRESS: 'Iniciar', COMPLETED: 'Completar', CANCELLED: 'Cancelar',
}

export function StatusActions({ demand }: { demand: Demand }) {
  const mutation = useUpdateDemand(demand.id)
  const change = async (status: DemandStatus) => {
    if (isFinalStatus(status) && !window.confirm(`¿Seguro? «${DEMAND_STATUS_LABELS[status]}» es un estado final.`)) return
    try {
      await mutation.mutateAsync({
        title: demand.title, description: demand.description, priority: demand.priority,
        applicationId: demand.applicationId, status,
      })
      toast.success('Estado actualizado')
    } catch {
      // el error se muestra a partir de mutation.error
    }
  }
  return (
    <div className="flex gap-2">
      {getNextStatuses(demand.status).map((s) => (
        <Button key={s} size="sm" variant={s === 'CANCELLED' ? 'outline' : 'default'}
                disabled={mutation.isPending} onClick={() => change(s)}>
          {ACTION_LABELS[s]}
        </Button>
      ))}
    </div>
  )
}
```

`window.confirm` sirve para una prueba rápida; en la aplicación debería usarse el diálogo de shadcn/ui (ejercicio 11.1). Con un 409, lo adecuado es mostrar el mensaje de `describeConflict` y refrescar la demanda (`refetch` de `useDemand` o invalidar su clave), porque la ficha está mostrando un estado obsoleto. Como la mutación ya actualiza el detalle con `setQueryData` en caso de éxito, la ficha y `StatusFlow` cambian solos al nuevo estado.
:::

::: respuestas 22
1. Un ciclo de vida con transiciones restringidas, la pertenencia a una aplicación de otro servicio y las fechas de creación y modificación.
2. En `Demand.changeStatus()` del backend; su reflejo en `features/demands/model/status-rules.ts`.
3. Porque es exhaustiva (un estado nuevo obliga a declarar sus transiciones), fácil de comparar con el backend y de la que se derivan todas las preguntas de la interfaz.
4. El desplegable (prevenir: solo habilita lo permitido), el esquema de Zod (comprobar en el cliente antes de enviar) y el backend (autoridad final, que responde 409 y la interfaz explica con opción de recargar).
5. Porque el cliente decide con los datos que cargó, y otro usuario puede haber cambiado el estado entretanto.
6. Vuelve a pedir la demanda, reinicia el formulario con los datos reales, limpia el error de la mutación y recalcula las transiciones permitidas.
7. Para garantizar que la aplicación asociada a la demanda que se edita aparezca en el desplegable aunque no esté entre las mil primeras del catálogo.
8. Porque un instante en UTC no depende de la zona del servidor ni del usuario; la zona solo se aplica al mostrar, con la del navegador.
9. El frontend ofrece ordenar por `application.name` y `createdAt`, que el backend rechaza con un 400. Su origen es la separación de las aplicaciones en otro servicio, que impidió ordenar por su nombre, sin actualizar la lista del frontend.
:::

## Capítulo 23 · Pruebas con Vitest

::: solucion 23.1
```ts title="src/lib/list-params.test.ts"
it.each([
  ['3', 2], ['1', 0], ['0', 0], [null, 0], ['-1', 0], ['abc', 0], ['2.5', 1], ['', 0],
])('parsePageParam(%j) → %i', (input, expected) => {
  expect(parsePageParam(input)).toBe(expected)
})
```

`parsePageParam('2.5')` devuelve **1**: `Number.parseInt('2.5', 10)` lee los dígitos iniciales y se detiene en el punto, devolviendo 2, que como página 1-based corresponde a la 1 en base 0. Es un comportamiento tolerante y aceptable para una URL (`?pagina=2.5` muestra la página 2); si se quisiera rechazarlo, habría que validar con una expresión regular `^\d+$`, como hace `parseEntityId`. El formato `%j` imprime los valores como JSON, de modo que `null` y `''` se distinguen en el nombre de la prueba.
:::

::: solucion 23.2
```ts title="src/lib/format.test.ts"
import { describe, expect, it } from 'vitest'
import { formatDateTime } from './format'

describe('formatDateTime', () => {
  it('muestra una raya si no hay fecha', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
  })

  it('devuelve el texto original si no es una fecha válida', () => {
    expect(formatDateTime('no-es-fecha')).toBe('no-es-fecha')
  })

  it('formatea un instante en hora local', () => {
    expect(formatDateTime('2026-10-24T08:15:30Z')).toBe('24/10/26, 10:15')
  })
})
```

La última prueba depende de la zona horaria: en Madrid en octubre (UTC+2) da `10:15`; en una máquina en UTC daría `08:15`. Para que sea estable, fija la zona en la configuración de Vitest (`test: { env: { TZ: 'Europe/Madrid' } }`) o en el script (`TZ=Europe/Madrid vitest run`). El formato exacto también depende de los datos de idioma de la versión de Node, así que para pruebas muy estrictas se puede comparar con el resultado de un `Intl.DateTimeFormat` construido en la propia prueba.
:::

::: solucion 23.3
```tsx title="src/features/demands/components/status-flow.test.tsx"
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'
import { StatusFlow } from './status-flow'

describe('StatusFlow', () => {
  it('indica las transiciones posibles desde Abierta', () => {
    render(<StatusFlow current="OPEN" />)
    expect(screen.getByText(/Desde «Abierta» puede pasar a «En curso» o «Cancelada»/)).toBeInTheDocument()
    expect(screen.getByText('Abierta')).toHaveAttribute('aria-current', 'step')
  })
})
```

`@testing-library/jest-dom/vitest` registra los *matchers* adicionales (`toBeInTheDocument`, `toHaveAttribute`) en Vitest. Para que TypeScript los conozca en todas las pruebas, lo habitual es importarlo en un fichero de preparación (`setupFiles` en la configuración de Vitest) en lugar de en cada prueba. Si ESLint se queja del fichero `.tsx` con React Refresh, es porque la regla solo debería aplicarse a componentes, no a pruebas: se puede excluir `**/*.test.tsx` de esa regla.
:::

::: respuestas 23
1. Unitario, componente, integración y extremo a extremo. El proyecto cubre el nivel unitario.
2. Porque esas funciones concentran las reglas que más fácilmente se rompen sin notarse, y sus pruebas son rápidas, estables y sin infraestructura.
3. No hay que configurar aparte TypeScript, el alias `@/` ni los módulos: las pruebas se transforman igual que la aplicación.
4. `toBe` compara con `Object.is` (primitivos o misma referencia); `toEqual` compara el contenido de objetos y arrays.
5. Una prueba que fija lo que el frontend espera del backend; por ejemplo, las transiciones copiadas de `Demand.changeStatus()`, el texto del 409 y los formatos de error de `api-client.test.ts`.
6. Porque recibe un `Response` en lugar de hacer la petición, de modo que se prueba con objetos `Response` construidos en la prueba, sin red.
7. Por rol accesible, etiqueta o texto, como lo haría un usuario; así las pruebas no dependen de clases ni de la estructura del DOM.
8. No: la norma se refiere a la aplicación, que siempre usa la API real. En pruebas automáticas, simular respuestas es legítimo para cubrir casos difíciles de reproducir.
9. `typecheck`, `lint`, `test` y `build`: de lo más barato y rápido a lo más caro, para fallar cuanto antes.
:::

## Capítulo 24 · Registro de decisiones de arquitectura

::: solucion 24.1
```markdown title="docs/adr/0024-campos-ordenacion-demandas.md"
# ADR-024: Los campos de ordenación de demandas siguen la lista del backend

- Estado: propuesta
- Fecha: 2026-10-24

## Contexto
Al extraer las aplicaciones a un servicio propio, la entidad Demand solo guarda
applicationId. DemandService valida sort contra VALID_SORT_FIELDS
(id, title, priority, status, updatedAt). El frontend ofrece además
application.name y createdAt, que producen un 400.

## Decisión
El frontend solo ofrece los campos que el backend valida. Las columnas
Aplicación y Creación se muestran sin ordenación. El backend estudiará
admitir createdAt (columna propia, sin coste).

## Consecuencias
- Desaparece el error 400 y las URL antiguas con esos órdenes caen al orden por defecto.
- Se pierde la ordenación por nombre de aplicación mientras no exista una
  copia del nombre en la demanda.
- Una prueba de list-params fija la lista para detectar futuros desajustes.

## Alternativas consideradas
- Guardar applicationName en Demand y mantenerlo sincronizado: permite ordenar,
  pero exige sincronización entre servicios (eventos o refresco periódico).
- Ordenar en el frontend: incorrecto, solo ordenaría la página recibida.
- Ordenar en el servicio de demandas cargando todo el catálogo: no escala.
```
:::

::: solucion 24.2
Tres revisiones razonables: **ADR-001** (SPA pura): con SEO y primera carga críticas, convendría renderizado en servidor o generación estática para las páginas públicas (un *framework* como React Router en modo *framework* o Next.js), manteniendo la SPA para las zonas privadas. **ADR-011** (mismo origen): con miles de usuarios, servir los estáticos desde una CDN con dominio propio cobra sentido, lo que obligaría a configurar CORS o a usar la CDN también como proxy de la API. **ADR-012** (TanStack Query, `staleTime` de 30 s): con datos públicos y mucha concurrencia, revisar las políticas de caché, añadir caché HTTP en la API y quizá actualización en tiempo real. También habría que revisar ADR-020 (autenticación de clientes externos) y reforzar las pruebas (ADR-019, ADR-021).
:::

::: solucion 24.3
La estructura esperada:

```text
docs/adr/
├── README.md                       ← formato, estados y cómo proponer uno nuevo
├── 0001-spa-con-vite.md
├── 0012-tanstack-query.md
└── 0016-estado-listados-en-url.md
```

El `README.md` debería explicar la plantilla, los estados posibles, la numeración (correlativa, nunca se reutiliza un número) y que los ADR sustituidos no se borran. En el `README.md` del proyecto basta una línea en la sección de arquitectura: «Las decisiones de arquitectura están en `docs/adr/`.».
:::

::: respuestas 24
1. Título con número, estado, contexto, decisión y consecuencias.
2. No se modifica: se escribe uno nuevo que lo sustituye y se marca el antiguo como «sustituido por ADR-NNN».
3. Que sea difícil de revertir, que afecte a varios módulos o a la forma de trabajar, y que se hayan descartado alternativas razonables.
4. ADR-012 (TanStack Query para todo el estado del servidor).
5. La desincronización manual con el backend: los campos de ordenación de demandas.
6. Porque responden a la pregunta «¿y por qué no X?» que alguien volverá a hacer, y evitan repetir debates ya resueltos.
:::

## Capítulo 25 · Notas de integración con el backend

::: solucion 25.1
Una propuesta (hay otras igualmente válidas):

- **Iteración 1 · Corregir lo que falla y lo trivial.** Frontend: nota 1 (alinear ordenación con prueba), nota 12 (`.env.example`). Backend: decidir si se admite `createdAt` (nota 1) y manejador genérico de excepciones (nota 9). Sin dependencias entre equipos salvo la decisión de `createdAt`.
- **Iteración 2 · Contrato de errores y concurrencia.** Backend: códigos estables y detalles (notas 2 y 4), `@Version` (nota 3). Frontend, después: adaptar `toApiError` a ambos formatos y generalizar el patrón de conflicto con recarga. Dependencia: el frontend necesita el nuevo formato desplegado (o compatible hacia atrás).
- **Iteración 3 · Escalabilidad y contrato automatizado.** Backend: orden lógico de enumerados (nota 5), búsqueda por nombre (nota 6), springdoc-openapi (nota 8). Frontend: buscador con *debounce*, selector con búsqueda (nota 7) y generación de tipos. Dependencia: la búsqueda del backend antes que el selector.

Las notas 10, 11 y 13 se planifican según convenga: la 13 cuando se prepare el primer despliegue.
:::

::: solucion 25.2
```java title="ApiErrorResponse v2 (propuesta)"
public record ApiErrorResponse(
        int status,
        String error,                    // código estable: VALIDATION_ERROR, APPLICATION_NOT_FOUND, INVALID_STATUS_TRANSITION…
        String message,                  // texto para personas, en español
        Map<String, String> fieldErrors,
        Map<String, Object> details      // datos estructurados: { "from": "COMPLETED", "to": "CANCELLED" }
) { }
```

```ts title="src/lib/api-client.ts (tipo ampliado)"
export interface ApiErrorBody {
  status: number
  error: string
  message: string | null
  fieldErrors?: Record<string, string>
  details?: Record<string, unknown>
}
```

`ApiError` añadiría un campo `details`, copiado en `toApiError` si existe. La interpretación del 409 quedaría compatible con ambos formatos:

```ts
export function getTransition(error: ApiError): { from: DemandStatus; to: DemandStatus } | undefined {
  if (error.code === 'INVALID_STATUS_TRANSITION' && error.details) {
    const { from, to } = error.details as { from?: string; to?: string }
    if (isDemandStatus(from) && isDemandStatus(to)) return { from, to }
  }
  return parseTransitionError(error.message)   // formato antiguo, mientras dure la transición
}
```

Con el diccionario de códigos (`APPLICATION_NOT_FOUND → 'La aplicación no existe.'`), `getErrorMessage` podría traducir por código y usar `message` solo como respaldo.
:::

::: solucion 25.3
Para ampliar el título a 200 caracteres: en el **backend**, `@Size(max = 200)` en los dos DTO y una migración de Flyway que amplíe la columna (`length = 150` en la entidad). En el **frontend**: primero la prueba de `schemas.test.ts` (cambiar `150/151` por `200/201`; falla); después `TITLE_MAX_LENGTH = 200` en `model/constants.ts`; la prueba pasa. Solo cambian **dos ficheros** del frontend gracias a la constante, que usan a la vez el esquema y el contador de caracteres. El compilador **no** lo habría detectado si te olvidaras: un número no tiene tipo que lo relacione con el `@Size` del backend. Por eso la prueba de valores límite es la red de seguridad, y la generación desde OpenAPI (que puede incluir `maxLength`) la automatizaría.
:::

::: respuestas 25
1. Los tipos de `model/types.ts`, las constantes de `constants.ts`, las listas de campos de ordenación, las reglas de `status-rules.ts` y la interpretación de errores de `api-client.ts`.
2. La separación de las aplicaciones en otro servicio, que eliminó la relación JPA y la posibilidad de ordenar por su nombre, sin actualizar la lista del frontend; en el fondo, que el contrato se replica a mano.
3. Porque extrae los estados de un texto con una expresión regular; si el texto cambia, deja de reconocerlo. Se resolvería con un código de error estable y los estados como campos estructurados.
4. Detectar modificaciones simultáneas comparando una versión del recurso; la alerta de conflicto con *Recargar datos actuales* de la edición de demandas ya está preparada.
5. Porque el código es estable y lo interpretan las máquinas (para traducir, para decidir), mientras que el mensaje puede cambiar de redacción o de idioma.
6. El servicio de demandas responde 503 al consultar, crear o modificar demandas, porque necesita el catálogo; el frontend lo muestra como error del servidor, con reintento en las consultas.
7. La consulta N+1 al resolver el nombre de la aplicación: ahora se consulta el catálogo una sola vez por página con `findByIds`.
8. Leer el cambio del backend, localizar su reflejo en el frontend, actualizar primero las pruebas, actualizar el código hasta que pasen (con `typecheck`), probar a mano contra el backend real y registrar el cambio (ADR o nota).
:::

## Capítulo 26 · Ejercicio guiado: el módulo de Incidencias

::: solucion 26.1
```ts title="src/features/incidents/model/status-rules.test.ts"
import { describe, expect, it } from 'vitest'
import { canTransition, getSelectableStatuses, isFinalStatus } from './status-rules'
import { INCIDENT_STATUSES } from './types'

describe('reglas de transición de incidencias', () => {
  it('permite las transiciones del contrato', () => {
    expect(canTransition('OPEN', 'IN_PROGRESS')).toBe(true)
    expect(canTransition('OPEN', 'CLOSED')).toBe(true)
    expect(canTransition('IN_PROGRESS', 'RESOLVED')).toBe(true)
    expect(canTransition('RESOLVED', 'CLOSED')).toBe(true)
  })

  it('rechaza las no definidas', () => {
    expect(canTransition('IN_PROGRESS', 'CLOSED')).toBe(false)
    expect(canTransition('OPEN', 'RESOLVED')).toBe(false)
    expect(canTransition('CLOSED', 'OPEN')).toBe(false)
  })

  it('permite reabrir una incidencia resuelta', () => {
    expect(canTransition('RESOLVED', 'IN_PROGRESS')).toBe(true)
  })

  it('solo CLOSED es final', () => {
    expect(INCIDENT_STATUSES.filter(isFinalStatus)).toEqual(['CLOSED'])
  })

  it('desde RESOLVED se puede mantener, cerrar o reabrir', () => {
    expect(getSelectableStatuses('RESOLVED')).toEqual(['RESOLVED', 'CLOSED', 'IN_PROGRESS'])
  })
})
```

La cuarta prueba expresa la propiedad «solo `CLOSED` es final» de una vez, filtrando todos los estados con la propia función.
:::

::: solucion 26.2
```ts title="src/lib/format.ts"
/** Duración legible entre dos instantes ISO-8601: «3 h 25 min», «2 d 4 h», «12 min». */
export function formatDuration(fromIso: string, toIso: string): string {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const totalMinutes = Math.floor(ms / 60_000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return hours > 0 ? `${days} d ${hours} h` : `${days} d`
  if (hours > 0) return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`
  return `${minutes} min`
}
```

```ts title="src/lib/format.test.ts (añadido)"
it.each([
  ['2026-10-24T08:00:00Z', '2026-10-24T08:12:00Z', '12 min'],
  ['2026-10-24T08:00:00Z', '2026-10-24T11:25:00Z', '3 h 25 min'],
  ['2026-10-22T08:00:00Z', '2026-10-24T12:00:00Z', '2 d 4 h'],
  ['2026-10-24T08:00:00Z', 'no-es-fecha', '—'],
])('formatDuration(%s, %s) → %s', (from, to, expected) => {
  expect(formatDuration(from, to)).toBe(expected)
})
```

No depende de la zona horaria porque opera con la diferencia entre dos instantes absolutos (milisegundos desde 1970 en UTC); la zona solo interviene al **mostrar** una fecha, no al restar dos. Ojo: es duración de reloj, no de horario laboral; un SLA en horas laborables necesitaría otra lógica (y probablemente calcularse en el backend).
:::

::: solucion 26.3
Pasos de la refactorización:

1. Mover `useApplicationSelectOptions` (y la interfaz `ApplicationOption`) a `src/features/applications/api/application-options.ts`, junto a `useApplicationOptions`, o a `applications-queries.ts`.
2. Mover el componente `ApplicationField` a `src/features/applications/components/application-select-field.tsx`, o dejarlo en cada módulo consumidor si sus textos difieren (por ejemplo, «antes de registrar demandas»). Una opción intermedia: el componente común recibe por prop el texto del caso vacío.
3. Actualizar las importaciones de `demand-filters.tsx` y `demand-form-fields.tsx` a `@/features/applications/…`.
4. Ejecutar `npm run typecheck` (detecta cualquier importación rota), `npm run lint` y `npm run test`, y probar el alta y la edición de una demanda.
5. Si existe la regla de ESLint del ejercicio 13.2, ajustarla para permitir que otros módulos importen solo estos ficheros de aplicaciones (lo ideal sería exponerlos en un `features/applications/index.ts` y prohibir el resto de rutas internas).

El resultado: demandas e incidencias dependen ambas de aplicaciones (relación de dominio real) y no entre sí.
:::

::: respuestas 26
1. Porque el contrato manda: los tipos, constantes, reglas y validaciones del frontend reflejan el backend, y sin endpoint real el módulo no puede funcionar (no se usan datos simulados).
2. Una incidencia resuelta puede reabrirse (`RESOLVED → IN_PROGRESS`), es decir, un estado no final puede volver atrás; en `status-rules.ts` basta con incluir `IN_PROGRESS` entre los siguientes de `RESOLVED`.
3. La validación genérica de la URL, los campos de formulario, los indicadores, la paginación, los estados de carga y error, la cabecera de página y el cliente HTTP.
4. Porque crearía una dependencia entre dos módulos sin relación de dominio; el catálogo de aplicaciones pertenece al módulo de aplicaciones.
5. Registrar las rutas en `app/router.tsx`, activar el módulo en `navigation.ts` y añadir la regla del proxy en `vite.config.ts` (más, opcionalmente, el enlace desde el detalle de una aplicación).
6. Tipos, lint, pruebas, *build*, estados de cada pantalla, accesibilidad con teclado, visualización en móvil y documentación (ADR y notas).
:::
