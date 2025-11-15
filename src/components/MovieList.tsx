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

export function MovieList({ title, movies, setMovies }: MovieListProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMovieTitle, setNewMovieTitle] = useState('')
  const [newMovieImage, setNewMovieImage] = useState('')

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

  const handleAddMovie = () => {
    if (newMovieTitle.trim()) {
      const newMovie: Movie = {
        id: Date.now().toString(),
        title: newMovieTitle,
        imageUrl: newMovieImage || `https://via.placeholder.com/200x300/FF6347/fff?text=${encodeURIComponent(newMovieTitle)}`,
      }
      setMovies([...movies, newMovie])
      setNewMovieTitle('')
      setNewMovieImage('')
      setShowAddForm(false)
    }
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
          <input
            type="text"
            placeholder="Título de la película"
            value={newMovieTitle}
            onInput={(e) => setNewMovieTitle((e.target as HTMLInputElement).value)}
            className="movie-input"
          />
          <input
            type="text"
            placeholder="URL de la imagen (opcional)"
            value={newMovieImage}
            onInput={(e) => setNewMovieImage((e.target as HTMLInputElement).value)}
            className="movie-input"
          />
          <div className="form-buttons">
            <button onClick={handleAddMovie} className="btn-save">
              Guardar
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewMovieTitle('')
                setNewMovieImage('')
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
