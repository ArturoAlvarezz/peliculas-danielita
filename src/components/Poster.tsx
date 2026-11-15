import { useState } from 'preact/hooks'

interface PosterProps {
  src?: string | null
  title: string
  className?: string
}

export function Poster({ src, title, className = '' }: PosterProps) {
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
      src={src}
      alt={`Póster de ${title}`}
      className={`poster ${className}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
