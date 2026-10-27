# Equivalencias Java ↔ frontend

<p class="lead">Una tabla de consulta rápida con los conceptos del mundo Java/Spring que tienen un equivalente razonable en el frontend del proyecto. Las analogías ayudan a orientarse, pero ninguna es exacta: la última columna recoge la diferencia que más conviene recordar.</p>

## Lenguaje

| Java | TypeScript / JavaScript | Diferencia clave |
|---|---|---|
| Clase DTO o `record` | `interface` o `type` | Los tipos desaparecen en ejecución: no validan nada |
| Tipado nominal (`implements`) | Tipado estructural | Basta con tener la forma; no hay que declarar nada |
| `enum` | Unión de literales + `as const` | En ejecución son cadenas, exactamente como en el JSON |
| `final` | `const` | `const` impide reasignar, no modificar el objeto |
| `Optional.map` / `orElse` | `?.` / `??` | Integrado en el lenguaje, sin envolver el valor |
| `null` | `null` **y** `undefined` | Dos valores de ausencia con usos distintos |
| `switch` exhaustivo sobre un enum sellado | `Record<Unión, V>` | El compilador exige todas las claves |
| Lambda + interfaz funcional | Función flecha | El tipo es la firma; puede modificar variables externas |
| `Stream.map/filter/findFirst` | `array.map/filter/find` | Sin `stream()` ni `collect()`; devuelven arrays |
| `CompletableFuture<T>` | `Promise<T>` | `await` no bloquea el hilo |
| Hilos, `synchronized` | Un solo hilo + bucle de eventos | Nunca bloquees el hilo |
| Paquete + `public` | Módulo + `export` | Se pueden exportar funciones y constantes sueltas |
| Genéricos (`<T extends Foo>`) | Genéricos (`<T extends Foo>`) | Parecidos; los de TypeScript se infieren más |
| `Object` / `?` | `unknown` | `any` desactiva la comprobación; evítalo |
| Excepción comprobada | No existen | Cualquier cosa puede lanzarse; lo capturado es `unknown` |

## Construcción y ecosistema

| Java | Frontend | Diferencia clave |
|---|---|---|
| JDK en la máquina de desarrollo | Node.js | No se despliega: solo ejecuta herramientas |
| Maven / Gradle | npm + Vite | Las dependencias usan rangos; el *lockfile* da reproducibilidad |
| `pom.xml` | `package.json` | `scripts` sustituye a las fases de Maven |
| Ámbitos `compile` / `test` | `dependencies` / `devDependencies` | El criterio es si el código acaba en el *bundle* |
| `~/.m2` | `node_modules` (por proyecto) | Grande; nunca se versiona |
| `mvn package` | `npm run build` | Resultado: ficheros estáticos en `dist/` |
| `mvn compile` | `npm run typecheck` | Vite transpila sin comprobar tipos |
| Proyecto multimódulo | Referencias de proyecto de TypeScript | Separan código de navegador y de Node |
| Checkstyle / PMD / SpotBugs | ESLint | Las reglas de *hooks* no tienen equivalente directo |
| Spring Boot DevTools | HMR + React Fast Refresh | Conserva el estado de la pantalla |
| Arquetipo / Spring Initializr | CLI de shadcn/ui | Copia código que pasa a ser tuyo |

## Arquitectura y Spring

| Spring / backend | Frontend del proyecto | Diferencia clave |
|---|---|---|
| Paquete por funcionalidad | `features/<módulo>` | Misma idea, mismas fronteras de dominio |
| `@RequestMapping` | Tabla de rutas de React Router | Las rutas se anidan y aportan armazones (*layouts*) |
| Controlador | Página (`pages/`) | Lee la URL, pide datos y elige la vista |
| `@PathVariable` / `@RequestParam` | `useParams` / `useSearchParams` | Llegan como texto y hay que validarlos a mano |
| Vista (JSP / Thymeleaf) | Componente | Se re-evalúa en el navegador cada vez que cambian los datos |
| Fragmento parametrizado de Thymeleaf | Props de tipo `ReactNode`, `children` | Composición en lugar de herencia de plantillas |
| `@Configuration` + beans | Proveedores en `app.tsx` | Inyección por posición en el árbol, no por tipo |
| `@Autowired` | `useContext` / hooks | Busca el proveedor más cercano hacia arriba |
| Servicio | Hook personalizado | No es un *singleton*: la lógica se instala en cada componente |
| Dominio / entidad con reglas | `model/` (tipos, reglas, esquemas) | Refleja reglas del backend, que sigue siendo la autoridad |
| `RestClient` / Feign | `api-client.ts` + `-api.ts` | Construido sobre `fetch` |
| `ResponseErrorHandler` | `toApiError` | Interpreta varios formatos de error |
| `@RestControllerAdvice` | `ErrorState`, `applyServerFieldErrors`, `errorElement` | La presentación del error la decide cada pantalla |
| Caché de segundo nivel / `@Cacheable` | TanStack Query | Además notifica a la interfaz y refresca en segundo plano |
| `@CacheEvict` | `invalidateQueries` | Invalidación por prefijo de clave |
| Comprobación de cambios de Hibernate | Reconciliación de React | Tú describes el estado; el motor aplica solo las diferencias |
| Entidad gestionada mutable | Estado inmutable | Se sustituye por copias; mutarlo no provoca renderizado |
| `FetchType.LAZY` / carga perezosa de clases | `lazy` + `import()` dinámico | La primera vez hay una pequeña espera |
| Bean Validation (`@NotBlank`, `@Size`) | Esquemas de Zod | Validación de comodidad; el backend vuelve a validar |
| `application.properties` / perfiles | `.env` + `VITE_*` | Se incrustan en el *bundle* al construir: nunca secretos |
| Hilo virtual que espera E/S | `await` | Mismo efecto: esperar sin bloquear |

## Pruebas

| Java | Frontend | Diferencia clave |
|---|---|---|
| JUnit 5 | Vitest (`describe`, `it`) | Misma estructura; sin anotaciones |
| AssertJ | `expect(…).toBe/toEqual` | `toBe` compara referencias; `toEqual`, contenido |
| `@ParameterizedTest` | `it.each` | |
| Mockito | `vi.fn`, `vi.spyOn`, `vi.mock` | Úsalos con moderación |
| MockMvc | Testing Library | Se interactúa como un usuario: por rol y texto |
| WireMock | MSW | Intercepta `fetch` en las pruebas |
| Testcontainers + pruebas de extremo a extremo | Playwright contra el backend real | Navegador real |
| ArchUnit | `no-restricted-imports`, `eslint-plugin-boundaries` | Reglas de dependencia entre carpetas |
| Spring Cloud Contract / Pact | Pruebas de contrato en `model/`, OpenAPI | Hoy manuales en el proyecto |

## Despliegue

| Java | Frontend | Diferencia clave |
|---|---|---|
| JAR ejecutable con JVM | Ficheros estáticos en un servidor web | No hay nada que ejecutar en el servidor |
| Imagen Docker multietapa con Maven y JRE | Imagen multietapa con Node y Nginx | La imagen final no lleva Node |
| CORS en Spring (`addCorsMappings`) | Mismo origen con proxy (recomendado) | Sin proxy, CORS debe configurarse en cada servicio |
| *Construir una vez, desplegar muchas* | URL de API relativa `/api` | Evita reconstruir por entorno |
