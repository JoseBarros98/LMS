import api from './api'

const buildTicketFormData = (data) => {
  const formData = new FormData()

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null || key === 'attachment') {
      return
    }

    formData.append(key, value)
  })

  if (data.attachment instanceof File) {
    formData.append('attachment', data.attachment)
  }

  return formData
}

export const ticketsApi = {
  // Obtener categorías de tickets
  getCategories: async () => {
    const response = await api.get('/categories-simple/')
    return response.data
  },

  // Obtener todas las categorías para administración
  getAllCategories: async () => {
    const response = await api.get('/categories-simple/', {
      params: {
        include_inactive: true,
      },
    })
    return response.data
  },
  
  // Crear categoría (solo admin)
  createCategory: (data) => api.post('/categories/', data),
  
  // Actualizar categoría (solo admin)
  updateCategory: (id, data) => api.patch(`/categories/${id}/`, data),
  
  // Eliminar categoría (solo admin)
  deleteCategory: (id) => api.delete(`/categories/${id}/`),
  
  // Obtener tickets
  getTickets: async () => {
    const response = await api.get('/tickets-simple/')
    return response.data
  },
  
  // Obtener un ticket específico
  getTicket: (id) => api.get(`/tickets/${id}/`),
  
  // Crear nuevo ticket
  createTicket: (data) => {
    const formData = buildTicketFormData(data)

    return api.post('/tickets/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Actualizar ticket
  updateTicket: (ticketId, data) => {
    const formData = buildTicketFormData(data)

    return api.patch(`/tickets/${ticketId}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Eliminar ticket
  deleteTicket: (ticketId) => api.delete(`/tickets/${ticketId}/`),
  
  // Responder a un ticket
  respondTicket: (ticketId, message) => 
    api.post(`/tickets/${ticketId}/respond/`, { message }),
  
  // Obtener respuestas de un ticket
  getTicketResponses: (ticketId) => 
    api.get(`/tickets/${ticketId}/responses/`),
  
  // Asignar ticket a administrador (solo admin)
  assignTicket: (ticketId, assignedTo) =>
    api.patch(`/tickets/${ticketId}/assign/`, { assigned_to: assignedTo }),
  
  // Actualizar estado del ticket (solo admin)
  updateTicketStatus: (ticketId, status, priority) =>
    api.patch(`/tickets/${ticketId}/`, { status, priority }),
  
  // Cerrar ticket (solo admin)
  closeTicket: (ticketId) =>
    api.patch(`/tickets/${ticketId}/close/`),
}
