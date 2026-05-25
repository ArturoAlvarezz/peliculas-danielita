# Películas Danielita

Aplicación web para listado y gestión de películas, construida con Preact + TypeScript (frontend) y Node.js Express (backend).

## Stack

- **Frontend**: Preact + TypeScript + Vite (servido con Nginx, puerto 8067)
- **Backend**: Node.js 20 + Express + pnpm (puerto 3000/8068)
- **Base de datos**: JSON persistente en volumen (`/app/data`)

## Contenedores Docker

| Servicio  | Imagen Docker Hub                            | Puerto | Dockerfile              |
|-----------|----------------------------------------------|--------|-------------------------|
| Frontend  | `arturoalvarez/peliculas-frontend:latest`    | 8067   | `Dockerfile.frontend`   |
| Backend   | `arturoalvarez/peliculas-backend:latest`     | 8068   | `Dockerfile.backend`    |

## Estructura del proyecto

```
peliculas-danielita/
├── src/                  # Código fuente Preact/TypeScript (frontend)
│   ├── app.tsx
│   ├── main.tsx
│   └── components/       # Componentes UI
├── server/               # Backend Express
│   ├── server.js
│   └── data.json
├── Dockerfile.frontend   # Build multi-stage con Nginx
├── Dockerfile.backend    # Servidor Node.js Express
├── nginx-frontend.conf   # Config Nginx para frontend
├── docker-compose.yml
├── package.json
├── vite.config.ts
├── nginx-server-config.conf
├── .env.production
├── README.md
└── AGENTS.md
```

## CI/CD

El workflow de GitHub Actions (`deploy.yml`) se encarga de:
1. Buildear las imágenes Docker (backend y frontend)
2. Pushearlas a Docker Hub
3. Los secrets `DOCKER_USERNAME` y `DOCKER_TOKEN` deben estar configurados en GitHub

## Variables de entorno

- `VITE_API_URL`: URL base de la API para el frontend (en tiempo de build)
- `DATA_DIR`: Directorio donde se almacenan los datos JSON (backend)
