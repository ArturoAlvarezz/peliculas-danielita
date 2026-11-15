import { useEffect, useRef, useState } from 'preact/hooks'
import type { Movie } from '../app'
import { API_BASE_URL } from '../config'
import { Poster } from './Poster'

interface SearchResult {
  tmdbId?: number
  imdbId?: string
  mediaType: 'movie' | 'tv'
  title: string
  originalTitle?: string
  year?: number
  posterUrl: string | null
  overview: string
}

interface SearchSheetProps {
  listLabel: string
  existing: Movie[]
  onAdd: (movie: Movie) => Promise<boolean>
  onClose: () => void
}

const resultKey = (r: SearchResult) => r.tmdbId ? `${r.mediaType}:${r.tmdbId}` : r.imdbId || r.title

export function SearchSheet({ listLabel, existing, onAdd, onClose }: SearchSheetProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [])

  useEffect(() => {
    const text = query.trim()
    if (text.length < 2) {
      setResults([])
      setStatus('idle')
      return
    }
    const controller = new AbortController()
    setStatus('loading')
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/movies/search?query=${encodeURIComponent(text)}`, { signal: controller.signal })
        const data = await response.json() as { results?: SearchResult[]; error?: string }
        if (!response.ok) throw new Error(data.error || 'No se pudo buscar')
        setResults(data.results || [])
        setStatus('done')
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'No se pudo buscar')
        setStatus('error')
      }
    }, 300)
    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [query])

  const isAlreadyAdded = (r: SearchResult) => existing.some((m) =>
    (r.tmdbId && m.tmdbId === r.tmdbId && (m.mediaType || 'movie') === r.mediaType) || (r.imdbId && m.imdbId === r.imdbId)
  )

  const handlePick = async (r: SearchResult) => {
    const key = resultKey(r)
    setAdding(key)
    setError('')
    try {
      const params = new URLSearchParams({ mediaType: r.mediaType })
      if (r.tmdbId) params.set('tmdbId', String(r.tmdbId))
      if (r.imdbId) params.set('imdbId', r.imdbId)
      const response = await fetch(`${API_BASE_URL}/api/movies/resolve?${params}`)
      const data = await response.json() as Partial<Movie> & { error?: string }
      if (!response.ok) throw new Error(data.error || 'No se pudo obtener el detalle')
      if (data.imdbId && existing.some((m) => m.imdbId === data.imdbId)) throw new Error('Esa película ya está en sus listas')
      const movie: Movie = {
        ...data,
        id: Date.now().toString(),
        title: data.title || r.title,
        imageUrl: data.imageUrl || r.posterUrl || '',
      }
      if (await onAdd(movie)) onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`Agregar a ${listLabel}`}>
        <div className="sheet-head">
          <h2>Agregar a {listLabel}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <input
          ref={inputRef}
          type="search"
          className="search-input"
          placeholder="Busca una película o serie…"
          value={query}
          enterKeyHint="search"
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />

        <div className="sheet-body" aria-live="polite">
          {status === 'loading' && <p className="muted">Buscando…</p>}
          {status === 'error' && <p className="error-text" role="alert">{error}</p>}
          {status === 'done' && results.length === 0 && <p className="muted">Sin resultados para “{query.trim()}”.</p>}
          {status === 'idle' && <p className="muted">Escribe al menos 2 letras. Puedes buscar en español o en inglés.</p>}
          {error && status !== 'error' && <p className="error-text" role="alert">{error}</p>}

          <ul className="results">
            {results.map((r) => {
              const key = resultKey(r)
              const added = isAlreadyAdded(r)
              return (
                <li key={key}>
                  <button type="button" className="result" disabled={added || adding !== null} onClick={() => void handlePick(r)}>
                    <Poster src={r.posterUrl} title={r.title} className="result-poster" />
                    <span className="result-body">
                      <span className="result-title">{r.title}</span>
                      <span className="result-meta">
                        {r.year || 's/f'} · {r.mediaType === 'tv' ? 'Serie' : 'Película'}
                        {r.originalTitle && r.originalTitle !== r.title ? ` · ${r.originalTitle}` : ''}
                      </span>
                      {r.overview && <span className="result-overview">{r.overview}</span>}
                    </span>
                    <span className="result-cta">{added ? 'Ya está' : adding === key ? '…' : '+'}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
