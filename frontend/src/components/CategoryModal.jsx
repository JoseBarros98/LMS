import { useEffect, useState } from 'react'
import { Save, X } from 'lucide-react'

const defaultForm = {
  name: '',
  description: '',
  icon: 'HelpCircle',
  color: '#3B82F6',
  order: 1,
  status: 'active',
}

const availableIcons = [
  'HelpCircle', 'AlertCircle', 'CheckCircle', 'XCircle', 'Info',
  'BookOpen', 'FileText', 'Settings', 'User', 'Users',
  'MessageCircle', 'Phone', 'Mail', 'Globe', 'Shield',
  'Star', 'Heart', 'ThumbsUp', 'Zap', 'TrendingUp',
]

const normalizeCategoryName = (value) => value.trim().toLowerCase()

export default function CategoryModal({
  categoryEdit,
  initialOrder,
  onSubmit,
  onClosed,
  existingNames = [],
}) {
  const [form, setForm] = useState(defaultForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (categoryEdit) {
      setForm({
        name: categoryEdit.name || '',
        description: categoryEdit.description || '',
        icon: categoryEdit.icon || 'HelpCircle',
        color: categoryEdit.color || '#3B82F6',
        order: categoryEdit.order || 1,
        status: categoryEdit.status || (categoryEdit.is_active ? 'active' : 'inactive'),
      })
      return
    }

    setForm({
      ...defaultForm,
      order: initialOrder,
    })
  }, [categoryEdit, initialOrder])

  useEffect(() => {
    setErrorMessage('')
  }, [categoryEdit])

  const handleChange = (event) => {
    const { name, value } = event.target

    if (errorMessage) {
      setErrorMessage('')
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedName = form.name.trim()
    const normalizedCurrentName = normalizeCategoryName(trimmedName)
    const duplicatedName = existingNames.some((name) => normalizeCategoryName(name) === normalizedCurrentName)

    if (!trimmedName) {
      setErrorMessage('El nombre de la categoría es obligatorio.')
      return
    }

    if (duplicatedName) {
      setErrorMessage('Ya existe una categoría con ese nombre.')
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({
        ...form,
        name: trimmedName,
        description: form.description.trim(),
        color: form.color.trim(),
        order: Number(form.order) || 1,
      })
    } catch (error) {
      setErrorMessage(error?.message || 'No se pudo guardar la categoría.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {categoryEdit ? 'Editar Categoría' : 'Nueva Categoría'}
          </h2>
          <button onClick={onClosed} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ej: Soporte Técnico"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Orden</label>
              <input
                type="number"
                name="order"
                value={form.order}
                onChange={handleChange}
                min="1"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Describe brevemente esta categoría..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Icono</label>
              <select
                name="icon"
                value={form.icon}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {availableIcons.map((icon) => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  className="w-12 h-11 border border-gray-200 rounded-xl cursor-pointer"
                />
                <input
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  placeholder="#3B82F6"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {isSubmitting ? 'Guardando...' : categoryEdit ? 'Guardar cambios' : 'Crear categoría'}
            </button>
            <button
              type="button"
              onClick={onClosed}
              disabled={isSubmitting}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl font-semibold text-sm transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}