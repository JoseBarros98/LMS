import { useState, useEffect, useRef} from 'react'

export default function UserForm({ onSubmit, userEdit, onCancel }) {
    const [form, setForm] = useState({ 
        name: '', 
        paternal_surname: '', 
        maternal_surname: '',
        ci: '', 
        email: '', 
        phone_number: '', 
        university: '', 
        country:'', 
        password:'', 
        status: true 
    })
    const [imagenPreview, setImagenPreview] = useState(null)
    const [imagenArchivo, setImagenArchivo] = useState(null)
    const fileRef = useRef()

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
            })
            setImagenPreview(userEdit.profile_picture || null)
            setImagenArchivo(null)
        } else {
            setForm({ name: '', paternal_surname: '', maternal_surname: '',ci: '', email: '', phone_number: '', university: '', country:'', profile_picture:'', password:'', status: true })
            setImagenPreview(null)
            setImagenArchivo(null)
        }
    }, [userEdit])

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setForm({ ...form, [name]: type === 'checkbox' ? checked : value})
    }

    const handleImagen = (e) =>{
        const file =e.target.files[0]
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
        if (imagenArchivo) {
            formData.append('profile_picture', imagenArchivo)
        }

        onSubmit(formData)
        setForm({ name: '', paternal_surname: '', maternal_surname: '',ci: '', email: '', phone_number: '', university: '', country:'', profile_picture:'', password:'', status: true })
        setImagenPreview(null)
        setImagenArchivo(null)
        if (fileRef.current) fileRef.current.value = ''
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4">
            <h2 className="text-xl font-bold text-gray-700">
                {userEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>

            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border">
                    {imagenPreview
                        ? <img src={imagenPreview} alt="preview" className="w-full h-full object-cover" />
                        : <span className="flex items-center justify-center h-full text-gray-400 text-xs">Sin foto</span>
                    }
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Foto de perfil</label>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImagen}
                        className="text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
                    />
                </div>
            </div>

            <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre" className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required />
            <input name="paternal_surname" value={form.paternal_surname} onChange={handleChange} placeholder="Apellido Paterno" className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input name="maternal_surname" value={form.maternal_surname} onChange={handleChange} placeholder="Apellido Materno" className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input name="ci" value={form.ci} onChange={handleChange} placeholder="CI" className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required />
            <input name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required />
            <input name="phone_number" value={form.phone_number} onChange={handleChange} placeholder="Teléfono" className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input name="university" value={form.university} onChange={handleChange} placeholder="Universidad" className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input name="country" value={form.country} onChange={handleChange} placeholder="País" className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input name="password" value={form.password} onChange={handleChange} placeholder="Contraseña" type="password" className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <label className="flex items-center gap-2 text-gray-600">
                <input type="checkbox" name="status" checked={form.status} onChange={handleChange} />
                Activo
            </label>
            <div className="flex gap-2">
                <button type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold">
                {userEdit ? 'Actualizar' : 'Crear'}
                </button>
                {userEdit && (
                <button type="button" onClick={onCancel}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg font-semibold">
                    Cancelar
                </button>
                )}
            </div>
        </form>
    )
}