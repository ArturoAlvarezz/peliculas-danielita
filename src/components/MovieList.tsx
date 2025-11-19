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
import './MovieList.css'

interface MovieListProps {
  title: string
  movies: Movie[]
  setMovies: (movies: Movie[]) => void
}

interface IMDbTitle {
  id: string
  type: string
  primaryTitle: string
  originalTitle: string
  primaryImage?: {
    url: string
    width: number
    height: number
  }
  startYear: number
  rating?: {
    aggregateRating: number
    voteCount: number
  }
}

export function MovieList({ title, movies, setMovies }: MovieListProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<IMDbTitle[]>([])
  const [isSearching, setIsSearching] = useState(false)

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
    try {
      const response = await fetch(
        `https://api.imdbapi.dev/search/titles?query=${encodeURIComponent(searchQuery)}&limit=10`
      )
      const data = await response.json()
      setSearchResults(data.titles || [])
    } catch (error) {
      console.error('Error al buscar películas:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectMovie = (imdbMovie: IMDbTitle) => {
    const newMovie: Movie = {
      id: Date.now().toString(),
      title: imdbMovie.primaryTitle,
      imageUrl: imdbMovie.primaryImage?.url || `https://via.placeholder.com/200x300/FF6347/fff?text=${encodeURIComponent(imdbMovie.primaryTitle)}`,
      imdbId: imdbMovie.id,
      year: imdbMovie.startYear,
      rating: imdbMovie.rating?.aggregateRating,
      voteCount: imdbMovie.rating?.voteCount,
      type: imdbMovie.type
    }
    setMovies([...movies, newMovie])
    setSearchQuery('')
    setSearchResults([])
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
              placeholder="Buscar película en IMDb..."
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

          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result) => (
                <div 
                  key={result.id} 
                  className="search-result-item"
                  onClick={() => handleSelectMovie(result)}
                >
                  <img 
                    src={result.primaryImage?.url || 'https://via.placeholder.com/80x120/cccccc/666666?text=Sin+Imagen'} 
                    alt={result.primaryTitle}
                    className="result-image"
                  />
                  <div className="result-info">
                    <h4 className="result-title">{result.primaryTitle}</h4>
                    <div className="result-meta">
                      <span className="result-year">📅 {result.startYear}</span>
                      {result.rating && (
                        <span className="result-rating">
                          ⭐ {result.rating.aggregateRating.toFixed(1)}
                        </span>
                      )}
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
