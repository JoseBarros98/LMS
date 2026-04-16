import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Edit, Plus, Search, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import CursoModal from '../components/CursoModal'
import { cursosApi } from '../api/cursos'
import { useAuth } from '../context/AuthContext'
import { formatCurrencyBs, formatDuration, sumDurations } from '../utils/formatters'
import { getApiErrorMessage, showError, showSuccess } from '../utils/toast'

export default function RutaCursos() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const [ruta, setRuta] = useState(null)
  const [rutas, setRutas] = useState([])
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [cursoEdit, setCursoEdit] = useState(null)
  const [cursoModalOpen, setCursoModalOpen] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const isAdmin = user?.role?.name?.toLowerCase() === 'administrador'

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [rutasData, cursosData] = await Promise.all([
        cursosApi.getRutas(),
        cursosApi.getCursos({ ruta_id: id }),
      ])

      const rutaActual = Array.isArray(rutasData) ? rutasData.find((item) => item.id === id) : null
      setRutas(Array.isArray(rutasData) ? rutasData : [])
      setRuta(rutaActual || null)
      setCursos(Array.isArray(cursosData) ? cursosData : [])
    } catch {
      setRutas([])
      setRuta(null)
      setCursos([])
      showError('No se pudo cargar la vista de cursos de la ruta.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const rutaResumen = useMemo(() => ({
    totalCursos: cursos.length,
    montoTotal: cursos.reduce((acc, curso) => acc + Number(curso.precio || 0), 0),
    duracionTotal: sumDurations(cursos.map((curso) => curso.duracion_total_min)),
  }), [cursos])

  const cursosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase()
    if (!query) return cursos

    return cursos.filter((curso) => {
      const titulo = (curso.titulo || '').toLowerCase()
      const nivel = (curso.nivel_label || curso.nivel || '').toLowerCase()
      const estado = (curso.estado_label || curso.estado || '').toLowerCase()
      const publicacion = curso.publicado ? 'publicado' : 'borrador'
      return [titulo, nivel, estado, publicacion].some((value) => value.includes(query))
    })
  }, [busqueda, cursos])

  const openEditCurso = (curso) => {
    setCursoEdit(curso)
    setCursoModalOpen(true)
  }

  const openCreateCurso = () => {
    setCursoEdit(null)
    setCursoModalOpen(true)
  }

  const handleSubmitCurso = async (formData) => {
    try {
      if (cursoEdit) {
        await cursosApi.updateCurso(cursoEdit.id, formData)
        showSuccess('Curso actualizado correctamente.')
      } else {
        await cursosApi.createCurso({ ...formData, ruta: id })
        showSuccess('Curso creado correctamente en la ruta.')
      }
      setCursoModalOpen(false)
      setCursoEdit(null)
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo guardar el curso.'))
    }
  }

  const handleDeleteCurso = async (curso) => {
    const ok = window.confirm(`¿Eliminar el curso "${curso.titulo}" de esta ruta?`)
    if (!ok) return

    try {
      await cursosApi.deleteCurso(curso.id)
      showSuccess('Curso eliminado correctamente.')
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo eliminar el curso.'))
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Cursos de la Ruta</h1>
            <p className="text-sm text-gray-500">{ruta?.titulo || 'Ruta seleccionada'}</p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={openCreateCurso}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Plus size={15} /> Crear curso
              </button>
            )}
            <button
              onClick={() => navigate('/rutas')}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
            >
              <ArrowLeft size={15} /> Volver a Rutas
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase">Cursos</p>
            <p className="text-xl font-bold text-gray-800">{rutaResumen.totalCursos}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase">Monto total</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrencyBs(rutaResumen.montoTotal)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase">Duracion total</p>
            <p className="text-xl font-bold text-gray-800">{formatDuration(rutaResumen.duracionTotal)}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <label className="relative block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar curso en esta ruta"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : cursosFiltrados.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-500 space-y-3">
            <p>{cursos.length === 0 ? 'Esta ruta no tiene cursos registrados.' : 'No hay cursos que coincidan con la busqueda.'}</p>
            {isAdmin && cursos.length === 0 && (
              <button
                onClick={openCreateCurso}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Plus size={15} /> Crear curso en esta ruta
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Curso</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Publicacion</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Estado</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Lecciones</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Duracion</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Precio</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cursosFiltrados.map((curso) => (
                  <tr key={curso.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{curso.titulo}</p>
                      <p className="text-xs text-gray-500">{curso.nivel_label || curso.nivel}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-1 rounded-full ${curso.publicado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {curso.publicado ? 'Publicado' : 'Borrador'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{curso.estado_label || curso.estado}</td>
                    <td className="px-4 py-3 text-gray-700">{curso.total_lecciones || 0}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDuration(curso.duracion_total_min)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrencyBs(curso.precio)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => navigate(`/courses/${curso.id}`)}
                          className="px-2.5 py-1.5 rounded-lg text-xs bg-gray-900 text-white hover:bg-gray-800 inline-flex items-center gap-1"
                        >
                          <BookOpen size={12} /> Detalle
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => openEditCurso(curso)}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 inline-flex items-center gap-1"
                          >
                            <Edit size={12} /> Editar
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteCurso(curso)}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {cursoModalOpen && isAdmin && (
          <CursoModal
            key={cursoEdit?.id || 'route-course-edit'}
            cursoEdit={cursoEdit}
            rutas={rutas}
            fixedRutaId={cursoEdit ? null : id}
            fixedRutaTitulo={ruta?.titulo || ''}
            onSubmit={handleSubmitCurso}
            onClosed={() => {
              setCursoModalOpen(false)
              setCursoEdit(null)
            }}
          />
        )}
      </div>
    </Layout>
  )
}
