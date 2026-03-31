import { useEffect, useRef, useState } from 'react'
import { AlertCircle, FileText, Upload, X } from 'lucide-react'

const defaultForm = {
  title: '',
  description: '',
  category: '',
  priority: 'medium',
  status: 'open',
  attachment: null,
}

export default function TicketModal({ ticketEdit, categories, isAdmin, onSubmit, onClosed }) {
  const [formData, setFormData] = useState({
    ...defaultForm,
  })
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const isEditing = Boolean(ticketEdit)

  useEffect(() => {
    if (ticketEdit) {
      setFormData({
        title: ticketEdit.title || '',
        description: ticketEdit.description || '',
        category: ticketEdit.category_info?.id || ticketEdit.category || '',
        priority: ticketEdit.priority || 'medium',
        status: ticketEdit.status || 'open',
        attachment: null,
      })

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      return
    }

    setFormData(defaultForm)
    setError('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [ticketEdit])

  const handleChange = (e) => {
    const { name, value, files } = e.target
    
    if (name === 'attachment' && files?.length > 0) {
      setFormData(prev => ({ ...prev, [name]: files[0] }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    // Limpiar error al cambiar datos
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validaciones básicas
    if (!formData.title.trim()) {
      setError('El título es obligatorio')
      return
    }

    if (!formData.description.trim()) {
      setError('La descripción es obligatoria')
      return
    }

    if (!formData.category) {
      setError('Debes seleccionar una categoría')
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      setError(error.response?.data?.message || 'Error al procesar el ticket')
    }
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const removeFile = () => {
    setFormData(prev => ({ ...prev, attachment: null }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'border-gray-300',
      medium: 'border-yellow-300',
      high: 'border-orange-300',
      urgent: 'border-red-300'
    }
    return colors[priority] || colors.medium
  }

  const getPriorityBg = (priority) => {
    const colors = {
      low: 'bg-gray-50',
      medium: 'bg-yellow-50',
      high: 'bg-orange-50',
      urgent: 'bg-red-50'
    }
    return colors[priority] || colors.medium
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {isEditing ? 'Editar Ticket' : 'Nuevo Ticket'}
          </h2>
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
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Título del Ticket <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Describe brevemente tu problema o solicitud..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Descripción Detallada <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Proporciona todos los detalles necesarios para entender y resolver tu solicitud..."
              rows={6}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              required
            />
          </div>

          <div className={`grid gap-4 ${isAdmin && isEditing ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Selecciona una categoría</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Prioridad
              </label>
              <div className="space-y-2">
                {[
                  { value: 'low', label: 'Baja', icon: '↓' },
                  { value: 'medium', label: 'Media', icon: '→' },
                  { value: 'high', label: 'Alta', icon: '↑' },
                  { value: 'urgent', label: 'Urgente', icon: '⚡' }
                ].map(priority => (
                  <label
                    key={priority.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                      formData.priority === priority.value
                        ? `${getPriorityColor(priority.value)} ${getPriorityBg(priority.value)}`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={priority.value}
                      checked={formData.priority === priority.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          formData.priority === priority.value
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-300'
                        }`}>
                          {formData.priority === priority.value && (
                            <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                          )}
                        </div>
                        <span className="text-sm font-medium">{priority.label}</span>
                      </div>
                      <span className="text-lg">{priority.icon}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {isAdmin && isEditing && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Estado
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="open">Abierto</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="resolved">Resuelto</option>
                  <option value="closed">Cerrado</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Archivo Adjunto (Opcional)
            </label>
            <div className="space-y-3">
              {formData.attachment ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <FileText className="text-blue-600" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {formData.attachment.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(formData.attachment.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-red-500 hover:text-red-700 transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="attachment"
                    onChange={handleChange}
                    accept="image/*,.pdf,.doc,.doc,.docx,.txt"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleFileClick}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 transition flex items-center justify-center gap-2"
                  >
                    <Upload size={20} />
                    <span className="text-sm font-medium text-gray-700">
                      Click para subir archivo o arrastra aquí
                    </span>
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Formatos permitidos: Imágenes, PDF, Word, Text (Máx. 5MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClosed}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl font-semibold text-sm transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              <FileText size={16} />
              {isEditing ? 'Guardar cambios' : 'Crear ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
