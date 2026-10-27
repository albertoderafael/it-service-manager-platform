# El módulo de demandas y sus reglas de negocio

<p class="lead">Las demandas comparten estructura con las aplicaciones, pero su dominio es más rico: tienen un ciclo de vida con transiciones restringidas, pertenecen a una aplicación que vive en otro servicio y llevan fechas de creación y modificación. Este capítulo se centra en lo que las hace distintas y en cómo el frontend refleja reglas de negocio que siguen perteneciendo al backend.</p>

## Qué añade el dominio de las demandas

| Aspecto | Aplicaciones | Demandas |
|---|---|---|
| Estado | Activa o inactiva; cualquier cambio permitido | Ciclo de vida con transiciones restringidas y estados finales |
| Relaciones | Ninguna | Pertenece a una aplicación (de otro servicio) |
| Fechas | No | `createdAt` y `updatedAt`, asignadas por el servidor |
| Alta | El servidor asigna el estado | El servidor asigna `OPEN` y las fechas |
| Errores propios | — | 409 si la transición no es válida; 404 si la aplicación no existe; 503 si el catálogo no responde |

Las páginas siguen el mismo esquema de cinco pantallas, así que aquí nos centramos en las diferencias.

## El ciclo de vida

<figure>
<svg viewBox="0 0 680 200" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10.5">
  <defs><marker id="a22" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <circle cx="30" cy="70" r="7" fill="#0b1220"/>
  <line x1="37" y1="70" x2="78" y2="70" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a22)"/>
  <text x="56" y="60" text-anchor="middle" font-size="8.5" fill="#475569">alta</text>
  <rect x="80" y="48" width="130" height="44" rx="22" fill="#e0f2fe" stroke="#0284c7"/><text x="145" y="68" text-anchor="middle" font-weight="700">OPEN</text><text x="145" y="83" text-anchor="middle" font-size="8.5">Abierta</text>
  <line x1="210" y1="70" x2="288" y2="70" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a22)"/>
  <rect x="290" y="48" width="140" height="44" rx="22" fill="#fef9c3" stroke="#ca8a04"/><text x="360" y="68" text-anchor="middle" font-weight="700">IN_PROGRESS</text><text x="360" y="83" text-anchor="middle" font-size="8.5">En curso</text>
  <line x1="430" y1="70" x2="508" y2="70" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a22)"/>
  <rect x="510" y="48" width="150" height="44" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/><text x="585" y="68" text-anchor="middle" font-weight="700">COMPLETED</text><text x="585" y="83" text-anchor="middle" font-size="8.5">Completada · final</text>
  <rect x="290" y="140" width="140" height="44" rx="8" fill="#f1f5f9" stroke="#64748b" stroke-width="2"/><text x="360" y="160" text-anchor="middle" font-weight="700">CANCELLED</text><text x="360" y="175" text-anchor="middle" font-size="8.5">Cancelada · final</text>
  <path d="M145,92 C145,150 230,162 288,162" fill="none" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a22)"/>
  <line x1="360" y1="92" x2="360" y2="138" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a22)"/>
  <text x="470" y="150" font-size="9" fill="#475569">Mantener el mismo estado siempre es válido.</text>
  <text x="470" y="164" font-size="9" fill="#475569">Cualquier otra transición: 409 Conflict.</text>
  <text x="470" y="178" font-size="9" fill="#475569">Los estados finales no admiten cambios.</text>
</svg>
<figcaption><b>Figura 22.1.</b> Máquina de estados de una demanda. Los estados con borde grueso son finales.</figcaption>
</figure>

La regla **pertenece al backend**, a la entidad `Demand`:

```java title="it-service-manager · demand/entity/Demand.java (extracto)"
public void changeStatus(String newStatus) {
    if (this.status.equals(newStatus)) {
        return;
    }
    boolean validTransition =
            ("OPEN".equals(this.status) && ("IN_PROGRESS".equals(newStatus) || "CANCELLED".equals(newStatus)))
            || ("IN_PROGRESS".equals(this.status) && ("COMPLETED".equals(newStatus) || "CANCELLED".equals(newStatus)));
    if (!validTransition) {
        throw new IllegalStateException("Invalid demand status transition: " + this.status + " -> " + newStatus);
    }
    this.status = newStatus;
    this.updatedAt = Instant.now();
}
```

`DemandService` captura la `IllegalStateException` y la convierte en un `ResponseStatusException(CONFLICT)`: un **409** con el mensaje de la regla.

El frontend tiene un **reflejo** de esa regla, declarado como datos:

```ts title="src/features/demands/model/status-rules.ts"
/*
 * Reglas de transición de estado. Reflejan Demand.changeStatus() del backend.
 * El backend sigue siendo la autoridad: si rechaza un cambio, responde 409.
 */
const NEXT_STATUSES: Record<DemandStatus, readonly DemandStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

export function getNextStatuses(from: DemandStatus): readonly DemandStatus[] { return NEXT_STATUSES[from] ?? [] }
export function canTransition(from: DemandStatus, to: DemandStatus): boolean {
  return from === to || getNextStatuses(from).includes(to)
}
export function getSelectableStatuses(from: DemandStatus): readonly DemandStatus[] {
  return [from, ...getNextStatuses(from)]
}
export function isFinalStatus(status: DemandStatus): boolean { return getNextStatuses(status).length === 0 }
```

Expresarla como una **tabla de transiciones** (`Record<estado, estados siguientes>`) en lugar de con condiciones tiene dos ventajas: es exhaustiva (añadir un estado obliga a declarar sus transiciones) y es fácil de comparar con el backend a simple vista. Las funciones derivadas responden a las preguntas que necesita la interfaz.

::: java
Duplicar una regla de negocio en el cliente es una decisión que hay que justificar, igual que duplicar una validación. Aquí se justifica por la experiencia de uso: el usuario debe ver qué puede hacer **antes** de intentarlo. Lo esencial es que la duplicación sea **explícita y localizada** (un único fichero con el comentario que apunta a `Demand.changeStatus()`), cubierta por pruebas y subordinada al backend, que sigue siendo la autoridad. Si las reglas crecieran, una alternativa sería que el backend expusiera las transiciones permitidas en la respuesta (un campo `allowedTransitions` en `DemandResponse`), al estilo de los enlaces de HATEOAS.
:::

## Tres capas de defensa

El frontend aplica la regla en tres sitios, cada uno con un propósito:

<figure>
<svg viewBox="0 0 680 160" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="9.5">
  <defs><marker id="a22b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="10" y="20" width="190" height="110" rx="8" fill="#ecfeff" stroke="#0891b2"/>
  <text x="105" y="40" text-anchor="middle" font-weight="700">1 · El desplegable</text>
  <text x="20" y="60">Solo habilita el estado actual</text><text x="20" y="74">y sus transiciones válidas.</text>
  <text x="20" y="94" fill="#0e7490">Evita el error: el usuario</text><text x="20" y="108" fill="#0e7490">no puede elegir lo prohibido.</text>
  <line x1="200" y1="75" x2="238" y2="75" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a22b)"/>
  <rect x="240" y="20" width="190" height="110" rx="8" fill="#f5f3ff" stroke="#8b5cf6"/>
  <text x="335" y="40" text-anchor="middle" font-weight="700">2 · El esquema de Zod</text>
  <text x="250" y="60">superRefine con canTransition.</text>
  <text x="250" y="80" fill="#6d28d9">Red de seguridad del cliente:</text><text x="250" y="94" fill="#6d28d9">si algo se cuela, error en el</text><text x="250" y="108" fill="#6d28d9">campo y ninguna petición.</text>
  <line x1="430" y1="75" x2="468" y2="75" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a22b)"/>
  <rect x="470" y="20" width="200" height="110" rx="8" fill="#fff7ed" stroke="#fdba74"/>
  <text x="570" y="40" text-anchor="middle" font-weight="700">3 · El backend (409)</text>
  <text x="480" y="60">La autoridad. Puede rechazar</text><text x="480" y="74">aunque el cliente lo permita,</text><text x="480" y="88">si los datos han cambiado.</text>
  <text x="480" y="108" fill="#9a3412">→ mensaje claro y «Recargar».</text>
</svg>
<figcaption><b>Figura 22.2.</b> La regla de transición aplicada en tres capas: prevenir, comprobar y, si aun así falla, explicar.</figcaption>
</figure>

### Capa 1: el desplegable de estado

```tsx title="src/features/demands/components/demand-form-fields.tsx (extracto)"
export function DemandStatusField({ currentStatus }: { currentStatus: DemandStatus }) {
  const selectable = getSelectableStatuses(currentStatus)
  const final = isFinalStatus(currentStatus)

  const options = DEMAND_STATUSES.map((value) => ({
    value,
    label: DEMAND_STATUS_LABELS[value],
    hint: value === currentStatus ? 'actual' : selectable.includes(value) ? undefined : 'no permitido',
    disabled: !selectable.includes(value),
  }))

  return (
    <SelectField name="status" label="Estado" required options={options} placeholder="Selecciona el estado"
      disabled={final}
      description={final ? 'Estado final: no admite más cambios de estado.' : undefined} />
  )
}
```

El desplegable muestra **todos** los estados, pero desactiva los no permitidos y los marca como «no permitido». Mostrarlos desactivados, en lugar de ocultarlos, enseña al usuario el ciclo completo. En un estado final, el campo entero queda desactivado con una explicación.

Junto al desplegable, el componente `StatusFlow` dibuja el ciclo de vida: el estado actual resaltado, los siguientes posibles con borde discontinuo, el resto atenuado, y una frase como «Desde «Abierta» puede pasar a «En curso» o «Cancelada».». La ficha de detalle también lo muestra.

### Capa 2: el esquema de Zod

El esquema de modificación se construye con el estado actual de la demanda y añade la comprobación con `superRefine` (capítulo 20). Como depende de `demand.status`, el *resolver* se memoriza con ese valor:

```tsx title="src/features/demands/pages/demand-edit-page.tsx (extracto)"
// Las transiciones válidas dependen del estado que tiene la demanda en el
// servidor, que cambia tras guardar o recargar. React Hook Form toma el
// resolver actualizado en cada render.
const currentStatus = demand.status
const resolver = useMemo(() => zodResolver(createDemandUpdateSchema(currentStatus)), [currentStatus])
```

Tras guardar un cambio de `OPEN` a `IN_PROGRESS`, la caché actualiza `demand.status`, el *resolver* se reconstruye y las transiciones permitidas pasan a ser las de `IN_PROGRESS`.

### Capa 3: el 409 del servidor

¿Cómo puede llegar un 409 si el cliente solo permite transiciones válidas? Porque el cliente decide con **los datos que cargó**, y pueden haber cambiado. Ejemplo: un compañero completa la demanda mientras tú la tienes abierta en *En curso* e intentas cancelarla. Tu pantalla cree que `IN_PROGRESS → CANCELLED` es válido; el servidor, que ya la tiene en `COMPLETED`, responde:

```text
409 { "status": 409, "error": "RESOURCE_ERROR", "message": "Invalid demand status transition: COMPLETED -> CANCELLED" }
```

La página lo trata de forma específica:

```tsx title="src/features/demands/pages/demand-edit-page.tsx (extracto)"
/** Traduce un 409 de transición a un mensaje comprensible. */
function describeConflict(error: unknown): string {
  const message = getErrorMessage(error)
  const transition = parseTransitionError(message)
  if (!transition) return message
  return `El servidor no permite pasar de «${DEMAND_STATUS_LABELS[transition.from]}» a «${DEMAND_STATUS_LABELS[transition.to]}».`
}
```

`parseTransitionError` extrae los dos estados del mensaje del backend con una expresión regular y comprueba que sean estados conocidos. La alerta resultante dice «Cambio rechazado por el servidor · El servidor no permite pasar de «Completada» a «Cancelada». Puede que la demanda haya cambiado mientras la editabas.» y ofrece un botón **Recargar datos actuales**:

```tsx title="src/features/demands/pages/demand-edit-page.tsx (extracto)"
const reload = async () => {
  setReloading(true)
  try {
    const fresh = await onReload()           // query.refetch() en la página
    if (fresh) {
      form.reset(toFormValues(fresh))        // el formulario muestra el estado real
      mutation.reset()                       // desaparece la alerta
      setUpdated(null)
    }
  } finally {
    setReloading(false)
  }
}
```

Al recargar, el formulario y las transiciones permitidas se recalculan a partir del estado real del servidor.

::: atencion
`parseTransitionError` depende del **texto exacto** del mensaje del backend («Invalid demand status transition: X -> Y»). Si alguien lo traduce o lo reformula, el frontend dejará de reconocerlo y mostrará el mensaje original, sin romperse pero con peor experiencia. Por eso existe una prueba que fija el formato (`status-rules.test.ts`), y por eso lo ideal sería que el backend devolviera un código de error estable y los estados como campos del cuerpo, en lugar de dentro de un texto (capítulo 25).
:::

### Una mejora pendiente: la concurrencia optimista

El 409 de transición detecta un caso concreto de modificación concurrente, pero no todos: si dos usuarios editan el título a la vez, gana el último en guardar, sin aviso. La solución estándar es la **concurrencia optimista**: un campo de versión (`@Version` en JPA) que viaja en la respuesta y se devuelve al guardar; si no coincide, el backend responde 409 y el frontend ofrece recargar, exactamente como ya hace para las transiciones. La infraestructura del frontend (alerta de conflicto y recarga) ya estaría preparada.

## El selector de aplicación

Una demanda pertenece a una aplicación, y el formulario necesita un desplegable con el catálogo. Es el punto de contacto entre módulos del capítulo 13:

```ts title="src/features/demands/components/application-options.ts (extracto)"
export function useApplicationSelectOptions(ensure?: { id: number; name: string }) {
  const query = useApplicationOptions()
  const ensureId = ensure?.id
  const ensureName = ensure?.name

  const options = useMemo<ApplicationOption[]>(() => {
    const list = (query.data?.content ?? []).map((app) => ({
      value: String(app.id), name: app.name, inactive: app.status === 'INACTIVE',
    }))
    if (ensureId !== undefined && ensureName && !list.some((o) => o.value === String(ensureId))) {
      list.unshift({ value: String(ensureId), name: ensureName, inactive: false })
    }
    return list
  }, [query.data, ensureId, ensureName])

  const truncated = (query.data?.totalElements ?? 0) > APPLICATION_OPTIONS_LIMIT
  return { query, options, truncated }
}
```

Las decisiones de este hook:

| Decisión | Motivo |
|---|---|
| Se piden hasta 1000 aplicaciones ordenadas por nombre en una sola página | La API no tiene un endpoint de «todas»; Spring Data limita el tamaño de página a 2000 por defecto |
| Se incluyen las inactivas, marcadas | El backend acepta demandas sobre aplicaciones inactivas, y una demanda existente puede estar asociada a una |
| `ensure` añade la aplicación actual si no está en la lista | Si el catálogo supera el límite, la aplicación de la demanda que se edita podría no estar entre las mil primeras, y el desplegable no podría mostrarla |
| `truncated` avisa si hay más de 1000 | El campo muestra «Se muestran las primeras 1000 aplicaciones por orden alfabético.» |
| Los valores son cadenas | El `Select` de Radix trabaja con texto; el esquema lo convierte a número (capítulo 20) |
| Caché de 5 minutos y colgada de `lists()` | El catálogo cambia poco, pero se refresca al crear o modificar aplicaciones (capítulo 17) |

El campo `ApplicationField` añade los estados de la consulta: «Cargando aplicaciones…» desactivado mientras llega el catálogo; si falla, un mensaje con *Reintentar*; si no hay ninguna aplicación, un enlace a *Crear una aplicación*. El mismo hook alimenta el filtro por aplicación del listado.

::: nota
El límite de mil aplicaciones es razonable para el volumen actual, pero no escala indefinidamente. La evolución natural es un **selector con búsqueda** (*combobox*) que consulte al backend mientras el usuario escribe, para lo que haría falta el filtro por nombre que hoy no existe en la API.
:::

## Las fechas

Las demandas llevan `createdAt` y `updatedAt`, que el backend serializa como `java.time.Instant` en ISO-8601 y UTC: `"2026-10-24T08:15:30.123Z"`. El frontend las muestra en la hora local del navegador:

```ts title="src/lib/format.ts"
const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' })
const longDateTimeFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'medium' })

/** Formatea un instante ISO-8601 (p. ej. java.time.Instant) en hora local. */
export function formatDateTime(iso: string | null | undefined, style: 'short' | 'long' = 'short'): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return (style === 'long' ? longDateTimeFormatter : dateTimeFormatter).format(date)
}
```

- `Intl.DateTimeFormat` es la API estándar de internacionalización: formatea según el idioma y la zona horaria del usuario, sin librerías. Los formateadores se crean **una vez** a nivel de módulo, porque crearlos es relativamente costoso.
- La tabla muestra el formato corto (`24/10/26, 10:15`) y, al pasar el ratón, el largo (`24 de octubre de 2026, 10:15:30`) en el atributo `title`.
- Si la fecha no es válida, se muestra tal cual en lugar de «Invalid Date».

::: java
`Instant` en el backend y `Date` en el navegador representan lo mismo: un punto en el tiempo, sin zona. La zona solo se aplica al **mostrar**, como harías con un `DateTimeFormatter.ofLocalizedDateTime(FormatStyle.SHORT).withZone(zonaDelUsuario)`. Guardar y transportar en UTC, mostrar en local: la regla de oro de las fechas.
:::

## Navegación entre módulos

Las demandas se conectan con las aplicaciones en ambos sentidos, siempre a través de la URL:

- Desde el **detalle de una aplicación**, *Ver demandas* abre `/demandas?aplicacion=7`: el listado lee el parámetro como su filtro de aplicación.
- **`/demandas/nueva?aplicacion=7`** preselecciona la aplicación en el alta:

```tsx title="src/features/demands/pages/demand-create-page.tsx (extracto)"
// Permite llegar con la aplicación preseleccionada: /demandas/nueva?aplicacion=3
const [searchParams] = useSearchParams()
const presetApplicationId = parseIdParam(searchParams.get('aplicacion'))
// …
defaultValues: emptyForm(presetApplicationId),
```

- En la **tabla de demandas**, el nombre de la aplicación es un enlace a su detalle.

Si al crear la demanda la aplicación ya no existe (alguien la borró en otro servicio, o el enlace tenía un identificador inválido), el backend responde 404 y la alerta lo explica: «La aplicación seleccionada ya no existe. Recarga la página y elige otra.». Si es el catálogo el que no responde, el servicio de demandas devuelve un 503 y la alerta muestra su mensaje (capítulo 15).

## Diferencias con el contrato del backend

| Aspecto | Backend | Frontend | Comentario |
|---|---|---|---|
| Orden por defecto | `@PageableDefault(sort = "id", direction = ASC)` | `id` descendente (`DEFAULT_DEMAND_LIST_PARAMS`) | Decisión del frontend: las más recientes primero. Como siempre envía `sort`, no hay conflicto |
| Campos de ordenación | `id`, `title`, `priority`, `status`, `updatedAt` | Además `application.name` y `createdAt` | **Desajuste**: esas dos columnas producen un 400 (ejercicio 14.2) |
| Orden de prioridad y estado | Se guardan como texto | — | Se ordenan alfabéticamente, como la criticidad de las aplicaciones |
| `updatedAt` | Se actualiza en cada `PUT`, aunque no cambie nada | — | La fecha de modificación puede inducir a error si se guarda sin cambios; el frontend lo mitiga desactivando *Guardar* sin cambios |

El desajuste de ordenación es un buen ejemplo de por qué las listas que duplican un contrato (`DEMAND_SORT_FIELDS` frente a `VALID_SORT_FIELDS`) deben revisarse cuando cambia el backend: tras separar las aplicaciones en otro servicio, el backend dejó de poder ordenar por su nombre, y el frontend no se actualizó.

## Errores típicos y depuración

- **El desplegable de estado está desactivado.** La demanda está en un estado final; es el comportamiento esperado.
- **Aparece «Cambio rechazado por el servidor».** Alguien ha cambiado la demanda; usa *Recargar datos actuales*. Si ocurre siempre con la misma transición, compara `status-rules.ts` con `Demand.changeStatus()`.
- **El desplegable de aplicación no muestra la aplicación de la demanda.** Comprueba que se pasa `current` a `ApplicationField` (lo hace la página de edición).
- **«No se han podido cargar las aplicaciones».** El servicio de aplicaciones (8081) no responde; el resto del módulo de demandas puede seguir funcionando.
- **Las fechas aparecen desplazadas una o dos horas.** Se está formateando la cadena como si fuera hora local o se ha perdido la `Z` final; `new Date(iso)` con el formato ISO completo lo interpreta bien.

## Ejercicios

::: ejercicio Reproduce un conflicto de transición
Abre la misma demanda `OPEN` en modificación en dos pestañas. En la primera, cámbiala a *En curso* y guarda; después, en la otra, a *Completada*... ¿puedes? ¿Por qué no? Ahora, en la primera, pásala a *Completada* y guarda, y en la segunda (que sigue creyendo que está *Abierta*) cámbiala a *Cancelada* y guarda. Describe la respuesta en *Network*, el mensaje que ve el usuario y lo que ocurre al pulsar *Recargar datos actuales*.
:::

::: ejercicio Corrige el desajuste de ordenación
Alinea el frontend con el backend: quita `application.name` y `createdAt` de `DEMAND_SORT_FIELDS` y convierte esas columnas de la tabla en cabeceras no ordenables (`TableHead` en lugar de `SortableTableHead`). Comprueba con `npm run typecheck` qué más hay que tocar, actualiza las pruebas y verifica que una URL antigua con `?orden=createdAt,asc` cae al orden por defecto.
:::

::: ejercicio Muestra las transiciones como acciones
En el detalle de una demanda, añade botones de acción rápida para cada transición permitida («Iniciar», «Completar», «Cancelar») usando `getNextStatuses`. Cada botón debe enviar un `PUT` con los datos actuales y el nuevo estado, mediante `useUpdateDemand`. Pide confirmación antes de las transiciones a estados finales. ¿Qué haces si la respuesta es un 409?
:::

## Autoevaluación

::: preguntas
1. ¿Qué tres cosas añade el dominio de las demandas respecto al de aplicaciones?
2. ¿Dónde vive la regla de transición de estados y dónde su reflejo en el frontend?
3. ¿Por qué se expresa la regla como una tabla de transiciones?
4. Describe las tres capas de defensa de la regla y el propósito de cada una.
5. ¿Cómo puede llegar un 409 si el cliente solo permite transiciones válidas?
6. ¿Qué hace el botón *Recargar datos actuales*?
7. ¿Por qué `useApplicationSelectOptions` acepta un parámetro `ensure`?
8. ¿Por qué las fechas viajan en UTC y se muestran en hora local?
9. ¿Qué desajuste hay entre los campos de ordenación del frontend y los del backend, y cuál es su origen?
:::
