# Componentes, JSX y props

<p class="lead">React se reduce a una idea: la interfaz es el resultado de una función. Este capítulo presenta las piezas con las que se construye todo lo demás —componentes, JSX y <em>props</em>— y los patrones de uso diario: renderizado condicional, listas con claves, eventos y composición. Todos los ejemplos son componentes reales del proyecto.</p>

## Qué es React

**React** es una librería para construir interfaces de usuario. Su modelo mental cabe en una línea:

<p style="text-align:center; font-size:12pt; margin: 4mm 0;"><b>interfaz = f(estado)</b></p>

Tú escribes funciones que, a partir de unos datos, **describen** cómo debe verse la pantalla. No le dices a React «añade una fila a la tabla» o «cambia el texto de este botón»: le das la descripción completa para los datos actuales y React se encarga de modificar el DOM para que coincida (capítulo 7).

Este enfoque se llama **declarativo**, en contraste con el **imperativo** del ejemplo del capítulo 1, en el que creábamos un botón con `document.createElement` y lo añadíamos a mano. En una interfaz con decenas de estados posibles (cargando, con error, vacía, con datos, guardando…), describir el resultado es mucho más fácil que programar cada transición.

React es una **librería**, no un *framework* completo: se ocupa de los componentes y de su renderizado. La navegación, la obtención de datos, los formularios o los estilos los aportan otras librerías que eliges tú. Es lo que explica el número de dependencias del capítulo 3.

::: java
Si has trabajado con JSF, la idea de un árbol de componentes que se renderiza te resultará familiar. La diferencia es que en JSF el árbol vive en el servidor y cada interacción viaja a él; en React el árbol vive en el navegador y se recalcula allí, sin ida y vuelta. Más cerca aún: una plantilla de Thymeleaf es también una función de un modelo a HTML; React hace lo mismo, pero se re-evalúa cada vez que los datos cambian.
:::

## Componentes: funciones que devuelven interfaz

Un **componente** es una función de JavaScript que devuelve una descripción de la interfaz. Su nombre empieza siempre por **mayúscula**. Este es uno de los más sencillos del proyecto:

```tsx title="src/components/common/page-header.tsx"
interface PageHeaderProps {
  title: string
  description?: ReactNode
  /** Migas de pan / contexto sobre el título. */
  eyebrow?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        {eyebrow && (
          <p className="text-xs font-medium tracking-wide text-brand-strong uppercase">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
```

Y se usa como si fuera una etiqueta HTML más:

```tsx title="src/features/applications/pages/applications-list-page.tsx"
<PageHeader
  eyebrow="Aplicaciones"
  title="Consultar aplicaciones"
  description="Catálogo de aplicaciones gestionadas, con su criticidad y estado."
  actions={<Button asChild variant="brand">…</Button>}
/>
```

Tres observaciones:

- El componente **no tiene estado ni efectos**: dados los mismos datos, devuelve siempre lo mismo. Es una función pura, y la mayoría de los componentes del proyecto lo son.
- Encapsula una decisión de diseño (cómo es la cabecera de cualquier pantalla) en un único lugar. Todas las páginas la usan, y cambiarla aquí las cambia todas.
- La mayúscula no es estética: en JSX, `<pageHeader>` en minúscula se interpretaría como una etiqueta HTML desconocida.

::: java
Un componente es lo más parecido a un método `render(Model model)` que devuelve un fragmento de vista, con los parámetros agrupados en un objeto. No hay clases que extender ni interfaces que implementar. En versiones antiguas de React existían componentes de clase (`class X extends React.Component`); hoy se consideran heredados y el proyecto no tiene ninguno.
:::

## JSX en detalle

La sintaxis parecida a HTML dentro del código es **JSX**. No es HTML ni una cadena de texto: es azúcar sintáctico que Vite transforma en llamadas a funciones.

```tsx
// Lo que escribes
<h1 className="text-2xl">{title}</h1>

// Lo que genera la transformación (simplificado)
jsx('h1', { className: 'text-2xl', children: title })
```

La llamada `jsx(...)` devuelve un **elemento de React**: un objeto ligero del tipo `{ type: 'h1', props: { className: 'text-2xl', children: 'Consultar aplicaciones' } }`. Un componente, por tanto, no toca el DOM: devuelve un árbol de objetos que describe lo que se quiere ver. Es React quien, después, compara y aplica.

### Las reglas de JSX

- **Expresiones entre llaves.** Cualquier expresión de JavaScript puede ir entre `{ }`: variables, llamadas, operaciones, plantillas de texto. Sentencias como `if` o `for`, no (sí sus equivalentes en forma de expresión: `? :`, `&&`, `map`).
- **Atributos con nombre de JavaScript.** `class` es una palabra reservada, así que se escribe `className`; `for` se escribe `htmlFor`. Los eventos van en *camelCase*: `onClick`, `onChange`, `onSubmit`.
- **El atributo `style` recibe un objeto**, no una cadena: `style={{ height: 4 + n * 2 }}` (en `LevelBadge`). Las dobles llaves son una expresión `{ }` que contiene un objeto literal `{ height: … }`. Los números se interpretan como píxeles.
- **Todas las etiquetas se cierran**, incluidas las vacías: `<Separator />`, `<input />`.
- **Un único elemento raíz.** Un componente devuelve un solo elemento. Si necesitas devolver varios hermanos sin envolverlos en un `div`, usa un **fragmento**: `<> … </>`. Las páginas del proyecto lo hacen constantemente, porque devuelven la cabecera y el contenido como hermanos.
- **Texto y caracteres especiales.** El texto se escribe tal cual. Para espacios entre expresiones se usa `{' '}`, como en `PaginationBar`. Las entidades HTML como `&amp;` funcionan en el texto.

::: atencion
**Seguridad por defecto.** Todo valor que insertas con `{ }` se **escapa**: si una aplicación se llama `<script>alert(1)</script>`, se mostrará ese texto literal, no se ejecutará. React te protege de la inyección de código (XSS) sin que tengas que hacer nada. La única forma de saltarse esta protección es la propiedad `dangerouslySetInnerHTML`, cuyo nombre ya avisa; el proyecto no la usa.
:::

## Props: los parámetros de un componente

Las **props** (propiedades) son los datos que un componente recibe de su padre. React las agrupa en un único objeto, que se desestructura en la firma.

### Tipar las props

El contrato de un componente se define con una `interface` que se suele llamar `NombreDelComponenteProps`:

```tsx title="src/features/applications/components/applications-table.tsx"
interface ApplicationsTableProps {
  applications: Application[]
  sortField: ApplicationSortField
  sortDirection: SortDirection
  onSortChange: (field: ApplicationSortField) => void
  /** "manage": acciones de detalle y modificación; "select": botón de selección. */
  mode?: 'manage' | 'select'
  onSelect?: (application: Application) => void
  /** Atenúa la tabla mientras se carga otra página. */
  isFetching?: boolean
}
```

Este tipo es documentación ejecutable: el editor autocompleta las props al usar el componente, el compilador rechaza las que faltan o sobran, y los comentarios `/** … */` aparecen al pasar el ratón.

### Valores por defecto

Se declaran en la desestructuración:

```tsx title="src/features/applications/components/applications-table.tsx"
export function ApplicationsTable({
  applications,
  sortField,
  sortDirection,
  onSortChange,
  mode = 'manage',
  onSelect,
  isFetching,
}: ApplicationsTableProps) {
```

### Las props son de solo lectura

Un componente **nunca modifica sus props**. Si la tabla necesita cambiar el orden, no toca `sortField`: llama a `onSortChange(field)` para **avisar al padre**, que es el dueño de ese dato, y el padre decide. Este flujo es el corazón de React:

<figure>
<svg viewBox="0 0 680 170" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10.5">
  <defs><marker id="a6" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker>
  <marker id="a6o" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#c2410c"/></marker></defs>
  <rect x="200" y="10" width="280" height="50" rx="8" fill="#ecfeff" stroke="#0891b2"/>
  <text x="340" y="31" text-anchor="middle" font-weight="700">ApplicationsListPage</text>
  <text x="340" y="48" text-anchor="middle" font-size="9" fill="#0e7490">dueña del dato: params.sortField (en la URL)</text>
  <rect x="200" y="110" width="280" height="50" rx="8" fill="#f8fafc" stroke="#94a3b8"/>
  <text x="340" y="131" text-anchor="middle" font-weight="700">ApplicationsTable</text>
  <text x="340" y="148" text-anchor="middle" font-size="9" fill="#475569">solo lee sortField; avisa con onSortChange</text>
  <line x1="290" y1="60" x2="290" y2="108" stroke="#0891b2" stroke-width="1.6" marker-end="url(#a6)"/>
  <text x="282" y="88" text-anchor="end" font-size="9.5" fill="#0e7490">props hacia abajo:</text>
  <text x="282" y="100" text-anchor="end" font-size="9" fill="#0e7490">sortField, onSortChange</text>
  <line x1="390" y1="110" x2="390" y2="62" stroke="#c2410c" stroke-width="1.6" marker-end="url(#a6o)"/>
  <text x="398" y="88" font-size="9.5" fill="#c2410c">eventos hacia arriba:</text>
  <text x="398" y="100" font-size="9" fill="#c2410c">onSortChange('name')</text>
</svg>
<figcaption><b>Figura 6.1.</b> Flujo de datos unidireccional: los datos bajan por props y los cambios suben como llamadas a funciones.</figcaption>
</figure>

Este **flujo de datos unidireccional** hace que siempre sepas quién es el dueño de un dato: el componente que lo guarda. Cuando algo se ve mal, sigues los datos hacia arriba hasta su origen.

### `children` y las props como «huecos»

Lo que pones **entre** la etiqueta de apertura y la de cierre de un componente llega en una prop especial llamada `children`:

```tsx title="src/features/applications/components/applications-table.tsx"
<RowAction to={`/aplicaciones/${app.id}`} label={`Ver detalle de ${app.name}`}>
  <Eye />
</RowAction>
```

`RowAction` recibe `<Eye />` (el icono) como `children` y decide dónde colocarlo. Y cualquier prop puede recibir JSX, no solo `children`: `PageHeader` tiene `actions` y `description` de tipo `ReactNode`, y cada página decide qué poner en esos huecos. El tipo `ReactNode` admite cualquier cosa que React sepa pintar: elementos, textos, números, arrays, `null`, `undefined` o `false` (estos tres últimos no pintan nada).

::: java
Las props de tipo `ReactNode` son como el patrón *template method* o los fragmentos parametrizados de Thymeleaf (`th:fragment` con parámetros): el componente define la estructura y deja huecos que rellena quien lo usa.
:::

### Propagar props

Cuando se pasan las mismas props a varios hijos, se pueden agrupar y propagar con `{...objeto}`:

```tsx title="src/features/applications/components/applications-table.tsx"
const sortProps = { sortField, sortDirection, onSortChange }
// …
<SortableTableHead field="id" label="ID" className="w-20 pl-4" {...sortProps} />
<SortableTableHead field="name" label="Nombre" {...sortProps} />
```

## Renderizado condicional

Como en JSX no hay `if`, se usan sus equivalentes en forma de expresión. El proyecto usa tres patrones.

**1. `&&` para «mostrar o no mostrar»:**

```tsx
{eyebrow && <p className="…">{eyebrow}</p>}
```

Si `eyebrow` es falso, la expresión vale `undefined` (o el valor falso) y React no pinta nada; si es verdadero, vale el elemento.

**2. El operador ternario para «esto o aquello»:**

```tsx title="src/features/applications/components/applications-table.tsx"
{mode === 'select' ? (
  <Button size="sm" variant="outline" onClick={() => onSelect?.(app)}>Seleccionar</Button>
) : (
  <div className="flex justify-end gap-1">…</div>
)}
```

**3. Retorno anticipado**, cuando todo el componente depende de una condición:

```tsx title="src/features/applications/pages/application-edit-page.tsx"
if (id === undefined) return (
  <ResourceNotFound message={`No existe ninguna aplicación con el identificador «${rawId}»`} … />
)
```

Para más de dos casos, el listado de aplicaciones encadena ternarios que cubren **todos los estados posibles** de una consulta. Es un patrón que repetiremos en todo el proyecto:

```tsx title="src/features/applications/pages/applications-list-page.tsx (estructura)"
{query.isPending ? (
  <TableSkeleton … />                       // 1. primera carga
) : query.isError && !data ? (
  <ErrorState error={query.error} … />      // 2. error y nada que mostrar
) : data && data.content.length === 0 ? (
  <EmptyState … />                          // 3. sin resultados
) : data ? (
  <> <ApplicationsTable … /> <PaginationBar … /> </>   // 4. datos
) : null}
```

::: decision Diseñar todos los estados de cada pantalla
Cada pantalla que carga datos contempla explícitamente **cargando, error, vacío y con datos**, y cada uno tiene su componente común (`TableSkeleton`, `ErrorState`, `EmptyState`). Una interfaz que solo contempla el caso feliz muestra pantallas en blanco o tablas vacías sin explicación en cuanto algo falla. El coste es pequeño porque los componentes de estado se reutilizan, y el usuario siempre sabe qué está pasando.
:::

::: atencion
Cuidado con `&&` y los números. `{items.length && <Lista />}` pinta un **0** en pantalla cuando la lista está vacía, porque `0` es falso, pero React sí pinta los números. Usa una comparación explícita: `{items.length > 0 && <Lista />}`.
:::

## Listas y claves

Para pintar una colección se transforma el array de datos en un array de elementos con `map`:

```tsx title="src/components/layout/sidebar-nav.tsx"
<ul className="space-y-1">
  {NAV_MODULES.map((module) => (
    <li key={module.id}>
      {module.comingSoon ? <ComingSoonItem module={module} /> : <ModuleGroup module={module} … />}
    </li>
  ))}
</ul>
```

Cada elemento de una lista necesita una prop **`key`** única entre sus hermanos. React la usa para saber qué elemento es cuál entre un renderizado y el siguiente: si la lista se reordena o se inserta un elemento al principio, React puede mover los nodos del DOM existentes en lugar de destruirlos y recrearlos, y conservar el estado de cada uno.

La clave debe ser un **identificador estable del dato**: `module.id`, `app.id`, `item.to`. Evita usar el índice del array (`key={index}`) en listas que pueden reordenarse, filtrarse o recibir inserciones: el índice describe la posición, no la identidad, y React acabaría asociando el estado de una fila a otra.

::: proyecto
En la tabla, cada fila usa `key={app.id}`: el identificador de la base de datos es la clave natural. En las opciones de los filtros, `key={option.value}`. En el menú, `key={item.to}`, porque la ruta identifica de forma única cada enlace. Fíjate también en el uso de la prop `key` fuera de las listas: `<ApplicationEditForm key={query.data.id} … />` en la página de edición. Lo explicaremos en el capítulo 7.
:::

## Eventos

Los elementos HTML emiten eventos (`onClick`, `onChange`, `onSubmit`…) y se les pasa una **función**, no una llamada:

```tsx
<Button onClick={() => setMobileOpen(true)}>…</Button>    // correcto: se pasa una función
<Button onClick={setMobileOpen(true)}>…</Button>          // incorrecto: se ejecuta al renderizar
```

La función recibe un objeto de evento. En el buscador por identificador de *Modificar aplicación* se usan los dos casos típicos:

```tsx title="src/features/applications/pages/application-edit-selector-page.tsx"
const onSubmit = (event: FormEvent) => {
  event.preventDefault()          // evita que el navegador envíe el formulario y recargue
  const id = parseEntityId(value.trim())
  setInvalid(id === undefined)
  setSearchedId(id)
}
// …
<form onSubmit={onSubmit} noValidate>
  <Input value={value} onChange={(e) => setValue(e.target.value)} … />
</form>
```

- `event.preventDefault()` cancela el comportamiento por defecto del navegador, que al enviar un formulario haría una petición y recargaría la página: lo último que quieres en una SPA.
- `e.target.value` es el texto actual del campo.

Los eventos que recibes son **eventos sintéticos** de React: envoltorios con la misma interfaz en todos los navegadores. Para el uso diario, se comportan como los nativos.

## Componentes como valores

Como los componentes son funciones, pueden guardarse en variables y en datos. El menú lo aprovecha para guardar el icono de cada módulo en su configuración:

```ts title="src/components/layout/navigation.ts"
{ id: 'applications', label: 'Aplicaciones', icon: AppWindow, basePath: '/aplicaciones', items: [ … ] }
```

```tsx title="src/components/layout/sidebar-nav.tsx"
const Icon = module.icon
// …
<Icon className={cn('size-4 shrink-0', isInModule ? 'text-cyan-300' : 'text-sidebar-muted')} />
```

La variable se llama `Icon`, con mayúscula, para que JSX la trate como componente. Lo mismo ocurre en `ErrorState`, que elige `WifiOff` o `AlertTriangle` según el tipo de error.

::: proyecto
Esto convierte el menú en **configuración declarativa**: `navigation.ts` es una lista de datos y `sidebar-nav.tsx` sabe pintar cualquier lista con esa forma. Añadir el módulo de Incidencias será añadir datos, no escribir más componentes (Parte IV).
:::

## Accesibilidad en JSX

Una interfaz profesional debe poder usarse con teclado y con lectores de pantalla. JSX admite todos los atributos de accesibilidad de HTML, y el proyecto los usa de forma sistemática:

| Atributo | Uso en el proyecto |
|---|---|
| `aria-label` | Nombre accesible de botones que solo tienen icono: `aria-label="Página siguiente"` en `PaginationBar`. |
| `role="status"`, `aria-live="polite"` | El indicador de carga anuncia su texto al lector de pantalla sin interrumpir. |
| `role="alert"` | Los mensajes de error se anuncian inmediatamente. |
| `aria-hidden="true"` | Oculta elementos decorativos (los puntos de color de los estados, las barras de nivel). |
| `aria-sort` | Las cabeceras ordenables indican el orden actual. |
| `aria-invalid` | Marca los campos con error. |
| `className="sr-only"` | Texto visible solo para lectores de pantalla (el título del menú móvil). |

La mayor parte del trabajo pesado de accesibilidad —foco, navegación con teclado en desplegables y diálogos— lo resuelven los componentes de Radix sobre los que se construye shadcn/ui (Parte IV).

## Cómo se organizan los componentes en el proyecto

::: decision Convenciones para escribir componentes
- **Solo componentes de función**, con `function` y exportación con nombre: `export function PageHeader(...)`. Aparecen con nombre propio en las trazas de error y en React DevTools.
- **Un componente público por fichero**, con nombre de fichero en *kebab-case* (`page-header.tsx`). Los subcomponentes que solo usa ese fichero se declaran en él sin exportar: `sidebar-nav.tsx` contiene `ModuleGroup` y `ComingSoonItem`; `application-edit-selector-page.tsx` contiene `FindById` y `PickFromCatalog`.
- **Las props se tipan con una `interface`** junto al componente. Para componentes muy pequeños y privados se acepta el tipo en línea: `function CreatedResult({ application, onCreateAnother }: { application: Application; onCreateAnother: () => void })`.
- **Componentes pequeños y con una responsabilidad**: una página orquesta (lee parámetros, pide datos, decide qué estado mostrar) y delega la presentación en componentes como la tabla, los filtros o la paginación, que no saben de dónde vienen los datos.
:::

::: java
La última regla es la separación de responsabilidades de siempre. Una página es como un controlador que reúne datos y elige vista; los componentes de presentación son las vistas, que reciben todo lo que necesitan y no acceden a servicios. Esto los hace reutilizables: `ApplicationsTable` sirve en el listado y en el selector de *Modificar aplicación* con solo cambiar `mode`.
:::

## Errores típicos y depuración

- **`Each child in a list should have a unique "key" prop`.** Falta `key` en el elemento que devuelve el `map`. Ojo: la clave va en el elemento **más externo** que devuelve el `map`, no en uno interior.
- **`Objects are not valid as a React child`.** Intentas pintar un objeto entero (`{application}`) en lugar de una propiedad (`{application.name}`).
- **El componente no aparece y no hay error.** Revisa que el nombre empiece por mayúscula y que lo estés devolviendo: una función flecha con llaves necesita `return`.
- **Un manejador se ejecuta al cargar la página.** Escribiste `onClick={hacerAlgo()}` en lugar de `onClick={() => hacerAlgo()}` o `onClick={hacerAlgo}`.
- **Aparece un `0` suelto en la pantalla.** Una condición con `&&` sobre un número (sección 6.5).

Con **React DevTools**, pestaña *Components*, puedes seleccionar cualquier componente del árbol y ver sus props actuales, su estado y qué componente lo ha renderizado (*rendered by*). El icono del ojo te lleva al elemento del DOM correspondiente, y el selector (la flecha) te permite hacer clic en la página para encontrar el componente que la pinta.

## Ejercicios

::: ejercicio Explora el árbol de componentes
Con React DevTools, abre el listado de aplicaciones y localiza en la pestaña *Components* la cadena `App → … → AppLayout → … → ApplicationsListPage → ApplicationsTable → SortableTableHead`. Selecciona `ApplicationsTable` y observa sus props. Cambia el orden de una columna en la página y comprueba qué props cambian.
:::

::: ejercicio Crea un componente reutilizable
Crea en `src/components/common/` un componente `CountBadge` que reciba `count: number` y `label: string` y pinte, por ejemplo, «12 aplicaciones». Si `count` es 0, debe mostrar «Sin aplicaciones»; si es 1, el singular. Añade una prop opcional `tone` que acepte solo `'neutral'` o `'brand'`, con `'neutral'` por defecto. Úsalo en la cabecera del listado de aplicaciones, en la prop `description` de `PageHeader`, con `data.totalElements`.
:::

::: ejercicio Lee un componente con criterio
Lee `src/components/common/pagination-bar.tsx` completo y responde: ¿qué props son datos y cuáles son eventos?, ¿por qué el componente no guarda la página actual en ningún sitio?, ¿qué ocurre con los botones cuando `disabled` es verdadero? y ¿por qué la página se muestra como `page + 1`?
:::

## Autoevaluación

::: preguntas
1. ¿Qué significa que React sea declarativo? Pon un ejemplo del proyecto.
2. ¿En qué se convierte el JSX al compilar y qué devuelve un componente?
3. ¿Por qué los nombres de los componentes empiezan por mayúscula?
4. ¿Qué hace un componente cuando necesita cambiar un dato que recibe por props?
5. ¿Qué es `children` y qué tipo tienen las props que reciben fragmentos de interfaz?
6. ¿Qué cuatro estados contempla el listado de aplicaciones y por qué?
7. ¿Para qué sirve `key` en una lista y por qué no conviene usar el índice?
8. ¿Qué diferencia hay entre `onClick={guardar}` y `onClick={guardar()}`?
9. ¿Por qué `{count && <Lista />}` puede pintar un 0?
:::
