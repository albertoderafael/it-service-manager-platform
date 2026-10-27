# Configuración de TypeScript, ESLint y calidad del código

<p class="lead">El compilador de TypeScript y ESLint son las dos redes de seguridad del proyecto. Este capítulo explica opción a opción cómo están configurados, por qué el modo estricto es innegociable y qué detecta cada regla de ESLint que no detectaría el compilador.</p>

## Tres ficheros `tsconfig`: referencias de proyecto

En la raíz hay tres ficheros de configuración de TypeScript. Puede parecer excesivo, pero responde a un problema real: el proyecto contiene código que se ejecuta en **dos entornos distintos**.

- El código de `src/` se ejecuta en el **navegador**: tiene `document`, `window` y `fetch`, pero no `process` ni el sistema de ficheros.
- `vite.config.ts` se ejecuta en **Node**: tiene `process` y los módulos `node:*`, pero no el DOM.

Si todo compartiera una configuración, TypeScript permitiría usar `document` en la configuración de Vite o `process.env` en un componente, y ambos fallarían en ejecución. La solución son las **referencias de proyecto**:

```json title="tsconfig.json"
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```

El `tsconfig.json` raíz no compila nada (`"files": []`); solo enumera los dos subproyectos. `tsconfig.app.json` cubre `src/` con los tipos del navegador, y `tsconfig.node.json` cubre `vite.config.ts` con los tipos de Node.

::: java
Es como un proyecto Maven multimódulo con un `pom.xml` padre de tipo `pom` y dos módulos con dependencias distintas. Cada módulo ve solo lo que le corresponde, y el padre los construye juntos.
:::

## `tsconfig.app.json`, opción a opción

```json title="tsconfig.app.json"
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,

    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

### Qué JavaScript y qué entorno

| Opción | Qué significa |
|---|---|
| `target: "ES2022"` | Versión de JavaScript que se considera disponible. Afecta a qué sintaxis se acepta sin transformar. |
| `lib` | Qué APIs existen: las de ES2022 más las del navegador (`DOM`, `DOM.Iterable`). Por eso `document` tiene tipos aquí y no en `vite.config.ts`. |
| `types: ["vite/client"]` | Incluye solo los tipos globales de Vite (`import.meta.env`, importación de CSS e imágenes). Evita que se cuelen tipos globales de otros paquetes `@types`. |
| `useDefineForClassFields` | Semántica estándar de los campos de clase. Irrelevante en la práctica para este proyecto. |
| `skipLibCheck` | No comprueba los ficheros de tipos (`.d.ts`) de `node_modules`. Acelera mucho la compilación y evita errores en librerías que no son nuestras. |

### Cómo se resuelven los módulos

| Opción | Qué significa |
|---|---|
| `module: "ESNext"` | El código usa módulos ES. |
| `moduleResolution: "bundler"` | Resuelve los `import` como lo hace un empaquetador como Vite: sin exigir extensiones y respetando el campo `exports` de los `package.json`. |
| `allowImportingTsExtensions` | Permite escribir `import './x.ts'`. Solo es válido porque no se genera código. |
| `noEmit: true` | **TypeScript no genera ningún fichero**: solo comprueba. La transformación la hace Vite (capítulo 4). |
| `verbatimModuleSyntax` | Cada `import` se conserva o se elimina tal cual está escrito. Obliga a usar `import type` cuando lo importado es solo un tipo, de modo que una herramienta que procesa ficheros sueltos, como Vite, sabe qué importaciones eliminar sin analizar el resto del proyecto. |
| `moduleDetection: "force"` | Trata cada fichero como un módulo, aunque no tenga `import` ni `export`. |
| `jsx: "react-jsx"` | Usa la transformación moderna de JSX: no hace falta escribir `import React from 'react'` en cada componente. |
| `paths` | El alias `@/*` → `src/*`, igual que en `vite.config.ts`. |

### Lo estricto

| Opción | Qué detecta |
|---|---|
| `strict: true` | Activa a la vez un conjunto de comprobaciones; las más importantes se explican abajo. |
| `noUnusedLocals`, `noUnusedParameters` | Variables, importaciones y parámetros declarados pero no usados. |
| `noFallthroughCasesInSwitch` | Un `case` que continúa en el siguiente por olvidar el `break` o el `return`. |
| `noUncheckedSideEffectImports` | Una importación sin nombres (`import './index.css'`) que apunta a un fichero inexistente. |

`strict` engloba, entre otras:

- **`strictNullChecks`**: `null` y `undefined` no son asignables a cualquier tipo. Es la que convierte los `NullPointerException` en errores de compilación.
- **`noImplicitAny`**: si TypeScript no puede inferir un tipo, exige que lo escribas en lugar de suponer `any`.
- **`strictFunctionTypes`**: comprueba con rigor la compatibilidad de los parámetros de las funciones que se pasan como valores.
- **`useUnknownInCatchVariables`**: lo capturado en un `catch` es `unknown`, no `any`.

## `tsconfig.node.json` y `tsc -b`

`tsconfig.node.json` es casi idéntico, pero con `lib: ["ES2023"]` (sin DOM), `types: ["node", "vitest/config"]` y un único fichero incluido, `vite.config.ts`. El tipo `vitest/config` es el que permite escribir la sección `test` dentro de la configuración de Vite.

El script `typecheck` ejecuta `tsc -b` (*build mode*): recorre las referencias, comprueba cada subproyecto y guarda información incremental en los ficheros `*.tsbuildinfo` que indica `tsBuildInfoFile` (dentro de `node_modules/.tmp`, para no ensuciar el proyecto). La segunda ejecución solo vuelve a comprobar lo que ha cambiado.

::: nota
**TypeScript 6.0** es una versión de transición: prepara el terreno para TypeScript 7, una reescritura del compilador en Go, mucho más rápida. Algunas opciones antiguas quedan obsoletas y varios valores por defecto cambian para alinearse con la configuración moderna que ya usa este proyecto, así que el salto debería ser poco traumático.
:::

## El modo estricto en la práctica

El modo estricto se nota sobre todo en el tratamiento de los valores que pueden faltar. Un ejemplo real: el hook `useApplication` recibe un `id` que puede ser `undefined` (si la URL contiene un identificador no válido).

```ts title="src/features/applications/api/applications-queries.ts"
export function useApplication(id: number | undefined) {
  return useQuery({
    queryKey: applicationKeys.detail(id ?? -1),
    queryFn: ({ signal }) => applicationsApi.getById(id!, signal),
    enabled: id !== undefined,
    // …
  })
}
```

Sin modo estricto, `getById(id, signal)` compilaría aunque `id` pudiera ser `undefined`, y el error sería una petición a `/api/applications/undefined`. Con el modo estricto, el compilador obliga a decidir qué pasa. Aquí la consulta se desactiva con `enabled: id !== undefined`, de modo que `queryFn` nunca se ejecuta sin identificador; como el compilador no puede relacionar ambas cosas, se usa `id!` para afirmarlo. Es un uso justificado del operador `!`, y el comentario mental que lo acompaña es: «`enabled` lo garantiza».

## ESLint: lo que el compilador no ve

El compilador comprueba que los tipos encajan. **ESLint** analiza el código en busca de **patrones problemáticos** que son perfectamente válidos para el compilador: variables que deberían ser `const`, *hooks* llamados dentro de un `if`, dependencias olvidadas, código inalcanzable…

La configuración usa el formato plano (*flat config*), un array de objetos que se aplican en orden:

```js title="eslint.config.js"
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    // Los componentes de shadcn/ui exportan variantes junto a los componentes.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
```

| Bloque | Qué aporta |
|---|---|
| `globalIgnores(['dist'])` | No analiza el resultado del *build*. |
| `js.configs.recommended` | Reglas básicas de JavaScript: variables no definidas, código inalcanzable, comparaciones sospechosas… |
| `tseslint.configs.recommended` | Reglas específicas de TypeScript: prohíbe `any` explícito, `@ts-ignore` sin justificación, espacios de nombres antiguos… |
| `reactHooks.configs.flat.recommended` | Las reglas de los *hooks* de React (abajo). |
| `reactRefresh.configs.vite` | Avisa cuando un fichero de componentes exporta otras cosas e impide el Fast Refresh (capítulo 4). |
| `globals.browser` | Declara como conocidas las variables globales del navegador (`window`, `document`…). |
| Último bloque | Excepción para `src/components/ui`: los componentes generados por shadcn/ui exportan también sus variantes (`buttonVariants`), y son código de terceros que no conviene reescribir. |

### Las reglas de los *hooks*

`eslint-plugin-react-hooks` es el plugin **más importante** de un proyecto React. Dos de sus reglas existen desde siempre:

- **`rules-of-hooks`** (error): los *hooks* (`useState`, `useQuery`…) solo pueden llamarse en el nivel superior de un componente o de otro *hook*, nunca dentro de condiciones, bucles o funciones anidadas. Veremos el porqué en el capítulo 8.
- **`exhaustive-deps`** (aviso): en `useEffect`, `useMemo` y `useCallback`, la lista de dependencias debe incluir todo valor del componente que se use dentro. Olvidar una dependencia produce errores sutiles con datos antiguos.

La versión 7 del plugin, la del proyecto, añade al conjunto recomendado reglas derivadas del **React Compiler** que detectan patrones que rompen las suposiciones de React: modificar valores que deberían ser inmutables (`immutability`), leer referencias durante el renderizado (`refs`), llamar a funciones impuras al renderizar (`purity`) o actualizar el estado de forma síncrona dentro de un efecto (`set-state-in-effect`). Todas tendrán sentido tras la Parte III.

::: java
ESLint ocupa el lugar de Checkstyle, PMD y SpotBugs juntos, y las reglas de los *hooks* son comparables a las inspecciones de IntelliJ que detectan, por ejemplo, un `@Transactional` sobre un método privado: el código compila, pero no hace lo que crees.
:::

## Integración con el editor

Ni el compilador ni ESLint deberían ser algo que solo se ejecuta al final. Configura tu editor para que los muestre mientras escribes:

- **VS Code**: instala las extensiones *ESLint* y, si quieres ver mejor las clases de Tailwind, *Tailwind CSS IntelliSense*. Usa la versión de TypeScript del proyecto (paleta de comandos → *TypeScript: Select TypeScript Version* → *Use Workspace Version*).
- **IntelliJ IDEA / WebStorm**: el soporte de TypeScript viene incluido; activa ESLint en *Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint* con la configuración automática.

El `.gitignore` del proyecto excluye `.vscode/*` salvo `extensions.json`: es el fichero donde un equipo recomienda las extensiones que deben instalarse.

::: decision Modo estricto completo y reglas recomendadas, sin formateador automático todavía
**Decisión.** TypeScript en modo estricto con las comprobaciones adicionales de variables y parámetros sin usar; ESLint con los conjuntos recomendados de JavaScript, TypeScript, *hooks* y React Refresh, sin reglas personalizadas.

**Motivos.** Los conjuntos recomendados recogen el consenso de la comunidad y se mantienen solos al actualizar. El modo estricto es lo que hace que TypeScript merezca la pena: sin él, buena parte de la seguridad desaparece.

**Pendiente.** El proyecto no incluye todavía un formateador automático como **Prettier**. Añadirlo (con `eslint-config-prettier` para evitar conflictos) y ejecutarlo al guardar eliminaría las discusiones de estilo en las revisiones. Es una mejora pequeña y recomendable.
:::

## Errores típicos y depuración

- **El editor no muestra errores que `tsc` sí muestra, o al revés.** El editor está usando otra versión de TypeScript; selecciona la del proyecto.
- **`'X' is declared but its value is never read`.** `noUnusedLocals`. Borra la importación o la variable; si es un parámetro que no puedes quitar, prefija su nombre con `_`.
- **`… is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled`.** Cambia a `import type { … }` o marca ese nombre con `type` dentro de la importación: `import { useQuery, type QueryKey } from …`.
- **`React Hook useEffect has a missing dependency`.** No la silencies con un comentario `eslint-disable`: casi siempre señala un error real. Añade la dependencia o reestructura el código (capítulo 8).
- **`Fast refresh only works when a file only exports components`.** Mueve las constantes o funciones exportadas a un fichero `.ts` aparte.

## Ejercicios

::: ejercicio Desactiva el modo estricto
En una rama, cambia `"strict": true` por `false` en `tsconfig.app.json` y ejecuta `npm run typecheck`. Después vuelve a activarlo y escribe en cualquier página una línea que acceda a `query.data.name` sin comprobar que `data` existe. Compara el resultado con y sin modo estricto. ¿Qué error se habría producido en ejecución?
:::

::: ejercicio Provoca errores de ESLint
Escribe en un componente un `useState` dentro de un `if` y un `useEffect` que use una variable del componente sin incluirla en las dependencias. Ejecuta `npm run lint` y lee los mensajes. Luego consulta en la documentación de React la página *Rules of Hooks* y explica con tus palabras por qué existe la primera regla.
:::

::: ejercicio Comprueba la separación de entornos
Escribe `document.title = 'x'` dentro de `vite.config.ts` y `process.env.HOME` dentro de `src/main.tsx`. Ejecuta `npm run typecheck`. ¿Qué subproyecto se queja de cada línea y por qué? Deshaz los cambios.
:::

## Autoevaluación

::: preguntas
1. ¿Por qué hay dos subproyectos de TypeScript en lugar de uno?
2. Si TypeScript tiene `noEmit: true`, ¿quién genera el JavaScript?
3. ¿Qué obliga a hacer `verbatimModuleSyntax` y por qué es útil para Vite?
4. ¿Qué comprobación de `strict` es la que más reduce los errores en ejecución?
5. ¿Qué tipo de errores detecta ESLint que no detecta el compilador? Pon dos ejemplos.
6. ¿Por qué hay una excepción de ESLint para `src/components/ui`?
7. ¿Qué hace `tsc -b` que no haga `tsc` a secas?
:::
