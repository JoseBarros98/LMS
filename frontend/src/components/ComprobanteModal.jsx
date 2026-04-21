import { useRef } from 'react'
import { X, Printer } from 'lucide-react'

const formatDate = (value) => {
  if (!value) return '-'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }
  return new Date(value).toLocaleDateString('es-BO', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const formatCurrency = (value) => {
  const amount = Number(value || 0)
  return amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * recibo shape:
 * {
 *   numero, fecha_emision, forma_pago, monto_abonado, monto_excedente,
 *   programa_titulo, estudiante_nombre, estudiante_ci,
 *   registrado_por_nombre, cuota_numero, cuotas_aplicadas: [{numero, monto, monto_pagado}]
 * }
 */
export default function ComprobanteModal({ recibo, onClose }) {
  const printRef = useRef(null)

  if (!recibo) return null

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return
    const win = window.open('', '_blank', 'width=800,height=700')
    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Comprobante #${recibo.numero}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1e3a6e; padding-bottom: 12px; margin-bottom: 16px; }
    .school-name { font-size: 18px; font-weight: bold; color: #1e3a6e; }
    .school-slogan { font-size: 10px; color: #555; font-style: italic; }
    .badge { border: 1px solid #1e3a6e; padding: 4px 10px; font-weight: bold; color: #1e3a6e; font-size: 13px; }
    .comprobante-title { text-align: center; font-size: 15px; font-weight: bold; border: 2px solid #1e3a6e; padding: 6px 20px; display: inline-block; margin: 12px auto; }
    .center { text-align: center; }
    .meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 10px; }
    .meta-box { border: 1px solid #ccc; padding: 4px 8px; font-size: 11px; }
    .info-row { margin-bottom: 6px; font-size: 12px; }
    .info-row span { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 14px 0; }
    th { background-color: #1e3a6e; color: white; padding: 6px 8px; text-align: center; font-size: 11px; }
    td { border: 1px solid #ccc; padding: 6px 8px; text-align: center; font-size: 11px; }
    .total-row { font-weight: bold; text-align: right; padding: 6px; border-top: 2px solid #1e3a6e; }
    .total-label { font-size: 11px; color: #1a6e2e; font-weight: bold; }
    .signatures { display: flex; justify-content: space-between; margin-top: 32px; text-align: center; }
    .sig-box { width: 45%; border-top: 1px solid #333; padding-top: 6px; font-size: 11px; }
    .footer { margin-top: 16px; font-size: 10px; color: #555; text-align: center; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>${content}</body>
</html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  const cuotasRows = recibo.cuotas_aplicadas?.length
    ? recibo.cuotas_aplicadas.map((c, i) => (
      <tr key={i}>
        <td style={{ border: '1px solid #ccc', padding: '6px 8px' }}>Colegiatura</td>
        <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>{c.numero}</td>
        <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>1</td>
        <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>
          {formatCurrency(c.aplicado ?? Math.min(Number(c.monto_pagado), Number(c.monto)))}
        </td>
        <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>
          {formatCurrency(c.aplicado ?? Math.min(Number(c.monto_pagado), Number(c.monto)))}
        </td>
        <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>Cuota</td>
      </tr>
    ))
    : (
      <tr>
        <td style={{ border: '1px solid #ccc', padding: '6px 8px' }}>Colegiatura</td>
        <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>{recibo.cuota_numero}</td>
        <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>1</td>
        <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>{formatCurrency(recibo.monto_abonado)}</td>
        <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>{formatCurrency(recibo.monto_abonado)}</td>
        <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>Cuota</td>
      </tr>
    )

  return (
    <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-gray-200 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
          <h2 className="text-sm font-semibold text-gray-700">Comprobante de pago #{recibo.numero}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              <Printer size={14} />
              Imprimir / Descargar
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Receipt body */}
        <div className="p-6">
          <div ref={printRef}>
            {/* Header */}
            <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #1e3a6e', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <div className="school-name" style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a6e' }}>PLATAFORMA EDUCATIVA</div>
                <div className="school-slogan" style={{ fontSize: '10px', color: '#555', fontStyle: 'italic' }}>"Porque el éxito no es producto de la casualidad"</div>
              </div>
              <div className="badge" style={{ border: '1px solid #1e3a6e', padding: '4px 10px', fontWeight: 'bold', color: '#1e3a6e', fontSize: '13px' }}>
                SISTEMA
              </div>
            </div>

            {/* Comprobante title + date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="meta-box" style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px' }}>
                <strong>Lugar / Sede</strong><br />Latam
              </div>
              <div className="center comprobante-title" style={{ textAlign: 'center', fontSize: '15px', fontWeight: 'bold', border: '2px solid #1e3a6e', padding: '6px 20px' }}>
                COMPROBANTE N° {recibo.numero}
              </div>
              <div className="meta-box" style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px', textAlign: 'right' }}>
                <strong>Fecha Emision</strong><br />{formatDate(recibo.fecha_emision)}
              </div>
            </div>

            {/* Info rows */}
            <div style={{ marginBottom: '10px', fontSize: '12px' }}>
              <div className="info-row" style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold' }}>Forma Pago</span>&nbsp;&nbsp;{recibo.forma_pago || '—'}
              </div>
              <div className="info-row" style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold' }}>Programa</span>&nbsp;&nbsp;{recibo.programa_titulo || '—'}
              </div>
              <div className="info-row" style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold' }}>Estudiante</span>&nbsp;&nbsp;{recibo.estudiante_nombre || '—'}
                {recibo.estudiante_ci ? <>&nbsp;&nbsp;<span style={{ fontWeight: 'bold' }}>CI/Doc.</span>&nbsp;{recibo.estudiante_ci}</> : null}
              </div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '14px 0' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e3a6e', color: 'white' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '11px' }}>#</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '11px' }}>Concepto</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '11px' }}>N° de Cuota</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '11px' }}>Cantidad</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '11px' }}>Monto</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '11px' }}>Subtotal</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '11px' }}>Unidad Medida</th>
                </tr>
              </thead>
              <tbody>
                {recibo.cuotas_aplicadas?.length
                  ? recibo.cuotas_aplicadas.map((c, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 8px' }}>Colegiatura</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>{c.numero}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>1</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>
                        {formatCurrency(c.aplicado ?? Math.min(Number(c.monto_pagado), Number(c.monto)))}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>
                        {formatCurrency(c.aplicado ?? Math.min(Number(c.monto_pagado), Number(c.monto)))}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>Cuota</td>
                    </tr>
                  ))
                  : (
                    <tr>
                      <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>1</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 8px' }}>Colegiatura</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>{recibo.cuota_numero}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>1</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>{formatCurrency(recibo.monto_abonado)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>{formatCurrency(recibo.monto_abonado)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>Cuota</td>
                    </tr>
                  )
                }
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ textAlign: 'right', paddingRight: '8px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', borderTop: '2px solid #1e3a6e', paddingTop: '6px', fontSize: '13px' }}>
                Total (bolivianos)&nbsp;&nbsp;
                <span style={{ color: '#1a6e2e' }}>Bs {formatCurrency(recibo.monto_abonado)}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#555' }}>
                Son {formatCurrency(recibo.monto_abonado)} bolivianos
              </div>
              {Number(recibo.monto_excedente) > 0 && (
                <div style={{ fontSize: '11px', color: '#b45309', marginTop: '4px' }}>
                  Excedente sin aplicar: Bs {formatCurrency(recibo.monto_excedente)}
                </div>
              )}
            </div>

            {/* Signatures */}
            <div className="signatures" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', textAlign: 'center' }}>
              <div className="sig-box" style={{ width: '45%', borderTop: '1px solid #333', paddingTop: '6px', fontSize: '11px' }}>
                <strong>Emisor</strong><br />
                {recibo.registrado_por_nombre || '—'}
              </div>
              <div className="sig-box" style={{ width: '45%', borderTop: '1px solid #333', paddingTop: '6px', fontSize: '11px' }}>
                <strong>Estudiante</strong><br />
                {recibo.estudiante_nombre || '—'}<br />
                {recibo.estudiante_ci ? `CI/Doc.: ${recibo.estudiante_ci}` : ''}
              </div>
            </div>

            {/* Footer */}
            <div className="footer" style={{ marginTop: '16px', fontSize: '10px', color: '#555', textAlign: 'center' }}>
              Documento generado electronicamente — Plataforma Educativa
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
