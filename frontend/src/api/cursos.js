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

  getCursoDetalle: async (id) => {
    const response = await api.get(`/cursos/${id}/`)
    return response.data
  },

  getSecciones: async (cursoId) => {
    const response = await api.get('/secciones/', { params: { curso_id: cursoId } })
    return response.data
  },

  getLecciones: async (seccionId) => {
    const response = await api.get('/lecciones/', { params: { seccion_id: seccionId } })
    return response.data
  },

  getProgreso: async (cursoId) => {
    const response = await api.get('/progreso-leccion/', { params: { curso_id: cursoId } })
    return response.data
  },

  updateProgreso: (leccionId, data) => api.post(`/progreso-leccion/`, { leccion: leccionId, ...data }),

  getComentarios: async (cursoId) => {
    const response = await api.get('/comentarios-curso/', { params: { curso_id: cursoId } })
    return response.data
  },

  createComentario: (data) => api.post('/comentarios-curso/', data),

  deleteComentario: (id) => api.delete(`/comentarios-curso/${id}/`),

  getMediateca: async (cursoId) => {
    const response = await api.get('/mediateca-item/', { params: { curso_id: cursoId } })
    return response.data
  },

  createMediatecaItem: (data) => api.post('/mediateca-item/', data),

  deleteMediatecaItem: (id) => api.delete(`/mediateca-item/${id}/`),

  createSeccion: (data) => api.post('/secciones/', data),

  createLeccion: (data) => api.post('/lecciones/', data),

  updateLeccion: (id, data) => api.patch(`/lecciones/${id}/`, data),

  deleteLeccion: (id) => api.delete(`/lecciones/${id}/`),
}
