import api from './api'

export const simuladoresApi = {
  // ── Admin: CRUD de simuladores ──────────────────────────────────────────────

  getSimuladores: async () => {
    const res = await api.get('/simuladores/')
    return res.data
  },

  getSimulador: async (id) => {
    const res = await api.get(`/simuladores/${id}/`)
    return res.data
  },

  createSimulador: async (formData) => {
    const res = await api.post('/simuladores/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  updateSimulador: async (id, formData) => {
    const isFormData = formData instanceof FormData
    const res = await api.patch(`/simuladores/${id}/`, formData, {
      headers: { 'Content-Type': isFormData ? 'multipart/form-data' : 'application/json' },
    })
    return res.data
  },

  deleteSimulador: async (id) => {
    await api.delete(`/simuladores/${id}/`)
  },

  // ── Admin: CRUD de preguntas ────────────────────────────────────────────────

  getPreguntas: async (simuladorId) => {
    const res = await api.get(`/simuladores/${simuladorId}/preguntas/`)
    return res.data
  },

  crearPregunta: async (simuladorId, data) => {
    const res = await api.post(`/simuladores/${simuladorId}/preguntas-crear/`, data)
    return res.data
  },

  actualizarPregunta: async (simuladorId, preguntaId, data) => {
    const res = await api.put(`/simuladores/${simuladorId}/preguntas-item/${preguntaId}/`, data)
    return res.data
  },

  eliminarPregunta: async (simuladorId, preguntaId) => {
    await api.delete(`/simuladores/${simuladorId}/preguntas-item/${preguntaId}/eliminar/`)
  },

  // ── Admin: Explicación de pregunta ─────────────────────────────────────────

  guardarExplicacion: async (simuladorId, preguntaId, formData) => {
    const isFormData = formData instanceof FormData
    const res = await api.patch(
      `/simuladores/${simuladorId}/preguntas-item/${preguntaId}/explicacion/`,
      formData,
      { headers: { 'Content-Type': isFormData ? 'multipart/form-data' : 'application/json' } },
    )
    return res.data
  },

  // ── Admin: ventana personalizada por usuario ──────────────────────────────

  getDisponibilidadUsuario: async (simuladorId, userId) => {
    const res = await api.get(`/simuladores/${simuladorId}/disponibilidad-usuario/`, {
      params: { user: userId },
    })
    return res.data
  },

  guardarDisponibilidadUsuario: async (simuladorId, payload) => {
    const res = await api.post(`/simuladores/${simuladorId}/disponibilidad-usuario/`, payload)
    return res.data
  },

  getDisponibilidadesUsuarios: async (simuladorId) => {
    const res = await api.get(`/simuladores/${simuladorId}/disponibilidades-usuarios/`)
    return res.data
  },

  // ── Estudiante: intentos ────────────────────────────────────────────────────

  iniciarIntento: async (simuladorId) => {
    const res = await api.post(`/simuladores/${simuladorId}/iniciar/`)
    return res.data
  },

  finalizarIntento: async (simuladorId, intentoId, payload) => {
    const res = await api.post(
      `/simuladores/${simuladorId}/intentos/${intentoId}/finalizar/`,
      payload,
    )
    return res.data
  },

  getMisIntentos: async (simuladorId) => {
    const res = await api.get(`/simuladores/${simuladorId}/mis-intentos/`)
    return res.data
  },

  getResultadoIntento: async (simuladorId, intentoId) => {
    const res = await api.get(`/simuladores/${simuladorId}/intentos/${intentoId}/resultado/`)
    return res.data
  },

  getRanking: async (simuladorId) => {
    const res = await api.get(`/simuladores/${simuladorId}/ranking/`)
    return res.data
  },
}
