#!/bin/bash

# Script para construir y subir ambas imágenes a Docker Hub con soporte multi-arquitectura
# Uso: ./docker-deploy-separated.sh <tu-usuario-dockerhub>

if [ -z "$1" ]; then
    echo "Error: Debes proporcionar tu nombre de usuario de Docker Hub"
    echo "Uso: ./docker-deploy-separated.sh <tu-usuario-dockerhub>"
    exit 1
fi

DOCKERHUB_USER=$1
VERSION="latest"

echo "🔧 Verificando y creando builder para multi-arquitectura..."
# Crear un builder para multi-arquitectura si no existe
if ! docker buildx ls | grep -q multiarch-builder; then
    docker buildx create --name multiarch-builder --driver-opt network=host --use
else
    docker buildx use multiarch-builder
fi

echo "🔄 Iniciando builder..."
docker buildx inspect --bootstrap

echo ""
echo "🌐 Verificando conexión a Docker Hub..."
if ! timeout 10 docker pull hello-world > /dev/null 2>&1; then
    echo "⚠️  Advertencia: Problemas de conectividad con Docker Hub"
    echo "🔄 Intentando con DNS alternativo (Google DNS)..."
    # Intentar reiniciar Docker con configuración de red
fi

echo ""
echo "🔨 Construyendo y subiendo BACKEND multi-arquitectura (AMD64 + ARM64)..."
echo ""

MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        -f Dockerfile.backend \
        -t ${DOCKERHUB_USER}/peliculas-backend:${VERSION} \
        --push \
        .
    
    if [ $? -eq 0 ]; then
        echo "✅ Backend construido y subido exitosamente"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "⚠️  Intento $RETRY_COUNT falló. Reintentando en 5 segundos..."
            sleep 5
        else
            echo "❌ Error al construir y subir la imagen del backend después de $MAX_RETRIES intentos"
            echo ""
            echo "Posibles soluciones:"
            echo "1. Verifica tu conexión a internet"
            echo "2. Verifica que estés autenticado: docker login"
            echo "3. Intenta con solo una arquitectura: --platform linux/amd64"
            echo "4. Verifica tu configuración DNS"
            exit 1
        fi
    fi
done

echo ""
echo "🔨 Construyendo y subiendo FRONTEND multi-arquitectura (AMD64 + ARM64)..."
echo ""

RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        -f Dockerfile.frontend \
        --build-arg VITE_API_URL=https://backend-peliculas.arturoalvarez.site \
        -t ${DOCKERHUB_USER}/peliculas-frontend:${VERSION} \
        --push \
        .
    
    if [ $? -eq 0 ]; then
        echo "✅ Frontend construido y subido exitosamente"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "⚠️  Intento $RETRY_COUNT falló. Reintentando en 5 segundos..."
            sleep 5
        else
            echo "❌ Error al construir y subir la imagen del frontend después de $MAX_RETRIES intentos"
            echo ""
            echo "Posibles soluciones:"
            echo "1. Verifica tu conexión a internet"
            echo "2. Verifica que estés autenticado: docker login"
            echo "3. Intenta con solo una arquitectura: --platform linux/amd64"
            exit 1
        fi
    fi
done

echo ""
echo "✅ Ambas imágenes multi-arquitectura subidas exitosamente a Docker Hub!"
echo ""
echo "📦 Imágenes publicadas:"
echo "   - ${DOCKERHUB_USER}/peliculas-backend:${VERSION}"
echo "   - ${DOCKERHUB_USER}/peliculas-frontend:${VERSION}"
echo ""
echo "📦 Arquitecturas soportadas:"
echo "   - linux/amd64 (Intel/AMD 64-bit)"
echo "   - linux/arm64 (ARM 64-bit)"
echo ""
echo "🚀 Para usar las imágenes:"
echo ""
echo "   # Opción 1: Con docker-compose (actualiza docker-compose.yml primero)"
echo "   docker-compose up -d"
echo ""
echo "   # Opción 2: Manual"
echo "   docker network create peliculas-network"
echo "   docker run -d --name peliculas-backend --network peliculas-network -p 3000:3000 -v peliculas-data:/app/data -e DATA_DIR=/app/data ${DOCKERHUB_USER}/peliculas-backend:${VERSION}"
echo "   docker run -d --name peliculas-frontend --network peliculas-network -p 8080:80 ${DOCKERHUB_USER}/peliculas-frontend:${VERSION}"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:8080"
echo "   Backend API: http://localhost:3000/api/movies"
echo ""
echo "💾 Datos persistentes en volumen: peliculas-data → /app/data/data.json"
echo ""
echo "💡 Docker automáticamente descargará la versión correcta para tu arquitectura"
