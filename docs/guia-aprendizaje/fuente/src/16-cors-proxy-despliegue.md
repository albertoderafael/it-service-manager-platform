# CORS, el proxy de desarrollo y el despliegue

<p class="lead">El navegador aplica una regla de seguridad que condiciona cómo se comunica una SPA con su API: la política del mismo origen. Este capítulo explica esa regla y su mecanismo de excepción, CORS; por qué el proyecto no lo necesita en desarrollo; y cuáles son las opciones para llevar la aplicación a producción, con configuraciones concretas.</p>

## La política del mismo origen

Un **origen** es la combinación de **esquema, host y puerto**: `http://localhost:5173` y `http://localhost:8080` son orígenes distintos, aunque estén en la misma máquina, porque cambia el puerto. También lo son `http://` y `https://` del mismo dominio.

La **política del mismo origen** (*same-origin policy*) es una regla del navegador: el código JavaScript de una página **no puede leer las respuestas** de peticiones dirigidas a otro origen, salvo que ese otro origen lo autorice expresamente.

¿Por qué existe? Imagina que estás autenticado en la intranet de tu empresa y visitas una web maliciosa. Sin esta regla, el JavaScript de esa web podría hacer peticiones a la intranet —el navegador enviaría tus *cookies* de sesión automáticamente— y leer las respuestas. La política del mismo origen impide que una web lea datos de otra en nombre del usuario.

::: atencion
La política del mismo origen es una protección **del navegador hacia el usuario**, no del servidor. Un `curl`, Postman, un test de integración o el `RestClient` de un servicio Java no la aplican: pueden llamar a cualquier API. Por eso CORS no sustituye a la autenticación ni a la autorización del backend.
:::

## CORS: cómo autoriza un servidor a otro origen

**CORS** (*Cross-Origin Resource Sharing*) es el mecanismo estándar por el que un servidor declara, mediante cabeceras HTTP, qué orígenes pueden leer sus respuestas.

### Peticiones con verificación previa

Para muchas peticiones, el navegador pregunta antes de enviarlas. Es la **petición de verificación previa** (*preflight*): un `OPTIONS` automático que el código JavaScript no ve. Ocurre, entre otros casos, cuando el método no es `GET`, `HEAD` o `POST`, o cuando se envía un `Content-Type` distinto de los formularios clásicos. Un `PUT` con `Content-Type: application/json`, como el que hace el proyecto al modificar una aplicación, siempre la provoca.

<figure>
<svg viewBox="0 0 680 270" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="9.5">
  <defs><marker id="a16" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker></defs>
  <rect x="40" y="10" width="160" height="34" rx="6" fill="#f1f5f9" stroke="#94a3b8"/><text x="120" y="31" text-anchor="middle" font-weight="700" font-size="10">Navegador · :5173</text>
  <rect x="480" y="10" width="160" height="34" rx="6" fill="#fff7ed" stroke="#fdba74"/><text x="560" y="31" text-anchor="middle" font-weight="700" font-size="10">API · :8081</text>
  <line x1="120" y1="44" x2="120" y2="260" stroke="#cbd5e1" stroke-dasharray="4 3"/>
  <line x1="560" y1="44" x2="560" y2="260" stroke="#cbd5e1" stroke-dasharray="4 3"/>
  <line x1="120" y1="72" x2="556" y2="72" stroke="#475569" marker-end="url(#a16)"/>
  <text x="130" y="66" font-weight="700">1. OPTIONS /api/applications/7</text>
  <text x="130" y="86" font-family="DejaVu Sans Mono" font-size="8">Origin: http://localhost:5173 · Access-Control-Request-Method: PUT</text>
  <text x="130" y="98" font-family="DejaVu Sans Mono" font-size="8">Access-Control-Request-Headers: content-type</text>
  <line x1="560" y1="122" x2="124" y2="122" stroke="#475569" marker-end="url(#a16)"/>
  <text x="550" y="116" text-anchor="end" font-weight="700">2. 200 + permisos</text>
  <text x="550" y="136" text-anchor="end" font-family="DejaVu Sans Mono" font-size="8">Access-Control-Allow-Origin: http://localhost:5173</text>
  <text x="550" y="148" text-anchor="end" font-family="DejaVu Sans Mono" font-size="8">Access-Control-Allow-Methods: GET,POST,PUT</text>
  <line x1="120" y1="178" x2="556" y2="178" stroke="#475569" marker-end="url(#a16)"/>
  <text x="130" y="172" font-weight="700">3. PUT /api/applications/7  { … }</text>
  <line x1="560" y1="214" x2="124" y2="214" stroke="#475569" marker-end="url(#a16)"/>
  <text x="550" y="208" text-anchor="end" font-weight="700">4. 200 { … } + Access-Control-Allow-Origin</text>
  <text x="340" y="248" text-anchor="middle" font-size="9" fill="#475569">Si en el paso 2 faltan las cabeceras, el navegador no envía el PUT y JavaScript recibe un error de red.</text>
</svg>
<figcaption><b>Figura 16.1.</b> Una petición entre orígenes con verificación previa. Sin las cabeceras adecuadas en la respuesta al <code>OPTIONS</code>, la petición real nunca se envía.</figcaption>
</figure>

Las cabeceras principales que devuelve el servidor:

| Cabecera | Significado |
|---|---|
| `Access-Control-Allow-Origin` | Qué origen puede leer la respuesta (uno concreto, o `*` para cualquiera sin credenciales) |
| `Access-Control-Allow-Methods` | Métodos permitidos |
| `Access-Control-Allow-Headers` | Cabeceras que puede enviar el cliente (`Content-Type`, `Authorization`…) |
| `Access-Control-Allow-Credentials` | Si se admiten *cookies* o autenticación HTTP |
| `Access-Control-Max-Age` | Cuántos segundos puede cachear el navegador la respuesta al `OPTIONS` |

Cuando falla, el navegador muestra en consola un mensaje como *Access to fetch at '…' from origin '…' has been blocked by CORS policy*, y para el JavaScript la petición simplemente ha fallado por red: en el proyecto, un `ApiError` de tipo `network`. La pista está siempre en la consola, no en el código.

## El proyecto en desarrollo: tres procesos y un proxy

Recordemos la topología actual (capítulo 4):

<figure>
<svg viewBox="0 0 680 200" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="a16b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <rect x="10" y="70" width="120" height="60" rx="8" fill="#f1f5f9" stroke="#94a3b8"/><text x="70" y="96" text-anchor="middle" font-weight="700">Navegador</text><text x="70" y="112" text-anchor="middle" font-size="8.5" fill="#475569">un solo origen</text>
  <rect x="190" y="60" width="150" height="80" rx="8" fill="#ecfeff" stroke="#0891b2"/><text x="265" y="88" text-anchor="middle" font-weight="700">Vite · :5173</text><text x="265" y="106" text-anchor="middle" font-size="8.5" fill="#0e7490">SPA + proxy /api/*</text>
  <rect x="420" y="20" width="250" height="60" rx="8" fill="#fff7ed" stroke="#fdba74"/><text x="545" y="44" text-anchor="middle" font-weight="700">Servicio de aplicaciones · :8081</text><text x="545" y="62" text-anchor="middle" font-size="8.5" fill="#9a3412">/api/applications</text>
  <rect x="420" y="120" width="250" height="60" rx="8" fill="#fff7ed" stroke="#fdba74"/><text x="545" y="144" text-anchor="middle" font-weight="700">Servicio de demandas · :8080</text><text x="545" y="162" text-anchor="middle" font-size="8.5" fill="#9a3412">/api/demands · PostgreSQL</text>
  <line x1="130" y1="100" x2="188" y2="100" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a16b)"/>
  <line x1="340" y1="85" x2="418" y2="55" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a16b)"/>
  <line x1="340" y1="115" x2="418" y2="145" stroke="#0891b2" stroke-width="1.5" marker-end="url(#a16b)"/>
  <line x1="545" y1="120" x2="545" y2="82" stroke="#c2410c" stroke-width="1.5" marker-end="url(#a16b)"/>
  <text x="538" y="98" text-anchor="end" font-size="8.5" fill="#c2410c">RestClient: catálogo</text><text x="538" y="110" text-anchor="end" font-size="8.5" fill="#c2410c">(servidor a servidor)</text>
</svg>
<figcaption><b>Figura 16.2.</b> En desarrollo, el navegador solo habla con Vite. Los servicios se comunican entre sí sin pasar por el navegador.</figcaption>
</figure>

- El navegador carga la SPA y llama a `/api/...` en **el mismo origen** (`localhost:5173`): no hay petición entre orígenes y, por tanto, no hay CORS.
- Vite reenvía cada prefijo a su servicio. Entre servidores no existe la política del mismo origen.
- El servicio de demandas consulta el catálogo de aplicaciones directamente con un `RestClient` (`application-catalog.base-url=http://localhost:8081`), también sin CORS.

Por eso el backend **no tiene CORS configurado** y no le hace falta para desarrollar. La cuestión es qué pasa en producción, donde no hay servidor de Vite.

## Opciones para producción

Hay tres formas de servir la SPA y la API en producción.

### Opción A: mismo origen detrás de un proxy inverso (recomendada)

Un servidor web (Nginx, Apache, un balanceador o una pasarela de API) sirve los ficheros de `dist/` y reenvía `/api/...` a los servicios. Es **la misma topología que en desarrollo**, con otro servidor haciendo de Vite:

```nginx title="nginx.conf (ejemplo)"
server {
  listen 80;
  root /usr/share/nginx/html;          # contenido de dist/

  # API: cada prefijo a su servicio
  location /api/applications { proxy_pass http://applications-service:8081; }
  location /api/demands      { proxy_pass http://demands-service:8080; }

  # Ficheros con huella: caché de larga duración
  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # SPA: cualquier otra ruta devuelve index.html (fallback del capítulo 1)
  location / {
    try_files $uri /index.html;
    add_header Cache-Control "no-cache";
  }
}
```

Tres reglas concentran todo lo aprendido: el proxy de la API, la caché de los ficheros con huella y el *fallback* a `index.html` para las rutas de la SPA. Como el navegador solo ve un origen, **no hace falta CORS**, y las *cookies* de sesión, si las hubiera, funcionan sin configuración adicional.

### Opción B: orígenes distintos con CORS en el backend

La SPA se publica en su propio dominio (por ejemplo, un almacenamiento estático con CDN en `https://itsm.empresa.com`) y la API en otro (`https://api.itsm.empresa.com`). Entonces cada servicio debe declarar CORS. En Spring Boot sería algo así:

```java title="Ejemplo de configuración CORS en Spring (no está en el backend)"
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("https://itsm.empresa.com")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("Content-Type", "Authorization")
                .maxAge(3600);
    }
}
```

Además, el frontend se construiría con `VITE_API_BASE_URL=https://api.itsm.empresa.com/api`. Con dos servicios hay que configurar CORS en ambos, o poner delante una pasarela (Spring Cloud Gateway, por ejemplo) que lo centralice.

::: atencion
Nunca uses `allowedOrigins("*")` junto con credenciales, y no copies a producción una configuración de desarrollo que permite cualquier origen. CORS bien configurado es una lista corta y explícita de orígenes de confianza.
:::

### Opción C: la SPA dentro del propio backend

Spring Boot sirve automáticamente los ficheros de `src/main/resources/static`. Se puede copiar `dist/` ahí durante la construcción y desplegar un único JAR. Es sencillo para una aplicación monolítica, pero exige añadir una regla de *fallback* a `index.html` en Spring y acopla los ciclos de despliegue de frontend y backend. Con la API repartida en dos servicios, deja de ser natural.

| | A · Proxy inverso | B · CORS | C · Dentro del backend |
|---|---|---|---|
| CORS | No necesario | Necesario en cada servicio | No necesario |
| Topología igual a desarrollo | Sí | No | Parcialmente |
| Despliegue independiente del frontend | Sí | Sí | No |
| Encaje con varios servicios | Muy bueno (o pasarela de API) | Requiere configurar cada uno | Malo |
| Mismo *build* para todos los entornos | Sí, con `/api` relativo | No: la URL de la API va en el *build* | Sí |

::: decision Mismo origen con proxy inverso en producción
**Decisión.** Mantener en producción la topología de desarrollo: la SPA y la API bajo el mismo origen, con un proxy inverso (o una pasarela de API) que reparte `/api/*` entre los servicios.

**Motivos.** Sin CORS que mantener; sin diferencias entre entornos; las *cookies* de una futura autenticación funcionan sin configuración especial; y, sobre todo, la URL base de la API sigue siendo la ruta relativa `/api`, de modo que **el mismo *build* sirve para todos los entornos**.

**Cuándo cambiaría.** Si el frontend tuviera que publicarse en una CDN con dominio propio, independiente de la infraestructura del backend, la opción B sería la adecuada.
:::

## Un *build* para todos los entornos

Recuerda del capítulo 4 que las variables `VITE_*` se **incrustan en el código al construir**. Si la URL de la API fuera absoluta y distinta en cada entorno (`https://api-pre…`, `https://api…`), habría que construir una versión distinta para desarrollo, preproducción y producción, y lo que se prueba no sería exactamente lo que se despliega.

Con una URL **relativa** (`/api`), el JavaScript no sabe ni le importa en qué dominio está: llama a `/api` de su propio origen, y es el proxy de cada entorno el que sabe dónde están los servicios. El mismo `dist/` (o la misma imagen de contenedor) se promociona de un entorno a otro sin reconstruir. Es un principio clásico de entrega continua: **construir una vez, desplegar muchas**.

### Un ejemplo de imagen de contenedor

```dockerfile title="Dockerfile (ejemplo)"
# 1. Construcción con Node
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2. Servidor web con el resultado
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
```

La construcción en dos etapas deja Node fuera de la imagen final: lo que se despliega es un Nginx con ficheros estáticos de unos pocos megas. `npm ci` garantiza que se instalan exactamente las versiones del *lockfile* (capítulo 3).

::: java
Es el mismo patrón que una imagen de Spring Boot construida en dos etapas: una con Maven y la JDK para compilar y otra solo con un JRE y el JAR. Aquí la segunda etapa ni siquiera necesita un entorno de ejecución del lenguaje: solo un servidor web.
:::

## Seguridad básica de una SPA desplegada

- **Ningún secreto en el *bundle*.** Todo lo que hay en `dist/` es público (capítulo 4). Claves de servicios, contraseñas o *tokens* de sistemas van en el backend.
- **HTTPS siempre**, con redirección desde HTTP.
- **Cabeceras de seguridad** en el servidor web: `Content-Security-Policy` (qué orígenes pueden cargar scripts, estilos o hacer peticiones), `X-Content-Type-Options: nosniff` y `Referrer-Policy`. Una SPA sin scripts externos ni estilos en línea puede tener una política muy estricta.
- **La autorización es del backend.** Ocultar un botón en la interfaz no impide llamar al endpoint (capítulo 1).

## Errores típicos y depuración

- **`blocked by CORS policy` en consola.** La página y la API están en orígenes distintos y la API no lo permite. O se sirve todo bajo el mismo origen, o se configura CORS en el servicio para ese origen exacto (esquema, host y puerto).
- **La petición `OPTIONS` devuelve 401 o 403.** La seguridad del backend está bloqueando la verificación previa; debe permitir los `OPTIONS` sin autenticación (Spring Security lo hace si se configura CORS en su cadena de filtros).
- **Todo funciona en local y en producción la API devuelve el `index.html`.** El servidor web no tiene la regla del proxy para ese prefijo y está aplicando el *fallback* de la SPA.
- **404 al recargar en una ruta de la SPA.** Falta el *fallback* `try_files $uri /index.html`.
- **Los usuarios ven una versión antigua tras desplegar.** `index.html` se está cacheando. Debe servirse con `Cache-Control: no-cache`; los ficheros de `assets/`, con huella, sí pueden cachearse para siempre.

## Ejercicios

::: ejercicio Provoca un error de CORS
Crea un `.env.local` con `VITE_API_BASE_URL=http://localhost:8081/api` y reinicia Vite. Abre el listado de aplicaciones. ¿Qué error aparece en la consola? ¿Y en *Network*? ¿Qué `kind` tiene el `ApiError` que ve la interfaz? Explica por qué ya no interviene el proxy. Borra el `.env.local` al terminar.
:::

::: ejercicio Sirve el build como en producción
Ejecuta `npm run build` y sirve `dist/` con un Nginx en Docker usando la configuración de la sección 16.4, ajustando los destinos del proxy a `host.docker.internal:8080` y `:8081` para llegar a los servicios de tu máquina. Comprueba: que la aplicación funciona, que al recargar en `/demandas/1` no hay 404 y que en *Network* los ficheros de `/assets/` llevan la cabecera de caché de larga duración.
:::

::: ejercicio Elige una opción de despliegue
Tu empresa te pide desplegar la aplicación en un entorno donde el equipo de infraestructura ofrece: un balanceador que puede enrutar por prefijo de ruta, un almacenamiento de ficheros estáticos con CDN y un clúster de contenedores. Escribe una breve propuesta (media página) con la opción elegida, la configuración necesaria y los riesgos. Usa la tabla de la sección 16.4 como guía.
:::

## Autoevaluación

::: preguntas
1. ¿Qué tres elementos definen un origen? ¿Son el mismo origen `http://localhost:5173` y `http://localhost:8080`?
2. ¿A quién protege la política del mismo origen y de qué ataque?
3. ¿Qué es una petición de verificación previa y cuándo se produce?
4. ¿Por qué el proyecto no necesita CORS en desarrollo?
5. ¿Cuáles son las tres opciones de despliegue y cuál recomienda el proyecto?
6. ¿Por qué una URL de API relativa permite usar el mismo *build* en todos los entornos?
7. ¿Qué cabeceras de caché deben llevar `index.html` y los ficheros de `assets/`?
8. ¿Sustituye CORS a la autenticación del backend? ¿Por qué?
:::
