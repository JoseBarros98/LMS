import { useEffect, useState } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '../api/users'
import UsuarioModal from '../components/UsuarioModal'
import { Pencil, UserPlus, Search, UserX, UserCheck } from 'lucide-react'
import Layout from '../components/Layout'
import { usePermissions } from '../hooks/usePermissions'
import { getApiErrorMessage, showConfirm, showError, showSuccess } from '../utils/toast'

export default function Usuarios() {
    const [users, setUsers] = useState([])
    const [userEdit, setUserEdit] = useState(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    
    const { canCreate, canUpdate, canDelete, loading: permissionsLoading } = usePermissions()
    
    const fetchUsers = async () => {
        try {
            setLoading(true)
            const res = await getUsers()
            setUsers(res.data)
        } catch (error) {
            setUsers([])
            showError(getApiErrorMessage(error, 'No se pudieron cargar los usuarios.'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchUsers() }, [])

    const handleSubmit = async (formData) => {
        try {
            if (userEdit) {
                await updateUser(userEdit.id, formData)
                showSuccess('Usuario actualizado correctamente.')
            } else {
                await createUser(formData)
                showSuccess('Usuario creado correctamente.')
            }
            setModalOpen(false)
            setUserEdit(null)
            fetchUsers()
        } catch (error) {
            showError(getApiErrorMessage(error, 'Error al guardar usuario.'))
        }
    }

    const handleEdit = (user) => {
        setUserEdit(user)
        setModalOpen(true)
    }

    const handleDesactivar = async (usuario) => {
        if (await showConfirm(`¿Estás seguro de desactivar a ${usuario.name}?`)) {
            try {
                const formData = new FormData()
                formData.append('status', false)
                await updateUser(usuario.id, formData)
                showSuccess('Usuario desactivado correctamente.')
                fetchUsers()
            } catch (error) {
                showError(getApiErrorMessage(error, 'No se pudo desactivar el usuario.'))
            }
        }
    }

    const handleReactivar = async (usuario) => {
        if (await showConfirm(`¿Estás seguro de reactivar a ${usuario.name}?`)) {
            try {
                const formData = new FormData()
                formData.append('status', true)
                await updateUser(usuario.id, formData)
                showSuccess('Usuario reactivado correctamente.')
                fetchUsers()
            } catch (error) {
                showError(getApiErrorMessage(error, 'No se pudo reactivar el usuario.'))
            }
        }
    }

    const handleNew = () => {
        setUserEdit(null)
        setModalOpen(true)
    }

    const usersFiltered = users.filter(u =>
        `${u.name} ${u.paternal_surname} ${u.maternal_surname}`.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.ci.includes(search)
    )

    return (
        <Layout>
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
                <p className="text-sm text-gray-400">Gestiona los usuarios del sistema</p>
            </div>
            {canCreate('users') && (
            <button
                onClick={handleNew}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
            >
                <UserPlus size={18} />
                Nuevo Usuario
            </button>
            )}
            </div>

            {/* Buscador */}
            <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
                type="text"
                placeholder="Buscar por nombre, email o CI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-sm"
            />
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Usuario</th>
                    <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Email</th>
                    <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">CI</th>
                    <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Teléfono</th>
                    <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Rol</th>
                    <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Estado</th>
                    <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Acciones</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                {loading ? (
                    <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400">Cargando usuarios...</td>
                    </tr>
                ) : usersFiltered.length === 0 ? (
                    <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400">No se encontraron usuarios</td>
                    </tr>
                ) : (
                    usersFiltered.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                        {/* Nombre con avatar */}
                        <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center shrink-0">
                            {u.profile_picture
                                ? <img src={u.profile_picture} alt={u.name} className="w-full h-full object-cover" />
                                : <span className="text-blue-600 font-bold text-sm">{u.name?.charAt(0).toUpperCase()}</span>
                            }
                            </div>
                            <div>
                            <p className="font-semibold text-gray-800">
                                {`${u.name} ${u.paternal_surname || ''} ${u.maternal_surname || ''}`.trim()}
                            </p>
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{u.email}</td>
                        <td className="px-6 py-4 text-gray-500">{u.ci}</td>
                        <td className="px-6 py-4 text-gray-500">{u.phone_number}</td>
                        <td className="px-6 py-4">
                            {u.role ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-600">
                                    {u.role.name}
                                </span>
                            ) : (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                                    Sin rol
                                </span>
                            )}
                        </td>
                        <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.status ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                {u.status ? 'Activo' : 'Inactivo'}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                {canUpdate('users') && (
                                    <button
                                    onClick={() => handleEdit(u)}
                                    className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-500 hover:text-yellow-600 transition"
                                    title="Editar"
                                    >
                                    <Pencil size={16} />
                                    </button>
                                )}
                                {canUpdate('users') && (
                                    u.status ? (
                                    <button
                                        onClick={() => handleDesactivar(u)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition"
                                        title="Desactivar"
                                    >
                                        <UserX size={16} />
                                    </button>
                                    ) : (
                                    <button
                                        onClick={() => handleReactivar(u)}
                                        className="p-1.5 rounded-lg hover:bg-green-50 text-green-400 hover:text-green-600 transition"
                                        title="Reactivar"
                                    >
                                        <UserCheck size={16} />
                                    </button>
                                    )
                                )}
                            </div>
                        </td>
                    </tr>
                    ))
                )}
                </tbody>
            </table>

            {/* Footer con conteo */}
            {!loading && (
                <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
                {usersFiltered.length} usuario{usersFiltered.length !== 1 ? 's' : ''} encontrado{usersFiltered.length !== 1 ? 's' : ''}
                </div>
            )}
            </div>
        </div>

        {/* Modal */}
        {modalOpen && (
            <UsuarioModal
            userEdit={userEdit}
            onSubmit={handleSubmit}
            onClosed={() => { setModalOpen(false); setUserEdit(null) }}
            />
        )}
        </Layout>
    )

}