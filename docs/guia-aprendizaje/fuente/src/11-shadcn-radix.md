# shadcn/ui y Radix: componentes accesibles que son tuyos

<p class="lead">Botones, desplegables, tarjetas, paneles deslizantes o <em>tooltips</em> no se han escrito desde cero ni vienen de una librería cerrada. Vienen de shadcn/ui, un catálogo de componentes que se <b>copian</b> al proyecto, construidos sobre los primitivos accesibles de Radix y estilados con Tailwind. Este capítulo explica ese modelo, la anatomía de sus componentes y cómo se mantienen.</p>

## El problema de las librerías de componentes clásicas

Las librerías tradicionales como MUI, Ant Design o PrimeReact ofrecen cientos de componentes listos. Son muy productivas al principio, pero tienen un coste que aparece con el tiempo:

- **Estilos difíciles de cambiar.** El componente trae su propio diseño y su propio sistema de estilos. Adaptarlo a una identidad visual distinta exige sobrescribir estilos internos, a menudo con selectores frágiles.
- **Caja negra.** Si un comportamiento no encaja, no puedes cambiarlo: dependes de las opciones que la librería haya previsto.
- **Actualizaciones mayores costosas.** Una versión nueva puede cambiar APIs y estilos de todos los componentes a la vez.

Al mismo tiempo, escribir **desde cero** un desplegable accesible es muchísimo trabajo: navegación con flechas y búsqueda por teclado, gestión del foco, cierre con *Escape* o al hacer clic fuera, posicionamiento cuando no cabe en pantalla, atributos ARIA para lectores de pantalla… Es la parte difícil, y casi nadie la hace bien a la primera.

La combinación de **Radix** y **shadcn/ui** separa ambas cosas: el **comportamiento** difícil lo aporta una librería especializada, y la **apariencia** es código tuyo.

## Radix UI: comportamiento y accesibilidad sin estilos

**Radix UI** es una librería de componentes ***headless*** (sin cabeza, es decir, sin aspecto): implementan el comportamiento, la accesibilidad y la gestión del estado de los patrones de interfaz complejos, pero **no traen ningún estilo**.

Cada componente de Radix es una familia de piezas que se componen (capítulo 9):

```tsx
<Select.Root value={…} onValueChange={…}>
  <Select.Trigger>          {/* botón que abre */}
    <Select.Value />        {/* texto del valor seleccionado */}
  </Select.Trigger>
  <Select.Portal>           {/* renderiza el contenido al final del <body> */}
    <Select.Content>
      <Select.Viewport>
        <Select.Item value="ACTIVE"><Select.ItemText>Activa</Select.ItemText></Select.Item>
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>
```

Lo que Radix resuelve por ti en este desplegable:

- Apertura con clic, con *Intro*, con *Espacio* o con las flechas; cierre con *Escape* o al hacer clic fuera.
- Navegación con flechas y selección por la primera letra al teclear.
- Devolver el foco al botón al cerrar.
- Roles y atributos ARIA (`role="combobox"`, `aria-expanded`, `aria-controls`…).
- Posicionar la lista donde quepa y desplazarla si es larga.

Además, Radix publica su estado en **atributos `data-*`** de los elementos que pinta: `data-state="open"`, `data-side="bottom"`, `data-placeholder`, `data-disabled`. Son el puente con Tailwind: las variantes `data-[state=open]:` del capítulo 10 los usan para estilar y animar cada estado.

### Los portales

`Select.Portal` merece una explicación. El contenido de un desplegable, un *tooltip* o un panel lateral se renderiza **fuera** de su posición en el árbol del DOM, al final del `<body>`, aunque en el árbol de React siga siendo hijo de su componente. Así no lo recorta un contenedor con `overflow: hidden` (como la tarjeta del listado, con `overflow-hidden`) ni queda debajo de otro elemento por culpa de los `z-index`. Los eventos y el contexto de React siguen funcionando como si estuviera en su sitio.

::: proyecto
El proyecto usa el paquete unificado `radix-ui`, que agrupa todos los primitivos y se importa por nombre: `import { Select as SelectPrimitive } from 'radix-ui'`. Es lo que vimos en el capítulo 3 con `npm explain`: `@radix-ui/react-select` llega como dependencia de `radix-ui`.
:::

## shadcn/ui: un catálogo que se copia

**shadcn/ui** no es una librería que se instala. **No aparece en `package.json`.** Es un catálogo de componentes, construidos con Radix y Tailwind, cuyo **código fuente se copia en tu proyecto** con una herramienta de línea de comandos:

```bash
npx shadcn@latest add dialog
```

El comando descarga `dialog.tsx`, lo adapta a la configuración del proyecto (alias, estilo, iconos), lo escribe en `src/components/ui/` e instala las dependencias que necesite. A partir de ese momento, **el componente es código del proyecto**: lo lees, lo modificas y lo versionas como cualquier otro fichero.

La configuración de la herramienta está en `components.json`:

```json title="components.json"
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

| Clave | Significado |
|---|---|
| `style: "new-york"` | Variante visual del catálogo: más compacta y definida que la original. |
| `rsc: false` | El proyecto no usa componentes de servidor de React (es una SPA). |
| `tsx: true` | Genera TypeScript. |
| `tailwind.css` | Dónde están los tokens y los estilos globales. |
| `tailwind.config: ""` | Vacío: Tailwind 4 se configura en CSS (capítulo 10). |
| `baseColor`, `cssVariables` | Paleta de partida y uso de variables CSS para los colores (los tokens de `index.css`). |
| `aliases` | Dónde escribir componentes, utilidades y hooks, usando el alias `@/`. |
| `iconLibrary: "lucide"` | Los componentes usan los iconos de `lucide-react`. |

::: java
Piensa en un arquetipo de Maven o en el código que genera Spring Initializr: te da un punto de partida bien hecho y, a partir de ahí, el código es tuyo. Lo opuesto sería una dependencia binaria que solo puedes configurar por las opciones que expone. shadcn/ui aplica el modelo del arquetipo a cada componente de interfaz.
:::

## Anatomía de un componente sencillo: `Button`

```tsx title="src/components/ui/button.tsx"
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        brand: 'bg-brand-strong text-white shadow-xs hover:bg-brand-strong/90',
        destructive: 'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20',
        outline: 'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function Button({
  className, variant, size, asChild = false, ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
}

export { Button, buttonVariants }
```

Cinco ideas en treinta líneas:

1. **`cva` (*class-variance-authority*)** define un catálogo de variantes. El primer argumento son las clases comunes; `variants` asocia cada valor de cada variante con sus clases; `defaultVariants` fija los valores por defecto. `buttonVariants({ variant: 'outline', size: 'sm' })` devuelve la cadena de clases combinada.
2. **`VariantProps<typeof buttonVariants>`** deriva los tipos de las props de las variantes: `variant` solo admite `'default' | 'brand' | 'destructive' | …`. Si escribes `variant="primario"`, no compila.
3. **`React.ComponentProps<'button'>`** hace que `Button` acepte **todas** las props de un `<button>` nativo (`type`, `disabled`, `onClick`, `aria-label`…), que se propagan con `{...props}`. El componente se usa exactamente como un botón HTML con superpoderes.
4. **`asChild`** con `Slot` presta todo lo anterior a otro elemento, como un `Link` (capítulo 9).
5. **`data-slot="button"`** marca el elemento para que otros componentes puedan estilarlo desde fuera con selectores como `*:data-[slot=…]`.

::: proyecto
La variante `brand` y el tamaño `icon-sm` **no existen en el catálogo original**: los añadió el proyecto. `brand` es el botón cian de acción principal (*Nueva aplicación*) e `icon-sm` es el tamaño de los botones de la paginación y de las acciones de fila. Del mismo modo, `Alert` tiene variantes `success` e `info` propias, usadas en la confirmación de alta. Es exactamente la ventaja del modelo: el componente se adapta al proyecto, no al revés.
:::

## Anatomía de un componente compuesto: `Select`

Los componentes interactivos de shadcn/ui son **envoltorios finos** sobre las piezas de Radix, con estilos de Tailwind:

```tsx title="src/components/ui/select.tsx (extracto)"
function SelectTrigger({ className, size = 'default', children, ...props }:
  React.ComponentProps<typeof SelectPrimitive.Trigger> & { size?: 'sm' | 'default' }) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        'border-input data-[placeholder]:text-muted-foreground … aria-invalid:border-destructive flex w-fit … rounded-md border bg-card px-3 py-2 text-sm … data-[size=default]:h-9 data-[size=sm]:h-8 …',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}
```

- El tipo de las props es el de la pieza de Radix (`React.ComponentProps<typeof SelectPrimitive.Trigger>`) más lo que añade el envoltorio (`size`).
- Las clases usan los atributos que publica Radix: `data-[placeholder]:text-muted-foreground` pone el texto en gris cuando aún no hay valor.
- `SelectContent` envuelve el contenido en `SelectPrimitive.Portal` y lo anima con `data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95`.

El resultado se usa en el proyecto sin pensar en nada de esto, por ejemplo en el selector de filas por página de `PaginationBar`:

```tsx title="src/components/common/pagination-bar.tsx"
<Select value={String(size)} onValueChange={(value) => onSizeChange(Number(value))} disabled={disabled}>
  <SelectTrigger size="sm" className="w-[72px]" aria-label="Filas por página">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {pageSizeOptions.map((option) => (
      <SelectItem key={option} value={String(option)}>{option}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

Fíjate en las conversiones `String(size)` y `Number(value)`: el `Select` de Radix trabaja siempre con **cadenas**, así que los números se convierten al entrar y al salir. Por la misma razón, `FilterSelect` usa el valor especial `'__ALL__'` para la opción *Todos*: Radix no admite un ítem con valor vacío.

## Los componentes del proyecto

| Componente (`src/components/ui`) | Base | Dónde se usa |
|---|---|---|
| `button` | HTML + `Slot` de Radix | Todas las acciones |
| `badge` | HTML | Disponible; los indicadores propios están en `common/badges` |
| `card` | HTML | Contenedor de listados, formularios y fichas |
| `table` | HTML | Listados de aplicaciones y demandas |
| `input`, `textarea`, `label` | HTML / `Label` de Radix | Formularios y buscadores |
| `select` | `Select` de Radix | Filtros, paginación, campos de criticidad, estado, prioridad y aplicación |
| `form` | React Hook Form + contexto (capítulo 9) | Todos los formularios |
| `alert` | HTML | Errores al guardar y confirmaciones |
| `separator` | `Separator` de Radix | Separación entre filtros y tabla |
| `skeleton` | HTML | Esqueletos de carga |
| `collapsible` | `Collapsible` de Radix | Grupos del menú lateral |
| `sheet` | `Dialog` de Radix | Menú lateral en móvil |
| `tooltip` | `Tooltip` de Radix | Acciones de fila con icono |
| `sonner` | Librería `sonner` | Notificaciones emergentes |

Dos curiosidades: `Sheet` es en realidad un **diálogo modal** de Radix (`Dialog`) con estilos de panel lateral, así que hereda gratis la captura del foco dentro del panel, el cierre con *Escape* y el bloqueo del desplazamiento de la página. Y `Badge` está instalado pero apenas se usa, porque los indicadores de estado y nivel del proyecto (`StatusPill`, `LevelBadge`) tienen un diseño propio en `components/common/badges.tsx`.

## Iconos, notificaciones y fuente

**Iconos.** `lucide-react` ofrece más de mil iconos como componentes de React: `<Plus />`, `<Pencil />`, `<Loader2 className="animate-spin" />`. Son SVG que heredan el color del texto (`currentColor`), se dimensionan con clases (`size-4`) y, al importarse por nombre, solo los usados acaban en el *bundle*. Los botones de shadcn/ui ya dan tamaño por defecto a los iconos que contienen (`[&_svg:not([class*='size-'])]:size-4`).

**Notificaciones.** La librería `sonner` muestra los mensajes emergentes. El contenedor `<Toaster>` está en `App` y se configura en `components/ui/sonner.tsx` con colores ricos (`richColors`), botón de cierre y los tokens del tema. Desde cualquier sitio:

```tsx title="src/features/applications/pages/application-edit-page.tsx"
toast.success('Cambios guardados', { description: `«${result.name}» se ha actualizado.` })
```

**Fuente.** `@fontsource-variable/inter` incluye la fuente Inter en el propio *bundle*, como fichero `woff2`, y la declara con `@font-face`. Es una fuente **variable**: un único fichero contiene todos los grosores. Servirla desde el propio proyecto evita depender de un servicio externo (algo relevante en redes corporativas) y no envía datos de los usuarios a terceros. En `index.css`, `font-feature-settings: 'cv11', 'ss01'` activa variantes tipográficas de Inter más legibles en interfaces.

## Mantener componentes copiados

El modelo de shadcn/ui tiene una contrapartida: como el código es tuyo, **las mejoras del catálogo no llegan solas**. Algunas pautas para convivir con ello:

- **No metas lógica de negocio en `components/ui`.** Esa carpeta contiene piezas genéricas de interfaz. Lo que sabe de aplicaciones o demandas va en `components/common` o en el módulo correspondiente (capítulo 13).
- **Personaliza con intención y documenta.** Añadir variantes (como `brand`) es lo esperado. Cambios profundos de comportamiento conviene hacerlos en un componente propio que envuelva al de `ui`.
- **Para actualizar un componente**, ejecuta de nuevo `npx shadcn@latest add <componente>` en una rama, compara las diferencias con Git y vuelve a aplicar tus personalizaciones.
- **Las dependencias reales** (`radix-ui`, `cva`, `lucide-react`) sí se actualizan con npm como cualquier otra.

::: decision shadcn/ui sobre Radix en lugar de una librería de componentes completa
**Decisión.** Componentes de interfaz de shadcn/ui, copiados al proyecto, sobre los primitivos de Radix y estilados con Tailwind y los tokens propios.

**Motivos.** Accesibilidad y comportamiento de nivel profesional sin escribirlos; control total sobre el aspecto, coherente con la identidad visual (azul oscuro, pizarra y cian); sin dependencia de un sistema de estilos ajeno; y solo se incluye lo que se usa.

**Inconvenientes asumidos.** Hay que mantener el código copiado y no existe un componente para todo: tablas avanzadas (con columnas redimensionables, agrupación…) o selectores de fecha requieren combinar piezas o librerías específicas, como TanStack Table.

**Alternativas.** MUI o Ant Design (catálogo enorme, difícil de personalizar a fondo); Mantine o Chakra UI (más personalizables, pero con su propio sistema de estilos); escribir los componentes desde cero (control total, coste y riesgo de accesibilidad altísimos).
:::

## Errores típicos y depuración

- **Un desplegable o *tooltip* aparece recortado o detrás de otro elemento.** Comprueba que el contenido está dentro de su `Portal`. En *Elements* deberías verlo al final del `<body>`.
- **`A <Select.Item /> must have a value prop that is not an empty string`.** Radix no admite valores vacíos. Usa un valor especial, como hace `FilterSelect` con `'__ALL__'`.
- **El valor del `Select` llega como texto.** Siempre es una cadena: convierte con `Number()` cuando el dato sea numérico.
- **Aviso en consola de `DialogContent` sin título.** Radix exige un título accesible en los diálogos. Si no debe verse, se oculta visualmente con `sr-only`, como hace la cabecera con `SheetTitle` y `SheetDescription`.
- **`asChild` no funciona.** El hijo debe ser un único elemento capaz de recibir props y una `ref` (un componente de función normal de React 19 la recibe como prop).

Para inspeccionar el estado de Radix, mira en *Elements* los atributos `data-state`, `aria-expanded` y `aria-controls` de los disparadores: es la forma más rápida de saber si el componente cree estar abierto o cerrado.

## Ejercicios

::: ejercicio Añade un componente del catálogo
Añade el componente `dialog` con `npx shadcn@latest add dialog` y revisa el fichero generado en `src/components/ui/dialog.tsx`: ¿qué primitivo de Radix envuelve y qué piezas exporta? Úsalo para mostrar un diálogo de confirmación al pulsar *Descartar* en la página de modificación de una aplicación cuando hay cambios sin guardar. Pista: la propiedad `open` del diálogo puede venir de un `useState`.
:::

::: ejercicio Crea una variante de botón
Añade una variante `success` al botón (fondo verde con el token `--success`, texto blanco) y úsala temporalmente en *Guardar cambios*. ¿Qué tipo infiere TypeScript ahora para la prop `variant`? Comprueba que el editor te la ofrece al autocompletar.
:::

::: ejercicio Comprueba la accesibilidad con el teclado
Sin usar el ratón, recorre el listado de aplicaciones con *Tab*: abre el filtro de estado con *Intro*, muévete con las flechas, elige una opción y continúa hasta la paginación. Después abre el menú móvil (reduce la ventana) y comprueba que el foco queda atrapado dentro del panel y que *Escape* lo cierra. Inspecciona los atributos `aria-*` del disparador del filtro antes y después de abrirlo.
:::

## Autoevaluación

::: preguntas
1. ¿Qué significa que Radix sea una librería *headless*?
2. Enumera tres comportamientos de un desplegable que Radix resuelve por ti.
3. ¿Para qué sirve un portal y por qué lo necesitan los desplegables?
4. ¿Por qué shadcn/ui no aparece en `package.json`?
5. ¿Qué hacen `cva` y `VariantProps` en `button.tsx`?
6. ¿Por qué `Button` acepta `type`, `disabled` u `onClick` sin declararlos uno a uno?
7. ¿Por qué el `Select` de la paginación convierte el tamaño con `String()` y `Number()`?
8. ¿Qué componente de Radix hay detrás de `Sheet` y qué ventajas hereda?
9. ¿Qué contrapartida tiene copiar los componentes en lugar de instalarlos?
:::
