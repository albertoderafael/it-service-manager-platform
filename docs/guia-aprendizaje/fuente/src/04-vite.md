# Vite: el entorno de desarrollo y construcción

<p class="lead">Vite es la herramienta que convierte la carpeta <code>src/</code> en una aplicación funcionando: en desarrollo sirve los módulos al navegador con recarga instantánea y reenvía las llamadas a la API al backend; en producción genera el <em>bundle</em> optimizado. Entender sus dos modos de funcionamiento explica muchos comportamientos que, de otro modo, parecen magia.</p>

## Qué es Vite y qué problema resuelve

Hasta hace unos años, la herramienta habitual era **webpack**: antes de poder ver nada en el navegador, empaquetaba **toda** la aplicación. En un proyecto grande, arrancar el servidor de desarrollo tardaba decenas de segundos y cada cambio, varios más.

**Vite** («rápido», en francés) parte de una observación: los navegadores modernos ya entienden módulos ES (`<script type="module">` e `import`). En desarrollo no hace falta empaquetar nada; basta con **servir cada fichero por separado, transformándolo al vuelo** cuando el navegador lo pide. Solo al construir para producción, donde cientos de peticiones serían lentas, se empaqueta.

Vite tiene, por tanto, **dos modos con motores distintos**:

| | Desarrollo (`npm run dev`) | Producción (`npm run build`) |
|---|---|---|
| Objetivo | Arranque y cambios instantáneos | Ficheros mínimos y cacheables |
| Empaqueta tu código | No: un módulo por petición | Sí: *chunks* optimizados |
| Motor | Servidor propio + transformación con Oxc | Rolldown |
| Resultado | En memoria, servido en `localhost:5173` | Carpeta `dist/` |

::: nota
Desde **Vite 8**, tanto el empaquetado de producción como la preparación de dependencias usan **Rolldown**, un empaquetador escrito en Rust por el mismo equipo, y las transformaciones de TypeScript y JSX usan **Oxc**. Hasta Vite 7 esas tareas se repartían entre esbuild y Rollup. Si lees documentación antigua, encontrarás esos nombres; el concepto es el mismo.
:::

## El modo desarrollo

Cuando ejecutas `npm run dev` y abres `http://localhost:5173`:

1. El navegador pide `/` (o cualquier ruta) y Vite responde con `index.html`, al que añade un pequeño cliente para la recarga en caliente.
2. El navegador encuentra `<script type="module" src="/src/main.tsx">` y pide `/src/main.tsx`.
3. Vite lee el fichero, **elimina los tipos y transforma el JSX** a JavaScript, y lo devuelve. Tarda milisegundos, porque transforma un único fichero.
4. El navegador ve los `import` de `main.tsx` y pide cada módulo: `/src/app/app.tsx`, `/src/index.css`… y así sucesivamente, solo con los módulos que realmente se usan en la pantalla actual.

### La preparación de dependencias

Las librerías de `node_modules` son un caso especial. Muchas están formadas por cientos de ficheros pequeños (por ejemplo, `radix-ui` incluye decenas de subpaquetes), y algunas todavía se publican en formato CommonJS, que el navegador no entiende. La primera vez que arrancas, Vite **pre-empaqueta** cada dependencia en un único módulo ES y lo guarda en `node_modules/.vite/deps`. Las siguientes veces reutiliza esa caché.

Por eso, la primera ejecución de `npm run dev` tras instalar dependencias tarda un poco más, y por eso a veces aparece el mensaje *new dependencies optimized, reloading*: Vite ha descubierto una dependencia nueva y recarga la página tras prepararla.

### Recarga en caliente (HMR) y React Fast Refresh

Cuando guardas un fichero, Vite no recarga la página entera. Su servidor mantiene una conexión WebSocket abierta con el navegador y le avisa de **qué módulo ha cambiado**. El navegador descarga solo ese módulo y lo sustituye en caliente (*Hot Module Replacement*, HMR).

Para los componentes de React, el plugin `@vitejs/plugin-react` añade **React Fast Refresh**: el componente modificado se vuelve a pintar **conservando su estado**. Puedes estar a mitad de un formulario, cambiar el color de un botón en el código y ver el cambio sin perder lo que habías escrito.

::: atencion
Fast Refresh solo funciona bien si un fichero `.tsx` exporta **únicamente componentes**. Si además exporta constantes o funciones, Vite no puede saber si el cambio afecta a otros módulos y recarga la página entera. La regla de ESLint `react-refresh/only-export-components`, activa en el proyecto, te avisa de ello (capítulo 5). Por eso las constantes y utilidades viven en ficheros `.ts` aparte: `constants.ts`, `list-params.ts`, `navigation.ts`.
:::

::: java
El efecto es parecido a Spring Boot DevTools o al *hot swap* del depurador de IntelliJ, pero bastante más fino: no se reinicia el contexto de la aplicación, solo se sustituye un módulo y el estado de la pantalla sobrevive.
:::

## El modo producción

`vite build` hace lo contrario: parte de `index.html`, sigue todos los `import`, y con Rolldown genera la carpeta `dist/`:

```text
dist/
├── index.html                          ← con las rutas a los ficheros con huella
├── favicon.svg                         ← copiado tal cual desde public/
└── assets/
    ├── index-<hash>.js                 ← bundle inicial: React, router, layout…
    ├── index-<hash>.css                ← todo el CSS (Tailwind ya procesado)
    ├── applications-list-page-<hash>.js  ← un chunk por página con carga diferida
    ├── demands-list-page-<hash>.js
    └── …
```

Aquí se aplican todas las optimizaciones del capítulo 1: eliminación de código muerto, minificación, división en *chunks* y huellas en los nombres. También se sustituyen las expresiones `import.meta.env.VITE_*` por sus valores literales (sección 4.6).

La carpeta `public/` contiene ficheros que se copian sin procesar a la raíz de `dist/` (aquí, el `favicon.svg`). Se referencian con ruta absoluta (`/favicon.svg`).

`npm run preview` arranca un servidor sencillo sobre `dist/` para comprobar el resultado de producción en local. No lo uses para desplegar: es solo para probar.

## Vite no comprueba los tipos

Este punto sorprende a todo el que llega desde Java: **Vite borra los tipos sin comprobarlos**. Oxc trata cada fichero de forma aislada y no tiene la visión global que necesita una comprobación de tipos. Es lo que le permite transformar un fichero en milisegundos.

Consecuencias:

- `npm run dev` arranca y funciona **aunque haya errores de tipos**. El navegador recibe el JavaScript igualmente.
- Los errores de tipos los ves en el **editor** (que ejecuta el servicio de lenguaje de TypeScript continuamente) y al ejecutar **`tsc`**.
- Por eso `npm run build` ejecuta `tsc -b` antes de `vite build`: así ninguna versión de producción sale con errores de tipos.

::: decision Separar transformación y comprobación de tipos
Es el diseño estándar de Vite y del ecosistema actual: transformación rápida y aislada para el día a día, y comprobación completa en el editor, en el *build* y en la integración continua. La alternativa, comprobar tipos en el propio servidor de desarrollo con un plugin como `vite-plugin-checker`, es posible, pero ralentiza el ciclo y duplica lo que ya hace el editor. El proyecto no lo usa; a cambio, conviene ejecutar `npm run typecheck` antes de cada *commit*.
:::

## `vite.config.ts` línea a línea

Toda la configuración de Vite está en un fichero TypeScript que se ejecuta en Node:

```ts title="vite.config.ts"
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Microservicio de demandas
  const demandTarget =
    env.VITE_DEMAND_API_TARGET || 'http://localhost:8080'

  // Microservicio de aplicaciones
  const applicationTarget =
    env.VITE_APPLICATION_API_TARGET || 'http://localhost:8081'

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      port: 5173,
      proxy: {
        '/api/demands': { target: demandTarget, changeOrigin: true },
        '/api/applications': { target: applicationTarget, changeOrigin: true },
      },
    },

    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
```

Lo recorremos por bloques:

- **`defineConfig(({ mode }) => ({ … }))`.** La configuración puede ser un objeto o, como aquí, una **función** que recibe el modo (`development`, `production`) y devuelve el objeto. `defineConfig` no hace nada en ejecución: solo da tipos y autocompletado.
- **`loadEnv(mode, process.cwd(), '')`.** Lee los ficheros `.env` del proyecto. El tercer argumento es el prefijo de las variables que se cargan; con `''` se cargan **todas**, pero solo para usarlas aquí, en la configuración, que se ejecuta en Node. No llegan al navegador.
- **`plugins`.** `react()` añade la transformación de JSX y React Fast Refresh. `tailwindcss()` integra el motor de Tailwind CSS 4, que genera el CSS a partir de las clases que encuentra en el código (Parte IV).
- **`resolve.alias`.** Define que `@` apunta a la carpeta `src`. `import.meta.url` es la URL del propio fichero de configuración, y `fileURLToPath` la convierte en una ruta del sistema. El mismo alias está declarado en `tsconfig.app.json` para que **TypeScript** también lo entienda: Vite resuelve los ficheros y TypeScript comprueba los tipos, y cada uno necesita saberlo.
- **`server`.** El puerto del servidor de desarrollo y el **proxy**, que explicamos en la sección 4.7.
- **`test`.** La configuración de Vitest, que reutiliza la de Vite: las pruebas se ejecutan en un entorno Node (sin navegador simulado) e incluyen los ficheros `*.test.ts` (Parte IX).

::: proyecto
La configuración refleja que el backend se ha separado en **dos servicios**: las demandas en el puerto 8080 y las aplicaciones en el 8081, cada uno con su propia variable de entorno para cambiar el destino. El navegador no lo nota: sigue llamando a `/api/demands` y `/api/applications` en el mismo origen, y el proxy decide a qué servicio reenviar. Ten en cuenta que `.env.example` todavía documenta la variable anterior, `VITE_API_PROXY_TARGET`, que la configuración ya no usa; conviene actualizarlo con `VITE_DEMAND_API_TARGET` y `VITE_APPLICATION_API_TARGET` (ejercicio 4.2).
:::

## Variables de entorno

Una aplicación necesita valores que cambian según el entorno, como la URL base de la API. Vite los lee de ficheros `.env`, en este orden de prioridad creciente:

| Fichero | Cuándo se carga | ¿Se versiona? |
|---|---|---|
| `.env` | Siempre | Sí, si no tiene secretos |
| `.env.local` | Siempre, salvo en pruebas | **No** (está en `.gitignore`) |
| `.env.development`, `.env.production` | Solo en ese modo | Sí |
| `.env.development.local`, `.env.production.local` | Solo en ese modo | **No** |

En el código del navegador **solo están disponibles las variables que empiezan por `VITE_`**, a través de `import.meta.env`:

```ts title="src/lib/api-client.ts"
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'
```

Y para que TypeScript conozca esas variables, se declaran en `src/vite-env.d.ts`:

```ts title="src/vite-env.d.ts"
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}
```

::: atencion
**Las variables `VITE_*` no son secretas.** Al construir, Vite sustituye `import.meta.env.VITE_API_BASE_URL` por su valor literal dentro del JavaScript que descarga cualquier usuario. Nunca pongas en ellas contraseñas, claves de API privadas ni nada que no publicarías en una página web. El prefijo existe precisamente para que no se filtren por accidente las demás variables del sistema. Además, el valor se fija **en el momento del *build***: para cambiarlo hay que volver a construir.
:::

::: java
Es el equivalente de `application.properties` y los perfiles de Spring (`application-dev.properties`), con una diferencia crucial: en Spring las propiedades se leen en el servidor al arrancar; aquí se **incrustan en el código** al construir y viajan al navegador del usuario.
:::

## El proxy de desarrollo

En desarrollo, el frontend se sirve desde `http://localhost:5173` y el backend escucha en `http://localhost:8080` y `8081`. Para el navegador son **orígenes distintos** (cambia el puerto), y por seguridad no permite que una página lea las respuestas de otro origen salvo que ese servidor lo autorice expresamente con cabeceras **CORS**. El backend no tiene CORS configurado.

El proxy de Vite evita el problema: el navegador **solo habla con Vite** (mismo origen), y es Vite, desde Node, quien reenvía la petición al backend. Entre servidores no existen restricciones de origen.

<figure>
<svg viewBox="0 0 680 210" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10.5">
  <defs><marker id="a4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="10" y="60" width="150" height="80" rx="8" fill="#f1f5f9" stroke="#94a3b8"/>
  <text x="85" y="92" text-anchor="middle" font-weight="700">Navegador</text>
  <text x="85" y="110" text-anchor="middle" font-size="9" fill="#475569">página servida desde</text>
  <text x="85" y="123" text-anchor="middle" font-size="9" fill="#475569">localhost:5173</text>
  <rect x="250" y="45" width="170" height="110" rx="8" fill="#ecfeff" stroke="#0891b2"/>
  <text x="335" y="70" text-anchor="middle" font-weight="700">Servidor de Vite</text>
  <text x="335" y="86" text-anchor="middle" font-size="9" fill="#0e7490">localhost:5173</text>
  <text x="335" y="110" text-anchor="middle" font-size="9">/src/**  → módulos transformados</text>
  <text x="335" y="126" text-anchor="middle" font-size="9">/api/applications/** → :8081</text>
  <text x="335" y="142" text-anchor="middle" font-size="9">/api/demands/** → :8080</text>
  <rect x="510" y="20" width="160" height="70" rx="8" fill="#fff7ed" stroke="#fdba74"/>
  <text x="590" y="48" text-anchor="middle" font-weight="700">Servicio de aplicaciones</text>
  <text x="590" y="66" text-anchor="middle" font-size="9" fill="#9a3412">Spring Boot · localhost:8081</text>
  <rect x="510" y="115" width="160" height="70" rx="8" fill="#fff7ed" stroke="#fdba74"/>
  <text x="590" y="143" text-anchor="middle" font-weight="700">Servicio de demandas</text>
  <text x="590" y="161" text-anchor="middle" font-size="9" fill="#9a3412">Spring Boot · localhost:8080</text>
  <line x1="160" y1="100" x2="248" y2="100" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a4)"/>
  <text x="204" y="92" text-anchor="middle" font-size="8.5">mismo origen</text>
  <line x1="420" y1="85" x2="508" y2="60" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a4)"/>
  <line x1="420" y1="120" x2="508" y2="145" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a4)"/>
  <text x="464" y="105" text-anchor="middle" font-size="8.5" fill="#475569">servidor a servidor:</text>
  <text x="464" y="117" text-anchor="middle" font-size="8.5" fill="#475569">sin CORS</text>
</svg>
<figcaption><b>Figura 4.1.</b> El proxy de Vite reenvía las llamadas a la API según su prefijo. El navegador nunca habla directamente con el backend.</figcaption>
</figure>

Cada entrada de `proxy` asocia un **prefijo de ruta** a un destino. La ruta se reenvía completa: `GET /api/applications?page=0` llega al servicio como `GET http://localhost:8081/api/applications?page=0`. La opción `changeOrigin: true` reescribe la cabecera `Host` de la petición con la del destino, algo que algunos servidores necesitan para responder correctamente.

::: atencion
El proxy es una función **del servidor de Vite**: existe con `npm run dev` y, por defecto, también con `npm run preview`, que reutiliza la misma configuración. Pero en producción no hay ningún servidor de Vite, así que hay que resolver lo mismo de otra forma: con un proxy inverso que sirva el frontend y la API bajo el mismo dominio, o configurando CORS en el backend. Lo veremos con detalle en la Parte VI.
:::

## Decisión: Vite frente a otras herramientas

::: decision Vite como herramienta de desarrollo y construcción
**Contexto.** Durante años, la forma estándar de crear un proyecto React fue Create React App, basado en webpack. Hoy está abandonado y la propia documentación de React desaconseja usarlo.

**Decisión.** Vite, con el plugin oficial de React.

**Motivos.** Arranque y recarga casi instantáneos; configuración mínima y legible; integración directa con Tailwind CSS 4 y con Vitest (las pruebas reutilizan la misma configuración); proxy de desarrollo incluido; y es la base recomendada para SPA en la documentación de React y de la mayoría de librerías.

**Alternativas.** webpack (muy flexible, pero lento y con configuración extensa); Rspack (compatible con webpack y rápido, útil para migrar proyectos webpack existentes); Parcel (cero configuración, menos extendido).
:::

## Errores típicos y depuración

- **`Port 5173 is in use`.** Ya hay otro `npm run dev` en marcha. Vite elegirá otro puerto (5174…) y lo indicará en la terminal; fíjate en la URL que muestra.
- **`http proxy error: /api/applications … ECONNREFUSED`** en la terminal de Vite. El servicio de destino no está arrancado o escucha en otro puerto. Comprueba los puertos y las variables `VITE_*_API_TARGET`.
- **Una petición a la API devuelve el `index.html`.** La ruta no encaja con ningún prefijo del proxy (por ejemplo, `/api/teams` cuando solo hay reglas para `applications` y `demands`), así que Vite la trata como una ruta de la SPA. Añade la regla correspondiente.
- **Cambiaste `.env.local` y no se nota.** Las variables se leen al arrancar: reinicia `npm run dev`.
- **`import.meta.env.MI_VARIABLE` es `undefined`.** Le falta el prefijo `VITE_`.
- **Comportamiento extraño tras actualizar dependencias.** Arranca con `npx vite --force` para regenerar la caché de `node_modules/.vite`.

## Ejercicios

::: ejercicio Observa HMR y Fast Refresh
Con la aplicación abierta en *Nueva aplicación*, escribe algo en el campo *Nombre*. Sin enviar el formulario, cambia en el código el texto del título de la página (`src/features/applications/pages/application-create-page.tsx`) y guarda. ¿Se conserva lo que habías escrito? Ahora añade a ese fichero una línea `export const PRUEBA = 1`, guarda, y repite el experimento. ¿Qué cambia? Relaciónalo con la regla `react-refresh/only-export-components`. Deshaz el cambio.
:::

::: ejercicio Actualiza `.env.example`
Reescribe `.env.example` para que documente las variables que la configuración usa realmente (`VITE_API_BASE_URL`, `VITE_DEMAND_API_TARGET` y `VITE_APPLICATION_API_TARGET`), con un comentario para cada una. Crea un `.env.local` que apunte el servicio de aplicaciones a un puerto incorrecto, arranca y comprueba en la terminal y en *Network* qué ocurre.
:::

::: ejercicio Inspecciona el resultado del build
Ejecuta `npm run build`. En la salida de la terminal, Vite lista cada fichero generado con su tamaño y su tamaño comprimido con gzip. ¿Cuál es el *chunk* más grande y qué crees que contiene? Abre `dist/index.html` en un editor y localiza cómo se referencia el JavaScript inicial. Busca en `dist/assets/index-*.js` el texto `/api` para comprobar cómo quedó incrustada la URL base.
:::

## Autoevaluación

::: preguntas
1. ¿Por qué Vite no empaqueta tu código en desarrollo y sí en producción?
2. ¿Qué es la preparación de dependencias y dónde se guarda?
3. ¿Qué diferencia hay entre HMR y React Fast Refresh?
4. ¿Por qué `npm run dev` funciona aunque haya errores de tipos? ¿Qué lo impide en producción?
5. ¿Por qué el alias `@` se declara tanto en `vite.config.ts` como en `tsconfig.app.json`?
6. ¿Qué variables de entorno llegan al navegador y por qué no deben contener secretos?
7. ¿Qué problema resuelve el proxy de desarrollo y por qué no sirve en producción?
8. ¿A qué servicio y con qué URL llega la petición `GET /api/demands/7` en desarrollo?
:::
