import { useEffect, useState } from 'preact/hooks'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Movie, StreamingProvider } from '../app'
import { API_BASE_URL } from '../config'
import { Poster } from './Poster'

interface MovieCardProps {
  movie: Movie
  index: number
  ranked: boolean
  isEditMode: boolean
  onDelete: () => void
  onMarkWatched?: () => void
}

const providerCache = new Map<string, { providers: StreamingProvider[]; link: string | null }>()

function typeLabel(movie: Movie) {
  if (movie.mediaType === 'tv' || movie.type === 'tvSeries' || movie.type === 'series') return 'Serie'
  if (movie.type === 'tvMiniSeries') return 'Miniserie'
  if (movie.type === 'tvMovie') return 'Película TV'
  return null
}

export function MovieCard({ movie, index, ranked, isEditMode, onDelete, onMarkWatched }: MovieCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } =
    useSortable({ id: movie.id, disabled: !isEditMode })
  const cached = movie.imdbId ? providerCache.get(movie.imdbId) : undefined
  const [providers, setProviders] = useState<StreamingProvider[]>(cached?.providers || [])
  const [providersLink, setProvidersLink] = useState<string | null>(cached?.link || null)

  useEffect(() => {
    const imdbId = movie.imdbId
    if (!imdbId || providerCache.has(imdbId)) return
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/movies/providers/${imdbId}`)
        if (!response.ok) return
        const data = await response.json() as { providers?: StreamingProvider[]; link?: string | null }
        const value = { providers: data.providers || [], link: data.link || null }
        providerCache.set(imdbId, value)
        if (!cancelled) {
          setProviders(value.providers)
          setProvidersLink(value.link)
        }
      } catch (error) {
        console.error('Error al cargar plataformas:', error)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [movie.imdbId])

  const streaming = providers.filter((p) => p.types.some((t) => t !== 'Alquiler' && t !== 'Compra'))
  const shown = (streaming.length > 0 ? streaming : providers).slice(0, 5)
  const onlyRentBuy = streaming.length === 0 && providers.length > 0
  const label = typeLabel(movie)
  const showOriginal = movie.originalTitle && movie.originalTitle !== movie.title

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`movie-card ${isDragging ? 'is-dragging' : ''} ${isEditMode ? 'is-editing' : ''}`}
    >
      {ranked && <span className={`rank ${index < 3 ? 'rank-podium' : ''}`} aria-label={`Puesto ${index + 1}`}>{index + 1}</span>}
      <Poster src={movie.imageUrl} title={movie.title} className="card-poster" />

      <div className="card-body">
        <h3 className="card-title">{movie.title}</h3>
        {showOriginal && <p className="card-original">{movie.originalTitle}</p>}
        <div className="card-meta">
          {movie.year !== undefined && <span>{movie.year}</span>}
          {label && <span className="pill">{label}</span>}
          {movie.rating !== undefined && (
            <span className="score" aria-label={`Puntuación ${movie.ratingSource || 'IMDb'} ${movie.rating.toFixed(1)} de 10`}>
              ★ {movie.rating.toFixed(1)}
              <small>{movie.ratingSource || 'IMDb'}</small>
            </span>
          )}
        </div>

        {shown.length > 0 && (
          <a
            className="providers"
            href={providersLink || undefined}
            target="_blank"
            rel="noreferrer"
            aria-label={`Dónde ver ${movie.title}: ${shown.map((p) => p.name).join(', ')}`}
          >
            {shown.map((provider) => (
              provider.logoUrl
                ? <img key={provider.id} src={provider.logoUrl} alt="" title={provider.name} loading="lazy" />
                : <span key={provider.id} className="provider-text">{provider.name}</span>
            ))}
            {onlyRentBuy && <span className="provider-note">arriendo/compra</span>}
          </a>
        )}
      </div>

      {isEditMode && (
        <div className="card-actions">
          {onMarkWatched && (
            <button type="button" className="icon-btn" onClick={onMarkWatched} aria-label={`Marcar ${movie.title} como vista y pasarla al top`} title="Vista → al top">
              ✓
            </button>
          )}
          <button type="button" className="icon-btn danger" onClick={onDelete} aria-label={`Quitar ${movie.title}`} title="Quitar">
            ✕
          </button>
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="icon-btn handle"
            {...(attributes as any)}
            {...(listeners as any)}
            aria-label={`Arrastrar ${movie.title} para reordenar`}
          >
            ⠿
          </button>
        </div>
      )}
    </li>
  )
}
