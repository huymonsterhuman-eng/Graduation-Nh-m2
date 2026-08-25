# ================================================================
# LaptopWorld backend — multi-stage Dockerfile
# Stage 1: build jar bang Maven (skip tests — chay rieng qua CI)
# Stage 2: runtime image gon nhat (JRE 21 tren Debian slim)
# ================================================================

# ---------- Stage 1: build ----------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Cache maven dependencies — chi rebuild layer khi pom.xml thay doi
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

# Copy source va build
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# ---------- Stage 2: runtime ----------
FROM eclipse-temurin:21-jre
WORKDIR /app

# Tao thu muc uploads (mount volume tu docker-compose)
RUN mkdir -p /app/uploads

# Copy jar tu build stage
COPY --from=build /workspace/target/*.jar app.jar

# Non-root user cho bao mat
RUN groupadd -r laptopworld && useradd -r -g laptopworld laptopworld \
    && chown -R laptopworld:laptopworld /app
USER laptopworld

EXPOSE 8080

# JVM flags — container-aware memory + timezone VN
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -Duser.timezone=Asia/Ho_Chi_Minh"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
