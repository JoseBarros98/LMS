import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { cursosApi } from '../api/cursos'
import { getApiErrorMessage, showError, showSuccess } from '../utils/toast'
import ComprobanteModal from './ComprobanteModal'
import FilePreviewModal from './FilePreviewModal'

const formatDate = (value) => {
  if (!value) return '-'

  // Date-only strings from API (YYYY-MM-DD) should be rendered without timezone conversion.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }

  return new Date(value).toLocaleDateString('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const formatCurrency = (value) => {
  const amount = Number(value || 0)
  return amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const normalizeMediaUrl = (value) => {
  if (!value) return value
  return String(value).replace(/^https?:\/\/[^/]+:8000\/media\//i, '/media/')
}

export default function EnrollmentDetailModal({ enrollment, type, onClose, onUpdated }) {
  if (!enrollment) return null

  const title = type === 'ruta' ? enrollment.ruta_titulo : enrollment.curso_titulo
  const isCoveredByRoute = type === 'curso' && Boolean(enrollment.incluido_en_ruta)
  const cuotas = useMemo(() => (Array.isArray(enrollment.cuotas)
    ? [...enrollment.cuotas].sort((a, b) => a.numero - b.numero)
    : []), [enrollment.cuotas])

  const [editingRows, setEditingRows] = useState(() => {
    const map = {}
    cuotas.forEach((cuota) => {
      map[cuota.id] = {
        fecha_pago: cuota.fecha_pago || '',
      }
    })
    return map
  })

  const [savingRowId, setSavingRowId] = useState('')
  const [abonoCuotaId, setAbonoCuotaId] = useState(cuotas[0]?.id || '')
  const [abonoMonto, setAbonoMonto] = useState('')
  const [abonoFecha, setAbonoFecha] = useState('')
  const [abonoFormaPago, setAbonoFormaPago] = useState('')
  const [abonoComprobanteFile, setAbonoComprobanteFile] = useState(null)
  const [savingAbono, setSavingAbono] = useState(false)
  const [reciboData, setReciboData] = useState(null)
  const [viewingRecibo, setViewingRecibo] = useState(null)
  const [filePreview, setFilePreview] = useState(null)

  const comprobantes = Array.isArray(enrollment.comprobantes) ? enrollment.comprobantes : []
  const comprobanteMatriculaUrl = normalizeMediaUrl(enrollment.comprobante_pago_url || enrollment.comprobante_pago)
  const comprobantesParaHistorial = useMemo(() => {
    if (comprobantes.length === 0) return []

    return comprobantes.map((comp, index) => {
      if (index === 0 && comprobanteMatriculaUrl && !comp.comprobante_pago) {
        return { ...comp, comprobante_pago: comprobanteMatriculaUrl }
      }
      return comp
    })
  }, [comprobantes, comprobanteMatriculaUrl])
  const allPaid = cuotas.length > 0 && cuotas.every((c) => c.estado === 'pagado')

  const buildReciboFromComprobante = (comp) => ({
    numero: comp.id,
    fecha_emision: comp.fecha_emision,
    forma_pago: comp.forma_pago || '',
    monto_abonado: comp.monto_abonado,
    monto_excedente: '0.00',
    programa_titulo: title,
    estudiante_nombre: enrollment.user_nombre || '',
    estudiante_ci: enrollment.user_ci || '',
    registrado_por_nombre: comp.registrado_por_nombre || '',
    comprobante_pago: normalizeMediaUrl(comp.comprobante_pago),
    cuota_numero: comp.cuota_numero,
    cuotas_aplicadas: [],
  })

  const handleRowChange = (cuotaId, field, value) => {
    setEditingRows((prev) => ({
      ...prev,
      [cuotaId]: {
        ...prev[cuotaId],
        [field]: value,
      },
    }))
  }

  const saveCuota = async (cuotaId) => {
    const row = editingRows[cuotaId]
    if (!row) return

    try {
      setSavingRowId(cuotaId)
      await cursosApi.updateCuotaPago(cuotaId, {
        fecha_pago: row.fecha_pago,
      })
      showSuccess('Cuota actualizada correctamente.')
      if (onUpdated) await onUpdated()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo actualizar la cuota.'))
    } finally {
      setSavingRowId('')
    }
  }

  const handleRegistrarAbono = async () => {
    if (!abonoCuotaId) {
      showError('Selecciona una cuota para registrar el pago.')
      return
    }
    if (!abonoMonto || Number(abonoMonto) <= 0) {
      showError('Ingresa un monto valido para el abono.')
      return
    }

    try {
      setSavingAbono(true)
      const payload = {
        monto_abonado: Number(abonoMonto),
      }
      if (abonoFecha) payload.fecha_pago_real = abonoFecha
      if (abonoFormaPago) payload.forma_pago = abonoFormaPago
      if (abonoComprobanteFile) payload._comprobante_cuota_file = abonoComprobanteFile

      const response = await cursosApi.registrarPagoCuota(abonoCuotaId, payload)
      const excedente = Number(response?.data?.monto_excedente || 0)
      if (excedente > 0) {
        showSuccess(`Pago registrado. Excedente sin aplicar: Bs ${formatCurrency(excedente)}`)
      } else {
        showSuccess('Pago registrado y distribuido correctamente.')
      }

      setAbonoMonto('')
      setAbonoFecha('')
      setAbonoFormaPago('')
      setAbonoComprobanteFile(null)
      if (response?.data?.recibo) setReciboData(response.data.recibo)
      if (onUpdated) await onUpdated()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo registrar el pago.'))
    } finally {
      setSavingAbono(false)
    }
  }

  return (
    <>
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
                <p><span className="font-semibold">Plan:</span> {isCoveredByRoute ? 'cubierto por ruta' : (enrollment.plan_pago || '-')}</p>
                <p><span className="font-semibold">Monto total:</span> Bs {formatCurrency(enrollment.monto_total)}</p>
                <p><span className="font-semibold">Cantidad de cuotas:</span> {enrollment.numero_cuotas || 0}</p>
                <p><span className="font-semibold">Codigo acceso:</span> {enrollment.codigo_acceso || '-'}</p>
                <p><span className="font-semibold">Vigencia:</span> {formatDate(enrollment.fecha_inicio)} - {formatDate(enrollment.fecha_fin)}</p>
              </div>
            </div>
          </div>

          {isCoveredByRoute ? (
            <div className="border border-emerald-200 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
              Este curso esta cubierto por la matricula de ruta. El cobro y los pagos se gestionan unicamente desde la inscripcion de la ruta.
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">Plan de pagos generado</h3>
              </div>

              {allPaid ? (
                <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 text-sm text-emerald-700 font-medium">
                  Todas las cuotas han sido pagadas. No se pueden registrar más abonos.
                </div>
              ) : (
              <div className="px-4 py-3 border-b border-gray-100 bg-white space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <select
                    value={abonoCuotaId}
                    onChange={(event) => setAbonoCuotaId(event.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    {cuotas.map((cuota) => (
                      <option key={cuota.id} value={cuota.id}>
                        Cuota #{cuota.numero}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={abonoMonto}
                    onChange={(event) => setAbonoMonto(event.target.value)}
                    placeholder="Monto abonado"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <input
                    type="date"
                    value={abonoFecha}
                    onChange={(event) => setAbonoFecha(event.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <select
                    value={abonoFormaPago}
                    onChange={(event) => setAbonoFormaPago(event.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="">Selecciona una opcion</option>
                    <option value="QR">QR</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleRegistrarAbono}
                    disabled={savingAbono}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingAbono ? 'Registrando...' : 'Registrar abono'}
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Comprobante de pago (opcional)</label>
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(event) => setAbonoComprobanteFile(event.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {abonoComprobanteFile && (
                    <p className="mt-1 text-xs text-gray-500">Archivo seleccionado: {abonoComprobanteFile.name}</p>
                  )}
                </div>
              </div>
              )}

              {cuotas.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No hay cuotas registradas para esta matricula.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-white">
                        <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Nro cuota</th>
                        <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Monto</th>
                        <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Pagado</th>
                        <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Saldo</th>
                        <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Fecha vencimiento</th>
                        <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Fecha pago</th>
                        <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Estado</th>
                        <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Accion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cuotas.map((cuota) => (
                        <tr key={cuota.id}>
                          <td className="px-4 py-2.5">{cuota.numero}</td>
                          <td className="px-4 py-2.5">Bs {formatCurrency(cuota.monto)}</td>
                          <td className="px-4 py-2.5">
                            Bs {formatCurrency(cuota.monto_pagado)}
                          </td>
                          <td className="px-4 py-2.5">Bs {formatCurrency(cuota.saldo_pendiente)}</td>
                          <td className="px-4 py-2.5">
                            <input
                              type="date"
                              value={editingRows[cuota.id]?.fecha_pago || ''}
                              onChange={(event) => handleRowChange(cuota.id, 'fecha_pago', event.target.value)}
                              className="px-2 py-1 border border-gray-200 rounded text-xs"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            {formatDate(cuota.fecha_pago_real)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-1 rounded-full text-xs ${cuota.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' : cuota.estado === 'parcial' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
                              {cuota.estado}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <button
                              type="button"
                              onClick={() => saveCuota(cuota.id)}
                              disabled={savingRowId === cuota.id}
                              className="px-2.5 py-1 rounded bg-slate-900 text-white text-xs hover:bg-slate-800 disabled:opacity-60"
                            >
                              {savingRowId === cuota.id ? 'Guardando...' : 'Guardar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}  
            </div>
          )}

          {/* Historial de recibos */}
          {(comprobanteMatriculaUrl || comprobantesParaHistorial.length > 0) && (
            <div className="border border-blue-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-blue-800">Recibos de pago registrados</h3>
                <span className="text-xs text-blue-600">{comprobantes.length} recibo{comprobantes.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="px-4 py-3 bg-white flex flex-wrap gap-2">
                {comprobantesParaHistorial.length === 0 && comprobanteMatriculaUrl && (
                  <div className="inline-flex items-center gap-1.5 bg-blue-700 rounded-full px-2 py-1">
                    <button
                      type="button"
                      onClick={() => setFilePreview({
                        title: 'Comprobante de matricula',
                        url: comprobanteMatriculaUrl,
                      })}
                      className="flex items-center gap-1.5 px-2 py-0.5 text-white text-xs font-medium"
                    >
                      <span>Comprobante matricula</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                )}
                {comprobantesParaHistorial.map((comp) => (
                  <div key={comp.id} className="inline-flex items-center gap-1.5 bg-blue-700 rounded-full px-2 py-1">
                    <button
                      type="button"
                      onClick={() => setViewingRecibo(buildReciboFromComprobante(comp))}
                      className="flex items-center gap-1.5 px-2 py-0.5 text-white text-xs font-medium"
                    >
                      <span>{String(comp.id).padStart(6, '0')}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    {comp.comprobante_pago && (
                      <button
                        type="button"
                        onClick={() => setFilePreview({
                          title: `Comprobante adjunto #${String(comp.id).padStart(6, '0')}`,
                          url: normalizeMediaUrl(comp.comprobante_pago),
                        })}
                        className="px-2 py-0.5 text-white/90 hover:text-white text-xs border-l border-white/30"
                      >
                        Archivo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    {reciboData && <ComprobanteModal recibo={reciboData} onClose={() => setReciboData(null)} />}
    {viewingRecibo && <ComprobanteModal recibo={viewingRecibo} onClose={() => setViewingRecibo(null)} />}
    {filePreview?.url && (
      <FilePreviewModal
        url={filePreview.url}
        title={filePreview.title}
        onClose={() => setFilePreview(null)}
      />
    )}
    </>
  )
}
