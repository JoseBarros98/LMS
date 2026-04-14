import { useState } from 'react'
import { AlertCircle, X } from 'lucide-react'

const defaultForm = {
  titulo: '',
  descripcion: '',
  publicado: false,
}

export default function RutaModal({ rutaEdit, onSubmit, onClosed }) {
  const isEditing = Boolean(rutaEdit)
  const [formData, setFormData] = useState(() => {
    if (!rutaEdit) {
      return defaultForm
    }

    return {
      titulo: rutaEdit.titulo || '',
      descripcion: rutaEdit.descripcion || '',
      publicado: Boolean(rutaEdit.publicado),
    }
  })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    if (error) {
      setError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.titulo.trim()) {
      setError('El titulo de la ruta es obligatorio.')
      return
    }

    try {
      await onSubmit({ ...formData })
    } catch (submitError) {
      const apiError = submitError?.response?.data
      const message =
        typeof apiError === 'string'
          ? apiError
          : apiError?.detail || apiError?.titulo?.[0] || apiError?.slug?.[0] || 'No se pudo guardar la ruta.'

      setError(message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{isEditing ? 'Editar Ruta' : 'Nueva Ruta'}</h2>
          <button
            onClick={onClosed}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Titulo</label>
            <input
              type="text"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Descripcion</label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="publicado"
              checked={formData.publicado}
              onChange={handleChange}
            />
            Publicada
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClosed}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
            >
              {isEditing ? 'Guardar cambios' : 'Crear ruta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
