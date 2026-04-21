import api from './api'

const sanitizePayload = (data) => {
  const payload = { ...data }

  ;[
    'ruta',
    'descripcion',
    'imagen_portada_url',
    'slug',
    'video_intro_url',
    'url',
    'codigo_acceso',
    'fecha_inicio',
    'fecha_fin',
    'fecha_pago',
    'fecha_pago_real',
    'numero_cuotas',
    'parent',
  ].forEach((field) => {
    if (payload[field] === '') {
      payload[field] = null
    }
  })

  return payload
}

const buildEnrollmentFormData = (data = {}) => {
  const formData = new FormData()

  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return

    if (key === '_comprobante_pago_file') {
      formData.append('comprobante_pago', value)
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== null && item !== undefined && item !== '') {
          formData.append(key, String(item))
        }
      })
      return
    }

    formData.append(key, String(value))
  })

  return formData
}

const postEnrollment = (url, data) => {
  if (data?._comprobante_pago_file) {
    const formData = buildEnrollmentFormData(data)
    return api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  }

  return api.post(url, sanitizePayload(data))
}

const sendEnrollmentPatch = (url, data) => {
  if (data?._comprobante_pago_file) {
    const formData = buildEnrollmentFormData(data)
    return api.patch(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  }

  return api.patch(url, sanitizePayload(data))
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

  createCurso: (data) => {
    if (data._imagen_portada_file) {
      const formData = new FormData()
      Object.entries(data).forEach(([key, val]) => {
        if (key === '_imagen_portada_file') {
          formData.append('imagen_portada', val)
        } else if (key !== 'imagen_portada_url' && val !== null && val !== undefined && val !== '') {
          formData.append(key, String(val))
        }
      })
      return api.post('/cursos/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    }
    return api.post('/cursos/', sanitizePayload(data))
  },

  updateCurso: (id, data) => {
    if (data._imagen_portada_file) {
      const formData = new FormData()
      Object.entries(data).forEach(([key, val]) => {
        if (key === '_imagen_portada_file') {
          formData.append('imagen_portada', val)
        } else if (key !== 'imagen_portada_url' && val !== null && val !== undefined && val !== '') {
          formData.append(key, String(val))
        }
      })
      return api.patch(`/cursos/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    }
    return api.patch(`/cursos/${id}/`, sanitizePayload(data))
  },

  deleteCurso: (id) => api.delete(`/cursos/${id}/`),

  getMatriculasRuta: async (params = {}) => {
    const response = await api.get('/matriculas-ruta/', { params })
    return response.data
  },

  createMatriculaRuta: (data) => postEnrollment('/matriculas-ruta/', data),

  updateMatriculaRuta: (id, data) => sendEnrollmentPatch(`/matriculas-ruta/${id}/`, data),

  deleteMatriculaRuta: (id) => api.delete(`/matriculas-ruta/${id}/`),

  getMatriculasCurso: async (params = {}) => {
    const response = await api.get('/matriculas-curso/', { params })
    return response.data
  },

  createMatriculaCurso: (data) => postEnrollment('/matriculas-curso/', data),

  updateMatriculaCurso: (id, data) => sendEnrollmentPatch(`/matriculas-curso/${id}/`, data),

  deleteMatriculaCurso: (id) => api.delete(`/matriculas-curso/${id}/`),

  updateCuotaPago: (id, data) => api.patch(`/cuotas-pago/${id}/`, sanitizePayload(data)),

  registrarPagoCuota: (id, data) => {
    const { _comprobante_cuota_file, ...rest } = data
    if (_comprobante_cuota_file) {
      const formData = new FormData()
      Object.entries(sanitizePayload(rest)).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, value)
      })
      formData.append('comprobante_pago', _comprobante_cuota_file)
      return api.post(`/cuotas-pago/${id}/registrar_pago/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    }
    return api.post(`/cuotas-pago/${id}/registrar_pago/`, sanitizePayload(rest))
  },

  getCursoDetalle: async (id) => {
    const response = await api.get(`/cursos/${id}/`)
    return response.data
  },

  createStudentAndEnrollInRuta: (rutaId, data) => {
    return postEnrollment(`/rutas/${rutaId}/crear_estudiante_matriculado/`, data)
  },

  enrollExistingStudentInRuta: (rutaId, data) => {
    return postEnrollment(`/rutas/${rutaId}/matricular_estudiante_existente/`, data)
  },

  createStudentAndEnrollInCurso: (cursoId, data) => {
    return postEnrollment(`/cursos/${cursoId}/crear_estudiante_matriculado/`, data)
  },

  enrollExistingStudentInCurso: (cursoId, data) => {
    return postEnrollment(`/cursos/${cursoId}/matricular_estudiante_existente/`, data)
  },

  getUsersForEnrollment: async () => {
    const response = await api.get('/users/')
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

  getMediateca: async (cursoId, params = {}) => {
    const response = await api.get('/mediateca-item/', { params: { curso_id: cursoId, ...params } })
    return response.data
  },

  getRecursos: async (params = {}) => {
    const response = await api.get('/mediateca-item/', { params })
    return response.data
  },

  createMediatecaItem: (data) => {
    if (data._file) {
      const formData = new FormData()
      Object.entries(data).forEach(([key, val]) => {
        if (key === '_file') {
          formData.append('archivo', val)
        } else if (val !== null && val !== undefined) {
          formData.append(key, String(val))
        }
      })
      return api.post('/mediateca-item/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    }
    return api.post('/mediateca-item/', sanitizePayload(data))
  },

  updateMediatecaItem: (id, data) => {
    if (data._file) {
      const formData = new FormData()
      Object.entries(data).forEach(([key, val]) => {
        if (key === '_file') {
          formData.append('archivo', val)
        } else if (val !== null && val !== undefined) {
          formData.append(key, String(val))
        }
      })
      return api.patch(`/mediateca-item/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    }
    return api.patch(`/mediateca-item/${id}/`, sanitizePayload(data))
  },

  deleteMediatecaItem: (id) => api.delete(`/mediateca-item/${id}/`),

  createSeccion: (data) => api.post('/secciones/', data),

  createLeccion: (data) => api.post('/lecciones/', data),

  updateLeccion: (id, data) => api.patch(`/lecciones/${id}/`, data),

  deleteLeccion: (id) => api.delete(`/lecciones/${id}/`),
}
