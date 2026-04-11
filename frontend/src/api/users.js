import axios from 'axios'

const api = axios.create({
    baseURL: '/api'
})

//interceptores para agregar el token a cada solicitud
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export const getUsers = () => api.get('/users/')
export const getUser = (id) => api.get(`/users/${id}/`)
export const getRoles = () => api.get('/roles/')

export const createUser = (data) => api.post('/users/', data, {
    headers: { 'Content-Type': 'multipart/form-data'}
})

export const updateUser = (id, data) => api.patch(`/users/${id}/`, data, {
    headers: {'Content-Type': 'multipart/form-data'}
})

export const updateMyProfile = (data) => api.patch('/me/', data, {
    headers: {'Content-Type': 'multipart/form-data'}
})

export const deleteUser = (id) => api.delete(`/users/${id}/`)