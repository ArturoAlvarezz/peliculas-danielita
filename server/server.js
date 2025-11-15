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
      imageUrl: 'https://via.placeholder.com/200x300/8B4513/fff?text=LOTR'
    },
    {
      id: '2',
      title: 'Star Wars',
      imageUrl: 'https://via.placeholder.com/200x300/000000/fff?text=Star+Wars'
    },
    {
      id: '3',
      title: 'Titanic',
      imageUrl: 'https://via.placeholder.com/200x300/1E90FF/fff?text=Titanic'
    }
  ],
  watchList: [
    {
      id: '4',
      title: 'Inception',
      imageUrl: 'https://via.placeholder.com/200x300/4169E1/fff?text=Inception'
    },
    {
      id: '5',
      title: 'Interestelar',
      imageUrl: 'https://via.placeholder.com/200x300/191970/fff?text=Interestelar'
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

// GET - Obtener todas las películas
app.get('/api/movies', async (req, res) => {
  const data = await readData();
  res.json(data);
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
