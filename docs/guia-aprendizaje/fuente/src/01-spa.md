# Cómo funciona una aplicación web moderna

<p class="lead">Antes de escribir una sola línea de React conviene entender qué tipo de aplicación estamos construyendo, dónde se ejecuta y qué ocurre desde que el usuario escribe la URL hasta que ve el listado de aplicaciones. Este capítulo da el mapa general que usaremos en el resto de la guía.</p>

## Del servidor que pinta páginas a la aplicación en el navegador

Durante años, el modelo dominante en el mundo Java fue la **aplicación multipágina** (MPA, *Multi-Page Application*): cada vez que el usuario pulsa un enlace o envía un formulario, el navegador pide una página nueva al servidor, el servidor ejecuta lógica (un servlet, un controlador de Spring MVC), genera el HTML completo con una plantilla (JSP, JSF, Thymeleaf) y lo devuelve. El navegador tira la página anterior y pinta la nueva.

Una **aplicación de una sola página** (SPA, *Single-Page Application*) invierte el reparto de responsabilidades:

- El servidor entrega **una única vez** un HTML casi vacío y un paquete de JavaScript.
- A partir de ahí, **el JavaScript se ejecuta en el navegador** y construye toda la interfaz.
- Cuando necesita datos, no pide páginas: pide **JSON** a una API REST.
- Al navegar entre pantallas, la URL cambia, pero **la página no se recarga**: el JavaScript sustituye la parte de la interfaz que corresponde.

<figure>
<svg viewBox="0 0 680 300" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="11">
  <defs><marker id="a1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker>
  <marker id="a1c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <text x="165" y="18" text-anchor="middle" font-weight="700" fill="#0f172a" font-size="12">Multipágina (JSP, Thymeleaf)</text>
  <text x="515" y="18" text-anchor="middle" font-weight="700" fill="#0f172a" font-size="12">SPA (este proyecto)</text>
  <line x1="340" y1="8" x2="340" y2="292" stroke="#e2e8f0" stroke-width="1.5"/>
  <rect x="20" y="40" width="100" height="44" rx="6" fill="#f1f5f9" stroke="#94a3b8"/><text x="70" y="66" text-anchor="middle">Navegador</text>
  <rect x="210" y="40" width="110" height="44" rx="6" fill="#fff7ed" stroke="#fdba74"/><text x="265" y="60" text-anchor="middle">Servidor</text><text x="265" y="74" text-anchor="middle" font-size="9" fill="#9a3412">controlador + plantilla</text>
  <line x1="120" y1="104" x2="210" y2="104" stroke="#475569" marker-end="url(#a1)"/><text x="165" y="99" text-anchor="middle" font-size="9.5">GET /aplicaciones</text>
  <line x1="210" y1="126" x2="120" y2="126" stroke="#475569" marker-end="url(#a1)"/><text x="165" y="140" text-anchor="middle" font-size="9.5">HTML completo</text>
  <line x1="120" y1="170" x2="210" y2="170" stroke="#475569" marker-end="url(#a1)"/><text x="165" y="165" text-anchor="middle" font-size="9.5">GET /aplicaciones?pagina=2</text>
  <line x1="210" y1="192" x2="120" y2="192" stroke="#475569" marker-end="url(#a1)"/><text x="165" y="206" text-anchor="middle" font-size="9.5">HTML completo otra vez</text>
  <text x="165" y="240" text-anchor="middle" font-size="9.5" fill="#475569">Cada clic recarga la página entera.</text>
  <text x="165" y="254" text-anchor="middle" font-size="9.5" fill="#475569">La interfaz se genera en el servidor.</text>
  <rect x="360" y="40" width="120" height="44" rx="6" fill="#ecfeff" stroke="#0891b2"/><text x="420" y="60" text-anchor="middle">Navegador</text><text x="420" y="74" text-anchor="middle" font-size="9" fill="#0e7490">React construye la UI</text>
  <rect x="560" y="40" width="105" height="44" rx="6" fill="#fff7ed" stroke="#fdba74"/><text x="612" y="60" text-anchor="middle">Spring Boot</text><text x="612" y="74" text-anchor="middle" font-size="9" fill="#9a3412">solo API REST</text>
  <line x1="480" y1="104" x2="560" y2="104" stroke="#475569" marker-end="url(#a1)"/><text x="520" y="99" text-anchor="middle" font-size="9.5">1 vez: HTML + JS</text>
  <line x1="560" y1="126" x2="480" y2="126" stroke="#475569" marker-end="url(#a1)"/>
  <line x1="480" y1="170" x2="560" y2="170" stroke="#0891b2" marker-end="url(#a1c)"/><text x="520" y="165" text-anchor="middle" font-size="9.5" fill="#0e7490">GET /api/applications</text>
  <line x1="560" y1="192" x2="480" y2="192" stroke="#0891b2" marker-end="url(#a1c)"/><text x="520" y="206" text-anchor="middle" font-size="9.5" fill="#0e7490">JSON</text>
  <text x="515" y="240" text-anchor="middle" font-size="9.5" fill="#475569">Navegar no recarga la página.</text>
  <text x="515" y="254" text-anchor="middle" font-size="9.5" fill="#475569">Solo viajan datos (JSON).</text>
</svg>
<figcaption><b>Figura 1.1.</b> Aplicación multipágina frente a SPA. En una SPA el servidor se limita a exponer datos.</figcaption>
</figure>

En nuestro caso, el backend `it-service-manager` (Spring Boot) **no genera ninguna pantalla**: expone recursos como `GET /api/applications` o `PUT /api/demands/{id}` y devuelve JSON. Todo lo que ve el usuario —el menú lateral, las tablas, los filtros, los formularios— lo construye el frontend en el navegador.

::: java
Piensa en el frontend como **otro cliente de tu API**, igual que lo sería una aplicación móvil o un proceso batch que consume REST con `RestClient`. El contrato entre ambos son los DTO (`ApplicationResponse`, `ApplicationCreateRequest`…) y los códigos HTTP. La consecuencia práctica es importante: **toda validación que haga el frontend es una comodidad para el usuario, nunca una garantía**. La autoridad sigue siendo el backend, con su Bean Validation y sus reglas de dominio.
:::

### Ventajas e inconvenientes

| Aspecto | Multipágina | SPA |
|---|---|---|
| Primera carga | Rápida: llega HTML ya pintado | Más lenta: hay que descargar y ejecutar el JavaScript |
| Navegación posterior | Recarga completa en cada clic | Instantánea; solo se piden datos |
| Experiencia de usuario | Más «documento» | Más «aplicación de escritorio» |
| Separación frontend/backend | Acoplados en el mismo proyecto | Totalmente independientes; se comunican por HTTP |
| SEO e indexación | Natural | Requiere técnicas adicionales |

Para una aplicación interna de gestión, con usuarios autenticados que trabajan durante horas con tablas y formularios, la SPA es la opción natural: el coste de la primera carga se paga una vez y el SEO es irrelevante.

## Las piezas del navegador: HTML, CSS, JavaScript y el DOM

El navegador entiende tres lenguajes, y conviene tener clara la función de cada uno:

- **HTML** describe la **estructura** del contenido: «esto es una tabla, esto un botón, esto un campo de texto».
- **CSS** describe la **presentación**: colores, tamaños, márgenes, disposición en rejilla o en columna.
- **JavaScript** aporta el **comportamiento**: reaccionar a un clic, pedir datos, cambiar lo que se ve.

### El DOM

Cuando el navegador lee el HTML, no lo guarda como texto: construye un **árbol de objetos** en memoria llamado **DOM** (*Document Object Model*). Cada etiqueta es un nodo con propiedades y nodos hijos. Lo que ves en pantalla es siempre la representación del DOM *actual*, no del HTML original.

JavaScript puede leer y modificar ese árbol en cualquier momento:

```js
const boton = document.createElement('button')
boton.textContent = 'Nueva aplicación'
boton.addEventListener('click', () => alert('¡Clic!'))
document.getElementById('root').appendChild(boton)
```

Esto es exactamente lo que hace React, solo que de forma automática y eficiente: tú describes **cómo debe ser** la interfaz y React calcula **qué operaciones del DOM** hacen falta para llegar a ese estado. Lo veremos a fondo en el capítulo 7.

### Un solo hilo y el bucle de eventos

El JavaScript de una página se ejecuta en **un único hilo**. No hay `Thread`, ni `ExecutorService`, ni `synchronized`. ¿Cómo puede entonces hacer una petición HTTP sin congelar la interfaz?

La respuesta es el **bucle de eventos** (*event loop*). Las operaciones lentas —una petición de red, un temporizador— se delegan al navegador, que las ejecuta fuera del hilo de JavaScript. Cuando terminan, el navegador deja en una cola la función que hay que ejecutar con el resultado. El hilo de JavaScript, cuando termina lo que estaba haciendo, toma la siguiente tarea de la cola.

```ts
console.log('1. Antes de la petición')
fetch('/api/applications').then(() => console.log('3. Ha llegado la respuesta'))
console.log('2. Después de lanzar la petición')
```

La salida es 1, 2, 3: `fetch` no bloquea; registra qué hacer cuando llegue la respuesta y continúa. Toda la programación asíncrona de JavaScript (*promesas*, `async`/`await`, que veremos en el capítulo 2) se apoya en este mecanismo.

::: java
El modelo se parece más a un servidor reactivo (WebFlux, Netty) que a un servidor de servlets clásico con un hilo por petición. La regla de oro es la misma: **nunca bloquees el hilo**. Un bucle que tarde dos segundos en el navegador congela la página entera: no responde a clics ni repinta.
:::

## Qué ocurre al abrir la aplicación

Veamos el recorrido completo, desde que el navegador pide `http://localhost:5173/aplicaciones` hasta que aparece el listado. Es el mejor mapa para orientarse en el código.

<figure>
<svg viewBox="0 0 680 360" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10.5">
  <defs><marker id="a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <g>
    <rect x="10" y="10" width="200" height="50" rx="6" fill="#f1f5f9" stroke="#94a3b8"/><text x="110" y="31" text-anchor="middle" font-weight="700">1 · index.html</text><text x="110" y="47" text-anchor="middle" font-size="9" fill="#475569">&lt;div id="root"&gt; + &lt;script src=main.tsx&gt;</text>
    <rect x="240" y="10" width="200" height="50" rx="6" fill="#f1f5f9" stroke="#94a3b8"/><text x="340" y="31" text-anchor="middle" font-weight="700">2 · main.tsx</text><text x="340" y="47" text-anchor="middle" font-size="9" fill="#475569">createRoot(#root).render(&lt;App/&gt;)</text>
    <rect x="470" y="10" width="200" height="50" rx="6" fill="#ecfeff" stroke="#0891b2"/><text x="570" y="31" text-anchor="middle" font-weight="700">3 · App (app.tsx)</text><text x="570" y="47" text-anchor="middle" font-size="9" fill="#475569">Providers: Query, Tooltip, Router</text>
    <line x1="210" y1="35" x2="238" y2="35" stroke="#0891b2" marker-end="url(#a2)"/>
    <line x1="440" y1="35" x2="468" y2="35" stroke="#0891b2" marker-end="url(#a2)"/>
    <line x1="570" y1="60" x2="570" y2="98" stroke="#0891b2" marker-end="url(#a2)"/>
    <rect x="470" y="100" width="200" height="50" rx="6" fill="#ecfeff" stroke="#0891b2"/><text x="570" y="121" text-anchor="middle" font-weight="700">4 · router.tsx</text><text x="570" y="137" text-anchor="middle" font-size="9" fill="#475569">la URL /aplicaciones encaja con una ruta</text>
    <line x1="470" y1="125" x2="442" y2="125" stroke="#0891b2" marker-end="url(#a2)"/>
    <rect x="240" y="100" width="200" height="50" rx="6" fill="#ecfeff" stroke="#0891b2"/><text x="340" y="121" text-anchor="middle" font-weight="700">5 · AppLayout</text><text x="340" y="137" text-anchor="middle" font-size="9" fill="#475569">menú lateral + cabecera + &lt;Outlet/&gt;</text>
    <line x1="240" y1="125" x2="212" y2="125" stroke="#0891b2" marker-end="url(#a2)"/>
    <rect x="10" y="100" width="200" height="50" rx="6" fill="#ecfeff" stroke="#0891b2"/><text x="110" y="121" text-anchor="middle" font-weight="700">6 · carga diferida</text><text x="110" y="137" text-anchor="middle" font-size="9" fill="#475569">descarga applications-list-page.js</text>
    <line x1="110" y1="150" x2="110" y2="188" stroke="#0891b2" marker-end="url(#a2)"/>
    <rect x="10" y="190" width="200" height="50" rx="6" fill="#ecfeff" stroke="#0891b2"/><text x="110" y="211" text-anchor="middle" font-weight="700">7 · ApplicationsListPage</text><text x="110" y="227" text-anchor="middle" font-size="9" fill="#475569">lee filtros de la URL; useApplications()</text>
    <line x1="210" y1="215" x2="238" y2="215" stroke="#0891b2" marker-end="url(#a2)"/>
    <rect x="240" y="190" width="200" height="50" rx="6" fill="#ecfeff" stroke="#0891b2"/><text x="340" y="211" text-anchor="middle" font-weight="700">8 · TanStack Query</text><text x="340" y="227" text-anchor="middle" font-size="9" fill="#475569">no hay datos en caché → pide a la API</text>
    <line x1="440" y1="215" x2="468" y2="215" stroke="#0891b2" marker-end="url(#a2)"/>
    <rect x="470" y="190" width="200" height="50" rx="6" fill="#fff7ed" stroke="#fdba74"/><text x="570" y="211" text-anchor="middle" font-weight="700">9 · fetch → proxy → Spring</text><text x="570" y="227" text-anchor="middle" font-size="9" fill="#9a3412">GET /api/applications?page=0&amp;size=10</text>
    <line x1="570" y1="240" x2="570" y2="278" stroke="#0891b2" marker-end="url(#a2)"/>
    <rect x="240" y="280" width="430" height="58" rx="6" fill="#0b1220"/><text x="455" y="303" text-anchor="middle" font-weight="700" fill="#fff">10 · Llega el JSON → React vuelve a renderizar</text><text x="455" y="321" text-anchor="middle" font-size="9" fill="#a5f3fc">mientras tanto se mostraba un esqueleto de carga (TableSkeleton); ahora aparece la tabla</text>
  </g>
</svg>
<figcaption><b>Figura 1.2.</b> Secuencia de arranque de la aplicación hasta mostrar el listado de aplicaciones.</figcaption>
</figure>

### Paso 1: el HTML de partida

El servidor de desarrollo (Vite, capítulo 4) devuelve siempre el mismo `index.html`. Fíjate en lo poco que contiene:

```html title="index.html"
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0b1220" />
    <title>IT Service Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Dos líneas lo explican todo. `<div id="root"></div>` es un contenedor vacío donde React dibujará la aplicación. `<script type="module" src="/src/main.tsx">` carga el punto de entrada. El atributo `type="module"` indica que es un **módulo ES** que puede importar otros módulos (capítulo 3). La etiqueta `viewport` es la que permite que el diseño se adapte a móviles.

### Paso 2: el punto de entrada

```tsx title="src/main.tsx"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import { App } from './app/app'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`createRoot` crea una **raíz de React** asociada al `div#root` y `render` le dice qué dibujar: el componente `App`. A partir de este momento React es el dueño de todo lo que hay dentro de ese `div`. La importación `'./index.css'` incorpora los estilos globales (Tailwind y el tema, Parte IV). `StrictMode` es una ayuda de desarrollo que estudiaremos en el capítulo 8: no pinta nada, pero ejecuta comprobaciones adicionales.

El signo `!` tras `getElementById('root')` es TypeScript: le estamos asegurando al compilador que el elemento existe y no es `null` (capítulo 2).

### Paso 3: los proveedores globales

```tsx title="src/app/app.tsx"
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
```

`App` no pinta nada visible por sí mismo: **envuelve** la aplicación en *proveedores* que ofrecen servicios a todos los componentes que hay por debajo. `QueryClientProvider` da acceso a la caché de datos del servidor (TanStack Query, Parte VI), `TooltipProvider` coordina los tooltips, `RouterProvider` decide qué pantalla corresponde a la URL actual y `Toaster` es el contenedor de las notificaciones emergentes («Cambios guardados»). El mecanismo de los proveedores, el *contexto* de React, es el tema del capítulo 9.

::: java
`App` cumple un papel parecido a la configuración de arranque de una aplicación Spring (`@SpringBootApplication` más las clases `@Configuration`): no contiene lógica de negocio, pero registra la infraestructura que el resto del código usará sin tener que construirla. La diferencia es que aquí no hay contenedor de inversión de control: la «inyección» se hace por posición en el árbol de componentes.
:::

### Pasos 4 a 10: rutas, layout, página y datos

El router compara la URL con su tabla de rutas (`src/app/router.tsx`). La ruta raíz pinta `AppLayout` —el armazón con menú lateral y cabecera— y, dentro de su hueco `<Outlet />`, la página que corresponda. Las páginas de cada módulo se cargan **bajo demanda**: el código de `ApplicationsListPage` no se descarga hasta que alguien visita `/aplicaciones`.

La página lee los filtros de la URL (`?estado=ACTIVE&pagina=2`), llama a `useApplications(params)` y TanStack Query lanza la petición `GET /api/applications`. Mientras llega la respuesta se muestra un esqueleto animado; cuando llega, React vuelve a dibujar la página con la tabla. Cada uno de estos pasos tiene su capítulo; por ahora basta con que te quedes con la secuencia.

## Enrutado en el cliente

En una SPA, cambiar de pantalla no implica pedir un HTML nuevo. ¿Cómo cambia entonces la URL de la barra de direcciones? Gracias a la **History API** del navegador: JavaScript puede llamar a `history.pushState()` para modificar la URL y añadir una entrada al historial **sin recargar la página**. Cuando el usuario pulsa *atrás*, el navegador emite un evento `popstate` y el router vuelve a pintar la pantalla correspondiente.

React Router (Parte VII) envuelve todo esto. Por eso en el código no verás enlaces `<a href>` para navegar dentro de la aplicación, sino el componente `Link`:

```tsx title="src/features/applications/pages/applications-list-page.tsx"
<Button asChild variant="brand">
  <Link to="/aplicaciones/nueva">
    <Plus /> Nueva aplicación
  </Link>
</Button>
```

`Link` genera un `<a>` normal (para que funcione el clic con el botón central, la accesibilidad, etc.), pero intercepta el clic, evita la recarga y navega mediante la History API.

::: atencion
**El servidor debe devolver `index.html` para cualquier ruta.** Si el usuario recarga la página estando en `/aplicaciones/42/editar`, el navegador pedirá esa ruta al servidor. En desarrollo Vite ya lo resuelve, pero en producción el servidor web (Nginx, un *bucket* estático, el propio Spring Boot) debe configurarse con una regla de *fallback*: «si no existe un fichero con ese nombre, devuelve `index.html`». Es el error número uno al desplegar una SPA: todo funciona hasta que alguien pulsa F5 y recibe un 404.
:::

## El bundle: del código fuente a lo que descarga el navegador

El navegador no entiende TypeScript ni JSX (la sintaxis tipo HTML que ves dentro de los componentes). Además, el proyecto tiene más de cien ficheros fuente y cientos de módulos en `node_modules`. Antes de llegar al navegador, el código pasa por un proceso de construcción (*build*):

1. **Transpilación.** TypeScript y JSX se convierten a JavaScript estándar. Los tipos desaparecen por completo.
2. **Resolución de módulos.** Se sigue cada `import` para saber qué ficheros forman parte de la aplicación.
3. **Empaquetado (*bundling*).** Se agrupan los módulos en unos pocos ficheros, los *chunks*, para no hacer cientos de peticiones.
4. **Eliminación de código muerto (*tree shaking*).** Lo que se importa de una librería pero no se usa no se incluye.
5. **Minificación.** Se eliminan espacios y se acortan nombres de variables.
6. **Huella en el nombre (*hashing*).** Cada fichero se llama, por ejemplo, `index-B7f3kQ2a.js`. Si el contenido cambia, cambia el nombre, de modo que el navegador puede guardar los ficheros en caché indefinidamente sin riesgo de servir versiones antiguas.

El resultado es la carpeta `dist/`: HTML, CSS, JavaScript e imágenes estáticos, que pueden servirse desde cualquier servidor web. No hay nada que ejecutar en el servidor.

### División del código (*code splitting*)

Si todo el código fuera en un único fichero, el usuario descargaría el módulo de demandas aunque solo vaya a consultar aplicaciones. Por eso las rutas usan **importaciones dinámicas**:

```ts title="src/features/applications/routes.ts"
{
  index: true,
  handle: { title: 'Consultar aplicaciones' },
  lazy: () =>
    import('./pages/applications-list-page').then((m) => ({ Component: m.ApplicationsListPage })),
},
```

La función `import('…')` —con paréntesis— no se resuelve al construir, sino **en tiempo de ejecución**, y devuelve una promesa. El empaquetador lo detecta y genera un *chunk* separado para esa página, que solo se descarga cuando el router ejecuta `lazy()`. El resultado: un *bundle* inicial pequeño y páginas que llegan bajo demanda.

::: java
Es la misma idea que la carga perezosa de clases de la JVM o una relación `FetchType.LAZY` de JPA: no pagas el coste de algo hasta que lo necesitas. Y tiene el mismo matiz: la primera vez que se accede hay una pequeña espera, que aquí cubrimos con el indicador de carga (`hydrateFallbackElement` en `router.tsx`).
:::

## Decisión: SPA con Vite frente a un framework con renderizado en servidor

::: decision SPA pura construida con Vite
**Contexto.** En el ecosistema React existen *meta-frameworks* como Next.js o el modo framework de React Router, que renderizan las páginas en el servidor (SSR) o en tiempo de construcción y luego las «hidratan» en el navegador.

**Decisión.** Construir una SPA pura, servida como ficheros estáticos, con Vite como herramienta de construcción.

**Motivos.**

- El backend ya existe y es independiente (Spring Boot). Un framework con SSR añadiría un **segundo servidor** (Node.js) que mantener, desplegar y monitorizar.
- Es una aplicación interna y autenticada: el SEO y el tiempo de la primera visita no son críticos.
- Separación limpia: el frontend es un conjunto de ficheros estáticos; el backend, una API. Cada uno se despliega a su ritmo.
- Menos conceptos nuevos de golpe para quien aprende: sin componentes de servidor, sin hidratación, sin acciones de servidor.

**Alternativas descartadas.** Next.js (potente, pero orientado a SSR y a su propia plataforma de despliegue); React Router en modo framework (misma objeción del servidor Node); Angular (framework completo y muy válido en entornos empresariales, pero el proyecto apostó por el ecosistema React por su tamaño y su flexibilidad).
:::

## Errores típicos y depuración

Las **herramientas de desarrollo del navegador** (*DevTools*, tecla F12) son tu depurador, tu visor de logs y tu analizador de red. Familiarízate desde ya con cinco pestañas:

| Pestaña | Para qué la usarás |
|---|---|
| **Elements** | Ver el DOM real que ha generado React y los estilos aplicados a cada elemento. |
| **Console** | Errores de JavaScript, avisos de React y tus `console.log`. |
| **Network** | Cada petición HTTP: URL, método, código de estado, cabeceras, cuerpo y tiempos. Filtra por *Fetch/XHR* para ver solo las llamadas a la API. |
| **Sources** | Depurador con puntos de ruptura sobre tu código TypeScript original (gracias a los *source maps*). |
| **Application** | Almacenamiento local, cookies y caché del navegador. |

Algunos síntomas frecuentes y dónde mirar:

- **Página en blanco.** Casi siempre es un error de JavaScript durante el arranque. Abre *Console*: verás el error y el fichero y la línea de origen.
- **«No se han podido cargar los datos» con un error HTTP 500 o 502.** Si la petición a `/api/...` devuelve un 5xx y la terminal de Vite muestra `http proxy error`, el proxy no llega al backend: comprueba que está arrancado y en el puerto configurado. Si en cambio el mensaje es «No se puede conectar con el servidor», ha fallado la propia conexión de red (por ejemplo, porque el servidor de Vite se ha detenido).
- **404 al recargar en producción.** Falta la regla de *fallback* a `index.html` en el servidor web (sección 1.4).
- **Los cambios no aparecen.** En desarrollo, Vite recarga automáticamente; si no lo hace, mira la terminal donde corre `npm run dev`: probablemente hay un error de compilación.

::: nota
Instala también la extensión **React Developer Tools** para Chrome, Edge o Firefox. Añade dos pestañas: *Components*, donde ves el árbol de componentes de React con sus *props* y su estado, y *Profiler*, que mide cuánto tarda cada renderizado. La usaremos a partir del capítulo 6.
:::

## Ejercicios

::: ejercicio Observa el arranque en la pestaña Network
Arranca el backend y el frontend (`npm run dev`). Abre las DevTools, pestaña *Network*, marca *Disable cache* y recarga `http://localhost:5173/aplicaciones`. Identifica:

1. La petición del documento HTML.
2. La petición de `main.tsx` y algunas de las que la siguen.
3. La petición a `/api/applications`: su URL completa con parámetros, el código de estado y el JSON de respuesta.

Navega después a *Demandas*. ¿Se vuelve a pedir `index.html`? ¿Qué peticiones nuevas aparecen?
:::

::: ejercicio Provoca y diagnostica errores
1. Detén el backend y recarga el listado. ¿Qué ve el usuario? ¿Qué aparece en *Network*?
2. Con el backend arrancado, visita `http://localhost:5173/esto-no-existe`. ¿Quién genera la página de error: el servidor o React? Razónalo con lo que ves en *Network*.
:::

::: ejercicio Mide el efecto de la división del código
Ejecuta `npm run build` y examina la carpeta `dist/assets`. Localiza los ficheros JavaScript que corresponden a las páginas del módulo de aplicaciones (los nombres contienen el nombre del módulo de origen). Después ejecuta `npm run preview`, abre la aplicación en `/demandas` con *Network* abierto y comprueba que el *chunk* de la página de listado de aplicaciones **no** se descarga hasta que navegas allí.
:::

## Autoevaluación

::: preguntas
1. En una SPA, ¿qué devuelve el servidor la primera vez y qué devuelve después?
2. ¿Por qué una validación hecha en el frontend no sustituye a la del backend?
3. ¿Qué es el DOM y qué relación tiene con lo que se ve en pantalla?
4. Si JavaScript tiene un solo hilo, ¿cómo puede esperar una respuesta HTTP sin congelar la interfaz?
5. ¿Qué hace `createRoot(...).render(...)` en `main.tsx`?
6. ¿Por qué hay que configurar un *fallback* a `index.html` en el servidor de producción?
7. ¿Qué diferencia hay entre `import x from './a'` e `import('./a')`?
8. ¿Para qué sirve incluir una huella (*hash*) en el nombre de los ficheros del *build*?
:::
