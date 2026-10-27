# Organización por funcionalidad y reglas de dependencia

<p class="lead">Un proyecto pequeño funciona con cualquier estructura de carpetas. Uno que va a crecer módulo a módulo —aplicaciones, demandas, incidencias, equipos, SLA— necesita una estructura que haga obvio dónde va cada cosa y que impida que todo acabe dependiendo de todo. Este capítulo explica la organización de <code>src/</code>, las reglas que gobiernan qué puede importar qué y los criterios para decidir si algo es común o pertenece a un módulo.</p>

## Dos formas de organizar un proyecto

Hay dos grandes enfoques para repartir el código en carpetas:

**Por tipo técnico.** Una carpeta por clase de artefacto: `components/`, `hooks/`, `services/`, `types/`, `utils/`, `pages/`. Es la estructura de muchos tutoriales y funciona bien con diez ficheros. Con doscientos, el código de una funcionalidad queda repartido por seis carpetas, cada una con piezas de todos los módulos mezcladas.

**Por funcionalidad** (*feature-based*). Una carpeta por módulo de negocio, que contiene **todo** lo de ese módulo: acceso a la API, tipos, componentes y páginas. Lo que es realmente transversal vive fuera, en carpetas compartidas.

```text
Por tipo técnico                      Por funcionalidad (este proyecto)
src/                                  src/
├── components/                       ├── features/
│   ├── ApplicationsTable.tsx         │   ├── applications/
│   ├── DemandsTable.tsx              │   │   ├── api/  model/  components/  pages/
│   └── …                             │   └── demands/
├── hooks/                            │       ├── api/  model/  components/  pages/
│   ├── useApplications.ts            ├── components/   ← solo lo compartido
│   └── useDemands.ts                 └── lib/          ← solo lo compartido
├── services/
└── types/
```

::: java
Es exactamente el debate entre **paquetes por capa** (`controller`, `service`, `repository`, `dto`) y **paquetes por funcionalidad** (`application`, `demand`, cada uno con su controlador, servicio, repositorio y DTO). El backend del proyecto ya está organizado por funcionalidad: `com.albertoderafael.itmanager.demand` contiene `controller`, `service`, `dto`, `entity`, `repository`… El frontend aplica el mismo criterio, de modo que a la carpeta `features/demands` le corresponde el paquete `demand` del backend.
:::

## El árbol de `src/`

```text
src/
├── main.tsx                  Punto de entrada: monta React en #root
├── index.css                 Tailwind, tema y estilos base
├── app/                      Arranque de la aplicación
│   ├── app.tsx                 Proveedores globales
│   ├── router.tsx              Tabla de rutas: monta las rutas de cada módulo
│   └── query-client.ts         Configuración de la caché de datos
├── components/
│   ├── ui/                   Piezas de interfaz genéricas (shadcn/ui)
│   ├── layout/               Armazón: menú lateral, cabecera, navegación
│   └── common/               Componentes compartidos con algo de criterio propio:
│                               cabecera de página, paginación, estados, indicadores,
│                               filtros, campos de formulario, cabecera ordenable…
├── features/
│   ├── applications/         Módulo de aplicaciones
│   └── demands/              Módulo de demandas
├── lib/                      Utilidades sin interfaz: cliente HTTP, parámetros de
│                               listado, rutas, fechas, errores de formulario, cn()
└── pages/                    Páginas globales que no son de ningún módulo (404, error)
```

Cada carpeta responde a una pregunta distinta:

| Carpeta | Pregunta que responde | ¿Conoce el negocio? |
|---|---|---|
| `app/` | ¿Cómo se arranca y se ensambla la aplicación? | Solo para registrar los módulos |
| `components/ui/` | ¿Cómo es un botón, un desplegable, una tarjeta? | No |
| `components/layout/` | ¿Cómo es la carcasa de la aplicación? | Solo la lista de módulos del menú |
| `components/common/` | ¿Qué patrones de interfaz repiten varios módulos? | No: reciben todo por props |
| `features/<módulo>/` | ¿Cómo funciona este módulo? | Sí, y solo el suyo |
| `lib/` | ¿Qué utilidades sin interfaz usa todo el proyecto? | No |
| `pages/` | ¿Qué pantallas no pertenecen a ningún módulo? | No |

## Reglas de dependencia

Una estructura de carpetas solo sirve si se respeta **en qué dirección** se importa. Las reglas del proyecto forman un grafo sin ciclos:

<figure>
<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10.5">
  <defs><marker id="a13" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker>
  <marker id="a13r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#c2410c"/></marker></defs>
  <rect x="250" y="10" width="180" height="38" rx="8" fill="#0b1220"/><text x="340" y="34" text-anchor="middle" font-weight="700" fill="#fff">app/  (router, proveedores)</text>
  <rect x="520" y="10" width="140" height="38" rx="8" fill="#f8fafc" stroke="#94a3b8"/><text x="590" y="34" text-anchor="middle" font-weight="700">pages/  (404, error)</text>
  <rect x="40" y="110" width="180" height="40" rx="8" fill="#ecfeff" stroke="#0891b2"/><text x="130" y="135" text-anchor="middle" font-weight="700">features/applications</text>
  <rect x="460" y="110" width="180" height="40" rx="8" fill="#ecfeff" stroke="#0891b2"/><text x="550" y="135" text-anchor="middle" font-weight="700">features/demands</text>
  <rect x="20" y="210" width="170" height="40" rx="8" fill="#f8fafc" stroke="#94a3b8"/><text x="105" y="235" text-anchor="middle" font-weight="700">components/layout</text>
  <rect x="255" y="210" width="170" height="40" rx="8" fill="#f8fafc" stroke="#94a3b8"/><text x="340" y="235" text-anchor="middle" font-weight="700">components/common</text>
  <rect x="490" y="210" width="170" height="40" rx="8" fill="#f8fafc" stroke="#94a3b8"/><text x="575" y="235" text-anchor="middle" font-weight="700">components/ui</text>
  <rect x="270" y="292" width="140" height="38" rx="8" fill="#fff7ed" stroke="#fdba74"/><text x="340" y="316" text-anchor="middle" font-weight="700">lib/</text>
  <g stroke="#0891b2" stroke-width="1.3" fill="none">
    <line x1="430" y1="29" x2="518" y2="29" marker-end="url(#a13)"/>
    <line x1="280" y1="48" x2="160" y2="108" marker-end="url(#a13)"/>
    <line x1="400" y1="48" x2="520" y2="108" marker-end="url(#a13)"/>
    <path d="M250,29 C60,29 40,120 30,140 C22,160 30,190 50,208" marker-end="url(#a13)"/>
    <line x1="160" y1="150" x2="300" y2="208" marker-end="url(#a13)"/>
    <line x1="520" y1="150" x2="380" y2="208" marker-end="url(#a13)"/>
    <line x1="200" y1="150" x2="510" y2="208" marker-end="url(#a13)"/>
    <line x1="590" y1="150" x2="590" y2="208" marker-end="url(#a13)"/>
    <line x1="425" y1="230" x2="488" y2="230" marker-end="url(#a13)"/>
    <line x1="340" y1="250" x2="340" y2="290" marker-end="url(#a13)"/>
    <line x1="575" y1="250" x2="412" y2="300" marker-end="url(#a13)"/>
    <line x1="105" y1="250" x2="268" y2="300" marker-end="url(#a13)"/>
    <path d="M150,250 C220,282 470,282 540,252" marker-end="url(#a13)"/>
  </g>
  <line x1="458" y1="130" x2="224" y2="130" stroke="#c2410c" stroke-width="1.6" stroke-dasharray="5 3" marker-end="url(#a13r)"/>
  <text x="340" y="122" text-anchor="middle" font-size="9" fill="#c2410c">excepción controlada:</text>
  <text x="340" y="146" text-anchor="middle" font-size="9" fill="#c2410c">catálogo de aplicaciones</text>
  <text x="20" y="320" font-size="8.5" fill="#475569">Los módulos también usan lib/ directamente</text>
</svg>
<figcaption><b>Figura 13.1.</b> Dirección permitida de las importaciones. Las flechas van de quien importa a lo importado; nunca en sentido contrario.</figcaption>
</figure>

En palabras:

1. **`lib/` no importa nada del proyecto** salvo otros ficheros de `lib/`. Son funciones puras o casi puras: la base de todo.
2. **`components/ui/` solo importa `lib/utils`** (para `cn`) y librerías externas.
3. **`components/common/` importa `ui/` y `lib/`**, nunca un módulo. Si un componente común necesitara saber qué es una demanda, ya no sería común.
4. **Un módulo importa de `components/` y de `lib/`**, pero **no de otros módulos** (con una excepción explicada abajo).
5. **`app/` es el único que conoce todos los módulos**: los ensambla en el router.

Puedes comprobarlo en el código: ningún fichero de `components/` ni de `lib/` importa nada de `@/features`, y el único fichero fuera de `features/` que lo hace es `app/router.tsx`.

::: java
Son las reglas de una arquitectura por capas bien hecha: el dominio no conoce la web, la persistencia no conoce los controladores. En Java se pueden **verificar con pruebas** usando ArchUnit (`noClasses().that().resideInAPackage("..demand..").should().dependOnClassesThat().resideInAPackage("..application.entity..")`). En el frontend existe lo mismo con ESLint, como verás en el ejercicio 13.2.
:::

### La excepción: el catálogo de aplicaciones en las demandas

El módulo de demandas necesita la lista de aplicaciones para el filtro y para el campo *Aplicación* del formulario. Hay **una** importación entre módulos:

```ts title="src/features/demands/components/application-options.ts"
import { APPLICATION_OPTIONS_LIMIT, useApplicationOptions } from '@/features/applications/api/applications-queries'
```

¿Es un error? Es una **dependencia de dominio real**: una demanda pertenece a una aplicación, y en el backend ocurre lo mismo (el servicio de demandas consulta el catálogo de aplicaciones). Lo importante es que sea:

- **Unidireccional**: demandas depende de aplicaciones; aplicaciones no sabe nada de demandas. Si ambos se importaran mutuamente, ya no serían módulos separados.
- **Estrecha y explícita**: se usa un único hook pensado para ello (`useApplicationOptions`, documentado como «catálogo de aplicaciones para desplegables de otros módulos») y una constante. Las demandas no tocan las páginas, los componentes ni los esquemas de aplicaciones.
- **Concentrada en un único fichero**: `application-options.ts` es el único punto de contacto. Si mañana cambia la forma de obtener el catálogo, solo cambia ese fichero.

Además, como el hook comparte las claves de caché de las aplicaciones, cuando alguien crea o modifica una aplicación, los desplegables de demandas se actualizan solos (capítulo 17).

::: nota
Una mejora habitual cuando hay más dependencias entre módulos es que cada módulo publique una **API pública** en un fichero `index.ts` (por ejemplo, `features/applications/index.ts` que exporta solo `useApplicationOptions` y los tipos necesarios) y prohibir con ESLint importar cualquier otra ruta interna de otro módulo. Con una única dependencia, el proyecto no lo necesita todavía.
:::

## Qué va en `common` y qué va en un módulo

La pregunta aparece cada vez que se escribe un componente. Los criterios del proyecto:

1. **¿Necesita saber algo del dominio?** Si conoce los estados de una aplicación o las prioridades de una demanda, va en el módulo. Si recibe todo por props, puede ser común.
2. **¿Lo usa más de un módulo, o es un patrón claro de la aplicación?** Si solo lo usa un módulo y no hay motivo para pensar que otro lo necesitará, se queda en el módulo. Mover algo a común «por si acaso» crea abstracciones prematuras.
3. **Separa la apariencia del significado.** A menudo un mismo concepto tiene una parte común y otra de dominio.

El tercer criterio se ve muy bien en tres pares del proyecto:

| Común (apariencia, mecánica) | Del módulo (significado) |
|---|---|
| `components/common/badges.tsx`: `StatusPill` y `LevelBadge` con sus tonos y niveles | `application-badges.tsx`: `ACTIVE` es `success`; `CRITICAL` es nivel 4 |
| `components/common/filter-select.tsx`: desplegable de filtro con opción «Todos» | `application-filters.tsx`: filtros de estado y criticidad con sus etiquetas |
| `lib/list-params.ts`: leer y escribir página, tamaño y orden en la URL; validar enumerados | `model/list-params.ts`: qué filtros tiene el listado de aplicaciones y cómo se llaman en la URL |

::: decision Infraestructura común sin duplicar
Cuando se construyó el módulo de demandas, todo lo que resultó idéntico a aplicaciones (indicadores, cabecera ordenable, filtros, campos de formulario, aviso de recurso inexistente, utilidades de URL y paginación) se movió a `components/common` y `lib`. Resultado: **un módulo nuevo solo aporta su dominio**. Es la aplicación práctica de la regla de tres: no se generaliza con el primer caso, sino cuando aparece el segundo y se ve qué es realmente común.
:::

## `lib/`: utilidades sin interfaz

| Fichero | Qué contiene |
|---|---|
| `api-client.ts` | Cliente HTTP sobre `fetch`, `ApiError` y su interpretación (capítulo 15) |
| `list-params.ts` | Lectura, validación y escritura de paginación, orden y enumerados en la URL |
| `route-params.ts` | Conversión segura de `:id` de la ruta en un número |
| `form-errors.ts` | Traslado de los errores de validación del servidor a los campos del formulario |
| `format.ts` | Formato de fechas en hora local |
| `utils.ts` | `cn()` |

Que `lib/` no contenga componentes ni hooks de React no es casual: son **funciones normales**, que se prueban con Vitest sin montar nada (`api-client.test.ts`, `list-params.test.ts`). Cuanta más lógica pueda vivir como función pura, más fácil es de probar y de reutilizar.

## Convenciones de nombres

| Convención | Ejemplo |
|---|---|
| Ficheros y carpetas en *kebab-case* | `application-edit-page.tsx`, `list-params.ts` |
| Sufijos que dicen qué es el fichero | `-page.tsx`, `-api.ts`, `-queries.ts`, `-table.tsx`, `-filters.tsx` |
| Componentes y tipos en *PascalCase* | `ApplicationsTable`, `ApplicationListParams` |
| Constantes de módulo en mayúsculas | `APPLICATION_STATUSES`, `DEFAULT_LIST_PARAMS` |
| Pruebas junto al código, con `.test.ts` | `model/schemas.ts` y `model/schemas.test.ts` |
| `.tsx` solo si el fichero contiene JSX | `navigation.ts` (datos) frente a `sidebar-nav.tsx` |

Con estas convenciones, la búsqueda de ficheros del editor (Ctrl+P) se convierte en navegación: escribir «demand page» lista todas las páginas de demandas.

## Decisión y evolución

::: decision Organización por funcionalidad con capas compartidas
**Decisión.** Carpetas por módulo de negocio en `features/`, con una estructura interna idéntica en todos los módulos, y capas compartidas (`components/ui`, `components/layout`, `components/common`, `lib`) con dependencias en una sola dirección.

**Motivos.** El trabajo diario es por funcionalidad (añadir un campo a las demandas, un filtro a las aplicaciones): todo lo que hay que tocar está en una carpeta. Los módulos se pueden entender, probar y, llegado el caso, eliminar de forma independiente. Y la correspondencia con los paquetes del backend facilita moverse entre ambos proyectos.

**Cómo escala.** Con muchos módulos, el siguiente paso sería hacer cumplir las reglas con ESLint y publicar una API por módulo. Con varios equipos y aplicaciones, un monorepo con paquetes compartidos (por ejemplo, el sistema de diseño). Arquitecturas más complejas, como los *microfrontends*, solo se justifican con equipos independientes que despliegan por separado, que no es el caso.
:::

## Errores típicos y depuración

- **Dependencias circulares.** Si `a.ts` importa `b.ts` y `b.ts` importa `a.ts`, un valor puede llegar como `undefined` en ejecución, con errores desconcertantes del tipo *Cannot access 'X' before initialization*. Las reglas de dependencia en una sola dirección evitan casi todos los casos.
- **Un componente «común» que importa algo de un módulo.** Señal de que no es común: o se queda en el módulo, o se separa la parte de dominio (como en los indicadores).
- **Ficheros índice (`index.ts`) que reexportan todo.** Son cómodos, pero dificultan la eliminación de código muerto y favorecen los ciclos. El proyecto importa siempre desde el fichero concreto.
- **Lógica de dominio en una página.** Si una regla de negocio (por ejemplo, qué estados son finales) está escrita dentro de un componente de página, no se puede probar ni reutilizar. Llévala a `model/` (capítulo 14).

## Ejercicios

::: ejercicio Dibuja el grafo de un fichero
Elige `src/features/demands/pages/demand-edit-page.tsx` y clasifica cada una de sus importaciones según su carpeta de origen (`react`/librerías, `components/ui`, `components/common`, `lib`, mismo módulo). ¿Cumple todas las reglas? ¿Cuántas importaciones son del propio módulo y qué subcarpetas toca?
:::

::: ejercicio Haz cumplir las reglas con ESLint
Añade a `eslint.config.js` un bloque para `src/components/**` y `src/lib/**` con la regla `no-restricted-imports` que prohíba importar `@/features/*`, con un mensaje explicativo. Después, añade un bloque para `src/features/applications/**` que prohíba `@/features/demands/*`. Comprueba con `npm run lint` que el proyecto actual cumple ambas reglas y provoca una infracción a propósito para ver el mensaje.
:::

::: ejercicio Decide dónde va
Para cada pieza hipotética, indica en qué carpeta la pondrías y por qué: (a) un componente que muestra una fecha relativa («hace 3 horas»); (b) el tipo `Incident` alineado con el DTO del backend; (c) un indicador del nivel de SLA con un semáforo de colores; (d) una función que calcula si una incidencia ha incumplido su SLA a partir de sus fechas; (e) un hook que obtiene los equipos para un desplegable de incidencias.
:::

## Autoevaluación

::: preguntas
1. ¿Qué diferencia hay entre organizar por tipo técnico y por funcionalidad?
2. ¿Qué carpeta es la única que conoce todos los módulos y para qué?
3. ¿Por qué `components/common` no puede importar de `features/`?
4. ¿Qué características hacen aceptable la dependencia de demandas hacia aplicaciones?
5. ¿Qué tres criterios usa el proyecto para decidir si algo es común?
6. Explica, con el ejemplo de los indicadores, cómo se separa la apariencia del significado.
7. ¿Por qué conviene que `lib/` contenga funciones normales y no hooks?
8. ¿Qué problema pueden causar las dependencias circulares?
:::
