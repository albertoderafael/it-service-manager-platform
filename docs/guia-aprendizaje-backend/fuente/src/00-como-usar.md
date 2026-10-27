<p class="lead">Esta guía cuenta, en el orden en que ocurrió, cómo se construyó el backend de <b>IT Service &amp; Demand Manager</b>: primero un monolito Spring Boot con los módulos de aplicaciones y demandas, y después su evolución hacia dos servicios independientes. Cada paso se explica con el código real de los proyectos y con el razonamiento que lo justifica.</p>

## A quién va dirigida

Está escrita para un ingeniero con años de experiencia en Java EE sobre servidores de aplicaciones como WebSphere: alguien que conoce EJB, JPA gestionado por el contenedor, JNDI, JAX-RS y las transacciones JTA, pero que no ha trabajado con Spring Boot moderno. Por eso no se explica qué es una transacción o una clave foránea, pero sí cómo Spring decide cuándo empieza una transacción, qué hace Hibernate al terminarla o por qué una prueba arranca su propio PostgreSQL en Docker.

El tono es el de un arquitecto que acompaña a otro ingeniero: se cuentan las decisiones, las alternativas que se descartaron y también los errores.

## Cómo está organizada

La guía tiene dos bloques que se complementan:

| Bloque | Qué contiene | Para qué sirve |
|---|---|---|
| **I. Mapa cronológico** | Todos los pasos del desarrollo, una línea por paso, agrupados en siete fases | Ver el recorrido completo de un vistazo y saltar a cualquier punto |
| **II. Desarrollo explicado** | Un capítulo o más por fase, con el código, los conceptos y las decisiones | Entender cada paso a fondo |

Las siete fases siguen el orden real del proyecto, y ese orden no se rompe en ningún capítulo:

| Fase | Contenido | Capítulos |
|---|---|---|
| 1. Concepción y preparación | Spring Boot 4, PostgreSQL en Docker, configuración y Flyway | 2-4 |
| 2. El módulo Application | Entidad, repositorio, servicio, DTO, controlador, errores y pruebas | 5-11 |
| 3. El módulo Demand | Relación con Application, ciclo de vida, consultas dinámicas y N+1 | 12-15 |
| 4. El monolito terminado | Revisión del conjunto y del acoplamiento entre módulos | 16 |
| 5. Evolución a dos microservicios | Puertos y adaptadores, nuevo servicio, cliente HTTP y separación de bases de datos | 17-21 |
| 6. Validación y pendientes | Puesta en marcha, comparación, lecciones aprendidas y próximos pasos | 22-24 |
| 7. Cierre y despliegue con Docker | Corrección de los defectos, Actuator, imágenes, Docker Compose y nginx | 25-27 |

Mientras se explica el monolito (fases 1 a 4) no aparece ningún elemento de la arquitectura de microservicios: ni el puerto 8081, ni `RestClient`, ni las migraciones V4 y V5. Todo eso llega en la fase 5, igual que llegó en el proyecto.

Cinco anexos completan la guía: **A**, soluciones de los ejercicios y respuestas de autoevaluación; **B**, glosario; **C**, equivalencias entre Java EE y Spring Boot; **D**, chuleta de comandos; y **E**, mapa comentado de los ficheros de los tres proyectos.

## Las fuentes y su grado de certeza

La guía se basa en tres fuentes, todas leídas sin modificarlas:

1. **El repositorio publicado en GitHub** (`it-service-demand-manager`): la primera versión del monolito, solo con el módulo de aplicaciones. Es la foto de la fase 2.
2. **`C:\Workspace\it-service-manager`**: el servicio de demandas en su estado actual (puerto 8080), con las migraciones V1 a V5 y documentos de trabajo del refactor.
3. **`C:\Workspace\application-catalog-service`**: el servicio del catálogo de aplicaciones (puerto 8081).

Los proyectos locales no conservan historial de Git, así que algunos estados intermedios del monolito ya no existen en ningún fichero. Cuando la guía necesita mostrarlos, el código se **reconstruye** a partir de los documentos del propio proyecto, de las pruebas que los verificaban y del código final, y se marca siempre como tal.

## Las marcas de estado

Cada fragmento de código y cada afirmación relevante llevan una marca que indica su situación:

| Marca | Significado |
|---|---|
| {{impl}} | Código que existe tal cual en alguno de los proyectos |
| {{despues}} | Existe, pero se incorporó más tarde que el paso que se está explicando |
| {{refactor}} | Código que cambió de forma respecto a una versión anterior que también se explica |
| {{final}} | Estado del código al cerrar la fase en la que se explica: la fase 5 en los capítulos 17 a 21 y la fase 7 en los capítulos 25 a 27. Cuando la fase 7 cambió algo marcado así, el capítulo original lo indica |
| {{reconstruido}} | Estado intermedio que ya no existe; se reconstruye y no debe tomarse como copia literal |
| {{pendiente}} | Algo que no está hecho y se propone como trabajo futuro |

## Cómo está construido cada capítulo

1. **Qué se hizo**, con el paso del mapa al que corresponde.
2. **Cómo funciona por dentro**: lo justo para que Spring, Hibernate o PostgreSQL dejen de ser una caja negra.
3. **El código del proyecto**, con el fichero de origen y su marca de estado sobre cada bloque.
4. **Decisión y alternativas**: por qué se hizo así y qué se descartó.
5. **Errores típicos y depuración**.
6. **Ejercicios** y **autoevaluación**, con las soluciones en el anexo A.

## Los recuadros

::: java
Relaciona el concepto con su equivalente en Java EE o WebSphere y señala dónde deja de funcionar la analogía.
:::

::: proyecto
Señala exactamente dónde y cómo aparece el concepto en los proyectos.
:::

::: decision
Recoge una decisión tomada, el motivo y las alternativas valoradas.
:::

::: atencion
Avisa de un error habitual o de una trampa de la herramienta.
:::

::: leccion
Algo que salió mal o que costó más de lo previsto, y lo que enseña.
:::

::: reconstruido
Explica de dónde sale un fragmento reconstruido y qué grado de fidelidad tiene.
:::

::: pendiente
Trabajo que queda por hacer.
:::

## Cómo moverte por el PDF

- **Índice enlazado.** Cada fase, capítulo y sección del índice es un enlace a su página, y junto a cada título hay un enlace **↑ Índice** que devuelve a su entrada.
- **Mapa ↔ desarrollo.** Cada paso del mapa cronológico enlaza con la sección que lo desarrolla, y esa sección tiene junto a su título un enlace **Paso n.m ↖** que vuelve a su línea del mapa.
- **Índice de capítulo.** Cada capítulo empieza con la lista enlazada de sus secciones.
- **Ejercicios y soluciones.** Cada ejercicio enlaza con su solución y cada solución con su ejercicio; lo mismo ocurre con la autoevaluación.
- **Marcadores.** El panel de marcadores del lector muestra la estructura completa.

## Cómo sacarle el máximo partido

Lee con los dos proyectos abiertos en el IDE y con Docker arrancado. Los ejercicios proponen cambios sobre una **copia** o una rama de trabajo: nunca sobre la base de datos con datos reales ni sobre el volumen persistente de PostgreSQL.

::: atencion Seguridad
Ningún fragmento de la guía contiene credenciales reales. Donde la configuración usa contraseñas, aparecen como variables de entorno (`${DB_PASSWORD}`). No copies contraseñas en ficheros versionados ni en los comandos de los ejercicios.
:::

::: nota Versiones
La guía describe el proyecto en octubre de 2026: Java 21, Spring Boot 4.1.1 (Spring Framework 7, Spring Data JPA 4, Hibernate 7), PostgreSQL 18 en Docker, Flyway, JUnit 5, Mockito y Testcontainers 2. Los conceptos son estables; los nombres de algunos módulos han cambiado entre Spring Boot 3 y 4, y se señalan donde importa.
:::
