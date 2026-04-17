import api from './api'

export const dashboardApi = {
  getStudentSummary: async () => {
    const response = await api.get('/dashboard/summary/')
    return response.data
  },

  getAdminSummary: async () => {
    const response = await api.get('/dashboard/admin-summary/')
    return response.data
  },

  getSummary: async () => {
    const response = await api.get('/dashboard/summary/')
    return response.data
  },
}