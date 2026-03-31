import { useState, useEffect } from 'react'
import { X, Save, ShieldCheck } from 'lucide-react'

const DEFAULT_PERMISSIONS = {
  users: ['read', 'create', 'update', 'delete'],
  roles: ['read', 'create', 'update', 'delete'],
  courses: ['read', 'create', 'update', 'delete'],
  reports: ['read', 'create', 'update', 'delete']
}

export default function RoleModal({ role, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {}
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        permissions: role.permissions || {}
      })
    } else {
      setFormData({
        name: '',
        description: '',
        permissions: {}
      })
    }
  }, [role])

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      onSave(formData)
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionChange = (resource, action) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [resource]: prev.permissions[resource]?.includes(action)
          ? prev.permissions[resource].filter(p => p !== action)
          : [...(prev.permissions[resource] || []), action]
      }
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {role ? 'Editar Rol' : 'Nuevo Rol'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Rol *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              placeholder="Ej: Administrador, Editor, Lector"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              rows={3}
              placeholder="Describe el propósito de este rol..."
            />
          </div>

          {/* Permisos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Permisos
            </label>
            <div className="space-y-3">
              {Object.entries(DEFAULT_PERMISSIONS).map(([resource, actions]) => (
                <div key={resource} className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">
                    {resource === 'users' ? 'Usuarios' : 
                     resource === 'roles' ? 'Roles' : 
                     resource === 'courses' ? 'Cursos' : 'Reportes'}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {actions.map(action => (
                      <label key={action} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={formData.permissions[resource]?.includes(action) || false}
                          onChange={() => handlePermissionChange(resource, action)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-gray-700">
                          {action === 'read' ? 'Leer' :
                           action === 'create' ? 'Crear' :
                           action === 'update' ? 'Actualizar' : 'Eliminar'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Save size={16} />
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
