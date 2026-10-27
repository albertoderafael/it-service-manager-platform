# Node.js, npm y el ecosistema de paquetes

<p class="lead">El frontend se ejecuta en el navegador, pero se desarrolla y se construye con herramientas que se ejecutan en Node.js y se instalan con npm. Este capítulo explica esas piezas con el mismo nivel de detalle con el que conoces Maven: qué describe el <code>package.json</code>, cómo se resuelven las versiones, qué hay en <code>node_modules</code> y qué hace cada script.</p>

## Qué es Node.js y para qué lo usamos

**Node.js** es un entorno de ejecución de JavaScript fuera del navegador. Toma el motor V8 de Chrome y le añade acceso al sistema de ficheros, a la red y a los procesos. Con él se pueden escribir servidores, pero en este proyecto **no hay ningún servidor Node en producción**: Node solo ejecuta las **herramientas de desarrollo**.

| Herramienta | Qué hace | Cuándo se ejecuta |
|---|---|---|
| Vite | Servidor de desarrollo y construcción del *bundle* | `npm run dev`, `npm run build` |
| TypeScript (`tsc`) | Comprobación de tipos | `npm run typecheck`, `npm run build`, el editor |
| ESLint | Análisis estático del código | `npm run lint`, el editor |
| Vitest | Pruebas unitarias | `npm run test` |
| CLI de shadcn | Añadir componentes de interfaz al proyecto | `npx shadcn add …` |

El resultado de `npm run build` son ficheros estáticos que cualquier servidor web puede servir; Node ya no interviene.

::: java
Node aquí cumple el papel de la **JDK en tu máquina de desarrollo**: la necesitas para compilar, probar y empaquetar, pero lo que despliegas es el resultado. La diferencia es que en Java desplegabas un JAR que necesitaba una JVM para ejecutarse; aquí despliegas ficheros que ejecuta el navegador del usuario.
:::

El proyecto exige una versión mínima de Node:

```json title="package.json"
"engines": {
  "node": ">=22.12.0"
}
```

Node publica una versión par cada año que se convierte en LTS (soporte a largo plazo). Usa siempre una LTS: la 22 o la 24. Si trabajas con varios proyectos que necesitan versiones distintas, un gestor de versiones como `nvm` (o `nvm-windows`, `fnm` o `volta`) te permite cambiar de una a otra.

## `package.json`: el `pom.xml` del frontend

El fichero `package.json` describe el proyecto: su nombre, sus dependencias y sus tareas.

```json title="package.json (extracto)"
{
  "name": "it-service-manager-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b",
    "lint": "eslint .",
    "test": "vitest run",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.3.0",
    "@tanstack/react-query": "^5.103.2",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "vite": "^8.3.0",
    "typescript": "^6.0.3",
    "vitest": "^5.0.1"
  }
}
```

- `"private": true` evita publicar el proyecto por error en el registro público de npm.
- `"type": "module"` indica que los ficheros `.js` del proyecto usan módulos ES (`import`/`export`), no el sistema antiguo de Node (sección 3.5).
- `scripts` define tareas que se lanzan con `npm run <nombre>` (sección 3.6).
- `dependencies` y `devDependencies` son las dependencias, con una distinción importante.

### `dependencies` frente a `devDependencies`

En un proyecto de navegador, la frontera es: **¿acaba este código dentro del *bundle* que descarga el usuario?**

- **`dependencies`**: librerías que se ejecutan en el navegador (React, TanStack Query, Zod, los iconos…). Vite las incluye en el *bundle*.
- **`devDependencies`**: herramientas que solo se usan al desarrollar (Vite, TypeScript, ESLint, Vitest, los tipos `@types/*`). Nunca llegan al usuario.

::: java
Es la misma idea que los ámbitos de Maven: `dependencies` sería `compile` y `devDependencies` sería `test` o `provided`, más los *plugins* de construcción. En la práctica, Vite incluye en el *bundle* todo lo que se importa desde `src/`, esté donde esté declarado; la separación es sobre todo documental y sirve para instalaciones de producción en proyectos de servidor.
:::

### Las dependencias del proyecto, una a una

| Paquete | Para qué sirve | Parte |
|---|---|---|
| `react`, `react-dom` | La librería de interfaz y su conexión con el DOM del navegador | III |
| `react-router` | Navegación entre pantallas y rutas | VII |
| `@tanstack/react-query` | Caché y sincronización de los datos del servidor | VI |
| `react-hook-form` | Estado y envío de formularios | VII |
| `zod`, `@hookform/resolvers` | Esquemas de validación y su integración con los formularios | VII |
| `radix-ui` | Componentes accesibles sin estilos (desplegables, diálogos…) sobre los que se construye shadcn/ui | IV |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Composición de clases de Tailwind según variantes | IV |
| `lucide-react` | Iconos como componentes de React | IV |
| `sonner` | Notificaciones emergentes (*toasts*) | IV |
| `@fontsource-variable/inter` | La fuente Inter, servida desde el propio proyecto | IV |
| `vite`, `@vitejs/plugin-react` | Servidor de desarrollo y construcción; soporte de React | II |
| `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css` | Motor de estilos y animaciones | IV |
| `typescript`, `@types/react`, `@types/react-dom`, `@types/node` | Compilador y definiciones de tipos | II |
| `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `@eslint/js`, `globals` | Análisis estático | II |
| `vitest` | Pruebas | IX |

Los paquetes `@types/*` merecen una explicación: contienen **solo definiciones de tipos** (ficheros `.d.ts`) para librerías escritas en JavaScript que no incluyen las suyas. Muchas librerías modernas ya traen sus tipos y no los necesitan.

## Versiones semánticas y el fichero de bloqueo

Los paquetes de npm siguen el **versionado semántico** (*semver*): `MAYOR.MENOR.PARCHE`.

- **PARCHE** (`5.103.2 → 5.103.3`): correcciones compatibles.
- **MENOR** (`5.103.2 → 5.104.0`): funcionalidad nueva compatible.
- **MAYOR** (`5.x → 6.0`): cambios incompatibles.

En `package.json` no se fijan versiones exactas, sino **rangos**:

| Rango | Significado | Ejemplo con `^19.3.0` |
|---|---|---|
| `^19.3.0` | Compatible: misma versión mayor | Admite `19.3.1`, `19.9.0`; no `20.0.0` |
| `~19.3.0` | Misma versión menor | Admite `19.3.5`; no `19.4.0` |
| `19.3.0` | Exacta | Solo `19.3.0` |

Si el `package.json` solo tiene rangos, ¿cómo se garantiza que todo el equipo, y el servidor de integración continua, instalan **exactamente** las mismas versiones? Con el fichero **`package-lock.json`**: npm anota en él la versión concreta, la URL de descarga y una suma de verificación de **cada** paquete instalado, incluidos los transitivos. Ese fichero **se versiona en Git** y no se edita a mano.

| Comando | Qué hace | Cuándo |
|---|---|---|
| `npm install` | Instala respetando el *lockfile*; si `package.json` cambió, lo actualiza | Desarrollo diario |
| `npm ci` | Borra `node_modules` e instala **exactamente** lo del *lockfile*; falla si no coincide con `package.json` | Integración continua, instalaciones limpias |
| `npm install paquete` | Añade una dependencia | Al incorporar una librería |
| `npm install -D paquete` | Añade una dependencia de desarrollo | Herramientas |

::: java
Maven resuelve versiones exactas declaradas en el `pom.xml` (salvo rangos, que casi nadie usa), así que no necesita *lockfile*. En npm los rangos son la norma y el *lockfile* es lo que da reproducibilidad. Piensa en él como en un `dependency:tree` congelado y firmado.
:::

::: proyecto
Fíjate en `"zod": "^3.25.76"`. Zod ya tiene una versión mayor 4, con cambios en la forma de personalizar mensajes de error. El proyecto usa la API de la rama 3 (por ejemplo, la opción `errorMap` en `schemas.ts`), y el `^` garantiza que `npm install` nunca saltará a la 4 por sorpresa. Actualizar a una nueva versión mayor es siempre una decisión explícita, con su lectura de la guía de migración.
:::

## `node_modules` y la resolución de dependencias

`npm install` descarga los paquetes en la carpeta `node_modules`, dentro del propio proyecto (no hay un repositorio local compartido como `~/.m2`, aunque npm sí guarda una caché de descargas). Allí están también las dependencias transitivas, en una estructura lo más plana posible.

Algunas consecuencias prácticas:

- `node_modules` es **grande** (cientos de megas) y **nunca** se versiona: está en `.gitignore`. Se regenera siempre con `npm install`.
- Si algo se comporta de forma extraña tras cambiar de rama, la solución clásica es borrar `node_modules` y reinstalar.
- Los ejecutables de las herramientas quedan en `node_modules/.bin`. Por eso los scripts pueden llamar a `vite` o `tsc` sin tenerlos instalados globalmente, y `npx <herramienta>` ejecuta la versión local del proyecto.

## Módulos ES frente a CommonJS

Node nació antes de que JavaScript tuviera módulos estándar e inventó el suyo, **CommonJS**: `require()` y `module.exports`. Desde ES2015, el estándar son los **módulos ES** (*ESM*): `import` y `export`. Ambos sistemas conviven todavía en el ecosistema.

```js
// CommonJS (antiguo)
const react = require('react')
module.exports = { miFuncion }

// Módulos ES (el estándar, el que usa el proyecto)
import react from 'react'
export { miFuncion }
```

Con `"type": "module"`, incluso los ficheros de configuración que ejecuta Node, como `eslint.config.js`, usan `import`. Si ves un error del tipo `require is not defined in ES module scope`, estás mezclando ambos sistemas.

## Los scripts del proyecto

| Comando | Qué ejecuta | Qué hace |
|---|---|---|
| `npm run dev` | `vite` | Arranca el servidor de desarrollo en `http://localhost:5173`, con recarga en caliente y proxy a la API |
| `npm run build` | `tsc -b && vite build` | Comprueba los tipos y, **solo si no hay errores**, genera la versión de producción en `dist/` |
| `npm run typecheck` | `tsc -b` | Solo comprueba los tipos, sin generar nada |
| `npm run lint` | `eslint .` | Analiza el código en busca de errores y malas prácticas |
| `npm run test` | `vitest run` | Ejecuta las pruebas una vez |
| `npm run preview` | `vite preview` | Sirve la carpeta `dist/` para probar la versión de producción en local |

El `&&` de `build` es de la *shell*: ejecuta el segundo comando solo si el primero termina sin error. Así, un error de tipos impide generar una versión de producción, igual que un fallo de compilación impide a Maven empaquetar el JAR.

::: java
| npm | Maven |
|---|---|
| `npm install` | `mvn dependency:resolve` |
| `npm run dev` | `mvn spring-boot:run` (con *devtools*) |
| `npm run build` | `mvn package` |
| `npm run typecheck` | `mvn compile` |
| `npm run test` | `mvn test` |
| `npm run lint` | Checkstyle, PMD o SpotBugs |
:::

## Gestionar dependencias en el día a día

- **Ver qué está desactualizado:** `npm outdated` muestra la versión instalada, la última compatible con tu rango y la última publicada.
- **Actualizar dentro de los rangos:** `npm update` actualiza a la última versión compatible y refresca el *lockfile*.
- **Saltar de versión mayor:** se hace paquete a paquete, con `npm install paquete@latest`, leyendo las notas de la versión y ejecutando `typecheck`, `lint`, `test` y una prueba manual.
- **Vulnerabilidades:** `npm audit` cruza tus dependencias con una base de datos de vulnerabilidades conocidas.

Antes de añadir una librería, hazte las mismas preguntas que con una dependencia de Maven: ¿está mantenida?, ¿cuántas dependencias arrastra?, ¿cuánto pesa en el *bundle*?, ¿lo resuelvo con veinte líneas propias? El proyecto, por ejemplo, prescinde de axios porque `fetch` ya cubre lo necesario (Parte VI).

::: decision npm como gestor de paquetes
**Decisión.** Usar npm, el gestor que viene con Node.

**Alternativas.** pnpm (más rápido y eficiente en disco gracias a un almacén compartido con enlaces) y Yarn. Son excelentes, sobre todo en repositorios con muchos proyectos, pero para un único proyecto la diferencia es pequeña y npm no requiere instalar nada adicional. Cambiar más adelante es sencillo: lo importante es que todo el equipo use el mismo y que solo exista un fichero de bloqueo.
:::

## Errores típicos y depuración

- **`'vite' no se reconoce como un comando` o `Cannot find module`.** Faltan las dependencias: ejecuta `npm install`.
- **Errores raros tras cambiar de rama o actualizar.** Borra `node_modules` (y, si persiste, también la caché de Vite en `node_modules/.vite`) y ejecuta `npm install`.
- **`EBADENGINE` o errores de sintaxis en herramientas.** Tu versión de Node es más antigua que la que exige `engines`. Compruébala con `node -v`.
- **Conflictos en `package-lock.json` al fusionar ramas.** No lo edites a mano: resuelve el conflicto en `package.json` y ejecuta `npm install` para regenerarlo.
- **`ERESOLVE unable to resolve dependency tree`.** Dos paquetes exigen versiones incompatibles de una tercera dependencia, típicamente de `react`. Lee el mensaje: dice quién pide qué. Evita `--force` como solución por defecto.

## Ejercicios

::: ejercicio Lee el árbol de dependencias
Ejecuta `npm ls react` y `npm ls zod`. ¿Qué paquetes dependen de cada uno? Después ejecuta `npm explain @radix-ui/react-select` y localiza qué paquete de `package.json` lo introduce en el proyecto.
:::

::: ejercicio Comprueba qué está desactualizado
Ejecuta `npm outdated`. Clasifica cada fila en una de tres categorías: actualizable con `npm update`, requiere un salto de versión menor fuera del rango o requiere un salto de versión mayor. Para Zod, lee por encima la guía de migración de la versión 4 y apunta qué ficheros del proyecto habría que cambiar.
:::

::: ejercicio Rompe el build a propósito
Introduce un error de tipos (por ejemplo, asigna `'ACTIVA'` a una variable de tipo `ApplicationStatus`) y ejecuta `npm run dev` y después `npm run build`. ¿Se queja el servidor de desarrollo? ¿Y el *build*? Explica la diferencia con lo que sabes del script `build`.
:::

## Autoevaluación

::: preguntas
1. ¿Se ejecuta Node.js en producción en este proyecto? ¿Para qué se usa?
2. ¿Qué criterio separa `dependencies` de `devDependencies` en una aplicación de navegador?
3. ¿Qué versiones admite el rango `^5.103.2`? ¿Y `~5.103.2`?
4. ¿Para qué sirve `package-lock.json` y por qué se versiona en Git?
5. ¿Cuándo usarías `npm ci` en lugar de `npm install`?
6. ¿Por qué no se versiona `node_modules`?
7. ¿Qué indica `"type": "module"` en `package.json`?
8. ¿Qué ocurre al ejecutar `npm run build` si hay un error de tipos?
:::
