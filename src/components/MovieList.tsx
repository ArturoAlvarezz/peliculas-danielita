import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
import type { Movie } from '../app'

interface MovieListProps {
  movies: Movie[]
  ranked: boolean
  emptyText: string
  isEditMode: boolean
  onChange: (movies: Movie[]) => void
  onMarkWatched?: (movie: Movie) => void
}

export function MovieList({ movies, ranked, emptyText, isEditMode, onChange, onMarkWatched }: MovieListProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const oldIndex = movies.findIndex((movie) => movie.id === active.id)
    const newIndex = movies.findIndex((movie) => movie.id === over.id)
    onChange(arrayMove(movies, oldIndex, newIndex))
  }

  if (movies.length === 0) {
    return (
      <div className="state-box">
        <p className="state-emoji" aria-hidden="true">🎬</p>
        <p>{emptyText}</p>
      </div>
    )
  }

  return (
    <DndContext sensors={isEditMode ? sensors : []} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={movies.map((movie) => movie.id)} strategy={verticalListSortingStrategy}>
        <ol className={`movie-list ${ranked ? 'is-ranked' : ''}`}>
          {movies.map((movie, index) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              index={index}
              ranked={ranked}
              isEditMode={isEditMode}
              onDelete={() => {
                if (window.confirm(`¿Quitar “${movie.title}” de la lista?`)) {
                  onChange(movies.filter((item) => item.id !== movie.id))
                }
              }}
              onMarkWatched={onMarkWatched ? () => onMarkWatched(movie) : undefined}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}
