import React from 'react'
import ReactDOM from 'react-dom/client'
import toast from 'react-hot-toast'

export const showSuccess = (message) => toast.success(message)

export const showError = (message) => toast.error(message)

export const showConfirm = (message) => {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const cleanup = (result) => {
      root.unmount()
      document.body.removeChild(container)
      resolve(result)
    }

    const root = ReactDOM.createRoot(container)
    root.render(
      React.createElement(
        'div',
        {
          style: {
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
          },
        },
        React.createElement(
          'div',
          { className: 'bg-white rounded-xl shadow-xl p-6 w-80 border border-gray-200' },
          React.createElement('p', { className: 'text-sm text-gray-700 mb-6' }, message),
          React.createElement(
            'div',
            { className: 'flex justify-end gap-2' },
            React.createElement(
              'button',
              {
                onClick: () => cleanup(false),
                className: 'px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition'
              },
              'Cancelar'
            ),
            React.createElement(
              'button',
              {
                onClick: () => cleanup(true),
                className: 'px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition'
              },
              'Aceptar'
            )
          )
        )
      )
    )
  })
}

export const showTextConfirm = ({ message, expectedText = 'CONFIRMAR', placeholder }) => {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const cleanup = (result) => {
      root.unmount()
      document.body.removeChild(container)
      resolve(result)
    }

    const TextConfirmModal = () => {
      const [value, setValue] = React.useState('')
      const normalizedExpected = String(expectedText || '').trim()
      const isValid = value.trim() === normalizedExpected

      return React.createElement(
        'div',
        {
          style: {
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
          },
        },
        React.createElement(
          'div',
          { className: 'bg-white rounded-xl shadow-xl p-6 w-[28rem] border border-gray-200' },
          React.createElement('p', { className: 'text-sm text-gray-700 mb-3' }, message),
          React.createElement(
            'p',
            { className: 'text-xs text-gray-500 mb-2' },
            `Escribe ${normalizedExpected} para confirmar.`
          ),
          React.createElement('input', {
            type: 'text',
            value,
            onChange: (event) => setValue(event.target.value),
            placeholder: placeholder || normalizedExpected,
            autoFocus: true,
            className: 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-blue-400',
          }),
          React.createElement(
            'div',
            { className: 'flex justify-end gap-2' },
            React.createElement(
              'button',
              {
                onClick: () => cleanup(false),
                className: 'px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition'
              },
              'Cancelar'
            ),
            React.createElement(
              'button',
              {
                onClick: () => cleanup(true),
                disabled: !isValid,
                className: 'px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed'
              },
              'Confirmar'
            )
          )
        )
      )
    }

    const root = ReactDOM.createRoot(container)
    root.render(React.createElement(TextConfirmModal))
  })
}

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
  if (Array.isArray(value) && value.length > 0) return `${firstKey}: ${value[0]}`
  if (typeof value === 'string') return `${firstKey}: ${value}`

  return fallbackMessage
}
