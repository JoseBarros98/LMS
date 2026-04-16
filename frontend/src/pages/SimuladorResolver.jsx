import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, ChevronLeft, ChevronRight, Flag, AlertTriangle } from 'lucide-react'
import { simuladoresApi } from '../api/simuladores'

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

export default function SimuladorResolver() {
  const { simuladorId, intentoId } = useParams()
  const navigate = useNavigate()

  const [simulador, setSimulador] = useState(null)
  const [preguntas, setPreguntas] = useState([])
  const [respuestas, setRespuestas] = useState({}) // { [preguntaId]: opcionId | null }
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef(Date.now())
  const timerRef = useRef(null)

  useEffect(() => {
    loadData()
    return () => clearInterval(timerRef.current)
  }, [simuladorId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [sim, preg] = await Promise.all([
        simuladoresApi.getSimulador(simuladorId),
        simuladoresApi.getPreguntas(simuladorId),
      ])
      setSimulador(sim)
      const sorted = [...preg].sort((a, b) => a.orden - b.orden)
      setPreguntas(sorted)

      // Initialize timer
      if (sim.tiempo_limite_minutos) {
        setTimeLeft(sim.tiempo_limite_minutos * 60)
      }
    } catch {
      navigate('/simuladores')
    } finally {
      setLoading(false)
    }
  }

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || loading) return
    if (timeLeft <= 0) {
      handleSubmit(true)
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleSubmit(true)
          return 0
        }
        return prev - 1
      })
      setElapsed((p) => p + 1)
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [timeLeft === null, loading])

  const handleSelectOpcion = (preguntaId, opcionId) => {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: opcionId }))
  }

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (submitting) return
      clearInterval(timerRef.current)
      setSubmitting(true)
      setConfirmFinish(false)

      const tiempoTranscurrido = Math.floor((Date.now() - startTimeRef.current) / 1000)

      const payload = {
        respuestas: preguntas.map((p) => ({
          pregunta_id: p.id,
          opcion_id: respuestas[p.id] || null,
        })),
        tiempo_transcurrido_segundos: tiempoTranscurrido,
      }

      try {
        await simuladoresApi.finalizarIntento(simuladorId, intentoId, payload)
        navigate(`/simuladores/${simuladorId}/resultado/${intentoId}`)
      } catch (err) {
        alert(err?.response?.data?.detail || 'Error al finalizar el intento.')
        setSubmitting(false)
      }
    },
    [preguntas, respuestas, simuladorId, intentoId, submitting, navigate],
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!simulador || preguntas.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Sin preguntas disponibles.
      </div>
    )
  }

  const pregunta = preguntas[current]
  const totalRespondidas = Object.keys(respuestas).filter((k) => respuestas[k]).length
  const isTimeLow = timeLeft !== null && timeLeft < 60

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700 truncate max-w-xs">{simulador.titulo}</span>
          <span className="text-xs text-gray-400">
            {totalRespondidas}/{preguntas.length} respondidas
          </span>
        </div>

        <div className="flex items-center gap-4">
          {timeLeft !== null && (
            <div className={`flex items-center gap-1.5 font-mono text-sm font-bold px-3 py-1.5 rounded-xl ${
              isTimeLow ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700'
            }`}>
              <Clock size={14} />
              {formatTime(timeLeft)}
            </div>
          )}
          <button
            onClick={() => setConfirmFinish(true)}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
          >
            <Flag size={14} />
            Finalizar
          </button>
        </div>
      </header>

      <div className="flex flex-1 gap-0">
        {/* Question navigator sidebar */}
        <aside className="hidden md:flex flex-col w-52 bg-white border-r border-gray-200 p-4 gap-2 sticky top-[57px] self-start h-[calc(100vh-57px)] overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Preguntas</p>
          <div className="grid grid-cols-5 gap-1.5">
            {preguntas.map((p, idx) => {
              const respondida = Boolean(respuestas[p.id])
              return (
                <button
                  key={p.id}
                  onClick={() => setCurrent(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                    idx === current
                      ? 'bg-blue-600 text-white'
                      : respondida
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </aside>

        {/* Main question area */}
        <main className="flex-1 max-w-2xl mx-auto px-4 py-8">
          {/* Question header */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                S{current + 1}-{current + 1}
              </span>
              <span className="text-xs text-gray-400">
                Puntaje: {pregunta.puntaje} pt{pregunta.puntaje !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-gray-800 font-medium leading-relaxed">
              {current + 1}. {pregunta.texto}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {pregunta.opciones
              .slice()
              .sort((a, b) => a.orden - b.orden)
              .map((op, opIdx) => {
                const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
                const selected = respuestas[pregunta.id] === op.id
                return (
                  <button
                    key={op.id}
                    onClick={() => handleSelectOpcion(pregunta.id, op.id)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 transition ${
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {letters[opIdx] || opIdx + 1}
                    </span>
                    <span className="text-sm leading-relaxed">{op.texto}</span>
                  </button>
                )
              })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrent((p) => Math.max(0, p - 1))}
              disabled={current === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} /> Anterior
            </button>

            <span className="text-sm text-gray-400">
              {current + 1} / {preguntas.length}
            </span>

            <button
              onClick={() => setCurrent((p) => Math.min(preguntas.length - 1, p + 1))}
              disabled={current === preguntas.length - 1}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </main>
      </div>

      {/* Confirm finish dialog */}
      {confirmFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-amber-600" />
              </div>
            </div>
            <h3 className="font-bold text-gray-800 text-lg">¿Finalizar el examen?</h3>
            <p className="text-sm text-gray-500">
              Has respondido <strong>{totalRespondidas}</strong> de <strong>{preguntas.length}</strong> preguntas.
              {preguntas.length - totalRespondidas > 0 && (
                <> Las preguntas no respondidas se marcarán como incorrectas.</>
              )}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmFinish(false)}
                className="px-5 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition disabled:opacity-60"
              >
                {submitting ? 'Enviando…' : 'Finalizar examen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
