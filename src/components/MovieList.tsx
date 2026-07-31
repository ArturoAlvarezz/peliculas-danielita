import { useState } from 'preact/hooks'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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

export function MovieList({ title, movies, setMovies }: MovieListProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OMDbMovie[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    setSearchError('')
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/movies/search?query=${encodeURIComponent(searchQuery)}`
      )
      const data = await response.json() as OMDbSearchResponse

      if (!response.ok) {
        throw new Error(data.error || data.Error || 'No se pudo buscar películas')
      }

      const results = data.Search || []
      setSearchResults(results)
      if (results.length === 0) {
        setSearchError('No se encontraron películas con esa búsqueda.')
      }
    } catch (error) {
      console.error('Error al buscar películas:', error)
      setSearchResults([])
      setSearchError(error instanceof Error ? error.message : 'No se pudo buscar películas')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectMovie = (omdbMovie: OMDbMovie) => {
    const year = Number.parseInt(omdbMovie.Year, 10)
    const hasPoster = omdbMovie.Poster && omdbMovie.Poster !== 'N/A'
    const newMovie: Movie = {
      id: Date.now().toString(),
      title: omdbMovie.Title,
      imageUrl: hasPoster ? omdbMovie.Poster : `https://via.placeholder.com/200x300/FF6347/fff?text=${encodeURIComponent(omdbMovie.Title)}`,
      imdbId: omdbMovie.imdbID,
      year: Number.isNaN(year) ? undefined : year,
      type: omdbMovie.Type
    }
    setMovies([...movies, newMovie])
    setSearchQuery('')
    setSearchResults([])
    setSearchError('')
    setShowAddForm(false)
  }

  const handleDeleteMovie = (id: string) => {
    setMovies(movies.filter((movie) => movie.id !== id))
  }

  return (
    <div className="movie-list-section">
      <div className="section-header">
        <h1 className="section-title">{title}</h1>
        <button 
          className={`btn-edit ${isEditMode ? 'active' : ''}`}
          onClick={() => setIsEditMode(!isEditMode)}
        >
          {isEditMode ? '✓ Listo' : '✏️ Editar'}
        </button>
      </div>
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
        <div className="add-movie-form">
          <div className="search-container">
            <input
              type="text"
              placeholder="Buscar película en OMDb..."
              value={searchQuery}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="movie-input"
            />
            <button 
              onClick={handleSearch} 
              className="btn-search"
              disabled={isSearching}
            >
              {isSearching ? '🔍 Buscando...' : '🔍 Buscar'}
            </button>
          </div>

          {searchError && (
            <p className="search-error" role="alert">{searchError}</p>
          )}

          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result) => (
                <div 
                  key={result.imdbID}
                  className="search-result-item"
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
                </div>
              ))}
            </div>
          )}

          <div className="form-buttons">
            <button
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
        </div>
      ) : (
        <AddMovieButton onClick={() => setShowAddForm(true)} />
      ))}
    </div>
  )
}
