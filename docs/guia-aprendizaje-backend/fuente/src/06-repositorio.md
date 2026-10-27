# Repositorios de Spring Data

<p class="lead">El acceso a datos del módulo de aplicaciones es una interfaz de doce líneas sin ninguna implementación escrita a mano. Este capítulo explica cómo Spring Data la convierte en código ejecutable, qué métodos hereda y cómo funciona la paginación por dentro.</p>

## `ApplicationRepository` [paso 2.2]

```java title="application/repository/ApplicationRepository.java" estado="impl"
public interface ApplicationRepository extends JpaRepository<Application, Long> {

    Page<Application> findByStatus(
            String status,
            Pageable pageable);

    Page<Application> findByCriticality(
            String criticality,
            Pageable pageable);

    Page<Application> findByStatusAndCriticality(
            String status,
            String criticality,
            Pageable pageable);
}
```

La interfaz declara dos cosas: que gestiona entidades `Application` cuyo identificador es `Long` (los parámetros genéricos de `JpaRepository`) y tres consultas adicionales para los filtros del listado. Con eso, el servicio puede buscar por `id`, listar con paginación, guardar, contar, filtrar por estado, por criticidad o por ambos.

::: java
En Java EE esto habría sido un DAO: una interfaz, una clase `@Stateless` con un `EntityManager` inyectado con `@PersistenceContext` y un método por consulta, cada uno con su JPQL y su `TypedQuery`. Spring Data elimina esa clase: la implementación se genera al arrancar.
:::

## La jerarquía de `JpaRepository`

`JpaRepository` no es una interfaz aislada; reúne varias capas, cada una con un grupo de operaciones.

<figure>
<svg viewBox="0 0 680 270" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="m6" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker></defs>
  <g text-anchor="middle">
    <rect x="260" y="10" width="160" height="34" rx="6" fill="#f8fafc" stroke="#94a3b8"/><text x="340" y="25" font-weight="700">Repository&lt;T, ID&gt;</text><text x="340" y="38" font-size="8.5" fill="#475569">marcador, sin métodos</text>
    <rect x="80" y="75" width="190" height="34" rx="6" fill="#f8fafc" stroke="#94a3b8"/><text x="175" y="90" font-weight="700">CrudRepository</text><text x="175" y="103" font-size="8.5" fill="#475569">save, findById, delete, count…</text>
    <rect x="410" y="75" width="190" height="34" rx="6" fill="#f8fafc" stroke="#94a3b8"/><text x="505" y="90" font-weight="700">PagingAndSortingRepository</text><text x="505" y="103" font-size="8.5" fill="#475569">findAll(Pageable), findAll(Sort)</text>
    <rect x="80" y="140" width="190" height="34" rx="6" fill="#f8fafc" stroke="#94a3b8"/><text x="175" y="155" font-weight="700">ListCrudRepository</text><text x="175" y="168" font-size="8.5" fill="#475569">devuelve List en lugar de Iterable</text>
    <rect x="410" y="140" width="190" height="34" rx="6" fill="#f8fafc" stroke="#94a3b8"/><text x="505" y="155" font-weight="700">ListPagingAndSortingRepository</text><text x="505" y="168" font-size="8.5" fill="#475569">findAll(Sort) como List</text>
    <rect x="245" y="205" width="190" height="34" rx="6" fill="#0b1220"/><text x="340" y="220" font-weight="700" fill="#fff">JpaRepository&lt;T, ID&gt;</text><text x="340" y="233" font-size="8.5" fill="#a5f3fc">flush, saveAndFlush, lotes, getReferenceById</text>
    <rect x="490" y="215" width="170" height="34" rx="6" fill="#f8fafc" stroke="#94a3b8"/><text x="575" y="230" font-weight="700">QueryByExampleExecutor</text><text x="575" y="243" font-size="8.5" fill="#475569">consultas por ejemplo</text>
    <rect x="245" y="250" width="190" height="16" rx="4" fill="#ecfeff" stroke="#67e8f9"/><text x="340" y="262" font-size="8.5" font-weight="700" fill="#0e7490">ApplicationRepository</text>
  </g>
  <g stroke="#64748b" stroke-width="1.2" fill="none">
    <line x1="175" y1="75" x2="300" y2="45" marker-end="url(#m6)"/>
    <line x1="505" y1="75" x2="380" y2="45" marker-end="url(#m6)"/>
    <line x1="175" y1="140" x2="175" y2="110" marker-end="url(#m6)"/>
    <line x1="505" y1="140" x2="505" y2="110" marker-end="url(#m6)"/>
    <line x1="300" y1="205" x2="200" y2="175" marker-end="url(#m6)"/>
    <line x1="380" y1="205" x2="480" y2="175" marker-end="url(#m6)"/>
    <line x1="435" y1="222" x2="488" y2="230" marker-end="url(#m6)"/>
  </g>
</svg>
<figcaption><b>Figura 6.1.</b> Jerarquía de interfaces de Spring Data. Las flechas apuntan a la interfaz que se extiende. <code>ApplicationRepository</code> hereda todos los métodos.</figcaption>
</figure>

| Interfaz | Métodos que usa el proyecto |
|---|---|
| `CrudRepository` / `ListCrudRepository` | `findById`, `save`, `findAllById` |
| `PagingAndSortingRepository` | `findAll(Pageable)` |
| `JpaRepository` | `saveAndFlush`, `flush` (en las pruebas) |

`PagingAndSortingRepository` ya no extiende `CrudRepository`, como ocurría en versiones antiguas; por eso `JpaRepository` combina las dos ramas. En el día a día da igual: basta con extender `JpaRepository`.

## Cómo se genera la implementación

Al arrancar, Spring Data busca las interfaces que extienden `Repository` y, para cada una, crea un **proxy dinámico**. El proxy delega los métodos heredados en una clase real, **`SimpleJpaRepository`**, que contiene el código JPA de siempre. Los métodos que el desarrollador añade, como `findByStatus`, se analizan y se convierten en consultas (siguiente sección).

Conviene conocer tres detalles de `SimpleJpaRepository`:

1. **Es transaccional por sí misma.** La clase lleva `@Transactional(readOnly = true)` y los métodos de escritura, como `save`, sobrescriben esa anotación con una transacción de escritura. Si el servicio ya tiene una transacción abierta, el repositorio **se une a ella** (propagación `REQUIRED`).
2. **`save` decide entre `persist` y `merge`.** Si la entidad es nueva (su `id` es `null`), llama a `entityManager.persist`; si no, a `entityManager.merge`. `merge` copia el estado de un objeto sobre la entidad gestionada y devuelve **otra instancia**: la gestionada. Por eso se recomienda usar siempre el valor devuelto por `save`.
3. **`findById` es `entityManager.find`.** Consulta primero el contexto de persistencia y solo va a la base de datos si no encuentra la entidad (capítulo 5).

::: atencion `save` sobre una entidad gestionada no hace nada útil
Llamar a `save` con una entidad que ya está gestionada no provoca ningún SQL adicional: el `UPDATE` llegará igualmente en el *flush*. No es un error, pero transmite una idea equivocada de cómo funciona JPA. El capítulo 7 explica por qué el servicio no lo llama al modificar.
:::

## Consultas derivadas del nombre del método

Spring Data analiza el nombre de cada método añadido y construye la consulta a partir de él:

```text
findByStatusAndCriticality(String status, String criticality, Pageable pageable)
│    │ └─────┬────┘└────┬────┘
│    │   propiedad   propiedad      → where a.status = ?1 and a.criticality = ?2
│    └── By: empieza el criterio
└─────── find: consulta de lectura
```

El análisis ocurre **al arrancar**. Si el nombre hace referencia a una propiedad que no existe en la entidad (`findByStatuss`), la aplicación no arranca, con un mensaje que nombra la propiedad desconocida. Es otra comprobación temprana, como la validación del esquema.

Las palabras clave admitidas son muchas (`Containing`, `Between`, `IgnoreCase`, `OrderBy`…). La regla práctica es que un nombre derivado está bien mientras se lea con facilidad. Cuando se necesitan tres o más criterios opcionales, el número de métodos crece de forma combinatoria; el capítulo 13 muestra cómo lo resolvió el módulo de demandas.

## La paginación por dentro

Los tres métodos reciben un `Pageable` y devuelven un `Page`. `Pageable` describe qué página se quiere: número de página (empezando en cero), tamaño y ordenación. `Page` contiene los elementos de esa página **y** los metadatos: número total de elementos y de páginas.

Para construir ese resultado, Spring Data ejecuta **dos consultas**:

```sql
-- 1. Los datos de la página
select a1_0.id, a1_0.criticality, a1_0.description, a1_0.name, a1_0.status
from applications a1_0
where a1_0.status = ?
order by a1_0.id
offset ? rows fetch first ? rows only

-- 2. El recuento, para calcular totalElements y totalPages
select count(a1_0.id) from applications a1_0 where a1_0.status = ?
```

Spring Data omite la segunda consulta cuando puede deducir el total sin ella: por ejemplo, si la primera página devuelve menos elementos que el tamaño pedido, el total es exactamente ese número.

::: nota `Page` frente a `Slice`
Si la interfaz no necesita saber cuántas páginas hay (un *scroll* infinito, por ejemplo), un método puede devolver `Slice` en lugar de `Page`. `Slice` pide un elemento más de los necesarios para saber si hay página siguiente y se ahorra el `count`, que en tablas muy grandes puede ser la consulta más cara. El frontend del proyecto muestra el total de registros, así que usa `Page`.
:::

## Otras formas de consultar

| Técnica | Cuándo usarla | En el proyecto |
|---|---|---|
| Consulta derivada | Pocos criterios, nombre legible | Aplicaciones |
| `@Query("select a from Application a where …")` | Consultas fijas que no caben en un nombre | No se usa |
| `Specification` (Criteria API) | Criterios opcionales que se combinan en tiempo de ejecución | Demandas (capítulo 13) |
| `EntityManager` directo | Casos especiales que Spring Data no cubre | No se usa |

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| `No property 'statuss' found for type 'Application'` al arrancar | Error de escritura en el nombre de un método derivado | Corregir el nombre |
| `No qualifying bean of type 'ApplicationRepository'` | La interfaz está fuera del paquete escaneado o no extiende `Repository` | Revisar paquete y herencia |
| La página siempre tiene 20 elementos aunque se pida otro tamaño | El parámetro de la URL no se llama `size` | Usar `page`, `size` y `sort` (capítulo 9) |
| Un `merge` devuelve un objeto distinto y los cambios posteriores no se guardan | Se siguió usando el objeto pasado a `save`, no el devuelto | Usar siempre la instancia devuelta |

## Ejercicios

::: ejercicio Contar las consultas de una página
Con `show-sql` activado, pide `GET /api/applications?page=0&size=1` y después `GET /api/applications?page=0&size=50`. ¿Cuántas consultas aparecen en cada caso? Explica la diferencia.
:::

::: ejercicio Un método derivado nuevo
Diseña (sin necesidad de mantenerlo en el proyecto) un método derivado que busque aplicaciones cuyo nombre contenga un texto, sin distinguir mayúsculas y minúsculas, con paginación. Escribe la consulta SQL que esperas que genere.
:::

::: preguntas
1. ¿Qué clase contiene la implementación real de los métodos heredados de `JpaRepository`?
2. ¿Cómo decide `save` entre `persist` y `merge`?
3. ¿Cuándo detecta Spring Data un error en el nombre de un método derivado?
4. ¿Por qué un listado paginado puede ejecutar dos consultas, y cuándo se ahorra la segunda?
5. ¿Qué ocurre si un repositorio se llama desde un método que ya tiene una transacción abierta?
:::
