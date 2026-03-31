import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

export const login = (email, password) =>
    api.post('/token/', { email, password })

export const refreshToken = (refresh) =>
    api.post('/token/refresh/', { refresh })

export const fetchMe = () => api.get('/me/')