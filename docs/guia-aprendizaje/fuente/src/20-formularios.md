# Formularios con React Hook Form y Zod

<p class="lead">Los formularios de alta y modificación son la parte de la aplicación con más reglas: campos obligatorios, longitudes máximas, valores permitidos, transformaciones antes de enviar, errores del servidor que hay que colocar en su campo y estados como «hay cambios sin guardar». El proyecto reparte ese trabajo entre dos librerías: Zod describe y valida los datos, y React Hook Form gestiona el estado del formulario. Este capítulo explica ambas y cómo encajan con los componentes de shadcn/ui.</p>

## El problema de los formularios

Un formulario aparentemente sencillo, como el alta de una aplicación, obliga a gestionar mucho estado:

- El **valor** de cada campo y si se ha modificado respecto al inicial (*dirty*).
- Los **errores** de cada campo, y cuándo mostrarlos: ¿al escribir, al salir del campo, al enviar?
- La **validación**: reglas por campo y, a veces, reglas entre campos o que dependen de otros datos.
- La **transformación** de lo que hay en pantalla a lo que espera la API: textos recortados, cadenas vacías como `null`, identificadores de texto a número.
- El **envío**: evitar dobles envíos, mostrar «Guardando…», tratar el error del servidor y colocar sus errores por campo.
- El **reinicio**: limpiar el formulario, descartar cambios o cargar los datos devueltos por el servidor.

Hacerlo a mano con un `useState` por campo es tedioso, propenso a errores y lento: cada pulsación de tecla renderizaría el formulario entero. Por eso casi todos los proyectos React usan una librería.

## Zod: describir y validar datos

**Zod** es una librería para declarar **esquemas**: descripciones de la forma y las reglas de unos datos, con las que se puede validar cualquier valor en ejecución y, a la vez, derivar sus tipos de TypeScript.

```ts
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(100),
  criticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
})

schema.parse({ name: '  SIGMA ', criticality: 'HIGH' })     // { name: 'SIGMA', criticality: 'HIGH' }
schema.parse({ name: '', criticality: 'URGENT' })           // lanza ZodError con dos «issues»
schema.safeParse({ name: '' })                             // { success: false, error: ZodError }
```

- `parse` devuelve los datos validados (y transformados) o lanza un error; `safeParse` devuelve un objeto con `success` y los datos o el error, sin lanzar.
- Cada fallo es un ***issue*** con la ruta del campo (`path: ['name']`) y el mensaje.
- Los métodos se encadenan: `trim()` **transforma** (recorta espacios) y `min`/`max` **validan**.

Recuerda el capítulo 2: los tipos de TypeScript desaparecen en ejecución y no pueden validar lo que escribe un usuario. Zod cubre exactamente ese hueco.

### Los esquemas del proyecto, alineados con Bean Validation

```ts title="src/features/applications/model/schemas.ts"
/*
 * Esquemas de validación de formularios. Reflejan las restricciones de
 * Bean Validation de los DTO del backend (@NotBlank, @Size, @Pattern), de modo
 * que el usuario recibe los errores antes de enviar la petición.
 */
const nameField = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio.')
  .max(NAME_MAX_LENGTH, `El nombre no puede superar los ${NAME_MAX_LENGTH} caracteres.`)

const descriptionField = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX_LENGTH, `La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres.`)

const criticalityField = z.enum(APPLICATION_CRITICALITIES, {
  errorMap: () => ({ message: 'Selecciona una criticidad.' }),
})

const statusField = z.enum(APPLICATION_STATUSES, {
  errorMap: () => ({ message: 'Selecciona un estado.' }),
})

export const applicationCreateSchema = z.object({
  name: nameField,
  description: descriptionField,
  criticality: criticalityField,
})

export const applicationUpdateSchema = applicationCreateSchema.extend({
  status: statusField,
})
```

| Bean Validation (backend) | Zod (frontend) |
|---|---|
| `@NotBlank` | `z.string().trim().min(1, '…')` |
| `@Size(max = 100)` | `.max(100, '…')`, con la constante `NAME_MAX_LENGTH` |
| `@NotNull` sobre un enumerado | `z.enum(VALORES)`: rechaza `undefined` y cualquier valor fuera de la lista |
| `@Pattern(regexp = "…")` | `.regex(/…/, '…')` |
| Herencia o composición de DTO | `.extend({ … })`: la modificación es el alta más el estado |

Detalles a observar:

- **Las listas de valores vienen de `types.ts`** (`APPLICATION_CRITICALITIES`): el mismo array de los tipos, los desplegables y la validación de la URL.
- **Las longitudes vienen de `constants.ts`**: los mismos números que muestran los contadores de caracteres.
- **Los mensajes están en español** y se personalizan por campo. Para los enumerados, la opción `errorMap` de Zod 3 sustituye el mensaje genérico («Invalid enum value…») por uno comprensible.

::: java
Es la misma idea que anotar un DTO con Bean Validation, pero con los datos y las reglas en un objeto en lugar de en anotaciones. Igual que en Spring, el esquema es la **fuente única de las reglas** del formulario. Y, como en cualquier arquitectura cliente-servidor, la validación del cliente es una comodidad: el backend vuelve a validarlo todo (capítulo 1).
:::

### Tipos de entrada y de salida

Un esquema con transformaciones tiene **dos tipos**: lo que entra y lo que sale. Zod los deriva:

```ts title="src/features/applications/model/schemas.ts"
/** Valores del formulario tal y como los maneja React Hook Form (antes de validar). */
export type ApplicationCreateFormInput = z.input<typeof applicationCreateSchema>
export type ApplicationCreateFormValues = z.output<typeof applicationCreateSchema>
```

En aplicaciones ambos coinciden casi del todo, pero en demandas la diferencia es clara:

```ts title="src/features/demands/model/schemas.ts"
/** El desplegable trabaja con texto; se envía al backend como número. */
const applicationIdField = z
  .string({ required_error: 'Selecciona una aplicación.', invalid_type_error: 'Selecciona una aplicación.' })
  .regex(/^\d+$/, 'Selecciona una aplicación.')
  .transform(Number)
```

La **entrada** es `string` (lo que maneja el `Select` de Radix, capítulo 11) y la **salida** es `number` (lo que espera `DemandCreateRequest.applicationId`). El formulario trabaja con texto y, al validar, recibe el número listo para enviar. No hay conversiones manuales repartidas por la página.

## React Hook Form: el estado del formulario

**React Hook Form** gestiona valores, errores, estado de modificación y envío. Su característica distintiva es el **rendimiento**: guarda el estado fuera de React, en un almacén propio, y solo vuelve a renderizar los componentes suscritos a lo que cambia. Escribir en un campo no renderiza el formulario entero.

```tsx title="src/features/applications/pages/application-edit-page.tsx (extracto)"
const form = useForm<ApplicationUpdateFormInput, unknown, ApplicationUpdateFormValues>({
  resolver: zodResolver(applicationUpdateSchema),
  defaultValues: toFormValues(application),
  mode: 'onSubmit',
})
const { isDirty } = form.formState
```

| Pieza | Qué hace |
|---|---|
| Genéricos `<Input, Context, Output>` | El tipo de los valores del formulario y el de los valores ya validados que recibirá el manejador de envío |
| `resolver: zodResolver(schema)` | Delega la validación en el esquema de Zod: los *issues* se convierten en errores por campo |
| `defaultValues` | Valores iniciales; también son la referencia para saber si hay cambios (`isDirty`) |
| `mode: 'onSubmit'` | La validación se ejecuta al enviar; después del primer intento, se revalida al cambiar cada campo |
| `form.formState` | Estado: `isDirty`, `errors`, `isSubmitting`… Solo se renderiza lo que se lee |
| `form.handleSubmit(fn)` | Valida y, solo si es correcto, llama a `fn` con los valores de salida |
| `form.reset(valores?)` | Vuelve a los valores iniciales o a unos nuevos, que pasan a ser la referencia |
| `form.setError(campo, error)` | Marca un error en un campo desde fuera (los del servidor) |

::: decision Validar al enviar y revalidar al corregir
Con `mode: 'onSubmit'`, el usuario no ve errores mientras rellena el formulario por primera vez: un mensaje de «obligatorio» en un campo que aún no ha tenido ocasión de rellenar resulta agresivo. Tras el primer intento de envío, los errores se actualizan al escribir, de modo que desaparecen en cuanto se corrigen. Es el comportamiento que menos interrumpe y que más ayuda a corregir.
:::

## La integración con los componentes de shadcn/ui

El capítulo 9 explicó los contextos de `components/ui/form.tsx`. Ahora vemos cómo se usan para construir campos reutilizables.

### El formulario en la página

```tsx title="src/features/applications/pages/application-edit-page.tsx (extracto)"
<Form {...form}>
  <form onSubmit={onSubmit} noValidate className="contents">
    <CardContent className="grid gap-6">
      <div className="grid gap-6 sm:grid-cols-[1fr_16rem]">
        <NameField />
        <CriticalityField />
      </div>
      <DescriptionField />
      <div className="sm:max-w-64"><StatusField /></div>
    </CardContent>
    {/* pie con los botones */}
  </form>
</Form>
```

- `<Form {...form}>` es el `FormProvider` de React Hook Form: los campos encuentran el formulario por contexto.
- `noValidate` desactiva la validación nativa del navegador (los globos de «Rellena este campo»), porque la validación la hace Zod, con mensajes propios y coherentes.
- `className="contents"` hace que el elemento `<form>` no genere una caja propia en el diseño: sus hijos se comportan como hijos directos de la tarjeta.

### Los campos genéricos

```tsx title="src/components/common/form-fields.tsx (extracto)"
export function TextInputField({ name, label, required, description, maxLength, placeholder }: BaseFieldProps & { maxLength: number; placeholder?: string }) {
  const { control } = useFormContext()
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel required={required}>{label}</FormLabel>
            <CharCounter name={name} max={maxLength} />
          </div>
          <FormControl>
            <Input placeholder={placeholder} autoComplete="off" aria-required={required || undefined} {...field} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
```

`FormField` envuelve el `Controller` de React Hook Form: un componente que conecta un campo con el almacén del formulario y entrega, en la función `render`, el objeto `field` (`value`, `onChange`, `onBlur`, `name`, `ref`). `{...field}` lo conecta todo al `Input`. El campo se renderiza cuando cambia su propio valor, no cuando cambian los demás.

Los tres campos genéricos (`TextInputField`, `TextareaField`, `SelectField`) comparten la misma estructura: etiqueta (con asterisco si es obligatorio), control, descripción opcional y mensaje de error. Los módulos los configuran (capítulo 9): `NameField` es un `TextInputField` con nombre, etiqueta y longitud máxima del dominio.

### El contador de caracteres

```tsx title="src/components/common/form-fields.tsx"
function CharCounter({ name, max }: { name: string; max: number }) {
  const { control } = useFormContext()
  const value = (useWatch({ control, name }) as string | undefined) ?? ''
  const length = value.length
  return (
    <span className={cn('text-xs leading-none tabular-nums text-muted-foreground', length > max && 'font-medium text-destructive')}
          aria-live="polite">
      {length}/{max}
    </span>
  )
}
```

`useWatch` suscribe **solo este componente** a los cambios del campo indicado: al escribir, se renderiza el contador, no el formulario. Observa que el `Input` no lleva atributo `maxLength`: el usuario puede escribir más de la cuenta, el contador se pone en rojo y el error aparece al enviar. Es una decisión de experiencia de uso: cortar en seco lo que se pega desde otro documento hace que el texto se pierda sin aviso.

### El desplegable, un campo controlado

```tsx title="src/components/common/form-fields.tsx (extracto)"
<Select value={(field.value as string | undefined) ?? ''} onValueChange={field.onChange} disabled={disabled}>
  <FormControl>
    <SelectTrigger className="w-full" onBlur={field.onBlur} ref={field.ref} aria-required={required || undefined}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
  </FormControl>
  <SelectContent>{/* opciones, algunas desactivadas */}</SelectContent>
</Select>
```

El `Select` de Radix no es un `<select>` nativo, así que no se le puede pasar `{...field}` tal cual: se conecta pieza a pieza. `value` y `onValueChange` sincronizan el valor; `onBlur` permite saber cuándo se ha tocado el campo; `ref` permite que React Hook Form le dé el foco al primer campo con error. El valor vacío `''` muestra el texto de ayuda (*placeholder*).

## De los valores del formulario al DTO

Los valores del formulario no son exactamente el cuerpo de la petición. La página los transforma al enviar:

```tsx title="src/features/applications/pages/application-edit-page.tsx (extracto)"
const result = await mutation.mutateAsync({
  name: values.name,                                       // ya recortado por Zod
  description: normalizeDescription(values.description),  // '' → null
  criticality: values.criticality,
  status: values.status,
})
```

```ts title="src/features/applications/model/schemas.ts"
/** Una descripción vacía se envía como null para no almacenar cadenas vacías. */
export function normalizeDescription(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
```

Y al revés, al cargar un registro para editarlo, se convierte el DTO en valores de formulario:

```ts title="src/features/applications/pages/application-edit-page.tsx"
function toFormValues(app: Application): ApplicationUpdateFormInput {
  return {
    name: app.name,
    description: app.description ?? '',   // null → '' (un textarea no admite null)
    criticality: app.criticality,
    status: app.status,
  }
}
```

| Campo | En la API | En el formulario | Conversión |
|---|---|---|---|
| Descripción vacía | `null` | `''` | `?? ''` al cargar; `normalizeDescription` al enviar |
| Aplicación de una demanda | `number` | `string` | `String()` al cargar; `transform(Number)` en el esquema |
| Criticidad o prioridad sin elegir (alta) | — | `undefined` | Valor inicial «vacío» que el esquema rechaza al enviar |

Sobre la última fila: el tipo de entrada de `z.enum` no admite `undefined`, pero el formulario de alta necesita empezar sin criticidad elegida. El proyecto lo resuelve con una aserción explícita en el valor inicial (`undefined as unknown as …['criticality']`), consciente de que es un valor provisional que el esquema rechazará con el mensaje «Selecciona una criticidad.». Es un compromiso habitual con React Hook Form; la alternativa más limpia sería que el tipo de entrada admitiera `undefined` (con `z.enum(…).optional()` y un `refine` que lo exija).

## El ciclo de envío completo

<figure>
<svg viewBox="0 0 680 270" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="9.5">
  <defs><marker id="a20" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="10" y="20" width="120" height="44" rx="8" fill="#fff7ed" stroke="#fdba74"/><text x="70" y="40" text-anchor="middle" font-weight="700">Guardar cambios</text><text x="70" y="54" text-anchor="middle" font-size="8.5">submit</text>
  <line x1="130" y1="42" x2="168" y2="42" stroke="#0891b2" stroke-width="1.4" marker-end="url(#a20)"/>
  <rect x="170" y="20" width="150" height="44" rx="8" fill="#ecfeff" stroke="#0891b2"/><text x="245" y="40" text-anchor="middle" font-weight="700">handleSubmit</text><text x="245" y="54" text-anchor="middle" font-size="8.5">esquema de Zod</text>
  <line x1="245" y1="64" x2="245" y2="98" stroke="#c2410c" stroke-width="1.4" marker-end="url(#a20)"/>
  <rect x="170" y="100" width="150" height="44" rx="8" fill="#fef2f2" stroke="#fca5a5"/><text x="245" y="120" text-anchor="middle" font-weight="700">Errores en los campos</text><text x="245" y="134" text-anchor="middle" font-size="8.5">foco en el primero · sin petición</text>
  <line x1="320" y1="42" x2="358" y2="42" stroke="#0891b2" stroke-width="1.4" marker-end="url(#a20)"/>
  <text x="339" y="34" text-anchor="middle" font-size="8" fill="#0e7490">válido</text>
  <rect x="360" y="20" width="150" height="44" rx="8" fill="#0b1220"/><text x="435" y="40" text-anchor="middle" font-weight="700" fill="#fff">mutateAsync(dto)</text><text x="435" y="54" text-anchor="middle" font-size="8.5" fill="#a5f3fc">PUT /api/applications/7</text>
  <line x1="510" y1="42" x2="548" y2="42" stroke="#0891b2" stroke-width="1.4" marker-end="url(#a20)"/>
  <rect x="550" y="20" width="120" height="44" rx="8" fill="#fff7ed" stroke="#fdba74"/><text x="610" y="40" text-anchor="middle" font-weight="700">Backend</text><text x="610" y="54" text-anchor="middle" font-size="8.5">Bean Validation + reglas</text>
  <path d="M610,64 C610,110 560,130 520,150" fill="none" stroke="#22c55e" stroke-width="1.4" marker-end="url(#a20)"/>
  <text x="640" y="110" text-anchor="end" font-size="8.5" fill="#166534">200</text>
  <rect x="360" y="150" width="310" height="54" rx="8" fill="#dcfce7" stroke="#22c55e"/>
  <text x="372" y="168" font-size="9">• caché: setQueryData(detalle) + invalidar listados</text>
  <text x="372" y="182" font-size="9">• form.reset(toFormValues(respuesta)) → sin cambios pendientes</text>
  <text x="372" y="196" font-size="9">• toast «Cambios guardados» y tarjeta con la respuesta</text>
  <path d="M570,64 C540,100 420,190 330,215" fill="none" stroke="#c2410c" stroke-width="1.4" marker-end="url(#a20)"/>
  <text x="470" y="128" font-size="8.5" fill="#c2410c">4xx / 5xx</text>
  <rect x="10" y="200" width="320" height="58" rx="8" fill="#fef2f2" stroke="#fca5a5"/>
  <text x="22" y="218" font-size="9">• applyServerFieldErrors: fieldErrors → mensajes en sus campos</text>
  <text x="22" y="232" font-size="9">• Alert sobre el formulario con el mensaje del servidor</text>
  <text x="22" y="246" font-size="9">• el formulario conserva lo escrito para corregir y reintentar</text>
</svg>
<figcaption><b>Figura 20.1.</b> El envío de un formulario: primero valida el cliente; si es válido, decide el servidor.</figcaption>
</figure>

```tsx title="src/features/applications/pages/application-edit-page.tsx (extracto)"
const onSubmit = form.handleSubmit(async (values) => {
  try {
    const result = await mutation.mutateAsync({ /* DTO */ })
    form.reset(toFormValues(result))
    setUpdated(result)
    toast.success('Cambios guardados', { description: `«${result.name}» se ha actualizado.` })
  } catch (error) {
    applyServerFieldErrors(error, form.setError, ['name', 'description', 'criticality', 'status'])
  }
})
```

Tres decisiones de este manejador:

- **`form.reset(toFormValues(result))`** carga en el formulario **lo que ha guardado el servidor**, no lo que escribió el usuario. Si el backend normaliza algo, el formulario lo refleja. Además, esos valores pasan a ser la nueva referencia, así que `isDirty` vuelve a `false`.
- **Los errores no se relanzan.** Se capturan, se colocan los errores por campo y el estado de error de la mutación muestra la alerta general. El formulario conserva lo escrito.
- **El botón de envío se desactiva** mientras la mutación está pendiente y cuando no hay cambios (`!isDirty`), lo que evita dobles envíos y peticiones inútiles.

## Esquemas que dependen de los datos

A veces las reglas dependen del registro que se edita. En demandas, los estados permitidos dependen del estado actual: una demanda `OPEN` puede pasar a `IN_PROGRESS` o `CANCELLED`, pero no a `COMPLETED`. El esquema se construye con una función:

```ts title="src/features/demands/model/schemas.ts"
export function createDemandUpdateSchema(currentStatus: DemandStatus) {
  return demandCreateSchema.extend({ status: statusField }).superRefine((values, ctx) => {
    if (!canTransition(currentStatus, values.status)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['status'],
        message: `No se puede pasar de «${DEMAND_STATUS_LABELS[currentStatus]}» a «${DEMAND_STATUS_LABELS[values.status]}».`,
      })
    }
  })
}
```

`superRefine` añade validaciones personalizadas que pueden mirar varios campos y datos externos, y asignar el error al campo que corresponda (`path: ['status']`). La página memoriza el *resolver* según el estado actual:

```tsx title="src/features/demands/pages/demand-edit-page.tsx (extracto)"
const currentStatus = demand.status
const resolver = useMemo(() => zodResolver(createDemandUpdateSchema(currentStatus)), [currentStatus])
```

Lo veremos en contexto en el capítulo 22.

## Accesibilidad de los formularios

| Requisito | Cómo se cumple |
|---|---|
| Cada campo tiene una etiqueta asociada | `FormLabel` con `htmlFor` igual al `id` del control (generado con `useId`) |
| Los campos obligatorios se anuncian | Asterisco visual con `aria-hidden` y `aria-required` en el control; nota «Los campos marcados con * son obligatorios» |
| Los errores se asocian al campo | `aria-invalid` y `aria-describedby` apuntando al mensaje de error (`FormControl`) |
| El foco va al primer error | React Hook Form llama a `focus()` sobre el `ref` del primer campo inválido |
| El contador se anuncia sin interrumpir | `aria-live="polite"` |

## Pruebas de los esquemas

Los esquemas son funciones puras de datos a resultado, así que se prueban sin montar ningún componente:

```ts title="src/features/applications/model/schemas.test.ts (extracto)"
it('exige nombre no vacío (equivale a @NotBlank)', () => {
  const result = applicationCreateSchema.safeParse({ ...valid, name: '   ' })
  expect(result.success).toBe(false)
  expect(result.error?.issues[0]?.message).toBe('El nombre es obligatorio.')
})

it('limita el nombre a 100 y la descripción a 500 caracteres', () => {
  expect(applicationCreateSchema.safeParse({ ...valid, name: 'a'.repeat(100) }).success).toBe(true)
  expect(applicationCreateSchema.safeParse({ ...valid, name: 'a'.repeat(101) }).success).toBe(false)
  // …
})
```

Las pruebas de los límites (100 y 101 caracteres) son las que detectan cuándo una constante deja de coincidir con el `@Size` del backend.

::: decision React Hook Form + Zod
**Decisión.** Esquemas de Zod como única fuente de las reglas de cada formulario, alineados con Bean Validation; React Hook Form para el estado, conectado con `zodResolver`; y campos genéricos sobre los componentes `Form` de shadcn/ui.

**Motivos.** Rendimiento (solo se renderiza lo que cambia), reglas declarativas que se prueban de forma aislada, tipos derivados de los esquemas, transformaciones explícitas de formulario a DTO y una integración accesible ya resuelta por shadcn/ui.

**Alternativas.** Formik (pionera, pero con peor rendimiento y menos mantenida); TanStack Form (moderna y muy tipada, menos extendida); las acciones de formulario de React 19 (`useActionState`), pensadas sobre todo para envíos al servidor en *frameworks* con renderizado en servidor; y el estado controlado a mano, viable solo para formularios mínimos como el buscador por identificador.
:::

## Errores típicos y depuración

- **El manejador de envío no se ejecuta y no se ve ningún error.** Hay un error de validación en un campo que no se está pintando (no tiene `FormMessage` o no existe en el formulario). Inspecciona `form.formState.errors` con un `console.log` o con React DevTools.
- **`isDirty` es verdadero sin haber tocado nada.** Los valores iniciales no coinciden con lo que el campo produce (por ejemplo, `null` frente a `''`). Normaliza en `toFormValues`.
- **El `Select` no muestra el valor inicial.** El valor no es una cadena o no coincide exactamente con ningún `value` de las opciones (por ejemplo, el número 7 frente a la cadena `'7'`).
- **Tras guardar, el formulario sigue marcando cambios.** Falta `form.reset(…)` con los datos devueltos.
- **Un error del servidor no aparece en su campo.** El nombre del campo en `fieldErrors` no coincide con el del formulario, o no está en la lista `knownFields` de `applyServerFieldErrors`.
- **Mensajes en inglés de Zod.** Falta el mensaje personalizado en la regla (o el `errorMap` en los enumerados).

## Ejercicios

::: ejercicio Añade un campo con validación
Añade al formulario de aplicaciones un campo opcional «Responsable» con un correo electrónico. En el esquema, usa `z.string().trim().email('…')` combinado con la posibilidad de dejarlo vacío (pista: `.or(z.literal(''))`). Crea `OwnerField` en `application-form-fields.tsx` y añade pruebas al esquema. Como el backend no tiene ese campo, no lo envíes en el DTO: ¿qué pasaría si lo enviaras?
:::

::: ejercicio Valida al salir del campo
Cambia temporalmente el formulario de alta a `mode: 'onTouched'` y compara la experiencia con `onSubmit` y con `onChange`. Escribe tres frases con las ventajas e inconvenientes de cada modo para un formulario de gestión como este.
:::

::: ejercicio Simula un error de servidor por campo
Sin tocar el backend, comprueba el camino de `applyServerFieldErrors`. Pista: con las DevTools, en *Network*, puedes usar *Override content* sobre una respuesta, o bien, en una rama, modifica temporalmente `useCreateApplication` para que lance un `new ApiError({ message: 'La petición contiene campos inválidos', status: 400, kind: 'validation', fieldErrors: { name: 'ya existe una aplicación con ese nombre' } })`. Comprueba dónde aparece cada mensaje.
:::

## Autoevaluación

::: preguntas
1. ¿Qué responsabilidades tiene Zod y cuáles React Hook Form en el proyecto?
2. ¿Cómo se expresa `@NotBlank` en Zod y por qué hace falta `trim()`?
3. ¿Qué diferencia hay entre `z.input` y `z.output`? Pon el ejemplo de `applicationId`.
4. ¿Por qué React Hook Form no renderiza el formulario entero en cada pulsación?
5. ¿Qué hace `mode: 'onSubmit'` y por qué se eligió?
6. ¿Por qué el `Select` de Radix no recibe `{...field}` directamente?
7. ¿Qué conversiones se hacen entre DTO y formulario con la descripción?
8. ¿Por qué tras guardar se llama a `form.reset` con la respuesta del servidor y no con lo que escribió el usuario?
9. ¿Para qué sirve `superRefine` en el esquema de modificación de demandas?
:::
