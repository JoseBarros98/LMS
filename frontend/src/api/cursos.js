import api from './api'

const sanitizePayload = (data) => {
  const payload = { ...data }

  ;[
    'descripcion',
    'imagen_portada_url',
    'slug',
    'video_intro_url',
    'fecha_disponible_desde',
    'fecha_disponible_hasta',
    'codigo_acceso',
    'fecha_inicio',
    'fecha_fin',
  ].forEach((field) => {
    if (payload[field] === '') {
      payload[field] = null
    }
  })

  return payload
}

export const cursosApi = {
  getRutas: async () => {
    const response = await api.get('/rutas/')
    return response.data
  },

  createRuta: (data) => api.post('/rutas/', sanitizePayload(data)),

  updateRuta: (id, data) => api.patch(`/rutas/${id}/`, sanitizePayload(data)),

  deleteRuta: (id) => api.delete(`/rutas/${id}/`),

  getCursos: async (params = {}) => {
    const response = await api.get('/cursos/', { params })
    return response.data
  },

  createCurso: (data) => api.post('/cursos/', sanitizePayload(data)),

  updateCurso: (id, data) => api.patch(`/cursos/${id}/`, sanitizePayload(data)),

  deleteCurso: (id) => api.delete(`/cursos/${id}/`),

  getMatriculasRuta: async (params = {}) => {
    const response = await api.get('/matriculas-ruta/', { params })
    return response.data
  },

  createMatriculaRuta: (data) => api.post('/matriculas-ruta/', sanitizePayload(data)),

  updateMatriculaRuta: (id, data) => api.patch(`/matriculas-ruta/${id}/`, sanitizePayload(data)),

  deleteMatriculaRuta: (id) => api.delete(`/matriculas-ruta/${id}/`),

  getMatriculasCurso: async (params = {}) => {
    const response = await api.get('/matriculas-curso/', { params })
    return response.data
  },

  createMatriculaCurso: (data) => api.post('/matriculas-curso/', sanitizePayload(data)),

  updateMatriculaCurso: (id, data) => api.patch(`/matriculas-curso/${id}/`, sanitizePayload(data)),

  deleteMatriculaCurso: (id) => api.delete(`/matriculas-curso/${id}/`),
}
