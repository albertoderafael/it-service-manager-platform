# Composición, contexto y límites de error

<p class="lead">Con componentes, estado y hooks ya se puede construir cualquier pantalla. Este último capítulo de la Parte III trata de cómo se <em>combinan</em> esas piezas en una aplicación de verdad: cómo se reutiliza sin herencia, cómo llegan los servicios globales a cualquier componente sin pasarlos de mano en mano, y cómo se evita que un error en una pantalla deje la aplicación en blanco.</p>

## Composición en lugar de herencia

En React no se reutiliza mediante herencia (no verás nunca `class TablaDeAplicaciones extends Tabla`), sino mediante **composición**: componentes que contienen otros componentes y que dejan huecos para que quien los usa decida qué poner.

### Componentes compuestos

Muchos componentes de interfaz no son una pieza, sino una **familia** de piezas pensadas para usarse juntas. La tarjeta es el ejemplo más claro:

```tsx title="src/features/applications/pages/application-create-page.tsx (simplificado)"
<Card className="max-w-3xl">
  <CardHeader className="border-b">
    <CardTitle>Datos de la aplicación</CardTitle>
    <CardDescription><RequiredFieldsNote /></CardDescription>
  </CardHeader>
  <CardContent className="grid gap-6">…campos…</CardContent>
  <CardFooter className="justify-end gap-2 border-t">…botones…</CardFooter>
</Card>
```

`Card` no sabe que contendrá un formulario; `CardHeader`, `CardContent` y `CardFooter` aportan la estructura y los estilos de cada zona, y la página decide qué va dentro y en qué orden. Lo mismo ocurre con la tabla (`Table`, `TableHeader`, `TableRow`, `TableCell`…) o con el desplegable (`Select`, `SelectTrigger`, `SelectContent`, `SelectItem`). Es mucho más flexible que un único componente con veinte props de configuración.

### Especialización por composición

Para crear una variante de un componente, se **envuelve** en otro que fija algunas props. Los campos del formulario de aplicaciones son un ejemplo de dos niveles:

```tsx title="src/features/applications/components/application-form-fields.tsx"
export function NameField() {
  return (
    <TextInputField name="name" label="Nombre" required maxLength={NAME_MAX_LENGTH} placeholder="Ej.: SIGMA" />
  )
}
```

- `components/ui/input.tsx` es un campo de texto genérico con los estilos del sistema.
- `components/common/form-fields.tsx` define `TextInputField`: un campo con etiqueta, contador de caracteres, mensaje de error y conexión con el formulario.
- `features/applications/components/application-form-fields.tsx` define `NameField`: un `TextInputField` configurado con el nombre, la etiqueta y la longitud máxima del dominio.

Las páginas de alta y de modificación usan `<NameField />` sin repetir ninguna de esas decisiones.

::: java
Es el principio «favorece la composición sobre la herencia» llevado al extremo. Si en Java resolverías la variación con una jerarquía de clases y métodos `protected` que se sobrescriben, en React se resuelve con componentes que reciben otros componentes o los envuelven. La ventaja es la misma que en Java: sin acoplamiento a una clase base frágil.
:::

## El problema de pasar props de mano en mano

`NameField` no recibe ninguna prop relacionada con el formulario. Y, sin embargo, necesita acceder a él: registrarse, leer su valor, mostrar su error. ¿De dónde lo saca?

La opción ingenua sería pasar el objeto `form` como prop desde la página a cada campo, y de cada campo a sus piezas internas (etiqueta, control, mensaje). Cuando un dato tiene que atravesar varios niveles de componentes que no lo usan solo para llegar a uno que sí, se habla de ***prop drilling*** (perforación de props). Es tedioso, acopla los componentes intermedios a datos que no les interesan y complica cualquier cambio.

## Contexto: datos disponibles para todo un subárbol

El **contexto** de React resuelve ese problema: un componente **proveedor** ofrece un valor, y cualquier descendiente, a cualquier profundidad, puede leerlo directamente.

Tiene tres piezas:

```tsx
// 1. Crear el contexto (normalmente a nivel de módulo), con un valor por defecto
const ThemeContext = createContext<'light' | 'dark'>('light')

// 2. Proveer un valor a un subárbol
<ThemeContext.Provider value="dark">
  <Pagina />
</ThemeContext.Provider>

// 3. Leerlo desde cualquier descendiente
const theme = useContext(ThemeContext)
```

`useContext` busca hacia arriba en el árbol el proveedor más cercano de ese contexto y devuelve su valor. Si el valor cambia, React vuelve a renderizar todos los componentes que lo leen.

### El contexto en los formularios del proyecto

Los formularios encadenan **tres contextos**, y es la mejor forma de verlos en acción:

<figure>
<svg viewBox="0 0 680 270" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="a9" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#c2410c"/></marker></defs>
  <rect x="20" y="10" width="400" height="34" rx="6" fill="#ecfeff" stroke="#0891b2"/>
  <text x="32" y="31" font-weight="700">ApplicationCreatePage</text><text x="200" y="31" font-size="9" fill="#0e7490">const form = useForm(…)</text>
  <rect x="45" y="52" width="375" height="34" rx="6" fill="#0b1220"/>
  <text x="57" y="73" font-weight="700" fill="#fff">&lt;Form {...form}&gt;</text><text x="200" y="73" font-size="9" fill="#a5f3fc">= FormProvider: provee el formulario entero</text>
  <rect x="70" y="94" width="350" height="34" rx="6" fill="#f8fafc" stroke="#94a3b8"/>
  <text x="82" y="115" font-weight="700">&lt;NameField /&gt; → &lt;TextInputField name="name"&gt;</text>
  <rect x="95" y="136" width="325" height="34" rx="6" fill="#0b1220"/>
  <text x="107" y="157" font-weight="700" fill="#fff">&lt;FormField&gt;</text><text x="200" y="157" font-size="9" fill="#a5f3fc">provee el nombre del campo: "name"</text>
  <rect x="120" y="178" width="300" height="34" rx="6" fill="#0b1220"/>
  <text x="132" y="199" font-weight="700" fill="#fff">&lt;FormItem&gt;</text><text x="200" y="199" font-size="9" fill="#a5f3fc">provee un id único (useId)</text>
  <rect x="145" y="220" width="275" height="40" rx="6" fill="#fff7ed" stroke="#fdba74"/>
  <text x="157" y="237" font-weight="700">FormLabel · FormControl · FormMessage</text>
  <text x="157" y="251" font-size="9" fill="#9a3412">useFormField() lee los tres contextos</text>
  <path d="M430,240 C520,240 520,69 422,69" fill="none" stroke="#c2410c" stroke-width="1.3" marker-end="url(#a9)"/>
  <path d="M430,246 C545,246 545,153 422,153" fill="none" stroke="#c2410c" stroke-width="1.3" marker-end="url(#a9)"/>
  <path d="M430,252 C570,252 570,195 422,195" fill="none" stroke="#c2410c" stroke-width="1.3" marker-end="url(#a9)"/>
  <text x="590" y="120" font-size="9" fill="#c2410c">cada pieza</text>
  <text x="590" y="132" font-size="9" fill="#c2410c">lee hacia arriba</text>
  <text x="590" y="144" font-size="9" fill="#c2410c">sin recibir props</text>
</svg>
<figcaption><b>Figura 9.1.</b> Los proveedores de contexto de un formulario. Las piezas del campo encuentran el formulario, su nombre y su identificador sin que nadie se los pase.</figcaption>
</figure>

1. **`<Form {...form}>`** es el `FormProvider` de React Hook Form: pone el formulario completo a disposición del subárbol. Por eso `TextInputField` puede hacer `const { control } = useFormContext()` y solo necesita el `name`.
2. **`<FormField>`**, de shadcn/ui, crea un contexto propio con el nombre del campo:

```tsx title="src/components/ui/form.tsx"
const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

const FormField = ({ ...props }: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}
```

3. **`<FormItem>`** genera un identificador único con `useId()` y lo provee en otro contexto.

Por último, un hook personalizado reúne los tres:

```tsx title="src/components/ui/form.tsx (simplificado)"
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const fieldState = getFieldState(fieldContext.name, /* … */)
  const { id } = itemContext
  return { id, name: fieldContext.name, formItemId: `${id}-form-item`, /* … */ ...fieldState }
}
```

Con eso, `FormLabel` puede apuntar su `htmlFor` al identificador del control, `FormControl` puede marcar `aria-invalid` si hay error, y `FormMessage` puede mostrar el mensaje de error del campo. Ninguno recibe una sola prop relacionada con el formulario.

::: java
El contexto es la forma que tiene React de hacer **inyección de dependencias**, pero por posición en el árbol en lugar de por tipo en un contenedor global. Un proveedor es como un `@Bean` declarado en un ámbito concreto (*request scope*, o el de una sección de la interfaz), y `useContext` es como un `@Autowired` que busca la definición más cercana hacia arriba. Igual que en Spring, pueden coexistir varias instancias del mismo tipo en ámbitos distintos: cada campo del formulario tiene su propio `FormFieldContext`.
:::

## Los proveedores globales de `app.tsx`

En el capítulo 1 vimos el componente `App`. Ahora puede leerse con otros ojos:

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

| Proveedor | Qué pone a disposición del árbol | Quién lo consume |
|---|---|---|
| `QueryClientProvider` | La instancia de `QueryClient`, que contiene la caché de datos del servidor | `useQuery`, `useMutation`, `useQueryClient` |
| `TooltipProvider` | La configuración compartida de los *tooltips* (retardos, coordinación entre varios) | Los componentes `Tooltip` |
| `RouterProvider` | El estado de navegación: URL actual, parámetros, funciones de navegación | `useParams`, `useNavigate`, `Link`… |
| `Toaster` | No es un proveedor, sino el contenedor donde aparecen las notificaciones | `toast.success(…)` desde cualquier sitio |

El **orden importa**: un componente solo puede leer los contextos de sus antepasados. Como `RouterProvider` está **dentro** de `QueryClientProvider`, todas las páginas que pinta el router pueden usar consultas. Si estuviera fuera, `useQuery` fallaría con el error *No QueryClient set, use QueryClientProvider to set one*.

::: proyecto
`Toaster` merece un comentario: la función `toast` de `sonner` se importa y se llama desde cualquier sitio, incluso desde fuera de un componente, sin contexto de React. La librería usa su propio almacén interno y `Toaster` se suscribe a él. Es un patrón habitual para servicios globales muy simples: un único contenedor montado en la raíz y una función importable.
:::

## Cuándo usar contexto y cuándo no

El contexto es una herramienta potente, pero no es un almacén de estado global para todo:

- **Cada cambio del valor renderiza a todos sus consumidores.** Un contexto con datos que cambian a menudo (por ejemplo, el valor de un campo en cada pulsación) puede provocar muchos renderizados innecesarios. Por eso React Hook Form no guarda los valores en un contexto que se renderiza en cada pulsación, sino en un almacén propio con suscripciones finas (`useWatch` se suscribe solo al campo que observa).
- **No es para datos del servidor.** Para eso está TanStack Query, que ya usa un contexto para dar acceso a su caché y añade todo lo demás (Parte VI).
- **Úsalo para:** servicios e instancias (el `QueryClient`), configuración de un subárbol (el tema, el idioma, el usuario autenticado) y familias de componentes que comparten información interna (formularios, menús, pestañas).

::: decision Sin librería de estado global
**Contexto.** Muchas aplicaciones React incorporan Redux, Zustand o similares para el estado global.

**Decisión.** No usar ninguna. El estado del proyecto se reparte así: datos del servidor en TanStack Query, navegación y filtros en la URL, formularios en React Hook Form, y lo puramente local en `useState`. Lo que queda para un estado global de interfaz es mínimo (notificaciones y *tooltips*) y lo resuelven sus propias librerías.

**Cuándo reconsiderarlo.** Si aparece estado de cliente compartido por muchas pantallas y que cambia con frecuencia (por ejemplo, preferencias de usuario editables, un carrito, un asistente de varios pasos), Zustand es una opción ligera. Un contexto propio basta para datos que cambian poco, como el usuario autenticado cuando se añada la seguridad.
:::

## Más patrones de composición del proyecto

### `asChild`: prestar el comportamiento a otro elemento

El botón del sistema de diseño pinta un `<button>`. Pero a veces queremos el **aspecto** de un botón con el **comportamiento** de un enlace de React Router:

```tsx title="src/features/applications/pages/applications-list-page.tsx"
<Button asChild variant="brand">
  <Link to="/aplicaciones/nueva">
    <Plus /> Nueva aplicación
  </Link>
</Button>
```

Con `asChild`, `Button` no pinta su propio elemento: usa el componente `Slot` de Radix, que **fusiona** las props del botón (clases, estilos de la variante, atributos) en su único hijo, el `Link`. El resultado en el DOM es un único `<a>` con aspecto de botón y navegación de React Router. Sin este patrón habría que anidar un enlace dentro de un botón (HTML no válido) o duplicar los estilos del botón en un enlace.

```tsx title="src/components/ui/button.tsx (extracto)"
const Comp = asChild ? Slot.Root : 'button'
```

`FormControl` usa el mismo mecanismo para añadir `id`, `aria-describedby` y `aria-invalid` al campo que envuelve, sea un `Input`, un `Textarea` o el disparador de un `Select`.

### *Render props*: pasar una función que pinta

`FormField` no recibe hijos, sino una prop `render` que es **una función que devuelve JSX**:

```tsx title="src/components/common/form-fields.tsx (simplificado)"
<FormField
  control={control}
  name={name}
  render={({ field }) => (
    <FormItem>
      <FormLabel required={required}>{label}</FormLabel>
      <FormControl>
        <Input placeholder={placeholder} {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

`FormField` (en realidad el `Controller` de React Hook Form que lleva dentro) llama a esa función con el objeto `field`, que contiene `value`, `onChange`, `onBlur`, `name` y `ref`, y pinta lo que devuelve. `{...field}` conecta el campo con el formulario en una línea. Este patrón permite que el componente controle los **datos** y quien lo usa controle la **presentación**.

## Límites de error

Si un componente lanza una excepción durante el renderizado (por ejemplo, accede a una propiedad de `undefined`), React no puede saber qué pintar en esa parte del árbol. Por defecto, **desmonta toda la aplicación** y deja la página en blanco.

Un **límite de error** (*error boundary*) es un componente que captura los errores de renderizado de sus descendientes y muestra una interfaz alternativa en su lugar, igual que un `try/catch` para una parte del árbol. En el proyecto, el router se encarga de ello mediante `errorElement`:

```tsx title="src/app/router.tsx (extracto)"
{
  path: '/',
  element: <AppLayout />,
  children: [
    {
      errorElement: <RouteErrorPage />,
      children: [ /* rutas de aplicaciones, demandas, 404 */ ],
    },
  ],
}
```

La posición del `errorElement` está elegida con cuidado: es una ruta **sin ruta propia** (no tiene `path`), situada **dentro** de `AppLayout`. Si una página falla, se sustituye solo el contenido por `RouteErrorPage`, y **el menú lateral y la cabecera siguen funcionando**: el usuario puede irse a otra sección.

```tsx title="src/pages/route-error-page.tsx"
/** Captura errores inesperados de renderizado para no dejar la pantalla en blanco. */
export function RouteErrorPage() {
  const error = useRouteError()
  // … construye un mensaje legible a partir del error …
  return (
    <div className="…">
      <h1 className="text-xl font-semibold">Se ha producido un error inesperado</h1>
      <p className="…">{message}</p>
      <Button variant="outline" onClick={() => window.location.assign('/aplicaciones')}>
        Volver al inicio
      </Button>
    </div>
  )
}
```

Fíjate en que *Volver al inicio* usa `window.location.assign` en lugar de `navigate`: provoca una **recarga completa**. Tras un error inesperado, el estado en memoria puede estar corrupto; recargar es la forma más segura de empezar limpio.

::: atencion
Los límites de error capturan errores **durante el renderizado** (y en efectos y constructores). **No** capturan errores en manejadores de eventos ni en código asíncrono: un fallo dentro de `onClick` o de una promesa no llega a `RouteErrorPage`. Por eso los errores de la API no se gestionan con límites de error, sino de forma explícita: TanStack Query los expone como `query.error` o `mutation.error` y cada pantalla los muestra con `ErrorState` o con una alerta.
:::

## Carga diferida y espera

El capítulo 1 explicó que cada página se descarga bajo demanda mediante `lazy()`. Mientras se descarga, algo hay que mostrar. React tiene un mecanismo general para ello, **`Suspense`**: un componente que muestra una interfaz de espera mientras alguno de sus descendientes «suspende» porque espera algo (código o datos).

En el proyecto, la espera de las páginas la gestiona el router:

- Durante la **carga inicial** (abrir directamente `/aplicaciones`), muestra `hydrateFallbackElement`, el `LoadingState` a pantalla completa.
- Durante una **navegación posterior**, el router mantiene la pantalla anterior hasta que la nueva está lista, de modo que no hay parpadeos.

La espera de los **datos** no usa `Suspense`, sino los estados explícitos de cada consulta (`isPending`, `isError`), con esqueletos de carga adaptados a cada pantalla. Es una decisión deliberada: hace visibles en el código todos los estados posibles, que es lo que vimos en el capítulo 6.

## Errores típicos y depuración

- **`No QueryClient set, use QueryClientProvider to set one`**, **`useNavigate() may be used only in the context of a <Router> component`** o **`useFormContext` devuelve `null`.** El componente se está renderizando fuera de su proveedor. Comprueba la jerarquía en React DevTools; ocurre a menudo en pruebas o al mover un componente.
- **`useFormField should be used within <FormField>`.** Has usado `FormLabel`, `FormControl` o `FormMessage` fuera de un `FormField`.
- **Un enlace con aspecto de botón no navega, o el HTML tiene un `<a>` dentro de un `<button>`.** Falta `asChild`, o el hijo no es un único elemento.
- **La aplicación se queda en blanco tras un error.** El error se ha producido fuera de la zona cubierta por `errorElement` (por ejemplo, en `AppLayout` o en `App`). Revisa la consola.
- **Muchos renderizados al cambiar un dato de un contexto.** Todos los consumidores se renderizan; considera dividir el contexto o usar un almacén con suscripciones.

En React DevTools, los proveedores aparecen en el árbol como `Context.Provider` (o con el nombre del contexto) y, al seleccionar un componente, el panel derecho muestra los contextos que consume.

## Ejercicios

::: ejercicio Sigue los contextos de un campo
Con React DevTools, selecciona en la página *Nueva aplicación* el componente `FormLabel` del campo *Nombre*. Recorre sus antepasados hasta encontrar `FormItem`, `FormField` y el `FormProvider`. ¿Qué valor provee cada uno? Después, en el código, sigue cómo llega a `FormLabel` el `id` que usa en `htmlFor` y comprueba en la pestaña *Elements* que coincide con el `id` del `<input>`.
:::

::: ejercicio Crea un contexto propio
Crea un contexto `DensityContext` con los valores `'comfortable' | 'compact'` y un proveedor que se coloque en `AppLayout`. Añade en la cabecera un botón que alterne la densidad y haz que `ApplicationsTable` la lea con `useContext` para reducir el relleno de las celdas en modo compacto. Reflexiona: ¿debería este dato vivir en un contexto, en la URL o en el almacenamiento del navegador? ¿Qué ventajas e inconvenientes tiene cada opción?
:::

::: ejercicio Provoca un error de renderizado
En `applications-table.tsx`, añade temporalmente dentro del `map` una línea que lance un error si el identificador de la aplicación es 1: `if (app.id === 1) throw new Error('Fallo de prueba')`. Abre el listado. ¿Qué ves? ¿Sigue funcionando el menú lateral? Ahora mueve el `throw` a un manejador `onClick` de un botón y pulsa el botón. ¿Lo captura `RouteErrorPage`? ¿Por qué? Deshaz los cambios.
:::

## Autoevaluación

::: preguntas
1. ¿Cómo se reutiliza y especializa un componente en React si no hay herencia?
2. ¿Qué es el *prop drilling* y qué problema causa?
3. ¿Cuáles son las tres piezas del contexto de React?
4. ¿Cómo consigue `NameField` acceder al formulario sin recibirlo por props?
5. ¿Por qué `RouterProvider` debe estar dentro de `QueryClientProvider`?
6. ¿Qué inconveniente tiene guardar en un contexto un valor que cambia muy a menudo?
7. ¿Qué hace la prop `asChild` de `Button`?
8. ¿Por qué el `errorElement` está dentro de `AppLayout` y no por encima?
9. ¿Captura un límite de error un fallo dentro de un `onClick`? ¿Y un error de la API?
:::
