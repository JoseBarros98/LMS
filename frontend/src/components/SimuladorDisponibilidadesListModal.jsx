import { useEffect, useMemo, useState } from 'react'
import { Calendar, Edit2, Trash2, User, X } from 'lucide-react'
import { simuladoresApi } from '../api/simuladores'
import { showConfirm, showError, showSuccess } from '../utils/toast'

function formatDateTime(value) {
  if (!value) return '–'
  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SimuladorDisponibilidadesListModal({ simulador, onClose, onEditarUsuario }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await simuladoresApi.getDisponibilidadesUsuarios(simulador.id)
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setRows([])
      setError(err?.response?.data?.detail || 'No se pudieron cargar las disponibilidades.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [simulador.id])

  const handleEliminar = async (row) => {
    const nombre = row.user_nombre || row.user_email
    if (!await showConfirm(`¿Eliminar la disponibilidad de ${nombre}?`)) return
    try {
      setDeletingId(row.user)
      await simuladoresApi.eliminarDisponibilidadUsuario(simulador.id, row.user)
      showSuccess('Disponibilidad eliminada.')
      await load()
    } catch {
      showError('No se pudo eliminar la disponibilidad.')
    } finally {
      setDeletingId(null)
    }
  }

  const total = useMemo(() => rows.length, [rows])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Usuarios con disponibilidad habilitada</h2>
            <p className="text-sm text-gray-500">{simulador.titulo}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 text-sm text-gray-600 bg-gray-50">
          Total habilitados: <strong className="text-gray-800">{total}</strong>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {!loading && !error && rows.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-10">
              Aún no hay disponibilidades personalizadas para este simulador.
            </p>
          )}

          {!loading && !error && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="py-2 font-medium">Usuario</th>
                    <th className="py-2 font-medium">Apertura</th>
                    <th className="py-2 font-medium">Cierre</th>
                    <th className="py-2 font-medium">Motivo</th>
                    <th className="py-2 font-medium">Actualizado</th>
                    <th className="py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50">
                      <td className="py-3 pr-3">
                        <div className="flex items-start gap-2">
                          <User size={14} className="text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-700">{row.user_nombre || row.user_email}</p>
                            <p className="text-xs text-gray-500">{row.user_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3">{formatDateTime(row.fecha_apertura)}</td>
                      <td className="py-3 pr-3">{formatDateTime(row.fecha_cierre)}</td>
                      <td className="py-3 pr-3 text-gray-600">{row.motivo || '–'}</td>
                      <td className="py-3 text-gray-500">{formatDateTime(row.updated_at)}</td>
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onEditarUsuario?.(row.user)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                          >
                            <Edit2 size={12} />
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(row)}
                            disabled={deletingId === row.user}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
