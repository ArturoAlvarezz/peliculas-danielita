import { useEffect, useRef, useState } from 'preact/hooks'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { MovieCard } from './MovieCard'
import { AddMovieButton } from './AddMovieButton'
import type { Movie } from '../app'
import { API_BASE_URL } from '../config'
import './MovieList.css'

interface MovieListProps {
  title: string
  movies: Movie[]
  setMovies: (movies: Movie[]) => void
}

interface OMDbMovie {
  Title: string
  Year: string
  imdbID: string
  Type: string
  Poster: string
}

interface OMDbSearchResponse {
  Search?: OMDbMovie[]
  Error?: string
  error?: string
}

interface OMDbMovieDetails extends OMDbMovie {
  imdbRating: string
  imdbVotes: string
  Error?: string
  error?: string
}

export function MovieList({ title, movies, setMovies }: MovieListProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OMDbMovie[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const searchRequestId = useRef(0)
  const searchDebounce = useRef<number | null>(null)
  const titleId = `movie-list-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = movies.findIndex((movie) => movie.id === active.id)
      const newIndex = movies.findIndex((movie) => movie.id === over.id)

      setMovies(arrayMove(movies, oldIndex, newIndex))
    }
  }

  const searchMovies = async (query: string, signal?: AbortSignal) => {
    const requestId = ++searchRequestId.current
    const normalizedQuery = query.trim()

    if (!normalizedQuery) {
      setSearchResults([])
      setSearchError('')
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    setSearchError('')
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/movies/search?query=${encodeURIComponent(normalizedQuery)}`,
        signal ? { signal } : undefined
      )
      const data = await response.json() as OMDbSearchResponse

      if (!response.ok) {
        throw new Error(data.error || data.Error || 'No se pudo buscar películas')
      }

      const results = data.Search || []
      if (requestId !== searchRequestId.current) return

      setSearchResults(results)
      if (results.length === 0) {
        setSearchError('No se encontraron películas con esa búsqueda.')
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      if (requestId !== searchRequestId.current) return
      console.error('Error al buscar películas:', error)
      setSearchResults([])
      setSearchError(error instanceof Error ? error.message : 'No se pudo buscar películas')
    } finally {
      if (requestId === searchRequestId.current) setIsSearching(false)
    }
  }

  useEffect(() => {
    const query = searchQuery.trim()
    const controller = new AbortController()

    if (searchDebounce.current !== null) {
      window.clearTimeout(searchDebounce.current)
    }

    setSearchError('')
    if (!query) {
      void searchMovies('', controller.signal)
      return () => controller.abort()
    }

    setSearchResults([])
    setIsSearching(true)
    const timeoutId = window.setTimeout(() => {
      void searchMovies(query, controller.signal)
    }, 300)
    searchDebounce.current = timeoutId

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
      if (searchDebounce.current === timeoutId) searchDebounce.current = null
    }
  }, [searchQuery])

  const handleSearch = () => {
    if (searchDebounce.current !== null) {
      window.clearTimeout(searchDebounce.current)
      searchDebounce.current = null
    }
    void searchMovies(searchQuery)
  }

  const handleSelectMovie = async (omdbMovie: OMDbMovie) => {
    setIsSearching(true)
    setSearchError('')
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/movies/details/${encodeURIComponent(omdbMovie.imdbID)}`
      )
      const details = await response.json() as OMDbMovieDetails

      if (!response.ok) {
        throw new Error(details.error || details.Error || 'No se pudo obtener la puntuación IMDb')
      }

      const year = Number.parseInt(details.Year, 10)
      const rating = Number.parseFloat(details.imdbRating)
      const voteCount = Number.parseInt(details.imdbVotes.replaceAll(',', ''), 10)
      const hasPoster = details.Poster && details.Poster !== 'N/A'
      const newMovie: Movie = {
        id: Date.now().toString(),
        title: details.Title,
        imageUrl: hasPoster ? details.Poster : `https://via.placeholder.com/200x300/FF6347/fff?text=${encodeURIComponent(details.Title)}`,
        imdbId: details.imdbID,
        year: Number.isNaN(year) ? undefined : year,
        rating: Number.isNaN(rating) ? undefined : rating,
        voteCount: Number.isNaN(voteCount) ? undefined : voteCount,
        type: details.Type
      }

      setMovies([...movies, newMovie])
      setSearchQuery('')
      setSearchResults([])
      setSearchError('')
      setShowAddForm(false)
    } catch (error) {
      console.error('Error al obtener el detalle de la película:', error)
      setSearchError(error instanceof Error ? error.message : 'No se pudo obtener la puntuación IMDb')
    } finally {
      setIsSearching(false)
    }
  }

  const handleDeleteMovie = (id: string) => {
    setMovies(movies.filter((movie) => movie.id !== id))
  }

  return (
    <section className="movie-list-section" aria-labelledby={titleId}>
      <div className="section-header">
        <h2 id={titleId} className="section-title">{title}</h2>
        <button 
          type="button"
          className={`btn-edit ${isEditMode ? 'active' : ''}`}
          aria-pressed={isEditMode}
          onClick={() => setIsEditMode(!isEditMode)}
        >
          {isEditMode ? '✓ Listo' : '✏️ Editar'}
        </button>
      </div>
      {isEditMode && (
        <p className="edit-hint" role="status">Usa el asa de cada tarjeta para reordenar sin bloquear el scroll.</p>
      )}
      <DndContext
        sensors={isEditMode ? sensors : []}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={movies.map((movie) => movie.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="movies-container">
            {movies.map((movie, index) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                index={index}
                onDelete={handleDeleteMovie}
                isEditMode={isEditMode}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isEditMode && (showAddForm ? (
        <form
          className="add-movie-form"
          aria-label={`Agregar una película a ${title}`}
          onSubmit={(event) => {
            event.preventDefault()
            void handleSearch()
          }}
        >
          <div className="search-container">
            <input
              id={`${titleId}-search`}
              type="text"
              placeholder="Buscar película en OMDb..."
              value={searchQuery}
              aria-label="Buscar película"
              aria-busy={isSearching}
              aria-describedby={searchError ? `${titleId}-search-error` : undefined}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              className="movie-input"
            />
          </div>

          {isSearching && (
            <p className="search-status" role="status" aria-live="polite">Buscando películas...</p>
          )}

          {searchError && (
            <p id={`${titleId}-search-error`} className="search-error" role="alert">{searchError}</p>
          )}

          {searchResults.length > 0 && (
            <div className="search-results" aria-label="Resultados de búsqueda" aria-live="polite">
              {searchResults.map((result) => (
                <button
                  type="button"
                  key={result.imdbID}
                  className="search-result-item"
                  aria-label={`Agregar ${result.Title}, ${result.Year}`}
                  disabled={isSearching}
                  onClick={() => handleSelectMovie(result)}
                >
                  <img 
                    src={result.Poster !== 'N/A' ? result.Poster : 'https://via.placeholder.com/80x120/cccccc/666666?text=Sin+Imagen'}
                    alt={result.Title}
                    className="result-image"
                  />
                  <div className="result-info">
                    <h4 className="result-title">{result.Title}</h4>
                    <div className="result-meta">
                      <span className="result-year">📅 {result.Year}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="form-buttons">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setSearchQuery('')
                setSearchResults([])
                setSearchError('')
              }}
              className="btn-cancel"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <AddMovieButton onClick={() => setShowAddForm(true)} />
      ))}
    </section>
  )
}
