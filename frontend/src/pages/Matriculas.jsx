import { useCallback, useEffect, useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import Layout from '../components/Layout'
import { cursosApi } from '../api/cursos'
import { getUsers } from '../api/users'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage, showError, showSuccess } from '../utils/toast'

const initialMatriculaForm = {
  tipo: 'ruta',
  user: '',
  ruta: '',
  curso: '',
  plan_pago: 'contado',
  numero_cuotas: 2,
  codigo_acceso: '',
  fecha_inicio: '',
  fecha_fin: '',
  activa: true,
}

export default function Matriculas() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [rutas, setRutas] = useState([])
  const [cursos, setCursos] = useState([])
  const [matriculasRuta, setMatriculasRuta] = useState([])
  const [matriculasCurso, setMatriculasCurso] = useState([])
  const [matriculaForm, setMatriculaForm] = useState(initialMatriculaForm)
  const [matriculaError, setMatriculaError] = useState('')
  const [paymentEditor, setPaymentEditor] = useState(null)
  const [savingPaymentDates, setSavingPaymentDates] = useState(false)
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.role?.name?.toLowerCase() === 'administrador'

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      if (isAdmin) {
        const [usersResponse, rutasData, cursosData, matriculasRutaData, matriculasCursoData] = await Promise.all([
          getUsers(),
          cursosApi.getRutas(),
          cursosApi.getCursos(),
          cursosApi.getMatriculasRuta(),
          cursosApi.getMatriculasCurso(),
        ])

        setUsers(Array.isArray(usersResponse?.data) ? usersResponse.data : [])
        setRutas(Array.isArray(rutasData) ? rutasData : [])
        setCursos(Array.isArray(cursosData) ? cursosData : [])
        setMatriculasRuta(Array.isArray(matriculasRutaData) ? matriculasRutaData : [])
        setMatriculasCurso(Array.isArray(matriculasCursoData) ? matriculasCursoData : [])
      } else {
        const [matriculasRutaData, matriculasCursoData] = await Promise.all([
          cursosApi.getMatriculasRuta(),
          cursosApi.getMatriculasCurso(),
        ])

        setUsers([])
        setRutas([])
        setCursos([])
        setMatriculasRuta(Array.isArray(matriculasRutaData) ? matriculasRutaData : [])
        setMatriculasCurso(Array.isArray(matriculasCursoData) ? matriculasCursoData : [])
      }
    } catch {
      setUsers([])
      setRutas([])
      setCursos([])
      setMatriculasRuta([])
      setMatriculasCurso([])
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleMatriculaInput = (e) => {
    const { name, value, type, checked } = e.target
    const nextValue = type === 'checkbox' ? checked : value

    setMatriculaForm((prev) => {
      if (name === 'tipo') {
        const isCourse = nextValue === 'curso'
        return {
          ...prev,
          tipo: nextValue,
          ruta: '',
          curso: '',
          plan_pago: isCourse ? 'contado' : prev.plan_pago,
          numero_cuotas: isCourse ? 1 : 2,
        }
      }

      if (name === 'plan_pago') {
        if (prev.tipo === 'curso') {
          return {
            ...prev,
            plan_pago: 'contado',
            numero_cuotas: 1,
          }
        }

        return {
          ...prev,
          plan_pago: nextValue,
          numero_cuotas: nextValue === 'contado' ? prev.numero_cuotas : prev.numero_cuotas,
        }
      }

      return {
        ...prev,
        [name]: nextValue,
      }
    })

    if (matriculaError) {
      setMatriculaError('')
    }
  }

  const handleCreateMatricula = async (e) => {
    e.preventDefault()
    setMatriculaError('')

    if (!matriculaForm.user) {
      setMatriculaError('Debes seleccionar un estudiante.')
      showError('Debes seleccionar un estudiante.')
      return
    }

    if (matriculaForm.tipo === 'ruta' && !matriculaForm.ruta) {
      setMatriculaError('Debes seleccionar una ruta para la matricula.')
      showError('Debes seleccionar una ruta para la matricula.')
      return
    }

    if (matriculaForm.tipo === 'curso' && !matriculaForm.curso) {
      setMatriculaError('Debes seleccionar un curso para la matricula.')
      showError('Debes seleccionar un curso para la matricula.')
      return
    }

    if (matriculaForm.fecha_inicio && matriculaForm.fecha_fin && matriculaForm.fecha_fin < matriculaForm.fecha_inicio) {
      setMatriculaError('La fecha fin no puede ser menor que la fecha inicio.')
      showError('La fecha fin no puede ser menor que la fecha inicio.')
      return
    }

    try {
      const payload = {
        user: matriculaForm.user,
        plan_pago: matriculaForm.tipo === 'curso' ? 'contado' : matriculaForm.plan_pago,
        numero_cuotas: matriculaForm.tipo === 'curso' ? 1 : Number(matriculaForm.numero_cuotas || 1),
        codigo_acceso: matriculaForm.codigo_acceso,
        fecha_inicio: matriculaForm.fecha_inicio,
        fecha_fin: matriculaForm.fecha_fin,
        activa: matriculaForm.activa,
      }

      if (matriculaForm.tipo === 'ruta') {
        await cursosApi.createMatriculaRuta({ ...payload, ruta: matriculaForm.ruta })
      } else {
        await cursosApi.createMatriculaCurso({ ...payload, curso: matriculaForm.curso })
      }

      setMatriculaForm((prev) => ({
        ...initialMatriculaForm,
        tipo: prev.tipo,
      }))
      showSuccess('Matricula creada correctamente.')
      await loadData()
    } catch (error) {
      const message = getApiErrorMessage(error, 'No se pudo crear la matricula.')
      setMatriculaError(message)
      showError(message)
    }
  }

  const handleToggleMatriculaRuta = async (matricula) => {
    try {
      await cursosApi.updateMatriculaRuta(matricula.id, { activa: !matricula.activa })
      showSuccess(`Matricula ${matricula.activa ? 'desactivada' : 'activada'} correctamente.`)
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo actualizar la matricula por ruta.'))
    }
  }

  const handleToggleMatriculaCurso = async (matricula) => {
    try {
      await cursosApi.updateMatriculaCurso(matricula.id, { activa: !matricula.activa })
      showSuccess(`Matricula ${matricula.activa ? 'desactivada' : 'activada'} correctamente.`)
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo actualizar la matricula por curso.'))
    }
  }

  const handleDeleteMatriculaRuta = async (matricula) => {
    const ok = window.confirm(`¿Eliminar la matricula de ${matricula.user_nombre || matricula.user_email}?`)
    if (!ok) return

    try {
      await cursosApi.deleteMatriculaRuta(matricula.id)
      showSuccess('Matricula por ruta eliminada correctamente.')
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo eliminar la matricula por ruta.'))
    }
  }

  const handleDeleteMatriculaCurso = async (matricula) => {
    const ok = window.confirm(`¿Eliminar la matricula de ${matricula.user_nombre || matricula.user_email}?`)
    if (!ok) return

    try {
      await cursosApi.deleteMatriculaCurso(matricula.id)
      showSuccess('Matricula por curso eliminada correctamente.')
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo eliminar la matricula por curso.'))
    }
  }

  const userLabel = (matricula) => {
    if (matricula.user_nombre) return matricula.user_nombre
    if (matricula.user_email) return matricula.user_email
    return `Usuario ${matricula.user}`
  }

  const openPaymentEditor = (tipo, matricula) => {
    const cuotas = Array.isArray(matricula.cuotas) ? [...matricula.cuotas].sort((a, b) => a.numero - b.numero) : []
    if (cuotas.length === 0) {
      showError('Esta matricula aun no tiene cuotas generadas.')
      return
    }

    setPaymentEditor({
      tipo,
      id: matricula.id,
      referencia: tipo === 'ruta' ? matricula.ruta_titulo : matricula.curso_titulo,
      plan_pago: matricula.plan_pago,
      fechas_pago: cuotas.map((cuota) => cuota.fecha_pago || ''),
    })
  }

  const updatePaymentDate = (index, value) => {
    setPaymentEditor((prev) => {
      if (!prev) return prev
      const fechas = [...prev.fechas_pago]
      fechas[index] = value
      return { ...prev, fechas_pago: fechas }
    })
  }

  const savePaymentDates = async () => {
    if (!paymentEditor) return
    if (paymentEditor.fechas_pago.some((value) => !value)) {
      showError('Debes completar todas las fechas de pago.')
      return
    }

    try {
      setSavingPaymentDates(true)
      if (paymentEditor.tipo === 'ruta') {
        await cursosApi.updateMatriculaRuta(paymentEditor.id, { fechas_pago: paymentEditor.fechas_pago })
      } else {
        await cursosApi.updateMatriculaCurso(paymentEditor.id, { fechas_pago: paymentEditor.fechas_pago })
      }
      showSuccess('Fechas de pago actualizadas correctamente.')
      setPaymentEditor(null)
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudieron actualizar las fechas de pago.'))
    } finally {
      setSavingPaymentDates(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Matriculas</h1>
          <p className="text-sm text-gray-500">Gestiona las matriculas por ruta y por curso.</p>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Crear matricula</h2>
              <p className="text-xs text-gray-500">Asigna estudiantes por ruta o por curso.</p>
            </div>

            <form onSubmit={handleCreateMatricula} className="space-y-3">
              {matriculaError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {matriculaError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  name="tipo"
                  value={matriculaForm.tipo}
                  onChange={handleMatriculaInput}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                >
                  <option value="ruta">Matricular por ruta</option>
                  <option value="curso">Matricular por curso</option>
                </select>

                <select
                  name="user"
                  value={matriculaForm.user}
                  onChange={handleMatriculaInput}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                  required
                >
                  <option value="">Selecciona estudiante</option>
                  {users.map((currentUser) => (
                    <option key={currentUser.id} value={currentUser.id}>
                      {currentUser.name} - {currentUser.email}
                    </option>
                  ))}
                </select>

                {matriculaForm.tipo === 'ruta' ? (
                  <select
                    name="ruta"
                    value={matriculaForm.ruta}
                    onChange={handleMatriculaInput}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                    required
                  >
                    <option value="">Selecciona ruta</option>
                    {rutas.map((ruta) => (
                      <option key={ruta.id} value={ruta.id}>
                        {ruta.titulo}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    name="curso"
                    value={matriculaForm.curso}
                    onChange={handleMatriculaInput}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                    required
                  >
                    <option value="">Selecciona curso</option>
                    {cursos.map((curso) => (
                      <option key={curso.id} value={curso.id}>
                        {curso.titulo}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  name="plan_pago"
                  value={matriculaForm.tipo === 'curso' ? 'contado' : matriculaForm.plan_pago}
                  onChange={handleMatriculaInput}
                  disabled={matriculaForm.tipo === 'curso'}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm disabled:bg-gray-100"
                >
                  <option value="contado">Plan contado</option>
                  {matriculaForm.tipo === 'ruta' && <option value="credito">Plan credito</option>}
                </select>

                {matriculaForm.tipo === 'curso' ? (
                  <input
                    value="1 pago"
                    disabled
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100"
                  />
                ) : matriculaForm.plan_pago === 'contado' ? (
                  <select
                    name="numero_cuotas"
                    value={matriculaForm.numero_cuotas}
                    onChange={handleMatriculaInput}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  name="codigo_acceso"
                  value={matriculaForm.codigo_acceso}
                  onChange={handleMatriculaInput}
                  placeholder="Codigo de acceso (opcional)"
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
                <input
                  type="date"
                  name="fecha_inicio"
                  value={matriculaForm.fecha_inicio}
                  onChange={handleMatriculaInput}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
                <input
                  type="date"
                  name="fecha_fin"
                  value={matriculaForm.fecha_fin}
                  onChange={handleMatriculaInput}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 px-2">
                  <input
                    type="checkbox"
                    name="activa"
                    checked={matriculaForm.activa}
                    onChange={handleMatriculaInput}
                  />
                  Activa
                </label>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2 text-sm font-medium"
              >
                <UserPlus size={16} />
                Matricular Estudiante
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700">
                Matriculas por Ruta ({matriculasRuta.length})
              </div>
              {matriculasRuta.length === 0 ? (
                <p className="p-3 text-xs text-gray-500">No hay matriculas por ruta.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {matriculasRuta.map((matricula) => (
                    <div key={matricula.id} className="p-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{userLabel(matricula)}</p>
                        <p className="text-xs text-gray-500">{matricula.user_email}</p>
                        <p className="text-xs text-gray-600 mt-1">Ruta: {matricula.ruta_titulo}</p>
                        <p className="text-xs text-gray-600">Plan: {matricula.plan_pago} - {matricula.numero_cuotas} pago(s)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => openPaymentEditor('ruta', matricula)}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-sky-100 text-sky-700 hover:bg-sky-200 transition"
                          >
                            Editar pagos
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleMatriculaRuta(matricula)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs transition ${matricula.activa ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                          >
                            {matricula.activa ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteMatriculaRuta(matricula)}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-red-100 text-red-700 hover:bg-red-200 transition inline-flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700">
                Matriculas por Curso ({matriculasCurso.length})
              </div>
              {matriculasCurso.length === 0 ? (
                <p className="p-3 text-xs text-gray-500">No hay matriculas por curso.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {matriculasCurso.map((matricula) => (
                    <div key={matricula.id} className="p-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{userLabel(matricula)}</p>
                        <p className="text-xs text-gray-500">{matricula.user_email}</p>
                        <p className="text-xs text-gray-600 mt-1">Curso: {matricula.curso_titulo}</p>
                        <p className="text-xs text-gray-600">Plan: {matricula.plan_pago} - {matricula.numero_cuotas} pago(s)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => openPaymentEditor('curso', matricula)}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-sky-100 text-sky-700 hover:bg-sky-200 transition"
                          >
                            Editar pagos
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleMatriculaCurso(matricula)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs transition ${matricula.activa ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                          >
                            {matricula.activa ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteMatriculaCurso(matricula)}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-red-100 text-red-700 hover:bg-red-200 transition inline-flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {paymentEditor && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-800">Editar fechas de pago</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {paymentEditor.referencia} - plan {paymentEditor.plan_pago}
                </p>
              </div>

              <div className="space-y-2">
                {paymentEditor.fechas_pago.map((fecha, index) => (
                  <div key={`fecha-${index}`} className="grid grid-cols-[100px_1fr] items-center gap-3">
                    <span className="text-sm text-gray-600">Pago {index + 1}</span>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(event) => updatePaymentDate(index, event.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentEditor(null)}
                  disabled={savingPaymentDates}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={savePaymentDates}
                  disabled={savingPaymentDates}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60"
                >
                  {savingPaymentDates ? 'Guardando...' : 'Guardar fechas'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
