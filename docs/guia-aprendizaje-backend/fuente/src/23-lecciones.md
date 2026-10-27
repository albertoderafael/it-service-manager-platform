# Errores y lecciones aprendidas

<p class="lead">Un proyecto real no avanza en línea recta. Este capítulo reúne lo que salió mal, lo que costó más de lo previsto y los defectos que la revisión del código para esta guía ha encontrado. Para cada caso se indica de dónde sale la evidencia, para separar lo ocurrido de lo detectado después.</p>

## Recoger los errores [paso 6.4]

Los casos se agrupan en tres categorías:

- **Ocurrido:** hay constancia en los ficheros del proyecto de que pasó.
- **Detectado en la revisión:** está en el código actual y se ha encontrado al preparar la guía; puede que nadie lo haya sufrido todavía.
- **Trampa evitada:** un error habitual que el proyecto esquivó, y conviene saber por qué.

## Lo que ocurrió

### Un refactor entregado sin ver pasar las pruebas

El refactor de la frontera (pasos 5.2 a 5.6) se preparó en una copia de trabajo, con doce pruebas nuevas, pero la suite no pudo ejecutarse por problemas de acceso a los JAR de Maven en aquel entorno. El documento `verificacion-refactor.md` lo dejó escrito con honestidad: «No se ha obtenido un BUILD SUCCESS y no se afirma que las pruebas pasen».

::: leccion
Dejar constancia fue lo correcto. Lo que hay que añadir es la disciplina de tratarlo como **bloqueante**: las fases posteriores no deberían construirse sobre un cambio cuya suite no se ha visto pasar. Y un entorno en el que no se pueden ejecutar las pruebas es un problema que resolver antes de seguir, no una circunstancia que aceptar.
:::

### La copia pública con una migración distinta

La copia publicada en GitHub cambió el contenido de `V2__insert_initial_applications.sql` para usar datos ficticios. Es legítimo para una base de datos nueva, pero conectada a la base de datos original haría fallar la validación de Flyway. La guía de instalación lo advierte (capítulo 4).

::: leccion
Una migración aplicada es inmutable. Si se necesita una versión pública con datos distintos, lo más limpio es que los datos de ejemplo no formen parte de las migraciones versionadas (por ejemplo, un *script* aparte o una migración condicionada a un perfil de demostración).
:::

### Operaciones manuales sin registro

Dos operaciones de la fase 5 se hicieron a mano y no dejaron un procedimiento escrito: la creación de la base de datos `application_db` con su usuario, y el traslado de los datos de aplicaciones con un volcado de `pg_dump` (capítulo 19). Además, ese volcado, con datos reales, quedó en la carpeta raíz del proyecto de demandas.

::: leccion
Todo lo que cambia el estado de un entorno debería poder repetirse: un *script* de inicialización para la base de datos y unas líneas de documentación para el traslado. Los volcados de datos son artefactos temporales: deben excluirse del control de versiones y retirarse cuando cumplen su función.
:::

### Un cambio de contrato que el frontend no recibió

La separación eliminó la ordenación por nombre de aplicación (capítulo 21). El frontend seguía ofreciéndola, igual que la ordenación por fecha de creación, que el backend tampoco acepta. La guía del frontend lo detectó con una prueba que falla.

::: leccion
Separar servicios cambia contratos. Cualquier cambio que haga que una petición antes válida pase a ser rechazada debe tratarse como un cambio incompatible: anunciarse, coordinarse con los clientes y, si es posible, detectarse automáticamente con pruebas de contrato.
:::

## Lo detectado en la revisión del código

| # | Defecto | Dónde | Riesgo | Capítulo |
|---|---|---|---|---|
| 1 | La llamada HTTP al catálogo ocurre dentro de una transacción abierta | `DemandService` | Agotar el *pool* de conexiones si el catálogo va lento | 20 |
| 2 | Un 4xx del catálogo distinto de 404 se relanza sin traducir | `RestApplicationCatalog` | El cliente recibe un 500 con otro formato | 20 |
| 3 | Una aplicación ausente hace fallar la página entera | `DemandService.getDemands` | Una referencia rota impide ver todo el listado | 18 |
| 4 | La configuración por defecto apunta al 5432, pero el contenedor se publica en el 5433 | `application.properties` | `Connection refused` sin el perfil `docker` | 3 |
| 5 | Dos clases distintas de Testcontainers para el mismo contenedor | Pruebas de demandas | Mantenimiento; una de ellas está obsoleta | 16 |
| 6 | Una prueba «relee» de la base de datos sin vaciar el contexto | `ApplicationIntegrationTest` | Comprueba valores en memoria, no en PostgreSQL | 19 |
| 7 | No hay pruebas de las transiciones hacia `CANCELLED` | `DemandTest` | Una regla de negocio sin red de seguridad | 12 |
| 8 | No hay prueba del tiempo máximo de lectura | `RestApplicationCatalogTest` | El escenario más peligroso no está cubierto | 20 |
| 9 | Excepciones sin manejador (parámetro ausente, error de integridad, genéricas) | `GlobalExceptionHandler` | Respuestas con otro formato o 500 opacos | 10 |
| 10 | Mensajes de error en dos idiomas | Servicios y manejador | Incoherencia en la API | 10 |
| 11 | Los valores válidos de estados y prioridades se repiten como texto en varios sitios | DTO, servicios, frontend | Un valor nuevo hay que añadirlo en varios lugares | 8 |
| 12 | `import java.time.Duration` duplicado, un `import` sin usar y sangría mezclada | `RestApplicationCatalog` | Ninguno funcional; síntoma de código copiado sin repasar | 20 |

::: proyecto Estado tras el cierre del 26 de octubre de 2026
Los defectos **1, 2, 3, 4 y 12 están resueltos**: la llamada al catálogo se hace fuera de la transacción, cualquier respuesta inesperada del catálogo se traduce a 502, una aplicación ausente ya no tumba el listado ni el detalle, la configuración por defecto apunta al puerto del contenedor y el adaptador está limpio. El **9** está resuelto con un manejador de último recurso y otro para parámetros ausentes. El **10** queda mitigado: el frontend ya no muestra los textos técnicos de los errores 5xx, sino mensajes propios en español. Siguen pendientes el 5, el 6, el 7, el 8 y el 11. Los detalles están en el capítulo 25.
:::

El defecto 12 merece un comentario aunque no tenga consecuencias: Java permite repetir una importación idéntica y un `import` sin usar solo provoca un aviso. Pero son señales de que un fichero se montó a partir de fragmentos y no se revisó al final. Un formateador automático y el análisis estático del IDE (o herramientas como Checkstyle o SpotBugs en el *build*) lo habrían detectado.

::: leccion La regla que más defectos habría evitado
Los defectos 1, 2 y 3 tienen la misma raíz: el código del servicio de demandas se escribió cuando el catálogo era una llamada local, y siguió igual cuando pasó a ser remota. El adaptador cambió, pero las **suposiciones** del código que lo usa (que la llamada es rápida, que siempre responde, que nunca falta un dato) no se revisaron. Al cambiar la implementación de un puerto por una remota, hay que revisar también a sus consumidores.
:::

## Trampas evitadas

| Trampa | Cómo se evitó | Capítulo |
|---|---|---|
| Esquemas distintos en cada máquina con `ddl-auto=update` | Flyway + `validate` | 3, 4 |
| Consultas ocultas al serializar con *Open Session in View* | `open-in-view=false` y DTO construidos en el servicio | 3, 7 |
| Exponer entidades en la API | DTO por operación con *records* | 8 |
| Serializar `PageImpl` | DTO de página propio | 9 |
| Asociaciones `EAGER` por defecto | `LAZY` + grafo de entidad en el listado | 12, 14 |
| Un N+1 al pasar a HTTP | Consulta por lotes preparada antes de la red | 18 |
| Ordenar páginas en memoria | Retirar la funcionalidad antes que dar resultados incorrectos | 18, 21 |
| Responder 404 cuando el catálogo está caído | Distinguir 404 de 503 | 20 |
| Llamadas remotas sin límite de tiempo | Tiempos máximos de conexión y lectura | 20 |
| Pruebas contra H2 que no detectan fallos de PostgreSQL | Testcontainers con PostgreSQL 18 | 16 |
| Base de datos compartida entre servicios | Una base de datos y un usuario por servicio | 19 |
| Una gran migración «*big bang*» | Pasos pequeños y reversibles | 17 |

## Las lecciones, en una página

1. **La frontera primero, la red después.** Separar dentro del monolito (puerto, referencia escalar, lotes) hizo que la llegada de HTTP fuera un cambio local.
2. **Pasos pequeños, cada uno funcionando.** Lo irreversible (borrar la clave foránea y la tabla) va al final, cuando todo lo demás está probado.
3. **Cada dato, un solo dueño.** Una copia sin dueño es una fuente de errores, aunque hoy coincida.
4. **Errores honestos.** «No existe» y «no puedo saberlo» son respuestas distintas y deben llegar distintas al cliente.
5. **Las pruebas fijan decisiones.** `verify(…, never()).save(…)` o «el catálogo empieza vacío» convierten una decisión en algo que no se puede deshacer sin darse cuenta.
6. **Ver pasar la suite es parte del trabajo.** Un cambio con pruebas sin ejecutar no está terminado.
7. **Lo manual también se versiona.** Bases de datos, usuarios y traslados de datos necesitan un *script* o, como mínimo, un documento.
8. **Al cambiar una implementación por otra remota, revisa a los que la usan.** Tiempos, transacciones y datos ausentes cambian de naturaleza.

## Ejercicios

::: ejercicio Priorizar los defectos
Ordena los doce defectos de la tabla por la combinación de probabilidad e impacto en un entorno con usuarios reales. Justifica los tres primeros y propón, para cada uno, la prueba automática que lo detectaría.
:::

::: ejercicio Arreglar la relectura
Reescribe la parte final de `shouldCreateAndUpdateApplicationInPostgreSQL` para que la relectura venga realmente de PostgreSQL. Indica qué tienes que inyectar en la prueba y en qué línea exacta va el cambio.
:::

::: preguntas
1. ¿Qué tienen en común los defectos 1, 2 y 3 de la tabla?
2. ¿Por qué el traslado manual de datos se considera un error si funcionó?
3. ¿Qué tipo de prueba habría detectado el cambio de contrato con el frontend?
4. ¿Qué herramientas habrían señalado los problemas del defecto 12?
5. De las ocho lecciones finales, ¿cuál habría evitado el problema del refactor sin ejecutar?
:::
