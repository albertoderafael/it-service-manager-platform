# Chuleta de comandos y atajos

<p class="lead">Los comandos y atajos que usarás a diario con el proyecto, agrupados por herramienta.</p>

## Arranque diario

```bash
# 1. Backend: servicios de aplicaciones (8081) y demandas (8080) arrancados
# 2. Frontend
cd C:\Workspace\it-service-manager-web
npm install          # solo si cambió package.json o tras cambiar de rama
npm run dev          # http://localhost:5173
```

## Scripts del proyecto

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente y proxy a la API |
| `npm run build` | Comprueba tipos y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en local para probar la versión de producción |
| `npm run typecheck` | Solo comprobación de tipos (`tsc -b`) |
| `npm run lint` | ESLint sobre todo el proyecto |
| `npm run test` | Todas las pruebas una vez (`vitest run`) |

Antes de dar algo por terminado: `npm run typecheck && npm run lint && npm run test`.

## npm

| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias según `package.json` y el *lockfile* |
| `npm ci` | Instalación limpia y exacta desde el *lockfile* (integración continua) |
| `npm install paquete` / `npm install -D paquete` | Añade una dependencia / de desarrollo |
| `npm uninstall paquete` | Elimina una dependencia |
| `npm outdated` | Muestra dependencias desactualizadas |
| `npm update` | Actualiza dentro de los rangos permitidos |
| `npm ls paquete` / `npm explain paquete` | Quién depende de un paquete y por qué está instalado |
| `npm audit` | Vulnerabilidades conocidas |
| `npx herramienta` | Ejecuta una herramienta instalada en el proyecto |
| `node -v` / `npm -v` | Versiones instaladas |

## Vite

| Comando | Qué hace |
|---|---|
| `npx vite --force` | Arranca regenerando la caché de dependencias (`node_modules/.vite`) |
| `npx vite --port 5180` | Arranca en otro puerto |
| `npx vite build --mode production` | *Build* con un modo concreto (ficheros `.env.<modo>`) |

## Vitest

| Comando | Qué hace |
|---|---|
| `npx vitest` | Modo vigilancia |
| `npx vitest run fichero` | Solo los ficheros que contienen el texto |
| `npx vitest run -t "texto"` | Solo las pruebas cuyo nombre contiene el texto |
| `npx vitest run --reporter=verbose` | Lista cada prueba |
| `npx vitest run --coverage` | Cobertura (requiere `@vitest/coverage-v8`) |
| `npx vitest --ui` | Interfaz web (requiere `@vitest/ui`) |

## shadcn/ui

| Comando | Qué hace |
|---|---|
| `npx shadcn@latest add dialog` | Copia el componente en `src/components/ui` e instala sus dependencias |
| `npx shadcn@latest add dialog --overwrite` | Vuelve a copiarlo (para actualizar; compara con Git después) |

## Git (flujo recomendado para los ejercicios)

```bash
git switch -c ejercicio/19-1-buscador      # rama para el ejercicio
git add -p && git commit -m "…"            # commits pequeños
git switch main && git branch -D ejercicio/19-1-buscador   # descartar al terminar
```

## Herramientas del navegador

| Atajo (Chrome/Edge en Windows) | Acción |
|---|---|
| F12 o Ctrl+Mayús+I | Abrir las DevTools |
| Ctrl+Mayús+C | Seleccionar un elemento de la página |
| Ctrl+Mayús+M | Modo de dispositivo (móvil) |
| Ctrl+P (en DevTools) | Abrir un fichero fuente para depurar |
| Ctrl+Mayús+P (en DevTools) | Paleta de comandos de las DevTools |
| Ctrl+F5 / Ctrl+Mayús+R | Recarga sin caché |
| Pestaña *Network* → *Fetch/XHR* | Solo las llamadas a la API |
| Pestaña *Network* → *Disable cache* | Desactiva la caché mientras están abiertas |
| Pestaña *Components* (React DevTools) | Árbol de componentes, props, estado y hooks |
| Pestaña *Profiler* (React DevTools) | Graba y mide los renderizados |

## Depurar en el código

| Técnica | Uso |
|---|---|
| `console.log(valor)` | Lo más rápido; en desarrollo aparece dos veces por `StrictMode` |
| `console.table(array)` | Muestra un array de objetos como tabla |
| `debugger;` | Detiene la ejecución en ese punto si las DevTools están abiertas |
| Punto de ruptura en *Sources* | Clic en el número de línea |
| *Copy as fetch* en *Network* | Copia una petición para repetirla o modificarla en la consola |

## Comprobar la API desde la consola del navegador

```js
// Listado (pasa por el proxy de Vite: mismo origen)
await fetch('/api/applications?page=0&size=5').then((r) => r.json())

// Alta
await fetch('/api/applications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'PRUEBA', description: null, criticality: 'LOW' }),
}).then((r) => r.json())
```

## Docker (ejemplo del capítulo 16)

```bash
npm run build
docker run --rm -p 8088:80 \
  -v "$PWD/dist:/usr/share/nginx/html:ro" \
  -v "$PWD/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:1.27-alpine
```

## Regenerar esta guía

```bash
cd docs/guia-aprendizaje/fuente
pip install weasyprint markdown pygments
python build.py                                   # genera build/guia-frontend-it-service-manager.pdf
python check_links.py build/guia-frontend-it-service-manager.pdf
```
