import toast from 'react-hot-toast'

export const showSuccess = (message) => toast.success(message)

export const showError = (message) => toast.error(message)

export const getApiErrorMessage = (error, fallbackMessage) => {
  const data = error?.response?.data

  if (!data) return fallbackMessage
  if (typeof data === 'string') return data

  if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length > 0) {
    return data.non_field_errors[0]
  }

  const firstKey = Object.keys(data)[0]
  if (!firstKey) return fallbackMessage

  const value = data[firstKey]
  if (Array.isArray(value) && value.length > 0) return value[0]
  if (typeof value === 'string') return value

  return fallbackMessage
}
