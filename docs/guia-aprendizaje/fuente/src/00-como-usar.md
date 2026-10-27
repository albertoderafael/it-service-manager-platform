<p class="lead">Esta guía explica, desde los fundamentos, cómo está construido el frontend de <b>IT Service &amp; Demand Manager</b>. No es un manual genérico de React: cada concepto se explica con el código real del proyecto, y cada decisión de diseño se justifica frente a sus alternativas.</p>

## A quién va dirigida

Está escrita para un desarrollador con experiencia sólida en backend Java/JEE y Spring que empieza en el frontend moderno. Por eso se dan por sabidos conceptos como HTTP, REST, JSON, inyección de dependencias, capas, transacciones o pruebas unitarias. En cambio, se explican desde cero JavaScript, TypeScript, React y el resto del ecosistema del navegador.

## Cómo está organizada

La guía avanza de lo general a lo particular, en nueve partes:

| Parte | Contenido | Capítulos |
|---|---|---|
| I. Fundamentos | Qué es una SPA, JavaScript y TypeScript, Node y npm | 1-3 |
| II. Herramientas | Vite, la configuración de TypeScript, ESLint y los scripts | 4-5 |
| III. React 19 | Componentes, estado, renderizado, hooks y contexto | 6-9 |
| IV. Interfaz y diseño | Tailwind CSS, shadcn/ui, Radix y el layout | 10-12 |
| V. Arquitectura | Organización por funcionalidad y anatomía de un módulo | 13-14 |
| VI. Datos y backend | Cliente HTTP, CORS y proxy, TanStack Query | 15-17 |
| VII. Navegación y formularios | React Router, estado en la URL, React Hook Form y Zod | 18-20 |
| VIII. Recorridos completos | Aplicaciones y demandas de principio a fin | 21-22 |
| IX. Calidad y evolución | Pruebas, decisiones, integración con el backend y el módulo de Incidencias | 23-26 |

Cinco anexos completan la guía: **A**, soluciones de los ejercicios y respuestas de autoevaluación; **B**, glosario; **C**, equivalencias Java ↔ frontend; **D**, chuleta de comandos y atajos; y **E**, mapa comentado de todos los ficheros del proyecto.

## Cómo está construido cada capítulo

Todos los capítulos siguen el mismo esquema, para que sepas siempre dónde buscar:

1. **Qué es**: el concepto, sin dar nada por sabido.
2. **Cómo funciona por dentro**: lo justo para que la tecnología deje de ser una caja negra.
3. **Cómo se aplica en el proyecto**: fragmentos de código real, con el fichero de origen indicado sobre cada bloque.
4. **Decisión y alternativas**: por qué se eligió esto y qué se descartó.
5. **Errores típicos y depuración**: fallos frecuentes y cómo diagnosticarlos.
6. **Ejercicios** y **autoevaluación**, con las soluciones en el anexo A.

## Los recuadros

<div class="callout java" markdown="1">
<p class="callout-title">Si vienes de Java…</p>

Relaciona el concepto con algo que ya conoces del mundo Java/Spring. Las analogías ayudan a arrancar, pero también se señala dónde dejan de funcionar.
</div>

<div class="callout proyecto" markdown="1">
<p class="callout-title">En el proyecto</p>

Señala exactamente dónde y cómo se usa el concepto en `it-service-manager-web`.
</div>

<div class="callout decision" markdown="1">
<p class="callout-title">Decisión de diseño</p>

Recoge una decisión tomada, el motivo y las alternativas que se valoraron.
</div>

<div class="callout atencion" markdown="1">
<p class="callout-title">Cuidado</p>

Avisa de un error habitual o de una trampa del lenguaje o de la herramienta.
</div>

## Cómo moverte por el PDF

- **Índice enlazado.** Cada parte, capítulo y sección del índice es un enlace a su página.
- **Vuelta al índice.** Junto al título de cada capítulo y de cada sección hay un enlace **↑ Índice** que te lleva exactamente a su entrada en el índice, para que puedas saltar a otro punto.
- **Índice de capítulo.** Al principio de cada capítulo tienes la lista de sus secciones, también enlazada.
- **Ejercicios y soluciones.** Cada ejercicio enlaza con su solución en el anexo, y cada solución enlaza de vuelta con su ejercicio. Lo mismo ocurre con las preguntas de autoevaluación.
- **Marcadores.** El panel de marcadores de tu lector de PDF muestra la estructura completa de la guía.

## Cómo sacarle el máximo partido

Lee con el proyecto abierto en el editor. Cuando aparezca un fragmento, abre el fichero completo y busca el contexto. Haz los ejercicios sobre una rama de Git aparte: la mayoría consisten en modificar el proyecto, romper algo a propósito y observar qué ocurre. Es la forma más rápida de pasar de entender a saber hacer.

<div class="callout nota" markdown="1">
<p class="callout-title">Versiones</p>

La guía describe el proyecto tal como está en octubre de 2026: React 19.3, TypeScript 6.0, Vite 8.3, Tailwind CSS 4.3, React Router 8.4, TanStack Query 5, React Hook Form 7, Zod 3, Vitest 5 y ESLint 10, sobre Node.js 22. Los conceptos son estables; los detalles de configuración pueden cambiar entre versiones mayores.
</div>
