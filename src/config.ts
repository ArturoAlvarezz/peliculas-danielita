const configuredApiBaseUrl = import.meta.env.VITE_API_URL

export const API_BASE_URL = configuredApiBaseUrl === '__SAME_ORIGIN__'
  ? window.location.origin
  : configuredApiBaseUrl || window.location.origin

export const API_URL = `${API_BASE_URL}/api/movies`
