# Mapa cronológico del desarrollo

<p class="lead">Este capítulo es el plano de toda la guía. Reúne los pasos reales del desarrollo del backend, en su orden y agrupados en siete fases, con una línea por paso. Cada número enlaza con la sección que lo explica, y cada sección tiene un enlace de vuelta a su línea.</p>

## Las fases de un vistazo

El backend no se diseñó como microservicios desde el principio. Empezó como un **monolito modular**: una sola aplicación Spring Boot, una sola base de datos PostgreSQL y dos módulos de negocio, `application` y `demand`, que vivían en paquetes separados. Solo cuando el monolito estaba terminado y probado se decidió separar el catálogo de aplicaciones en un servicio propio.

<figure>
<svg viewBox="0 0 680 250" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="m1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <line x1="20" y1="70" x2="660" y2="70" stroke="#0891b2" stroke-width="2" marker-end="url(#m1)"/>
  <rect x="20" y="20" width="420" height="22" rx="4" fill="#0b1220"/><text x="230" y="35" text-anchor="middle" fill="#fff" font-weight="700">Monolito: una aplicación, una base de datos (puerto 8080)</text>
  <rect x="450" y="20" width="210" height="22" rx="4" fill="#0e7490"/><text x="555" y="35" text-anchor="middle" fill="#fff" font-weight="700">Dos servicios (8080 + 8081)</text>
  <g font-weight="700" fill="#0b1220" text-anchor="middle">
    <circle cx="55" cy="70" r="9" fill="#0891b2"/><text x="55" y="74" fill="#fff">1</text>
    <circle cx="160" cy="70" r="9" fill="#0891b2"/><text x="160" y="74" fill="#fff">2</text>
    <circle cx="275" cy="70" r="9" fill="#0891b2"/><text x="275" y="74" fill="#fff">3</text>
    <circle cx="385" cy="70" r="9" fill="#0891b2"/><text x="385" y="74" fill="#fff">4</text>
    <circle cx="500" cy="70" r="9" fill="#0e7490"/><text x="500" y="74" fill="#fff">5</text>
    <circle cx="615" cy="70" r="9" fill="#0e7490"/><text x="615" y="74" fill="#fff">6</text>
  </g>
  <g text-anchor="middle" font-size="9.5">
    <text x="55" y="100" font-weight="700">Preparación</text>
    <text x="55" y="114" fill="#475569">Boot 4, Docker</text><text x="55" y="127" fill="#475569">configuración</text><text x="55" y="140" fill="#475569">Flyway V1-V2</text>
    <text x="160" y="100" font-weight="700">Application</text>
    <text x="160" y="114" fill="#475569">entidad, repositorio</text><text x="160" y="127" fill="#475569">servicio, DTO</text><text x="160" y="140" fill="#475569">API, errores, pruebas</text>
    <text x="275" y="100" font-weight="700">Demand</text>
    <text x="275" y="114" fill="#475569">V3 con FK</text><text x="275" y="127" fill="#475569">ciclo de vida</text><text x="275" y="140" fill="#475569">Specification, N+1</text>
    <text x="385" y="100" font-weight="700">Monolito final</text>
    <text x="385" y="114" fill="#475569">revisión del conjunto</text><text x="385" y="127" fill="#475569">Testcontainers</text><text x="385" y="140" fill="#475569">acoplamiento</text>
    <text x="500" y="100" font-weight="700">Extracción</text>
    <text x="500" y="114" fill="#475569">puerto del catálogo</text><text x="500" y="127" fill="#475569">nuevo servicio</text><text x="500" y="140" fill="#475569">RestClient, V4-V5</text>
    <text x="615" y="100" font-weight="700">Validación</text>
    <text x="615" y="114" fill="#475569">puesta en marcha</text><text x="615" y="127" fill="#475569">lecciones</text><text x="615" y="140" fill="#475569">pendientes</text>
  </g>
  <rect x="20" y="170" width="640" height="66" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="36" y="192" font-weight="700" fill="#0b1220">Hilo conductor</text>
  <text x="36" y="210" fill="#334155">Demand necesita saber que una aplicación existe y cómo se llama. Ese único punto de contacto es</text>
  <text x="36" y="225" fill="#334155">primero una asociación JPA, después un puerto dentro del monolito y, al final, una llamada HTTP.</text>
</svg>
<figcaption><b>Figura 1.1.</b> Las seis fases del desarrollo. La línea divisoria entre la fase 4 y la 5 separa el monolito de la arquitectura de dos servicios.</figcaption>
</figure>

La figura muestra las seis fases que llevaron del monolito a los dos servicios. Después llegó una **séptima fase**, que cerró los defectos encontrados en la sexta y empaquetó todo el sistema en contenedores: dos servicios en Docker, un PostgreSQL y el frontend detrás de nginx, levantados con un solo comando.

La figura resume la idea más importante de la guía: **la frontera entre módulos se diseñó antes de convertirse en una frontera de red**. Las fases 1 a 4 construyen un monolito correcto; la fase 5 lo transforma paso a paso, de forma que cada paso deja el sistema funcionando.

## Cómo leer el mapa

Cada fila del mapa es un paso real del desarrollo. La primera columna es su número (fase.paso) y enlaza con la sección que lo desarrolla; la última columna indica el número de esa sección. Algunos pasos llevan una marca de estado:

- {{reconstruido}}: el código de ese paso ya no existe, porque la fase 5 lo sustituyó. La sección lo reconstruye y explica de dónde sale.
- {{despues}}: el paso se incorporó más tarde que los de su alrededor, aunque se explica junto a ellos porque pertenece al mismo tema.
- {{refactor}}: el paso cambia código que ya se había explicado antes.

El número de pasos de cada fase no es arbitrario: es el número de cambios con entidad propia que hubo. La fase 2 tiene más porque construye todas las capas por primera vez; la fase 4 tiene pocos porque no añade funcionalidad, solo revisa.

## El mapa paso a paso

::: mapa 1 Concepción y preparación
1.1 Elegir Java 21 y Spring Boot 4.1.1 y generar el proyecto con sus *starters*
1.2 Organizar el código por módulo de negocio, con un paquete por capa dentro de cada módulo
1.3 Levantar PostgreSQL 18 en Docker con volumen persistente y comprobación de salud
1.4 Configurar la conexión con variables de entorno, `ddl-auto=validate` y `open-in-view=false`
1.5 Adoptar Flyway: la migración V1 crea la tabla `applications`
1.6 La migración V2 carga las aplicaciones iniciales
:::

::: mapa 2 El módulo Application
2.1 Mapear la entidad `Application`, sin *setters* y con un método `update`
2.2 Crear `ApplicationRepository` con consultas derivadas paginadas
2.3 Implementar la consulta, el detalle con 404 y el alta como `ACTIVE` en `ApplicationService`
2.4 Implementar la modificación por *dirty checking*, sin llamar a `save`
2.5 Definir los DTO como *records* y validarlos con Bean Validation
2.6 Exponer `/api/applications` con paginación por defecto y `201 Created`
2.7 Devolver la página en un DTO propio, `ApplicationPageResponse`
2.8 Unificar los errores con `GlobalExceptionHandler` y `ApiErrorResponse`
2.9 {{despues}} Rechazar con 400 los filtros y campos de ordenación desconocidos
2.10 {{despues}} Añadir manejadores para tipos incorrectos y cuerpos JSON mal formados
2.11 Probar el servicio con Mockito y el controlador con MockMvc
:::

::: mapa 3 El módulo Demand
3.1 La migración V3 crea `demands` con clave foránea, índices y fechas con zona horaria
3.2 {{reconstruido}} Mapear `Demand` con una asociación `@ManyToOne` hacia `Application`
3.3 Encapsular el ciclo de vida de la demanda en `changeStatus`
3.4 Filtrar el listado con `Specification` y `JpaSpecificationExecutor`
3.5 Validar estado, prioridad y campos de ordenación del listado
3.6 {{reconstruido}} Evitar el problema N+1 del listado con `@EntityGraph`
3.7 Crear y modificar demandas; traducir una transición inválida a 409
3.8 Probar el dominio, el servicio y el controlador de demandas
:::

::: mapa 4 El monolito terminado
4.1 Revisar el monolito completo: capas, *endpoints* y contrato con el frontend
4.2 Ejecutar las pruebas contra un PostgreSQL real con Testcontainers
4.3 Identificar el acoplamiento entre Demand y Application
:::

::: mapa 5 Evolución a dos microservicios
5.1 Decidir extraer Application y planificar la extracción en pasos reversibles
5.2 Definir el puerto `ApplicationCatalog` y el *record* `ApplicationSummary`
5.3 {{refactor}} Sustituir la asociación por un identificador escalar `applicationId`
5.4 {{reconstruido}} Implementar el catálogo con JPA dentro del monolito
5.5 Consultar el catálogo una sola vez por página en el listado
5.6 {{reconstruido}} Aislar la ordenación por nombre de aplicación en un adaptador de consultas
5.7 Crear `application-catalog-service` con su propia base de datos
5.8 Añadir `GET /api/applications/summaries` para consultas por lote
5.9 Trasladar los datos de aplicaciones a la nueva base de datos
5.10 Implementar `RestApplicationCatalog` con `RestClient` y tiempos máximos
5.11 Traducir los fallos remotos: 404 a «no existe», error 5xx o de red a 503
5.12 Probar el adaptador contra un servidor HTTP real del JDK
5.13 La migración V4 elimina la clave foránea y la V5 la tabla heredada
5.14 Retirar la ordenación por nombre de aplicación
5.15 Probar Demand sin clave foránea y con el catálogo simulado
:::

::: mapa 6 Validación, estado final y pendientes
6.1 Arrancar los dos servicios y comprobarlos junto con el frontend
6.2 Ejecutar las suites de pruebas de ambos servicios
6.3 Comparar el monolito con la arquitectura de dos servicios
6.4 Recoger los errores cometidos y las lecciones aprendidas
6.5 Documentar el estado final y los próximos pasos
:::

::: mapa 7 Cierre de la separación y despliegue con Docker
7.1 Poner los dos servicios bajo control de versiones antes de tocar nada
7.2 Sacar las llamadas al catálogo de las transacciones con `TransactionOperations`
7.3 Traducir cualquier respuesta inesperada del catálogo a 502 y añadir un manejador de último recurso
7.4 Degradar el listado y el detalle cuando falta una aplicación, en lugar de fallar
7.5 Leer toda la configuración de variables de entorno y retirar el perfil `docker`
7.6 Exponer el estado de salud con Spring Boot Actuator
7.7 Construir cada servicio con un Dockerfile de dos etapas y el JAR por capas
7.8 Ejecutar con un usuario sin privilegios y excluir secretos con `.dockerignore`
7.9 Crear el repositorio `it-service-platform` con el Compose del sistema completo
7.10 Inicializar las bases de datos y sus usuarios con un *script* versionado
7.11 Comprobar la salud de cada contenedor sin añadir herramientas a la imagen
7.12 Servir el frontend con nginx como proxy inverso hacia los dos servicios
7.13 Validar el sistema en contenedores y retirar el Compose antiguo
:::

## Rutas de lectura

La lectura recomendada es secuencial: cada fase se apoya en la anterior. Si buscas algo concreto, estas rutas te llevan directamente:

| Si quieres… | Lee |
|---|---|
| Entender JPA e Hibernate en Spring | Capítulos 5, 6, 7 y 14 |
| Seguir una petición HTTP de principio a fin | Capítulo 9 (figura del flujo completo) |
| Entender cómo se trocea un monolito sin romperlo | Capítulos 17 y 18 |
| Ver cómo se llama a otro servicio de forma robusta | Capítulo 20 |
| Saber qué queda por hacer | Capítulo 24 |
| Meter un sistema Spring en contenedores | Capítulos 26 y 27 |
