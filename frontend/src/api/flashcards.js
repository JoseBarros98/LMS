import api from './api'

export const flashcardsApi = {
  getGroups: async (params = {}) => {
    const response = await api.get('/flashcard-groups/', { params })
    return response.data
  },

  getGroupDetail: async (groupId) => {
    const response = await api.get(`/flashcard-groups/${groupId}/`)
    return response.data
  },

  createGroup: async (data) => {
    const response = await api.post('/flashcard-groups/', data)
    return response.data
  },

  updateGroup: async (groupId, data) => {
    const response = await api.patch(`/flashcard-groups/${groupId}/`, data)
    return response.data
  },

  deleteGroup: (groupId) => api.delete(`/flashcard-groups/${groupId}/`),

  createCard: async (data) => {
    const response = await api.post('/flashcards/', data)
    return response.data
  },

  updateCard: async (cardId, data) => {
    const response = await api.patch(`/flashcards/${cardId}/`, data)
    return response.data
  },

  deleteCard: (cardId) => api.delete(`/flashcards/${cardId}/`),

  getCards: async (params = {}) => {
    const response = await api.get('/flashcards/', { params })
    return response.data
  },

  registerAnswer: (groupId, data) => api.post(`/flashcard-groups/${groupId}/registrar-respuesta/`, data),
}
