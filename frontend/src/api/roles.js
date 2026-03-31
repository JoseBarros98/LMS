import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

export const getRoles = () => api.get('/roles/')
export const getRole = (id) => api.get(`/roles/${id}/`)
export const createRole = (roleData) => api.post('/roles/', roleData)
export const updateRole = (id, roleData) => api.put(`/roles/${id}/`, roleData)
export const partialUpdateRole = (id, roleData) => api.patch(`/roles/${id}/`, roleData)
export const deleteRole = (id) => api.delete(`/roles/${id}/`)
