# Chuleta de comandos

<p class="lead">Los comandos de uso diario con los dos servicios, agrupados por herramienta. Ninguno contiene credenciales: las contraseñas se toman siempre de variables de entorno.</p>

## Puertos y nombres

| Pieza | Puerto | Base de datos | Usuario | Variable de la contraseña |
|---|---|---|---|---|
| PostgreSQL (Docker) | 5433 (interno 5432) | — | — | `DB_PASSWORD` y `APPLICATION_DB_PASSWORD` en el `.env` de la plataforma |
| Servicio de demandas | 8080 | `it_service_manager` | `itmanager` | `DB_PASSWORD` |
| Catálogo de aplicaciones | 8081 | `application_db` | `application_user` | `DB_PASSWORD` (o `APPLICATION_DB_PASSWORD`) |
| Frontend con nginx (Docker) | 8088 | — | — | — |
| Frontend con Vite (desarrollo) | 5173 | — | — | — |

## Docker Compose (carpeta `it-service-platform`)

```powershell
docker compose up -d --build         # construir y arrancar todo el sistema
docker compose up -d                 # arrancar sin reconstruir
docker compose ps                    # estado y salud de cada servicio
docker compose logs -f demand-service
docker compose stop application-catalog-service    # parar un servicio
docker compose start application-catalog-service   # volver a arrancarlo
docker compose stop                  # parar todo sin eliminar contenedores
docker compose down                  # eliminar contenedores; el volumen se CONSERVA
docker volume ls                     # volúmenes (it-service-manager_postgres_data)
```

| Docker (imágenes sueltas) | Qué hace |
|---|---|
| `docker build -t it-service-manager:dev .` | Construye la imagen de un servicio desde su carpeta |
| `docker history it-service-manager:local` | Muestra las capas de una imagen |
| `docker run --rm -p 8081:8081 -e DB_URL=… -e DB_PASSWORD=… application-catalog-service:dev` | Ejecuta una imagen suelta; desde el contenedor, el equipo es `host.docker.internal` |
| `Get-Process -Id (Get-NetTCPConnection -LocalPort 8080 -State Listen).OwningProcess` | Qué proceso ocupa un puerto |

::: atencion
No uses `docker compose down -v` ni `docker volume rm`: eliminan el volumen y, con él, todos los datos.
:::

```powershell
# Consola SQL dentro del contenedor
docker compose exec postgres psql -U itmanager -d it_service_manager
```

| Comando de `psql` | Qué hace |
|---|---|
| `\l` | Lista las bases de datos |
| `\c application_db` | Cambia de base de datos |
| `\dt` | Lista las tablas |
| `\d demands` | Describe una tabla: columnas, índices, restricciones |
| `\q` | Sale |

```sql
-- Historial de Flyway
SELECT installed_rank, version, description, success
FROM flyway_schema_history ORDER BY installed_rank;
```

## Maven Wrapper

| Comando (PowerShell) | Qué hace |
|---|---|
| `.\mvnw.cmd spring-boot:run` | Arranca el servicio |
| `.\mvnw.cmd test` | Ejecuta todas las pruebas (las de integración necesitan Docker) |
| `.\mvnw.cmd test -Dtest=DemandCatalogTest` | Una clase de pruebas |
| `.\mvnw.cmd test -Dtest="DemandTest#shouldReject*"` | Métodos por patrón |
| `.\mvnw.cmd -DskipTests package` | Compila y empaqueta sin pruebas |
| `.\mvnw.cmd dependency:tree` | Árbol de dependencias y sus versiones |
| `.\mvnw.cmd spring-boot:build-image` | Construye una imagen de contenedor (no se usa todavía) |

## Variables de entorno en PowerShell

```powershell
# Pedir una contraseña sin escribirla en el historial
$cred = Get-Credential -UserName itmanager -Message 'Base de datos de demandas'
$env:DB_PASSWORD = $cred.GetNetworkCredential().Password

# Cambiar la URL del catálogo sin tocar ficheros
$env:APPLICATION_CATALOG_BASE_URL = 'http://localhost:8081'

# Quitar una variable de la sesión
Remove-Item Env:DB_PASSWORD
```

## Peticiones de comprobación

```powershell
# Catálogo
Invoke-RestMethod 'http://localhost:8081/api/applications?page=0&size=5'
Invoke-RestMethod 'http://localhost:8081/api/applications/1'
Invoke-RestMethod 'http://localhost:8081/api/applications/summaries?ids=1,2'

# Demandas
Invoke-RestMethod 'http://localhost:8080/api/demands?status=OPEN&sort=updatedAt,desc'

# Alta de una demanda
$body = @{ title = 'Prueba'; description = $null; priority = 'LOW'; applicationId = 1 } |
        ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/demands' `
                  -ContentType 'application/json' -Body $body
```

Con `curl` (en PowerShell, `curl.exe` para no usar el alias):

```bash
curl.exe -i "http://localhost:8080/api/demands/999"
curl.exe -i -X POST "http://localhost:8080/api/demands" \
     -H "Content-Type: application/json" \
     -d "{\"title\":\"Prueba\",\"priority\":\"LOW\",\"applicationId\":1}"
```

La opción `-i` muestra el código de estado y las cabeceras, útil para ver `Location` o un 409.

## Propiedades útiles para depurar

| Propiedad | Efecto |
|---|---|
| `debug=true` | Informe de autoconfiguración al arrancar |
| `spring.jpa.show-sql=true` | SQL de Hibernate en la consola |
| `logging.level.org.hibernate.SQL=DEBUG` | SQL de Hibernate por el sistema de *logs* |
| `logging.level.org.hibernate.orm.jdbc.bind=TRACE` | Valores de los parámetros del SQL |
| `spring.jpa.properties.hibernate.generate_statistics=true` | Estadísticas de sentencias por sesión |
| `logging.level.org.springframework.web=DEBUG` | Detalle de cómo Spring MVC resuelve cada petición |

## Códigos de estado del proyecto

| Código | Cuándo |
|---|---|
| 200 | Consulta o modificación correcta |
| 201 | Alta correcta, con cabecera `Location` |
| 400 | Campos inválidos, JSON mal formado, tipo incorrecto, filtro u orden desconocido |
| 404 | Recurso inexistente (demanda o aplicación) |
| 409 | Transición de estado inválida |
| 503 | El catálogo no responde o falla |

## Regenerar esta guía

```bash
cd docs/guia-aprendizaje-backend/fuente
pip install weasyprint markdown pygments
python build.py
python check_links.py build/guia-backend-it-service-manager.pdf
```
