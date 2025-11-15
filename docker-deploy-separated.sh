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
    docker buildx create --name multiarch-builder --use
else
    docker buildx use multiarch-builder
fi

docker buildx inspect --bootstrap

echo ""
echo "🔨 Construyendo y subiendo BACKEND multi-arquitectura (AMD64 + ARM64)..."
echo ""

docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -f Dockerfile.backend \
    -t ${DOCKERHUB_USER}/peliculas-backend:${VERSION} \
    --push \
    .

if [ $? -ne 0 ]; then
    echo "❌ Error al construir y subir la imagen del backend"
    echo "Ejecuta 'docker login' primero para autenticarte"
    exit 1
fi

echo "✅ Backend subido exitosamente"
echo ""
echo "🔨 Construyendo y subiendo FRONTEND multi-arquitectura (AMD64 + ARM64)..."
echo ""

docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -f Dockerfile.frontend \
    --build-arg VITE_API_URL=https://backend-peliculas.arturoalvarez.site \
    -t ${DOCKERHUB_USER}/peliculas-frontend:${VERSION} \
    --push \
    .

if [ $? -ne 0 ]; then
    echo "❌ Error al construir y subir la imagen del frontend"
    echo "Ejecuta 'docker login' primero para autenticarte"
    exit 1
fi

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
