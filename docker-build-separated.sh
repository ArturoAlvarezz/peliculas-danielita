#!/bin/bash

# Script para construir ambas imágenes localmente

echo "🔨 Construyendo imágenes Docker separadas..."
echo ""

echo "📦 1/2 Construyendo Backend (Node.js + Express)..."
docker build -f Dockerfile.backend -t peliculas-backend:latest .

if [ $? -ne 0 ]; then
    echo "❌ Error al construir la imagen del backend"
    exit 1
fi

echo "✅ Backend construido exitosamente"
echo ""

echo "📦 2/2 Construyendo Frontend (Nginx + Preact)..."
docker build -f Dockerfile.frontend -t peliculas-frontend:latest .

if [ $? -ne 0 ]; then
    echo "❌ Error al construir la imagen del frontend"
    exit 1
fi

echo "✅ Frontend construido exitosamente"
echo ""
echo "✅ Todas las imágenes construidas exitosamente!"
echo ""
echo "🚀 Para ejecutar con Docker Compose (RECOMENDADO):"
echo "   docker-compose up -d"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:8080"
echo "   Backend API: http://localhost:3000/api/movies"
echo ""
echo "📊 Ver logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Detener:"
echo "   docker-compose down"
