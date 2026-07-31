import { useState, useEffect } from 'preact/hooks'
import './app.css'
import { MovieList } from './components/MovieList'
import { API_BASE_URL, API_URL } from './config'

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

export interface StreamingProvider {
  id: number
  name: string
  logoUrl: string | null
  types: string[]
}

export function App() {
  const [topMovies, setTopMovies] = useState<Movie[]>([])
  const [watchList, setWatchList] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Cargar datos iniciales desde el servidor
  useEffect(() => {
    fetchMovies()
  }, [])

  const fetchMovies = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await fetch(API_URL)
      if (!response.ok) throw new Error('No se pudieron cargar las películas')

      const data = await response.json()
      setTopMovies(data.topMovies || [])
      setWatchList(data.watchList || [])
    } catch (error) {
      console.error('Error al cargar películas:', error)
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar las películas')
    } finally {
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
      <main className="app-container" aria-busy="true">
        <p className="loading" role="status" aria-live="polite">Cargando películas...</p>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="app-container">
        <div className="load-error" role="alert">
          <p>{loadError}</p>
          <button type="button" className="btn-retry" onClick={() => void fetchMovies()}>
            Reintentar
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="app-container" aria-label="Listas de películas">
      <header className="app-header">
        <p className="app-kicker">Nuestra colección</p>
        <h1 className="app-title">Películas de Arturin y Danielita</h1>
        <p className="app-subtitle">Ordena, descubre y guarda las próximas películas para ver.</p>
      </header>
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
      <footer className="app-attribution">
        Disponibilidad de plataformas basada en datos de{' '}
        <a href="https://www.justwatch.com" target="_blank" rel="noreferrer">JustWatch</a>{' '}
        a través de <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">TMDB</a>.
      </footer>
    </main>
  )
}
