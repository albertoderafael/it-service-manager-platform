# Registro de decisiones de arquitectura

<p class="lead">A lo largo de la guía han aparecido más de cuarenta recuadros «Decisión de diseño». Este capítulo los reúne en un registro de decisiones de arquitectura (ADR): un formato breve y estándar que explica qué se decidió, por qué y con qué consecuencias. Sirve como resumen de la guía, como documentación para quien se incorpore al proyecto y como plantilla para las decisiones que vendrán.</p>

## Qué es un ADR y para qué sirve

Un ***Architecture Decision Record*** es un documento corto que recoge **una** decisión significativa. El formato más extendido, propuesto por Michael Nygard, tiene cinco apartados:

| Apartado | Contenido |
|---|---|
| Título y número | `ADR-007: El estado de los listados vive en la URL` |
| Estado | Propuesta, aceptada, sustituida por ADR-NNN, obsoleta |
| Contexto | Qué problema o fuerza obliga a decidir |
| Decisión | Qué se hace, en una o dos frases |
| Consecuencias | Qué se gana, qué se pierde y qué obliga a hacer a partir de ahora |

Las ventajas son prácticas. Dentro de un año, cuando alguien pregunte «¿por qué no usamos Redux?» o «¿por qué los filtros están en la URL?», la respuesta estará escrita con el contexto de entonces. Y cuando el contexto cambie, se escribe un ADR nuevo que **sustituye** al anterior, en lugar de borrar la historia.

::: java
Si has trabajado en un equipo grande con un comité de arquitectura, es la versión ligera de un documento de diseño. La convención habitual es guardarlos en el propio repositorio, en `docs/adr/`, como ficheros Markdown numerados (`0007-estado-listados-en-url.md`), para que viajen con el código y se revisen en las mismas solicitudes de cambio.
:::

## El registro del proyecto

Las decisiones están agrupadas por área. Cada una enlaza mentalmente con el capítulo donde se explica a fondo.

### Plataforma y herramientas

::: decision ADR-001 · SPA pura construida con Vite
**Contexto.** El backend es una API REST independiente en Spring Boot; la aplicación es interna y autenticada.
**Decisión.** SPA servida como ficheros estáticos, construida con Vite; sin renderizado en servidor.
**Consecuencias.** Un único servidor que mantener (el backend); despliegue estático; primera carga algo mayor, mitigada con división del código. Hay que configurar el *fallback* a `index.html` en producción. *Capítulos 1 y 4.*
:::

::: decision ADR-002 · TypeScript en modo estricto
**Contexto.** Código mantenido a largo plazo por un equipo acostumbrado al tipado estático de Java.
**Decisión.** TypeScript con `strict` y comprobaciones de variables y parámetros sin usar; dos subproyectos (navegador y Node).
**Consecuencias.** Errores de nulos y de contrato detectados al compilar; algo más de código en los tipos. Vite no comprueba tipos: `npm run typecheck` y el *build* lo hacen. *Capítulos 2 y 5.*
:::

::: decision ADR-003 · npm, ESLint con reglas recomendadas y sin formateador (por ahora)
**Contexto.** Proyecto único, sin necesidades de monorepo.
**Decisión.** npm como gestor; ESLint con los conjuntos recomendados de JS, TypeScript, *hooks* y React Refresh.
**Consecuencias.** Configuración mínima y estándar. Pendiente: añadir Prettier. *Capítulos 3 y 5.*
:::

### Interfaz

::: decision ADR-004 · Tailwind CSS 4 con tokens propios
**Contexto.** Se busca una estética propia (azul oscuro, pizarra, cian) y coherente en todas las pantallas.
**Decisión.** Tailwind CSS 4 con un tema de tokens en `index.css` (variables OKLCH + `@theme inline`), siguiendo la convención de shadcn/ui.
**Consecuencias.** Estilos junto al componente; CSS final pequeño; clases siempre completas (no dinámicas). Modo oscuro preparado pero sin definir. *Capítulo 10.*
:::

::: decision ADR-005 · Componentes de shadcn/ui sobre Radix, copiados al proyecto
**Contexto.** Se necesitan componentes accesibles (desplegables, paneles, *tooltips*) con aspecto propio.
**Decisión.** shadcn/ui copiado en `components/ui`, sobre los primitivos de Radix.
**Consecuencias.** Accesibilidad y comportamiento resueltos; control total del aspecto; hay que mantener el código copiado y no meter lógica de negocio en `ui/`. *Capítulo 11.*
:::

::: decision ADR-006 · Todas las pantallas contemplan todos sus estados
**Contexto.** Una API puede tardar, fallar o devolver listas vacías.
**Decisión.** Cada pantalla que carga datos pinta explícitamente carga, error, vacío y datos, con componentes comunes.
**Consecuencias.** Nunca hay pantallas en blanco sin explicación; las páginas tienen más ramas, pero son uniformes. *Capítulos 6 y 12.*
:::

### Arquitectura

::: decision ADR-007 · Organización por funcionalidad con capas compartidas
**Contexto.** La aplicación crecerá módulo a módulo (aplicaciones, demandas, incidencias, equipos, SLA).
**Decisión.** `features/<módulo>` con estructura interna fija (`api`, `model`, `components`, `pages`, `routes.ts`) y capas compartidas con dependencias en una sola dirección.
**Consecuencias.** Todo lo de un módulo en una carpeta; correspondencia con los paquetes del backend; una dependencia entre módulos permitida y documentada (catálogo de aplicaciones). *Capítulos 13 y 14.*
:::

::: decision ADR-008 · Infraestructura común sin duplicar
**Contexto.** Al construir demandas, gran parte del código de aplicaciones resultó idéntico.
**Decisión.** Mover lo común (indicadores, filtros, campos, paginación, utilidades de URL) a `components/common` y `lib`, separando apariencia y significado.
**Consecuencias.** Un módulo nuevo solo aporta su dominio. Generalizar con el segundo caso, no con el primero. *Capítulo 13.*
:::

::: decision ADR-009 · Menú lateral declarativo por módulos y acciones
**Contexto.** Los usuarios trabajan por acciones («nueva demanda», «modificar aplicación»).
**Decisión.** Un grupo por módulo con sus acciones, definido como datos en `navigation.ts`; módulos futuros marcados como «Pronto».
**Consecuencias.** Añadir un módulo al menú es añadir datos; el mismo menú sirve en escritorio y móvil. *Capítulo 12.*
:::

### Datos

::: decision ADR-010 · Cliente HTTP propio sobre `fetch` con un modelo de errores uniforme
**Contexto.** Hay que interpretar varios formatos de error (backend, Spring por defecto, proxy) y mostrarlos de forma comprensible.
**Decisión.** Un cliente mínimo sobre `fetch` que convierte cualquier fallo en un `ApiError` con `kind`, `status`, mensaje y errores por campo.
**Consecuencias.** Un único sitio para la URL base, la serialización y, en el futuro, la autenticación; sin axios. *Capítulo 15.*
:::

::: decision ADR-011 · Mismo origen: proxy en desarrollo y proxy inverso en producción
**Contexto.** El backend no tiene CORS; la API está repartida en dos servicios.
**Decisión.** URL base relativa `/api`; Vite reparte los prefijos en desarrollo y un proxy inverso o pasarela lo hará en producción.
**Consecuencias.** Sin CORS que mantener; el mismo *build* para todos los entornos. *Capítulos 4 y 16.*
:::

::: decision ADR-012 · TanStack Query para todo el estado del servidor
**Contexto.** Los datos de la API se comparten entre pantallas, se cachean y se invalidan al escribir.
**Decisión.** `useQuery`/`useMutation` con claves jerárquicas por módulo; `staleTime` de 30 s, sin refresco al recuperar el foco, sin reintentar 4xx ni mutaciones; tras escribir, actualizar el detalle e invalidar los listados.
**Consecuencias.** Sin `fetch` en efectos ni datos del servidor en `useState`; navegación instantánea a datos ya vistos. *Capítulo 17.*
:::

::: decision ADR-013 · Sin librería de estado global
**Contexto.** El estado se reparte entre servidor, URL, formularios e interfaz local.
**Decisión.** No usar Redux, Zustand ni similares; contexto solo para servicios y familias de componentes.
**Consecuencias.** Menos conceptos y dependencias. Se reconsiderará si aparece estado de cliente compartido y cambiante. *Capítulo 9.*
:::

::: decision ADR-014 · Tipos de los DTO escritos a mano; validación en ejecución solo de la entrada del usuario
**Contexto.** El contrato con el backend está controlado por el mismo equipo.
**Decisión.** Tipos en `model/types.ts` alineados a mano con los DTO; Zod solo para formularios.
**Consecuencias.** Sincronización manual: cuando cambie el backend, hay que revisar tipos y listas (el desajuste de ordenación de demandas es un ejemplo). Evolución propuesta: generar tipos desde OpenAPI (ver ADR-022). *Capítulos 2 y 25.*
:::

### Navegación y formularios

::: decision ADR-015 · Router de datos sin cargadores, con carga diferida por página
**Contexto.** Se quieren límites de error por ruta, títulos por ruta y *chunks* por página, pero los datos ya los gestiona TanStack Query.
**Decisión.** `createBrowserRouter` con rutas por módulo, `lazy`, `errorElement` y `handle`; sin `loader` ni `action`.
**Consecuencias.** Un único mecanismo de datos; páginas que se pintan enseguida con esqueletos. *Capítulo 18.*
:::

::: decision ADR-016 · El estado de los listados vive en la URL
**Contexto.** Los listados se recargan, se comparten y se navegan con el historial.
**Decisión.** Filtros, página, tamaño y orden en la URL (nombres en español, páginas desde 1, valores por defecto omitidos), validados al leer con funciones puras.
**Consecuencias.** Recargar, compartir y *atrás* funcionan sin código adicional; más código de lectura y escritura, probado. *Capítulo 19.*
:::

::: decision ADR-017 · React Hook Form + Zod, alineados con Bean Validation
**Contexto.** Formularios con reglas, transformaciones y errores del servidor.
**Decisión.** Esquemas de Zod como fuente única de reglas; React Hook Form con `zodResolver`; campos genéricos sobre `Form` de shadcn/ui; validación al enviar.
**Consecuencias.** Reglas probadas de forma aislada; conversión explícita formulario ↔ DTO; las constantes deben coincidir con `@Size` del backend. *Capítulo 20.*
:::

::: decision ADR-018 · Reglas de negocio reflejadas en el cliente y subordinadas al backend
**Contexto.** El usuario debe ver qué transiciones de estado puede hacer antes de intentarlo.
**Decisión.** Copia explícita de la regla en `status-rules.ts`, aplicada en el desplegable y en el esquema; el backend sigue siendo la autoridad y su 409 se explica con opción de recargar.
**Consecuencias.** Mejor experiencia; duplicación localizada y probada que hay que mantener sincronizada. *Capítulo 22.*
:::

### Calidad

::: decision ADR-019 · Pruebas unitarias de la lógica pura primero
**Contexto.** Hay que proteger reglas que se rompen sin notarse en pruebas manuales.
**Decisión.** Vitest sobre `model/` y `lib/`; componentes y extremo a extremo, más adelante.
**Consecuencias.** 38 pruebas rápidas y estables; las pantallas siguen sin pruebas automáticas. *Capítulo 23.*
:::

## Decisiones propuestas

Estas decisiones no se han tomado todavía. Están redactadas como **propuestas** para discutirlas cuando llegue el momento:

::: decision ADR-020 (propuesta) · Autenticación con cookie de sesión gestionada por el backend
**Contexto.** La aplicación será interna y necesitará identificar al usuario.
**Propuesta.** Autenticación en el backend (Spring Security, idealmente contra el proveedor de identidad corporativo) con una *cookie* `HttpOnly` en el mismo origen; el cliente HTTP trata el 401 de forma global y la caché se vacía al cerrar sesión.
**Alternativa.** *Tokens* JWT gestionados en el navegador (más expuestos a XSS). *Capítulos 15 y 16.*
:::

::: decision ADR-021 (propuesta) · Pruebas de extremo a extremo con Playwright
**Propuesta.** Un recorrido principal por módulo contra el backend real, ejecutado en integración continua con los servicios levantados con Docker Compose o Testcontainers.
:::

::: decision ADR-022 (propuesta) · Contrato generado desde OpenAPI
**Contexto.** Los tipos y listas del frontend se desincronizan del backend (desajuste de ordenación).
**Propuesta.** Añadir springdoc-openapi a los servicios y generar los tipos con `openapi-typescript` en un script de `package.json`; una prueba o un paso de la integración continua falla si el contrato cambia sin regenerar.
:::

::: decision ADR-023 (propuesta) · Formateo automático con Prettier
**Propuesta.** Prettier con `eslint-config-prettier` y el plugin de ordenación de clases de Tailwind, ejecutado al guardar y en la integración continua.
:::

## Cómo escribir los siguientes ADR

Cuando tengas que tomar una decisión que cumpla alguna de estas condiciones, merece un ADR:

- Es **difícil de revertir** (elegir una librería central, un formato de URL, un modelo de autenticación).
- **Afecta a varios módulos** o a la forma de trabajar del equipo.
- Se descartaron **alternativas razonables** que alguien volverá a proponer.

Plantilla mínima:

```markdown title="docs/adr/0024-titulo-breve.md"
# ADR-024: Título breve en forma de decisión

- Estado: propuesta | aceptada | sustituida por ADR-NNN
- Fecha: AAAA-MM-DD

## Contexto
Qué problema hay y qué fuerzas intervienen (requisitos, restricciones, equipo).

## Decisión
Qué se hace, en una o dos frases.

## Consecuencias
Qué se gana, qué se pierde, qué hay que hacer a partir de ahora.

## Alternativas consideradas
Cada una con el motivo por el que se descartó.
```

::: proyecto
Un buen primer paso sería crear `docs/adr/` en el proyecto con los ADR 001 a 019 de este capítulo, uno por fichero. Además de documentar el proyecto, es un ejercicio excelente para repasar la guía: escribir cada decisión con tus palabras obliga a entenderla.
:::

## Errores típicos

- **ADR demasiado largos.** Si ocupa varias páginas, es un documento de diseño. Un ADR se lee en dos minutos.
- **Decisiones sin alternativas.** Sin las opciones descartadas, el ADR no responde a «¿y por qué no X?», que es su principal utilidad.
- **Reescribir ADR antiguos.** Cuando una decisión cambia, se escribe uno nuevo que sustituye al anterior y se marca el antiguo como sustituido.
- **Registrar trivialidades.** El nombre de una variable no es una decisión de arquitectura.

## Ejercicios

::: ejercicio Escribe un ADR sobre la ordenación de demandas
Escribe un ADR completo, en estado «propuesta», que resuelva el desajuste entre los campos de ordenación del frontend y del backend. Incluye el contexto (la separación del servicio de aplicaciones), al menos dos alternativas y las consecuencias para ambos proyectos.
:::

::: ejercicio Evalúa una decisión con otro contexto
Imagina que la aplicación pasa a ser pública, para clientes externos, con miles de usuarios concurrentes y necesidad de buen posicionamiento en buscadores. ¿Qué ADR de este capítulo revisarías y en qué sentido? Elige tres y razona brevemente.
:::

::: ejercicio Crea el registro en el repositorio
Crea la carpeta `docs/adr/` con un `README.md` que explique el formato y los ADR 001, 012 y 016 escritos con tus palabras siguiendo la plantilla. Añade al `README.md` del proyecto un enlace a la carpeta.
:::

## Autoevaluación

::: preguntas
1. ¿Qué cinco apartados tiene un ADR según el formato de Nygard?
2. ¿Qué se hace con un ADR cuando la decisión cambia?
3. ¿Qué tres condiciones indican que una decisión merece un ADR?
4. ¿Qué ADR explica por qué no hay `fetch` dentro de efectos?
5. ¿Qué consecuencia negativa de ADR-014 se ha materializado ya en el proyecto?
6. ¿Por qué es importante registrar las alternativas descartadas?
:::
