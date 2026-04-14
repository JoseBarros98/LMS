import { X } from 'lucide-react'

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-BO', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const formatCurrency = (value) => {
  const amount = Number(value || 0)
  return amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function EnrollmentDetailModal({ enrollment, type, onClose }) {
  if (!enrollment) return null

  const title = type === 'ruta' ? enrollment.ruta_titulo : enrollment.curso_titulo
  const cuotas = Array.isArray(enrollment.cuotas)
    ? [...enrollment.cuotas].sort((a, b) => a.numero - b.numero)
    : []

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl border border-gray-200 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">Detalle de inscripcion</h2>
            <p className="text-sm text-gray-500">{title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Datos del estudiante</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p><span className="font-semibold">Nombre:</span> {enrollment.user_nombre || '-'}</p>
                <p><span className="font-semibold">Documento/CI:</span> {enrollment.user_ci || '-'}</p>
                <p><span className="font-semibold">Telefono:</span> {enrollment.user_telefono || '-'}</p>
                <p><span className="font-semibold">Email:</span> {enrollment.user_email || '-'}</p>
                <p><span className="font-semibold">Estado:</span> {enrollment.user_estado || '-'}</p>
                <p><span className="font-semibold">Fecha matriculacion:</span> {formatDate(enrollment.created_at)}</p>
                <p><span className="font-semibold">Matriculado por:</span> {enrollment.created_by_nombre || '-'}</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Plan de cobro</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p><span className="font-semibold">Plan:</span> {enrollment.plan_pago || '-'}</p>
                <p><span className="font-semibold">Monto total:</span> Bs {formatCurrency(enrollment.monto_total)}</p>
                <p><span className="font-semibold">Cantidad de cuotas:</span> {enrollment.numero_cuotas || 0}</p>
                <p><span className="font-semibold">Codigo acceso:</span> {enrollment.codigo_acceso || '-'}</p>
                <p><span className="font-semibold">Vigencia:</span> {formatDate(enrollment.fecha_inicio)} - {formatDate(enrollment.fecha_fin)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">Plan de pagos generado</h3>
            </div>
            {cuotas.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No hay cuotas registradas para esta matricula.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-white">
                      <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Nro cuota</th>
                      <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Monto</th>
                      <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Fecha pago</th>
                      <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cuotas.map((cuota) => (
                      <tr key={cuota.id}>
                        <td className="px-4 py-2.5">{cuota.numero}</td>
                        <td className="px-4 py-2.5">Bs {formatCurrency(cuota.monto)}</td>
                        <td className="px-4 py-2.5">{formatDate(cuota.fecha_pago)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-1 rounded-full text-xs ${cuota.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {cuota.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
