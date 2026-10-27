# IT Service Manager · Platform

Proyecto personal de Alberto de Rafael: una aplicación de gestión IT (catálogo de aplicaciones y demandas asociadas) construida con **Java 21 + Spring Boot 4**, **React + TypeScript** y **PostgreSQL**, separada en **dos microservicios** y desplegada en local con **Docker Compose**.

> **English summary.** Personal full-stack learning project. Two Spring Boot 4 (Java 21) microservices, an application catalog and a demand service, each owning its own PostgreSQL database and Flyway migrations, communicating over REST with timeouts and explicit error mapping (404 / 502 / 503). A React + TypeScript frontend served by nginx acts as the single entry point. The whole system runs locally with Docker Compose: multi-stage images, non-root containers, Actuator health checks and environment-based configuration. Includes unit, MockMvc and Testcontainers integration tests, plus two long-form learning guides (in Spanish) documenting every step.

## Arquitectura

```text
Navegador ──► web (nginx :8088) ──┬── /api/applications ──► application-catalog-service (:8081) ──► application_db
                                  └── /api/demands ───────► demand-service (:8080) ─────────────────► it_service_manager
                                                                 │
                                                                 └── REST ──► application-catalog-service
```

- **application-catalog-service:** catálogo de aplicaciones (consulta con filtros, paginación, alta y modificación). Expone además una consulta por lotes de resúmenes para otros servicios.
- **demand-service:** demandas y su ciclo de vida (`OPEN → IN_PROGRESS → COMPLETED`, con cancelación). Guarda solo el identificador de la aplicación y consulta el catálogo por HTTP: valida la aplicación al crear y modificar, y resuelve los nombres de cada página con una única petición por lotes.
- **Degradación controlada:** si el catálogo no responde, el servicio de demandas sigue arrancado y devuelve 503 con un mensaje claro; si responde de forma inesperada, 502. Si una aplicación ya no existe, la demanda se muestra igualmente sin nombre.
- **Una base de datos por servicio**, en una única instancia de PostgreSQL, con un usuario que solo puede conectarse a la suya.
- **web:** React servido por nginx, que reenvía cada ruta de la API a su servicio. El navegador ve un único origen, sin CORS.

## Estructura

```text
services/
  application-catalog-service/   Microservicio del catálogo (Spring Boot, Dockerfile)
  demand-service/                Microservicio de demandas (Spring Boot, Dockerfile)
web/                             Frontend React + TypeScript (Vite, nginx)
platform/                        Docker Compose, inicialización de PostgreSQL, .env.example
docs/                            Guías de aprendizaje (PDF y fuentes)
```

## Arranque rápido

Requisitos: Docker Desktop.

```powershell
cd platform
copy .env.example .env      # y pon contraseñas propias en .env
docker compose up -d --build
docker compose ps           # esperar a que todo esté "healthy"
```

Abre http://localhost:8088. En una instalación nueva el catálogo está vacío: crea alguna aplicación antes de registrar demandas. Más detalles en [platform/README.md](platform/README.md).

## Pruebas

| Parte | Comando | Qué cubre |
| --- | --- | --- |
| Cada servicio | `.\mvnw.cmd test` (con Docker en marcha) | Unitarias con Mockito, controladores con MockMvc, integración con PostgreSQL real (Testcontainers) y el cliente HTTP contra un servidor simulado |
| Frontend | `npm ci` y `npm run test` | Esquemas de formularios, parámetros de URL, reglas de estado y cliente de la API (Vitest) |

## Tecnologías

| Backend | Frontend | Plataforma |
| --- | --- | --- |
| Java 21, Spring Boot 4.1.1 | React, TypeScript, Vite | Docker, Docker Compose |
| Spring Data JPA, Hibernate | TanStack Query, React Router | nginx |
| PostgreSQL, Flyway | Tailwind CSS, shadcn/ui (Radix UI) | Spring Boot Actuator |
| RestClient, Bean Validation | React Hook Form, Zod | Imágenes multi-etapa, usuario no root |
| JUnit 5, Mockito, MockMvc, Testcontainers | Vitest | |

## Guías de aprendizaje

En [`docs/`](docs/) hay dos guías en PDF, con sus fuentes en Markdown:

- **Frontend** (`docs/guia-aprendizaje/`): React, TypeScript y la arquitectura del frontend, explicadas sobre este mismo código.
- **Backend** (`docs/guia-aprendizaje-backend/`): la evolución completa en orden cronológico, del monolito a la extracción del catálogo y el despliegue con Docker, con las decisiones tomadas y las que se descartaron.

El proyecto y las guías se han desarrollado con ayuda de asistentes de IA (Claude y ChatGPT), usados como apoyo de arquitectura, programación y redacción. Las decisiones, la revisión, la ejecución de las pruebas y la puesta en marcha son del autor.

## Historia del proyecto

La versión anterior, un monolito modular con los mismos módulos, está en el repositorio [it-service-demand-manager](https://github.com/albertoderafael/it-service-demand-manager) (etiquetas `v1.0-catalogo` y `v2.0-monolito`). Este repositorio parte de esa base y documenta en las guías cómo se hizo la separación.

## Alcance

Proyecto de aprendizaje para ejecutar en local. No incluye autenticación ni autorización, ni configuración de producción, ni orquestación (Kubernetes), que serían los siguientes pasos naturales. Los datos de ejemplo son ficticios.
