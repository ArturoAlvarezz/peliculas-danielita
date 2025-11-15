import './AddMovieButton.css'

interface AddMovieButtonProps {
  onClick: () => void
}

export function AddMovieButton({ onClick }: AddMovieButtonProps) {
  return (
    <button className="add-movie-button" onClick={onClick}>
      <span className="plus-icon">+</span>
      <span>Agregar película</span>
    </button>
  )
}
