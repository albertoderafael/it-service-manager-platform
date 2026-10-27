# La plataforma con Docker Compose

<p class="lead">El último tramo reunió todas las piezas: PostgreSQL, los dos servicios y el frontend, levantados con un solo comando. Este capítulo explica el repositorio de la plataforma, el <code>compose.yaml</code> servicio a servicio, cómo se reutilizaron los datos sin arriesgarlos, la inicialización de las bases de datos, las comprobaciones de salud sin <code>curl</code>, nginx delante del frontend y la validación final.</p>

## Un repositorio para la infraestructura [paso 7.9]

Hasta aquí, el único `compose.yaml` vivía dentro del servicio de demandas y solo levantaba PostgreSQL. Ampliarlo habría sido lo más rápido, pero habría convertido a un microservicio en **dueño de la infraestructura de todos**: para arrancar el catálogo habría que entrar en el proyecto de demandas.

La plataforma pasó a tener su propio repositorio, junto a los demás:

```text title="C:\Workspace" estado="final"
├── it-service-platform\          ← compose.yaml, postgres/init, .env.example, README
├── it-service-manager\           ← servicio de demandas (Dockerfile)
├── application-catalog-service\  ← catálogo de aplicaciones (Dockerfile)
└── it-service-manager-web\       ← frontend (Dockerfile + nginx)
```

Cada servicio sabe construirse a sí mismo (su `Dockerfile`), pero no sabe nada de los demás. La plataforma es la que conoce el sistema completo: qué servicios hay, cómo se conectan y con qué configuración. Es la separación de responsabilidades de los capítulos 17 y 18, aplicada ahora al despliegue.

::: decision Un repositorio de plataforma
**Motivo:** ningún servicio es dueño de la infraestructura común; la plataforma documenta el sistema completo y es el sitio natural para su README. **Alternativas:** el Compose dentro de uno de los servicios (más rápido, pero acopla) o un único repositorio con todo (*monorepo*), válido pero distinto de la estructura que ya existía. **Coste:** los repositorios deben estar uno junto a otro, porque el Compose los referencia con rutas relativas (`../it-service-manager`).
:::

## El `compose.yaml`, servicio a servicio

### PostgreSQL

```yaml title="it-service-platform/compose.yaml (extracto)" estado="final"
name: it-service-platform

services:

  postgres:
    image: postgres:18.6
    environment:
      POSTGRES_DB: it_service_manager
      POSTGRES_USER: itmanager
      POSTGRES_PASSWORD: ${DB_PASSWORD:?Define DB_PASSWORD en .env}
      # Lo usa el script de inicialización para crear el usuario del catálogo.
      APPLICATION_DB_PASSWORD: ${APPLICATION_DB_PASSWORD:?Define APPLICATION_DB_PASSWORD en .env}
    ports:
      # Publicado solo para herramientas de desarrollo (pgAdmin, Spring Tools).
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql
      # Solo se ejecuta si el volumen está vacío (instalación nueva).
      - ./postgres/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
    restart: unless-stopped
```

**`name: it-service-platform`** fija el nombre del proyecto. Compose lo usa como prefijo de contenedores y redes (`it-service-platform-postgres-1`); sin él, se tomaría el nombre de la carpeta.

**`${DB_PASSWORD:?mensaje}`.** La sintaxis con `?` hace que Compose **se niegue a arrancar** si la variable no está definida, mostrando el mensaje. Las variables se leen del fichero `.env` de la carpeta, que no se versiona; el repositorio solo contiene `.env.example` con valores ficticios.

**`restart: unless-stopped`** reinicia el contenedor si se cae o si se reinicia Docker, salvo que se haya parado a mano.

### Los dos servicios

```yaml title="it-service-platform/compose.yaml (extracto)" estado="final"
  application-catalog-service:
    build: ../application-catalog-service
    image: application-catalog-service:local
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/application_db
      DB_USERNAME: application_user
      DB_PASSWORD: ${APPLICATION_DB_PASSWORD:?Define APPLICATION_DB_PASSWORD en .env}
    ports:
      - "8081:8081"
    depends_on:
      postgres:
        condition: service_healthy

  demand-service:
    build: ../it-service-manager
    image: it-service-manager:local
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/it_service_manager
      DB_USERNAME: itmanager
      DB_PASSWORD: ${DB_PASSWORD:?Define DB_PASSWORD en .env}
      # Dentro de la red de Compose el catálogo se localiza por su nombre de servicio.
      APPLICATION_CATALOG_BASE_URL: http://application-catalog-service:8081
    ports:
      - "8080:8080"
    depends_on:
      # Solo necesita su base de datos para arrancar. Si el catálogo no está,
      # arranca igual y responde 503 en lo que dependa de él.
      postgres:
        condition: service_healthy
```

(Las comprobaciones de salud y `restart` de estos servicios se explican más abajo.)

**`build` e `image`.** `build` indica dónde está el `Dockerfile`; `image`, cómo se llamará la imagen construida. Con `docker compose up --build` se reconstruyen si el código ha cambiado.

**La red de Compose y sus nombres.** Compose crea una red privada para el proyecto y registra cada servicio con su nombre en un DNS interno. Por eso la URL de la base de datos es `postgres:5432` y la del catálogo `http://application-catalog-service:8081`. Fíjate en el puerto: dentro de la red se usa el **puerto interno** del contenedor (5432), no el publicado en tu equipo (5433). Es justo el cambio de configuración que el paso 7.5 hizo posible sin tocar el código.

**`depends_on` con condición.** `condition: service_healthy` hace que Compose no arranque el servicio hasta que la comprobación de salud de PostgreSQL esté en verde. Sin la condición, `depends_on` solo garantiza el orden de arranque, no que la base de datos esté lista, y el servicio podría fallar al conectar.

::: decision El servicio de demandas no espera al catálogo
Habría sido natural añadir `application-catalog-service: condition: service_healthy` a las dependencias del servicio de demandas. Se descartó por la misma razón que en el capítulo 26: el servicio de demandas debe poder arrancar y trabajar con el catálogo caído. Si dependiera de él para arrancar, un catálogo roto dejaría sin servicio también a las demandas.
:::

**`ports`.** Publicar un puerto lo hace accesible desde tu equipo. Los servicios se comunican entre sí por la red interna y no lo necesitan; los puertos 8080, 8081 y 5433 se publican para el frontend en desarrollo, para el IDE y para pgAdmin. En un despliegue real solo se publicaría el puerto de entrada (el de `web`).

## Reutilizar los datos: el volumen externo

La base de datos de desarrollo tenía datos reales del proyecto, guardados en el volumen `it-service-manager_postgres_data` que había creado el Compose antiguo (Compose nombra los volúmenes con el prefijo del proyecto). El Compose nuevo lo reutiliza:

```yaml title="it-service-platform/compose.yaml (extracto)" estado="final"
volumes:
  postgres_data:
    # Volumen ya existente, creado por el compose.yaml de it-service-manager.
    # "external" significa que Compose lo usa pero nunca lo crea ni lo borra.
    external: true
    name: ${POSTGRES_VOLUME:-it-service-manager_postgres_data}
```

`external: true` es la decisión de seguridad más importante del fichero. Un volumen normal es **propiedad** del proyecto de Compose: `docker compose down -v` lo eliminaría. Un volumen externo no: Compose lo usa, pero no lo crea ni lo borra **nunca**, ni siquiera con `-v`. Si no existe, Compose se niega a arrancar en lugar de crear uno vacío.

::: atencion Dos PostgreSQL sobre un mismo volumen
Antes del primer `up` hubo que parar el contenedor del Compose antiguo con `docker compose stop` (nunca con `down -v`). Dos instancias de PostgreSQL escribiendo sobre los mismos ficheros de datos **corrompen la base de datos**. En este caso, el conflicto del puerto 5433 habría impedido que el segundo arrancara, pero no conviene confiar en esa casualidad.
:::

## La inicialización de las bases de datos [paso 7.10]

El capítulo 19 dejó un pendiente: la base de datos `application_db` y su usuario se habían creado a mano, y nada lo reflejaba en el repositorio. La plataforma lo resuelve con un *script* de inicialización:

```bash title="it-service-platform/postgres/init/10-application-db.sh" estado="final"
#!/bin/bash
set -euo pipefail

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     --set app_password="$APPLICATION_DB_PASSWORD" <<-'EOSQL'
	CREATE USER application_user WITH PASSWORD :'app_password';
	CREATE DATABASE application_db OWNER application_user;
	REVOKE CONNECT ON DATABASE application_db FROM PUBLIC;
	GRANT CONNECT ON DATABASE application_db TO application_user;
	REVOKE CONNECT ON DATABASE it_service_manager FROM PUBLIC;
EOSQL
```

**Cuándo se ejecuta.** La imagen oficial de PostgreSQL ejecuta los ficheros de `/docker-entrypoint-initdb.d` **solo cuando el directorio de datos está vacío**, es decir, la primera vez. Con el volumen actual, que ya tiene datos, no se ejecuta. Su propósito es que una instalación nueva (otra máquina, alguien que clone los repositorios) obtenga exactamente la misma estructura sin pasos manuales. La base de datos `it_service_manager` y su usuario los crea la propia imagen a partir de `POSTGRES_DB`, `POSTGRES_USER` y `POSTGRES_PASSWORD`.

**La contraseña no está escrita.** Llega como variable de entorno del contenedor y se pasa a `psql` como variable (`--set app_password=…`). `:'app_password'` la inserta en el SQL **correctamente entrecomillada**, sin riesgo de que un carácter especial rompa la sentencia. El *heredoc* `<<-'EOSQL'` va entre comillas para que el *shell* no interprete nada dentro del SQL.

**Cada usuario, en su base de datos.** Por defecto, en PostgreSQL cualquier usuario puede conectarse a cualquier base de datos (el permiso `CONNECT` lo tiene el rol especial `PUBLIC`). Los `REVOKE` lo retiran, y `application_user` solo puede conectarse a `application_db`. Es el patrón de base de datos por servicio del capítulo 19 garantizado por la propia base de datos.

::: atencion `POSTGRES_USER` es superusuario
La imagen oficial crea el usuario de `POSTGRES_USER` (aquí, `itmanager`) como **superusuario**, y un superusuario se salta todos los permisos. Para desarrollo es aceptable; en un entorno real, el servicio de demandas debería usar un usuario sin privilegios especiales, igual que el catálogo, y el superusuario reservarse para administración.
:::

Un último detalle del repositorio: un fichero `.gitattributes` con `*.sh text eol=lf`. El *script* se ejecuta dentro de un contenedor Linux, y si Git en Windows lo convirtiera a finales de línea CRLF, `bash` fallaría con un error confuso (`$'\r': command not found`).

## Comprobaciones de salud sin `curl` [paso 7.11]

Actuator ofrece `/actuator/health`, pero alguien tiene que preguntar. Docker ejecuta periódicamente el comando de `healthcheck` **dentro del contenedor** y, según su resultado, lo marca como `starting`, `healthy` o `unhealthy`. Lo habitual es usar `curl`, pero la imagen `eclipse-temurin:21-jre` no lo incluye, y añadirlo solo para esto engordaría la imagen y le sumaría superficie de ataque.

La solución usa solo `bash`:

```yaml title="it-service-platform/compose.yaml (extracto)" estado="final"
    healthcheck:
      # La imagen no incluye curl: petición HTTP mínima con bash.
      test: ["CMD-SHELL", "bash -c 'exec 3<>/dev/tcp/127.0.0.1/8081; printf \"GET /actuator/health HTTP/1.0\\r\\nHost: localhost\\r\\n\\r\\n\" >&3; grep -q UP <&3'"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 40s
```

Desmontado, el comando hace tres cosas:

1. `exec 3<>/dev/tcp/127.0.0.1/8081` abre una conexión TCP con el propio servicio y la asigna al descriptor de fichero 3. `/dev/tcp` es una característica de `bash`, no un fichero real.
2. `printf "GET /actuator/health HTTP/1.0 …" >&3` escribe a mano una petición HTTP en esa conexión.
3. `grep -q UP <&3` lee la respuesta y termina con éxito solo si contiene `UP`.

Si Actuator responde `DOWN`, o el servicio no acepta conexiones, `grep` falla y Docker cuenta un intento fallido.

| Parámetro | Valor | Significado |
|---|---|---|
| `interval` | 10 s | Cada cuánto se comprueba |
| `timeout` | 5 s | Cuánto se espera cada comprobación |
| `retries` | 10 | Fallos seguidos antes de marcar `unhealthy` |
| `start_period` | 40 s | Margen inicial para que Spring Boot arranque, sin contar fallos |

En la validación se vio la transición: el servicio de demandas en `health: starting` a los 10 segundos y `healthy` a los 30.

## El frontend detrás de nginx [paso 7.12]

En desarrollo, el frontend lo sirve Vite, que además hace de proxy hacia los servicios. Para levantar el sistema completo sin `npm run dev`, el frontend tiene su propia imagen:

```dockerfile title="it-service-manager-web/Dockerfile" estado="final"
# ---------- Etapa 1: compilación ----------
FROM node:22-alpine AS build
WORKDIR /app

# Dependencias primero: capa en caché mientras no cambie el lockfile.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Etapa 2: servidor ----------
FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
```

Es el mismo patrón que los servicios: una etapa compila (con Node) y otra sirve el resultado. La imagen final no contiene Node ni el código fuente, solo `dist/` y nginx. `npm ci` instala exactamente las versiones del *lockfile*, como `mvn dependency:go-offline` en el backend.

nginx cumple dos funciones a la vez:

```nginx title="it-service-manager-web/docker/nginx.conf (extracto)" estado="final"
server {
    listen 80;
    root  /usr/share/nginx/html;

    resolver 127.0.0.11 valid=10s ipv6=off;
    set $demand_service  http://demand-service:8080;
    set $catalog_service http://application-catalog-service:8081;

    location /api/demands {
        proxy_pass $demand_service;
    }

    location /api/applications {
        proxy_pass $catalog_service;
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
```

**Proxy inverso.** Las peticiones a `/api/demands` y `/api/applications` se reenvían a cada servicio por la red interna. El navegador habla con un único origen (`localhost:8088`), así que, igual que con Vite, no hace falta CORS.

**Resolución en cada petición.** Con un nombre escrito directamente en `proxy_pass`, nginx lo resuelve **al arrancar**, y si el servicio no existiera en ese momento, nginx no arrancaría. Con el nombre en una variable y `resolver 127.0.0.11` (el DNS interno de Docker), lo resuelve en cada petición. nginx arranca aunque un servicio esté parado, y en ese caso solo esa ruta responde 502.

**Fallback de la SPA.** Las rutas de React Router (`/demandas/3/editar`) no existen como ficheros. `try_files $uri $uri/ /index.html` sirve el fichero si existe y, si no, `index.html`, para que React Router resuelva la ruta. Sin esto, recargar la página en una ruta interna daría un 404 de nginx.

**Caché.** Los ficheros de `/assets/` llevan un *hash* en el nombre y se marcan como cacheables durante un año (esa regla está en el fichero completo); `index.html` se marca como `no-cache`, para que una versión nueva se vea en cuanto se despliega.

::: java
nginx hace aquí el papel que en tu entorno de WebSphere hacía el IBM HTTP Server con el *plugin* de WebSphere: un servidor web delante que sirve el contenido estático y reenvía las peticiones dinámicas al servidor de aplicaciones adecuado.
:::

## Validar y retirar lo antiguo [paso 7.13]

La validación siguió el mismo guion que el capítulo 22, ahora con todo en contenedores:

| Comprobación | Resultado |
|---|---|
| `docker compose up -d --build` | Cuatro contenedores; `docker compose ps` los muestra `healthy` |
| Aplicaciones y demandas en la web | Datos de siempre, con los nombres resueltos por la red interna |
| `docker compose stop application-catalog-service` | Demandas muestra «El catálogo de aplicaciones no está disponible…» |
| `docker compose start application-catalog-service` | Recuperación automática, sin reiniciar nada más |
| `docker compose down` y `up -d` (sin `-v`) | Los datos siguen ahí, incluidas las demandas creadas ese día |
| Recargar `localhost:8088/demandas` | nginx devuelve la SPA, no un 404 |

::: leccion El puerto ocupado
El primer `up` falló con `ports are not available: … 0.0.0.0:8080 … bind`: el servicio de demandas seguía arrancado en Spring Tools. PostgreSQL y el catálogo arrancaron bien y el servicio de demandas se quedó esperando el puerto, sin ningún riesgo para los datos. La regla que quedó: **un servicio se ejecuta en Docker o en el IDE, nunca en los dos**. Para depurar uno en el IDE se para solo su contenedor (`docker compose stop demand-service`) y se arranca en Spring Tools, que seguirá usando PostgreSQL y el otro servicio de Compose por los puertos publicados.
:::

Con todo validado, se retiró el `compose.yaml` antiguo del servicio de demandas (`git rm compose.yaml`). Dejarlo habría mantenido **dos formas de levantar un PostgreSQL sobre el mismo volumen**, exactamente lo que no debe ocurrir. Cada repositorio recibió además su README: qué hace, su API, sus variables de entorno, cómo ejecutarlo solo y cómo levantarlo con la plataforma.

### El estado final

| Repositorio | Contenido |
|---|---|
| `it-service-manager` | Servicio de demandas: código, 40 pruebas, Dockerfile y README |
| `application-catalog-service` | Catálogo de aplicaciones: código, 18 pruebas, Dockerfile y README |
| `it-service-platform` | Compose del sistema completo, inicialización de PostgreSQL, `.env.example` y README |
| `it-service-manager-web` | Frontend: código, 39 pruebas, Dockerfile, nginx y las dos guías |

Todo el sistema se levanta con un comando y queda en **http://localhost:8088**:

```powershell
cd C:\Workspace\it-service-platform
docker compose up -d --build
```

Lo que queda (seguridad, integración continua, métricas y trazas, OpenAPI, pruebas de contrato y los demás puntos del capítulo 24) ya no es deuda de esta etapa, sino la siguiente.

## Para terminar

El recorrido de esta guía va de un proyecto generado con Spring Initializr a dos servicios con bases de datos propias que se comunican por HTTP, empaquetados en imágenes y levantados con Docker Compose. Por el camino han aparecido casi todas las piezas de un backend Spring moderno: autoconfiguración, JPA e Hibernate, transacciones declarativas y programáticas, validación, manejo de errores, consultas dinámicas, el problema N+1, migraciones, pruebas con Mockito, MockMvc y Testcontainers, puertos y adaptadores, un cliente HTTP robusto, comprobaciones de salud y contenedores.

Pero la idea que más vale la pena llevarse no es ninguna tecnología concreta. Es el orden en que se hicieron las cosas: construir un monolito bien organizado, identificar con el código delante dónde se tocan los módulos, diseñar la frontera dentro del monolito, moverla a la red en pasos pequeños y reversibles, corregir lo que la red hizo visible **antes** de contenerizar, y decir con honestidad qué se ha verificado y qué no.

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| `ports are not available … bind` | El puerto lo usa otro proceso (a menudo, el IDE) | Parar ese proceso; `Get-NetTCPConnection -LocalPort 8080` lo identifica |
| `external volume … not found` | El volumen no existe o tiene otro nombre | Comprobar con `docker volume ls` y ajustar `POSTGRES_VOLUME` |
| `required variable DB_PASSWORD is missing` | Falta el `.env` o la variable | Copiar `.env.example` como `.env` y rellenarlo |
| Un servicio se queda en `health: starting` y pasa a `unhealthy` | No llega a su base de datos, o la contraseña no es correcta | `docker compose logs <servicio>` |
| El *script* de `postgres/init` no se ejecuta | El volumen ya tenía datos | Es lo esperado; solo actúa en instalaciones nuevas |
| `$'\r': command not found` en la inicialización | El `.sh` tiene finales de línea CRLF | `.gitattributes` con `*.sh text eol=lf` |
| 404 de nginx al recargar una ruta interna | Falta el *fallback* a `index.html` | `try_files $uri $uri/ /index.html` |
| 502 en `/api/demands` desde la web | El servicio de demandas está parado o arrancando | `docker compose ps` y esperar a `healthy` |

## Ejercicios

::: ejercicio Una instalación desde cero
Sin tocar tu volumen actual, simula una instalación nueva: en `.env` pon `POSTGRES_VOLUME=itsp_prueba`, crea ese volumen vacío con `docker volume create itsp_prueba`, para la plataforma y arráncala de nuevo. Comprueba con pgAdmin que existen las dos bases de datos y que `application_user` no puede conectarse a `it_service_manager`. Al terminar, vuelve a dejar `POSTGRES_VOLUME` como estaba.
:::

::: ejercicio Publicar solo la entrada
En un despliegue real solo debería ser accesible desde fuera el puerto del frontend. Indica qué líneas del `compose.yaml` quitarías y qué dejaría de funcionar en tu forma de trabajar actual (IDE, pgAdmin, Vite). Propón cómo mantener las dos formas de trabajar con un fichero `compose.override.yaml`.
:::

::: preguntas
1. ¿Por qué el `compose.yaml` vive en un repositorio propio y no en uno de los servicios?
2. ¿Qué diferencia hay entre un volumen normal y uno `external` cuando se ejecuta `docker compose down -v`?
3. ¿Por qué dentro de la red de Compose la URL de la base de datos usa el puerto 5432 y no el 5433?
4. ¿Cuándo se ejecuta el *script* de `postgres/init`, y por qué la contraseña se pasa con `--set` y `:'app_password'`?
5. ¿Qué problema resuelven el `resolver` de nginx y los nombres de los servicios en variables?
:::
