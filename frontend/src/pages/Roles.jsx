import { useEffect, useState } from 'react'
import { getRoles, createRole, updateRole, deleteRole } from '../api/roles'
import RoleModal from '../components/RoleModal'
import { Pencil, ShieldCheck, Trash2, Settings, Users } from 'lucide-react'
import Layout from '../components/Layout'
import { usePermissions } from '../hooks/usePermissions'
import { getApiErrorMessage, showConfirm, showError, showSuccess } from '../utils/toast'

export default function Roles() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState(null)

  const { canCreate, canUpdate, canDelete, loading: permissionsLoading } = usePermissions()

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const response = await getRoles()
      setRoles(response.data)
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingRole(null)
    setShowModal(true)
  }

  const handleEdit = (role) => {
    setEditingRole(role)
    setShowModal(true)
  }

  const handleDelete = async (role) => {
    if (await showConfirm(`¿Estás seguro de eliminar el rol "${role.name}"?`)) {
      try {
        await deleteRole(role.id)
        setRoles(roles.filter(r => r.id !== role.id))
        showSuccess('Rol eliminado correctamente.')
      } catch (error) {
        console.error('Error deleting role:', error)
        showError(getApiErrorMessage(error, 'Error al eliminar el rol.'))
      }
    }
  }

  const handleSave = async (roleData) => {
    try {
      if (editingRole) {
        const response = await updateRole(editingRole.id, roleData)
        setRoles(roles.map(r => r.id === editingRole.id ? response.data : r))
        showSuccess('Rol actualizado correctamente.')
      } else {
        const response = await createRole(roleData)
        setRoles([...roles, response.data])
        showSuccess('Rol creado correctamente.')
      }
      setShowModal(false)
      setEditingRole(null)
    } catch (error) {
      console.error('Error saving role:', error)
      showError(getApiErrorMessage(error, 'Error al guardar el rol.'))
    }
  }

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Roles</h1>
            <p className="text-sm text-gray-400">Gestiona los roles y permisos del sistema</p>
          </div>
          {canCreate('roles') && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <ShieldCheck size={18} />
            Nuevo Rol
          </button>
          )}
        </div>

        {/* Buscador */}
        <div className="relative">
          <Settings size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-sm"
          />
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Rol</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Descripción</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Permisos</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Usuarios</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Creado</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    Cargando roles...
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    No se encontraron roles
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 transition">
                    {/* Nombre del rol */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center shrink-0">
                          <ShieldCheck className="text-blue-600" size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{role.name}</p>
                        </div>
                      </div>
                    </td>

                    {/* Descripción */}
                    <td className="px-6 py-4">
                      <p className="text-gray-600 text-sm">
                        {role.description || 'Sin descripción'}
                      </p>
                    </td>

                    {/* Permisos */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(role.permissions || {}).map(([resource, actions]) => (
                          <span
                            key={resource}
                            className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
                          >
                            {resource} ({Array.isArray(actions) ? actions.length : 0})
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Usuarios */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users size={16} />
                        <span className="text-sm">{role.users_count || 0}</span>
                      </div>
                    </td>

                    {/* Fecha de creación */}
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {new Date(role.created_at).toLocaleDateString()}
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {canUpdate('roles') && (
                          <button
                            onClick={() => handleEdit(role)}
                            className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-500 hover:text-yellow-600 transition"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {canDelete('roles') && (
                          <button
                            onClick={() => handleDelete(role)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <RoleModal
            role={editingRole}
            onClose={() => {
              setShowModal(false)
              setEditingRole(null)
            }}
            onSave={handleSave}
          />
        )}
      </div>
    </Layout>
  )
}
