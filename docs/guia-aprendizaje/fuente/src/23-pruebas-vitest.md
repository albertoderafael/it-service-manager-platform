# Pruebas con Vitest

<p class="lead">El proyecto tiene 38 pruebas unitarias repartidas en siete ficheros, y todas pasan en algo más de un segundo. No prueban componentes ni pantallas: prueban la lógica que más valor tiene y más fácil es de romper sin darse cuenta. Este capítulo explica esa elección, cómo funciona Vitest, qué patrones usan las pruebas existentes y cómo ampliar la estrategia a componentes, hooks y pruebas de extremo a extremo.</p>

## Qué merece la pena probar en un frontend

En el backend, la estrategia habitual es una **pirámide**: muchas pruebas unitarias del dominio, menos pruebas de integración (repositorios con una base de datos real, controladores con MockMvc) y unas pocas pruebas de extremo a extremo. En el frontend la forma es parecida, con sus propias capas:

| Nivel | Qué prueba | Herramientas | En el proyecto |
|---|---|---|---|
| Unitario | Funciones puras: validación, reglas, transformaciones | Vitest | **Sí: 38 pruebas** |
| Componente | Que un componente pinte lo esperado y responda a eventos | Vitest + Testing Library + un DOM simulado | No, todavía |
| Integración | Una página completa con su router, su caché y una API simulada | Lo anterior + MSW | No, todavía |
| Extremo a extremo | La aplicación real en un navegador real contra el backend real | Playwright | No, todavía |

El proyecto empezó por donde la relación valor/coste es mayor: **la lógica de `model/` y `lib/`**. Son funciones puras, rápidas de probar, y concentran justo lo que más fácilmente se rompe sin que nadie lo note al probar a mano: un límite de longitud que deja de coincidir con el backend, un valor de la URL que se acepta sin validar, una transición de estado mal copiada, un formato de error que se interpreta mal.

::: java
La correspondencia es directa: Vitest es JUnit 5 (con aserciones al estilo de AssertJ); `vi.fn()` es Mockito; Testing Library cumple el papel de MockMvc para la interfaz; MSW es WireMock; y Playwright con el backend real equivale a tus pruebas con Testcontainers, que el backend del proyecto ya usa (`spring-boot-testcontainers`).
:::

## Vitest

**Vitest** es el ejecutor de pruebas del ecosistema Vite. Reutiliza la misma configuración y la misma transformación de TypeScript, así que no hay que configurar nada aparte para que las pruebas entiendan el alias `@/`, los tipos o los módulos ES. Su API es compatible con la de Jest, el ejecutor más extendido durante años, de modo que casi toda la documentación y los ejemplos de Jest sirven.

La configuración está en `vite.config.ts`:

```ts title="vite.config.ts (extracto)"
test: {
  environment: 'node',
  include: ['src/**/*.test.ts'],
},
```

- **`environment: 'node'`**: las pruebas se ejecutan en Node, sin simular un navegador. Basta para funciones puras, y es lo más rápido. Las pruebas de componentes necesitarán un entorno con DOM simulado (`jsdom` o `happy-dom`).
- **`include`**: solo los ficheros `*.test.ts` dentro de `src`, junto al código que prueban.

| Comando | Qué hace |
|---|---|
| `npm run test` | Ejecuta todas las pruebas una vez (`vitest run`); es lo que usaría la integración continua |
| `npx vitest` | Modo vigilancia: vuelve a ejecutar las pruebas afectadas al guardar |
| `npx vitest run list-params` | Solo los ficheros cuyo nombre contiene el texto |
| `npx vitest run -t "transición"` | Solo las pruebas cuyo nombre contiene el texto |
| `npx vitest run --reporter=verbose` | Lista cada prueba con su resultado |

La salida de una ejecución completa:

```text
 RUN  v5.0.1 …/it-service-manager-web

 Test Files  7 passed (7)
      Tests  38 passed (38)
   Duration  1.25s
```

## Anatomía de una prueba

```ts title="src/features/demands/model/schemas.test.ts (extracto)"
import { describe, expect, it } from 'vitest'

import { createDemandUpdateSchema, demandCreateSchema, normalizeDescription } from './schemas'

describe('validación de formularios de demanda', () => {
  const valid = { title: 'Adaptación a la nueva normativa', description: '', priority: 'HIGH', applicationId: '1' }

  it('acepta un alta válida, recorta el título y convierte la aplicación a número', () => {
    const result = demandCreateSchema.parse({ ...valid, title: '  Adaptación  ' })
    expect(result.title).toBe('Adaptación')
    expect(result.applicationId).toBe(1)
  })

  it('la modificación rechaza una transición no permitida con un mensaje claro', () => {
    const result = createDemandUpdateSchema('IN_PROGRESS').safeParse({ ...valid, status: 'OPEN' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['status'])
    expect(result.error?.issues[0]?.message).toBe('No se puede pasar de «En curso» a «Abierta».')
  })
})
```

- **`describe`** agrupa pruebas relacionadas (como una clase de pruebas de JUnit).
- **`it`** (o su sinónimo `test`) define una prueba con una frase que describe el comportamiento esperado. Las del proyecto están en español y se leen como especificaciones.
- **`expect(valor)`** seguido de un ***matcher*** expresa la comprobación.
- Un **objeto válido de referencia** (`valid`) se reutiliza en todas las pruebas, cambiando solo lo que cada una quiere comprobar con el operador de propagación. Así cada prueba muestra exactamente qué la hace distinta.

| *Matcher* | Comprueba | Ejemplo |
|---|---|---|
| `toBe(x)` | Igualdad estricta (`Object.is`): primitivos o misma referencia | `expect(result.applicationId).toBe(1)` |
| `toEqual(x)` | Igualdad profunda de objetos y arrays | `expect(params).toEqual({ …DEFAULT_LIST_PARAMS })` |
| `toBeNull()`, `toBeUndefined()` | Valores vacíos | `expect(normalizeDescription('  ')).toBeNull()` |
| `toContain(x)` | Que una cadena o un array contenga algo | `expect(empty.message).toContain('backend está arrancado')` |
| `toHaveProperty(p)` | Que un objeto tenga una propiedad | `expect(result).not.toHaveProperty('status')` |
| `resolves`, `rejects` | El resultado de una promesa | `await expect(promesa).resolves.toBeUndefined()` |
| `.not` | Niega cualquier *matcher* | |

## Inventario de las pruebas

| Fichero | Pruebas | Qué protege |
|---|---|---|
| `lib/api-client.test.ts` | 4 | Construcción de la consulta y la interpretación de los tres formatos de error (backend, Spring por defecto, cuerpo vacío) |
| `lib/list-params.test.ts` | 4 | Conversión de páginas 1-based ↔ 0-based, identificadores, orden y alternancia de dirección |
| `features/applications/model/list-params.test.ts` | 5 | URL ↔ parámetros ↔ consulta del listado de aplicaciones |
| `features/applications/model/schemas.test.ts` | 6 | Reglas del formulario alineadas con Bean Validation |
| `features/demands/model/list-params.test.ts` | 5 | Lo mismo para demandas, con filtro por aplicación |
| `features/demands/model/schemas.test.ts` | 8 | Reglas del formulario, conversión de la aplicación y transiciones en la modificación |
| `features/demands/model/status-rules.test.ts` | 6 | La máquina de estados y la interpretación del mensaje del 409 |

## Patrones que usan las pruebas

**1. Valores límite.** Para cada longitud máxima, una prueba con el valor exacto y otra con uno más:

```ts title="src/features/applications/model/schemas.test.ts"
expect(applicationCreateSchema.safeParse({ ...valid, name: 'a'.repeat(100) }).success).toBe(true)
expect(applicationCreateSchema.safeParse({ ...valid, name: 'a'.repeat(101) }).success).toBe(false)
```

**2. Propiedades del diseño.** En lugar de probar casos sueltos, se prueba una propiedad general: que serializar y volver a leer la URL devuelve lo mismo, o que mantener el estado siempre es una transición válida para **todos** los estados:

```ts title="src/features/demands/model/status-rules.test.ts"
it('mantener el mismo estado siempre es válido', () => {
  for (const status of DEMAND_STATUSES) expect(canTransition(status, status)).toBe(true)
})
```

**3. Pruebas de contrato.** Varias pruebas fijan lo que el frontend espera del backend: las transiciones copiadas de `Demand.changeStatus()`, el texto del 409 (`'Invalid demand status transition: IN_PROGRESS -> OPEN'`), los cuerpos de error de `GlobalExceptionHandler`. Si el backend cambia, estas pruebas indican exactamente qué hay que revisar en el frontend.

**4. Objetos reales de la plataforma.** Las pruebas del cliente HTTP construyen objetos `Response` reales, disponibles en Node 22 igual que en el navegador, en lugar de simularlos:

```ts title="src/lib/api-client.test.ts"
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const error = await toApiError(json(404, { status: 404, error: 'RESOURCE_ERROR', message: 'Application not found: 99', fieldErrors: {} }))
expect(error.kind).toBe('not-found')
```

Que `toApiError` reciba un `Response` (y no haga la petición) es lo que permite probarlo sin red: una decisión de diseño que facilita las pruebas.

**5. Tablas de casos.** Cuando una función se prueba con muchas entradas, `it.each` evita repetir código:

```ts
it.each([
  ['3', 2], ['1', 0], ['0', 0], ['-1', 0], ['abc', 0], [null, 0],
])('parsePageParam(%s) → %i', (input, expected) => {
  expect(parsePageParam(input)).toBe(expected)
})
```

## Dobles de prueba

Vitest incluye utilidades para sustituir dependencias, a través del objeto `vi`:

| Utilidad | Para qué | Equivalente en Java |
|---|---|---|
| `vi.fn()` | Función simulada que registra sus llamadas y puede devolver valores | `Mockito.mock()` |
| `vi.spyOn(obj, 'metodo')` | Observa o sustituye un método existente | `Mockito.spy()` |
| `vi.stubGlobal('fetch', …)` | Sustituye una variable global, como `fetch` | — |
| `vi.mock('./modulo')` | Sustituye un módulo importado completo | — |
| `vi.useFakeTimers()` | Controla el tiempo (`setTimeout`, fechas) | Un `Clock` inyectable |

El ejercicio 15.2 usaba `vi.stubGlobal` para probar `apiClient.delete` sin red. Úsalos con moderación: una prueba con muchos dobles prueba sobre todo los dobles. Las pruebas actuales no necesitan ninguno porque prueban funciones puras, y es una buena señal de diseño.

## Ampliar la estrategia

### Pruebas de componentes

Con **Testing Library** se monta un componente en un DOM simulado y se interactúa con él **como lo haría un usuario**: buscando elementos por su texto o su rol accesible, no por clases CSS. Haría falta instalar `@testing-library/react`, `@testing-library/user-event` y `jsdom`, y usar `environment: 'jsdom'` para esos ficheros (por ejemplo, con un comentario `// @vitest-environment jsdom` al principio, o ampliando `include` a `*.test.tsx`).

```tsx title="src/components/common/pagination-bar.test.tsx (ejemplo, requiere las dependencias)"
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PaginationBar } from './pagination-bar'

describe('PaginationBar', () => {
  it('muestra el rango y avisa al pasar de página', async () => {
    const onPageChange = vi.fn()
    render(<PaginationBar page={0} size={10} totalElements={25} totalPages={3}
                          pageSizeOptions={[10, 20]} onPageChange={onPageChange} onSizeChange={vi.fn()} />)

    expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 1–10 de 25')
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})
```

Fíjate en que la prueba encuentra los botones por su `aria-label` («Página siguiente»): la accesibilidad del capítulo 6 hace los componentes más fáciles de probar. (`toHaveTextContent` y `toBeDisabled` vienen de `@testing-library/jest-dom`, otra dependencia habitual.)

### Pruebas de hooks y páginas

Los hooks de consulta se prueban con `renderHook`, envolviéndolos en un `QueryClientProvider` con un `QueryClient` nuevo por prueba y los reintentos desactivados. Para que no dependan del backend, **MSW** (*Mock Service Worker*) intercepta las peticiones `fetch` y devuelve respuestas definidas en la prueba, sin tocar el código de la aplicación.

::: nota
La norma del proyecto de **no usar datos simulados como sustituto de la API real** se refiere a la aplicación: las pantallas siempre hablan con el backend. En las pruebas automáticas, simular respuestas es legítimo y necesario: permite comprobar casos difíciles de reproducir a mano (un 409, un 503 del catálogo, una página vacía) de forma rápida y repetible. Las pruebas de extremo a extremo, en cambio, sí deben usar el backend real.
:::

### Pruebas de extremo a extremo

**Playwright** controla un navegador real (Chromium, Firefox o WebKit) y ejecuta recorridos completos contra la aplicación y el backend arrancados: crear una aplicación, verla en el listado, crear una demanda para ella y cambiar su estado. Son las más lentas y las más frágiles, así que se reservan para los recorridos críticos. Combinadas con Testcontainers en el backend, permitirían levantar todo el sistema en la integración continua.

## Cobertura e integración continua

Vitest mide la **cobertura** (qué líneas ejecutan las pruebas) con el paquete `@vitest/coverage-v8`, que el proyecto no tiene instalado: `npm install -D @vitest/coverage-v8` y `npx vitest run --coverage`. Úsala para encontrar lógica importante sin probar, no como objetivo numérico: un 100 % de cobertura con aserciones débiles protege menos que un 60 % bien elegido.

En integración continua, el orden razonable de comprobaciones es del más barato al más caro:

```yaml title=".github/workflows/ci.yml (ejemplo)"
name: ci
on: [push, pull_request]
jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

::: decision Empezar por las pruebas unitarias de la lógica pura
**Decisión.** Probar con Vitest la lógica de `model/` y `lib/` (validaciones, reglas de dominio, URL, interpretación de errores) y dejar para más adelante las pruebas de componentes y de extremo a extremo.

**Motivos.** Es donde están las reglas que más daño hacen al romperse y que menos se notan en una prueba manual; las pruebas son rápidas, estables y no requieren infraestructura. El diseño del proyecto (lógica fuera de los componentes) es lo que lo hace posible.

**Siguiente paso recomendado.** Una prueba de extremo a extremo por módulo con Playwright sobre el recorrido principal, y pruebas de componente para los componentes comunes con más lógica (`PaginationBar`, `FilterSelect`, `StatusFlow`).
:::

## Errores típicos y depuración

- **`ReferenceError: document is not defined`.** La prueba usa el DOM con `environment: 'node'`. Usa `jsdom` para ese fichero.
- **Una prueba pasa sola y falla con las demás.** Comparten estado: un objeto global modificado, un `vi.stubGlobal` sin restaurar o un `QueryClient` reutilizado. Restaura en `afterEach`.
- **`toBe` falla con dos objetos iguales.** `toBe` compara referencias; usa `toEqual`.
- **Una prueba asíncrona pasa aunque la aserción sea falsa.** Falta `await` (o `return`) delante de la promesa: la prueba termina antes de comprobar nada.
- **Pruebas frágiles que se rompen con cualquier cambio de diseño.** Buscan elementos por clases CSS o por estructura del DOM. Busca por rol, etiqueta o texto, como haría un usuario.
- **Vitest no arranca en otra máquina o en Docker** con un error de *native binding*. Las dependencias se instalaron en otro sistema operativo (los binarios de Rolldown son específicos de cada plataforma): reinstala con `npm ci` en esa máquina.

Para depurar una prueba, puedes poner un punto de ruptura con `debugger;` y ejecutar Vitest desde el depurador del editor (VS Code e IntelliJ lo integran), o usar `npx vitest --ui` para una interfaz web con el resultado de cada prueba.

## Ejercicios

::: ejercicio Convierte una prueba en tabla
Reescribe la prueba «convierte la página de la URL (1-based) a Spring Data (0-based)» de `src/lib/list-params.test.ts` con `it.each`, añadiendo casos para `'-1'`, `'abc'`, `'2.5'` y `''`. ¿Qué devuelve `parsePageParam('2.5')` y por qué? (Pista: `Number.parseInt`.) ¿Te parece el comportamiento correcto?
:::

::: ejercicio Prueba `formatDateTime`
Escribe `src/lib/format.test.ts` con pruebas para `null`, una cadena no válida y un instante válido. El resultado de un instante válido depende de la zona horaria de la máquina: ¿cómo harías la prueba estable? Investiga la variable de entorno `TZ` y la opción `env` de la configuración de Vitest.
:::

::: ejercicio Tu primera prueba de componente
Instala `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` y `jsdom` como dependencias de desarrollo y amplía `include` a `src/**/*.test.{ts,tsx}`. Escribe una prueba para `StatusFlow` que compruebe que, para una demanda `OPEN`, el texto indica que puede pasar a «En curso» o «Cancelada» y que el estado actual tiene `aria-current="step"`. Ejecuta `npm run typecheck` y `npm run lint` para asegurarte de que todo sigue en orden.
:::

## Autoevaluación

::: preguntas
1. ¿Qué cuatro niveles de pruebas se distinguen en un frontend y cuál cubre hoy el proyecto?
2. ¿Por qué se empezó por las funciones de `model/` y `lib/`?
3. ¿Qué ventaja tiene que Vitest reutilice la configuración de Vite?
4. ¿Qué diferencia hay entre `toBe` y `toEqual`?
5. ¿Qué es una prueba de contrato y qué ejemplos hay en el proyecto?
6. ¿Por qué el diseño de `toApiError` facilita probarlo?
7. ¿Cómo busca los elementos Testing Library y por qué?
8. ¿Es contradictorio usar MSW en pruebas con la norma de no usar datos simulados?
9. ¿En qué orden pondrías `typecheck`, `lint`, `test` y `build` en la integración continua y por qué?
:::
