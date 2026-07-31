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

// Crear directorio de datos si no existe
try {
  await fs.mkdir(DATA_DIR, { recursive: true });
} catch (err) {
  console.log('Directory already exists or error creating it:', err.message);
}

// Configurar CORS para permitir acceso desde el dominio de producción
const corsOptions = {
  origin: [
    'https://peliculas.arturoalvarez.site',
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
  const response = await fetch(`${OMDB_API_URL}?${params}`);
  const data = await response.json();

  if (!response.ok || data.Response === 'False') return null;
  return data;
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

// GET - Buscar películas en OMDb sin exponer la clave al navegador
app.get('/api/movies/search', async (req, res) => {
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  const apiKey = process.env.OMDB_API_KEY;

  if (!query) {
    return res.status(400).json({ error: 'Se requiere un texto de búsqueda' });
  }

  if (!apiKey) {
    return res.status(503).json({ error: 'OMDB_API_KEY no está configurada en el servidor' });
  }

  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      s: query,
      type: 'movie',
      page: '1',
      r: 'json'
    });
    const response = await fetch(`${OMDB_API_URL}?${params}`);
    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: 'No se pudo consultar OMDb' });
    }

    if (data.Response === 'False') {
      if (data.Error === 'Movie not found!') {
        return res.json({ Search: [] });
      }

      return res.status(502).json({ error: data.Error || 'No se pudo buscar en OMDb' });
    }

    return res.json({ Search: data.Search || [] });
  } catch (error) {
    console.error('Error searching OMDb:', error);
    return res.status(502).json({ error: 'No se pudo consultar OMDb' });
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
