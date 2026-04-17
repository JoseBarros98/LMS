import { useNavigate } from 'react-router-dom'
import { X, BarChart2 } from 'lucide-react'

function formatDate(d) {
  if (!d) return '–'
  return new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatDuration(seconds) {
  if (!seconds) return '–'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

export default function HistorialModal({ simulador, intentos, onClose }) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Historial de Intentos</h2>
            <p className="text-sm text-gray-500">{simulador.titulo}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {intentos.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No has realizado ningún intento aún.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Inicio</th>
                  <th className="pb-2 font-medium">Finalización</th>
                  <th className="pb-2 font-medium">Duración</th>
                  <th className="pb-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {intentos.map((intento, idx) => (
                  <tr key={intento.id} className="hover:bg-gray-50">
                    <td className="py-3 text-gray-500">{idx + 1}</td>
                    <td className="py-3">{formatDate(intento.iniciado_en)}</td>
                    <td className="py-3">{formatDate(intento.finalizado_en)}</td>
                    <td className="py-3 text-gray-500">
                      {formatDuration(intento.tiempo_transcurrido_segundos)}
                    </td>
                    <td className="py-3">
                      {intento.completado ? (
                        <button
                          onClick={() => {
                            onClose()
                            navigate(`/simuladores/${simulador.id}/resultado/${intento.id}`)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition"
                        >
                          <BarChart2 size={13} />
                          Resultado
                        </button>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-lg">
                          En progreso
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition"
          >
            <X size={14} /> Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
