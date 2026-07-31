import { useEffect, useState } from 'preact/hooks'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Movie, StreamingProvider } from '../app'
import { API_BASE_URL } from '../config'
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
    setActivatorNodeRef,
  } = useSortable({ id: movie.id })
  const [providers, setProviders] = useState<StreamingProvider[]>([])
  const [providersLink, setProvidersLink] = useState<string | null>(null)
  const [isLoadingProviders, setIsLoadingProviders] = useState(false)

  useEffect(() => {
    if (!movie.imdbId) return

    let cancelled = false
    const loadProviders = async () => {
      setIsLoadingProviders(true)
      try {
        const response = await fetch(`${API_BASE_URL}/api/movies/providers/${movie.imdbId}`)
        const data = await response.json() as {
          providers?: StreamingProvider[]
          link?: string | null
        }

        if (!cancelled && response.ok) {
          setProviders(data.providers || [])
          setProvidersLink(data.link || null)
        }
      } catch (error) {
        console.error('Error al cargar plataformas:', error)
      } finally {
        if (!cancelled) setIsLoadingProviders(false)
      }
    }

    void loadProviders()
    return () => {
      cancelled = true
    }
  }, [movie.imdbId])

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
    >
      <div className="movie-position" aria-hidden="true">{index + 1}</div>
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
        {(isLoadingProviders || providers.length > 0) && (
          <div className="movie-providers" aria-label="Disponibilidad en plataformas">
            {isLoadingProviders && (
              <span className="providers-loading" role="status">Buscando plataformas...</span>
            )}
            {providers.length > 0 && (
              <>
                <div className="provider-list">
                  {providers.map((provider) => (
                    <span
                      key={provider.id}
                      className="provider-chip"
                      title={`${provider.name}${provider.types.length > 0 ? ` (${provider.types.join(', ')})` : ''}`}
                      role="img"
                      aria-label={`${provider.name}${provider.types.length > 0 ? `: ${provider.types.join(', ')}` : ''}`}
                    >
                      {provider.logoUrl && (
                        <img src={provider.logoUrl} alt="" loading="lazy" />
                      )}
                      {!provider.logoUrl && (
                        <span className="provider-fallback" aria-hidden="true">•</span>
                      )}
                    </span>
                  ))}
                </div>
                {providersLink && (
                  <a
                    className="providers-link"
                    href={providersLink}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Ver disponibilidad de ${movie.title}`}
                    title="Ver disponibilidad"
                  >
                    <svg
                      className="providers-link-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M14 3h7v7M21 3l-9 9" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                  </a>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {isEditMode && (
        <div className="movie-actions">
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="drag-handle"
            {...(attributes as any)}
            {...(listeners as any)}
            aria-label={`Arrastrar ${movie.title} para reordenar`}
          >
            <span aria-hidden="true">⠿</span>
          </button>
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
        </div>
      )}
    </article>
  )
}
