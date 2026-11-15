import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
// Usar /app/data para persistencia o fallback a la ubicación actual
const DATA_DIR = process.env.DATA_DIR || '/app/data';
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const OMDB_API_URL = 'https://www.omdbapi.com/';
const TMDB_API_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w92';
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_LANGUAGE = process.env.TMDB_LANGUAGE || 'es-CL';
const WATCH_REGION = (process.env.WATCH_REGION || 'CL').toUpperCase();
const providerCache = new Map();
const PROVIDER_CACHE_TTL = 6 * 60 * 60 * 1000;

// Crear directorio de datos si no existe
try {
  await fs.mkdir(DATA_DIR, { recursive: true });
} catch (err) {
  console.log('Directory already exists or error creating it:', err.message);
}

// Configurar CORS para permitir acceso desde el dominio de producción
const corsOptions = {
  origin: [
    'https://peliculas.arturoalvarez.dev',
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('dist'));

// Datos iniciales
const getInitialData = () => ({
  topMovies: [
    {
      id: '1',
      title: 'El Señor de los Anillos',
      imageUrl: 'https://via.placeholder.com/200x300/8B4513/fff?text=LOTR',
      year: 2001,
      rating: 8.8,
      type: 'movie'
    },
    {
      id: '2',
      title: 'Star Wars',
      imageUrl: 'https://via.placeholder.com/200x300/000000/fff?text=Star+Wars',
      year: 1977,
      rating: 8.6,
      type: 'movie'
    },
    {
      id: '3',
      title: 'Titanic',
      imageUrl: 'https://via.placeholder.com/200x300/1E90FF/fff?text=Titanic',
      year: 1997,
      rating: 7.9,
      type: 'movie'
    }
  ],
  watchList: [
    {
      id: '4',
      title: 'Inception',
      imageUrl: 'https://via.placeholder.com/200x300/4169E1/fff?text=Inception',
      year: 2010,
      rating: 8.8,
      type: 'movie'
    },
    {
      id: '5',
      title: 'Interestelar',
      imageUrl: 'https://via.placeholder.com/200x300/191970/fff?text=Interestelar',
      year: 2014,
      rating: 8.6,
      type: 'movie'
    }
  ]
});

// Leer datos
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const parsedData = JSON.parse(data);
    
    // Si el archivo existe pero está vacío o las listas están vacías, usar datos iniciales
    if (!parsedData.topMovies || !parsedData.watchList || 
        (parsedData.topMovies.length === 0 && parsedData.watchList.length === 0)) {
      console.log('⚠️ Datos vacíos detectados, inicializando con datos por defecto...');
      const initialData = getInitialData();
      await writeData(initialData);
      return initialData;
    }
    
    return parsedData;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Archivo no existe, crear con datos iniciales
      console.log('📝 Archivo no existe, creando con datos iniciales...');
      const initialData = getInitialData();
      await writeData(initialData);
      return initialData;
    }
    console.error('❌ Error reading data:', error);
    return { topMovies: [], watchList: [] };
  }
}

// Escribir datos
async function writeData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data:', error);
    return false;
  }
}

function parseOmdbNumber(value) {
  if (typeof value !== 'string' || value === 'N/A') return undefined;

  const parsed = Number.parseFloat(value.replaceAll(',', ''));
  return Number.isNaN(parsed) ? undefined : parsed;
}

async function fetchOmdbDetails(imdbId, apiKey) {
  const params = new URLSearchParams({
    apikey: apiKey,
    i: imdbId,
    plot: 'short',
    r: 'json'
  });
  const response = await fetchWithRetry(`${OMDB_API_URL}?${params}`);
  const data = await response.json();

  if (!response.ok || data.Response === 'False') return null;
  return data;
}

async function fetchWithRetry(url, { retries = 2, timeoutMs = 8000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (response.status >= 500 && attempt < retries) {
        lastError = new Error(`HTTP ${response.status}`);
      } else {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }
  throw lastError;
}

async function fetchTmdb(pathname, params = {}) {
  const query = new URLSearchParams({
    api_key: TMDB_API_KEY,
    ...params
  });
  const response = await fetchWithRetry(`${TMDB_API_URL}${pathname}?${query}`);

  if (!response.ok) throw new Error(`TMDB request failed with ${response.status}`);
  return response.json();
}

function tmdbPoster(pathValue, size = 'w500') {
  return pathValue ? `https://image.tmdb.org/t/p/${size}${pathValue}` : null;
}

function parseYear(value) {
  const year = Number.parseInt(String(value || '').slice(0, 4), 10);
  return Number.isNaN(year) ? undefined : year;
}

async function searchTmdb(query) {
  const data = await fetchTmdb('/search/multi', {
    query,
    language: TMDB_LANGUAGE,
    include_adult: 'false',
    page: '1'
  });

  return (data.results || [])
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 12)
    .map((item) => ({
      tmdbId: item.id,
      mediaType: item.media_type,
      title: item.title || item.name,
      originalTitle: item.original_title || item.original_name,
      year: parseYear(item.release_date || item.first_air_date),
      posterUrl: tmdbPoster(item.poster_path, 'w185'),
      overview: item.overview || '',
      tmdbRating: item.vote_average || undefined
    }));
}

async function searchOmdb(query, apiKey) {
  const params = new URLSearchParams({ apikey: apiKey, s: query, page: '1', r: 'json' });
  const response = await fetchWithRetry(`${OMDB_API_URL}?${params}`);
  const data = await response.json();

  if (!response.ok) throw new Error('No se pudo consultar OMDb');
  if (data.Response === 'False') {
    if (data.Error === 'Movie not found!') return [];
    throw new Error(data.Error || 'No se pudo buscar en OMDb');
  }

  return (data.Search || [])
    .filter((item) => item.Type === 'movie' || item.Type === 'series')
    .map((item) => ({
      imdbId: item.imdbID,
      mediaType: item.Type === 'series' ? 'tv' : 'movie',
      title: item.Title,
      year: parseYear(item.Year),
      posterUrl: item.Poster && item.Poster !== 'N/A' ? item.Poster : null,
      overview: ''
    }));
}

async function enrichMovieRatings(data) {
  const apiKey = process.env.OMDB_API_KEY;
  const movies = [...data.topMovies, ...data.watchList];
  const moviesToEnrich = movies.filter((movie) => (
    movie.imdbId && (typeof movie.rating !== 'number' || typeof movie.voteCount !== 'number')
  ));

  if (!apiKey || moviesToEnrich.length === 0) return data;

  const enrichedMovies = await Promise.all(moviesToEnrich.map(async (movie) => {
    try {
      const details = await fetchOmdbDetails(movie.imdbId, apiKey);
      if (!details) return movie;

      const rating = parseOmdbNumber(details.imdbRating);
      const voteCount = parseOmdbNumber(details.imdbVotes);
      return {
        ...movie,
        rating: rating ?? movie.rating,
        voteCount: voteCount ?? movie.voteCount
      };
    } catch (error) {
      console.error(`Error enriching movie ${movie.imdbId}:`, error);
      return movie;
    }
  }));

  const enrichedById = new Map(enrichedMovies.map((movie) => [movie.id, movie]));
  const updateList = (list) => list.map((movie) => enrichedById.get(movie.id) || movie);
  const enrichedData = {
    ...data,
    topMovies: updateList(data.topMovies),
    watchList: updateList(data.watchList)
  };

  const changed = enrichedMovies.some((movie, index) => {
    const original = moviesToEnrich[index];
    return movie.rating !== original.rating || movie.voteCount !== original.voteCount;
  });

  if (changed) await writeData(enrichedData);
  return enrichedData;
}

// GET - Buscar películas y series (TMDB en español; OMDb como respaldo)
app.get('/api/movies/search', async (req, res) => {
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  const apiKey = process.env.OMDB_API_KEY;

  if (!query) {
    return res.status(400).json({ error: 'Se requiere un texto de búsqueda' });
  }

  if (TMDB_API_KEY) {
    try {
      return res.json({ source: 'tmdb', results: await searchTmdb(query) });
    } catch (error) {
      console.error('Error searching TMDB, falling back to OMDb:', error.message);
    }
  }

  if (!apiKey) {
    return res.status(503).json({ error: 'No hay ninguna API de búsqueda configurada' });
  }

  try {
    return res.json({ source: 'omdb', results: await searchOmdb(query, apiKey) });
  } catch (error) {
    console.error('Error searching OMDb:', error);
    return res.status(502).json({ error: 'No se pudo buscar películas. Intenta de nuevo.' });
  }
});

// GET - Resolver un resultado de búsqueda a una película lista para guardar
app.get('/api/movies/resolve', async (req, res) => {
  const mediaType = req.query.mediaType === 'tv' ? 'tv' : 'movie';
  const tmdbId = Number.parseInt(String(req.query.tmdbId || ''), 10);
  let imdbId = typeof req.query.imdbId === 'string' && /^tt\d+$/.test(req.query.imdbId) ? req.query.imdbId : undefined;
  const apiKey = process.env.OMDB_API_KEY;
  const movie = { mediaType, type: mediaType === 'tv' ? 'tvSeries' : 'movie' };

  try {
    if (!Number.isNaN(tmdbId) && TMDB_API_KEY) {
      const details = await fetchTmdb(`/${mediaType}/${tmdbId}`, {
        language: TMDB_LANGUAGE,
        append_to_response: 'external_ids'
      });
      imdbId = imdbId || details.imdb_id || details.external_ids?.imdb_id || undefined;
      Object.assign(movie, {
        tmdbId,
        title: details.title || details.name,
        originalTitle: details.original_title || details.original_name,
        year: parseYear(details.release_date || details.first_air_date),
        imageUrl: tmdbPoster(details.poster_path),
        rating: details.vote_average ? Math.round(details.vote_average * 10) / 10 : undefined,
        voteCount: details.vote_count || undefined,
        ratingSource: 'TMDB'
      });
    }

    if (imdbId && apiKey) {
      const omdb = await fetchOmdbDetails(imdbId, apiKey).catch(() => null);
      if (omdb) {
        const rating = parseOmdbNumber(omdb.imdbRating);
        const voteCount = parseOmdbNumber(omdb.imdbVotes);
        movie.title = movie.title || omdb.Title;
        movie.year = movie.year ?? parseYear(omdb.Year);
        if (!movie.imageUrl && omdb.Poster && omdb.Poster !== 'N/A') movie.imageUrl = omdb.Poster;
        if (rating !== undefined) {
          movie.rating = rating;
          movie.voteCount = voteCount;
          movie.ratingSource = 'IMDb';
        }
      }
    }

    if (!movie.title) {
      return res.status(404).json({ error: 'No se encontró la película' });
    }

    movie.imdbId = imdbId;
    return res.json(movie);
  } catch (error) {
    console.error('Error resolving movie:', error);
    return res.status(502).json({ error: 'No se pudo obtener el detalle. Intenta de nuevo.' });
  }
});

// GET - Obtener el detalle de una película de OMDb
app.get('/api/movies/details/:imdbId', async (req, res) => {
  const { imdbId } = req.params;
  const apiKey = process.env.OMDB_API_KEY;

  if (!/^tt\d+$/.test(imdbId)) {
    return res.status(400).json({ error: 'IMDb ID inválido' });
  }

  if (!apiKey) {
    return res.status(503).json({ error: 'OMDB_API_KEY no está configurada en el servidor' });
  }

  try {
    const details = await fetchOmdbDetails(imdbId, apiKey);
    if (!details) {
      return res.status(502).json({ error: 'No se pudo obtener el detalle desde OMDb' });
    }

    return res.json(details);
  } catch (error) {
    console.error('Error getting OMDb movie details:', error);
    return res.status(502).json({ error: 'No se pudo consultar OMDb' });
  }
});

// GET - Obtener plataformas disponibles por región desde TMDB/JustWatch
app.get('/api/movies/providers/:imdbId', async (req, res) => {
  const { imdbId } = req.params;

  if (!/^tt\d+$/.test(imdbId)) {
    return res.status(400).json({ error: 'IMDb ID inválido' });
  }

  if (!TMDB_API_KEY) {
    return res.status(503).json({
      error: 'TMDB_API_KEY no está configurada en el servidor',
      region: WATCH_REGION,
      providers: []
    });
  }

  const cacheKey = `${WATCH_REGION}:${imdbId}`;
  const cached = providerCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PROVIDER_CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    const matches = await fetchTmdb(`/find/${imdbId}`, { external_source: 'imdb_id' });
    const movie = matches.movie_results?.[0];
    const show = matches.tv_results?.[0];

    if (!movie && !show) {
      const emptyData = { region: WATCH_REGION, providers: [], link: null };
      providerCache.set(cacheKey, { timestamp: Date.now(), data: emptyData });
      return res.json(emptyData);
    }

    const watchProviders = await fetchTmdb(movie ? `/movie/${movie.id}/watch/providers` : `/tv/${show.id}/watch/providers`);
    const regionData = watchProviders.results?.[WATCH_REGION];
    const providerGroups = [
      ['Streaming', regionData?.flatrate],
      ['Gratis', regionData?.free],
      ['Con anuncios', regionData?.ads],
      ['Alquiler', regionData?.rent],
      ['Compra', regionData?.buy]
    ];
    const providersById = new Map();

    for (const [type, providers] of providerGroups) {
      for (const provider of providers || []) {
        const current = providersById.get(provider.provider_id) || {
          id: provider.provider_id,
          name: provider.provider_name,
          logoUrl: provider.logo_path ? `${TMDB_IMAGE_URL}${provider.logo_path}` : null,
          types: []
        };
        if (!current.types.includes(type)) current.types.push(type);
        providersById.set(provider.provider_id, current);
      }
    }

    const result = {
      region: WATCH_REGION,
      providers: [...providersById.values()],
      link: regionData?.link || null
    };
    providerCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return res.json(result);
  } catch (error) {
    console.error(`Error getting providers for ${imdbId}:`, error);
    return res.status(502).json({
      error: 'No se pudo consultar la disponibilidad',
      region: WATCH_REGION,
      providers: []
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, omdb: Boolean(process.env.OMDB_API_KEY), tmdb: Boolean(TMDB_API_KEY), region: WATCH_REGION });
});

// GET - Obtener todas las películas
app.get('/api/movies', async (req, res) => {
  const data = await readData();
  res.json(await enrichMovieRatings(data));
});

// PUT - Actualizar top movies
app.put('/api/movies/top', async (req, res) => {
  const data = await readData();
  data.topMovies = req.body;
  const success = await writeData(data);
  
  if (success) {
    res.json({ success: true, data: data.topMovies });
  } else {
    res.status(500).json({ success: false, error: 'Error saving data' });
  }
});

// PUT - Actualizar watch list
app.put('/api/movies/watchlist', async (req, res) => {
  const data = await readData();
  data.watchList = req.body;
  const success = await writeData(data);
  
  if (success) {
    res.json({ success: true, data: data.watchList });
  } else {
    res.status(500).json({ success: false, error: 'Error saving data' });
  }
});

// Servir la aplicación React/Preact para todas las rutas no-API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎬 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 API disponible en http://localhost:${PORT}/api/movies`);
});
