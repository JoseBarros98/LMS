import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import Layout from '../components/Layout'
import EnrollmentDetailModal from '../components/EnrollmentDetailModal'
import StudentEnrollmentModal from '../components/StudentEnrollmentModal'
import { cursosApi } from '../api/cursos'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage, showError, showSuccess } from '../utils/toast'

export default function CursoInscripciones() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()

  const [curso, setCurso] = useState(null)
  const [matriculasCurso, setMatriculasCurso] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEnrollmentDetail, setSelectedEnrollmentDetail] = useState(null)
  const [editingEnrollment, setEditingEnrollment] = useState(null)
  const [savingEnrollmentEdit, setSavingEnrollmentEdit] = useState(false)
  const [cursoEnrollmentError, setCursoEnrollmentError] = useState('')
  const [submittingCursoEnrollment, setSubmittingCursoEnrollment] = useState(false)
  const [cursoEnrollmentTarget, setCursoEnrollmentTarget] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  const isAdmin = user?.role?.name?.toLowerCase() === 'administrador'

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [cursosData, matriculasCursoData] = await Promise.all([
        cursosApi.getCursos(),
        cursosApi.getMatriculasCurso({ curso_id: id }),
      ])
      const cursoActual = Array.isArray(cursosData) ? cursosData.find((item) => item.id === id) : null
      setCurso(cursoActual || null)
      setMatriculasCurso(Array.isArray(matriculasCursoData) ? matriculasCursoData : [])
    } catch {
      setCurso(null)
      setMatriculasCurso([])
      showError('No se pudieron cargar las inscripciones del curso.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeleteMatriculaCurso = async (matricula) => {
    const ok = window.confirm(`¿Eliminar la matricula de ${matricula.user_nombre}?`)
    if (!ok) return

    try {
      await cursosApi.deleteMatriculaCurso(matricula.id)
      showSuccess('Matricula eliminada correctamente.')
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo eliminar la matricula.'))
    }
  }

  const openEditEnrollment = (matricula) => {
    setEditingEnrollment({
      id: matricula.id,
      fecha_inicio: matricula.fecha_inicio || '',
      fecha_fin: matricula.fecha_fin || '',
      activa: Boolean(matricula.activa),
    })
  }

  const handleEditEnrollmentInput = (event) => {
    const { name, value, type, checked } = event.target
    const nextValue = type === 'checkbox' ? checked : value
    setEditingEnrollment((previous) => (previous ? { ...previous, [name]: nextValue } : previous))
  }

  const handleSaveEnrollmentEdit = async () => {
    if (!editingEnrollment) return

    try {
      setSavingEnrollmentEdit(true)
      await cursosApi.updateMatriculaCurso(editingEnrollment.id, {
        fecha_inicio: editingEnrollment.fecha_inicio || null,
        fecha_fin: editingEnrollment.fecha_fin || null,
        activa: editingEnrollment.activa,
      })
      showSuccess('Matricula actualizada correctamente.')
      setEditingEnrollment(null)
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo actualizar la matricula.'))
    } finally {
      setSavingEnrollmentEdit(false)
    }
  }

  const handleCreateStudentForCurso = async (form) => {
    if (!cursoEnrollmentTarget) return

    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin < form.fecha_inicio) {
      setCursoEnrollmentError('La fecha fin no puede ser menor que la fecha inicio.')
      showError('La fecha fin no puede ser menor que la fecha inicio.')
      return
    }

    try {
      setSubmittingCursoEnrollment(true)
      setCursoEnrollmentError('')
      await cursosApi.createStudentAndEnrollInCurso(cursoEnrollmentTarget.id, form)
      showSuccess('Estudiante creado y matriculado en el curso.')
      setCursoEnrollmentTarget(null)
      await loadData()
    } catch (error) {
      const message = getApiErrorMessage(error, 'No se pudo crear y matricular al estudiante en este curso.')
      setCursoEnrollmentError(message)
      showError(message)
    } finally {
      setSubmittingCursoEnrollment(false)
    }
  }

  const refreshSelectedEnrollmentDetail = async () => {
    if (!selectedEnrollmentDetail) return
    await loadData()
    const refreshed = (await cursosApi.getMatriculasCurso({ curso_id: id })).find((item) => item.id === selectedEnrollmentDetail.id)
    if (refreshed) {
      setSelectedEnrollmentDetail(refreshed)
    }
  }

  const matriculasFiltradas = useMemo(() => {
    const query = busqueda.trim().toLowerCase()
    if (!query) return matriculasCurso

    return matriculasCurso.filter((matricula) => {
      const nombre = (matricula.user_nombre || '').toLowerCase()
      const ci = (matricula.user_ci || '').toLowerCase()
      const telefono = (matricula.user_telefono || '').toLowerCase()
      const estado = (matricula.user_estado || '').toLowerCase()
      const matriculadoPor = (matricula.created_by_nombre || '').toLowerCase()
      return [nombre, ci, telefono, estado, matriculadoPor].some((value) => value.includes(query))
    })
  }, [busqueda, matriculasCurso])

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Inscripciones del Curso</h1>
            <p className="text-sm text-gray-500">{curso?.titulo || 'Curso seleccionado'}</p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => {
                  setCursoEnrollmentError('')
                  setCursoEnrollmentTarget(curso)
                }}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
              >
                Matricular estudiante
              </button>
            )}
            <button
              onClick={() => navigate('/courses')}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
            >
              <ArrowLeft size={15} /> Volver a Cursos
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <label className="relative block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, CI, telefono, estado o matriculador"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : matriculasFiltradas.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-500">
            {matriculasCurso.length === 0
              ? 'No hay estudiantes matriculados en este curso.'
              : 'No se encontraron inscripciones con ese termino de busqueda.'}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Nombre completo</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Documento/CI</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Telefono</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Estado</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Fecha matriculacion</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Matriculado por</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Opciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {matriculasFiltradas.map((matricula) => (
                  <tr key={matricula.id}>
                    <td className="px-4 py-3">{matricula.user_nombre}</td>
                    <td className="px-4 py-3">{matricula.user_ci || '-'}</td>
                    <td className="px-4 py-3">{matricula.user_telefono || '-'}</td>
                    <td className="px-4 py-3">{matricula.user_estado || '-'}</td>
                    <td className="px-4 py-3">{new Date(matricula.created_at).toLocaleDateString('es-BO')}</td>
                    <td className="px-4 py-3">{matricula.created_by_nombre || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isAdmin && (
                          <button
                            onClick={() => openEditEnrollment(matricula)}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            Editar
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteMatriculaCurso(matricula)}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            Eliminar
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedEnrollmentDetail(matricula)}
                          className="px-2.5 py-1.5 rounded-lg text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        >
                          Ver detalle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedEnrollmentDetail && (
          <EnrollmentDetailModal
            enrollment={selectedEnrollmentDetail}
            type="curso"
            onUpdated={refreshSelectedEnrollmentDetail}
            onClose={() => setSelectedEnrollmentDetail(null)}
          />
        )}

        {editingEnrollment && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl p-5 space-y-4">
              <h3 className="text-base font-semibold text-gray-800">Editar matricula</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="date"
                  name="fecha_inicio"
                  value={editingEnrollment.fecha_inicio}
                  onChange={handleEditEnrollmentInput}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  type="date"
                  name="fecha_fin"
                  value={editingEnrollment.fecha_fin}
                  onChange={handleEditEnrollmentInput}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="activa"
                  checked={editingEnrollment.activa}
                  onChange={handleEditEnrollmentInput}
                />
                Matricula activa
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEnrollment(null)}
                  disabled={savingEnrollmentEdit}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEnrollmentEdit}
                  disabled={savingEnrollmentEdit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60"
                >
                  {savingEnrollmentEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        )}

        {cursoEnrollmentTarget && isAdmin && (
          <StudentEnrollmentModal
            title="Nuevo estudiante para este curso"
            subtitle={`Se creara con rol Estudiante y quedara matriculado en ${cursoEnrollmentTarget.titulo}.`}
            submitLabel="Crear y matricular"
            loading={submittingCursoEnrollment}
            error={cursoEnrollmentError}
            enrollmentType="curso"
            onSubmit={handleCreateStudentForCurso}
            onClose={() => {
              if (submittingCursoEnrollment) return
              setCursoEnrollmentTarget(null)
              setCursoEnrollmentError('')
            }}
          />
        )}
      </div>
    </Layout>
  )
}
