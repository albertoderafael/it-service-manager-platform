# Carga perezosa y el problema N+1

<p class="lead">Cada demanda del listado muestra el nombre de su aplicación. Con una asociación perezosa, ese detalle inocente puede multiplicar el número de consultas. Este capítulo explica el problema N+1, por qué la configuración del proyecto lo hace visible y cómo lo resolvió el monolito con <code>@EntityGraph</code>.</p>

## Cómo aparece el problema

La respuesta de cada demanda incluye `applicationName`. En el monolito, el servicio lo obtenía navegando por la asociación:

```java title="demand/service/DemandService.java · toResponse (monolito)" estado="reconstruido"
private DemandResponse toResponse(Demand demand) {
    return new DemandResponse(
            demand.getId(),
            demand.getTitle(),
            demand.getDescription(),
            demand.getPriority(),
            demand.getStatus(),
            demand.getApplication().getId(),
            demand.getApplication().getName(),
            demand.getCreatedAt(),
            demand.getUpdatedAt()
    );
}
```

::: reconstruido
El DTO `DemandResponse` y el orden de sus campos son los del código final. En el monolito, el `id` y el nombre de la aplicación salían de la asociación; en la versión final salen del catálogo (capítulo 18).
:::

Supón una página de diez demandas que pertenecen a diez aplicaciones distintas. Con la asociación perezosa y sin nada más, ocurre esto:

1. `findAll(specification, pageable)` ejecuta **una** consulta y devuelve diez demandas. En el atributo `application` de cada una hay un proxy que solo conoce el `id`.
2. `Page.map(this::toResponse)` recorre las diez demandas.
3. En la primera, `getApplication().getName()` despierta el proxy, que ejecuta un `SELECT` de esa aplicación.
4. Lo mismo en la segunda, la tercera… hasta la décima.

Total: **1 + 10 consultas**. Para una página de *N* elementos, *N + 1*. De ahí el nombre.

```sql title="Lo que muestra show-sql (esquema)"
select … from demands d1_0 where … order by d1_0.id offset ? rows fetch first ? rows only
select … from applications a1_0 where a1_0.id=?   -- demanda 1
select … from applications a1_0 where a1_0.id=?   -- demanda 2
…                                                  -- hasta 10 veces
```

El contexto de persistencia suaviza el problema, pero no lo elimina: si varias demandas pertenecen a la misma aplicación, el segundo acceso encuentra la aplicación ya cargada y no vuelve a la base de datos (capítulo 5). Así que el número real de consultas extra es el **número de aplicaciones distintas** de la página. Con dos aplicaciones en el catálogo, como en los datos iniciales, apenas se nota; con cientos, sí.

## Por qué la configuración del proyecto lo hace visible

En una aplicación con `open-in-view=true` (el valor por defecto de Spring Boot), el problema puede pasar completamente desapercibido: si la entidad llegara hasta Jackson, la serialización despertaría los proxies sin que nadie lo viera en el código.

El proyecto lo hace visible por dos lados:

- Con **`open-in-view=false`**, cualquier acceso perezoso fuera de la transacción falla con `LazyInitializationException`. Eso obliga a construir el DTO dentro del servicio, donde está claro qué datos se tocan.
- Con **`show-sql=true`**, las consultas repetidas aparecen en la consola en cuanto se pide un listado.

Dentro de la transacción de solo lectura de `getDemands`, el acceso perezoso funciona, así que no hay error: hay consultas de más. El N+1 es un problema de rendimiento, no de corrección, y por eso hay que buscarlo activamente.

## Resolverlo con `@EntityGraph` [paso 3.6]

Un **grafo de entidad** indica a JPA qué asociaciones cargar junto con la entidad principal **en la misma consulta**. Spring Data permite declararlo sobre un método del repositorio con `@EntityGraph`. El monolito lo aplicó a la consulta del listado:

```java title="demand/repository/DemandRepository.java (monolito)" estado="reconstruido"
public interface DemandRepository extends JpaRepository<Demand, Long>,
        JpaSpecificationExecutor<Demand> {

    @Override
    @EntityGraph(attributePaths = "application")
    Page<Demand> findAll(Specification<Demand> specification,
                         Pageable pageable);
}
```

::: reconstruido
El documento `frontera-catalogo.md` menciona «la prueba que verificaba el antiguo EntityGraph», lo que confirma que el monolito usaba `@EntityGraph` sobre la asociación con `Application`. La forma concreta (redeclarar `findAll` de `JpaSpecificationExecutor` con `attributePaths`) es la habitual en Spring Data para este caso, pero no se conserva el fichero original.
:::

Al redeclarar el método heredado con la anotación, Spring Data aplica el grafo a la consulta de datos. Hibernate añade una unión con `applications` y rellena la asociación con objetos reales en lugar de proxies:

```sql title="Con el grafo de entidad (esquema)"
select d1_0.id, …, a1_0.id, a1_0.name, …
from demands d1_0
join applications a1_0 on a1_0.id = d1_0.application_id
where … order by d1_0.id
offset ? rows fetch first ? rows only
```

Una consulta para los datos de la página (más el recuento, cuando hace falta), sea cual sea el número de demandas.

### Por qué aquí se puede paginar con una unión

Unir y paginar a la vez es seguro en este caso porque la asociación es **a uno**: cada demanda tiene exactamente una aplicación, así que la unión no multiplica las filas y `OFFSET … FETCH` sigue contando demandas.

Con una asociación **a muchos** sería distinto. Si se cargara, por ejemplo, una colección de comentarios de cada demanda, cada demanda aparecería tantas veces como comentarios, y Hibernate no podría paginar en SQL: traería todas las filas y paginaría en memoria, con un aviso en el *log*. Para colecciones, la técnica adecuada es otra (carga por lotes, o dos consultas).

::: nota El recuento no lleva el grafo
Spring Data no aplica el grafo de entidad a la consulta de recuento: para contar demandas no hace falta cargar aplicaciones. El `count` sigue siendo una consulta simple sobre `demands`.
:::

## Comprobar que el problema no vuelve

El problema N+1 es fácil de reintroducir sin darse cuenta: basta con que alguien quite la anotación o añada otro acceso perezoso. Por eso el monolito tenía una prueba que lo verificaba:

```java title="DemandIntegrationTest.java · prueba del grafo (monolito)" estado="reconstruido"
@Test
void shouldLoadApplicationWithTheDemandPage() {

    // … guardar una demanda asociada a una aplicación,
    //     flush() y clear() para vaciar el contexto

    Page<Demand> result = demandRepository.findAll(
            (root, query, cb) -> cb.conjunction(),
            PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "id")));

    Demand loaded = result.getContent().getFirst();

    PersistenceUnitUtil util = entityManager.getEntityManagerFactory()
            .getPersistenceUnitUtil();

    assertTrue(util.isLoaded(loaded, "application"));
}
```

::: reconstruido
Se conserva la versión adaptada de esta prueba, `shouldLoadApplicationIdWithoutAnEntityAssociation` (capítulo 21): guarda una demanda, vacía el contexto con `clear()`, la recupera con `findAll` y una especificación neutra ordenada por `id` descendente, y comprueba el identificador de aplicación. La comprobación de carga con `PersistenceUnitUtil.isLoaded` es una forma estándar de verificar un grafo de entidad; no puede asegurarse que la prueba original usara exactamente esta técnica.
:::

La clave está en `clear()`: si la aplicación siguiera en el contexto de persistencia de la prueba, la asociación estaría cargada aunque el grafo no funcionara. Vaciar el contexto obliga a que la carga dependa solo de la consulta.

## Otras formas de evitar el N+1

| Técnica | Cómo funciona | Cuándo encaja |
|---|---|---|
| `@EntityGraph` | Une y carga las asociaciones indicadas en la misma consulta | Asociaciones a uno en consultas concretas (la elegida) |
| `JOIN FETCH` en `@Query` | Lo mismo, escrito en JPQL | Consultas fijas; con paginación exige escribir también el `countQuery` |
| Carga por lotes (`hibernate.default_batch_fetch_size` o `@BatchSize`) | Al despertar un proxy, Hibernate carga de golpe los de todas las entidades pendientes con `IN (…)` | Colecciones y casos generales; convierte N+1 en 1 + N/lote |
| Proyección a DTO | La consulta devuelve directamente los campos de la respuesta, sin entidades | Listados de solo lectura muy grandes |
| Consulta por lote explícita | Reunir los identificadores de la página y pedirlos todos de una vez | Cuando los datos asociados están en otro sitio (la técnica de la fase 5) |

La última fila es la que el proyecto acabaría usando en la fase 5, cuando las aplicaciones dejaron de estar en la misma base de datos: no se puede hacer una unión con una tabla que está en otro servicio, pero sí se puede pedir de una vez todo lo que la página necesita.

::: decision `@EntityGraph` en la consulta del listado
**Motivo:** resuelve el problema exactamente donde aparece, sin cambiar el modelo ni escribir JPQL, y sigue funcionando con `Specification` y paginación. **Alternativas:** carga por lotes global, que habría reducido el problema en toda la aplicación pero sin eliminarlo; o proyecciones a DTO, que habrían duplicado la lógica de los filtros.
:::

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| Un listado de *N* elementos ejecuta *N + 1* consultas | Acceso perezoso a una asociación en un bucle | Grafo de entidad, `JOIN FETCH` o carga por lotes |
| `@EntityGraph` no tiene efecto | Se anotó un método distinto del que llama el servicio | Redeclarar exactamente la firma usada |
| Aviso `HHH90003004: firstResult/maxResults specified with collection fetch; applying in memory` | Se unió una colección y se paginó | No cargar colecciones con unión en consultas paginadas |
| La prueba del grafo pasa aunque se quite la anotación | El contexto de persistencia ya tenía la entidad | Llamar a `flush()` y `clear()` antes de la consulta |

## Ejercicios

::: ejercicio Contar consultas con estadísticas de Hibernate
Activa temporalmente `spring.jpa.properties.hibernate.generate_statistics=true` y observa en el *log* el número de sentencias JDBC por petición al pedir un listado de demandas. Explica cómo usarías esta información en una prueba automática que detecte el N+1.
:::

::: ejercicio Calcular el coste real
Una página de 20 demandas pertenece a 4 aplicaciones distintas. Calcula cuántas consultas se ejecutarían sin grafo de entidad, con grafo de entidad, y con carga por lotes de tamaño 10. Ten en cuenta el recuento y la caché del contexto de persistencia.
:::

::: preguntas
1. ¿Por qué el problema se llama N+1, y de qué depende el número real de consultas extra?
2. ¿Cómo contribuyen `open-in-view=false` y `show-sql=true` a detectar el problema?
3. ¿Qué hace `@EntityGraph(attributePaths = "application")`?
4. ¿Por qué es seguro paginar con una unión a una asociación `@ManyToOne` y no a una colección?
5. ¿Por qué una prueba que verifique el grafo debe llamar a `clear()` antes de consultar?
:::
