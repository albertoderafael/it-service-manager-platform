# Glosario

<p class="lead">Términos técnicos usados en la guía, en orden alfabético. Entre paréntesis, el capítulo donde se explican con más detalle.</p>

## A – D

| Término | Definición |
|---|---|
| ADR (*Architecture Decision Record*) | Documento breve que recoge una decisión de arquitectura, su contexto, alternativas y consecuencias (24). |
| `AbortSignal` | Señal que permite cancelar una petición `fetch` en curso; TanStack Query la crea por consulta (2, 17). |
| `ApiError` | Clase de error propia del proyecto que unifica cualquier fallo de la API con `kind`, `status`, mensaje y errores por campo (15). |
| `asChild` | Prop de los componentes de shadcn/ui que presta su comportamiento y estilos al único hijo, mediante `Slot` de Radix (9, 11). |
| `async`/`await` | Sintaxis para escribir código asíncrono con promesas como si fuera secuencial, sin bloquear el hilo (2). |
| Bucle de eventos (*event loop*) | Mecanismo por el que el hilo único de JavaScript atiende, una tras otra, las tareas pendientes (1). |
| *Build* | Proceso que transforma el código fuente en los ficheros optimizados de `dist/` (1, 4). |
| *Bundle* | Fichero JavaScript resultante de empaquetar muchos módulos; también, el conjunto de ficheros del *build* (1). |
| Caché de consultas | Almacén de TanStack Query que guarda las respuestas de la API por clave (17). |
| *Callback* | Función que se pasa a otra para que la llame cuando ocurra algo, como `onPageChange` (2, 6). |
| *Children* | Prop especial con el contenido escrito entre las etiquetas de un componente (6). |
| *Chunk* | Fragmento del *bundle* que se descarga por separado, por ejemplo, una página con carga diferida (1, 18). |
| Clave de consulta (*query key*) | Array que identifica una entrada de la caché de TanStack Query y permite invalidarla por prefijo (17). |
| `cn()` | Utilidad del proyecto que combina clases con `clsx` y resuelve conflictos de Tailwind con `tailwind-merge` (10). |
| *Code splitting* | División del código en *chunks* que se cargan bajo demanda (1). |
| *Commit* (de React) | Fase en la que React aplica al DOM los cambios calculados en el renderizado (7). |
| CommonJS | Sistema de módulos antiguo de Node (`require`, `module.exports`) (3). |
| Componente | Función que recibe props y devuelve una descripción de la interfaz en JSX (6). |
| Componente controlado | Campo cuyo valor lo decide el estado de React mediante `value` y `onChange` (7). |
| Componentes compuestos | Familia de componentes pensados para usarse juntos, como `Card`, `CardHeader`, `CardContent` (9). |
| Concurrencia optimista | Técnica que detecta modificaciones simultáneas comparando una versión del recurso (22, 25). |
| Contexto (*context*) | Mecanismo de React para que un proveedor ofrezca un valor a todo un subárbol (9). |
| CORS | Mecanismo por el que un servidor autoriza a páginas de otro origen a leer sus respuestas (16). |
| `cva` | Librería *class-variance-authority*, que define variantes de clases para un componente (11). |
| *Debounce* | Retrasar una acción hasta que deja de repetirse durante un tiempo, por ejemplo al escribir en un buscador (19). |
| Desestructuración | Sintaxis que extrae propiedades o posiciones en variables: `const { id } = params` (2). |
| DOM | Árbol de objetos en memoria que representa la página; lo que se ve es su reflejo (1). |
| DTO | Objeto de transferencia de datos entre backend y frontend; en el frontend se describe con tipos de TypeScript (2, 14). |

## E – L

| Término | Definición |
|---|---|
| Efecto (`useEffect`) | Código que sincroniza el componente con un sistema externo tras el renderizado (8). |
| `errorElement` | Componente que React Router pinta si una ruta falla al renderizarse (9, 18). |
| ESLint | Herramienta de análisis estático que detecta patrones problemáticos en el código (5). |
| ESM (módulos ES) | Sistema de módulos estándar de JavaScript: `import` y `export` (2, 3). |
| Estado (*state*) | Datos que un componente recuerda entre renderizados y cuyo cambio provoca un nuevo renderizado (7). |
| Estado del servidor | Copia en el navegador de datos que pertenecen al backend; la gestiona TanStack Query (17). |
| *Fallback* a `index.html` | Regla del servidor web que devuelve `index.html` para cualquier ruta, necesaria en una SPA (1, 16). |
| Fast Refresh | Integración de React con la recarga en caliente que conserva el estado de los componentes al editar (4). |
| `fetch` | API estándar del navegador para hacer peticiones HTTP; solo rechaza la promesa ante errores de red (2, 15). |
| Fragmento | `<>…</>`: agrupa varios elementos sin añadir un nodo al DOM (6). |
| Función flecha | Sintaxis concisa de función: `(x) => x * 2` (2). |
| Función pura | Función cuyo resultado depende solo de sus argumentos y no tiene efectos secundarios (6, 13). |
| Genérico | Tipo parametrizado, como `apiRequest<T>` o `FilterSelect<V>` (2). |
| Guarda de tipo | Función que devuelve `valor is Tipo` y estrecha el tipo en TypeScript (2). |
| *Handle* | Objeto de metadatos de una ruta de React Router; el proyecto lo usa para los títulos (18). |
| *Headless* | Componente sin estilos que solo aporta comportamiento y accesibilidad, como los de Radix (11). |
| HMR | *Hot Module Replacement*: sustitución en caliente de un módulo modificado sin recargar la página (4). |
| *Hook* | Función de React cuyo nombre empieza por `use` y que da acceso a estado, efectos, contexto… (8). |
| Hook personalizado | Hook propio que encapsula lógica reutilizable con otros hooks (8). |
| Inferencia de tipos | Capacidad de TypeScript de deducir tipos sin anotarlos (2). |
| Inmutabilidad | Tratar los datos como no modificables y crear copias con los cambios (7). |
| Invalidación | Marcar entradas de la caché como obsoletas para que se vuelvan a pedir (17). |
| JSX | Sintaxis parecida a HTML dentro de JavaScript que se transforma en llamadas a funciones (6). |
| `key` | Prop que identifica un elemento entre renderizados; en listas, y también para reiniciar un componente (6, 7). |
| `lazy` | Opción de una ruta que carga su componente bajo demanda (18). |
| *Lockfile* | `package-lock.json`: versiones exactas de todas las dependencias instaladas (3). |

## M – R

| Término | Definición |
|---|---|
| *Matcher* | Comprobación de una prueba, como `toBe` o `toEqual` (23). |
| Memorización | Guardar un valor o función entre renderizados con `useMemo` o `useCallback` (8). |
| Modo estricto (TypeScript) | Conjunto de comprobaciones de `strict: true`, entre ellas la de nulos (5). |
| Módulo (del proyecto) | Carpeta de `features/` con todo lo de un dominio de negocio (13). |
| MSW | *Mock Service Worker*: librería que intercepta peticiones en pruebas (23). |
| Mutación | Escritura contra la API gestionada con `useMutation` (17). |
| Node.js | Entorno de ejecución de JavaScript fuera del navegador; en el proyecto, solo para herramientas (3). |
| npm | Gestor de paquetes de Node (3). |
| OKLCH | Espacio de color perceptualmente uniforme usado en los tokens (10). |
| Origen | Combinación de esquema, host y puerto; base de la política del mismo origen (16). |
| `Outlet` | Hueco donde una ruta padre pinta a su ruta hija activa (18). |
| Petición de verificación previa (*preflight*) | `OPTIONS` automático que el navegador envía antes de ciertas peticiones entre orígenes (16). |
| *Placeholder data* | Datos provisionales que muestra una consulta mientras carga una clave nueva (17). |
| Portal | Renderizado de un componente al final del `<body>` aunque pertenezca a otra parte del árbol (11). |
| Promesa | Objeto que representa un valor futuro; equivalente a `CompletableFuture` (2). |
| Propagación (*spread*) | Operador `...` que copia propiedades o elementos en un objeto o array nuevo (2). |
| Props | Datos que un componente recibe de su padre; son de solo lectura (6). |
| Proveedor (*provider*) | Componente que ofrece un valor de contexto a su subárbol (9). |
| Proxy de desarrollo | Función de Vite que reenvía `/api/*` al backend para evitar CORS (4, 16). |
| Proxy inverso | Servidor que recibe las peticiones y las reparte entre servicios (16). |
| Radix UI | Librería de componentes accesibles sin estilos (11). |
| React | Librería para construir interfaces a partir de componentes (6). |
| React Hook Form | Librería que gestiona el estado de los formularios (20). |
| React Router | Librería de navegación entre pantallas (18). |
| Reconciliación | Comparación entre el árbol de elementos anterior y el nuevo para calcular los cambios del DOM (7). |
| *Record* (TypeScript) | Tipo de objeto con claves de un tipo y valores de otro; con uniones, es exhaustivo (2). |
| Renderizar | En React, ejecutar los componentes para obtener la descripción de la interfaz (7). |
| *Render props* | Patrón en el que un componente recibe una función que devuelve JSX (9). |
| *Resolver* | Adaptador que conecta un esquema de validación con React Hook Form (`zodResolver`) (20). |
| Rolldown | Empaquetador escrito en Rust que usa Vite 8 (4). |
| Ruta índice | Ruta que se pinta cuando la URL coincide exactamente con la de su padre (18). |

## S – Z

| Término | Definición |
|---|---|
| Semver | Versionado semántico `MAYOR.MENOR.PARCHE` (3). |
| shadcn/ui | Catálogo de componentes que se copian al proyecto, construidos con Radix y Tailwind (11). |
| *Slot* | Componente de Radix que fusiona sus props en su hijo; base de `asChild` (9, 11). |
| *Source map* | Fichero que relaciona el código generado con el original para depurar (1). |
| SPA | *Single-Page Application*: aplicación que se carga una vez y construye la interfaz en el navegador (1). |
| *Stale-while-revalidate* | Estrategia de mostrar los datos en caché y refrescarlos en segundo plano (17). |
| `staleTime` | Tiempo durante el que TanStack Query considera frescos unos datos (17). |
| `StrictMode` | Modo de desarrollo de React que renderiza dos veces y remonta componentes para detectar errores (8). |
| Tailwind CSS | Motor de estilos basado en clases de utilidad (10). |
| TanStack Query | Librería de caché y sincronización del estado del servidor (17). |
| Testing Library | Librería para probar componentes como los usaría un usuario (23). |
| Tipado estructural | Compatibilidad de tipos por su forma, no por su nombre (2). |
| Tipo literal | Tipo que solo admite un valor concreto, como `'asc'` (2). |
| Tipo unión | Tipo que admite uno entre varios tipos o valores, que se escriben separados por una barra vertical; por ejemplo, `SortDirection` admite `'asc'` o `'desc'` (2). |
| Token de diseño | Variable con un valor del sistema visual (color, radio, fuente) (10). |
| *Tree shaking* | Eliminación del código importado que no se usa (1). |
| TypeScript | Superconjunto de JavaScript con tipos estáticos que se eliminan al compilar (2). |
| `unknown` | Tipo de lo que no se conoce; obliga a comprobarlo antes de usarlo (2). |
| `URLSearchParams` | API estándar para leer y construir cadenas de consulta (15, 19). |
| Valor derivado | Valor calculado durante el renderizado a partir de props, estado o datos (7). |
| Variante (Tailwind) | Prefijo que condiciona una clase: `hover:`, `sm:`, `data-[state=open]:` (10). |
| Vite | Herramienta de desarrollo y construcción del proyecto (4). |
| Vitest | Ejecutor de pruebas del ecosistema Vite (23). |
| Zod | Librería de esquemas para validar datos y derivar sus tipos (20). |
