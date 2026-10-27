# PostgreSQL en Docker y la configuración de la aplicación

<p class="lead">Antes de la primera entidad hacía falta una base de datos reproducible y una configuración que no guardara secretos en el código. Este capítulo explica el fichero de Docker Compose, cada propiedad de <code>application.properties</code> y las dos decisiones de JPA que más condicionan el resto del proyecto.</p>

## PostgreSQL 18 en un contenedor [paso 1.3]

En lugar de instalar PostgreSQL en Windows, la base de datos se ejecuta en un contenedor Docker descrito en `compose.yaml`:

```yaml title="it-service-manager/compose.yaml" estado="impl"
services:

  postgres:
    image: postgres:18.6
    environment:
      POSTGRES_DB: it_service_manager
      POSTGRES_USER: itmanager
      POSTGRES_PASSWORD: ${DB_PASSWORD}

    ports:
      - "5433:5432"

    volumes:
      - postgres_data:/var/lib/postgresql

    healthcheck:
      test:
        [
          "CMD-SHELL",
          "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"
        ]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

volumes:
  postgres_data:
```

Cada bloque responde a una necesidad concreta:

**`image: postgres:18.6`.** La versión está fijada hasta el parche. Con `postgres:latest`, un `docker compose pull` cualquiera podría traer una versión mayor nueva, y PostgreSQL no puede abrir directamente los ficheros de datos de otra versión mayor: haría falta una migración con `pg_upgrade` o un volcado y restauración.

**`environment`.** La imagen oficial lee estas variables **solo la primera vez**, cuando el directorio de datos está vacío: crea la base de datos `it_service_manager` y el usuario `itmanager` con la contraseña indicada. La contraseña no está escrita en el fichero: `${DB_PASSWORD}` la toma Docker Compose del entorno o de un fichero `.env` situado junto a `compose.yaml`, que no se versiona.

**`ports: "5433:5432"`.** Dentro del contenedor PostgreSQL escucha en su puerto estándar, el 5432. Fuera, en Windows, se publica en el **5433**. Así no choca con una instalación local de PostgreSQL que ya estuviera usando el 5432.

**`volumes`.** Los datos se guardan en un **volumen con nombre**, `postgres_data`, que Docker gestiona fuera del contenedor. Se puede parar, borrar y recrear el contenedor sin perder los datos. En PostgreSQL 18 la imagen oficial cambió la ubicación de los datos a un subdirectorio por versión mayor, y recomienda montar el volumen en `/var/lib/postgresql`, que es exactamente lo que hace el proyecto.

**`healthcheck`.** Docker ejecuta `pg_isready` cada cinco segundos y marca el contenedor como *healthy* cuando PostgreSQL acepta conexiones. Un contenedor «arrancado» no significa una base de datos lista: PostgreSQL tarda unos segundos en inicializarse, sobre todo la primera vez. El doble `$$` es un escape de Compose: deja pasar `${POSTGRES_USER}` literalmente para que lo resuelva el *shell* del contenedor, y no Compose.

::: atencion Los datos viven en el volumen
`docker compose down` para y elimina el contenedor, pero conserva el volumen y por tanto los datos. **No añadas `-v`** a ese comando ni ejecutes `docker volume rm` sobre `postgres_data`: eso borra la base de datos de forma irreversible. Para los experimentos de esta guía usa siempre una base de datos aparte o las bases temporales de Testcontainers (capítulo 16).
:::

::: java
En WebSphere la base de datos era un recurso externo que administraba otro equipo, y la aplicación la conocía por un nombre JNDI. Aquí la base de datos de desarrollo forma parte del proyecto: cualquiera que clone el repositorio la levanta con `docker compose up -d`, con la misma versión y la misma configuración. Lo que se pierde es la separación de responsabilidades: en producción seguirá siendo un recurso gestionado aparte.
:::

::: nota Dónde vive hoy este fichero
Este `compose.yaml` fue la infraestructura del proyecto hasta la fase 7. Desde entonces, PostgreSQL y los servicios se levantan con el Compose del repositorio `it-service-platform`, que reutiliza este mismo volumen como volumen externo (capítulo 27), y este fichero se retiró del servicio de demandas.
:::

## La configuración de la conexión [paso 1.4]

Spring Boot crea el `DataSource` a partir de tres propiedades. El proyecto pasó por dos variantes de configuración, y las dos merecen verse.

La copia publicada en GitHub no contiene ningún dato de conexión: lo recibe todo del entorno.

```properties title="it-service-demand-manager/backend/src/main/resources/application.properties" estado="impl"
spring.application.name=it-service-manager

# Configure PostgreSQL through environment variables. No credentials in Git.
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}

spring.jpa.hibernate.ddl-auto=validate
spring.jpa.open-in-view=false
spring.jpa.show-sql=true
```

El proyecto local fija la URL y el usuario, y solo deja la contraseña fuera:

```properties title="it-service-manager/src/main/resources/application.properties (fase 1)" estado="reconstruido"
spring.application.name=it-service-manager

# PostgreSQL
spring.datasource.url=jdbc:postgresql://localhost:5432/it_service_manager
spring.datasource.username=itmanager
spring.datasource.password=${DB_PASSWORD}

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.open-in-view=false
spring.jpa.show-sql=true
```

::: reconstruido
El fichero actual del proyecto local tiene exactamente estas líneas y, además, la URL del catálogo de aplicaciones, que se añadió en la fase 5. Aquí se muestra sin esa línea para respetar la cronología.
:::

### Cómo se resuelve `${DB_PASSWORD}`

La sintaxis `${...}` es un **marcador de posición**. Al arrancar, Spring busca una propiedad llamada `DB_PASSWORD` en todas sus fuentes: argumentos de línea de comandos, propiedades del sistema de la JVM, variables de entorno del sistema operativo y ficheros de propiedades. Si no la encuentra, el arranque falla con `Could not resolve placeholder 'DB_PASSWORD'`, lo cual es preferible a arrancar con una contraseña vacía.

::: atencion Spring Boot no lee ficheros `.env`
El fichero `.env` lo lee **Docker Compose**, no Spring Boot. Para que la aplicación reciba la contraseña hay que definir la variable de entorno en la sesión de PowerShell, en la configuración de ejecución del IDE o en el sistema. La guía de instalación del repositorio publicado lo resuelve pidiéndola con `Get-Credential`, para que no quede escrita ni en el historial de comandos.
:::

### El perfil `docker`

El proyecto local tiene un segundo fichero de configuración:

```properties title="it-service-manager/src/main/resources/application-docker.properties" estado="impl"
spring.datasource.url=jdbc:postgresql://localhost:5433/it_service_manager
```

Un fichero `application-<perfil>.properties` solo se carga cuando ese perfil está activo, y sus propiedades **sobrescriben** las del fichero general. Arrancando con `spring.profiles.active=docker` (por ejemplo, con la variable de entorno `SPRING_PROFILES_ACTIVE=docker`), la aplicación se conecta al 5433, el puerto publicado por el contenedor. Sin el perfil, intenta el 5432.

::: leccion Dos puertos, un descuido fácil
La configuración por defecto apunta al 5432, pero el contenedor del proyecto se publica en el 5433. Quien arranca sin el perfil `docker` y no tiene otro PostgreSQL local obtiene un `Connection refused` que no parece tener relación con los perfiles. Conviene que la configuración por defecto coincida con la forma habitual de trabajar, o documentarlo junto al `compose.yaml`. Se recoge entre los pendientes del capítulo 24 y se resolvió en la fase 7: el valor por defecto pasó a ser el 5433 (capítulo 25).
:::

### El *pool* de conexiones

Spring Boot no abre una conexión por petición: crea un *pool* con **HikariCP** (por defecto, hasta diez conexiones) y las reutiliza. Cuando un método transaccional empieza, toma una conexión del *pool*; cuando termina, la devuelve. Este detalle tendrá importancia en la fase 5, cuando una transacción incluya una llamada HTTP a otro servicio y retenga su conexión mientras espera.

## `ddl-auto=validate`: Hibernate comprueba, Flyway decide

La propiedad `spring.jpa.hibernate.ddl-auto` indica a Hibernate qué hacer con el esquema al arrancar:

| Valor | Qué hace Hibernate | Uso razonable |
|---|---|---|
| `none` | Nada | Producción, si otra herramienta gestiona el esquema |
| `validate` | Compara las entidades con las tablas y **falla al arrancar** si no coinciden | Desarrollo y producción con Flyway |
| `update` | Intenta añadir tablas y columnas que falten; nunca borra | Prototipos rápidos |
| `create` | Borra y crea el esquema al arrancar | Pruebas desechables |
| `create-drop` | Como `create`, y además borra al parar | Pruebas en memoria |

El proyecto usa `validate` porque el esquema lo crea Flyway (capítulo 4) y Hibernate solo debe comprobarlo. Si alguien añade un atributo a una entidad y olvida la migración, la aplicación no arranca y el mensaje dice exactamente qué columna falta. Es un error temprano y barato.

::: decision `validate` en lugar de `update`
**Motivo:** el esquema tiene una única fuente de verdad, las migraciones versionadas, y cualquier desajuste se detecta al arrancar. **Alternativa descartada:** `update`, cómodo al principio pero peligroso: no elimina columnas ni cambia tipos, no deja rastro de qué cambió ni cuándo, y produce esquemas distintos en cada máquina.
:::

## `open-in-view=false`: la sesión no llega al controlador

Por defecto, Spring Boot activa un patrón llamado *Open Session in View* (OSIV): abre el contexto de persistencia de Hibernate al empezar cada petición HTTP y lo mantiene abierto hasta que la respuesta se ha escrito. Mientras está abierto, cualquier asociación perezosa se puede cargar en cualquier punto, incluso al serializar el JSON. Spring Boot muestra un aviso al arrancar cuando la propiedad no se configura explícitamente.

El proyecto lo desactiva. Con `open-in-view=false`, el contexto de persistencia vive **solo dentro de los métodos transaccionales** del servicio. Fuera de ellos, acceder a una asociación no cargada lanza `LazyInitializationException`.

Puede parecer una incomodidad, pero obliga a una disciplina sana: el servicio decide qué datos necesita la respuesta y los carga dentro de la transacción. Con OSIV activado, las consultas se disparan desde lugares inesperados (un *getter* llamado por Jackson), la conexión a la base de datos se retiene durante toda la petición y los problemas de rendimiento quedan ocultos. El capítulo 14 muestra cómo esta decisión hace visible el problema N+1 en el módulo de demandas.

::: java
En un EJB con transacciones gestionadas por el contenedor, el `EntityManager` transaccional se cerraba al terminar el método de negocio, y las entidades devueltas a la capa web quedaban *detached*. `open-in-view=false` reproduce ese comportamiento, que probablemente ya conoces. OSIV es lo excepcional.
:::

## `show-sql=true`: ver lo que hace Hibernate

`spring.jpa.show-sql=true` imprime por la salida estándar cada sentencia SQL que Hibernate envía. Durante el aprendizaje es imprescindible: permite ver cuándo se ejecuta un `UPDATE`, cuántas consultas genera un listado o si aparece una consulta inesperada.

Tiene dos limitaciones: escribe en la consola sin pasar por el sistema de *logs* y no muestra los valores de los parámetros. Una alternativa más completa es activar los *loggers* de Hibernate:

```properties title="Alternativa (no está en el proyecto)" estado="pendiente"
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.orm.jdbc.bind=TRACE
```

En producción no debe usarse ninguna de las dos: genera muchísimo volumen y puede escribir datos personales en los *logs*.

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| `Connection to localhost:5432 refused` | El contenedor se publica en el 5433 y no está activo el perfil `docker` | Activar el perfil o corregir la URL |
| `password authentication failed for user "itmanager"` | La variable `DB_PASSWORD` no coincide con la que se usó al crear el volumen | Recuerda que la imagen solo lee la contraseña la primera vez; usa la original |
| `Could not resolve placeholder 'DB_PASSWORD'` | La variable no está definida en el entorno de la JVM | Definirla en la configuración de ejecución del IDE o en la sesión |
| La aplicación arranca antes de que PostgreSQL esté listo y falla | Se lanzó justo después de `docker compose up` | Esperar al estado *healthy* (`docker compose ps`) |
| `Schema-validation: missing column [...]` | Una entidad tiene un atributo sin columna | Crear la migración correspondiente (capítulo 4) |
| Aviso `spring.jpa.open-in-view is enabled by default` | Falta la propiedad | Declararla explícitamente a `false` |

## Ejercicios

::: ejercicio Inspeccionar el contenedor
Con el contenedor arrancado, ejecuta `docker compose ps` y localiza la columna de estado de salud. Después conéctate con `docker compose exec postgres psql -U itmanager -d it_service_manager` y lista las tablas con `\dt`. Sal con `\q`.
:::

::: ejercicio Provocar un fallo de validación del esquema
En una rama de trabajo, añade a `Application` un atributo `private String owner;` sin crear ninguna migración. Arranca la aplicación, lee el mensaje de error completo y explica qué componente lo produce. Deshaz el cambio.
:::

::: preguntas
1. ¿Por qué el puerto publicado del contenedor es el 5433 y no el 5432?
2. ¿Qué ocurre con los datos al ejecutar `docker compose down`? ¿Y qué opción no debes añadir nunca a ese comando?
3. ¿Quién lee el fichero `.env`: Docker Compose o Spring Boot?
4. ¿Qué diferencia hay entre `ddl-auto=validate` y `ddl-auto=update`, y por qué el proyecto elige la primera?
5. ¿Qué excepción aparece al acceder a una asociación perezosa fuera de la transacción con `open-in-view=false`, y por qué es una ventaja?
:::
