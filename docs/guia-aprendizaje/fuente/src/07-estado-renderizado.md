# Estado, renderizado y reconciliación

<p class="lead">Los componentes del capítulo anterior solo transformaban props en interfaz. Una aplicación real tiene datos que cambian: un menú que se abre, un campo que se escribe, una página de resultados. Este capítulo explica cómo guarda React ese estado, qué ocurre exactamente cuando cambia y cómo decide qué tocar en el DOM. Es el capítulo más importante para dejar de «programar a ver si funciona».</p>

## Props frente a estado

Un componente trabaja con dos tipos de datos:

| | Props | Estado |
|---|---|---|
| ¿Quién lo define? | El componente padre | El propio componente |
| ¿Puede cambiarlo el componente? | No | Sí, con su función de actualización |
| ¿Sobrevive entre renderizados? | Llega de nuevo en cada uno | Sí: React lo guarda |
| Ejemplo | `title` de `PageHeader` | Si el menú móvil está abierto |

El **estado** es la memoria de un componente: datos que deben recordarse entre un renderizado y el siguiente y cuyo cambio debe reflejarse en pantalla.

## `useState`: la memoria de un componente

La cabecera de la aplicación necesita recordar si el menú lateral del móvil está abierto:

```tsx title="src/components/layout/app-header.tsx"
export function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="…">
      <Button variant="ghost" size="icon" className="lg:hidden"
              onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
        <Menu />
      </Button>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="…">
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      {/* … */}
    </header>
  )
}
```

`useState(false)` devuelve un par que se desestructura:

- **`mobileOpen`**: el valor actual. La primera vez es el valor inicial, `false`.
- **`setMobileOpen`**: la función para cambiarlo. Al llamarla, React guarda el nuevo valor y **vuelve a ejecutar el componente** para obtener la nueva interfaz.

El flujo completo al pulsar el botón de menú es: `onClick` → `setMobileOpen(true)` → React programa un nuevo renderizado de `AppHeader` → la función se ejecuta otra vez y ahora `mobileOpen` vale `true` → el `Sheet` recibe `open={true}` → React aplica al DOM los cambios necesarios para mostrar el panel. Al elegir una opción del menú, `SidebarNav` llama a `onNavigate`, que cierra el panel.

El valor inicial puede ser de cualquier tipo, y TypeScript lo infiere. Cuando no basta con inferirlo, se indica entre `< >`:

```tsx title="src/features/applications/pages/application-edit-selector-page.tsx"
const [value, setValue] = useState('')                                   // string
const [searchedId, setSearchedId] = useState<number | undefined>()      // number | undefined
const [invalid, setInvalid] = useState(false)                           // boolean
```

::: java
No hay nada parecido a un campo de instancia, porque un componente es una función y sus variables locales desaparecen al terminar. `useState` le pide a React que **guarde el valor fuera de la función**, asociado a esa instancia concreta del componente en el árbol, y que se lo devuelva en cada ejecución. Es como si React mantuviera un `Map<posiciónEnElÁrbol, Object[]>` con el estado de cada componente.
:::

## Qué provoca un renderizado

**Renderizar** significa, en React, **llamar a la función del componente** para obtener su descripción de la interfaz. No implica necesariamente tocar el DOM. Un componente se vuelve a renderizar cuando:

1. **Cambia su estado** (se llama a su función `set…` con un valor distinto).
2. **Se renderiza su padre**: por defecto, renderizar un componente renderiza también todos sus descendientes.
3. **Cambia un contexto que consume** (capítulo 9).

Que cambien las props no es una causa independiente: las props solo cambian porque el padre se ha renderizado.

### El estado es una instantánea

Dentro de un renderizado, el estado **no cambia**, aunque llames a `set…`. La función de actualización no modifica la variable: programa un renderizado **nuevo** en el que la variable tendrá el valor nuevo.

```tsx
const [count, setCount] = useState(0)

function handleClick() {
  setCount(count + 1)
  console.log(count)        // sigue imprimiendo 0: es el valor de ESTE renderizado
  setCount(count + 1)       // vuelve a poner 0 + 1: el resultado final es 1, no 2
}
```

Cada renderizado es una fotografía con sus propios valores de props y de estado, y las funciones creadas en ese renderizado (como `handleClick`) «ven» los valores de esa fotografía.

### Actualizaciones funcionales

Cuando el nuevo valor depende del anterior, pasa a `set…` **una función** que recibe el valor previo y devuelve el nuevo. React las encola y las aplica en orden, cada una sobre el resultado de la anterior:

```tsx title="src/features/applications/pages/application-edit-selector-page.tsx"
const [params, setParams] = useState<ApplicationListParams>({ ...DEFAULT_LIST_PARAMS, size: 5 })

onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
onSizeChange={(size) => setParams((prev) => ({ ...prev, size, page: 0 }))}
```

El selector del catálogo en *Modificar aplicación* usa esta forma en todas sus actualizaciones: así, aunque se produjeran dos cambios seguidos antes de renderizar, ninguno se perdería.

### Agrupación de actualizaciones

React **agrupa** (*batching*) todas las actualizaciones de estado que ocurren en un mismo evento y renderiza una sola vez al final. En `FindById`, el envío del formulario llama a `setInvalid` y a `setSearchedId`, pero el componente se renderiza una única vez, con ambos valores nuevos.

## Del renderizado al DOM: la reconciliación

Si cada cambio de estado vuelve a ejecutar el componente y todos sus hijos, ¿no es carísimo? No, porque **renderizar no es pintar**. El trabajo se divide en dos fases:

<figure>
<svg viewBox="0 0 680 230" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10.5">
  <defs><marker id="a7" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="10" y="20" width="130" height="60" rx="8" fill="#fff7ed" stroke="#fdba74"/>
  <text x="75" y="44" text-anchor="middle" font-weight="700">1 · Disparador</text>
  <text x="75" y="61" text-anchor="middle" font-size="9" fill="#9a3412">setParams(…)</text>
  <line x1="140" y1="50" x2="173" y2="50" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a7)"/>
  <rect x="175" y="10" width="270" height="140" rx="8" fill="#ecfeff" stroke="#0891b2"/>
  <text x="310" y="32" text-anchor="middle" font-weight="700">2 · Fase de renderizado</text>
  <text x="310" y="48" text-anchor="middle" font-size="9" fill="#0e7490">pura · sin tocar el DOM · puede repetirse</text>
  <text x="190" y="72" font-size="9.5">• Se ejecutan las funciones de los componentes</text>
  <text x="190" y="90" font-size="9.5">• Se obtiene un nuevo árbol de elementos</text>
  <text x="190" y="108" font-size="9.5">• Se compara con el árbol anterior</text>
  <text x="200" y="122" font-size="9.5">(reconciliación)</text>
  <text x="190" y="140" font-size="9.5">• Resultado: lista mínima de cambios</text>
  <line x1="445" y1="80" x2="478" y2="80" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a7)"/>
  <rect x="480" y="10" width="190" height="140" rx="8" fill="#0b1220"/>
  <text x="575" y="32" text-anchor="middle" font-weight="700" fill="#fff">3 · Fase de commit</text>
  <text x="575" y="48" text-anchor="middle" font-size="9" fill="#a5f3fc">aplica los cambios</text>
  <text x="494" y="72" font-size="9.5" fill="#e2e8f0">• Crea, mueve o borra nodos</text>
  <text x="494" y="90" font-size="9.5" fill="#e2e8f0">• Cambia solo los atributos</text>
  <text x="504" y="104" font-size="9.5" fill="#e2e8f0">y textos que difieren</text>
  <text x="494" y="122" font-size="9.5" fill="#e2e8f0">• Después: ejecuta</text>
  <text x="504" y="136" font-size="9.5" fill="#e2e8f0">los efectos (cap. 8)</text>
  <rect x="175" y="170" width="495" height="46" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="422" y="190" text-anchor="middle" font-size="9.5">Ejemplo: al pasar de la página 1 a la 2 del listado, React no recrea la tabla.</text>
  <text x="422" y="206" text-anchor="middle" font-size="9.5">Reutiliza filas por su key, cambia los textos de las celdas y el «Mostrando 11–20».</text>
</svg>
<figcaption><b>Figura 7.1.</b> Las fases de una actualización. Ejecutar componentes es barato; tocar el DOM es lo caro, y React lo minimiza.</figcaption>
</figure>

1. **Renderizado.** React llama a los componentes afectados y obtiene un nuevo árbol de elementos (los objetos ligeros que devuelve JSX). Lo **compara** con el árbol del renderizado anterior. A esta comparación se le llama **reconciliación**, y a la representación en memoria, a veces, *DOM virtual*.
2. **Commit.** React aplica al DOM real **solo las diferencias**: si en la tabla solo han cambiado los textos de algunas celdas, solo se modifican esos textos.

### Cómo compara React dos árboles

Comparar dos árboles arbitrarios es un problema costoso, así que React usa dos reglas sencillas:

- **Mismo tipo en la misma posición → se actualiza.** Si antes había un `<ApplicationsTable>` y ahora también, React conserva la instancia (y su estado) y le pasa las props nuevas.
- **Tipo distinto → se destruye y se crea de nuevo.** Si en una posición había un `<TableSkeleton>` y ahora hay una `<ApplicationsTable>`, el esqueleto se elimina con todo su subárbol y su estado, y la tabla se crea desde cero.

Y en las listas, la `key` indica qué elemento corresponde a cuál (capítulo 6).

::: java
La analogía más cercana es Hibernate y su comprobación de cambios (*dirty checking*): tú modificas el modelo de objetos libremente y, al hacer *flush*, Hibernate compara con la instantánea y emite **solo** las sentencias `UPDATE` necesarias. React hace lo mismo con el DOM: tú describes el estado deseado, y en el *commit* emite solo las operaciones necesarias.
:::

### Por qué los componentes deben ser puros

Como React puede llamar a un componente muchas veces —y, en modo estricto, lo llama **dos veces** a propósito en desarrollo (capítulo 8)—, el cuerpo de un componente debe ser **puro**: a partir de sus props y su estado calcula y devuelve JSX, sin efectos secundarios. Nada de peticiones HTTP, ni de modificar variables externas, ni de tocar el DOM directamente durante el renderizado. Esas cosas van en manejadores de eventos o, si deben sincronizarse con el renderizado, en efectos (capítulo 8).

## Inmutabilidad: por qué no se modifica el estado

Para decidir si un cambio de estado requiere renderizar, React compara el valor anterior y el nuevo con `Object.is`, que para objetos es **igualdad de referencia**. Si modificas un objeto y lo vuelves a pasar, la referencia es la misma y React concluye que nada ha cambiado:

```tsx
// Incorrecto: muta el objeto existente. Misma referencia → React no renderiza
params.page = 2
setParams(params)

// Correcto: crea un objeto nuevo
setParams({ ...params, page: 2 })
setParams((prev) => ({ ...prev, page: 2 }))
```

Lo mismo con arrays: en lugar de `push`, `splice` o `sort` sobre el array del estado, se crea uno nuevo con `[...lista, nuevo]`, `lista.filter(…)`, `lista.map(…)` o `[...lista].sort(…)`.

Esta regla no es un capricho de React: tratar los datos como inmutables hace que la comparación sea instantánea (basta con comparar referencias), permite conservar el valor anterior para comparaciones y evita una clase entera de errores en los que un cambio en un sitio aparece por sorpresa en otro.

::: java
Piensa en el estado como si fueran `record`s de Java: nunca se modifican, se sustituyen por una copia con cambios. Si vienes de JPA, donde lo natural es modificar la entidad gestionada y dejar que el ORM detecte el cambio, este es el ajuste mental más importante de la Parte III.
:::

## Dónde vive cada estado

No todo el estado es igual, y una de las decisiones de arquitectura más importantes de una aplicación React es **dónde guardar cada dato**. El proyecto distingue cinco lugares:

| Tipo de estado | Dónde vive en el proyecto | Ejemplos |
|---|---|---|
| Estado local de interfaz | `useState` en el componente | Menú móvil abierto, grupo del menú desplegado, texto del buscador por ID |
| Estado de navegación | **La URL** (React Router) | Filtros, página, tamaño y orden del listado; el `id` de la aplicación que se edita |
| Estado del servidor | **Caché de TanStack Query** | Páginas de aplicaciones, detalle de una demanda |
| Estado de formulario | **React Hook Form** | Valores, errores y si el formulario tiene cambios sin guardar |
| Estado global de interfaz | Contexto o librerías específicas | Notificaciones (`sonner`), tooltips |

::: decision El estado del servidor no se copia en `useState`
Un error muy común es pedir los datos con `fetch` en un efecto y guardarlos en un `useState`. Eso obliga a gestionar a mano la carga, los errores, la cancelación, la caché y la actualización tras modificar. En el proyecto, los datos del servidor **nunca** se copian a estado local: se leen siempre de TanStack Query, que es su única fuente de verdad (Parte VI). La consecuencia práctica es que la mayoría de las páginas apenas tienen `useState`.
:::

### Estado en la URL frente a estado local: un ejemplo real

El proyecto tiene **dos listados de aplicaciones** con filtros y paginación, y guardan su estado en sitios distintos a propósito:

- **`ApplicationsListPage`** (`/aplicaciones`) guarda filtros, página y orden **en la URL**. Así el usuario puede recargar, compartir el enlace o usar atrás y adelante. Cuando cambia un filtro, la página no llama a `useState`: llama a `setSearchParams`, la URL cambia, el router vuelve a renderizar la página, y los parámetros se recalculan a partir de la URL.
- **`PickFromCatalog`**, dentro de *Modificar aplicación*, guarda los mismos parámetros en **`useState`**. Es un selector auxiliar dentro de otra pantalla: que sus filtros aparezcan en la URL o en el historial no aportaría nada.

Es un buen ejemplo de que la pregunta no es «¿cómo guardo esto?», sino «¿quién necesita este dato y durante cuánto tiempo?».

### Estado mínimo y valores derivados

Guarda en el estado **lo mínimo**, y **calcula** todo lo demás durante el renderizado. Si un valor se puede obtener a partir de props, de otro estado o de los datos de una consulta, no es estado:

```tsx title="src/features/applications/pages/applications-list-page.tsx"
const hasFilters = !!params.status || !!params.criticality
```

```tsx title="src/features/applications/pages/application-edit-page.tsx"
const { isDirty } = form.formState
// Al empezar a editar de nuevo, se oculta la confirmación anterior.
const showUpdated = !isDirty
```

`showUpdated` podría haberse guardado con `useState` y actualizado al editar. Calcularlo elimina la posibilidad de que se desincronice: siempre es coherente con `isDirty`.

## Identidad del estado y la prop `key`

El estado de un componente está ligado a su **posición en el árbol**, no a la variable ni a los datos. Mientras React vea un componente del mismo tipo en la misma posición, conserva su estado aunque las props cambien por completo.

Normalmente es lo que quieres, pero hay una excepción importante en el proyecto. La página de edición de una aplicación contiene un formulario cuyos valores iniciales salen de los datos cargados:

```tsx title="src/features/applications/pages/application-edit-page.tsx"
// key: se reinicia el formulario si se cambia de aplicación.
<ApplicationEditForm key={query.data.id} application={query.data} />
```

Supón que el usuario pasa de editar la aplicación 3 a editar la 7 navegando dentro de la aplicación, sin salir de la ruta `:id/editar`, y que los datos de la 7 ya están en la caché porque los consultó hace un momento. La consulta no pasa por el estado de carga, así que en ningún momento desaparece el formulario: React ve el mismo `ApplicationEditForm` en la misma posición, le pasa la nueva `application` como prop y **conserva su estado**. Y los valores de un formulario de React Hook Form forman parte de ese estado, inicializados con `defaultValues` solo al crearse: ¡el formulario seguiría mostrando los datos de la 3! Al darle `key={query.data.id}`, cuando la clave cambia React considera que es **otro componente**: destruye el anterior y crea uno nuevo con su estado inicial.

Usar `key` para **reiniciar** un componente es una técnica estándar y mucho más fiable que intentar sincronizar el estado con un efecto.

## Componentes controlados

Un campo de formulario puede funcionar de dos formas:

- **Controlado**: su valor lo decide React. Recibe `value` y, en cada pulsación, `onChange` actualiza el estado, que vuelve a fijar el `value`. La fuente de verdad es el estado.
- **No controlado**: el valor lo guarda el propio elemento del DOM, y se lee cuando hace falta (por ejemplo, al enviar).

El buscador por identificador es un campo controlado clásico:

```tsx title="src/features/applications/pages/application-edit-selector-page.tsx"
<Input value={value} onChange={(e) => setValue(e.target.value)} … />
<Button type="submit" variant="outline" disabled={!value.trim() || query.isFetching}>
```

Al estar en el estado, el valor puede usarse para otras cosas durante el renderizado, como desactivar el botón *Buscar* si el campo está vacío. React Hook Form, en cambio, trabaja principalmente con campos no controlados y referencias para evitar renderizar el formulario entero en cada pulsación (Parte VII).

## Rendimiento: cuándo preocuparse

Renderizar es barato: ejecutar unas funciones y comparar objetos cuesta microsegundos. En una aplicación de gestión como esta, **casi nunca** es un problema. Antes de optimizar, mide:

- En React DevTools, la pestaña *Profiler* graba una interacción y muestra qué componentes se renderizaron, cuántas veces y cuánto tardaron.
- En la configuración de *Components* puedes activar *Highlight updates when components render* para ver en pantalla, con un recuadro de color, qué se renderiza en cada interacción.

Las herramientas de optimización (`useMemo`, `useCallback`, `memo`) se ven en el capítulo 8, junto con su coste. El proyecto las usa de forma muy puntual y justificada.

::: nota
**React Compiler** es una herramienta oficial que analiza los componentes al construir y añade automáticamente la memorización necesaria, de modo que `useMemo` y `useCallback` se vuelven casi innecesarios. El proyecto no lo tiene activado, pero sus reglas ya se aplican a través del plugin de ESLint (capítulo 5): escribir código que las respete deja el proyecto preparado para activarlo.
:::

## Errores típicos y depuración

- **«He cambiado el estado y no se actualiza».** Probablemente has mutado un objeto o un array en lugar de crear uno nuevo (sección 7.5).
- **«Leo el estado justo después de cambiarlo y tiene el valor antiguo».** Es la instantánea: el nuevo valor estará en el siguiente renderizado (sección 7.3).
- **`Too many re-renders. React limits the number of renders to prevent an infinite loop`.** Llamas a una función `set…` directamente en el cuerpo del componente (o en `onClick={setX(…)}` sin función flecha): cada renderizado cambia el estado, lo que provoca otro renderizado.
- **El formulario muestra datos de otro registro.** Falta una `key` que reinicie el componente al cambiar de registro (sección 7.7).
- **Se pierde lo escrito al cambiar algo aparentemente irrelevante.** Un componente ha cambiado de tipo o de posición (por ejemplo, porque un ternario lo envuelve en un `div` distinto en cada rama) y React lo ha recreado.

En la pestaña *Components* de React DevTools puedes ver y **editar** el estado de cualquier componente (aparece en el panel derecho como *hooks* `State`), lo que permite probar cómo se ve un estado sin reproducirlo a mano.

## Ejercicios

::: ejercicio Observa la instantánea del estado
En `FindById` (`application-edit-selector-page.tsx`), añade temporalmente `console.log('antes', searchedId)` dentro de `onSubmit`, justo después de `setSearchedId(id)`, y `console.log('render', searchedId)` en el cuerpo del componente. Busca una aplicación y explica el orden y los valores que aparecen en consola. ¿Por qué el `render` aparece dos veces en desarrollo? (Lo explicaremos a fondo en el capítulo 8.)
:::

::: ejercicio Rompe la inmutabilidad
En `PickFromCatalog`, cambia `onPageChange` por una versión que mute el estado: `(page) => { params.page = page; setParams(params) }`. Prueba a cambiar de página. ¿Qué ocurre y por qué? Restaura el código original.
:::

::: ejercicio Quita la key del formulario
Para reproducir el problema de la sección 7.7 necesitas navegar entre dos ediciones sin salir de la ruta. Añade temporalmente, en las acciones de `PageHeader` de `application-edit-page.tsx`, un enlace `<Link to={`/aplicaciones/${id + 1}/editar`}>Siguiente</Link>`. Elimina también `key={query.data.id}` del formulario. Después:

1. Abre el detalle de la aplicación 2 para que quede en caché.
2. Ve a `/aplicaciones/1/editar`, cambia el nombre sin guardar y pulsa *Siguiente*.
3. Observa el título de la página y los valores del formulario.

Restaura la `key` y repite. ¿Qué ocurre si en el paso 1 no visitas antes la aplicación 2? Explícalo con lo que sabes de los cambios de tipo en una posición del árbol. Deshaz todos los cambios.
:::

::: ejercicio Elige dónde vive el estado
Para cada uno de estos datos futuros, decide dónde debería vivir (estado local, URL, caché del servidor, formulario o contexto) y justifícalo: (a) la pestaña seleccionada en el detalle de una demanda (*Datos*, *Historial*, *Comentarios*); (b) el texto de un buscador por nombre en el listado de aplicaciones; (c) si el menú lateral está contraído en escritorio, de forma que se recuerde al navegar; (d) la lista de equipos para un desplegable; (e) un campo «motivo de cancelación» que solo aparece al elegir el estado `CANCELLED`.
:::

## Autoevaluación

::: preguntas
1. ¿Qué diferencia hay entre props y estado?
2. ¿Qué significa renderizar en React? ¿Implica modificar el DOM?
3. Si llamas dos veces seguidas a `setCount(count + 1)` en el mismo evento, ¿cuánto vale `count` en el siguiente renderizado? ¿Cómo lo arreglarías?
4. Describe las dos fases de una actualización y qué ocurre en cada una.
5. ¿Qué hace React si en la misma posición del árbol aparece un componente de tipo distinto?
6. ¿Por qué mutar un objeto del estado no provoca un renderizado?
7. ¿Por qué el listado principal guarda los filtros en la URL y el selector del catálogo en `useState`?
8. ¿Qué es un valor derivado y por qué es preferible a guardarlo en el estado?
9. ¿Para qué sirve `key={query.data.id}` en la página de edición?
:::
