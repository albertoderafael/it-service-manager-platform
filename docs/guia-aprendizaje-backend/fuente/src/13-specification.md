# Consultas dinámicas con `Specification`

<p class="lead">El listado de demandas admite tres filtros opcionales: aplicación, estado y prioridad. Con el enfoque del módulo de aplicaciones harían falta ocho métodos de repositorio. Este capítulo explica cómo se resolvió con la Criteria API de JPA envuelta en las <code>Specification</code> de Spring Data, y cómo se validan los parámetros del listado.</p>

## El problema de las combinaciones

En el capítulo 7, dos filtros opcionales producían cuatro ramas `if`, una por combinación. Con tres filtros son ocho, y con cuatro serían dieciséis. Cada combinación exige un método derivado con un nombre cada vez más largo, como `findByApplicationIdAndStatusAndPriority`. El enfoque no escala.

Lo que se necesita es **construir la consulta en tiempo de ejecución**, añadiendo una condición por cada filtro que venga informado. JPA ofrece para eso la Criteria API.

## La Criteria API en pocas palabras

La Criteria API construye consultas con objetos Java en lugar de con texto JPQL. Tiene cuatro piezas:

| Pieza | Qué representa | Equivalente en SQL |
|---|---|---|
| `CriteriaBuilder` | La fábrica de expresiones: `equal`, `and`, `like`, `conjunction`… | Los operadores |
| `CriteriaQuery<T>` | La consulta en construcción | La sentencia `SELECT` |
| `Root<T>` | La entidad raíz de la consulta | La tabla del `FROM` |
| `Predicate` | Una condición | Una expresión del `WHERE` |

Escrita directamente, una consulta con Criteria es bastante verbosa: hay que obtener el `CriteriaBuilder` del `EntityManager`, crear la consulta, el `Root`, los predicados, ejecutarla y, para paginar, construir aparte la consulta de recuento. Spring Data reduce todo eso a una sola idea: la **`Specification`**.

```java title="Spring Data JPA (simplificado)"
public interface Specification<T> {
    Predicate toPredicate(Root<T> root,
                          CriteriaQuery<?> query,
                          CriteriaBuilder criteriaBuilder);
}
```

Una `Specification` es **una condición reutilizable**: dada la raíz de la consulta y el constructor de expresiones, devuelve un predicado. Como es una interfaz funcional, se escribe con una *lambda*. Y se puede combinar con `and` y `or` para formar condiciones mayores. Spring Data se encarga de crear la consulta, aplicar la condición, la paginación y la ordenación, y de generar el recuento con la misma condición.

::: java
Si usaste la Criteria API en Java EE, todo esto te resultará familiar; la diferencia es que no escribes la consulta completa, solo la condición. Es parecido a componer `Predicate<T>` de `java.util.function`, con la diferencia de que una `Specification` no se evalúa en memoria: se traduce a SQL.
:::

## Filtrar el listado con `Specification` [paso 3.4]

El repositorio declara que acepta especificaciones extendiendo una segunda interfaz:

```java title="demand/repository/DemandRepository.java" estado="impl"
public interface DemandRepository extends JpaRepository<Demand, Long>,
        JpaSpecificationExecutor<Demand> {

    List<Demand> findByApplicationId(Long applicationId);
}
```

`JpaSpecificationExecutor` añade métodos como `findAll(Specification, Pageable)` y `count(Specification)`. El método derivado `findByApplicationId` lo usan las pruebas de integración.

El servicio construye la condición filtro a filtro. En el monolito, el filtro por aplicación navegaba por la asociación:

```java title="demand/service/DemandService.java · getDemands (monolito)" estado="reconstruido"
Specification<Demand> specification =
        (root, query, criteriaBuilder) ->
                criteriaBuilder.conjunction();

if (applicationId != null) {
    specification = specification.and(
            (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(
                            root.get("application").get("id"),
                            applicationId
                    )
    );
}

if (status != null) {
    specification = specification.and(
            (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("status"), status)
    );
}

if (priority != null) {
    specification = specification.and(
            (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("priority"), priority)
    );
}

Page<Demand> demands =
        demandRepository.findAll(specification, pageable);
```

::: reconstruido
La estructura (especificación inicial con `conjunction()`, un `and` por filtro, `findAll` paginado) es la del código final. Solo cambia la expresión del filtro por aplicación: en el código final es `root.get("applicationId")`, porque la entidad ya no tiene asociación (capítulo 18). En el monolito, con el atributo `application` de tipo `Application`, la expresión natural es la que se muestra.
:::

Lectura paso a paso:

1. **La especificación inicial** devuelve `criteriaBuilder.conjunction()`, un predicado que siempre es verdadero (una conjunción vacía). Sirve como elemento neutro: si no llega ningún filtro, la consulta devuelve todo; si llegan, cada `and` añade su condición a algo que ya existe. Las versiones recientes de Spring Data ofrecen también `Specification.unrestricted()` para lo mismo.
2. **Cada filtro informado añade un `and`**. Las *lambdas* no se ejecutan en ese momento; se guardan y Spring Data las evaluará al construir la consulta.
3. **`root.get("status")`** obtiene la ruta al atributo `status` de la entidad. Se escribe el nombre del **atributo Java**, no el de la columna.
4. **`root.get("application").get("id")`** navega por la asociación hasta el identificador. Hibernate sabe que el `id` de la aplicación es la propia columna `application_id` de `demands`, así que no necesita unir las tablas.
5. **`findAll(specification, pageable)`** ejecuta la consulta de la página y, cuando hace falta, la de recuento, ambas con la misma condición.

Con estado `OPEN` y prioridad `HIGH`, el SQL resultante es, en esencia:

```sql
select … from demands d1_0
where 1=1 and d1_0.status = ? and d1_0.priority = ?
order by d1_0.id
offset ? rows fetch first ? rows only
```

::: atencion Los nombres de atributo son cadenas
`root.get("status")` no se comprueba al compilar: un error de escritura falla al ejecutar la consulta, con `IllegalArgumentException` o una excepción de ruta inválida. Hibernate puede generar un **metamodelo estático** (clases como `Demand_` con atributos `Demand_.status`) que convierte esos nombres en constantes comprobadas por el compilador. El proyecto no lo usa; con tres filtros, las pruebas del listado cubren el riesgo.
:::

::: decision `Specification` para los filtros de demandas
**Motivo:** un único método de repositorio cubre cualquier combinación de filtros, añadir un cuarto filtro es añadir un bloque `if`, y la paginación y el recuento siguen funcionando igual. **Alternativas:** métodos derivados por combinación (no escala); una consulta `@Query` con condiciones del tipo `(:status is null or d.status = :status)`, que es compacta pero da planes de ejecución peores y, en PostgreSQL, problemas al inferir el tipo de un parámetro nulo; o Querydsl, potente pero con generación de código y una dependencia más. **Coste:** algo más de código que un método derivado y nombres de atributo como texto.
:::

## Validar estado, prioridad y ordenación [paso 3.5]

Antes de construir la consulta, el servicio valida sus parámetros, con el mismo patrón de listas blancas que el capítulo 10 describe para las aplicaciones:

```java title="demand/service/DemandService.java (extracto)" estado="impl"
private static final Set<String> VALID_STATUSES = Set.of(
        "OPEN",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED"
);

private static final Set<String> VALID_PRIORITIES = Set.of(
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
);

private void validateStatus(String status) {
    if (status != null && !VALID_STATUSES.contains(status)) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid demand status: " + status
        );
    }
}

private void validateSort(Sort sort) {
    for (Sort.Order order : sort) {
        if (!VALID_SORT_FIELDS.contains(order.getProperty())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid demand sort field: " + order.getProperty()
            );
        }
    }
}
```

El método `getDemands` empieza llamando a `validateStatus`, `validatePriority` y `validateSort`. Un parámetro inválido produce un 400 antes de tocar la base de datos.

### La lista de campos de ordenación en el monolito

En el monolito, la lista de campos ordenables incluía uno que no pertenece a la demanda: el **nombre de la aplicación**.

```java title="demand/service/DemandService.java · VALID_SORT_FIELDS (monolito)" estado="reconstruido"
private static final Set<String> VALID_SORT_FIELDS = Set.of(
        "id",
        "title",
        "priority",
        "status",
        "updatedAt",
        "application.name"
);
```

::: reconstruido
El código final tiene los cinco primeros campos. El sexto se deduce del documento `frontera-catalogo.md`, que afirma: «La API existente permite `sort=application.name`», y de una prueba final que comprueba precisamente que ese campo ahora se rechaza (capítulo 21). No es posible verificar si la lista del monolito tenía algún otro campo.
:::

Con `sort=application.name,asc`, Spring Data ve una propiedad anidada y añade a la consulta una **unión** con `applications` para poder ordenar por su columna `name`. La base de datos ordena todo el conjunto filtrado y después pagina. Funciona porque en el monolito las dos tablas están en la misma base de datos. Ese detalle, aparentemente menor, se convertirá en uno de los problemas centrales de la fase 5.

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| `Unable to locate Attribute with the given name [statuss]` | Nombre de atributo mal escrito en `root.get` | Corregirlo; valorar el metamodelo estático |
| `findAll(spec, pageable)` no existe en el repositorio | Falta extender `JpaSpecificationExecutor` | Añadir la interfaz |
| El filtro por aplicación no devuelve nada | Se compara con el nombre de la columna (`application_id`) en lugar del atributo | Usar nombres de atributos Java |
| La ordenación por un campo anidado duplica o pierde filas | La unión no es uno a uno | En `@ManyToOne` obligatoria no ocurre; revisar si la relación lo es |
| 400 `Invalid demand sort field` desde el frontend | El cliente pide un campo fuera de la lista | Alinear la lista del frontend con la del servidor |

## Ejercicios

::: ejercicio Un cuarto filtro
Diseña cómo añadirías un filtro opcional `text` que busque, sin distinguir mayúsculas, en el título de la demanda. Escribe la *lambda* de la especificación usando `criteriaBuilder.like` y `criteriaBuilder.lower`, y el SQL que esperas.
:::

::: ejercicio Ver el recuento
Con `show-sql` activado, pide `GET /api/demands?status=OPEN&size=1` cuando haya al menos dos demandas abiertas. Identifica las dos consultas y comprueba que ambas llevan la misma condición `WHERE`.
:::

::: preguntas
1. ¿Por qué el número de métodos derivados crece de forma combinatoria con los filtros opcionales?
2. ¿Qué devuelve `criteriaBuilder.conjunction()` y para qué se usa como especificación inicial?
3. ¿En qué momento se ejecutan las *lambdas* de una `Specification`?
4. ¿Qué interfaz debe extender un repositorio para aceptar especificaciones?
5. ¿Qué necesita la base de datos para ordenar por `application.name`, y por qué funcionaba en el monolito?
:::
