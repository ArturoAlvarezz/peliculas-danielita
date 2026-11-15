import { useState } from 'preact/hooks'

interface PosterProps {
  src?: string | null
  title: string
  className?: string
  /** Ancho en píxeles reales a pedir al servidor de imágenes */
  width?: number
}

// Pide el póster al tamaño en que se muestra (≈3x para pantallas retina).
// Los de IMDb guardados son el original (~1 MB c/u); los de TMDB vienen en w500.
export function sizedPoster(url: string, width = 200): string {
  if (url.includes('media-amazon.com')) {
    return url.replace(/\._V1_[^/]*\.(jpe?g|png)$/i, `._V1_SX${width}.$1`)
  }
  if (url.includes('image.tmdb.org/t/p/')) {
    const size = width <= 92 ? 'w92' : width <= 154 ? 'w154' : width <= 200 ? 'w185' : 'w342'
    return url.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/${size}/`)
  }
  return url
}

export function Poster({ src, title, className = '', width = 200 }: PosterProps) {
  const [failed, setFailed] = useState(false)
  const usable = src && !failed && !src.includes('via.placeholder.com')

  if (!usable) {
    const initials = title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('')
    return (
      <div className={`poster poster-fallback ${className}`} role="img" aria-label={`Sin póster: ${title}`}>
        {initials || '🎬'}
      </div>
    )
  }

  return (
    <img
      src={sizedPoster(src, width)}
      alt={`Póster de ${title}`}
      className={`poster ${className}`}
      loading="lazy"
      decoding="async"
      width={width}
      height={Math.round(width * 1.5)}
      onError={() => setFailed(true)}
    />
  )
}
