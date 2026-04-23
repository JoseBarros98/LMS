import { useEffect, useMemo, useState } from 'react'
import { RefreshCcw, Search, Eye } from 'lucide-react'
import Layout from '../components/Layout'
import AuditoriaDetailModal from '../components/AuditoriaDetailModal'
import { auditoriaApi } from '../api/auditoria'
import { getApiErrorMessage, showError } from '../utils/toast'

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'short',
  timeStyle: 'medium',
})

function formatDateTime(value) {
  if (!value) return '-'
  try {
    return DATE_TIME_FORMATTER.format(new Date(value))
  } catch {
    return value
  }
}

const ACTION_BADGE = {
  create: { label: 'Creacion',     bg: 'bg-green-100',  text: 'text-green-700'  },
  update: { label: 'Actualizacion',bg: 'bg-yellow-100', text: 'text-yellow-700' },
  delete: { label: 'Eliminacion',  bg: 'bg-red-100',    text: 'text-red-700'    },
  other:  { label: 'Cambio',       bg: 'bg-gray-100',   text: 'text-gray-600'   },
}

function buildActionLabel(log) {
  const actionMap = {
    create: 'Creacion',
    update: 'Actualizacion',
    delete: 'Eliminacion',
    other: 'Cambio',
  }

  const actionLabel = actionMap[log.action] || 'Cambio'
  const resourceLabel = log.resource ? ` en ${log.resource}` : ''
  return `${actionLabel}${resourceLabel}`
}

export default function Auditoria() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await auditoriaApi.getLogs()
      setLogs(response.results || [])
    } catch (error) {
      setLogs([])
      showError(getApiErrorMessage(error, 'No se pudieron cargar los registros de auditoria.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return logs

    return logs.filter((log) => {
      const actor = (log.actor || '').toLowerCase()
      const role = (log.actor_role_name || '').toLowerCase()
      const summary = (log.change_summary || '').toLowerCase()
      const resource = (log.resource || '').toLowerCase()
      return actor.includes(query) || role.includes(query) || summary.includes(query) || resource.includes(query)
    })
  }, [logs, search])

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Auditoria</h1>
            <p className="text-sm text-gray-400">Registro de cambios relevantes del sistema</p>
          </div>
          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <RefreshCcw size={16} />
            Actualizar
          </button>
        </div>

        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por usuario, rol, recurso o cambio..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-sm"
          />
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Usuario</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Rol</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Tipo</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Detalle</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Fecha y hora</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">Cargando registros...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">No hay registros para mostrar</td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const badge = ACTION_BADGE[log.action] || ACTION_BADGE.other
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-gray-700 font-medium">{log.actor || 'Sistema'}</td>
                      <td className="px-6 py-4 text-gray-500">{log.actor_role_name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                          {buildActionLabel(log)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={log.change_summary}>{log.change_summary || '-'}</td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {!loading && (
            <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
              {filteredLogs.length} registro{filteredLogs.length !== 1 ? 's' : ''} encontrado{filteredLogs.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {selectedLog && (
        <AuditoriaDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </Layout>
  )
}
