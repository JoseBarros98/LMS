import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { getRoles } from '../api/users'

export default function UsuarioModal({ userEdit, onSubmit, onClosed }) {
    const [form, setForm] = useState({
        name: '', paternal_surname: '', maternal_surname: '',
        ci: '', email: '', phone_number: '', university: '',
        country: '', password: '', status: true, role_id: null,
    })
    const [imagenPreview, setImagenPreview] = useState(null)
    const [imagenArchivo, setImagenArchivo] = useState(null)
    const [roles, setRoles] = useState([])
    const [loadingRoles, setLoadingRoles] = useState(true)
    const fileRef = useRef()

    useEffect(() => {
        // Cargar roles
        const fetchRoles = async () => {
            try {
                const response = await getRoles()
                setRoles(response.data)
            } catch (error) {
                console.error('Error fetching roles:', error)
            } finally {
                setLoadingRoles(false)
            }
        }
        fetchRoles()
    }, [])

    useEffect(() => {
        if (userEdit) {
        setForm({
            name: userEdit.name || '',
            paternal_surname: userEdit.paternal_surname || '',
            maternal_surname: userEdit.maternal_surname || '',
            ci: userEdit.ci || '',
            email: userEdit.email || '',
            phone_number: userEdit.phone_number || '',
            university: userEdit.university || '',
            country: userEdit.country || '',
            password: '',
            status: userEdit.status ?? true,
            role_id: userEdit.role?.id || null,
        })
        setImagenPreview(userEdit.profile_picture || null)
        }
    }, [userEdit])

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
    }

    const handleImagen = (e) => {
        const file = e.target.files[0]
        if (file) {
        setImagenArchivo(file)
        setImagenPreview(URL.createObjectURL(file))
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const formData = new FormData()
        Object.entries(form).forEach(([key, value]) => {
        if (key === 'password' && !value) return
        formData.append(key, value)
        })
        if (imagenArchivo) formData.append('profile_picture', imagenArchivo)
        onSubmit(formData)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">

            {/* Header del modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">
                {userEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            <button onClick={onClosed} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                <X size={20} />
            </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Avatar */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border flex items-center justify-center shrink-0">
                {imagenPreview
                    ? <img src={imagenPreview} alt="preview" className="w-full h-full object-cover" />
                    : <span className="text-gray-400 text-2xl font-bold">
                        {form.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                }
                </div>
                <div>
                <label className="block text-sm text-gray-600 mb-1 font-medium">Foto de perfil</label>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImagen}
                    className="text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100" />
                </div>
            </div>

            {/* Campos en grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
                </div>
                <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Apellido Paterno</label>
                <input name="paternal_surname" value={form.paternal_surname} onChange={handleChange} placeholder="Apellido Paterno"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Apellido Materno</label>
                <input name="maternal_surname" value={form.maternal_surname} onChange={handleChange} placeholder="Apellido Materno"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">CI *</label>
                <input name="ci" value={form.ci} onChange={handleChange} placeholder="CI"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
                </div>
                <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono *</label>
                <input name="phone_number" value={form.phone_number} onChange={handleChange} placeholder="Teléfono"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
                </div>
                <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                <input name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
                </div>
                <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Universidad</label>
                <input name="university" value={form.university} onChange={handleChange} placeholder="Universidad"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">País</label>
                <input name="country" value={form.country} onChange={handleChange} placeholder="País"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Rol</label>
                <select name="role_id" value={form.role_id || ''} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">Sin rol</option>
                    {loadingRoles ? (
                        <option value="">Cargando roles...</option>
                    ) : (
                        roles.map(role => (
                            <option key={role.id} value={role.id}>
                                {role.name}
                            </option>
                        ))
                    )}
                </select>
                </div>
                <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                    {userEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
                </label>
                <input name="password" value={form.password} onChange={handleChange} placeholder="••••••••" type="password"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required={!userEdit} />
                </div>
            </div>


            {/* Botones */}
            <div className="flex gap-3 pt-2">
                <button type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm transition">
                {userEdit ? 'Guardar cambios' : 'Crear usuario'}
                </button>
                <button type="button" onClick={onClosed}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl font-semibold text-sm transition">
                Cancelar
                </button>
            </div>
            </form>
        </div>
        </div>
    )
}