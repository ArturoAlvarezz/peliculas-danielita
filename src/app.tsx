import { useState, useEffect } from 'preact/hooks'
import './app.css'
import { MovieList } from './components/MovieList'

export interface Movie {
  id: string
  title: string
  imageUrl: string
  imdbId?: string
  year?: number
  rating?: number
  voteCount?: number
  type?: string
}

// Usar variable de entorno o fallback para desarrollo local
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backend-peliculas.arturoalvarez.site';
const API_URL = `${API_BASE_URL}/api/movies`;

export function App() {
  const [topMovies, setTopMovies] = useState<Movie[]>([])
  const [watchList, setWatchList] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)

  // Cargar datos iniciales desde el servidor
  useEffect(() => {
    fetchMovies()
  }, [])

  const fetchMovies = async () => {
    try {
      const response = await fetch(API_URL)
      const data = await response.json()
      setTopMovies(data.topMovies || [])
      setWatchList(data.watchList || [])
      setLoading(false)
    } catch (error) {
      console.error('Error al cargar películas:', error)
      setLoading(false)
    }
  }

  // Función para actualizar top movies en el servidor
  const updateTopMovies = async (newMovies: Movie[]) => {
    setTopMovies(newMovies)
    try {
      await fetch(`${API_BASE_URL}/api/movies/top`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMovies)
      })
    } catch (error) {
      console.error('Error al guardar top movies:', error)
    }
  }

  // Función para actualizar watch list en el servidor
  const updateWatchList = async (newMovies: Movie[]) => {
    setWatchList(newMovies)
    try {
      await fetch(`${API_BASE_URL}/api/movies/watchlist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMovies)
      })
    } catch (error) {
      console.error('Error al guardar watch list:', error)
    }
  }

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">Cargando películas...</div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <MovieList
        title="Top películas de Arturin y Danielita"
        movies={topMovies}
        setMovies={updateTopMovies}
      />
      <MovieList
        title="Lista de películas para ver"
        movies={watchList}
        setMovies={updateWatchList}
      />
    </div>
  )
}
