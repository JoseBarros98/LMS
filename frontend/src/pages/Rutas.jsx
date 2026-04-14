import { Fragment, useCallback, useEffect, useState } from 'react'
import { Edit, Plus, Sparkles, Trash2, UserPlus } from 'lucide-react'
import Layout from '../components/Layout'
import EnrollmentDetailModal from '../components/EnrollmentDetailModal'
import RutaModal from '../components/RutaModal'
import StudentEnrollmentModal from '../components/StudentEnrollmentModal'
import { cursosApi } from '../api/cursos'
import { useAuth } from '../context/AuthContext'
import { formatCurrencyBs, formatDuration } from '../utils/formatters'
import { getApiErrorMessage, showError, showSuccess } from '../utils/toast'

export default function Rutas() {
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
  const [expandedRutaId, setExpandedRutaId] = useState(null)
  const [selectedEnrollmentDetail, setSelectedEnrollmentDetail] = useState(null)
  const [editingEnrollment, setEditingEnrollment] = useState(null)
  const [savingEnrollmentEdit, setSavingEnrollmentEdit] = useState(false)

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

  const handleDeleteMatriculaRuta = async (matricula) => {
    const ok = window.confirm(`¿Eliminar la matricula de ${matricula.user_nombre}?`)
    if (!ok) return

    try {
      await cursosApi.deleteMatriculaRuta(matricula.id)
      showSuccess('Matricula eliminada correctamente.')
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo eliminar la matricula.'))
    }
  }

  const openEditEnrollment = (matricula) => {
    setEditingEnrollment({
      id: matricula.id,
      plan_pago: matricula.plan_pago,
      numero_cuotas: matricula.numero_cuotas,
      fecha_inicio: matricula.fecha_inicio || '',
      fecha_fin: matricula.fecha_fin || '',
      activa: Boolean(matricula.activa),
    })
  }

  const handleEditEnrollmentInput = (event) => {
    const { name, value, type, checked } = event.target
    const nextValue = type === 'checkbox' ? checked : value

    setEditingEnrollment((previous) => {
      if (!previous) return previous

      if (name === 'plan_pago') {
        return {
          ...previous,
          plan_pago: nextValue,
          numero_cuotas: nextValue === 'credito' ? previous.numero_cuotas : previous.numero_cuotas,
        }
      }

      return { ...previous, [name]: nextValue }
    })
  }

  const handleSaveEnrollmentEdit = async () => {
    if (!editingEnrollment) return

    try {
      setSavingEnrollmentEdit(true)
      await cursosApi.updateMatriculaRuta(editingEnrollment.id, {
        plan_pago: editingEnrollment.plan_pago,
        numero_cuotas: editingEnrollment.plan_pago === 'contado' ? Number(editingEnrollment.numero_cuotas || 1) : undefined,
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Inscritos</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Cursos</th>
                  {isAdmin && (
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rutas.map((ruta) => {
                  const rutaCursos = cursos.filter((curso) => curso.ruta === ruta.id)
                  const rutaMatriculas = matriculasRuta.filter((matricula) => matricula.ruta === ruta.id)
                  const isExpanded = expandedRutaId === ruta.id

                  return (
                    <Fragment key={ruta.id}>
                      <tr className="hover:bg-gray-50 transition">
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
                        <td className="px-4 py-3 text-gray-700 font-medium">
                          {inscritosPorRuta[ruta.id] || 0}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedRutaId(isExpanded ? null : ruta.id)}
                            className="px-3 py-1.5 rounded-lg text-xs bg-gray-900 text-white hover:bg-gray-800 transition"
                          >
                            {isExpanded ? 'Hide' : 'Show'}
                          </button>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setRutaEnrollmentError('')
                                  setRutaEnrollmentTarget(ruta)
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition inline-flex items-center gap-1"
                              >
                                <UserPlus size={12} /> Matricular
                              </button>
                              <button
                                onClick={() => openEditRuta(ruta)}
                                className="px-2.5 py-1.5 rounded-lg text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition inline-flex items-center gap-1"
                              >
                                <Edit size={12} /> Editar
                              </button>
                              <button
                                onClick={() => handleDeleteRuta(ruta)}
                                className="px-2.5 py-1.5 rounded-lg text-xs bg-red-100 text-red-700 hover:bg-red-200 transition inline-flex items-center gap-1"
                              >
                                <Trash2 size={12} /> Eliminar
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>

                      {isExpanded && (
                        <tr className="bg-gray-50/70">
                          <td colSpan={isAdmin ? 7 : 6} className="px-4 py-3">
                            {rutaCursos.length === 0 ? (
                              <p className="text-sm text-gray-500">Esta ruta no tiene cursos asociados.</p>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase">Cursos de la ruta</p>
                                <div className="space-y-1">
                                  {rutaCursos.map((curso) => (
                                    <div key={curso.id} className="flex items-center justify-between border border-gray-200 bg-white rounded-lg px-3 py-2">
                                      <span className="text-sm text-gray-700 font-medium">{curso.titulo}</span>
                                      <div className="flex items-center gap-4">
                                        <span className="text-xs text-gray-500">Precio: {formatCurrencyBs(curso.precio)}</span>
                                        <span className="text-xs text-gray-500">Duracion: {formatDuration(curso.duracion_total_min)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <p className="text-xs font-semibold text-gray-500 uppercase pt-2">Estudiantes matriculados</p>
                                {rutaMatriculas.length === 0 ? (
                                  <p className="text-sm text-gray-500">No hay estudiantes matriculados en esta ruta.</p>
                                ) : (
                                  <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                          <th className="text-left px-3 py-2">Nombre completo</th>
                                          <th className="text-left px-3 py-2">Documento/CI</th>
                                          <th className="text-left px-3 py-2">Telefono</th>
                                          <th className="text-left px-3 py-2">Estado</th>
                                          <th className="text-left px-3 py-2">Fecha matriculacion</th>
                                          <th className="text-left px-3 py-2">Matriculado por</th>
                                          <th className="text-left px-3 py-2">Opciones</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {rutaMatriculas.map((matricula) => (
                                          <tr key={matricula.id}>
                                            <td className="px-3 py-2">{matricula.user_nombre}</td>
                                            <td className="px-3 py-2">{matricula.user_ci || '-'}</td>
                                            <td className="px-3 py-2">{matricula.user_telefono || '-'}</td>
                                            <td className="px-3 py-2">{matricula.user_estado || '-'}</td>
                                            <td className="px-3 py-2">{new Date(matricula.created_at).toLocaleDateString('es-BO')}</td>
                                            <td className="px-3 py-2">{matricula.created_by_nombre || '-'}</td>
                                            <td className="px-3 py-2">
                                              <div className="flex items-center gap-1.5">
                                                <button
                                                  onClick={() => openEditEnrollment(matricula)}
                                                  className="px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                                                >
                                                  Editar
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteMatriculaRuta(matricula)}
                                                  className="px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                                                >
                                                  Eliminar
                                                </button>
                                                <button
                                                  onClick={() => setSelectedEnrollmentDetail(matricula)}
                                                  className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
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
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
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

        {selectedEnrollmentDetail && (
          <EnrollmentDetailModal
            enrollment={selectedEnrollmentDetail}
            type="ruta"
            onClose={() => setSelectedEnrollmentDetail(null)}
          />
        )}

        {editingEnrollment && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl p-5 space-y-4">
              <h3 className="text-base font-semibold text-gray-800">Editar matricula</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  name="plan_pago"
                  value={editingEnrollment.plan_pago}
                  onChange={handleEditEnrollmentInput}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="contado">Plan contado</option>
                  <option value="credito">Plan credito</option>
                </select>

                {editingEnrollment.plan_pago === 'contado' ? (
                  <select
                    name="numero_cuotas"
                    value={editingEnrollment.numero_cuotas}
                    onChange={handleEditEnrollmentInput}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value={1}>1 pago</option>
                    <option value={2}>2 pagos</option>
                  </select>
                ) : (
                  <input
                    value="Cuotas automaticas por duracion"
                    disabled
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100"
                  />
                )}

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
      </div>
    </Layout>
  )
}
