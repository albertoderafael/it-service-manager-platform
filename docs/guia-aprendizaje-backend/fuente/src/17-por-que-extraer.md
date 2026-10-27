# Decidir la extracción

<p class="lead">Con el monolito terminado, se tomó la decisión de separar el catálogo de aplicaciones en un servicio propio. Este capítulo explica por qué, qué cambia cuando una llamada cruza la red y, sobre todo, cómo se planificó la extracción para que el sistema siguiera funcionando después de cada paso.</p>

## Por qué extraer el catálogo de aplicaciones [paso 5.1]

De los dos módulos, el candidato natural era el catálogo, por su posición en el dominio:

- **Es un dato de referencia.** Las demandas apuntan a aplicaciones; las incidencias y los equipos previstos también lo harán. El catálogo es lo que comparten todos los módulos futuros, y conviene que tenga un dueño y una API claros.
- **Cambia a otro ritmo.** El catálogo es relativamente estable; las demandas se crean y modifican a diario.
- **La dependencia va en un solo sentido.** Demand necesita a Application, pero Application no sabe nada de Demand. Extraer el lado del que otros dependen, sin dependencias de vuelta, es el corte más limpio posible.
- **Es una oportunidad de aprendizaje controlada.** El proyecto tiene también un objetivo formativo, y el catálogo es lo bastante pequeño para hacer la separación completa sin que el riesgo sea grande.

::: decision Extraer Application, no Demand
**Motivo:** el catálogo no depende de nadie y es el dato que compartirán los módulos futuros. **Alternativa descartada:** extraer las demandas y dejar el catálogo en el monolito, que habría obligado al servicio nuevo a llamar de vuelta al monolito para todo y no habría preparado la arquitectura para los módulos siguientes.
:::

Hay que decir también lo contrario: con un solo equipo y dos módulos, un monolito modular bien organizado es perfectamente defendible, y la distribución tiene costes reales. La decisión se tomó sabiendo que se pagaban esos costes a cambio de una arquitectura preparada para crecer y del aprendizaje.

## Qué cambia cuando la llamada cruza la red

En el monolito, comprobar que una aplicación existe es una llamada a un método Java que lee de la misma base de datos, en la misma transacción. Al separar el catálogo, esa misma pregunta se convierte en una petición HTTP a otro proceso. Parece un cambio de transporte, pero cambia la naturaleza de la operación:

| Aspecto | Llamada local (monolito) | Llamada remota (dos servicios) |
|---|---|---|
| Latencia | Nanosegundos | Milisegundos, variable |
| Fallos posibles | Prácticamente ninguno | El otro servicio está caído, lento, o la red falla |
| Resultado | Siempre hay respuesta | Puede no haber respuesta: hay que decidir cuánto esperar |
| Transacción | Compartida: todo o nada | Independiente en cada servicio |
| Integridad | Clave foránea | Solo comprobación en la aplicación |
| Consultas que unen datos | Una unión SQL | Imposibles: los datos están en bases distintas |
| Versionado | Se despliega todo junto | Cada servicio puede cambiar su API por su cuenta |

Cada fila se convirtió en una decisión concreta de los capítulos siguientes: los tiempos máximos y la traducción de errores del capítulo 20, la consulta por lotes del capítulo 18, la retirada de la ordenación por nombre del capítulo 21 y la eliminación de la clave foránea.

::: java
Si trabajaste con EJB remotos sobre RMI-IIOP en WebSphere, conoces la tentación: la llamada remota se escribe igual que la local y es fácil olvidar que no lo es. Las «falacias de la computación distribuida» (la red es fiable, la latencia es cero, el ancho de banda es infinito…) siguen siendo igual de ciertas con HTTP y JSON.
:::

## La estrategia: pasos pequeños y reversibles

La extracción **no** se hizo en un solo cambio. Se descompuso en pasos tales que, después de cada uno, el sistema compilaba, las pruebas pasaban y la aplicación funcionaba igual para el usuario. Es la idea de la técnica conocida como *branch by abstraction*: primero se introduce una abstracción entre quien usa algo y su implementación; después se cambia la implementación detrás de la abstracción; y por último se retira lo que ya no se usa.

<figure>
<svg viewBox="0 0 680 330" xmlns="http://www.w3.org/2000/svg" font-family="Inter" font-size="9.8">
  <g font-weight="700" font-size="9" fill="#475569">
    <text x="20" y="18">DENTRO DEL MONOLITO (una base de datos)</text>
    <text x="20" y="196">SEGUNDO SERVICIO Y CORTE</text>
  </g>
  <g>
    <rect x="20" y="26" width="640" height="24" rx="5" fill="#ecfeff" stroke="#67e8f9"/><text x="32" y="42"><tspan font-weight="700">5.2</tspan>  Puerto ApplicationCatalog + record ApplicationSummary: Demand deja de conocer la entidad Application</text>
    <rect x="20" y="54" width="640" height="24" rx="5" fill="#ecfeff" stroke="#67e8f9"/><text x="32" y="70"><tspan font-weight="700">5.3</tspan>  Demand guarda un Long applicationId en lugar de la asociación (la FK sigue en la base de datos)</text>
    <rect x="20" y="82" width="640" height="24" rx="5" fill="#ecfeff" stroke="#67e8f9"/><text x="32" y="98"><tspan font-weight="700">5.4</tspan>  JpaApplicationCatalog implementa el puerto con el repositorio de siempre</text>
    <rect x="20" y="110" width="640" height="24" rx="5" fill="#ecfeff" stroke="#67e8f9"/><text x="32" y="126"><tspan font-weight="700">5.5</tspan>  El listado pide los nombres de una página en una sola consulta por lote</text>
    <rect x="20" y="138" width="640" height="24" rx="5" fill="#ecfeff" stroke="#67e8f9"/><text x="32" y="154"><tspan font-weight="700">5.6</tspan>  La ordenación por nombre se aísla en un adaptador de consultas, marcado como acoplamiento temporal</text>
    <rect x="20" y="204" width="640" height="24" rx="5" fill="#f0fdfa" stroke="#5eead4"/><text x="32" y="220"><tspan font-weight="700">5.7-5.9</tspan>  Nace application-catalog-service (8081, application_db), con /summaries y los datos trasladados</text>
    <rect x="20" y="232" width="640" height="24" rx="5" fill="#f0fdfa" stroke="#5eead4"/><text x="32" y="248"><tspan font-weight="700">5.10-5.12</tspan>  RestApplicationCatalog implementa el mismo puerto por HTTP, con tiempos máximos y errores traducidos</text>
    <rect x="20" y="260" width="640" height="24" rx="5" fill="#fff1f2" stroke="#fda4af"/><text x="32" y="276"><tspan font-weight="700">5.13-5.14</tspan>  V4 elimina la FK, V5 la tabla heredada; se retira la ordenación por nombre de aplicación</text>
    <rect x="20" y="288" width="640" height="24" rx="5" fill="#f8fafc" stroke="#cbd5e1"/><text x="32" y="304"><tspan font-weight="700">5.15</tspan>  Pruebas de Demand sin FK y con el catálogo simulado</text>
  </g>
  <text x="340" y="182" text-anchor="middle" font-size="9" fill="#0e7490">después de cada paso: compila, las pruebas pasan, el usuario no nota nada</text>
  <text x="340" y="326" text-anchor="middle" font-size="9" fill="#be123c">los pasos en rojo son los únicos difíciles de deshacer</text>
</svg>
<figcaption><b>Figura 17.1.</b> Plan de la extracción. La primera mitad cambia la estructura del monolito sin cambiar su comportamiento; la segunda introduce el servicio nuevo detrás de la abstracción ya preparada.</figcaption>
</figure>

El orden importa por tres razones:

1. **Lo arriesgado va al final.** Los pasos 5.2 a 5.6 son refactorizaciones dentro del monolito: si algo sale mal, se revierten con el control de versiones. La separación de bases de datos de los pasos 5.13 y 5.14 es lo único difícil de deshacer, y se hace cuando todo lo demás ya funciona.
2. **Cada problema se resuelve donde es barato.** El N+1 del listado y la ordenación por nombre se resuelven todavía en el monolito, con la base de datos compartida a mano para comparar resultados. Cuando llega el HTTP, la lógica ya está preparada para trabajar por lotes.
3. **El servicio nuevo encaja en un hueco que ya existe.** Cuando aparece `RestApplicationCatalog`, implementa una interfaz que el servicio de demandas ya usa. El cambio de implementación es local.

## Lo que se decidió no hacer

Una extracción también se define por lo que deja fuera. Estas piezas habituales en arquitecturas de microservicios se descartaron deliberadamente, por ahora:

| Pieza | Por qué no |
|---|---|
| Base de datos compartida entre servicios | Anularía la separación: los servicios seguirían acoplados por el esquema |
| Transacciones distribuidas (XA, dos fases) | Complejidad y acoplamiento desproporcionados para comprobar que algo existe |
| Mensajería y eventos | El catálogo solo se lee desde Demand; no hay que propagar cambios |
| Copia local del catálogo en Demand | Habría que sincronizarla; con dos aplicaciones de referencia no compensa todavía |
| *Gateway*, descubrimiento de servicios | Dos servicios con URL fija no lo necesitan; el proxy de Vite hace de entrada en desarrollo |
| Despliegue conjunto en contenedores | Queda pendiente (capítulo 24) |

::: decision Un contrato de solo lectura
El servicio de demandas solo **lee** del catálogo: si existe una aplicación y cómo se llama. Nunca la crea ni la modifica. Esa restricción mantiene la frontera estrecha y explica por qué basta con dos operaciones (una por `id` y otra por lote). Las altas y modificaciones de aplicaciones las hace el frontend directamente contra el servicio del catálogo.
:::

## Riesgos aceptados

- **Integridad eventual.** Sin clave foránea, nada impide en la base de datos que una demanda apunte a un `id` que no existe en el catálogo. Se mitiga porque el servicio de demandas lo comprueba al crear y modificar, y porque las aplicaciones no se borran.
- **Disponibilidad acoplada.** Si el catálogo cae, el servicio de demandas no puede crear ni listar demandas, porque necesita los nombres. Se acepta, y se responde con un error claro (503) en lugar de un fallo opaco.
- **Funcionalidad perdida.** Ordenar las demandas por el nombre de su aplicación deja de ser posible de forma correcta y eficiente. Se retira de la API.

## Ejercicios

::: ejercicio Elegir qué extraer
Imagina que el siguiente módulo es Incidencias, que también referencia aplicaciones y además tiene un responsable de un futuro módulo de Equipos. Razona qué módulos serían candidatos a servicio propio y en qué orden, aplicando los criterios de la primera sección.
:::

::: ejercicio Descomponer en pasos
Supón que quisieras extraer también el manejo de errores compartido (`exception`) a una librería común. Propón una secuencia de pasos en la que el sistema funcione después de cada uno, siguiendo la idea de la figura 17.1.
:::

::: preguntas
1. ¿Por qué el catálogo de aplicaciones era mejor candidato a extraer que las demandas?
2. Cita tres diferencias entre una llamada local y una remota que obligaron a tomar decisiones de diseño.
3. ¿En qué consiste la técnica de *branch by abstraction*?
4. ¿Por qué los pasos que separan las bases de datos se dejaron para el final?
5. ¿Qué riesgo introduce eliminar la clave foránea y cómo se mitiga?
:::
