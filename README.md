# Películas de Arturin y Danielita

Aplicación Preact para mantener dos listas de películas, reordenarlas y agregar títulos mediante una búsqueda en OMDb. El backend Express sirve la aplicación compilada, expone la API y guarda las listas en un archivo JSON.

## Requisitos

- Node.js 20.19 o superior. Los contenedores usan Node.js 20.
- pnpm 10.12.1, fijado en `package.json`.
- Una clave de OMDb para habilitar la búsqueda: [solicitar clave en OMDb](https://www.omdbapi.com/apikey.aspx).
- Docker y Docker Buildx para construir o publicar la imagen.
- Nginx y certificados TLS solo si se usará un proxy inverso en producción.

Comprobar las herramientas antes de comenzar:

```bash
node --version
pnpm --version
docker --version
docker buildx version
```

## Instalación

Instalar las dependencias respetando el lockfile:

```bash
pnpm install --frozen-lockfile
```

## Variables de Entorno

| Variable | Dónde se configura | Obligatoria | Uso |
| --- | --- | --- | --- |
| `OMDB_API_KEY` | Backend o contenedor, en runtime | Sí para buscar películas | Clave privada para consultar OMDb. No debe comenzar con `VITE_`. |
| `TMDB_API_KEY` | Backend o contenedor, en runtime | Sí para plataformas | Clave privada para consultar disponibilidad en TMDB/JustWatch. |
| `WATCH_REGION` | Backend o contenedor, en runtime | No | Región ISO 3166-1 usada para disponibilidad. Por defecto `CL` (Chile). |
| `DATA_DIR` | Backend o contenedor, en runtime | No | Directorio del archivo `data.json`. En Docker se usa `/app/data`. |
| `PORT` | Backend o contenedor, en runtime | No | Puerto de Express. Por defecto es `3000`. |
| `VITE_API_URL` | Frontend, durante desarrollo o build | No | Origin del backend sin `/api`. La imagen unificada usa `__SAME_ORIGIN__`. |

`VITE_*` se incorpora al JavaScript del navegador, por lo que nunca se deben colocar `OMDB_API_KEY` ni `TMDB_API_KEY` allí. El backend no carga archivos `.env` automáticamente; las claves deben estar exportadas en la shell o pasarla explícitamente al contenedor.

## Desarrollo Local

Usar dos terminales. En la primera, configurar la clave y arrancar Express con un directorio temporal para no modificar `server/data.json`:

```bash
export OMDB_API_KEY="tu-clave-de-omdb"
export TMDB_API_KEY="tu-clave-de-tmdb"
OMDB_API_KEY="$OMDB_API_KEY" \
TMDB_API_KEY="$TMDB_API_KEY" \
WATCH_REGION=CL \
DATA_DIR=/tmp/peliculas-danielita-data \
pnpm dev:server
```

En la segunda, apuntar Vite al backend local:

```bash
VITE_API_URL=http://localhost:3000 pnpm dev
```

Abrir `http://localhost:5173`. Si no se define `VITE_API_URL`, el frontend usa el backend configurado por defecto, no el backend local.

Para comprobar la API sin abrir el frontend:

```bash
curl http://localhost:3000/api/movies
curl -G \
  --data-urlencode "query=Batman" \
  http://localhost:3000/api/movies/search
```

Sin `OMDB_API_KEY`, la búsqueda devuelve `503` con un mensaje indicando que falta la configuración.

## Verificación

El build ejecuta el typecheck de TypeScript y la compilación de Vite:

```bash
pnpm build
```

Para previsualizar el frontend compilado:

```bash
pnpm preview
```

No hay scripts de tests, lint ni formatter configurados en este repositorio.

## Docker: Imagen Unificada

La imagen canónica es `Dockerfile`. Compila el frontend y ejecuta Express, que sirve ambos por el puerto `3000`.

No hay un archivo `docker-compose.yml` incluido; los comandos de Compose de los scripts legacy no se pueden usar sin crear uno.

Construir localmente:

```bash
./docker-build.sh
```

Ejecutar manteniendo las listas en un volumen Docker:

```bash
export OMDB_API_KEY="tu-clave-de-omdb"
docker run -d \
  --name peliculas-danielita \
  --restart unless-stopped \
  -p 3000:3000 \
  -v peliculas-data:/app/data \
  -e OMDB_API_KEY="$OMDB_API_KEY" \
  -e TMDB_API_KEY="$TMDB_API_KEY" \
  -e WATCH_REGION="${WATCH_REGION:-CL}" \
  peliculas-danielita:latest
```

La aplicación estará disponible en `http://localhost:3000`. El volumen contiene `/app/data/data.json`; no eliminarlo al actualizar el contenedor.

La imagen usa `VITE_API_URL=__SAME_ORIGIN__` por defecto, por lo que el navegador llama a `/api/movies` en el mismo host y puerto públicos. Para construir el frontend contra otro backend, pasar un origin explícito sin `/api`:

```bash
VITE_API_URL=https://backend.example.com ./docker-build.sh
```

La variable `VITE_API_URL` se fija al construir la imagen; cambiarla después de arrancar el contenedor no modifica el frontend. `OMDB_API_KEY`, en cambio, se pasa al arrancar el contenedor y no requiere reconstruir la imagen.

## Publicar en Docker Hub

Iniciar sesión antes de publicar:

```bash
docker login
```

Publicar una imagen multi-arquitectura `amd64` y `arm64`:

```bash
./docker-deploy.sh tu-usuario-dockerhub
```

Publicar solo para ARM64:

```bash
PLATFORMS=linux/arm64 ./docker-deploy.sh tu-usuario-dockerhub
```

El script publica `tu-usuario-dockerhub/peliculas-danielita:latest`. Se puede cambiar la etiqueta con `VERSION` o el nombre completo con `IMAGE_NAME`:

```bash
VERSION=2026-01 IMAGE_NAME=tu-usuario/peliculas-danielita ./docker-deploy.sh tu-usuario-dockerhub
```

## CI/CD

El workflow `.github/workflows/deploy.yml` publica automáticamente la imagen unificada cuando se hace push a `main` y también se puede ejecutar manualmente desde GitHub Actions. Configurar estos secrets en el repositorio de GitHub:

- `DOCKER_USERNAME`: usuario de Docker Hub.
- `DOCKER_TOKEN`: access token de Docker Hub, no la contraseña.

El workflow publica `${DOCKER_USERNAME}/peliculas-danielita:latest` para `linux/amd64` y `linux/arm64`. La clave `OMDB_API_KEY` no se necesita durante el build; debe pasarse al ejecutar el contenedor.

## Nginx en Producción

El contenedor debe quedar accesible localmente en `localhost:3000`. El archivo `nginx-server-config.conf` ya está preparado para enviar tanto el frontend como `/api` al mismo contenedor.

Pasos manuales:

1. Ajustar `server_name` y las rutas de los certificados en `nginx-server-config.conf`.
2. Copiar la configuración a la instalación de Nginx:

   ```bash
   sudo cp nginx-server-config.conf /etc/nginx/sites-available/peliculas.arturoalvarez.site
   sudo ln -s /etc/nginx/sites-available/peliculas.arturoalvarez.site /etc/nginx/sites-enabled/peliculas.arturoalvarez.site
   ```

3. Verificar y recargar Nginx:

   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. Crear o renovar los certificados TLS antes de activar las rutas configuradas en `ssl_certificate` y `ssl_certificate_key`.

El DNS del dominio debe apuntar al servidor donde corre Nginx. No se debe configurar un proxy separado para frontend y API cuando se usa la imagen unificada.

## API y Datos

Endpoints principales:

- `GET /api/movies`: obtiene `topMovies` y `watchList`.
- `PUT /api/movies/top`: reemplaza la lista de mejores películas con el array enviado.
- `PUT /api/movies/watchlist`: reemplaza la lista para ver con el array enviado.
- `GET /api/movies/search?query=Batman`: busca películas en OMDb desde el backend.
- `GET /api/movies/details/:imdbId`: obtiene la puntuación IMDb y los votos de un título.
- `GET /api/movies/providers/:imdbId`: obtiene plataformas disponibles para la región configurada.

El backend inicializa el archivo con los datos definidos en `getInitialData()` cuando el archivo persistente todavía no existe. El archivo rastreado `server/data.json` solo se utiliza si `DATA_DIR` apunta explícitamente a `server`.

La disponibilidad de plataformas la proporciona TMDB mediante datos de JustWatch. Se muestra para la región `WATCH_REGION` y requiere atribución a JustWatch; no está incluida en OMDb.

## Flujo Legacy

`Dockerfile.backend`, `Dockerfile.frontend` y los scripts `docker-build-separated.sh`, `docker-deploy-separated.sh` y `docker-deploy-arm.sh` conservan el flujo antiguo de dos imágenes. Para nuevas instalaciones se recomienda `Dockerfile`, `docker-build.sh` y `docker-deploy.sh`.
