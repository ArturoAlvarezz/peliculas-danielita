#!/bin/bash

# Script para construir y subir imágenes a Docker Hub solo para ARM64
# Uso: ./docker-deploy-arm.sh <tu-usuario-dockerhub>

if [ -z "$1" ]; then
    echo "Error: Debes proporcionar tu nombre de usuario de Docker Hub"
    echo "Uso: ./docker-deploy-arm.sh <tu-usuario-dockerhub>"
    exit 1
fi

DOCKERHUB_USER=$1
VERSION="latest"

echo "🔧 Verificando y creando builder para ARM64..."
# Crear un builder si no existe
if ! docker buildx ls | grep -q arm-builder; then
    docker buildx create --name arm-builder --driver-opt network=host --use
else
    docker buildx use arm-builder
fi

echo "🔄 Iniciando builder..."
docker buildx inspect --bootstrap

echo ""
echo "🔨 Construyendo y subiendo BACKEND para ARM64..."
echo ""

docker buildx build \
    --platform linux/arm64 \
    -f Dockerfile.backend \
    -t ${DOCKERHUB_USER}/peliculas-backend:${VERSION} \
    --push \
    .

if [ $? -ne 0 ]; then
    echo "❌ Error al construir y subir la imagen del backend"
    echo ""
    echo "Posibles soluciones:"
    echo "1. Verifica tu conexión a internet"
    echo "2. Verifica que estés autenticado: docker login"
    echo "3. Espera unos minutos y reintenta (puede ser problema temporal de red)"
    exit 1
fi

echo "✅ Backend subido exitosamente"
echo ""
echo "🔨 Construyendo y subiendo FRONTEND para ARM64..."
echo ""

docker buildx build \
    --platform linux/arm64 \
    -f Dockerfile.frontend \
    --build-arg VITE_API_URL=https://backend-peliculas.arturoalvarez.site \
    -t ${DOCKERHUB_USER}/peliculas-frontend:${VERSION} \
    --push \
    .

if [ $? -ne 0 ]; then
    echo "❌ Error al construir y subir la imagen del frontend"
    exit 1
fi

echo ""
echo "✅ Ambas imágenes ARM64 subidas exitosamente a Docker Hub!"
echo ""
echo "📦 Imágenes publicadas:"
echo "   - ${DOCKERHUB_USER}/peliculas-backend:${VERSION} (ARM64)"
echo "   - ${DOCKERHUB_USER}/peliculas-frontend:${VERSION} (ARM64)"
echo ""
echo "🚀 Para usar las imágenes en tu Raspberry Pi u otro dispositivo ARM:"
echo ""
echo "   docker network create peliculas-network"
echo "   docker run -d --name peliculas-backend --network peliculas-network -p 3000:3000 -v peliculas-data:/app/data -e DATA_DIR=/app/data ${DOCKERHUB_USER}/peliculas-backend:${VERSION}"
echo "   docker run -d --name peliculas-frontend --network peliculas-network -p 8080:80 ${DOCKERHUB_USER}/peliculas-frontend:${VERSION}"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:8080"
echo "   Backend API: http://localhost:3000/api/movies"
echo ""
echo "💾 Datos persistentes en volumen: peliculas-data → /app/data/data.json"
