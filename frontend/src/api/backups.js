import api from './api'

const parseFilenameFromDisposition = (headerValue, fallback) => {
  if (!headerValue || typeof headerValue !== 'string') return fallback

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])

  const basicMatch = headerValue.match(/filename="?([^";]+)"?/i)
  if (basicMatch?.[1]) return basicMatch[1]

  return fallback
}

const buildBlobResult = (response, fallbackName) => ({
  blob: response.data,
  filename: parseFilenameFromDisposition(response.headers?.['content-disposition'], fallbackName),
})

export const backupsApi = {
  list: async () => {
    const response = await api.get('/db-backups/')
    return response.data
  },

  generate: async (scope = 'db') => {
    const response = await api.post('/db-backups/generate/', { scope })
    return response.data
  },

  exportNow: async (scope = 'db') => {
    const response = await api.get('/db-backups/export/', {
      responseType: 'blob',
      params: { scope },
    })
    return buildBlobResult(response, 'backup_export.sql')
  },

  download: async (filename) => {
    const response = await api.get(`/db-backups/${encodeURIComponent(filename)}/download/`, { responseType: 'blob' })
    return buildBlobResult(response, filename)
  },

  importFile: async (file) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/db-backups/import/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}
