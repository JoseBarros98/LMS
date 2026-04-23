import api from './api'

export const auditoriaApi = {
  getLogs: async () => {
    const response = await api.get('/audit-logs/')
    return response.data
  },
}
