# El layout y el sistema visual

<p class="lead">Con Tailwind y los componentes de shadcn/ui como materiales, este capítulo recorre cómo está construida la «carcasa» de la aplicación —menú lateral, cabecera, área de contenido y su versión móvil— y qué patrones visuales comparten todas las pantallas. Es el capítulo que explica por qué la aplicación se ve coherente aunque cada pantalla se haya escrito por separado.</p>

## La estructura de la pantalla

Todas las pantallas comparten el mismo armazón, definido una sola vez en `AppLayout`:

<figure>
<svg viewBox="0 0 680 270" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <rect x="10" y="10" width="400" height="250" rx="8" fill="#f8fafc" stroke="#94a3b8"/>
  <rect x="10" y="10" width="110" height="250" rx="8" fill="#0f1d33"/>
  <rect x="20" y="22" width="22" height="22" rx="5" fill="#155e75"/>
  <text x="48" y="36" fill="#fff" font-size="8.5" font-weight="700">IT Service Manager</text>
  <text x="20" y="66" fill="#94a3b8" font-size="7">MÓDULOS</text>
  <text x="20" y="84" fill="#fff" font-size="8.5">▸ Aplicaciones</text>
  <text x="32" y="98" fill="#a5f3fc" font-size="7.5">Consultar</text>
  <text x="32" y="110" fill="#cbd5e1" font-size="7.5">Nueva</text>
  <text x="32" y="122" fill="#cbd5e1" font-size="7.5">Modificar</text>
  <text x="20" y="140" fill="#cbd5e1" font-size="8.5">▸ Demandas</text>
  <text x="20" y="158" fill="#64748b" font-size="8.5">Incidencias · Pronto</text>
  <text x="20" y="174" fill="#64748b" font-size="8.5">Equipos · Pronto</text>
  <text x="20" y="246" fill="#64748b" font-size="7.5">● API REST · /api</text>
  <rect x="120" y="10" width="290" height="36" fill="#fff" stroke="#e2e8f0"/>
  <text x="132" y="32" font-weight="700" font-size="9">IT Service Manager</text>
  <rect x="140" y="60" width="250" height="34" fill="none" stroke="#0891b2" stroke-dasharray="3 2"/>
  <text x="148" y="74" font-size="7" fill="#0891b2">APLICACIONES</text>
  <text x="148" y="87" font-size="9" font-weight="700">Consultar aplicaciones</text>
  <rect x="352" y="68" width="34" height="16" rx="3" fill="#0e7490"/>
  <rect x="140" y="102" width="250" height="140" rx="6" fill="#fff" stroke="#e2e8f0"/>
  <text x="265" y="176" text-anchor="middle" font-size="9" fill="#475569">&lt;Outlet /&gt;: la página activa</text>
  <g font-size="9.5" fill="#0f172a">
    <line x1="420" y1="40" x2="440" y2="40" stroke="#94a3b8"/><text x="446" y="36" font-weight="700">SidebarNav</text><text x="446" y="49" font-size="8.5" fill="#475569">fixed · w-64 · solo desde lg</text>
    <line x1="420" y1="28" x2="410" y2="28" stroke="#94a3b8"/>
    <line x1="420" y1="90" x2="440" y2="90" stroke="#94a3b8"/><text x="446" y="86" font-weight="700">AppHeader</text><text x="446" y="99" font-size="8.5" fill="#475569">sticky · h-16 · translúcida</text>
    <line x1="420" y1="140" x2="440" y2="140" stroke="#94a3b8"/><text x="446" y="136" font-weight="700">PageHeader (en cada página)</text><text x="446" y="149" font-size="8.5" fill="#475569">contexto · título · descripción · acciones</text>
    <line x1="420" y1="200" x2="440" y2="200" stroke="#94a3b8"/><text x="446" y="196" font-weight="700">main</text><text x="446" y="209" font-size="8.5" fill="#475569">max-w-7xl · centrado · px-4 / lg:px-8</text>
  </g>
</svg>
<figcaption><b>Figura 12.1.</b> Las zonas fijas del layout y la zona variable donde React Router pinta cada página.</figcaption>
</figure>

## `AppLayout`: el armazón

```tsx title="src/components/layout/app-layout.tsx"
export function AppLayout() {
  useDocumentTitle()
  return (
    <div className="min-h-svh">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <SidebarNav />
      </aside>
      <div className="lg:pl-64">
        <AppHeader />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

Ya conoces cada pieza: las clases responsive (capítulo 10), el hook `useDocumentTitle` (capítulo 8) y el `Outlet` de React Router, el hueco donde se pinta la ruta hija activa (Parte VII). Tres detalles de diseño:

- **El menú es `fixed`**: no se desplaza con el contenido. En una aplicación de gestión, la navegación siempre visible ahorra movimientos.
- **`min-h-svh`** (*small viewport height*) usa la altura visible real en móviles, donde la barra del navegador aparece y desaparece; `100vh` provocaría saltos.
- **El ancho del contenido está limitado** a `max-w-7xl` (80 rem). En monitores muy anchos, las tablas y formularios de ancho completo son difíciles de leer.

## El menú lateral declarativo

El menú está dividido en **datos** y **presentación**.

### Los datos: `navigation.ts`

```ts title="src/components/layout/navigation.ts"
export interface NavLeaf {
  label: string
  to: string
  /** Si es true, solo se marca activa con coincidencia exacta de ruta. */
  end?: boolean
}

export interface NavModule {
  id: string
  label: string
  icon: LucideIcon
  /** Rutas cuyo prefijo pertenece al módulo (para abrir el grupo automáticamente). */
  basePath?: string
  items?: NavLeaf[]
  /** Módulos previstos pero todavía no implementados. */
  comingSoon?: boolean
}

export const NAV_MODULES: NavModule[] = [
  {
    id: 'applications', label: 'Aplicaciones', icon: AppWindow, basePath: '/aplicaciones',
    items: [
      { label: 'Consultar aplicaciones', to: '/aplicaciones', end: true },
      { label: 'Nueva aplicación', to: '/aplicaciones/nueva', end: true },
      { label: 'Modificar aplicación', to: '/aplicaciones/modificar', end: true },
    ],
  },
  { id: 'demands', label: 'Demandas', icon: ClipboardList, basePath: '/demandas', items: [ /* … */ ] },
  { id: 'incidents', label: 'Incidencias', icon: TriangleAlert, comingSoon: true },
  { id: 'teams', label: 'Equipos', icon: Users, comingSoon: true },
  { id: 'settings', label: 'Configuración', icon: Settings, comingSoon: true },
]
```

Es una lista de objetos tipados. No hay JSX ni lógica: solo la **estructura de navegación** de la aplicación, con los módulos previstos marcados como `comingSoon`.

### La presentación: `SidebarNav`

`SidebarNav` recorre esa lista y decide, para cada módulo, si pinta un grupo desplegable o un elemento «Pronto»:

```tsx title="src/components/layout/sidebar-nav.tsx (extracto)"
<nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
  <ul className="space-y-1">
    {NAV_MODULES.map((module) => (
      <li key={module.id}>
        {module.comingSoon ? (
          <ComingSoonItem module={module} />
        ) : (
          <ModuleGroup module={module} onNavigate={onNavigate} />
        )}
      </li>
    ))}
  </ul>
</nav>
```

Cada grupo es un `Collapsible` de Radix con su propio estado de apertura:

```tsx title="src/components/layout/sidebar-nav.tsx (extracto)"
function ModuleGroup({ module, onNavigate }: { module: NavModule; onNavigate?: () => void }) {
  const location = useLocation()
  const isInModule = !!module.basePath && location.pathname.startsWith(module.basePath)
  const [open, setOpen] = useState(true)
  const Icon = module.icon

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className={cn('group flex w-full …', isInModule && 'text-white')}>
        <Icon className={cn('size-4 shrink-0', isInModule ? 'text-cyan-300' : 'text-sidebar-muted')} />
        <span className="flex-1 text-left">{module.label}</span>
        <ChevronRight className="… group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
        <ul className="mt-1 ml-5 space-y-0.5 border-l border-sidebar-border pl-3">
          {module.items?.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => cn(/* … */)}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
```

- **`isInModule`** es un valor derivado de la URL actual: resalta el icono y el nombre del módulo en el que está el usuario, aunque esté en una ruta que no aparece en el menú, como `/aplicaciones/7/editar`.
- **`useState(true)`**: los grupos empiezan abiertos y el usuario puede plegarlos. Es estado local de interfaz, sin más trascendencia (capítulo 7).
- **`NavLink`** de React Router es un `Link` que sabe si su ruta está activa y pasa `isActive` a su función de clases. La propiedad **`end`** exige coincidencia exacta: sin ella, *Consultar aplicaciones* (`/aplicaciones`) aparecería activo también en `/aplicaciones/nueva`, porque es su prefijo.
- **`onNavigate`** es opcional: en escritorio no hace nada; en móvil cierra el panel al elegir una opción.

Los elementos previstos se pintan desactivados y accesibles:

```tsx title="src/components/layout/sidebar-nav.tsx (extracto)"
<div className="flex cursor-not-allowed items-center gap-3 … text-sidebar-muted/80"
     aria-disabled="true" title="Módulo previsto, pendiente de implementar">
  <Icon className="size-4 shrink-0" />
  <span className="flex-1 truncate">{module.label}</span>
  <span className="… uppercase">Pronto</span>
</div>
```

::: decision Navegación por módulos con acciones explícitas
**Decisión.** Un menú lateral con un grupo por módulo de negocio y, dentro, las **acciones** del módulo (*Consultar*, *Nueva*, *Modificar*), en lugar de un único enlace por módulo.

**Motivos.** Refleja la forma de trabajar de una aplicación de gestión de servicios: el usuario va a «dar de alta una demanda» o a «modificar una aplicación», y el menú le lleva directamente. Los módulos futuros se muestran como «Pronto» para comunicar la hoja de ruta sin enlaces rotos. Y al ser declarativo, añadir un módulo es añadir datos.

**Alternativas.** Navegación superior horizontal (se queda corta con más de cinco o seis módulos); un enlace por módulo con las acciones dentro de cada pantalla (menos clics en el menú, pero las acciones quedan menos visibles).
:::

## La cabecera y el menú móvil

En pantallas pequeñas no hay sitio para un menú fijo de 16 rem. La cabecera ofrece un botón que abre el mismo menú en un panel deslizante:

```tsx title="src/components/layout/app-header.tsx"
export function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/70 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
        <Menu />
      </Button>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-none p-0 text-sidebar-foreground [&>button]:text-white">
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <SheetDescription className="sr-only">Módulos de IT Service Manager</SheetDescription>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      {/* marca en móvil y título de la aplicación */}
    </header>
  )
}
```

Lo más importante es lo que **no** hay: un segundo menú. El panel móvil reutiliza `SidebarNav` tal cual, y la única diferencia es la prop `onNavigate`, que cierra el panel. Cualquier cambio en `navigation.ts` aparece en ambos.

Sobre el aspecto: la cabecera es `sticky` (se queda arriba al desplazar) y semitransparente con desenfoque del fondo (`bg-card/85 backdrop-blur`), un recurso habitual en interfaces modernas que mantiene el contexto del contenido que pasa por debajo. La variante `supports-[backdrop-filter]:bg-card/70` solo aumenta la transparencia si el navegador soporta el desenfoque; si no, se queda más opaca para que el texto siga legible.

## La marca

El logotipo es un pequeño componente con un SVG en línea:

```tsx title="src/components/layout/brand.tsx"
export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/25 to-sky-500/10 ring-1 ring-cyan-400/40', className)}>
      <svg viewBox="0 0 24 24" className="size-5 text-cyan-300" fill="none" aria-hidden="true">
        <path d="M5 7h14M5 12h14M5 17h9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="18.5" cy="17" r="1.6" fill="currentColor" />
      </svg>
    </div>
  )
}
```

Al estar en línea y usar `currentColor`, el color del dibujo lo decide la clase `text-cyan-300`, sin ficheros de imagen. Es decorativo (`aria-hidden="true"`): el nombre de la aplicación ya aparece como texto al lado. La cabecera lo reutiliza en móvil con otro fondo: `<BrandMark className="size-8 bg-sidebar" />`.

## El sistema visual

La coherencia visual no sale de los componentes por sí solos, sino de **un conjunto pequeño de decisiones repetidas** en todas las pantallas.

### Paleta

| Papel | Token o clase | Uso |
|---|---|---|
| Navegación | `bg-sidebar` (azul noche) | Menú lateral: ancla visual oscura de la aplicación |
| Fondo de página | `bg-background` (pizarra muy claro) | Detrás de las tarjetas |
| Superficies | `bg-card` (blanco) | Tarjetas, cabecera, desplegables |
| Texto secundario | `text-muted-foreground` | Descripciones, etiquetas, ayudas |
| Acción principal | `variant="brand"` (cian) | Un único botón destacado por pantalla: *Nueva aplicación* |
| Acción por defecto | `variant="default"` (azul oscuro) | Enviar formularios, *Modificar* |
| Acciones secundarias | `outline`, `ghost` | Volver, ver detalle, limpiar |
| Estados | verde, gris, ámbar, rojo… | `StatusPill` y `LevelBadge` |

El cian se reserva para **lo importante**: la acción principal, el enlace activo del menú, el contexto de la página (*eyebrow*) y el foco. Usado con moderación, guía la vista.

### Tipografía

Una única familia (Inter) y una escala corta: títulos de página en `text-2xl font-semibold tracking-tight`; títulos de tarjeta en `font-semibold`; texto general en `text-sm`; etiquetas y contexto en `text-xs uppercase tracking-wide`; identificadores en `font-mono`. Pocas combinaciones, siempre las mismas.

### Patrones de página

Las pantallas se construyen con **cuatro plantillas** que se repiten en los dos módulos:

| Plantilla | Estructura | Ejemplos |
|---|---|---|
| Listado | `PageHeader` con acción principal → `Card` con filtros, `Separator`, tabla y `PaginationBar` | Consultar aplicaciones y demandas |
| Formulario | `PageHeader` con «Volver» → `Card` con cabecera, campos en rejilla y pie con acciones → resultado del servidor | Alta y modificación |
| Ficha | `PageHeader` con acciones → `Card` con una lista de definiciones (`<dl>`) | Detalle |
| Selector | `PageHeader` → tarjeta de búsqueda por ID → tarjeta de catálogo | Modificar (entrada desde el menú) |

### Indicadores de estado y nivel

Dos componentes comunes resumen visualmente los enumerados del dominio:

- **`StatusPill`**: una píldora con un punto de color para **estados** (activa, abierta, completada…). El tono (`success`, `neutral`, `info`, `brand`, `warning`, `danger`) lo decide cada módulo.
- **`LevelBadge`**: una etiqueta con **cuatro barras** de altura creciente para **niveles** de 1 a 4 (criticidad, prioridad). Se lee de un vistazo, incluso sin color, lo que lo hace accesible a personas con dificultades para distinguir colores.

Cada módulo traduce sus valores a estos componentes:

```tsx title="src/features/applications/components/application-badges.tsx"
const STATUS_TONES: Record<ApplicationStatus, Tone> = { ACTIVE: 'success', INACTIVE: 'neutral' }

const CRITICALITY_LEVELS: Record<ApplicationCriticality, Level> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
```

La apariencia vive en `components/common`; el significado de cada valor, en el módulo.

## Los componentes de estado

El capítulo 6 explicó por qué cada pantalla contempla todos sus estados. Estos son los componentes que lo hacen barato:

| Componente | Cuándo | Detalles de diseño |
|---|---|---|
| `TableSkeleton` | Primera carga de un listado | Imita la forma de la tabla para que la página no «salte» al llegar los datos; `role="status"` |
| `LoadingState` | Carga de una ficha o formulario | Icono giratorio y texto; `aria-live="polite"` |
| `EmptyState` | Consulta correcta sin resultados | Distingue «no hay datos» de «ningún resultado con estos filtros» y ofrece la acción adecuada en cada caso |
| `ErrorState` | Fallo al cargar | Distingue error de red (icono de wifi tachado) de error del servidor; muestra el mensaje y *Reintentar*; `role="alert"` |
| `ResourceNotFound` | ID no válido en la URL o 404 | Explica la causa probable y ofrece volver al listado |

::: proyecto
Fíjate en un detalle del listado: si falla una actualización pero ya había datos (por ejemplo, al cambiar de página), **no** se sustituye la tabla por el error. Se muestra una franja de aviso sobre los datos anteriores: «No se ha podido actualizar el listado. Se muestran los últimos datos obtenidos». Es la condición `query.isError && !data` frente a `query.isError` con datos. Perder de vista la información por un fallo momentáneo es peor que mostrarla con un aviso.
:::

## Errores típicos y depuración

- **El contenido queda debajo del menú lateral.** Falta el `lg:pl-64` del contenedor, o se ha cambiado el ancho del menú (`w-64`) sin cambiar el relleno.
- **Un enlace del menú aparece activo en varias rutas.** Le falta `end: true` en `navigation.ts`.
- **El panel móvil no se cierra al navegar.** No se está pasando `onNavigate` a `SidebarNav`, o el elemento no llama a `onClick={onNavigate}`.
- **Un módulo nuevo no aparece en el menú.** Hay que añadirlo en `navigation.ts` **y** registrar sus rutas en el router: son dos pasos separados.
- **Aviso de accesibilidad de Radix sobre el título del diálogo.** El `SheetContent` necesita `SheetTitle` (y una descripción), aunque estén ocultos con `sr-only`.

## Ejercicios

::: ejercicio Activa un módulo en el menú
Sin crear ninguna página, convierte *Incidencias* en un módulo con `basePath: '/incidencias'` y dos acciones (*Consultar incidencias* y *Nueva incidencia*). Comprueba qué ocurre al pulsarlas y por qué (pista: la ruta comodín del router). ¿Qué falta para que funcionen? Deshaz el cambio: este módulo lo construiremos en la Parte IX.
:::

::: ejercicio Recuerda los grupos plegados
Haz que el estado abierto o plegado de cada grupo del menú se recuerde al recargar la página. Usa `localStorage` con una clave por módulo, inicializando `useState` con una función que lea el valor guardado. ¿Dónde guardarías el valor: en un efecto o en el manejador `onOpenChange`? Justifícalo con lo visto en el capítulo 8.
:::

::: ejercicio Elimina una duplicación
`ApplicationSummary` define un subcomponente privado `Field` que hace exactamente lo mismo que `DetailField` de `src/components/common/detail-field.tsx`, y repite la lógica de `LongText` para la descripción. Refactorízalo para usar los componentes comunes y comprueba con React DevTools que la ficha se pinta igual. ¿Qué ganas y qué riesgo tiene este tipo de cambio?
:::

## Autoevaluación

::: preguntas
1. ¿Qué tres zonas fijas tiene el layout y cuál es la zona variable?
2. ¿Por qué se usa `min-h-svh` en lugar de una altura del 100 % de la ventana?
3. ¿Qué ventaja tiene separar `navigation.ts` de `sidebar-nav.tsx`?
4. ¿Para qué sirve la propiedad `end` de los enlaces del menú?
5. ¿Cómo se consigue el menú móvil sin duplicar el menú lateral?
6. ¿Por qué el color cian se reserva para unos pocos elementos?
7. ¿Qué ventaja de accesibilidad tiene `LevelBadge` frente a un simple color?
8. ¿Qué hace el listado si falla la carga de una página nueva pero ya tenía datos?
:::
