# Plataforma (Docker Compose)

Despliegue local con Docker Compose de **IT Service & Demand Manager**:

| Servicio | Puerto | Imagen | Base de datos |
|---|---|---|---|
| `postgres` | 5433 → 5432 | `postgres:18.6` | `it_service_manager`, `application_db` |
| `application-catalog-service` | 8081 | construida desde `../services/application-catalog-service` | `application_db` |
| `demand-service` | 8080 | construida desde `../services/demand-service` | `it_service_manager` |
| `web` | 8088 → 80 | construida desde `../web` (nginx) | — |

La aplicación completa queda en **http://localhost:8088**. nginx sirve el frontend
y reenvía `/api/demands` y `/api/applications` a cada servicio, así que el
navegador ve un único origen y no hace falta CORS.

Para desarrollar el frontend se puede seguir usando Vite (`npm run dev`, puerto
5173) contra los servicios de este Compose.

## Primera vez

1. Ten Docker Desktop en marcha y los puertos 5433, 8080, 8081 y 8088 libres.
2. Dentro de `platform/`, copia `.env.example` como `.env` y pon las contraseñas
   de los usuarios `itmanager` y `application_user`. `.env` no se versiona.
3. Arranca con `docker compose up -d --build`. En el primer arranque PostgreSQL
   ejecuta `postgres/init/` y crea las dos bases de datos; Flyway crea las tablas
   de cada servicio.

El catálogo arranca vacío en una instalación nueva: crea algunas aplicaciones
desde la web antes de registrar demandas.

## Uso

```powershell
docker compose up -d --build     # construir y arrancar todo
docker compose ps                # estado y salud de cada servicio
docker compose logs -f demand-service
docker compose stop              # parar (los datos se conservan)
docker compose down              # eliminar contenedores (los datos se conservan)
```

> `docker compose down -v` elimina también el volumen y, con él, todos los datos.

Comprobaciones rápidas:

- http://localhost:8088 → la aplicación web
- http://localhost:8081/actuator/health y http://localhost:8080/actuator/health → `UP`
- http://localhost:8081/api/applications
- http://localhost:8080/api/demands

## Desarrollo con el IDE

Para depurar un servicio en Spring Tools, para solo su contenedor y arráncalo en
el IDE: usará el PostgreSQL y el otro servicio de Compose por los puertos publicados.

```powershell
docker compose stop demand-service     # y arrancarlo en Spring Tools
docker compose start demand-service    # al terminar
```

No arranques el mismo servicio a la vez en Docker y en el IDE: compiten por el puerto.

## Decisiones

- **Una instancia de PostgreSQL, una base de datos y un usuario por servicio.**
  El script `postgres/init/10-application-db.sh` crea `application_db` y
  `application_user` en instalaciones nuevas y limita la conexión de cada usuario
  a su propia base de datos.
- **Un volumen con nombre** para PostgreSQL: los datos sobreviven a reinicios y
  a la recreación de los contenedores.
- **El servicio de demandas no depende del catálogo para arrancar.** Si el
  catálogo no está disponible, responde 503 en lo que lo necesita.
- **Comprobaciones de salud** con Spring Boot Actuator (`/actuator/health`), que
  incluyen la conexión a PostgreSQL.
- **Configuración por variables de entorno.** Las imágenes son las mismas en
  cualquier entorno; solo cambian las variables.
