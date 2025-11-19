import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Movie } from '../app'
import './MovieCard.css'

interface MovieCardProps {
  movie: Movie
  index: number
  onDelete: (id: string) => void
  isEditMode: boolean
}

export function MovieCard({ movie, index, onDelete, isEditMode }: MovieCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: movie.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`movie-card ${isEditMode ? 'edit-mode' : ''}`}
      {...(isEditMode ? (attributes as any) : {})}
      {...(isEditMode ? (listeners as any) : {})}
    >
      <div className="movie-position">{index + 1}</div>
      <img src={movie.imageUrl} alt={movie.title} className="movie-image" />
      <div className="movie-details">
        <h3 className="movie-title">{movie.title}</h3>
        <div className="movie-metadata">
          {movie.year && (
            <span className="movie-year">📅 {movie.year}</span>
          )}
          {movie.rating && (
            <span className="movie-rating">⭐ {movie.rating.toFixed(1)}</span>
          )}
          {movie.type && movie.type !== 'movie' && (
            <span className="movie-type">
              {movie.type === 'tvSeries' ? '📺 Serie' : 
               movie.type === 'tvMiniSeries' ? '📺 Miniserie' :
               movie.type === 'tvMovie' ? '📺 TV' : '🎬'}
            </span>
          )}
        </div>
      </div>
      {isEditMode && (
        <button
          className="btn-delete"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(movie.id)
          }}
        >
          🗑️
        </button>
      )}
    </div>
  )
}
