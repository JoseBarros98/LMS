import api from './api'

export const notificationsApi = {
  getNotifications: async () => {
    const response = await api.get('/notifications/')
    return response.data
  },

  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/mark_read/`)
    return response.data
  },

  markAllAsRead: async () => {
    await api.patch('/notifications/mark_all_read/')
  },

  sendNotification: async (payload) => {
    const response = await api.post('/notifications/send/', payload)
    return response.data
  },

  processAutomatic: async (payload = {}) => {
    const response = await api.post('/notifications/process_automatic/', payload)
    return response.data
  },
}
