# La entidad Application y el contexto de persistencia

<p class="lead">Con la tabla creada, el siguiente paso fue representarla en Java. Este capítulo explica la entidad <code>Application</code> línea a línea y, sobre todo, el mecanismo que está detrás de ella: el contexto de persistencia de Hibernate y su comprobación automática de cambios, el <i>dirty checking</i>.</p>

## Tres capas: JPA, Hibernate y Spring Data

Antes de mirar el código conviene separar tres piezas que a menudo se mezclan:

| Pieza | Qué es | En el proyecto |
|---|---|---|
| **Jakarta Persistence (JPA)** | Una especificación: anotaciones (`@Entity`, `@Id`…) e interfaces (`EntityManager`) | Las anotaciones de la entidad |
| **Hibernate** | La implementación de JPA que hace el trabajo real: genera SQL, gestiona el contexto de persistencia | Configurado por Spring Boot; no se usa directamente |
| **Spring Data JPA** | Una capa encima de JPA que genera repositorios a partir de interfaces | `ApplicationRepository` (capítulo 6) |

Cuando el código llama a `applicationRepository.findById(1L)`, Spring Data traduce la llamada a `entityManager.find(Application.class, 1L)`, y Hibernate ejecuta el `SELECT` y construye el objeto.

::: java
Es la misma JPA que usabas en Java EE; en WebSphere el proveedor solía ser OpenJPA o EclipseLink, aquí es Hibernate. El paquete cambió de `javax.persistence` a `jakarta.persistence` con Jakarta EE 9, así que el código antiguo necesita cambiar los `import`. Lo que no existía en Java EE es Spring Data, que elimina la mayor parte de los DAO escritos a mano.
:::

## Mapear la entidad `Application` [paso 2.1]

```java title="application/entity/Application.java" estado="impl"
@Entity
@Table(name = "applications")
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false, length = 20)
    private String criticality;

    @Column(nullable = false, length = 20)
    private String status;

    protected Application() {
        // Constructor requerido por JPA
    }

    public Application(
            String name,
            String description,
            String criticality,
            String status) {

        this.name = name;
        this.description = description;
        this.criticality = criticality;
        this.status = status;
    }

    public void update(
            String name,
            String description,
            String criticality,
            String status) {

        this.name = name;
        this.description = description;
        this.criticality = criticality;
        this.status = status;
    }

    // getters de los cinco atributos (sin setters)
}
```

Cada elemento tiene un motivo:

**`@Entity` y `@Table(name = "applications")`.** Marcan la clase como persistente y la asocian a la tabla. Sin `@Table`, Hibernate usaría el nombre de la clase (`application`, en singular) y la validación del esquema fallaría.

**`@Id` y `@GeneratedValue(strategy = IDENTITY)`.** El identificador lo genera la columna de identidad de PostgreSQL. Por eso es `Long` y no `long`: una entidad nueva tiene `id == null`, y Spring Data usa precisamente ese `null` para saber si la entidad es nueva (capítulo 6).

**`@Column(nullable = false, length = 100)`.** Describe la columna. Con `ddl-auto=validate`, Hibernate comprueba que la columna exista y que el tipo sea compatible. Atributos como `length` o `nullable` documentan el modelo y se usarían si Hibernate generara el esquema, pero no se aplican en tiempo de ejecución: no sustituyen a la validación de entrada del capítulo 8.

**El constructor `protected` sin argumentos.** JPA exige un constructor sin argumentos para crear la instancia por reflexión al leer una fila. Al hacerlo `protected`, Hibernate puede usarlo, pero el resto del código no puede crear una aplicación vacía.

**El constructor público con los datos.** Es la única forma de crear una aplicación nueva desde el código, y obliga a dar todos los valores.

**`update(...)` en lugar de *setters*.** La entidad no expone un *setter* por atributo. Para modificarla hay un método que cambia los datos editables a la vez. El nombre expresa una operación de negocio, y no hay forma de dejar la entidad a medio modificar llamando solo a algunos *setters*.

::: decision Entidades sin *setters* públicos
**Motivo:** las modificaciones pasan por métodos con significado de negocio, y la entidad controla su propio estado. En `Demand` (capítulo 12) esto permite que las reglas del ciclo de vida vivan en la entidad. **Alternativa descartada:** *getters* y *setters* para todo, el estilo JavaBean habitual, que convierte la entidad en una estructura de datos que cualquiera puede dejar en un estado inválido. **Coste:** algo más de código en cada entidad.
:::

## El contexto de persistencia

El concepto central de JPA es el **contexto de persistencia**: el conjunto de entidades que un `EntityManager` está gestionando en un momento dado. Puedes imaginarlo como un mapa en memoria cuya clave es el tipo y el `id` de la entidad, y cuyo valor es la instancia.

Tiene tres propiedades que conviene conocer bien:

1. **Garantía de identidad.** Dentro del mismo contexto, buscar dos veces la misma fila devuelve **la misma instancia** de Java. El segundo `findById(1L)` ni siquiera va a la base de datos: la encuentra en el mapa. Por eso a veces se le llama caché de primer nivel.
2. **Gestión del ciclo de vida.** Cada entidad está en uno de cuatro estados, y el estado determina qué hará Hibernate con ella.
3. **Escritura diferida.** Los cambios no se envían a la base de datos en el momento en que se hacen, sino cuando el contexto se **sincroniza** (*flush*).

En una aplicación Spring con `open-in-view=false`, **el contexto de persistencia dura lo mismo que la transacción**: se crea cuando empieza un método `@Transactional` y se cierra cuando termina.

<figure>
<svg viewBox="0 0 680 250" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="10">
  <defs><marker id="m5" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0891b2"/></marker></defs>
  <g text-anchor="middle">
    <rect x="20" y="95" width="120" height="50" rx="8" fill="#f8fafc" stroke="#94a3b8"/><text x="80" y="117" font-weight="700">Nueva</text><text x="80" y="132" font-size="9" fill="#475569">new Application(...)</text>
    <rect x="270" y="95" width="140" height="50" rx="8" fill="#0b1220"/><text x="340" y="117" font-weight="700" fill="#fff">Gestionada</text><text x="340" y="132" font-size="9" fill="#a5f3fc">dentro del contexto</text>
    <rect x="540" y="40" width="120" height="50" rx="8" fill="#fff7ed" stroke="#fdba74"/><text x="600" y="62" font-weight="700">Separada</text><text x="600" y="77" font-size="9" fill="#475569">contexto cerrado</text>
    <rect x="540" y="160" width="120" height="50" rx="8" fill="#fff1f2" stroke="#fda4af"/><text x="600" y="182" font-weight="700">Eliminada</text><text x="600" y="197" font-size="9" fill="#475569">DELETE en el flush</text>
  </g>
  <g stroke="#0891b2" stroke-width="1.4" fill="none">
    <line x1="140" y1="120" x2="268" y2="120" marker-end="url(#m5)"/>
    <path d="M410,108 C470,90 500,70 538,66" marker-end="url(#m5)"/>
    <path d="M538,78 C490,95 460,110 412,116" marker-end="url(#m5)"/>
    <path d="M410,132 C470,150 500,175 538,182" marker-end="url(#m5)"/>
    <path d="M300,95 C280,40 400,40 380,93" marker-end="url(#m5)"/>
  </g>
  <g font-size="9" fill="#0e7490" text-anchor="middle">
    <text x="204" y="112">persist / save</text>
    <text x="480" y="62">fin de la transacción</text>
    <text x="452" y="120">merge</text>
    <text x="478" y="186">remove</text>
    <text x="340" y="36">find, consultas: SELECT</text>
  </g>
  <rect x="190" y="200" width="300" height="40" rx="6" fill="#ecfeff" stroke="#67e8f9"/>
  <text x="340" y="218" text-anchor="middle" font-weight="700">Solo las gestionadas se vigilan:</text>
  <text x="340" y="232" text-anchor="middle">sus cambios se convierten en UPDATE al hacer flush</text>
</svg>
<figcaption><b>Figura 5.1.</b> Los cuatro estados de una entidad. Una entidad cargada con <code>find</code> o con una consulta entra directamente en el estado gestionado.</figcaption>
</figure>

| Estado | Cómo se llega | Qué hace Hibernate |
|---|---|---|
| Nueva (*transient*) | `new Application(...)` | Nada: no la conoce |
| Gestionada (*managed*) | `persist`, `find`, una consulta, o `merge` | Vigila sus cambios y los escribe en el *flush* |
| Separada (*detached*) | Se cierra el contexto o se llama a `clear` | Nada: los cambios se pierden salvo que se haga `merge` |
| Eliminada (*removed*) | `remove` sobre una gestionada | Emite un `DELETE` en el *flush* |

## *Dirty checking* por dentro

Cuando Hibernate carga una entidad, guarda en el contexto de persistencia una **instantánea** (*snapshot*) con los valores de cada atributo tal como venían de la base de datos. Al hacer *flush*, recorre todas las entidades gestionadas y compara cada atributo con su instantánea. Si alguno cambió, la entidad está «sucia» (*dirty*) y Hibernate genera un `UPDATE`.

El *flush* ocurre en tres momentos:

1. **Al confirmar la transacción**, justo antes del `COMMIT`. Es el caso normal.
2. **Antes de una consulta** que pueda verse afectada por cambios pendientes (modo `AUTO`), para que la consulta vea un estado coherente.
3. **Cuando se pide explícitamente** con `flush()` o `saveAndFlush()`, algo que las pruebas de integración usan para forzar el SQL dentro de la prueba.

La consecuencia práctica es la que hace el capítulo 7: para modificar una aplicación basta con cargarla y cambiar sus atributos dentro de una transacción. **No hace falta llamar a `save`**. Al terminar el método, Hibernate detecta el cambio y lo escribe.

```text title="Salida de show-sql al modificar una aplicación (ejemplo)"
Hibernate: select a1_0.id,a1_0.criticality,a1_0.description,a1_0.name,a1_0.status
           from applications a1_0 where a1_0.id=?
Hibernate: update applications set criticality=?,description=?,name=?,status=?
           where id=?
```

Dos detalles de esa salida: el `UPDATE` incluye **todas** las columnas, aunque solo haya cambiado una (Hibernate prepara una sentencia fija por entidad y la reutiliza; la anotación `@DynamicUpdate` cambiaría eso), y si no cambia nada, **no hay `UPDATE`**.

::: atencion El *dirty checking* solo funciona con entidades gestionadas
Si una entidad está separada, porque se cargó en otra transacción o se construyó a mano con un `id`, cambiar sus atributos no tiene ningún efecto en la base de datos. Es el error más frecuente al empezar con JPA: el código «modifica» el objeto, no hay excepción y el cambio nunca se guarda.
:::

### Transacciones de solo lectura

Los métodos de consulta del servicio llevan `@Transactional(readOnly = true)`. Con esa marca, Spring indica a Hibernate que no habrá escrituras, y Hibernate desactiva el *flush* automático y puede prescindir de las instantáneas. En listados grandes ahorra memoria y tiempo de CPU. Además, el *driver* JDBC marca la conexión como de solo lectura.

## El coste de `GenerationType.IDENTITY`

Con `IDENTITY`, el `id` lo asigna PostgreSQL al insertar. Hibernate necesita ese `id` para registrar la entidad en el contexto de persistencia, así que tiene que ejecutar el `INSERT` **inmediatamente** al llamar a `persist`, sin esperar al *flush*. Eso tiene una consecuencia: Hibernate no puede agrupar varias inserciones en un solo lote JDBC.

La alternativa es `GenerationType.SEQUENCE`: Hibernate pide a una secuencia de PostgreSQL un bloque de identificadores por adelantado, asigna el `id` en memoria y retrasa los `INSERT` hasta el *flush*, donde puede agruparlos.

::: decision `IDENTITY` en lugar de `SEQUENCE`
**Motivo:** encaja con la columna de identidad estándar de la migración, es la opción más sencilla de entender y el proyecto inserta registros de uno en uno desde la API. **Alternativa:** `SEQUENCE` con `allocationSize`, preferible si algún día hay cargas masivas. Cambiar de estrategia implica una migración, así que se deja anotado como posible mejora.
:::

## Errores típicos y depuración

| Síntoma | Causa probable | Cómo resolverlo |
|---|---|---|
| `No default constructor for entity` | Falta el constructor sin argumentos | Añadirlo, `protected` |
| `Schema-validation: missing table [application]` | Falta `@Table(name = "applications")` | Indicar el nombre de la tabla |
| Un cambio no se guarda y no hay error | La entidad estaba separada o el método no era transaccional | Cargar y modificar dentro del mismo método `@Transactional` |
| Aparece un `UPDATE` inesperado al final de un método | Se modificó una entidad gestionada sin querer, por ejemplo para «formatear» un valor | No modificar entidades para presentar datos; construir el DTO aparte |
| `LazyInitializationException` | Se accede a una asociación perezosa fuera de la transacción | Ver el capítulo 14 |

## Ejercicios

::: ejercicio Observar el *dirty checking*
Con `show-sql` activado, modifica una aplicación desde el frontend o con una petición `PUT`. Localiza en la consola el `SELECT` y el `UPDATE`. Después envía la misma petición otra vez, sin cambiar nada, y comprueba si aparece un segundo `UPDATE`. Explica el resultado.
:::

::: ejercicio La garantía de identidad
Escribe en una prueba de integración (o en un método temporal de un servicio, dentro de una transacción) dos llamadas seguidas a `findById(1L)` y compara las dos instancias con `==`. ¿Cuántos `SELECT` aparecen? ¿Qué cambia si llamas a `entityManager.clear()` entre las dos?
:::

::: preguntas
1. ¿Qué diferencia hay entre JPA, Hibernate y Spring Data JPA?
2. ¿Por qué el `id` de la entidad es `Long` y no `long`?
3. ¿Por qué el constructor sin argumentos es `protected` y no `public`?
4. ¿Qué compara Hibernate al hacer *flush* para decidir si genera un `UPDATE`?
5. ¿Por qué `GenerationType.IDENTITY` impide agrupar inserciones en lotes?
:::
