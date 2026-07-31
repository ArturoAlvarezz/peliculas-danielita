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
    <article
      ref={setNodeRef}
      style={style}
      className={`movie-card ${isEditMode ? 'edit-mode' : ''}`}
      {...(isEditMode ? (attributes as any) : {})}
      {...(isEditMode ? (listeners as any) : {})}
    >
      <div className="movie-position" aria-label={`Posición ${index + 1}`}>{index + 1}</div>
      <img src={movie.imageUrl} alt={`Póster de ${movie.title}`} className="movie-image" loading="lazy" />
      <div className="movie-details">
        <h3 className="movie-title">{movie.title}</h3>
        <div className="movie-metadata">
          {movie.year !== undefined && (
            <span className="movie-year">📅 {movie.year}</span>
          )}
          {movie.rating !== undefined && (
            <span className="movie-rating" aria-label={`Puntuación IMDb ${movie.rating.toFixed(1)} de 10`}>
              ⭐ IMDb {movie.rating.toFixed(1)}
            </span>
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
          type="button"
          className="btn-delete"
          aria-label={`Eliminar ${movie.title}`}
          title={`Eliminar ${movie.title}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(movie.id)
          }}
        >
          🗑️
        </button>
      )}
    </article>
  )
}
