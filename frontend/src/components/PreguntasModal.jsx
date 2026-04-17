import { useState, useEffect } from 'react'
import {
  X, Plus, Trash2, Save, ChevronDown, ChevronUp,
  CheckCircle, Image as ImageIcon,
} from 'lucide-react'
import { simuladoresApi } from '../api/simuladores'
import { showConfirm } from '../utils/toast'

const TIPOS = [
  { value: 'multiple', label: 'Opción múltiple' },
  { value: 'verdadero_falso', label: 'Verdadero o Falso' },
]

function defaultOpcion() {
  return { texto: '', es_correcta: false, orden: 0 }
}

function defaultPregunta(orden) {
  return {
    tipo: 'multiple',
    texto: '',
    puntaje: 1,
    orden,
    opciones: [
      { texto: '', es_correcta: false, orden: 0 },
      { texto: '', es_correcta: false, orden: 1 },
    ],
  }
}

export default function PreguntasModal({ simulador, onClose }) {
  const [preguntas, setPreguntas] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [explicacionModal, setExplicacionModal] = useState(null) // pregunta object

  useEffect(() => {
    loadPreguntas()
  }, [simulador.id])

  const loadPreguntas = async () => {
    try {
      setLoading(true)
      const data = await simuladoresApi.getPreguntas(simulador.id)
      setPreguntas(data)
    } catch {
      setPreguntas([])
    } finally {
      setLoading(false)
    }
  }

  const addPregunta = () => {
    const nueva = { ...defaultPregunta(preguntas.length), _isNew: true, _localId: Date.now() }
    setPreguntas((p) => [...p, nueva])
    setExpandedId(nueva._localId || nueva.id)
  }

  const updatePregunta = (idxOrId, field, value) => {
    setPreguntas((prev) =>
      prev.map((p, i) => {
        const match = p._isNew ? p._localId === idxOrId : p.id === idxOrId
        if (!match) return p
        const updated = { ...p, [field]: value }
        if (field === 'tipo' && value === 'verdadero_falso') {
          updated.opciones = [
            { texto: 'Verdadero', es_correcta: false, orden: 0 },
            { texto: 'Falso', es_correcta: false, orden: 1 },
          ]
        }
        return updated
      })
    )
  }

  const updateOpcion = (pregKey, opIdx, field, value) => {
    setPreguntas((prev) =>
      prev.map((p) => {
        const match = p._isNew ? p._localId === pregKey : p.id === pregKey
        if (!match) return p
        const opciones = p.opciones.map((op, i) => {
          if (i !== opIdx) return field === 'es_correcta' ? { ...op, es_correcta: false } : op
          return { ...op, [field]: value }
        })
        return { ...p, opciones }
      })
    )
  }

  const addOpcion = (pregKey) => {
    setPreguntas((prev) =>
      prev.map((p) => {
        const match = p._isNew ? p._localId === pregKey : p.id === pregKey
        if (!match) return p
        return {
          ...p,
          opciones: [...p.opciones, { texto: '', es_correcta: false, orden: p.opciones.length }],
        }
      })
    )
  }

  const removeOpcion = (pregKey, opIdx) => {
    setPreguntas((prev) =>
      prev.map((p) => {
        const match = p._isNew ? p._localId === pregKey : p.id === pregKey
        if (!match) return p
        return { ...p, opciones: p.opciones.filter((_, i) => i !== opIdx) }
      })
    )
  }

  const savePregunta = async (pregunta) => {
    const key = pregunta._isNew ? pregunta._localId : pregunta.id
    if (!pregunta.texto.trim()) { setError('La pregunta necesita texto.'); return }
    if (!pregunta.opciones.some((o) => o.es_correcta)) {
      setError('Debe haber al menos una opción correcta.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        tipo: pregunta.tipo,
        texto: pregunta.texto,
        puntaje: pregunta.puntaje,
        orden: pregunta.orden,
        opciones: pregunta.opciones.map((op, i) => ({ ...op, orden: i })),
      }
      if (pregunta._isNew) {
        const created = await simuladoresApi.crearPregunta(simulador.id, payload)
        setPreguntas((prev) =>
          prev.map((p) => (p._localId === key ? { ...created } : p))
        )
        setExpandedId(created.id)
      } else {
        const updated = await simuladoresApi.actualizarPregunta(simulador.id, pregunta.id, payload)
        setPreguntas((prev) => prev.map((p) => (p.id === pregunta.id ? updated : p)))
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Error al guardar la pregunta.')
    } finally {
      setSaving(false)
    }
  }

  const deletePregunta = async (pregunta) => {
    if (!await showConfirm('¿Eliminar esta pregunta?')) return
    if (pregunta._isNew) {
      setPreguntas((p) => p.filter((q) => q._localId !== pregunta._localId))
      return
    }
    try {
      await simuladoresApi.eliminarPregunta(simulador.id, pregunta.id)
      setPreguntas((p) => p.filter((q) => q.id !== pregunta.id))
    } catch {
      alert('No se pudo eliminar la pregunta.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Preguntas del Simulador</h2>
            <p className="text-sm text-gray-500">{simulador.titulo}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            preguntas.map((pregunta, idx) => {
              const key = pregunta._isNew ? pregunta._localId : pregunta.id
              const isOpen = expandedId === key
              return (
                <PreguntaItem
                  key={key}
                  pregunta={pregunta}
                  pregKey={key}
                  idx={idx}
                  isOpen={isOpen}
                  onToggle={() => setExpandedId(isOpen ? null : key)}
                  onUpdate={updatePregunta}
                  onUpdateOpcion={updateOpcion}
                  onAddOpcion={addOpcion}
                  onRemoveOpcion={removeOpcion}
                  onSave={() => savePregunta(pregunta)}
                  onDelete={() => deletePregunta(pregunta)}
                  onExplicacion={() => setExplicacionModal(pregunta)}
                  saving={saving}
                />
              )
            })
          )}

          <button
            onClick={addPregunta}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl hover:bg-blue-50 transition text-sm font-medium"
          >
            <Plus size={16} />
            Agregar pregunta
          </button>
        </div>
      </div>

      {explicacionModal && (
        <ExplicacionModal
          simulador={simulador}
          pregunta={explicacionModal}
          onClose={() => setExplicacionModal(null)}
        />
      )}
    </div>
  )
}

// ── PreguntaItem ──────────────────────────────────────────────────────────────

function PreguntaItem({ pregunta, pregKey, idx, isOpen, onToggle, onUpdate, onUpdateOpcion,
  onAddOpcion, onRemoveOpcion, onSave, onDelete, onExplicacion, saving }) {

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
      >
        <span className="text-sm font-medium text-gray-700">
          <span className="text-gray-400 mr-2">#{idx + 1}</span>
          {pregunta.texto || <em className="text-gray-400">Sin texto…</em>}
        </span>
        {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {isOpen && (
        <div className="p-4 space-y-3 bg-white">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo</label>
              <select
                value={pregunta.tipo}
                onChange={(e) => onUpdate(pregKey, 'tipo', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Puntaje</label>
              <input
                type="number" min={0} value={pregunta.puntaje}
                onChange={(e) => onUpdate(pregKey, 'puntaje', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Texto */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Enunciado de la pregunta</label>
            <textarea
              value={pregunta.texto}
              onChange={(e) => onUpdate(pregKey, 'texto', e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Escribe la pregunta..."
            />
          </div>

          {/* Opciones */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Opciones (marca la correcta)</label>
            <div className="space-y-2">
              {pregunta.opciones.map((op, opIdx) => (
                <div key={opIdx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correcta-${pregKey}`}
                    checked={op.es_correcta}
                    onChange={() => onUpdateOpcion(pregKey, opIdx, 'es_correcta', true)}
                    className="accent-emerald-600 w-4 h-4 flex-shrink-0"
                  />
                  <input
                    value={op.texto}
                    onChange={(e) => onUpdateOpcion(pregKey, opIdx, 'texto', e.target.value)}
                    disabled={pregunta.tipo === 'verdadero_falso'}
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder={`Opción ${opIdx + 1}`}
                  />
                  {pregunta.tipo === 'multiple' && (
                    <button
                      onClick={() => onRemoveOpcion(pregKey, opIdx)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {pregunta.tipo === 'multiple' && (
              <button
                onClick={() => onAddOpcion(pregKey)}
                className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Agregar opción
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onExplicacion}
              disabled={pregunta._isNew}
              className="flex items-center gap-1.5 text-xs text-violet-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ImageIcon size={13} /> Explicación
            </button>
            <div className="flex gap-2">
              <button
                onClick={onDelete}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={13} /> Eliminar
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-1 px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-60"
              >
                <Save size={13} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ExplicacionModal ──────────────────────────────────────────────────────────

function ExplicacionModal({ simulador, pregunta, onClose }) {
  const existing = pregunta.explicacion || {}
  const [texto, setTexto] = useState(existing.texto || '')
  const [imagen, setImagen] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('texto', texto)
      if (imagen) fd.append('imagen', imagen)
      await simuladoresApi.guardarExplicacion(simulador.id, pregunta.id, fd)
      onClose()
    } catch {
      setError('Error al guardar la explicación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Explicación de la pregunta</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{pregunta.texto}</p>
          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Texto explicativo</label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Escribe la explicación..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Imagen (opcional)</label>
            {existing.imagen_url && (
              <img src={existing.imagen_url} alt="explicación" className="max-h-32 rounded-lg mb-2 object-contain" />
            )}
            <input type="file" accept="image/*" onChange={(e) => setImagen(e.target.files[0])}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl disabled:opacity-60">
              {saving ? 'Guardando…' : 'Guardar explicación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
