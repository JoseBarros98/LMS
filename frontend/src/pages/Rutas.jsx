import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit, Plus, Sparkles, Trash2, UserPlus } from 'lucide-react'
import Layout from '../components/Layout'
import RutaModal from '../components/RutaModal'
import StudentEnrollmentModal from '../components/StudentEnrollmentModal'
import { cursosApi } from '../api/cursos'
import { useAuth } from '../context/AuthContext'
import { formatCurrencyBs, formatDuration } from '../utils/formatters'
import { getApiErrorMessage, showError, showSuccess } from '../utils/toast'

export default function Rutas() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [rutas, setRutas] = useState([])
  const [cursos, setCursos] = useState([])
  const [matriculasRuta, setMatriculasRuta] = useState([])
  const [loading, setLoading] = useState(true)
  const [rutaModalOpen, setRutaModalOpen] = useState(false)
  const [rutaEdit, setRutaEdit] = useState(null)
  const [rutaEnrollmentTarget, setRutaEnrollmentTarget] = useState(null)
  const [rutaEnrollmentError, setRutaEnrollmentError] = useState('')
  const [submittingRutaEnrollment, setSubmittingRutaEnrollment] = useState(false)

  const isAdmin = user?.role?.name?.toLowerCase() === 'administrador'

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [rutasData, cursosData, matriculasRutaData] = await Promise.all([
        cursosApi.getRutas(),
        cursosApi.getCursos(),
        cursosApi.getMatriculasRuta(),
      ])

      setRutas(Array.isArray(rutasData) ? rutasData : [])
      setCursos(Array.isArray(cursosData) ? cursosData : [])
      setMatriculasRuta(Array.isArray(matriculasRutaData) ? matriculasRutaData : [])
    } catch {
      setRutas([])
      setCursos([])
      setMatriculasRuta([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openCreateRuta = () => {
    setRutaEdit(null)
    setRutaModalOpen(true)
  }

  const openEditRuta = (ruta) => {
    setRutaEdit(ruta)
    setRutaModalOpen(true)
  }

  const handleSubmitRuta = async (formData) => {
    try {
      if (rutaEdit) {
        await cursosApi.updateRuta(rutaEdit.id, formData)
        showSuccess('Ruta actualizada correctamente.')
      } else {
        await cursosApi.createRuta(formData)
        showSuccess('Ruta creada correctamente.')
      }

      setRutaModalOpen(false)
      setRutaEdit(null)
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo guardar la ruta.'))
    }
  }

  const handleDeleteRuta = async (ruta) => {
    const hasCourses = cursos.some((curso) => curso.ruta === ruta.id)
    const message = hasCourses
      ? `La ruta "${ruta.titulo}" tiene cursos asociados y tambien se eliminaran. ¿Deseas continuar?`
      : `¿Eliminar la ruta "${ruta.titulo}"?`

    const ok = window.confirm(message)
    if (!ok) return

    try {
      await cursosApi.deleteRuta(ruta.id)
      showSuccess('Ruta eliminada correctamente.')
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo eliminar la ruta.'))
    }
  }

  const handleCreateStudentForRuta = async (form) => {
    if (!rutaEnrollmentTarget) return

    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin < form.fecha_inicio) {
      setRutaEnrollmentError('La fecha fin no puede ser menor que la fecha inicio.')
      showError('La fecha fin no puede ser menor que la fecha inicio.')
      return
    }

    try {
      setSubmittingRutaEnrollment(true)
      setRutaEnrollmentError('')
      await cursosApi.createStudentAndEnrollInRuta(rutaEnrollmentTarget.id, form)
      showSuccess('Estudiante creado y matriculado en la ruta.')
      setRutaEnrollmentTarget(null)
      await loadData()
    } catch (error) {
      const message = getApiErrorMessage(error, 'No se pudo crear y matricular al estudiante en esta ruta.')
      setRutaEnrollmentError(message)
      showError(message)
    } finally {
      setSubmittingRutaEnrollment(false)
    }
  }

  const inscritosPorRuta = matriculasRuta.reduce((acc, matricula) => {
    if (!matricula?.ruta || matricula?.activa === false) return acc
    acc[matricula.ruta] = (acc[matricula.ruta] || 0) + 1
    return acc
  }, {})

  const cursosPorRuta = cursos.reduce((acc, curso) => {
    if (!curso?.ruta) return acc
    acc[curso.ruta] = (acc[curso.ruta] || 0) + 1
    return acc
  }, {})

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Rutas</h1>
            <p className="text-sm text-gray-500">Gestiona las rutas academicas visibles en la seccion Academia.</p>
          </div>

          {isAdmin && (
            <button
              onClick={openCreateRuta}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition flex items-center gap-2 text-sm font-medium"
            >
              <Plus size={16} />
              Nueva Ruta
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : rutas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <Sparkles className="mx-auto text-gray-400 mb-4" size={42} />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No hay rutas para mostrar</h3>
            <p className="text-sm text-gray-500">Crea una ruta para comenzar a organizar los cursos.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Ruta</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Precio</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Duracion</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Cursos</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Inscritos</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rutas.map((ruta) => (
                  <tr key={ruta.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{ruta.titulo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-1 rounded-full ${ruta.publicado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {ruta.publicado ? 'Publicada' : 'Borrador'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{formatCurrencyBs(ruta.precio_total)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDuration(ruta.duracion_total_min)}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{cursosPorRuta[ruta.id] || 0}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{inscritosPorRuta[ruta.id] || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => navigate(`/rutas/${ruta.id}/cursos`)}
                          className="px-2.5 py-1.5 rounded-lg text-xs bg-gray-900 text-white hover:bg-gray-800 transition"
                        >
                          Show
                        </button>
                        <button
                          onClick={() => navigate(`/rutas/${ruta.id}/inscripciones`)}
                          className="px-2.5 py-1.5 rounded-lg text-xs bg-sky-100 text-sky-700 hover:bg-sky-200 transition"
                        >
                          Inscripciones
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setRutaEnrollmentError('')
                              setRutaEnrollmentTarget(ruta)
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition inline-flex items-center gap-1"
                          >
                            <UserPlus size={12} /> Matricular
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => openEditRuta(ruta)}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition inline-flex items-center gap-1"
                          >
                            <Edit size={12} /> Editar
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteRuta(ruta)}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-red-100 text-red-700 hover:bg-red-200 transition inline-flex items-center gap-1"
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

        {rutaModalOpen && isAdmin && (
          <RutaModal
            key={rutaEdit?.id || 'new-route'}
            rutaEdit={rutaEdit}
            onSubmit={handleSubmitRuta}
            onClosed={() => {
              setRutaModalOpen(false)
              setRutaEdit(null)
            }}
          />
        )}

        {rutaEnrollmentTarget && isAdmin && (
          <StudentEnrollmentModal
            title="Nuevo estudiante para esta ruta"
            subtitle={`Se creara con rol Estudiante y quedara matriculado en ${rutaEnrollmentTarget.titulo}.`}
            submitLabel="Crear y matricular"
            loading={submittingRutaEnrollment}
            error={rutaEnrollmentError}
            enrollmentType="ruta"
            onSubmit={handleCreateStudentForRuta}
            onClose={() => {
              if (submittingRutaEnrollment) return
              setRutaEnrollmentTarget(null)
              setRutaEnrollmentError('')
            }}
          />
        )}
      </div>
    </Layout>
  )
}
