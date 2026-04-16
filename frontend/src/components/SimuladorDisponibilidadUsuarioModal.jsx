import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { simuladoresApi } from '../api/simuladores'
import { cursosApi } from '../api/cursos'

export default function SimuladorDisponibilidadUsuarioModal({ simulador, onClose, initialUserId = '', onSaved }) {
  const [users, setUsers] = useState([])
  const [userInput, setUserInput] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [form, setForm] = useState({
    fecha_apertura: '',
    fecha_cierre: '',
    motivo: '',
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadEligibleUsers = async () => {
      try {
        const uniqueUsers = new Map()

        if (simulador?.ruta) {
          const matriculasRuta = await cursosApi.getMatriculasRuta({
            ruta_id: simulador.ruta,
            activa: true,
          })

          ;(Array.isArray(matriculasRuta) ? matriculasRuta : []).forEach((m) => {
            if (!m?.user) return
            uniqueUsers.set(m.user, {
              id: m.user,
              email: m.user_email,
              name: m.user_nombre,
              paternal_surname: '',
              maternal_surname: '',
            })
          })
        }

        if (simulador?.curso) {
          const matriculasCurso = await cursosApi.getMatriculasCurso({
            curso_id: simulador.curso,
            activa: true,
          })

          ;(Array.isArray(matriculasCurso) ? matriculasCurso : []).forEach((m) => {
            if (!m?.user) return
            uniqueUsers.set(m.user, {
              id: m.user,
              email: m.user_email,
              name: m.user_nombre,
              paternal_surname: '',
              maternal_surname: '',
            })
          })

          const courseDetail = await cursosApi.getCursoDetalle(simulador.curso)
          if (courseDetail?.ruta) {
            const matriculasRuta = await cursosApi.getMatriculasRuta({
              ruta_id: courseDetail.ruta,
              activa: true,
            })
            ;(Array.isArray(matriculasRuta) ? matriculasRuta : []).forEach((m) => {
              if (!m?.user) return
              uniqueUsers.set(m.user, {
                id: m.user,
                email: m.user_email,
                name: m.user_nombre,
                paternal_surname: '',
                maternal_surname: '',
              })
            })
          }
        }

        setUsers(Array.from(uniqueUsers.values()))
      } catch {
        setUsers([])
      }
    }

    loadEligibleUsers()
  }, [simulador?.curso, simulador?.ruta])

  useEffect(() => {
    if (!initialUserId) return
    setSelectedUser(String(initialUserId))
  }, [initialUserId])

  useEffect(() => {
    const loadCurrentWindow = async () => {
      if (!selectedUser) return
      setLoading(true)
      setError('')
      setMessage('')
      try {
        const data = await simuladoresApi.getDisponibilidadUsuario(simulador.id, selectedUser)
        setForm({
          fecha_apertura: data?.fecha_apertura ? data.fecha_apertura.slice(0, 16) : '',
          fecha_cierre: data?.fecha_cierre ? data.fecha_cierre.slice(0, 16) : '',
          motivo: data?.motivo || '',
        })
      } catch {
        setError('No se pudo cargar la disponibilidad del usuario.')
      } finally {
        setLoading(false)
      }
    }

    loadCurrentWindow()
  }, [selectedUser, simulador.id])

  const userOptions = useMemo(() => {
    return users.map((u) => {
      const name = [u.name, u.paternal_surname, u.maternal_surname].filter(Boolean).join(' ').trim()
      const label = name ? `${name} - ${u.email}` : u.email
      return { id: String(u.id), label }
    })
  }, [users])

  const selectedUserLabel = useMemo(() => {
    const selected = userOptions.find((u) => u.id === selectedUser)
    return selected ? selected.label : ''
  }, [selectedUser, userOptions])

  useEffect(() => {
    if (!selectedUser) return
    const selected = userOptions.find((u) => u.id === selectedUser)
    if (selected) setUserInput(selected.label)
  }, [selectedUser, userOptions])

  const handleUserInputChange = (value) => {
    setUserInput(value)
    const normalized = value.trim().toLowerCase()

    const exactLabel = userOptions.find((u) => u.label.toLowerCase() === normalized)
    if (exactLabel) {
      setSelectedUser(String(exactLabel.id))
      return
    }

    const matches = users.filter((u) => {
      const name = String(u.name || '').toLowerCase()
      const email = String(u.email || '').toLowerCase()
      return name === normalized || email === normalized || name.includes(normalized) || email.includes(normalized)
    })

    setSelectedUser(matches.length === 1 ? String(matches[0].id) : '')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser) {
      setError('Debes seleccionar un usuario.')
      return
    }
    if (!form.fecha_apertura || !form.fecha_cierre) {
      setError('Debes completar fecha de apertura y cierre.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      await simuladoresApi.guardarDisponibilidadUsuario(simulador.id, {
        user: selectedUser,
        fecha_apertura: form.fecha_apertura,
        fecha_cierre: form.fecha_cierre,
        motivo: form.motivo,
      })
      if (onSaved) {
        onSaved()
        return
      }
      setMessage('Disponibilidad actualizada correctamente.')
    } catch (err) {
      const data = err?.response?.data
      if (typeof data === 'string') {
        setError(data)
      } else if (data?.detail) {
        setError(data.detail)
      } else if (data && typeof data === 'object') {
        const fieldErrors = Object.entries(data)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : String(messages)}`)
          .join(' | ')
        setError(fieldErrors || 'No se pudo guardar la disponibilidad.')
      } else {
        setError('No se pudo guardar la disponibilidad.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Disponibilidad por usuario</h2>
            <p className="text-sm text-gray-500">{simulador.titulo}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {message && <p className="text-emerald-600 text-sm bg-emerald-50 rounded-lg px-3 py-2">{message}</p>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Usuario</label>
            <input
              list={`users-${simulador.id}`}
              value={userInput}
              onChange={(e) => handleUserInputChange(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar y seleccionar usuario por nombre/email..."
            >
            </input>
            <datalist id={`users-${simulador.id}`}>
              {userOptions.map((u) => (
                <option key={u.id} value={u.label} />
              ))}
            </datalist>
          </div>

          {users.length === 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              No hay usuarios matriculados para el curso/ruta asociado a este simulador.
            </p>
          )}

          {selectedUser && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Editando ventana para: <strong>{selectedUserLabel}</strong>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha apertura</label>
              <input
                type="datetime-local"
                value={form.fecha_apertura}
                onChange={(e) => setForm((p) => ({ ...p, fecha_apertura: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha cierre</label>
              <input
                type="datetime-local"
                value={form.fecha_cierre}
                onChange={(e) => setForm((p) => ({ ...p, fecha_cierre: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo (opcional)</label>
            <input
              value={form.motivo}
              onChange={(e) => setForm((p) => ({ ...p, motivo: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: extensión por reposición"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar ventana'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
