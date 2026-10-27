# El cliente HTTP y la gestión de errores

<p class="lead">Toda comunicación con el backend pasa por un único fichero de unas doscientas líneas: <code>src/lib/api-client.ts</code>. Este capítulo lo recorre línea a línea, explica cómo funciona <code>fetch</code>, cómo se construyen las URL y, sobre todo, cómo se transforma cualquier fallo —de red, de validación, de negocio o del servidor— en un error uniforme que la interfaz sabe presentar.</p>

## Por qué un cliente propio

Llamar a `fetch` directamente desde cada sitio funcionaría, pero repetiría en cada llamada las mismas decisiones: la URL base, las cabeceras, la conversión a JSON, la comprobación de `response.ok`, la interpretación del cuerpo de error, el tratamiento de los fallos de red. Y cada repetición sería una ocasión de hacerlo de forma distinta.

El cliente centraliza esas decisiones en un único sitio:

- **La URL base** de la API, configurable por entorno.
- **La serialización**: cuerpos en JSON, parámetros de consulta sin valores vacíos.
- **El modelo de errores**: cualquier fallo se convierte en un `ApiError` con un tipo, un código de estado, un mensaje comprensible y, si los hay, los errores por campo.
- **La cancelación**: las peticiones aceptan una señal para abortarlas.

::: java
Es el equivalente de configurar una única vez un `RestClient` de Spring con su `baseUrl`, sus convertidores de mensajes y un `ResponseErrorHandler` que traduce las respuestas de error a excepciones propias. El servicio de demandas del backend hace exactamente eso con su `RestApplicationCatalog`: construye un `RestClient` con la URL del catálogo y traduce los fallos a un `ResponseStatusException` 503.
:::

## `fetch` en detalle

`fetch` es la API estándar del navegador para hacer peticiones HTTP. Recibe una URL y unas opciones, y devuelve una promesa con un objeto `Response`:

```ts
const response = await fetch('/api/applications?page=0', {
  method: 'GET',                                  // GET por defecto
  headers: { Accept: 'application/json' },
  signal,                                         // para cancelar
  // body: JSON.stringify(datos)                  // en POST y PUT
})

response.ok        // true si el estado está entre 200 y 299
response.status    // 200, 404, 500…
await response.json()   // lee y parsea el cuerpo (se puede leer UNA sola vez)
await response.text()   // o lo lee como texto
```

Tres particularidades que el cliente tiene en cuenta:

1. **Solo falla con errores de red.** Un 404 o un 500 no rechazan la promesa: llegan como respuestas con `ok` a `false` (capítulo 2).
2. **El cuerpo es un flujo que se lee una vez.** Por eso el cliente lo lee con `text()` y después decide si lo parsea, en lugar de llamar a `json()` y arriesgarse a un error con cuerpos vacíos o que no son JSON.
3. **No sabe nada de JSON al enviar.** Hay que serializar el cuerpo con `JSON.stringify` y declarar `Content-Type: application/json`.

## `apiRequest`, línea a línea

```ts title="src/lib/api-client.ts"
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  query?: QueryParams
  body?: unknown
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal } = options
  const url = `${API_BASE_URL}${path}${buildQueryString(query)}`

  let response: Response
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError({
      message: 'No se puede conectar con el servidor. Comprueba que el backend está arrancado.',
      status: 0,
      kind: 'network',
    })
  }

  if (!response.ok) {
    throw await toApiError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}
```

Paso a paso:

1. **URL.** Base (`/api` por defecto) + ruta del recurso (`/applications/7`) + parámetros. En desarrollo, `/api/...` es una ruta relativa al propio Vite, que la reenvía por el proxy (capítulo 16).
2. **Cabeceras.** Siempre `Accept: application/json`; `Content-Type` solo si hay cuerpo. El *spread* condicional `...(cond ? {…} : {})` añade la cabecera solo cuando procede.
3. **Fallo de red.** Si `fetch` lanza, o es una cancelación (que se deja pasar tal cual, porque no es un error que mostrar), o es un problema de conexión, que se convierte en un `ApiError` de tipo `network` con estado 0.
4. **Respuesta de error.** Si `ok` es falso, `toApiError` interpreta el cuerpo y lanza el error resultante.
5. **Respuesta correcta.** Un `204 No Content` no tiene cuerpo; en otro caso se lee como texto y, si no está vacío, se parsea. El `as T` es el punto de confianza en el contrato con el backend (capítulo 2).

Sobre esta función se construye un pequeño objeto de conveniencia, que es lo que usan los ficheros `-api.ts` de los módulos:

```ts title="src/lib/api-client.ts"
export const apiClient = {
  get: <T>(path: string, query?: QueryParams, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
}
```

Solo existen los métodos que el proyecto usa hoy. Cuando haga falta un `delete` o un `patch`, se añaden en una línea: `apiRequest` ya los admite.

## La cadena de consulta

```ts title="src/lib/api-client.ts"
type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue | QueryValue[]>

/** Construye la query string ignorando valores vacíos. Los arrays repiten la clave. */
export function buildQueryString(params?: QueryParams): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, raw] of Object.entries(params)) {
    const values = Array.isArray(raw) ? raw : [raw]
    for (const value of values) {
      if (value === undefined || value === null || value === '') continue
      search.append(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
```

- **`URLSearchParams`** es la API estándar para construir y leer cadenas de consulta; se encarga de codificar los caracteres especiales (la coma de `sort=id,asc` se envía como `%2C`).
- **Los valores vacíos se omiten.** Así, un filtro sin seleccionar (`status: undefined`) simplemente no aparece en la URL, que es lo que espera Spring: un parámetro ausente es «sin filtro».
- **Los arrays repiten la clave** (`?status=OPEN&status=IN_PROGRESS`), el formato que Spring convierte en una `List`. El proyecto aún no lo usa, pero el cliente ya lo admite.

`Object.entries(objeto)` devuelve un array de pares `[clave, valor]`, la forma habitual de recorrer un objeto.

## El modelo de errores

### La clase `ApiError`

```ts title="src/lib/api-client.ts"
export type ApiErrorKind = 'network' | 'validation' | 'not-found' | 'client' | 'server'

export class ApiError extends Error {
  readonly status: number
  readonly kind: ApiErrorKind
  readonly code?: string
  readonly fieldErrors: Record<string, string>
  // constructor que asigna los campos…
}
```

El campo clave es **`kind`**: una clasificación pensada para la interfaz, que no necesita conocer todos los códigos HTTP para decidir qué mostrar.

| `kind` | Cuándo | Cómo lo trata la interfaz |
|---|---|---|
| `network` | `fetch` no pudo conectar (estado 0) | Icono de sin conexión; pide comprobar el backend |
| `validation` | 400 | En formularios, los `fieldErrors` se colocan en sus campos |
| `not-found` | 404 | Aviso de recurso inexistente con enlace al listado; no se reintenta |
| `client` | Otros 4xx (409, 403…) | Mensaje del servidor; en demandas, el 409 tiene un tratamiento propio |
| `server` | 5xx | Mensaje genérico o del servidor; se reintenta |

`code` conserva el código de error del backend (`VALIDATION_ERROR`, `RESOURCE_ERROR`), y `status`, el código HTTP exacto, por si una pantalla necesita afinar más.

### Interpretar la respuesta de error

```ts title="src/lib/api-client.ts"
export async function toApiError(response: Response): Promise<ApiError> {
  const status = response.status
  let body: Partial<ApiErrorBody> | null = null
  try {
    const text = await response.text()
    body = text ? (JSON.parse(text) as Partial<ApiErrorBody>) : null
  } catch {
    // Cuerpo no JSON (p. ej. HTML de un proxy): se usa el mensaje por defecto.
  }

  // Formato propio del backend (ApiErrorResponse).
  const hasBackendFormat = body && typeof body.message === 'string' && body.message.length > 0
  // Formato por defecto de Spring Boot ({timestamp, status, error, path}) o cuerpo vacío.
  const message = hasBackendFormat ? (body!.message as string) : defaultMessage(status)

  return new ApiError({
    message,
    status,
    kind: kindFromStatus(status),
    code: typeof body?.error === 'string' ? body.error : undefined,
    fieldErrors: body?.fieldErrors && typeof body.fieldErrors === 'object' ? body.fieldErrors : undefined,
  })
}
```

La función es **defensiva**: no presupone nada del cuerpo. Puede recibir JSON del backend, JSON con otro formato, HTML de un proxy o nada en absoluto, y en todos los casos devuelve un `ApiError` válido. Si el cuerpo trae un mensaje, se usa; si no, `defaultMessage(status)` aporta uno en español según el código: «El recurso solicitado no existe» para el 404, «La operación entra en conflicto con el estado actual del recurso» para el 409, «El servidor no está disponible. Comprueba que el backend está arrancado» para 502, 503 y 504…

## Los formatos de error del backend

Para interpretar bien los errores hay que saber qué envía el backend. Su `GlobalExceptionHandler` (un `@RestControllerAdvice`) traduce las excepciones a un formato común:

```java title="it-service-manager · exception/ApiErrorResponse.java"
public record ApiErrorResponse(int status, String error, String message, Map<String, String> fieldErrors) { }
```

| Excepción en el backend | Respuesta | `kind` en el frontend |
|---|---|---|
| `MethodArgumentNotValidException` (Bean Validation en un `@RequestBody`) | 400, `VALIDATION_ERROR`, «La petición contiene campos inválidos», `fieldErrors` con un mensaje por campo | `validation` |
| `MethodArgumentTypeMismatchException` (por ejemplo, un ID no numérico) | 400, `VALIDATION_ERROR`, «Invalid value for parameter: id» | `validation` |
| `HttpMessageNotReadableException` (JSON mal formado) | 400, `VALIDATION_ERROR`, «Malformed request body» | `validation` |
| `ResponseStatusException(NOT_FOUND)` | 404, `RESOURCE_ERROR`, «Demand not found: 7» | `not-found` |
| `ResponseStatusException(CONFLICT)` (transición de estado no válida) | 409, `RESOURCE_ERROR`, mensaje de la regla | `client` |
| `ResponseStatusException(BAD_REQUEST)` (estado, prioridad u orden no válidos) | 400, `RESOURCE_ERROR`, «Invalid demand sort field: …» | `validation` (sin `fieldErrors`) |
| `ResponseStatusException(SERVICE_UNAVAILABLE)` (el catálogo de aplicaciones no responde) | 503, `RESOURCE_ERROR`, «Application Catalog is unavailable» | `server` |
| Cualquier otra excepción no controlada | 500 con el formato por defecto de Spring: `{ timestamp, status, error, path }` | `server` (mensaje por defecto) |

<figure>
<svg viewBox="0 0 680 230" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="a15" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="10" y="20" width="150" height="190" rx="8" fill="#fff7ed" stroke="#fdba74"/>
  <text x="85" y="40" text-anchor="middle" font-weight="700">Backend</text>
  <text x="20" y="64" font-size="9">Bean Validation → 400</text>
  <text x="20" y="84" font-size="9">No existe → 404</text>
  <text x="20" y="104" font-size="9">Regla de negocio → 409</text>
  <text x="20" y="124" font-size="9">Catálogo caído → 503</text>
  <text x="20" y="144" font-size="9">Excepción no prevista → 500</text>
  <text x="20" y="170" font-size="9" fill="#9a3412">o el proxy no conecta</text>
  <text x="20" y="190" font-size="9" fill="#9a3412">o no hay red</text>
  <line x1="160" y1="115" x2="218" y2="115" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a15)"/>
  <rect x="220" y="55" width="160" height="120" rx="8" fill="#0b1220"/>
  <text x="300" y="80" text-anchor="middle" font-weight="700" fill="#fff">api-client.ts</text>
  <text x="300" y="104" text-anchor="middle" font-size="9" fill="#a5f3fc">toApiError / catch de red</text>
  <text x="300" y="128" text-anchor="middle" font-size="9" fill="#a5f3fc">↓</text>
  <text x="300" y="150" text-anchor="middle" font-size="9.5" fill="#fff">ApiError { kind, status,</text>
  <text x="300" y="164" text-anchor="middle" font-size="9.5" fill="#fff">message, fieldErrors }</text>
  <line x1="380" y1="115" x2="438" y2="115" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a15)"/>
  <rect x="440" y="20" width="230" height="190" rx="8" fill="#ecfeff" stroke="#0891b2"/>
  <text x="555" y="40" text-anchor="middle" font-weight="700">Interfaz</text>
  <text x="452" y="64" font-size="9">validation → error en cada campo</text>
  <text x="452" y="84" font-size="9">not-found → ResourceNotFound</text>
  <text x="452" y="104" font-size="9">client (409) → aviso y «recargar»</text>
  <text x="452" y="124" font-size="9">server → ErrorState + Reintentar</text>
  <text x="452" y="144" font-size="9">network → «Sin conexión»</text>
  <text x="452" y="170" font-size="9" fill="#0e7490">al guardar: Alert sobre el formulario</text>
  <text x="452" y="190" font-size="9" fill="#0e7490">al cargar: ErrorState en la tarjeta</text>
</svg>
<figcaption><b>Figura 15.1.</b> Todos los fallos convergen en un <code>ApiError</code>, y la interfaz decide qué mostrar según su <code>kind</code>.</figcaption>
</figure>

::: proyecto
Las pruebas de `src/lib/api-client.test.ts` documentan estos formatos con ejemplos: un 400 con `fieldErrors`, un 404 con `RESOURCE_ERROR`, un 500 con el formato por defecto de Spring (el mensaje debe contener «HTTP 500») y un 502 con el cuerpo vacío (el mensaje debe pedir comprobar que el backend está arrancado). Si el backend cambiara su formato de error, estas pruebas indican exactamente qué se espera.
:::

::: atencion
**Los mensajes del backend mezclan idiomas.** El mensaje general de validación está en español («La petición contiene campos inválidos»), pero los de recurso inexistente o de servicio no disponible están en inglés («Application not found: 99», «Application Catalog is unavailable»), y los `fieldErrors` llevan los mensajes por defecto de Bean Validation, que dependen de la configuración regional del servidor. El frontend muestra el mensaje del servidor tal cual cuando existe. Para una aplicación de cara al usuario, lo ideal es que el backend devuelva un **código estable** por error y que el frontend traduzca; o, al menos, que el backend unifique el idioma. Es una nota de integración que retomaremos en el capítulo 25.
:::

## Cómo llegan los errores a la pantalla

El cliente lanza; TanStack Query captura y expone el error como `query.error` o `mutation.error` (capítulo 17); y cada pantalla decide la presentación. Estos son los caminos:

**1. Al cargar datos: `ErrorState`.**

```tsx title="src/components/common/state-views.tsx (extracto)"
export function ErrorState({ className, error, onRetry, title, action }: ErrorStateProps) {
  const isNetwork = isApiError(error) && error.kind === 'network'
  const Icon = isNetwork ? WifiOff : AlertTriangle
  // … título según el tipo, getErrorMessage(error) y botón «Reintentar» si hay onRetry
}
```

**2. Recurso inexistente: `ResourceNotFound`.** Las páginas de detalle y edición comprueban `query.error.kind === 'not-found'` para mostrar un aviso específico en lugar de un error genérico.

**3. Al guardar: una alerta sobre el formulario** con `getErrorMessage(mutation.error)`.

**4. Errores por campo: `applyServerFieldErrors`.** Si el backend rechaza el formulario con `fieldErrors`, cada mensaje se coloca en su campo, como si lo hubiera detectado la validación del cliente:

```ts title="src/lib/form-errors.ts"
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
): boolean {
  if (!isApiError(error) || error.kind !== 'validation') return false
  let applied = false
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if ((knownFields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message })
      applied = true
    }
  }
  return applied
}
```

Solo se asignan los campos que el formulario conoce (`knownFields`): si el backend devolviera un error para un campo que no existe en la pantalla, se ignora aquí y sigue visible en la alerta general. Es el capítulo 20 el que entra en los formularios.

**5. Mensajes legibles en cualquier caso: `getErrorMessage`.**

```ts title="src/lib/api-client.ts"
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Se ha producido un error inesperado.'
}
```

**6. Reintentos automáticos.** La configuración global de TanStack Query no reintenta los errores 4xx («repetirlos no cambia el resultado») y reintenta hasta dos veces los demás, incluidos los de red y los 5xx. Lo vemos en el capítulo 17.

## Decisión y alternativas

::: decision Cliente propio sobre `fetch`, sin axios
**Decisión.** Un cliente mínimo sobre `fetch`, con un modelo de errores propio (`ApiError` con `kind`) que reconoce el formato del backend y el formato por defecto de Spring.

**Motivos.** `fetch` es estándar y no añade peso al *bundle*. Las funciones que hacen popular a axios (interceptores, transformación de respuestas, cancelación, errores en 4xx/5xx) se resuelven aquí en unas pocas líneas y de forma explícita. El modelo de errores es lo verdaderamente valioso, y sería necesario igual con axios.

**Cómo evolucionará.** Cuando se añada la autenticación, este es el único sitio donde añadir la cabecera `Authorization` o el envío de *cookies* (`credentials: 'include'`), y donde tratar el 401 de forma global (por ejemplo, redirigiendo al inicio de sesión).

**Alternativas.** axios (muy extendido; aporta interceptores y una API cómoda, pero es una dependencia más para lo que `fetch` ya cubre); ky (envoltorio ligero sobre `fetch`); clientes generados a partir de OpenAPI (generan los tipos y las funciones; muy recomendables si la API crece).
:::

## Errores típicos y depuración

- **«No se puede conectar con el servidor».** `fetch` ha fallado a nivel de red: el servidor de Vite no responde o no hay red. Si es un 5xx del proxy, el mensaje será otro (capítulo 16).
- **`SyntaxError: Unexpected token '<'`** en código propio. Se ha intentado parsear como JSON una respuesta HTML (típicamente el `index.html` que devuelve Vite para una ruta de API sin regla de proxy). El cliente del proyecto lo evita leyendo como texto y capturando el error, pero en llamadas escritas a mano es habitual.
- **El backend recibe `null` en todos los campos.** Falta la cabecera `Content-Type: application/json` o el cuerpo no se ha serializado con `JSON.stringify`.
- **Un filtro vacío llega como `status=`.** Hay que omitir los parámetros vacíos, como hace `buildQueryString`.
- **Un error 400 sin errores por campo.** Puede venir de un `ResponseStatusException(BAD_REQUEST)` del servicio (estado, prioridad u orden no válidos), que no rellena `fieldErrors`. Mira el mensaje en *Network* → *Response*.

En la pestaña *Network*, al seleccionar una petición, *Headers* muestra la URL final, el método, el estado y las cabeceras; *Payload*, el cuerpo y los parámetros enviados; y *Response*, lo que devolvió el servidor. Es la herramienta imprescindible para cualquier problema de integración: te dice si el fallo está en lo que envía el frontend o en lo que responde el backend.

## Ejercicios

::: ejercicio Recorre los formatos de error
Con el backend arrancado, provoca cada uno de estos errores y anota en *Network* el estado, el cuerpo de la respuesta y lo que ve el usuario: (a) visita `/aplicaciones/999999`; (b) sáltate la validación del formulario enviando la petición desde la consola del navegador: `await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '', description: null, criticality: 'LOW' }) }).then((r) => r.json())`; (c) detén solo el servicio de aplicaciones y abre *Nueva demanda*. ¿Qué `kind` tiene cada `ApiError`?
:::

::: ejercicio Añade el método `delete`
Añade `delete` a `apiClient` y escribe una prueba en `api-client.test.ts` que compruebe que una respuesta `204` devuelve `undefined`. Para simular `fetch` en la prueba, usa `vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))` y restaura con `vi.unstubAllGlobals()`.
:::

::: ejercicio Prepara la autenticación
Imagina que el backend pasa a exigir un *token* JWT en la cabecera `Authorization: Bearer …`. Diseña, sin implementarlo del todo, cómo modificarías `apiRequest` para añadir la cabecera a todas las peticiones y para que un 401 provoque un único tratamiento global. ¿Dónde guardarías el *token* y qué riesgos tiene cada opción (memoria, `localStorage`, *cookie* `HttpOnly`)?
:::

## Autoevaluación

::: preguntas
1. ¿Qué decisiones centraliza el cliente HTTP que de otro modo se repetirían?
2. ¿Por qué el cliente lee el cuerpo con `text()` en lugar de `json()`?
3. ¿Qué ocurre con un parámetro de consulta `undefined` y por qué es lo correcto para Spring?
4. ¿Qué cinco valores puede tomar `kind` y qué decide la interfaz con cada uno?
5. ¿Por qué `toApiError` no presupone el formato del cuerpo?
6. ¿Qué devuelve el backend ante un error de Bean Validation y qué hace el frontend con `fieldErrors`?
7. ¿Por qué no se reintentan los errores 4xx?
8. ¿Dónde se añadiría la autenticación cuando llegue y por qué ahí?
:::
