import axios from 'axios'
import { create } from 'zustand'

// On Vercel, API routes are at /api/* — same origin, no CORS needed
export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const useAuth = create((set, get) => ({
  officer: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (badge_id, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/login', { badge_id, password })
      localStorage.setItem('token', data.token)
      set({ officer: data.officer, token: data.token, loading: false })
      return true
    } catch (e) {
      set({ error: e.response?.data?.error || 'Login failed', loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ officer: null, token: null })
    window.location.href = '/login'
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      set({ officer: data })
    } catch { get().logout() }
  },
}))
