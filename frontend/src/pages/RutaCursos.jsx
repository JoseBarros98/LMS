import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Edit, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import CursoModal from '../components/CursoModal'
import { cursosApi } from '../api/cursos'
import { useAuth } from '../context/AuthContext'
import { formatCurrencyBs, formatDuration } from '../utils/formatters'
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
    duracionTotal: cursos.reduce((acc, curso) => acc + Number(curso.duracion_total_min || 0), 0),
  }), [cursos])

  const openEditCurso = (curso) => {
    setCursoEdit(curso)
    setCursoModalOpen(true)
  }

  const handleSubmitCurso = async (formData) => {
    if (!cursoEdit) return

    try {
      await cursosApi.updateCurso(cursoEdit.id, formData)
      showSuccess('Curso actualizado correctamente.')
      setCursoModalOpen(false)
      setCursoEdit(null)
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo actualizar el curso.'))
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

          <button
            onClick={() => navigate('/rutas')}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <ArrowLeft size={15} /> Volver a Rutas
          </button>
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

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : cursos.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-500">
            Esta ruta no tiene cursos registrados.
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
                {cursos.map((curso) => (
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
