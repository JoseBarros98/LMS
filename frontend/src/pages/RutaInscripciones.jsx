import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Search } from 'lucide-react'
import Layout from '../components/Layout'
import EnrollmentDetailModal from '../components/EnrollmentDetailModal'
import GeneratedPasswordModal from '../components/GeneratedPasswordModal'
import StudentEnrollmentModal from '../components/StudentEnrollmentModal'
import { cursosApi } from '../api/cursos'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage, showConfirm, showError, showSuccess } from '../utils/toast'
import { getGeneratedCredentialByEmail, rememberGeneratedCredential } from '../utils/enrollmentCredentials'
import { buildEnrollmentWhatsappLink } from '../utils/whatsapp'

export default function RutaInscripciones() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()

  const [ruta, setRuta] = useState(null)
  const [matriculasRuta, setMatriculasRuta] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEnrollmentDetail, setSelectedEnrollmentDetail] = useState(null)
  const [editingEnrollment, setEditingEnrollment] = useState(null)
  const [savingEnrollmentEdit, setSavingEnrollmentEdit] = useState(false)
  const [rutaEnrollmentError, setRutaEnrollmentError] = useState('')
  const [submittingRutaEnrollment, setSubmittingRutaEnrollment] = useState(false)
  const [rutaEnrollmentTarget, setRutaEnrollmentTarget] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [generatedCredentials, setGeneratedCredentials] = useState(null)

  const isAdmin = user?.role?.name?.toLowerCase() === 'administrador'

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [rutasData, matriculasRutaData] = await Promise.all([
        cursosApi.getRutas(),
        cursosApi.getMatriculasRuta({ ruta_id: id }),
      ])
      const rutaActual = Array.isArray(rutasData) ? rutasData.find((item) => item.id === id) : null
      setRuta(rutaActual || null)
      setMatriculasRuta(Array.isArray(matriculasRutaData) ? matriculasRutaData : [])
    } catch {
      setRuta(null)
      setMatriculasRuta([])
      showError('No se pudieron cargar las inscripciones de la ruta.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeleteMatriculaRuta = async (matricula) => {
    const ok = await showConfirm(`¿Eliminar la matricula de ${matricula.user_nombre}?`)
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
      if (form.mode === 'existing') {
        await cursosApi.enrollExistingStudentInRuta(rutaEnrollmentTarget.id, form)
        showSuccess('Estudiante existente matriculado en la ruta.')
      } else {
        const response = await cursosApi.createStudentAndEnrollInRuta(rutaEnrollmentTarget.id, form)
        const generatedPassword = response?.data?.generated_password
        const userEmail = response?.data?.user?.email
        if (userEmail && generatedPassword) {
          rememberGeneratedCredential({ email: userEmail, password: generatedPassword })
        }
        if (generatedPassword) {
          setGeneratedCredentials({
            studentName: response?.data?.user?.name || form.name,
            password: generatedPassword,
            contextLabel: 'la matricula de la ruta',
          })
        } else {
          showSuccess('Estudiante creado y matriculado en la ruta.')
        }
      }
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

  const refreshSelectedEnrollmentDetail = async () => {
    if (!selectedEnrollmentDetail) return
    await loadData()
    const refreshed = (await cursosApi.getMatriculasRuta({ ruta_id: id })).find((item) => item.id === selectedEnrollmentDetail.id)
    if (refreshed) {
      setSelectedEnrollmentDetail(refreshed)
    }
  }

  const matriculasFiltradas = useMemo(() => {
    const query = busqueda.trim().toLowerCase()
    if (!query) return matriculasRuta

    return matriculasRuta.filter((matricula) => {
      const nombre = (matricula.user_nombre || '').toLowerCase()
      const ci = (matricula.user_ci || '').toLowerCase()
      const telefono = (matricula.user_telefono || '').toLowerCase()
      const estado = (matricula.user_estado || '').toLowerCase()
      const matriculadoPor = (matricula.created_by_nombre || '').toLowerCase()
      return [nombre, ci, telefono, estado, matriculadoPor].some((value) => value.includes(query))
    })
  }, [busqueda, matriculasRuta])

  const getWhatsappLink = (matricula) => buildEnrollmentWhatsappLink({
    phoneNumber: matricula.user_telefono,
    studentName: matricula.user_nombre,
    sourceTitle: ruta?.titulo,
    sourceType: 'ruta',
    userEmail: matricula.user_email,
    generatedPassword: getGeneratedCredentialByEmail(matricula.user_email),
    platformUrl: window.location.origin,
  })

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Inscripciones de la Ruta</h1>
            <p className="text-sm text-gray-500">{ruta?.titulo || 'Ruta seleccionada'}</p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => {
                  setRutaEnrollmentError('')
                  setRutaEnrollmentTarget(ruta)
                }}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
              >
                Matricular estudiante
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
            {matriculasRuta.length === 0
              ? 'No hay estudiantes matriculados en esta ruta.'
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
                    <td className="px-4 py-3">
                      {getWhatsappLink(matricula) ? (
                        <a
                          href={getWhatsappLink(matricula)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 hover:bg-emerald-100"
                          title="Enviar mensaje por WhatsApp"
                        >
                          <MessageCircle size={14} />
                          {matricula.user_telefono}
                        </a>
                      ) : (matricula.user_telefono || '-')}
                    </td>
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
                            onClick={() => handleDeleteMatriculaRuta(matricula)}
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
            type="ruta"
            onUpdated={refreshSelectedEnrollmentDetail}
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

        {rutaEnrollmentTarget && isAdmin && (
          <StudentEnrollmentModal
            title="Matricular estudiante en esta ruta"
            subtitle={`Puedes crear uno nuevo o usar uno existente para matricularlo en ${rutaEnrollmentTarget.titulo}.`}
            submitLabel="Guardar matricula"
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

        {generatedCredentials && (
          <GeneratedPasswordModal
            open={Boolean(generatedCredentials)}
            studentName={generatedCredentials.studentName}
            password={generatedCredentials.password}
            contextLabel={generatedCredentials.contextLabel}
            onClose={() => setGeneratedCredentials(null)}
          />
        )}
      </div>
    </Layout>
  )
}
