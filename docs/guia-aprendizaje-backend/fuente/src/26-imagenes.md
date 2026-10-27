# Imágenes de contenedor

<p class="lead">Con el código preparado, cada servicio necesitaba dos cosas para vivir dentro de Docker: una forma de decir si está sano y una imagen que lo empaquete. Este capítulo explica Spring Boot Actuator, qué son una imagen y un contenedor, el Dockerfile de dos etapas con el JAR por capas y las medidas básicas de seguridad de la imagen.</p>

## Comprobaciones de salud con Actuator [paso 7.6]

Un orquestador como Docker Compose necesita saber si un servicio funciona. Que el proceso esté arrancado no basta: puede estar vivo pero sin conexión a su base de datos. Spring Boot Actuator resuelve esto con **dos cambios de configuración y ninguna línea de Java**:

```xml title="pom.xml (añadido en los dos servicios)" estado="final"
<!-- Comprobaciones de salud (/actuator/health) para Docker -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```properties title="application.properties (añadido en los dos servicios)" estado="final"
# Actuator: solo se expone el estado de salud (usado por Docker Compose).
management.endpoints.web.exposure.include=health
management.endpoint.health.probes.enabled=true
management.endpoint.health.show-details=never
```

### Qué hace la autoconfiguración

Al arrancar, Spring Boot detecta Actuator en el *classpath* y crea por sí mismo todo lo necesario (capítulo 2):

1. **Los *endpoints***, registrados en Spring MVC bajo `/actuator`, como si fueran un controlador más.
2. **Los indicadores de salud.** Como existe un `DataSource`, añade uno que valida una conexión con PostgreSQL; añade otros para el espacio en disco y el estado del proceso. `/actuator/health` combina todos: si alguno está `DOWN`, el conjunto está `DOWN` y la respuesta es un **503**.
3. **Los grupos `liveness` y `readiness`**, activados por `probes.enabled`. *Liveness* indica si el proceso debe reiniciarse; *readiness*, si puede recibir tráfico. Son los conceptos que usa Kubernetes, y Spring Boot solo los activa automáticamente cuando detecta que corre dentro de él.

```json title="GET /actuator/health"
{"groups":["liveness","readiness"],"status":"UP"}
```

### Por qué solo `health` y sin detalles

Actuator trae muchos más *endpoints*: variables de entorno, configuración completa, volcado de hilos, métricas, información de la aplicación… Varios revelan información sensible: rutas, versiones o propiedades de configuración. La regla es **exponer solo lo que se usa**, y aquí solo se usa la salud.

`show-details=never` hace que la respuesta diga solo `UP` o `DOWN`. Con `always`, cualquiera vería qué componente falla, la versión de PostgreSQL o el espacio libre en disco.

::: decision Sin indicador propio para el catálogo
Habría sido fácil añadir un `HealthIndicator` que marcara el servicio de demandas como `DOWN` cuando el catálogo no responde. Se descartó a propósito: el servicio de demandas **sigue siendo útil** con el catálogo caído (responde 503 solo en lo que lo necesita, capítulo 20). Si su salud dependiera del catálogo, un orquestador podría reiniciarlo o retirarlo del tráfico por un fallo ajeno, y el problema de un servicio se convertiría en el de dos: el fallo en cascada del capítulo 20, provocado esta vez por la propia monitorización.
:::

::: atencion El IDE no ve la dependencia nueva
Las pruebas con `mvnw` incluyeron Actuator a la primera, porque Maven lee el `pom.xml` cada vez. Spring Tools, en cambio, mantiene su propia copia de las dependencias del proyecto: hasta ejecutar *Maven → Update Project* (Alt+F5) y reiniciar el servicio, `/actuator/health` devolvía un 404. Es un síntoma clásico: el código está bien y el IDE va por detrás.
:::

## Qué son una imagen y un contenedor

Antes del Dockerfile conviene fijar tres conceptos:

| Concepto | Qué es | Analogía Java |
|---|---|---|
| **Imagen** | Un sistema de ficheros de solo lectura con todo lo necesario para ejecutar algo: sistema base, JRE, aplicación y comando de arranque | La clase |
| **Contenedor** | Un proceso aislado que se ejecuta a partir de una imagen, con su propia capa escribible, red y variables de entorno | La instancia |
| **Capa** | Cada instrucción del Dockerfile que modifica ficheros produce una capa; las imágenes se componen apilando capas, y las capas se reutilizan entre imágenes y entre construcciones | — |

Las capas son la clave del rendimiento. Docker guarda en caché cada capa y, al reconstruir, reutiliza todas hasta la primera instrucción cuyo resultado cambie. **El orden de las instrucciones determina cuánto se reconstruye.**

::: java
En WebSphere desplegabas un EAR sobre un servidor que alguien había instalado y configurado. Una imagen lleva **todo** dentro: el sistema operativo base, la JVM exacta y la aplicación. Por eso se comporta igual en tu equipo, en otro y en un servidor. La analogía falla en un punto: un contenedor es un proceso más del sistema anfitrión, no una máquina virtual; arranca en segundos y no tiene su propio núcleo.
:::

## El Dockerfile en dos etapas [paso 7.7]

```dockerfile title="it-service-manager/Dockerfile" estado="final"
# syntax=docker/dockerfile:1

# ---------- Etapa 1: compilación ----------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Primero solo el pom: las dependencias quedan en una capa en caché
# y no se vuelven a descargar mientras el pom no cambie.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q -DskipTests package \
 && cp target/*.jar app.jar \
 && java -Djarmode=tools -jar app.jar extract --layers --launcher --destination extracted

# ---------- Etapa 2: ejecución ----------
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN groupadd --system spring && useradd --system --gid spring --no-create-home spring

# Capas de la menos a la más cambiante: al modificar el código
# solo se reconstruye la última.
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./

USER spring

# La JVM respeta el límite de memoria del contenedor.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"

EXPOSE 8080

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

El del catálogo es idéntico salvo el puerto (`EXPOSE 8081`).

### Dos etapas: compilar no es ejecutar

La primera etapa (`AS build`) parte de una imagen con Maven y el JDK completo, compila y prepara el resultado. La segunda parte de una imagen **solo con el JRE** y copia únicamente lo necesario con `COPY --from=build`. Todo lo de la primera etapa (Maven, el JDK, el código fuente, la caché de dependencias) se descarta: la imagen final no lo contiene.

Así la imagen es más pequeña y, sobre todo, tiene **menos superficie de ataque**: no lleva un compilador ni herramientas de construcción que alguien pudiera aprovechar.

### El `pom.xml` antes que el código

```dockerfile
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
```

El orden no es casual. Las dependencias cambian poco y tardan en descargarse (unos 35 segundos la primera vez); el código cambia constantemente. Copiando primero solo el `pom.xml` y descargando las dependencias en su propia capa, Docker reutiliza esa capa mientras el `pom.xml` no cambie. Al tocar una clase, la reconstrucción empieza en `COPY src` y tarda unos segundos.

### El JAR por capas

Un JAR de Spring Boot contiene dependencias que casi nunca cambian (decenas de megas) y el código propio, que cambia en cada versión (unos kilobytes). Si se copiara el JAR entero, cualquier cambio de una línea generaría una capa nueva con todo.

`java -Djarmode=tools -jar app.jar extract --layers --launcher` es una herramienta incluida en el propio JAR que lo descompone en cuatro carpetas, de la más estable a la más cambiante:

| Carpeta | Contenido | Cambia… |
|---|---|---|
| `dependencies/` | Librerías publicadas (Spring, Hibernate, el driver…) | Al actualizar versiones |
| `spring-boot-loader/` | El lanzador de Spring Boot | Casi nunca |
| `snapshot-dependencies/` | Dependencias `-SNAPSHOT` | Rara vez (aquí, ninguna) |
| `application/` | Las clases y recursos propios | En cada cambio de código |

Cada `COPY` crea una capa. Al cambiar el código solo cambia la última, de pocos kilobytes, y al publicar o desplegar la imagen solo viaja esa capa. El arranque se hace con `JarLauncher` sobre las clases ya extraídas, que además arranca algo más rápido que un JAR anidado.

::: decision La imagen oficial de Maven en lugar de `mvnw`
El proyecto tiene Maven Wrapper (`mvnw`), y usarlo en el Dockerfile parecería lo natural. Pero el *wrapper* de estos proyectos es del tipo *only-script*: para descargar Maven necesita `curl` o `wget` en la imagen, y la imagen base no garantiza tenerlos. Partir de `maven:3.9-eclipse-temurin-21`, que ya trae Maven y Java 21, elimina esa dependencia. **Coste:** la versión de Maven de la imagen puede no coincidir exactamente con la del *wrapper*. No importa mientras sea Maven 3.9 o superior.
:::

### Las pruebas no se ejecutan dentro

`-DskipTests` omite las pruebas en el *build* de la imagen. No es pereza: las pruebas de integración usan Testcontainers, que necesita acceso a Docker, y Docker no está disponible dentro de un *build* de Docker sin configuraciones especiales. Las pruebas se ejecutan **antes**, con `mvnw test`, y la imagen se construye solo a partir de código ya verificado. En una integración continua (capítulo 24), ese orden lo garantiza el propio flujo.

## Seguridad básica de la imagen [paso 7.8]

### Un usuario sin privilegios

```dockerfile
RUN groupadd --system spring && useradd --system --gid spring --no-create-home spring
USER spring
```

Por defecto, el proceso de un contenedor se ejecuta como `root`. Si alguien aprovechara una vulnerabilidad de la aplicación, tendría privilegios de administrador dentro del contenedor, y eso facilita escapar de él. Con `USER spring`, el proceso se ejecuta con un usuario sin privilegios. La primera línea del *log* del contenedor lo confirma: `started by spring in /app`.

### Lo que no debe entrar en la imagen

```text title="it-service-manager/.dockerignore" estado="final"
# Solo pom.xml y src/ son necesarios para construir la imagen.
target/
.git/
.metadata/
.settings/
.mvn/
.classpath
.project
.factorypath
.vscode/
.idea/
*.iml
.env
*.dump
*backup*.sql
docs/
HELP.md
```

Al construir, Docker envía la carpeta del proyecto (el **contexto**) al motor de construcción. El `.dockerignore` excluye lo que no hace falta, y eso tiene dos efectos: el *build* es más rápido, y **ningún secreto ni volcado de datos puede acabar dentro de una imagen**, aunque alguien escribiera por error `COPY . .`. Una imagen publicada con un `.env` dentro expondría las contraseñas a cualquiera que la descargara.

### La memoria del contenedor

```dockerfile
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
```

Java 21 detecta el límite de memoria del contenedor, pero por defecto solo usa una cuarta parte para el *heap*. Con `MaxRAMPercentage=75`, la JVM usa hasta el 75 % y deja el resto para la memoria fuera del *heap* (*metaspace*, hilos, *buffers*). La primera línea del *log* (`Picked up JAVA_TOOL_OPTIONS`) confirma que se aplica.

## Probar una imagen sola

Antes de montar el sistema completo, conviene comprobar que cada imagen funciona por sí misma:

```powershell
docker build -t application-catalog-service:dev .

docker run --rm -p 8081:8081 `
  -e DB_URL=jdbc:postgresql://host.docker.internal:5433/application_db `
  -e DB_PASSWORD=<contraseña> `
  application-catalog-service:dev
```

Hay un detalle que confunde siempre la primera vez: **dentro de un contenedor, `localhost` es el propio contenedor**, no tu Windows. Para llegar al PostgreSQL publicado en el puerto 5433 de tu equipo, Docker Desktop ofrece el nombre especial `host.docker.internal`.

El *log* de esa prueba confirma, línea a línea, varias decisiones de la guía: la conexión llega por la variable de entorno (`jdbc:postgresql://host.docker.internal:5433/application_db`), Flyway valida la migración sin cambiar nada (`Schema "public" is up to date`) y Actuator expone un único *endpoint* (`Exposing 1 endpoint beneath base path '/actuator'`).

::: atencion Contraseñas en la línea de comandos
Lo que se escribe en PowerShell queda en su historial. Para una prueba local puntual es aceptable; para el uso diario, la contraseña debe ir en un fichero `.env` que no se versiona, que es lo que hace el capítulo 27.
:::

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| `/actuator/health` devuelve 404 en el IDE | Spring Tools no ha actualizado las dependencias | *Maven → Update Project* y reiniciar |
| `/actuator/health` devuelve `DOWN` y 503 | El servicio no llega a su base de datos | Revisar `DB_URL` y que PostgreSQL esté arrancado |
| `Connection refused` a `localhost:5433` desde el contenedor | `localhost` es el propio contenedor | Usar `host.docker.internal` (o el nombre del servicio en Compose) |
| Cada *build* tarda lo mismo aunque solo cambie una clase | Se copia el código antes de descargar las dependencias | `COPY pom.xml` y `dependency:go-offline` antes de `COPY src` |
| `no main manifest attribute` o clase no encontrada al arrancar | El `ENTRYPOINT` no corresponde a la extracción por capas | Usar `org.springframework.boot.loader.launch.JarLauncher` |
| La imagen contiene el `.env` | Falta `.dockerignore` y se copió el contexto entero | Añadirlo y reconstruir; cambiar las contraseñas expuestas |

## Ejercicios

::: ejercicio Medir el efecto de las capas
Construye la imagen del catálogo, cambia un texto cualquiera en una clase y vuelve a construirla. Compara los tiempos y observa en la salida qué pasos aparecen como `CACHED`. Después cambia el `pom.xml` (por ejemplo, añade un comentario) y repite. Explica las diferencias.
:::

::: ejercicio Ver las capas de una imagen
Ejecuta `docker history it-service-manager:local` e identifica las capas que corresponden a las cuatro carpetas del JAR extraído. ¿Cuál ocupa más? ¿Cuál cambiaría al modificar una clase?
:::

::: preguntas
1. ¿Qué tres cosas crea la autoconfiguración de Actuator sin escribir Java?
2. ¿Por qué no se añadió un indicador de salud que dependa del catálogo?
3. ¿Qué gana la imagen final al separar la compilación y la ejecución en dos etapas?
4. ¿Por qué se copia el `pom.xml` y se descargan las dependencias antes de copiar `src/`?
5. ¿Qué significa `localhost` dentro de un contenedor y cómo se llega desde él al PostgreSQL de tu equipo?
:::
