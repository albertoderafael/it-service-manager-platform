# Validar el sistema completo

<p class="lead">La fase 6 no añade funcionalidad: comprueba que todo lo construido funciona junto. Este capítulo explica cómo arrancar los dos servicios con el frontend, qué comprobaciones manuales confirman cada decisión importante, cómo ejecutar las pruebas de ambos proyectos y en qué se diferencian, al final, el monolito y la arquitectura de dos servicios.</p>

## Arrancar los dos servicios y el frontend [paso 6.1]

El orden de arranque importa, porque cada pieza depende de la anterior:

| Orden | Pieza | Puerto | Depende de |
|---|---|---|---|
| 1 | PostgreSQL en Docker | 5433 | — |
| 2 | `application-catalog-service` | 8081 | PostgreSQL (`application_db`) |
| 3 | `it-service-manager` (demandas) | 8080 | PostgreSQL (`it_service_manager`) y, en tiempo de ejecución, el catálogo |
| 4 | Frontend (Vite) | 5173 | Los dos servicios, a través de su proxy |

```powershell title="Arranque en desarrollo (PowerShell, una terminal por servicio)"
# 1. Base de datos (desde la carpeta it-service-manager)
docker compose up -d
docker compose ps            # esperar al estado "healthy"

# 2. Catálogo (desde application-catalog-service)
$cred = Get-Credential -UserName application_user -Message 'Base de datos del catálogo'
$env:APPLICATION_DB_PASSWORD = $cred.GetNetworkCredential().Password
.\mvnw.cmd spring-boot:run

# 3. Demandas (desde it-service-manager)
$cred = Get-Credential -UserName itmanager -Message 'Base de datos de demandas'
$env:DB_PASSWORD = $cred.GetNetworkCredential().Password
$env:SPRING_PROFILES_ACTIVE = 'docker'      # para conectar al puerto 5433
.\mvnw.cmd spring-boot:run

# 4. Frontend (desde it-service-manager-web)
npm run dev
```

Las contraseñas se piden con un diálogo y se guardan solo en variables de la sesión de PowerShell, sin quedar escritas en ningún fichero ni en el historial. El perfil `docker` del servicio de demandas es necesario porque su configuración por defecto apunta al puerto 5432 (capítulo 3).

El servicio de demandas arranca aunque el catálogo no esté en marcha: no lo llama al arrancar, solo cuando una petición lo necesita. Es un comportamiento deseable, porque permite arrancar los servicios en cualquier orden, pero significa que «arrancó bien» no garantiza que pueda trabajar.

### Comprobaciones de humo

Una vez arrancado todo, una batería corta de peticiones confirma que cada decisión importante de la guía se comporta como se espera. Pueden hacerse desde el navegador, con `curl` o con `Invoke-RestMethod`:

| # | Petición | Resultado esperado | Confirma |
|---|---|---|---|
| 1 | `GET :8081/api/applications` | 200, página con SIGMA y ORION | Catálogo, datos trasladados |
| 2 | `GET :8081/api/applications/summaries?ids=1,2` | 200, dos resúmenes | *Endpoint* de lotes (capítulo 19) |
| 3 | `GET :8080/api/demands` | 200, página con `applicationName` | Composición con el catálogo (capítulo 18) |
| 4 | `POST :8080/api/demands` con `applicationId: 1` | 201 y cabecera `Location` | Alta con comprobación remota |
| 5 | `POST :8080/api/demands` con `applicationId: 999999` | 404 `Application not found: 999999` | 404 del catálogo → 404 de negocio |
| 6 | `PUT :8080/api/demands/{id}` de `IN_PROGRESS` a `OPEN` | 409 con el mensaje de transición | Máquina de estados (capítulo 12) |
| 7 | `GET :8080/api/demands?sort=application.name` | 400 `Invalid demand sort field` | Funcionalidad retirada (capítulo 21) |
| 8 | Parar el catálogo y repetir la 3 | 503 `Application Catalog is unavailable` | Traducción de fallos (capítulo 20) |
| 9 | Arrancar el catálogo y repetir la 3 | 200 sin reiniciar demandas | Recuperación automática |

Las comprobaciones 8 y 9 son las más reveladoras: muestran que la caída del catálogo no tumba al servicio de demandas, que el error que recibe el cliente es honesto (503, no 404 ni 500) y que el sistema se recupera solo.

::: proyecto
En desarrollo, el frontend no llama a los puertos 8080 y 8081 directamente: el proxy de Vite reenvía `/api/applications` al catálogo y `/api/demands` al servicio de demandas. Para el navegador todo tiene el mismo origen, así que no hace falta CORS. La guía del frontend explica esa configuración y qué cambiaría en producción.
:::

## Ejecutar las suites de pruebas [paso 6.2]

Cada proyecto tiene su suite, y las dos necesitan Docker arrancado para sus pruebas de integración:

```powershell
# En application-catalog-service
.\mvnw.cmd test

# En it-service-manager
.\mvnw.cmd test
```

Recuento de las pruebas que existen en cada proyecto al cierre de la fase 5:

| Proyecto | Clase | Tipo | Pruebas |
|---|---|---|---|
| Catálogo | `ApplicationServiceTest` | Unitaria | 8 |
| | `ApplicationControllerTest` | Capa web | 7 |
| | `ApplicationIntegrationTest` | Integración | 2 |
| | `ApplicationCatalogServiceApplicationTests` | Integración (contexto) | 1 |
| | **Total** | | **18** |
| Demandas | `DemandTest` | Unitaria (dominio) | 5 |
| | `DemandServiceTest` | Unitaria | 3 |
| | `DemandCatalogTest` | Unitaria | 7 (10 tras el cierre) |
| | `DemandControllerTest` | Capa web | 8 |
| | `RestApplicationCatalogTest` | Adaptador con servidor HTTP real | 5 (7 tras el cierre) |
| | `DemandIntegrationTest` | Integración | 6 |
| | `ItServiceManagerApplicationTests` | Integración (contexto) | 1 |
| | **Total** | | **35 (40 tras el cierre)** |

::: proyecto Resultado de la ejecución (26 de octubre de 2026)
La primera edición de esta guía se escribió leyendo el código, sin ejecutarlo, y por eso no afirmaba que las pruebas pasaran. Las suites se ejecutaron después en Windows con Java 21, Maven y Docker: **18 pruebas del catálogo y 40 del servicio de demandas, todas en verde** (`BUILD SUCCESS`). Las 40 incluyen 5 pruebas nuevas añadidas en el cierre de la fase 7 (capítulo 25): tres en `DemandCatalogTest` (demanda cuya aplicación ya no existe en el listado y en el detalle, y demanda inexistente sin llegar a llamar al catálogo) y dos en `RestApplicationCatalogTest` (4xx inesperado y respuesta ilegible, ambos traducidos a 502). El frontend pasa sus 39 pruebas.
:::

### Qué cubre la suite y qué no

<figure>
<svg viewBox="0 0 680 210" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="9.8">
  <g text-anchor="middle">
    <rect x="20" y="20" width="200" height="34" rx="6" fill="#ecfdf5" stroke="#6ee7b7"/><text x="120" y="41">Reglas de dominio</text>
    <rect x="240" y="20" width="200" height="34" rx="6" fill="#ecfdf5" stroke="#6ee7b7"/><text x="340" y="41">Contrato HTTP de cada servicio</text>
    <rect x="460" y="20" width="200" height="34" rx="6" fill="#ecfdf5" stroke="#6ee7b7"/><text x="560" y="41">SQL, Flyway y PostgreSQL reales</text>
    <rect x="20" y="66" width="200" height="34" rx="6" fill="#ecfdf5" stroke="#6ee7b7"/><text x="120" y="87">Composición por lotes</text>
    <rect x="240" y="66" width="200" height="34" rx="6" fill="#ecfdf5" stroke="#6ee7b7"/><text x="340" y="87">Adaptador HTTP: 404, 500, sin conexión</text>
    <rect x="460" y="66" width="200" height="34" rx="6" fill="#ecfdf5" stroke="#6ee7b7"/><text x="560" y="87">Ausencia de la clave foránea</text>
    <rect x="20" y="130" width="200" height="34" rx="6" fill="#fffbeb" stroke="#fcd34d"/><text x="120" y="151">Tiempo máximo de lectura</text>
    <rect x="240" y="130" width="200" height="34" rx="6" fill="#fffbeb" stroke="#fcd34d"/><text x="340" y="151">Los dos servicios juntos, de verdad</text>
    <rect x="460" y="130" width="200" height="34" rx="6" fill="#fffbeb" stroke="#fcd34d"/><text x="560" y="151">Compatibilidad del contrato entre ellos</text>
    <rect x="20" y="170" width="200" height="34" rx="6" fill="#fffbeb" stroke="#fcd34d"/><text x="120" y="191">Transiciones hacia CANCELLED</text>
    <rect x="240" y="170" width="200" height="34" rx="6" fill="#fffbeb" stroke="#fcd34d"/><text x="340" y="191">Contrato con el frontend</text>
    <rect x="460" y="170" width="200" height="34" rx="6" fill="#fffbeb" stroke="#fcd34d"/><text x="560" y="191">Errores sin manejador (500)</text>
  </g>
  <text x="20" y="13" font-weight="700" fill="#047857">CUBIERTO</text>
  <text x="20" y="123" font-weight="700" fill="#b45309">SIN CUBRIR</text>
</svg>
<figcaption><b>Figura 22.1.</b> Cobertura de la suite. Cada servicio se prueba por separado; nada comprueba automáticamente que los dos encajan.</figcaption>
</figure>

El hueco más relevante es la **compatibilidad entre los dos servicios**. Las pruebas del servicio de demandas simulan el catálogo (con `@MockitoBean` o con el servidor del JDK), y las respuestas simuladas están escritas a mano. Si mañana el catálogo cambiara el nombre del campo `name` en `/summaries`, todas las pruebas de ambos proyectos seguirían pasando y el sistema fallaría en ejecución. Este riesgo se aborda con **pruebas de contrato** (por ejemplo, Spring Cloud Contract o Pact), en las que el consumidor declara lo que espera y el proveedor verifica que lo cumple.

## Monolito frente a dos servicios [paso 6.3]

| Aspecto | Monolito (fase 4) | Dos servicios (fase 5) |
|---|---|---|
| Procesos | 1 (8080) | 2 (8080 y 8081) |
| Bases de datos | 1, compartida por los módulos | 2, una por servicio (misma instancia en desarrollo) |
| Relación Demand → Application | Asociación `@ManyToOne` | `Long applicationId` + puerto `ApplicationCatalog` |
| Comprobar que la aplicación existe | Consulta local en la misma transacción | Petición HTTP con tiempos máximos |
| Nombre de la aplicación en el listado | Unión SQL con `@EntityGraph` | Una petición por lote por página |
| Integridad referencial | Clave foránea | Comprobación en el servicio al crear y modificar |
| Ordenar demandas por aplicación | Sí, en SQL | No; retirado |
| Consistencia del nombre | Siempre actual (misma base de datos) | Siempre actual (se pide cada vez) |
| Si falla la parte de aplicaciones | Falla todo el proceso | Demandas responde 503 en lo que necesita el catálogo |
| Transacciones | ACID entre módulos | Locales a cada servicio |
| Latencia de un listado | Una consulta (más el recuento) | Consulta + recuento + una petición HTTP |
| Despliegue | Uno | Dos, independientes |
| Pruebas de integración | Un contenedor, todo real | Un contenedor por servicio; el otro servicio simulado |
| Complejidad operativa | Baja | Mayor: dos procesos, dos configuraciones, dos bases de datos |
| Preparado para nuevos módulos que usen el catálogo | No: todos dependerían de la entidad | Sí: cualquier módulo puede usar la API del catálogo |

La tabla deja claro que la separación **no es gratis**: se perdió una funcionalidad, aumentó la latencia del listado y apareció un modo de fallo nuevo. A cambio, el catálogo tiene un dueño, una API explícita y una base de datos propia, y los módulos futuros pueden apoyarse en él sin acoplarse a su modelo interno.

::: decision ¿Mereció la pena?
Para el tamaño actual del sistema, un monolito modular con el puerto `ApplicationCatalog` y su adaptador JPA (el estado al final del paso 5.6) habría sido igual de mantenible y más sencillo de operar. La extracción completa se justifica por el crecimiento previsto (incidencias, equipos) y por el objetivo de aprendizaje del proyecto. Lo más valioso del proceso no fue el resultado, sino el método: la frontera se diseñó dentro del monolito y la red llegó después.
:::

## Ejercicios

::: ejercicio Ejecutar la batería de humo
Arranca el sistema completo y realiza las nueve comprobaciones de la tabla. Anota el código de estado y el tiempo de respuesta de la comprobación 3 en condiciones normales y de la 8 con el catálogo parado. ¿Por qué la 8 responde casi al instante y no tarda los cinco segundos de los tiempos máximos?
:::

::: ejercicio Ejecutar y registrar las suites
Ejecuta `mvnw test` en los dos proyectos y comprueba que el número de pruebas ejecutadas coincide con la tabla (18 y 35). Si alguna falla, identifica a qué nivel pertenece y qué capítulo explica lo que prueba.
:::

::: preguntas
1. ¿Por qué el servicio de demandas puede arrancar aunque el catálogo esté parado, y qué implica eso?
2. ¿Qué comprobación de humo demuestra que el sistema distingue «no existe» de «no está disponible»?
3. ¿Por qué ninguna de las 53 pruebas detectaría un cambio de nombre de campo en `/summaries`?
4. Cita tres cosas que se perdieron y tres que se ganaron al pasar a dos servicios.
5. ¿Qué estado intermedio de la fase 5 habría sido suficiente para el tamaño actual del sistema?
:::
