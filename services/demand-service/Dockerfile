# syntax=docker/dockerfile:1
#
# Imagen de it-service-manager en dos etapas:
#   1. build:   compila con Maven y extrae el JAR por capas.
#   2. runtime: solo el JRE y la aplicación, ejecutada con un usuario sin privilegios.
#
# Las pruebas NO se ejecutan aquí (necesitan Docker para Testcontainers):
# se ejecutan antes, con "mvnw test", fuera de la imagen.

# ---------- Etapa 1: compilación ----------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Primero solo el pom: las dependencias quedan en una capa en caché
# y no se vuelven a descargar mientras el pom no cambie.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q -DskipTests package \
 && cp target/*.jar app.jar \
 && java -Djarmode=tools -jar app.jar extract --layers --launcher --destination extracted

# ---------- Etapa 2: ejecución ----------
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN groupadd --system spring && useradd --system --gid spring --no-create-home spring

# Capas de la menos a la más cambiante: al modificar el código
# solo se reconstruye la última.
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./

USER spring

# La JVM respeta el límite de memoria del contenedor.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"

EXPOSE 8080

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
