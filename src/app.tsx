import { useEffect, useState } from 'preact/hooks'
import { MovieList } from './components/MovieList'
import { SearchSheet } from './components/SearchSheet'
import { API_BASE_URL, API_URL } from './config'

export interface Movie {
  id: string
  title: string
  imageUrl: string
  imdbId?: string
  tmdbId?: number
  mediaType?: 'movie' | 'tv'
  originalTitle?: string
  overview?: string
  year?: number
  rating?: number
  ratingSource?: string
  voteCount?: number
  type?: string
}

export interface StreamingProvider {
  id: number
  name: string
  logoUrl: string | null
  types: string[]
}

type ListKey = 'top' | 'watch'

const LISTS: Record<ListKey, { label: string; endpoint: string; empty: string }> = {
  top: { label: 'Nuestro top', endpoint: 'top', empty: 'Aún no hay favoritas. ¡Agrega la primera!' },
  watch: { label: 'Por ver', endpoint: 'watchlist', empty: 'Nada pendiente. Busca algo para la próxima noche de cine.' },
}

function readTab(): ListKey {
  try {
    return localStorage.getItem('peliculas-tab') === 'watch' ? 'watch' : 'top'
  } catch {
    return 'top'
  }
}

export function App() {
  const [topMovies, setTopMovies] = useState<Movie[]>([])
  const [watchList, setWatchList] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState<ListKey>(readTab)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null)

  useEffect(() => {
    void fetchMovies()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('peliculas-tab', tab)
    } catch {
      /* sin almacenamiento local */
    }
  }, [tab])

  useEffect(() => {
    if (!toast) return
    const timeoutId = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

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

  const saveList = async (key: ListKey, movies: Movie[]) => {
    const setter = key === 'top' ? setTopMovies : setWatchList
    const previous = key === 'top' ? topMovies : watchList
    setter(movies)
    try {
      const response = await fetch(`${API_BASE_URL}/api/movies/${LISTS[key].endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movies),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return true
    } catch (error) {
      console.error('Error al guardar:', error)
      setter(previous)
      setToast({ text: 'No se pudo guardar el cambio. Revisa la conexión.', error: true })
      return false
    }
  }

  const currentMovies = tab === 'top' ? topMovies : watchList

  const handleAdd = async (movie: Movie) => {
    const ok = await saveList(tab, [...currentMovies, movie])
    if (ok) setToast({ text: `“${movie.title}” agregada a ${LISTS[tab].label}` })
    return ok
  }

  const handleMarkWatched = async (movie: Movie) => {
    const okWatch = await saveList('watch', watchList.filter((item) => item.id !== movie.id))
    if (!okWatch) return
    const okTop = await saveList('top', [...topMovies, movie])
    if (okTop) setToast({ text: `“${movie.title}” pasó a Nuestro top` })
  }

  if (loading) {
    return (
      <main className="shell" aria-busy="true">
        <div className="skeleton-list" role="status" aria-label="Cargando películas">
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton-card" />)}
        </div>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="shell">
        <div className="state-box" role="alert">
          <p className="state-emoji" aria-hidden="true">🎞️</p>
          <p>{loadError}</p>
          <button type="button" className="btn btn-primary" onClick={() => void fetchMovies()}>
            Reintentar
          </button>
        </div>
      </main>
    )
  }

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="hero-kicker">🍿 Noche de cine</p>
          <h1 className="hero-title">Arturin <span>&amp;</span> Danielita</h1>
          <p className="hero-subtitle">
            {topMovies.length} favoritas · {watchList.length} por ver
          </p>
        </div>
      </header>

      <main className="shell">
        <div className="toolbar">
          <div className="tabs" role="tablist" aria-label="Listas">
            {(Object.keys(LISTS) as ListKey[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`tab ${tab === key ? 'is-active' : ''}`}
                onClick={() => {
                  setTab(key)
                  setIsEditMode(false)
                }}
              >
                {LISTS[key].label}
                <span className="tab-count">{key === 'top' ? topMovies.length : watchList.length}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`btn btn-ghost ${isEditMode ? 'is-on' : ''}`}
            aria-pressed={isEditMode}
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? 'Listo' : 'Editar'}
          </button>
        </div>

        {isEditMode && (
          <p className="hint" role="status">Arrastra con el asa ⠿ para reordenar. Los cambios se guardan solos.</p>
        )}

        <MovieList
          key={tab}
          movies={currentMovies}
          ranked={tab === 'top'}
          emptyText={LISTS[tab].empty}
          isEditMode={isEditMode}
          onChange={(movies) => void saveList(tab, movies)}
          onMarkWatched={tab === 'watch' ? (movie) => void handleMarkWatched(movie) : undefined}
        />

        <footer className="attribution">
          Búsqueda y plataformas con datos de{' '}
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">TMDB</a> y{' '}
          <a href="https://www.justwatch.com" target="_blank" rel="noreferrer">JustWatch</a>; puntuaciones de IMDb vía OMDb.
          Este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB.
        </footer>
      </main>

      <button type="button" className="fab" onClick={() => setIsSearchOpen(true)}>
        <span aria-hidden="true">+</span> Agregar
      </button>

      {isSearchOpen && (
        <SearchSheet
          listLabel={LISTS[tab].label}
          existing={[...topMovies, ...watchList]}
          onAdd={handleAdd}
          onClose={() => setIsSearchOpen(false)}
        />
      )}

      {toast && (
        <div className={`toast ${toast.error ? 'is-error' : ''}`} role={toast.error ? 'alert' : 'status'}>
          {toast.text}
        </div>
      )}
    </>
  )
}
