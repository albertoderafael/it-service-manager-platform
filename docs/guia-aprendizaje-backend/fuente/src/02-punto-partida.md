# Del servidor de aplicaciones a Spring Boot 4

<p class="lead">El primer paso no fue escribir código de negocio, sino elegir la plataforma y darle forma al proyecto. Este capítulo explica qué se generó, qué hace Spring Boot cuando arranca y por qué el código se organizó por módulos de negocio desde el primer día.</p>

## El punto de partida

El objetivo era construir una API REST para gestionar el catálogo de aplicaciones de una organización y, después, las demandas de trabajo asociadas a cada aplicación. La API la consumiría un frontend independiente en React, y los datos vivirían en PostgreSQL.

En un proyecto Java EE clásico, el primer día habría consistido en preparar un servidor: instalar WebSphere, definir un origen de datos JNDI, configurar el gestor de transacciones y empaquetar un EAR con un módulo web y un módulo EJB. En Spring Boot ese trabajo desaparece casi por completo: **la aplicación lleva el servidor dentro**.

<figure>
<svg viewBox="0 0 680 230" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <rect x="10" y="10" width="320" height="210" rx="10" fill="#fff7ed" stroke="#fdba74"/>
  <text x="170" y="32" text-anchor="middle" font-weight="700" fill="#c2410c">Java EE en WebSphere</text>
  <rect x="30" y="45" width="280" height="150" rx="8" fill="#fff" stroke="#fdba74"/>
  <text x="170" y="64" text-anchor="middle" font-weight="700">Servidor de aplicaciones (instalado aparte)</text>
  <rect x="45" y="75" width="120" height="50" rx="6" fill="#ffedd5"/><text x="105" y="96" text-anchor="middle">EAR desplegado</text><text x="105" y="111" text-anchor="middle" font-size="9" fill="#475569">WAR + EJB-JAR</text>
  <rect x="175" y="75" width="120" height="50" rx="6" fill="#ffedd5"/><text x="235" y="96" text-anchor="middle">Origen de datos</text><text x="235" y="111" text-anchor="middle" font-size="9" fill="#475569">JNDI en la consola</text>
  <rect x="45" y="135" width="250" height="45" rx="6" fill="#ffedd5"/><text x="170" y="155" text-anchor="middle">Contenedor web, EJB, JTA, JPA del servidor</text><text x="170" y="170" text-anchor="middle" font-size="9" fill="#475569">configurados por el administrador</text>
  <rect x="350" y="10" width="320" height="210" rx="10" fill="#ecfeff" stroke="#67e8f9"/>
  <text x="510" y="32" text-anchor="middle" font-weight="700" fill="#0e7490">Spring Boot</text>
  <rect x="370" y="45" width="280" height="150" rx="8" fill="#fff" stroke="#67e8f9"/>
  <text x="510" y="64" text-anchor="middle" font-weight="700">Un único JAR ejecutable (java -jar)</text>
  <rect x="385" y="75" width="120" height="50" rx="6" fill="#cffafe"/><text x="445" y="96" text-anchor="middle">Tu código</text><text x="445" y="111" text-anchor="middle" font-size="9" fill="#475569">+ dependencias</text>
  <rect x="515" y="75" width="120" height="50" rx="6" fill="#cffafe"/><text x="575" y="96" text-anchor="middle">Tomcat embebido</text><text x="575" y="111" text-anchor="middle" font-size="9" fill="#475569">puerto 8080</text>
  <rect x="385" y="135" width="250" height="45" rx="6" fill="#cffafe"/><text x="510" y="155" text-anchor="middle">HikariCP, Hibernate, transacciones</text><text x="510" y="170" text-anchor="middle" font-size="9" fill="#475569">autoconfigurados desde application.properties</text>
</svg>
<figcaption><b>Figura 2.1.</b> En Java EE la aplicación se despliega dentro de un servidor ya configurado; en Spring Boot la aplicación contiene su servidor y su configuración.</figcaption>
</figure>

## Generar el proyecto: Java 21, Spring Boot 4.1.1 y sus *starters* [paso 1.1]

El proyecto se generó con Spring Initializr (la herramienta web, o el asistente equivalente del IDE), eligiendo Maven, Java 21 y Spring Boot 4.1.1. El resultado es un `pom.xml` que hereda de `spring-boot-starter-parent` y declara una lista corta de dependencias.

```xml title="it-service-demand-manager/backend/pom.xml (extracto)" estado="impl"
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.1.1</version>
    <relativePath/>
</parent>

<properties>
    <java.version>21</java.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webmvc</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-flyway</artifactId>
    </dependency>
    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-database-postgresql</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webmvc-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### Qué es un *starter*

Un *starter* es una dependencia que no contiene código propio: agrupa las librerías necesarias para una capacidad y activa su **autoconfiguración**. Declarar `spring-boot-starter-data-jpa` trae Hibernate, Spring Data JPA, el *pool* de conexiones HikariCP y la integración de transacciones, todo en versiones probadas entre sí.

Las versiones no aparecen en el `pom.xml` porque las fija el *parent*. `spring-boot-starter-parent` importa una lista de materiales (BOM) con la versión de cada librería del ecosistema. Esto evita el problema clásico de combinar, por ejemplo, una versión de Hibernate con una de Spring Data que no la soporta.

| Starter | Qué aporta | Dónde se estudia |
|---|---|---|
| `spring-boot-starter-webmvc` | Spring MVC, Tomcat embebido y Jackson para JSON | Capítulo 9 |
| `spring-boot-starter-data-jpa` | Hibernate, Spring Data JPA, HikariCP y transacciones | Capítulos 5-7 |
| `postgresql` (*runtime*) | El driver JDBC; solo se necesita al ejecutar, no al compilar | Capítulo 3 |
| `spring-boot-starter-flyway` y `flyway-database-postgresql` | Migraciones de esquema al arrancar, con soporte específico de PostgreSQL | Capítulo 4 |
| `spring-boot-starter-validation` | Bean Validation (Hibernate Validator) | Capítulo 8 |
| `spring-boot-starter-webmvc-test` | JUnit 5, Mockito, AssertJ y el soporte de `@WebMvcTest` y MockMvc | Capítulo 11 |

::: atencion Spring Boot 4 es modular
En Spring Boot 4 la autoconfiguración se repartió en módulos más pequeños, y algunos *starters* cambiaron de nombre o pasaron a ser obligatorios. El starter web se llama ahora `spring-boot-starter-webmvc`, y Flyway necesita `spring-boot-starter-flyway`: si solo se añade `flyway-core`, como se hacía en Spring Boot 3, la librería está en el *classpath* pero **nadie la ejecuta al arrancar**. Los ejemplos que encuentres en Internet escritos para Spring Boot 3 pueden no funcionar tal cual.
:::

### La clase principal

```java title="ItServiceManagerApplication.java" estado="impl"
@SpringBootApplication
public class ItServiceManagerApplication {

    public static void main(String[] args) {
        SpringApplication.run(ItServiceManagerApplication.class, args);
    }
}
```

`@SpringBootApplication` combina tres anotaciones:

- `@SpringBootConfiguration`: la clase es una fuente de configuración, como una clase `@Configuration`.
- `@EnableAutoConfiguration`: activa la autoconfiguración de lo que haya en el *classpath*.
- `@ComponentScan`: busca componentes (`@Service`, `@RestController`, `@Repository`…) **en el paquete de esta clase y en todos sus subpaquetes**. Por eso la clase principal está en `com.albertoderafael.itmanager`, la raíz de todos los demás paquetes.

::: java
`@ComponentScan` hace el papel del descubrimiento de EJB y recursos JAX-RS que el servidor de aplicaciones realiza al desplegar un módulo. La diferencia es que aquí lo hace la propia aplicación al ejecutar `main`, sin descriptores `ejb-jar.xml` ni `web.xml`.
:::

## Qué hace Spring Boot al arrancar

Entender el arranque evita muchas sorpresas. Cuando se ejecuta `SpringApplication.run`, ocurre lo siguiente, en este orden:

1. **Se prepara el entorno.** Spring lee `application.properties`, las variables de entorno y los argumentos de línea de comandos, y los combina en un único `Environment`. Si una propiedad aparece en varios sitios, gana la de mayor prioridad: una variable de entorno sobrescribe al fichero.
2. **Se crea el contexto de aplicación**, el contenedor de *beans*.
3. **Se escanean los componentes** del paquete raíz y se registran como *beans*.
4. **Se evalúan las autoconfiguraciones.** Cada una lleva condiciones como «si existe la clase `DataSource` en el *classpath* y el usuario no ha definido un *bean* `DataSource` propio, crea uno con HikariCP». Así, lo que defines tú siempre tiene preferencia sobre lo que Spring crearía.
5. **Se inicializan los *beans*** en orden de dependencias. En este proyecto el orden importa: Flyway migra la base de datos *antes* de que Hibernate valide el esquema (capítulo 4).
6. **Se arranca Tomcat** en el puerto 8080 y la aplicación queda lista para recibir peticiones.

::: proyecto
Si quieres ver qué autoconfiguraciones se aplicaron y cuáles no, arranca con la propiedad `debug=true`. Spring imprime el *condition evaluation report*: una lista de cada autoconfiguración con el motivo por el que se activó o se descartó. Es la primera herramienta cuando algo «no se configura solo».
:::

### Inyección por constructor

Todos los componentes del proyecto reciben sus dependencias por constructor, sin `@Autowired`:

```java title="ApplicationService.java (extracto)" estado="impl"
@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;

    public ApplicationService(ApplicationRepository applicationRepository) {
        this.applicationRepository = applicationRepository;
    }
}
```

Cuando una clase tiene un único constructor, Spring lo usa para inyectar sin necesidad de anotación. La dependencia queda `final`, el objeto no puede existir sin ella y la clase se puede instanciar en una prueba unitaria con `new`, pasándole un *mock*. El capítulo 11 aprovecha exactamente eso.

::: decision Inyección por constructor en lugar de por atributo
**Motivo:** dependencias obligatorias e inmutables, clases fáciles de probar sin Spring y ciclos de dependencias detectados al arrancar. **Alternativa descartada:** `@Autowired` sobre atributos privados, habitual en código antiguo: oculta las dependencias y obliga a usar reflexión o el contenedor en las pruebas.
:::

## Organizar el código por módulo de negocio [paso 1.2]

El código se organizó primero por **módulo de negocio** y, dentro de cada módulo, por capa técnica:

```text title="Estructura del monolito en la fase 2" estado="impl"
com.albertoderafael.itmanager
├── ItServiceManagerApplication.java
├── application/          ← módulo de negocio
│   ├── controller/       ApplicationController
│   ├── dto/              ApplicationCreateRequest, …Response, …PageResponse
│   ├── entity/           Application
│   ├── repository/       ApplicationRepository
│   └── service/          ApplicationService
└── exception/            ← transversal
    ├── ApiErrorResponse
    └── GlobalExceptionHandler
```

La alternativa clásica es la contraria: un paquete `controllers` con todos los controladores, otro `services` con todos los servicios, y así sucesivamente. Funciona en proyectos pequeños, pero a medida que crecen dos problemas se acentúan: para entender una funcionalidad hay que saltar entre cinco paquetes, y nada impide que cualquier servicio use cualquier repositorio.

Con la organización por módulo, todo lo que pertenece a las aplicaciones vive junto. Y, sobre todo, **la frontera entre módulos se ve en los nombres de los paquetes**. Cuando más adelante aparezca el módulo `demand`, cualquier `import` de `itmanager.application` dentro de `itmanager.demand` será una dependencia visible entre módulos. Esa visibilidad es la que permitió, en la fase 5, encontrar exactamente qué había que cortar.

::: decision Paquetes por módulo de negocio
**Motivo:** cohesión (lo que cambia junto vive junto) y fronteras visibles entre módulos, que facilitan extraer uno más tarde. **Alternativa descartada:** paquetes por capa técnica, que mezclan todos los dominios en los mismos paquetes. **Coste aceptado:** el paquete `exception` es transversal y lo comparten todos los módulos.
:::

::: java
Equivale a separar cada dominio en su propio módulo EJB dentro del EAR, pero sin la ceremonia: aquí son simples paquetes Java. Java no impide que un paquete importe otro, así que la frontera es una convención del equipo. Herramientas como ArchUnit o Spring Modulith permiten convertirla en una regla comprobada por las pruebas; el proyecto no las usa todavía.
:::

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| Un `@Service` o `@RestController` no se registra (404 en todos los *endpoints*, o `NoSuchBeanDefinitionException`) | La clase está fuera del paquete de la clase principal | Moverla bajo `com.albertoderafael.itmanager` |
| `Web server failed to start. Port 8080 was already in use` | Otra instancia del backend sigue arrancada | Pararla, o usar `server.port` para elegir otro puerto |
| Flyway no se ejecuta aunque está en el `pom.xml` | Solo se añadió `flyway-core`, sin `spring-boot-starter-flyway` | Usar el *starter* de Spring Boot 4 |
| `UnsupportedClassVersionError` al ejecutar | Se compila con Java 21 pero se ejecuta con una JVM anterior | Comprobar `java -version` y la variable `JAVA_HOME` |
| Una dependencia aparece con versión distinta a la esperada | Se fijó una versión a mano que contradice el BOM | Quitar la versión y dejar que la gestione el *parent* |

## Ejercicios

::: ejercicio Leer el informe de autoconfiguración
Arranca el backend con `--debug` (o con `debug=true` en la configuración) y localiza en el informe la autoconfiguración de `DataSource` y la de Flyway. Anota qué condición hizo que cada una se activara.
:::

::: ejercicio Romper el escaneo de componentes
En una rama de trabajo, mueve temporalmente `ApplicationController` a un paquete `com.albertoderafael.otro`. Arranca y llama a `GET /api/applications`. Explica el resultado y devuelve la clase a su sitio.
:::

::: preguntas
1. ¿Por qué no hace falta indicar la versión de Hibernate en el `pom.xml`?
2. ¿Qué tres anotaciones combina `@SpringBootApplication` y qué hace cada una?
3. ¿Qué ocurre en Spring Boot 4 si se declara `flyway-core` pero no `spring-boot-starter-flyway`?
4. Da dos ventajas de la inyección por constructor frente a `@Autowired` en atributos.
5. ¿Qué ventaja concreta tuvo organizar el código por módulo de negocio cuando llegó la fase 5?
:::
