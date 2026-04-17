import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, MinusCircle, Clock, Eye, X, FileText, Download, LoaderCircle } from 'lucide-react'
import Layout from '../components/Layout'
import { simuladoresApi } from '../api/simuladores'
import { generateSimuladorResolutionPdf } from '../utils/simuladorPdf'
import { getApiErrorMessage, showError } from '../utils/toast'

const TABS = [
  { key: 'todas', label: 'Todas' },
  { key: 'correctas', label: 'Correctas' },
  { key: 'incorrectas', label: 'Incorrectas' },
  { key: 'no_respondidas', label: 'No respondidas' },
]

function formatDuration(seconds) {
  if (!seconds) return '–'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

export default function SimuladorResultado() {
  const { simuladorId, intentoId } = useParams()
  const navigate = useNavigate()

  const [intento, setIntento] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('todas')
  const [detalle, setDetalle] = useState(null) // respuesta para el modal de detalle
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfPreview, setPdfPreview] = useState(null)

  useEffect(() => {
    load()
  }, [simuladorId, intentoId])

  useEffect(() => {
    return () => {
      if (pdfPreview?.url) {
        URL.revokeObjectURL(pdfPreview.url)
      }
    }
  }, [pdfPreview])

  const load = async () => {
    try {
      setLoading(true)
      const data = await simuladoresApi.getResultadoIntento(simuladorId, intentoId)
      setIntento(data)
    } catch {
      navigate('/simuladores')
    } finally {
      setLoading(false)
    }
  }

  const closePdfPreview = () => {
    if (pdfPreview?.url) {
      URL.revokeObjectURL(pdfPreview.url)
    }
    setPdfPreview(null)
  }

  const handleGenerarPdf = async () => {
    if (!intento) return

    try {
      setGeneratingPdf(true)
      const { blob, fileName } = await generateSimuladorResolutionPdf(intento)
      const url = URL.createObjectURL(blob)
      if (pdfPreview?.url) {
        URL.revokeObjectURL(pdfPreview.url)
      }
      setPdfPreview({ url, fileName })
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo generar el PDF de resolución.'))
    } finally {
      setGeneratingPdf(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!intento) return null

  const respuestas = [...(intento.respuestas || [])].sort(
    (a, b) => a.pregunta_orden - b.pregunta_orden,
  )

  const correctas = respuestas.filter((r) => r.es_correcta)
  const incorrectas = respuestas.filter((r) => !r.es_correcta && r.opcion_elegida)
  const no_respondidas = respuestas.filter((r) => !r.opcion_elegida)

  const filtered = {
    todas: respuestas,
    correctas,
    incorrectas,
    no_respondidas,
  }[tab]

  const totalPreguntas = respuestas.length

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate('/simuladores')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft size={16} /> Volver a simuladores
        </button>

        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h1 className="text-xl font-bold text-gray-800 mb-1">{intento.simulador_titulo}</h1>
              <p className="text-sm text-gray-500">Resultados del intento</p>
            </div>
            <button
              type="button"
              onClick={handleGenerarPdf}
              disabled={generatingPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generatingPdf ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />}
              Ver PDF de Resolución
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <StatCard
              icon={<CheckCircle size={20} className="text-emerald-600" />}
              label="Correctas"
              value={intento.total_correctas}
              total={totalPreguntas}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <StatCard
              icon={<XCircle size={20} className="text-red-500" />}
              label="Incorrectas"
              value={intento.total_incorrectas}
              total={totalPreguntas}
              color="text-red-500"
              bg="bg-red-50"
            />
            <StatCard
              icon={<MinusCircle size={20} className="text-gray-400" />}
              label="No respondidas"
              value={intento.total_no_respondidas}
              total={totalPreguntas}
              color="text-gray-500"
              bg="bg-gray-50"
            />
            <StatCard
              icon={<Clock size={20} className="text-blue-600" />}
              label="Tiempo"
              value={formatDuration(intento.tiempo_transcurrido_segundos)}
              color="text-blue-600"
              bg="bg-blue-50"
            />
          </div>

          {/* Score bar */}
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Puntaje: <strong className="text-gray-800">{intento.puntaje_obtenido}</strong></span>
              <span>{totalPreguntas > 0 ? Math.round((intento.total_correctas / totalPreguntas) * 100) : 0}% correcto</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${totalPreguntas > 0 ? (intento.total_correctas / totalPreguntas) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {TABS.map((t) => {
            const counts = {
              todas: totalPreguntas,
              correctas: intento.total_correctas,
              incorrectas: intento.total_incorrectas,
              no_respondidas: intento.total_no_respondidas,
            }
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  tab === t.key
                    ? 'bg-white shadow-sm text-gray-800'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  t.key === 'correctas' ? 'bg-emerald-100 text-emerald-700' :
                  t.key === 'incorrectas' ? 'bg-red-100 text-red-600' :
                  t.key === 'no_respondidas' ? 'bg-gray-200 text-gray-600' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {counts[t.key]}
                </span>
              </button>
            )
          })}
        </div>

        {/* Questions list */}
        <div className="space-y-4">
          {filtered.map((resp, idx) => (
            <PreguntaResultado
              key={resp.id}
              resp={resp}
              onDetalle={() => setDetalle(resp)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8">No hay preguntas en esta categoría.</p>
          )}
        </div>
      </div>

      {detalle && (
        <PreguntaDetalleModal resp={detalle} onClose={() => setDetalle(null)} />
      )}

      {pdfPreview && (
        <PdfPreviewModal
          fileUrl={pdfPreview.url}
          fileName={pdfPreview.fileName}
          onClose={closePdfPreview}
        />
      )}
    </Layout>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, total, color, bg }) {
  return (
    <div className={`${bg} rounded-xl px-4 py-3 flex flex-col gap-1`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {total !== undefined && (
        <span className="text-xs text-gray-400">de {total}</span>
      )}
    </div>
  )
}

// ── PreguntaResultado ──────────────────────────────────────────────────────────

function PreguntaResultado({ resp, onDetalle }) {
  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const esNoRespondida = !resp.opcion_elegida

  const statusIcon = esNoRespondida
    ? <MinusCircle size={20} className="text-gray-400 flex-shrink-0" />
    : resp.es_correcta
    ? <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
    : <XCircle size={20} className="text-red-500 flex-shrink-0" />

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Question header */}
      <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
        {statusIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-gray-400">
              S{resp.pregunta_orden + 1}-{resp.pregunta_orden + 1}
            </span>
            <button
              onClick={onDetalle}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition"
            >
              <Eye size={13} />
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-700 leading-relaxed">
            {resp.pregunta_orden + 1}. {resp.pregunta_texto}
          </p>
        </div>
      </div>

      {/* Answers comparison */}
      {!esNoRespondida && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-5 py-4">
          <div className={`rounded-xl px-4 py-3 ${resp.es_correcta ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <p className="text-xs text-gray-400 mb-1">Tu respuesta:</p>
            <p className={`text-sm font-medium ${resp.es_correcta ? 'text-emerald-700' : 'text-red-600'}`}>
              {resp.opcion_texto || '–'}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">Respuesta correcta:</p>
            <p className="text-sm font-medium text-emerald-700">
              {resp.opcion_correcta?.texto || '–'}
            </p>
          </div>
        </div>
      )}

      {esNoRespondida && (
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400">No respondida</p>
          <p className="text-sm text-emerald-700 mt-1">
            Respuesta correcta: <strong>{resp.opcion_correcta?.texto || '–'}</strong>
          </p>
        </div>
      )}
    </div>
  )
}

// ── PreguntaDetalleModal ───────────────────────────────────────────────────────

function PreguntaDetalleModal({ resp, onClose }) {
  const [activeTab, setActiveTab] = useState('pregunta')
  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">Detalle de la Pregunta</h3>
            <p className="text-xs text-gray-400">Revisa la pregunta y su explicación</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3">
          {[{ key: 'pregunta', label: 'Pregunta' }, { key: 'explicacion', label: 'Explicación' }].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm rounded-lg transition font-medium ${
                activeTab === t.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {activeTab === 'pregunta' && (
            <div className="space-y-4">
              <p className="text-gray-800 font-medium leading-relaxed">
                {resp.pregunta_orden + 1}. {resp.pregunta_texto}
              </p>
              <div className="space-y-2">
                {(resp.todas_opciones || []).map((op, opIdx) => {
                  const isSelected = resp.opcion_elegida === op.id
                  const isCorrect = op.es_correcta
                  return (
                    <div
                      key={op.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                        isCorrect
                          ? 'border-emerald-400 bg-emerald-50'
                          : isSelected && !isCorrect
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isCorrect ? 'bg-emerald-500 text-white' :
                        isSelected ? 'bg-red-400 text-white' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {letters[opIdx] || opIdx + 1}
                      </span>
                      <span className="text-sm text-gray-700">{op.texto}</span>
                      {isCorrect && <CheckCircle size={14} className="ml-auto text-emerald-600 flex-shrink-0" />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'explicacion' && (
            <div className="space-y-4">
              {resp.explicacion?.texto ? (
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {resp.explicacion.texto}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No hay explicación disponible para esta pregunta.</p>
              )}
              {resp.explicacion?.imagen_url && (
                <div className="mt-3">
                  <img
                    src={resp.explicacion.imagen_url}
                    alt="Explicación"
                    className="w-full rounded-xl border border-gray-200 object-contain max-h-80"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PdfPreviewModal({ fileUrl, fileName, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-800 truncate">Vista previa del PDF de resolución</h3>
            <p className="text-xs text-gray-500 truncate">{fileName}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              download={fileName}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Download size={15} />
              Descargar
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <iframe
          src={fileUrl}
          title="PDF de resolución"
          className="flex-1 w-full border-0"
        />
      </div>
    </div>
  )
}
