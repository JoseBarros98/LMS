import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ email: '', password: '' })
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
        await login(form.email.trim(), form.password.trim())
        navigate('/dashboard')
        } catch (err) {
        setError('Correo o contraseña incorrectos')
        } finally {
        setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md space-y-6">
            <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-600">Iniciar Sesión</h1>
            <p className="text-gray-400 text-sm mt-1">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.com"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Contraseña</label>
                <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
                />
            </div>

            {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold transition disabled:opacity-50"
            >
                {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
            </form>
        </div>
        </div>
    )
}