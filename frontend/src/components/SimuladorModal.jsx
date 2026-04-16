import { useState } from 'react'
import { X } from 'lucide-react'
import { simuladoresApi } from '../api/simuladores'

export default function SimuladorModal({ simulador, onClose, onSaved }) {
  const isEdit = Boolean(simulador)
  const [form, setForm] = useState({
    titulo: simulador?.titulo || '',
    descripcion: simulador?.descripcion || '',
    imagen_portada_url: simulador?.imagen_portada_url || '',
    fecha_apertura: simulador?.fecha_apertura
      ? simulador.fecha_apertura.slice(0, 16)
      : '',
    fecha_cierre: simulador?.fecha_cierre
      ? simulador.fecha_cierre.slice(0, 16)
      : '',
    tiempo_limite_minutos: simulador?.tiempo_limite_minutos ?? 60,
    max_intentos: simulador?.max_intentos ?? 1,
    publicado: simulador?.publicado ?? false,
  })
  const [imagen, setImagen] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.titulo.trim()) { setError('El título es obligatorio.'); return }
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v === null ? '' : v))
      if (imagen) fd.append('imagen_portada', imagen)

      if (isEdit) {
        await simuladoresApi.updateSimulador(simulador.id, fd)
      } else {
        await simuladoresApi.createSimulador(fd)
      }
      onSaved()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Error al guardar el simulador.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? 'Editar Simulador' : 'Nuevo Simulador'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <Field label="Título *">
            <input name="titulo" value={form.titulo} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Simulacro 1" />
          </Field>

          <Field label="Descripción">
            <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Descripción del simulador..." />
          </Field>

          <Field label="URL de imagen portada">
            <input name="imagen_portada_url" value={form.imagen_portada_url} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://..." />
          </Field>

          <Field label="Imagen portada (archivo)">
            <input type="file" accept="image/*" onChange={(e) => setImagen(e.target.files[0])}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de apertura">
              <input type="datetime-local" name="fecha_apertura" value={form.fecha_apertura}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
            <Field label="Fecha de cierre">
              <input type="datetime-local" name="fecha_cierre" value={form.fecha_cierre}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tiempo límite (min)">
              <input type="number" name="tiempo_limite_minutos" min={1} value={form.tiempo_limite_minutos}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
            <Field label="Intentos permitidos">
              <input type="number" name="max_intentos" min={1} value={form.max_intentos}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" name="publicado" checked={form.publicado} onChange={handleChange}
              className="w-4 h-4 accent-blue-600 rounded" />
            Publicado
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition disabled:opacity-60">
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear simulador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
