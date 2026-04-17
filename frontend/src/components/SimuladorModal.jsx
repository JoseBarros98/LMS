import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { simuladoresApi } from '../api/simuladores'
import { cursosApi } from '../api/cursos'

export default function SimuladorModal({ simulador, onClose, onSaved }) {
  const isEdit = Boolean(simulador)
  const [routeForCourse, setRouteForCourse] = useState('')
  const [courseScope, setCourseScope] = useState('ruta')
  const [courseInput, setCourseInput] = useState('')
  const [form, setForm] = useState({
    titulo: simulador?.titulo || '',
    descripcion: simulador?.descripcion || '',
    imagen_portada_url: simulador?.imagen_portada_url || '',
    tiempo_limite_minutos: simulador?.tiempo_limite_minutos ?? 60,
    max_intentos: simulador?.max_intentos ?? 1,
    publicado: simulador?.publicado ?? false,
    curso: simulador?.curso || '',
    ruta: simulador?.ruta || '',
  })
  const [imagen, setImagen] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cursos, setCursos] = useState([])
  const [rutas, setRutas] = useState([])

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [cursosData, rutasData] = await Promise.all([
          cursosApi.getCursos({ solo_publicados: false }),
          cursosApi.getRutas(),
        ])
        setCursos(Array.isArray(cursosData) ? cursosData : [])
        setRutas(Array.isArray(rutasData) ? rutasData : [])
      } catch {
        setCursos([])
        setRutas([])
      }
    }

    loadOptions()
  }, [])

  useEffect(() => {
    if (cursos.length === 0) return

    if (simulador?.ruta && !simulador?.curso) {
      setCourseScope('ruta')
      setRouteForCourse(simulador.ruta)
      return
    }

    if (!simulador?.curso) return

    const currentCourse = cursos.find((c) => c.id === simulador.curso)
    if (!currentCourse) return

    if (currentCourse.ruta) {
      setCourseScope('ruta')
      setRouteForCourse(currentCourse.ruta)
    } else {
      setCourseScope('sin_ruta')
      setRouteForCourse('')
    }
  }, [simulador?.curso, cursos])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const cursosConRutaSeleccionada = cursos.filter(
    (curso) => String(curso.ruta || '') === String(routeForCourse || '')
  )
  const cursosSinRuta = cursos.filter((curso) => !curso.ruta)

  const availableCourses = courseScope === 'ruta' ? cursosConRutaSeleccionada : cursosSinRuta

  const courseOptions = useMemo(() => {
    return availableCourses.map((curso) => ({
      id: curso.id,
      label: curso.titulo,
    }))
  }, [availableCourses])

  useEffect(() => {
    if (!form.curso) {
      setCourseInput('')
      return
    }
    const selected = cursos.find((c) => c.id === form.curso)
    if (selected) setCourseInput(selected.titulo)
  }, [form.curso, cursos])

  const handleRouteForCourseChange = (routeId) => {
    setRouteForCourse(routeId)
    setCourseInput('')
    setForm((prev) => ({ ...prev, curso: '', ruta: '' }))
  }

  const handleCourseScopeChange = (scope) => {
    setCourseScope(scope)
    setRouteForCourse('')
    setCourseInput('')
    setForm((prev) => ({ ...prev, curso: '', ruta: '' }))
  }

  const handleCourseInputChange = (value) => {
    setCourseInput(value)
    const selected = courseOptions.find((opt) => opt.label === value)
    setForm((prev) => ({ ...prev, curso: selected ? selected.id : '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.titulo.trim()) { setError('El título es obligatorio.'); return }

    const payload = { ...form }

    if (courseScope === 'ruta' && !routeForCourse) {
      setError('Debes seleccionar primero una ruta para listar sus cursos.')
      return
    }
    if (!form.curso) {
      setError('Debes seleccionar un curso.')
      return
    }
    payload.ruta = ''

    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v === null ? '' : v))
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

          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-600">Asociación del simulador</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCourseScopeChange('ruta')}
                className={`px-3 py-2 rounded-xl text-xs border transition ${courseScope === 'ruta'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Curso dentro de una ruta
              </button>
              <button
                type="button"
                onClick={() => handleCourseScopeChange('sin_ruta')}
                className={`px-3 py-2 rounded-xl text-xs border transition ${courseScope === 'sin_ruta'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Curso sin ruta
              </button>
            </div>

            {courseScope === 'ruta' && (
              <Field label="Ruta del curso">
                <select
                  value={routeForCourse}
                  onChange={(e) => handleRouteForCourseChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar ruta…</option>
                  {rutas.map((ruta) => (
                    <option key={ruta.id} value={ruta.id}>{ruta.titulo}</option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Curso">
              <input
                list="simulador-course-options"
                value={courseInput}
                onChange={(e) => handleCourseInputChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Buscar y seleccionar curso por nombre..."
                disabled={courseScope === 'ruta' && !routeForCourse}
              />
              <datalist id="simulador-course-options">
                {courseOptions.map((curso) => (
                  <option key={curso.id} value={curso.label} />
                ))}
              </datalist>
            </Field>
          </div>
          <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
            La disponibilidad se calcula automáticamente: el simulador estará disponible 7 días desde que el estudiante completa el curso/ruta. También puedes asignar ventanas individuales por usuario.
          </p>

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
