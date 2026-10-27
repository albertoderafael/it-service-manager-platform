# Tailwind CSS 4: estilos con clases de utilidad

<p class="lead">Todo el aspecto visual del proyecto —colores, espaciados, tipografía, disposición responsive, estados de foco o animaciones— se expresa con clases de Tailwind CSS escritas directamente en el JSX. A primera vista parece una sopa de letras. Este capítulo te enseña a leerla, explica cómo genera Tailwind el CSS y recorre el sistema de tokens de diseño definido en <code>index.css</code>.</p>

## El problema que resuelve

CSS es un lenguaje **global**: cualquier regla puede afectar a cualquier elemento de la página. En aplicaciones grandes esto produce problemas conocidos:

- **Colisiones de nombres.** Dos equipos crean una clase `.card` con estilos distintos y una pisa a la otra según el orden de carga.
- **Miedo a borrar.** Nadie sabe si una regla de la hoja de estilos se usa todavía, así que el CSS solo crece.
- **Inconsistencia.** Cada pantalla acaba con su propio gris, su propio margen de 13 píxeles y su propio tamaño de letra.
- **Saltar entre ficheros.** Para entender cómo se ve un componente hay que leer su JSX y, en otro fichero, sus estilos.

Las soluciones clásicas son convenciones de nombres (BEM: `.card__title--highlighted`), CSS Modules (clases con ámbito local) o CSS-in-JS (estilos escritos en JavaScript). **Tailwind** propone otra cosa: un catálogo enorme de **clases de utilidad** pequeñas, cada una con una sola propiedad, que se combinan directamente en el marcado.

```html
<!-- CSS tradicional: una clase semántica y una regla en otro fichero -->
<p class="page-eyebrow">Aplicaciones</p>
.page-eyebrow { font-size: .75rem; font-weight: 500; letter-spacing: .025em; text-transform: uppercase; }

<!-- Tailwind: las propiedades directamente en el elemento -->
<p class="text-xs font-medium tracking-wide uppercase">Aplicaciones</p>
```

El resultado: no hay nombres que inventar ni que colisionen, el estilo de un componente está **en el propio componente** (si borras el componente, borras su estilo), y todas las pantallas comparten la misma escala de espaciados, colores y tamaños.

::: java
La comparación justa es la de las anotaciones frente a los ficheros XML de configuración. Antes de Spring con anotaciones, el comportamiento de una clase estaba repartido entre el código y un `applicationContext.xml`; con `@Service` o `@Transactional`, todo está junto a lo que describe. Tailwind hace lo mismo con los estilos: los coloca junto al elemento al que se aplican. Y despierta las mismas objeciones iniciales («ensucia el código»), que suelen desaparecer con el uso.
:::

## Cómo leer las clases de utilidad

Cada clase sigue el patrón **propiedad-valor**, con abreviaturas sistemáticas. Con una decena de familias se lee el 90 % del proyecto.

| Familia | Ejemplos | CSS que genera |
|---|---|---|
| Relleno y margen | `p-4`, `px-3`, `py-2`, `mt-1`, `mb-6`, `ml-auto` | `padding: 1rem`; `padding-inline: .75rem`; `margin-left: auto` |
| Separación entre hijos | `gap-3`, `space-y-1` | `gap: .75rem`; margen vertical entre hijos |
| Tamaño | `w-64`, `h-16`, `size-4`, `max-w-7xl`, `min-h-svh`, `w-full` | `width: 16rem`; `width` y `height: 1rem` |
| Disposición | `flex`, `grid`, `flex-col`, `items-center`, `justify-between`, `grid-cols-[1fr_16rem]` | `display: flex`; `align-items: center`… |
| Tipografía | `text-sm`, `text-2xl`, `font-semibold`, `tracking-tight`, `uppercase`, `truncate` | `font-size`, `font-weight`, `letter-spacing`… |
| Color | `bg-card`, `text-muted-foreground`, `border-sidebar-border`, `bg-red-50` | `background-color`, `color`, `border-color` |
| Bordes y radios | `border`, `border-b`, `rounded-md`, `rounded-full`, `ring-1` | `border-width`, `border-radius`, sombra de anillo |
| Posición | `fixed`, `sticky`, `inset-y-0`, `left-0`, `top-0`, `z-40` | `position`, desplazamientos, `z-index` |
| Visibilidad | `hidden`, `block`, `sr-only`, `opacity-60` | `display: none`… |
| Efectos | `shadow-sm`, `backdrop-blur`, `transition-colors`, `animate-spin` | sombras, filtros, transiciones |

### La escala de espaciado

Los números no son píxeles: son **pasos de una escala**. En Tailwind 4, cada paso vale `0.25rem` (4 píxeles con el tamaño de letra por defecto): `p-1` son 4 px, `p-4` son 16 px, `w-64` son 256 px. Trabajar siempre sobre la misma escala es lo que hace que los espaciados de todas las pantallas encajen sin esfuerzo.

### Un ejemplo real, clase a clase

```tsx title="src/components/common/page-header.tsx"
<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
```

- `mb-6`: margen inferior de 1,5 rem, que separa la cabecera del contenido.
- `flex flex-col`: contenedor *flexbox* en columna: título arriba, acciones debajo.
- `gap-4`: 1 rem entre ambos bloques.
- `sm:flex-row`: a partir del punto de ruptura `sm` (640 px), en fila: título a la izquierda, acciones a la derecha.
- `sm:items-end sm:justify-between`: alineados por abajo y separados al máximo.

En una frase: «en móvil, título y botones apilados; en pantallas medianas o mayores, en la misma línea con los botones a la derecha».

### Valores arbitrarios

Cuando un valor no está en la escala, se escribe entre corchetes: `w-[72px]`, `text-[11px]`, `max-w-[22rem]`, `grid-cols-[1fr_16rem]` (el guion bajo representa un espacio). También se pueden usar variables CSS con paréntesis: `max-h-(--radix-select-content-available-height)`. Úsalos con moderación: cada valor arbitrario es una pequeña excepción al sistema de diseño.

## Diseño *responsive*: primero el móvil

Tailwind sigue el enfoque *mobile first*: las clases sin prefijo se aplican **a todos los tamaños**, y los prefijos de punto de ruptura añaden estilos **a partir de** un ancho mínimo.

| Prefijo | Ancho mínimo | Uso típico |
|---|---|---|
| (ninguno) | 0 | Móvil |
| `sm:` | 40 rem (640 px) | Móvil grande, tableta vertical |
| `md:` | 48 rem (768 px) | Tableta |
| `lg:` | 64 rem (1024 px) | Portátil: aquí aparece el menú lateral fijo |
| `xl:` | 80 rem (1280 px) | Escritorio amplio |
| `2xl:` | 96 rem (1536 px) | Monitores grandes |

El layout de la aplicación muestra el patrón completo:

```tsx title="src/components/layout/app-layout.tsx"
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
```

- El `aside` es `hidden` por defecto y `lg:block` desde 1024 px: el menú lateral fijo solo existe en pantallas grandes.
- El contenido tiene `lg:pl-64`: un relleno izquierdo igual al ancho del menú, para no quedar debajo de él.
- En móvil, la cabecera muestra un botón de menú (`lg:hidden`) que abre el mismo `SidebarNav` dentro de un panel deslizante (capítulo 12).
- El `main` limita su ancho (`max-w-7xl`) y se centra (`mx-auto`), con más margen en pantallas grandes (`lg:px-8`).

::: atencion
Un error frecuente es pensar que `sm:` significa «en pantallas pequeñas». Significa «**desde** pantallas pequeñas en adelante». Para algo que solo debe verse en móvil, se usa la clase sin prefijo y se anula en el punto de ruptura: `block lg:hidden`.
:::

## Estados y variantes

Los prefijos no solo expresan anchos de pantalla. Cualquier clase puede condicionarse a un **estado** o una **situación**, y es una de las mayores ventajas de Tailwind frente a escribir CSS a mano.

| Variante | Se aplica cuando… | Ejemplo en el proyecto |
|---|---|---|
| `hover:` | El puntero está encima | `hover:bg-sidebar-accent` en los enlaces del menú |
| `focus-visible:` | El elemento tiene el foco por teclado | `focus-visible:ring-[3px]` en el botón |
| `disabled:` | El elemento está desactivado | `disabled:opacity-50` |
| `aria-invalid:` | Tiene `aria-invalid="true"` | `aria-invalid:border-destructive` en los campos con error |
| `data-[state=open]:` | Tiene `data-state="open"` | Animaciones de apertura de Radix |
| `group-data-[state=open]:` | Un antepasado con clase `group` tiene ese atributo | La flecha del menú que gira al desplegar |
| `has-[>svg]:` | Contiene un hijo directo `svg` | Ajuste de relleno de los botones con icono |
| `before:` | Pseudo-elemento `::before` | La barra cian del enlace activo del menú |
| `supports-[…]:` | El navegador soporta una propiedad | Fondo translúcido de la cabecera |
| `[&_svg]:` | Selector arbitrario sobre descendientes | Tamaño por defecto de los iconos dentro de un botón |

Veamos dos casos con detalle.

**La flecha que gira al abrir un grupo del menú:**

```tsx title="src/components/layout/sidebar-nav.tsx"
<CollapsibleTrigger className={cn('group flex w-full … ', isInModule && 'text-white')}>
  <Icon className="…" />
  <span className="flex-1 text-left">{module.label}</span>
  <ChevronRight className="size-4 text-sidebar-muted transition-transform group-data-[state=open]:rotate-90" />
</CollapsibleTrigger>
```

Radix pone `data-state="open"` o `"closed"` en el disparador. La clase `group` marca el disparador como grupo, y `group-data-[state=open]:rotate-90` rota la flecha cuando el grupo está abierto. `transition-transform` anima el giro. Ni una línea de JavaScript para el efecto visual.

**El enlace activo del menú, con un indicador lateral:**

```tsx title="src/components/layout/sidebar-nav.tsx"
className={({ isActive }) =>
  cn(
    'relative block rounded-md px-3 py-1.5 text-[13px] transition-colors hover:bg-sidebar-accent hover:text-white',
    isActive &&
      'bg-sidebar-accent font-medium text-white before:absolute before:top-1.5 before:bottom-1.5 before:-left-[13px] before:w-0.5 before:rounded-full before:bg-cyan-400',
  )
}
```

Las clases `before:*` dibujan un pseudo-elemento: una barra de 2 px de ancho, posicionada a la izquierda del enlace, sobre la línea vertical del submenú. `NavLink` de React Router indica si la ruta está activa, y solo entonces se añaden esas clases.

## Cómo funciona Tailwind 4 por dentro

Tailwind **no es una hoja de estilos gigante** con todas las clases posibles: sería de cientos de megas. Es un **generador**:

1. Al arrancar Vite, el plugin `@tailwindcss/vite` **analiza los ficheros fuente** del proyecto en busca de cadenas que parezcan clases.
2. Para cada clase encontrada que reconoce, genera su regla CSS.
3. Escribe el CSS resultante en lugar de la línea `@import 'tailwindcss'` de `index.css`.
4. En desarrollo, al guardar un fichero con clases nuevas, regenera lo necesario en milisegundos; en producción, el CSS final solo contiene lo que se usa (el del proyecto ocupa unas decenas de kilobytes).

<figure>
<svg viewBox="0 0 680 160" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="a10" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="10" y="20" width="180" height="110" rx="8" fill="#f8fafc" stroke="#94a3b8"/>
  <text x="100" y="40" text-anchor="middle" font-weight="700">src/**/*.tsx</text>
  <text x="22" y="62" font-family="DejaVu Sans Mono" font-size="8.5">className="flex gap-4</text>
  <text x="22" y="76" font-family="DejaVu Sans Mono" font-size="8.5">  sm:flex-row bg-card"</text>
  <text x="100" y="110" text-anchor="middle" font-size="9" fill="#475569">clases escritas en el código</text>
  <line x1="190" y1="75" x2="243" y2="75" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a10)"/>
  <rect x="245" y="20" width="190" height="110" rx="8" fill="#0b1220"/>
  <text x="340" y="42" text-anchor="middle" font-weight="700" fill="#fff">@tailwindcss/vite</text>
  <text x="340" y="64" text-anchor="middle" font-size="9" fill="#a5f3fc">1. detecta las clases usadas</text>
  <text x="340" y="80" text-anchor="middle" font-size="9" fill="#a5f3fc">2. aplica tokens de @theme</text>
  <text x="340" y="96" text-anchor="middle" font-size="9" fill="#a5f3fc">3. genera solo esas reglas</text>
  <line x1="435" y1="75" x2="488" y2="75" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a10)"/>
  <rect x="490" y="20" width="180" height="110" rx="8" fill="#ecfeff" stroke="#0891b2"/>
  <text x="580" y="40" text-anchor="middle" font-weight="700">CSS generado</text>
  <text x="500" y="60" font-family="DejaVu Sans Mono" font-size="8">.flex{display:flex}</text>
  <text x="500" y="74" font-family="DejaVu Sans Mono" font-size="8">.gap-4{gap:calc(var(--spacing)*4)}</text>
  <text x="500" y="88" font-family="DejaVu Sans Mono" font-size="8">.bg-card{background:var(--card)}</text>
  <text x="500" y="102" font-family="DejaVu Sans Mono" font-size="8">@media(width&gt;=40rem){</text>
  <text x="500" y="114" font-family="DejaVu Sans Mono" font-size="8"> .sm\:flex-row{…}}</text>
</svg>
<figcaption><b>Figura 10.1.</b> Tailwind genera el CSS a partir de las clases que encuentra en el código.</figcaption>
</figure>

### Configuración en CSS, no en JavaScript

Hasta la versión 3, Tailwind se configuraba con un fichero `tailwind.config.js`. **Tailwind 4 se configura directamente en CSS**, con directivas como `@theme`. Por eso el proyecto no tiene `tailwind.config.js`, y en `components.json` (la configuración de shadcn/ui) la entrada `tailwind.config` está vacía. Toda la configuración vive en `src/index.css`.

### La consecuencia más importante: clases completas

Como Tailwind busca las clases **como texto** en el código fuente, **no puede ver clases construidas dinámicamente**:

```tsx
// MAL: Tailwind no encuentra «bg-emerald-50» en el código; la clase no se genera
const color = 'emerald'
<span className={`bg-${color}-50`} />

// BIEN: las clases aparecen completas en el código
const PILL_TONES: Record<Tone, { pill: string; dot: string }> = {
  success: { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  neutral: { pill: 'bg-slate-100 text-slate-600 ring-slate-500/20', dot: 'bg-slate-400' },
  // …
}
```

El segundo fragmento es real (`src/components/common/badges.tsx`). Por eso los tonos de los indicadores se guardan en objetos con las cadenas de clases completas, y el componente elige la entrada según la prop `tone`.

::: proyecto
El mismo principio explica por qué `LevelBadge` usa la propiedad `style` para la altura de cada barra: `style={{ height: 4 + n * 2 }}`. Es un valor **calculado** en ejecución, y para eso las clases de Tailwind no sirven. Regla práctica: clases de Tailwind para todo lo que se conoce al escribir el código; `style` solo para valores que dependen de datos.
:::

## El tema: tokens de diseño en `index.css`

Las clases como `bg-card`, `text-muted-foreground` o `bg-sidebar` no existen en Tailwind por defecto: las define el proyecto. Es el **sistema de tokens de diseño**, el corazón visual de la aplicación, y está en `src/index.css`.

### Capa 1: las variables CSS

```css title="src/index.css (extracto)"
:root {
  --radius: 0.625rem;

  --background: oklch(0.985 0.003 247);
  --foreground: oklch(0.21 0.035 262);

  /* Primario: azul oscuro corporativo */
  --primary: oklch(0.32 0.075 258);
  --primary-foreground: oklch(0.985 0.003 247);

  /* Acento tecnológico: cian */
  --brand: oklch(0.78 0.13 210);
  --brand-strong: oklch(0.62 0.12 220);

  --destructive: oklch(0.58 0.22 27);
  --border: oklch(0.915 0.01 252);

  /* Navegación lateral */
  --sidebar: oklch(0.2 0.04 262);
  --sidebar-foreground: oklch(0.86 0.02 250);
  /* … */
}
```

Son **variables CSS** (*custom properties*), definidas en `:root` para que estén disponibles en toda la página. Los nombres siguen la convención de shadcn/ui: cada color de fondo tiene su pareja `-foreground`, el color del texto que va encima (`--primary` y `--primary-foreground`). Así siempre se combinan colores con contraste suficiente.

Los colores están en **OKLCH**, un espacio de color moderno con tres componentes: **L**uminosidad (de 0 a 1), **C**roma (intensidad del color) y **H**ue (tono, en grados). Su ventaja sobre el hexadecimal es que es **perceptualmente uniforme**: dos colores con la misma L se perciben igual de claros, lo que facilita crear variantes coherentes. Fíjate en que casi todos los grises del proyecto tienen un tono de 247 a 262: son grises ligeramente azulados, a juego con el azul corporativo.

### Capa 2: el puente con Tailwind

```css title="src/index.css (extracto)"
@theme inline {
  --font-sans: 'Inter Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;

  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);

  --color-background: var(--background);
  --color-primary: var(--primary);
  --color-brand-strong: var(--brand-strong);
  --color-sidebar: var(--sidebar);
  /* … */
}
```

La directiva `@theme` declara **tokens de Tailwind**. Cada variable con prefijo `--color-` crea toda una familia de utilidades: `--color-sidebar` habilita `bg-sidebar`, `text-sidebar`, `border-sidebar`, `ring-sidebar`… y con opacidad, `bg-sidebar/80`. Igual con `--radius-*` (`rounded-lg`) y `--font-*` (`font-sans`). La palabra `inline` indica que las utilidades usen directamente el valor de la variable (`var(--sidebar)`), de modo que si una variable de `:root` cambia en ejecución, todo lo que la usa cambia con ella.

<figure>
<svg viewBox="0 0 680 120" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="a10b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="10" y="30" width="180" height="60" rx="8" fill="#f8fafc" stroke="#94a3b8"/>
  <text x="100" y="52" text-anchor="middle" font-weight="700">:root</text>
  <text x="100" y="72" text-anchor="middle" font-family="DejaVu Sans Mono" font-size="8.5">--sidebar: oklch(0.2 …)</text>
  <line x1="190" y1="60" x2="243" y2="60" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a10b)"/>
  <rect x="245" y="30" width="190" height="60" rx="8" fill="#0b1220"/>
  <text x="340" y="52" text-anchor="middle" font-weight="700" fill="#fff">@theme inline</text>
  <text x="340" y="72" text-anchor="middle" font-family="DejaVu Sans Mono" font-size="8.5" fill="#a5f3fc">--color-sidebar: var(--sidebar)</text>
  <line x1="435" y1="60" x2="488" y2="60" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a10b)"/>
  <rect x="490" y="30" width="180" height="60" rx="8" fill="#ecfeff" stroke="#0891b2"/>
  <text x="580" y="52" text-anchor="middle" font-weight="700">Utilidades</text>
  <text x="580" y="72" text-anchor="middle" font-family="DejaVu Sans Mono" font-size="8.5">bg-sidebar · bg-sidebar/80 …</text>
  <text x="100" y="110" text-anchor="middle" font-size="9" fill="#475569">valor del color</text>
  <text x="340" y="110" text-anchor="middle" font-size="9" fill="#475569">token de Tailwind</text>
  <text x="580" y="110" text-anchor="middle" font-size="9" fill="#475569">clases en el JSX</text>
</svg>
<figcaption><b>Figura 10.2.</b> La cadena de un token: variable CSS → token del tema → clases de utilidad.</figcaption>
</figure>

### Capa 3: los estilos base

```css title="src/index.css (extracto)"
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
}
```

Estilos por defecto para toda la página: color de borde, color del contorno de foco, fondo y color de texto del `body`. La directiva `@apply` permite usar clases de Tailwind dentro de CSS. `@layer base` coloca estas reglas en la capa de menor prioridad, de modo que cualquier utilidad en el JSX las sobrescribe.

### Las importaciones y el modo oscuro

```css title="src/index.css (extracto)"
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@fontsource-variable/inter';

@custom-variant dark (&:is(.dark *));
```

La primera línea trae Tailwind; la segunda, las animaciones de entrada y salida que usan los componentes de Radix (sección 10.8); la tercera, la fuente Inter servida desde el propio proyecto, sin depender de Google Fonts. La última define la variante `dark:` para que se active cuando un antepasado tenga la clase `dark`.

::: proyecto
El proyecto tiene preparada la variante `dark:`, pero **no define todavía los valores oscuros** de los tokens. Añadir el modo oscuro consistiría en redefinir las variables dentro de un selector `.dark { --background: …; --foreground: …; }` y añadir un conmutador que ponga o quite la clase `dark` en `<html>`. Gracias a `@theme inline`, ningún componente tendría que cambiar. Es el ejercicio 10.3.
:::

::: java
Los tokens son el equivalente de externalizar la configuración en `application.properties` en lugar de dejar literales repartidos por el código: el componente dice `bg-primary` («el color primario»), no `bg-[#1e3a5f]`. Cambiar la marca es cambiar una variable.
:::

## Componer clases: `cn()`

Casi todos los componentes aceptan una prop `className` para que quien los usa pueda añadir o ajustar estilos. Eso plantea un problema: ¿qué pasa si el componente tiene `px-4` y quien lo usa pasa `px-2`? En CSS, ambas clases tienen la misma especificidad y gana **la que aparece después en la hoja de estilos**, no la que escribiste después en el atributo. El resultado sería impredecible.

La función `cn` resuelve esto:

```ts title="src/lib/utils.ts"
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- **`clsx`** construye una cadena a partir de valores variados, descartando los falsos: `clsx('a', false && 'b', isActive && 'c', undefined)` devuelve `'a c'` si `isActive` es verdadero. Permite escribir clases condicionales con `&&`.
- **`twMerge`** entiende Tailwind y **resuelve conflictos**: si dos clases afectan a la misma propiedad, se queda con la última. `twMerge('px-4 py-2', 'px-2')` devuelve `'py-2 px-2'`.

El patrón aparece en todos los componentes:

```tsx title="src/components/common/state-views.tsx"
<div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground', className)}>
```

Las clases del componente van primero y el `className` recibido al final, de modo que quien usa el componente siempre puede sobrescribirlas. El router lo aprovecha al usar `<LoadingState className="min-h-svh" />` como pantalla de carga inicial a pantalla completa.

## Animaciones y transiciones

El proyecto usa tres mecanismos:

- **Transiciones** (`transition-colors`, `transition-transform`, `transition-opacity`): animan el cambio de una propiedad cuando cambia una clase, como el color al pasar el ratón o la opacidad de la tabla mientras carga otra página (`isFetching && 'opacity-60'`).
- **Animaciones de Tailwind** (`animate-spin`, `animate-pulse`): el icono de carga que gira y los esqueletos que palpitan.
- **Animaciones de entrada y salida** de `tw-animate-css`: clases como `animate-in fade-in-0 zoom-in-95` o `slide-in-from-left`, que los componentes de shadcn/ui combinan con `data-[state=open]:` y `data-[state=closed]:` para animar desplegables, *tooltips* y el panel lateral móvil.

## Decisión y alternativas

::: decision Tailwind CSS 4 con tokens propios
**Decisión.** Estilos con Tailwind CSS 4, integrado mediante su plugin de Vite, con un tema de tokens propio definido en CSS y siguiendo la convención de nombres de shadcn/ui.

**Motivos.**

- Estilos junto al componente: nada de hojas de estilos globales que crecen sin control.
- Un sistema de diseño **impuesto por la herramienta**: escala de espaciado, tipografía y colores comunes.
- CSS final pequeño, porque solo incluye lo usado.
- Es la base de shadcn/ui (capítulo 11), que da componentes accesibles listos para personalizar.
- Las variantes (`hover:`, `aria-invalid:`, `data-[state=open]:`) resuelven en una clase lo que en CSS requiere selectores complejos.

**Inconvenientes asumidos.** Cadenas de clases largas en algunos componentes y una curva inicial para memorizar las abreviaturas, mitigada con la extensión del editor (autocompletado y vista previa del CSS al pasar el ratón).

**Alternativas.** CSS Modules (estilos locales, pero sin sistema de diseño); CSS-in-JS como styled-components o Emotion (coste en ejecución y peor encaje con React moderno); librerías de componentes con estilos propios como MUI o Ant Design (rápidas para empezar, difíciles de adaptar a una identidad visual propia).
:::

## Errores típicos y depuración

- **Una clase no tiene efecto.** Comprueba que existe (la extensión del editor la colorea y muestra su CSS) y que no la construyes dinámicamente (sección 10.5). En la pestaña *Elements* de las DevTools verás si la clase está en el elemento y si su regla CSS existe.
- **Un color propio no existe** (`bg-brand-soft`). Falta declarar `--color-brand-soft` en `@theme inline` y su variable en `:root`.
- **Dos clases en conflicto.** Si combinas clases fuera de `cn()`, gana la que Tailwind generó después, no la que escribiste después. Usa siempre `cn()` para mezclar clases de distinto origen.
- **El diseño se rompe en móvil.** Prueba con el modo de dispositivo de las DevTools (Ctrl+Shift+M) y revisa qué clases carecen de versión sin prefijo.
- **Contenido desbordado en una celda o un título largo.** Faltan `min-w-0` en el contenedor *flex* o `truncate` en el texto: los hijos de un contenedor *flex* no encogen por debajo de su contenido sin `min-w-0`.

## Ejercicios

::: ejercicio Traduce clases a CSS
Lee la cabecera de la aplicación (`src/components/layout/app-header.tsx`) y explica con palabras qué hace cada clase de este fragmento: `sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/70 lg:px-8`. Comprueba tu interpretación en las DevTools, seleccionando el elemento y desplazando la página.
:::

::: ejercicio Añade un tono a los indicadores
Añade un tono `'violet'` al tipo `Tone` y a `PILL_TONES` en `src/components/common/badges.tsx`, con fondo violeta claro y texto violeta oscuro. Úsalo temporalmente en `STATUS_TONES` para el estado `INACTIVE`. Después prueba a construir la clase de forma dinámica (`` `bg-${color}-50` ``) y explica por qué no funciona.
:::

::: ejercicio Prepara el modo oscuro
En `index.css`, añade un bloque `.dark { … }` que redefina al menos `--background`, `--foreground`, `--card`, `--card-foreground`, `--muted`, `--muted-foreground` y `--border` con colores oscuros en OKLCH (luminosidades entre 0,15 y 0,3 para los fondos). Añade la clase `dark` a `<html>` desde las DevTools y observa el resultado. ¿Qué partes de la interfaz no cambian y por qué? (Pista: busca colores escritos directamente, como `bg-emerald-50` o `text-white`.)
:::

## Autoevaluación

::: preguntas
1. ¿Qué problemas de CSS tradicional intenta resolver el enfoque de clases de utilidad?
2. ¿Cuánto mide `p-4` y por qué conviene trabajar con una escala?
3. ¿Qué significa `sm:flex-row`? ¿Cómo harías que algo solo se vea en móvil?
4. ¿Cómo consigue la flecha del menú girar al abrir un grupo sin JavaScript?
5. ¿Por qué Tailwind no puede generar `` `bg-${color}-50` ``?
6. Describe las tres capas del sistema de tokens de `index.css`.
7. ¿Qué ventaja tiene OKLCH frente al hexadecimal para definir una paleta?
8. ¿Qué problema resuelve `twMerge` que no resuelve `clsx`?
9. ¿Cuándo es correcto usar la propiedad `style` en lugar de clases?
:::
