# API de DABLIU (Spring Boot). Pensado para Dokploy en el VPS: Traefik enruta /api a este contenedor.
# Las pruebas no corren aquí (usan Testcontainers y necesitan Docker); se corren en local con ./mvnw test.

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/target/dabliu-api-*.jar app.jar
USER app
ENV TZ=UTC \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
