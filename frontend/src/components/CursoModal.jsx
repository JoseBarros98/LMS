import { useMemo, useState } from 'react'
import { AlertCircle, X } from 'lucide-react'

const defaultForm = {
  ruta: '',
  titulo: '',
  descripcion: '',
  imagen_portada_url: '',
  nivel: 'avanzado',
  estado: 'disponible',
  publicado: false,
  orden: 0,
  slug: '',
  video_intro_url: '',
  tiene_mediateca: false,
  precio: 0,
}

export default function CursoModal({ cursoEdit, rutas, onSubmit, onClosed }) {
  const [formData, setFormData] = useState(() => {
    if (!cursoEdit) {
      return defaultForm
    }

    return {
      ruta: cursoEdit.ruta || '',
      titulo: cursoEdit.titulo || '',
      descripcion: cursoEdit.descripcion || '',
      imagen_portada_url: cursoEdit.imagen_portada_url || '',
      nivel: cursoEdit.nivel || 'avanzado',
      estado: cursoEdit.estado || 'disponible',
      publicado: Boolean(cursoEdit.publicado),
      orden: Number(cursoEdit.orden) || 0,
      slug: cursoEdit.slug || '',
      video_intro_url: cursoEdit.video_intro_url || '',
      tiene_mediateca: Boolean(cursoEdit.tiene_mediateca),
      precio: Number(cursoEdit.precio) || 0,
    }
  })
  const [portadaFile, setPortadaFile] = useState(null)
  const [error, setError] = useState('')

  const isEditing = Boolean(cursoEdit)

  const rutasById = useMemo(() => {
    const map = {}
    rutas.forEach((ruta) => {
      map[ruta.id] = ruta
    })
    return map
  }, [rutas])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (type === 'file') {
      setPortadaFile(e.target.files?.[0] || null)
      if (error) {
        setError('')
      }
      return
    }
    const nextValue = type === 'checkbox' ? checked : value
    setFormData((prev) => ({ ...prev, [name]: nextValue }))

    if (error) {
      setError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.ruta) {
      setError('Debes seleccionar una ruta para el curso.')
      return
    }

    if (!formData.titulo.trim()) {
      setError('El titulo es obligatorio.')
      return
    }

    if (!isEditing && !portadaFile) {
      setError('Debes subir una imagen de portada.')
      return
    }

    try {
      await onSubmit({
        ...formData,
        _imagen_portada_file: portadaFile,
        orden: Number(formData.orden) || 0,
        precio: Number(formData.precio) || 0,
      })
    } catch (submitError) {
      const apiError = submitError?.response?.data
      const message =
        typeof apiError === 'string'
          ? apiError
          : apiError?.detail ||
            apiError?.titulo?.[0] ||
            apiError?.slug?.[0] ||
            'No se pudo guardar el curso.'

      setError(message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {isEditing ? 'Editar Curso' : 'Nuevo Curso'}
          </h2>
          <button
            onClick={onClosed}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ruta</label>
              <select
                name="ruta"
                value={formData.ruta}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Selecciona una ruta</option>
                {rutas.map((ruta) => (
                  <option key={ruta.id} value={ruta.id}>
                    {ruta.titulo}
                  </option>
                ))}
              </select>
              {formData.ruta && rutasById[formData.ruta]?.descripcion && (
                <p className="mt-1 text-xs text-gray-500">{rutasById[formData.ruta].descripcion}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Titulo</label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Descripcion</label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Imagen portada {isEditing ? '(reemplazar opcional)' : '(obligatoria)'}</label>
              <input
                type="file"
                name="imagen_portada"
                accept="image/*"
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                required={!isEditing}
              />
              {(portadaFile || formData.imagen_portada_url) && (
                <p className="mt-1 text-xs text-gray-500 truncate">
                  {portadaFile ? `Seleccionada: ${portadaFile.name}` : 'El curso tiene portada actual cargada.'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Video intro URL</label>
              <input
                type="url"
                name="video_intro_url"
                value={formData.video_intro_url}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nivel</label>
              <select
                name="nivel"
                value={formData.nivel}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="basico">Basico</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="disponible">Disponible</option>
                <option value="proximo">Proximo</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Orden</label>
              <input
                type="number"
                min="0"
                name="orden"
                value={formData.orden}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Precio (Bs.)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Slug</label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="intromed-intensivo-2026"
              />
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="publicado"
                checked={formData.publicado}
                onChange={handleChange}
              />
              Publicado
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="tiene_mediateca"
                checked={formData.tiene_mediateca}
                onChange={handleChange}
              />
              Tiene mediateca
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClosed}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
            >
              {isEditing ? 'Guardar cambios' : 'Crear curso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
