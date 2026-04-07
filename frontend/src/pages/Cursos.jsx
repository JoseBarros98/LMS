import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock3, Edit, Filter, Lock, Plus, Presentation, Sparkles, Trash2, UserPlus } from 'lucide-react'
import Layout from '../components/Layout'
import CursoModal from '../components/CursoModal'
import RutaModal from '../components/RutaModal'
import { cursosApi } from '../api/cursos'
import { getUsers } from '../api/users'
import { useAuth } from '../context/AuthContext'

const estadoBadge = {
  disponible: 'bg-emerald-100 text-emerald-700',
  proximo: 'bg-amber-100 text-amber-700',
  bloqueado: 'bg-gray-200 text-gray-700',
}

const nivelBadge = {
  basico: 'bg-sky-100 text-sky-700',
  intermedio: 'bg-indigo-100 text-indigo-700',
  avanzado: 'bg-fuchsia-100 text-fuchsia-700',
}

const initialMatriculaForm = {
  tipo: 'ruta',
  user: '',
  ruta: '',
  curso: '',
  codigo_acceso: '',
  fecha_inicio: '',
  fecha_fin: '',
  activa: true,
}

const extractApiError = (error, fallback) => {
  const data = error?.response?.data

  if (!data) {
    return fallback
  }

  if (typeof data === 'string') {
    return data
  }

  if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length > 0) {
    return data.non_field_errors[0]
  }

  const firstKey = Object.keys(data)[0]
  if (firstKey) {
    const value = data[firstKey]
    if (Array.isArray(value) && value.length > 0) {
      return value[0]
    }
    if (typeof value === 'string') {
      return value
    }
  }

  return fallback
}

export default function Cursos() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cursos, setCursos] = useState([])
  const [rutas, setRutas] = useState([])
  const [users, setUsers] = useState([])
  const [matriculasRuta, setMatriculasRuta] = useState([])
  const [matriculasCurso, setMatriculasCurso] = useState([])
  const [matriculaForm, setMatriculaForm] = useState(initialMatriculaForm)
  const [matriculaError, setMatriculaError] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [cursoEdit, setCursoEdit] = useState(null)
  const [rutaModalOpen, setRutaModalOpen] = useState(false)
  const [rutaEdit, setRutaEdit] = useState(null)

  const [filtroRuta, setFiltroRuta] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [filtroPublicado, setFiltroPublicado] = useState('all')

  const isAdmin = user?.role?.name?.toLowerCase() === 'administrador'

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      const query = {}
      if (filtroRuta !== 'all') query.ruta_id = filtroRuta
      if (filtroEstado !== 'all') query.estado = filtroEstado
      if (filtroPublicado !== 'all') query.publicado = filtroPublicado === 'si'

      if (isAdmin) {
        const [rutasData, cursosData, usersResponse, matriculasRutaData, matriculasCursoData] = await Promise.all([
          cursosApi.getRutas(),
          cursosApi.getCursos(query),
          getUsers(),
          cursosApi.getMatriculasRuta(),
          cursosApi.getMatriculasCurso(),
        ])

        setRutas(Array.isArray(rutasData) ? rutasData : [])
        setCursos(Array.isArray(cursosData) ? cursosData : [])
        setUsers(Array.isArray(usersResponse?.data) ? usersResponse.data : [])
        setMatriculasRuta(Array.isArray(matriculasRutaData) ? matriculasRutaData : [])
        setMatriculasCurso(Array.isArray(matriculasCursoData) ? matriculasCursoData : [])
      } else {
        const [rutasData, cursosData] = await Promise.all([
          cursosApi.getRutas(),
          cursosApi.getCursos(query),
        ])

        setRutas(Array.isArray(rutasData) ? rutasData : [])
        setCursos(Array.isArray(cursosData) ? cursosData : [])
      }
    } catch {
      setRutas([])
      setCursos([])
      if (isAdmin) {
        setUsers([])
        setMatriculasRuta([])
        setMatriculasCurso([])
      }
    } finally {
      setLoading(false)
    }
  }, [filtroEstado, filtroPublicado, filtroRuta, isAdmin])

  useEffect(() => {
    loadData()
  }, [loadData])

  const cursosByRuta = useMemo(() => {
    return cursos.reduce((acc, curso) => {
      const key = curso.ruta || 'sin-ruta'
      if (!acc[key]) acc[key] = []
      acc[key].push(curso)
      return acc
    }, {})
  }, [cursos])

  const openCreate = () => {
    setCursoEdit(null)
    setModalOpen(true)
  }

  const handleMatriculaInput = (e) => {
    const { name, value, type, checked } = e.target
    const nextValue = type === 'checkbox' ? checked : value

    setMatriculaForm((prev) => {
      if (name === 'tipo') {
        return {
          ...prev,
          tipo: nextValue,
          ruta: '',
          curso: '',
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

  const openEdit = (curso) => {
    setCursoEdit(curso)
    setModalOpen(true)
  }

  const openCreateRuta = () => {
    setRutaEdit(null)
    setRutaModalOpen(true)
  }

  const openEditRuta = (ruta) => {
    setRutaEdit(ruta)
    setRutaModalOpen(true)
  }

  const handleSubmit = async (formData) => {
    if (cursoEdit) {
      await cursosApi.updateCurso(cursoEdit.id, formData)
    } else {
      await cursosApi.createCurso(formData)
    }

    setModalOpen(false)
    setCursoEdit(null)
    await loadData()
  }

  const handleSubmitRuta = async (formData) => {
    if (rutaEdit) {
      await cursosApi.updateRuta(rutaEdit.id, formData)
    } else {
      await cursosApi.createRuta(formData)
    }

    setRutaModalOpen(false)
    setRutaEdit(null)
    await loadData()
  }

  const handleDeleteCurso = async (curso) => {
    const ok = window.confirm(`¿Eliminar el curso "${curso.titulo}"? Esta accion no se puede deshacer.`)
    if (!ok) {
      return
    }

    await cursosApi.deleteCurso(curso.id)
    await loadData()
  }

  const handleDeleteRuta = async (ruta) => {
    const hasCourses = cursos.some((curso) => curso.ruta === ruta.id)
    const message = hasCourses
      ? `La ruta "${ruta.titulo}" tiene cursos asociados y tambien se eliminaran. ¿Deseas continuar?`
      : `¿Eliminar la ruta "${ruta.titulo}"?`

    const ok = window.confirm(message)
    if (!ok) {
      return
    }

    await cursosApi.deleteRuta(ruta.id)
    await loadData()
  }

  const handleCreateMatricula = async (e) => {
    e.preventDefault()
    setMatriculaError('')

    if (!matriculaForm.user) {
      setMatriculaError('Debes seleccionar un estudiante.')
      return
    }

    if (matriculaForm.tipo === 'ruta' && !matriculaForm.ruta) {
      setMatriculaError('Debes seleccionar una ruta para la matricula.')
      return
    }

    if (matriculaForm.tipo === 'curso' && !matriculaForm.curso) {
      setMatriculaError('Debes seleccionar un curso para la matricula.')
      return
    }

    if (matriculaForm.fecha_inicio && matriculaForm.fecha_fin && matriculaForm.fecha_fin < matriculaForm.fecha_inicio) {
      setMatriculaError('La fecha fin no puede ser menor que la fecha inicio.')
      return
    }

    try {
      const payload = {
        user: matriculaForm.user,
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
      await loadData()
    } catch (error) {
      setMatriculaError(extractApiError(error, 'No se pudo crear la matricula.'))
    }
  }

  const handleToggleMatriculaRuta = async (matricula) => {
    await cursosApi.updateMatriculaRuta(matricula.id, { activa: !matricula.activa })
    await loadData()
  }

  const handleToggleMatriculaCurso = async (matricula) => {
    await cursosApi.updateMatriculaCurso(matricula.id, { activa: !matricula.activa })
    await loadData()
  }

  const handleDeleteMatriculaRuta = async (matricula) => {
    const ok = window.confirm(`¿Eliminar la matricula de ${matricula.user_nombre || matricula.user_email}?`)
    if (!ok) return

    await cursosApi.deleteMatriculaRuta(matricula.id)
    await loadData()
  }

  const handleDeleteMatriculaCurso = async (matricula) => {
    const ok = window.confirm(`¿Eliminar la matricula de ${matricula.user_nombre || matricula.user_email}?`)
    if (!ok) return

    await cursosApi.deleteMatriculaCurso(matricula.id)
    await loadData()
  }

  const rutaTitle = (rutaId) => {
    return rutas.find((ruta) => ruta.id === rutaId)?.titulo || 'Ruta'
  }

  const userLabel = (matricula) => {
    if (matricula.user_nombre) {
      return matricula.user_nombre
    }

    if (matricula.user_email) {
      return matricula.user_email
    }

    return `Usuario ${matricula.user}`
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Cursos</h1>
            <p className="text-sm text-gray-500">
              Explora tus cursos por ruta y estado de disponibilidad.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-medium"
            >
              <Plus size={16} />
              Nuevo Curso
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 text-gray-600">
              <Filter size={16} />
              <span className="text-sm font-medium">Filtros</span>
            </div>

            <select
              value={filtroRuta}
              onChange={(e) => setFiltroRuta(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            >
              <option value="all">Todas las rutas</option>
              {rutas.map((ruta) => (
                <option key={ruta.id} value={ruta.id}>
                  {ruta.titulo}
                </option>
              ))}
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="disponible">Disponible</option>
              <option value="proximo">Proximo</option>
              <option value="bloqueado">Bloqueado</option>
            </select>

            {isAdmin ? (
              <select
                value={filtroPublicado}
                onChange={(e) => setFiltroPublicado(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              >
                <option value="all">Publicados y borrador</option>
                <option value="si">Solo publicados</option>
                <option value="no">Solo no publicados</option>
              </select>
            ) : (
              <div className="text-xs text-gray-500 flex items-center">Mostrando cursos visibles para estudiantes.</div>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Rutas</h2>
                <p className="text-xs text-gray-500">Gestiona las rutas academicas visibles en Mis Cursos.</p>
              </div>
              <button
                onClick={openCreateRuta}
                className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition flex items-center gap-2 text-xs font-medium"
              >
                <Plus size={14} />
                Nueva Ruta
              </button>
            </div>

            {rutas.length === 0 ? (
              <p className="text-sm text-gray-500">No hay rutas registradas.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {rutas.map((ruta) => (
                  <div key={ruta.id} className="border border-gray-200 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{ruta.titulo}</p>
                        <p className="text-xs text-gray-500 line-clamp-2">{ruta.descripcion || 'Sin descripcion'}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full ${ruta.publicado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {ruta.publicado ? 'Publicada' : 'Borrador'}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Orden #{ruta.orden}</span>
                      <div className="flex items-center gap-2">
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Matriculas</h2>
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
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
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleMatriculaRuta(matricula)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs transition ${matricula.activa ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                          >
                            {matricula.activa ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => handleDeleteMatriculaRuta(matricula)}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-red-100 text-red-700 hover:bg-red-200 transition inline-flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
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
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleMatriculaCurso(matricula)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs transition ${matricula.activa ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                          >
                            {matricula.activa ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => handleDeleteMatriculaCurso(matricula)}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-red-100 text-red-700 hover:bg-red-200 transition inline-flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : cursos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <BookOpen className="mx-auto text-gray-400 mb-4" size={42} />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No hay cursos para mostrar</h3>
            <p className="text-sm text-gray-500">Ajusta los filtros o crea un nuevo curso.</p>
          </div>
        ) : (
          Object.entries(cursosByRuta).map(([rutaId, cursosRuta]) => (
            <section key={rutaId} className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-800">{rutaTitle(rutaId)}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cursosRuta.map((curso) => (
                  <article
                    key={curso.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition"
                  >
                    <div className="relative h-44 bg-gray-100">
                      {curso.imagen_portada_url ? (
                        <img
                          src={curso.imagen_portada_url}
                          alt={curso.titulo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <BookOpen size={30} />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-linear-to-t from-black/40 via-black/10 to-transparent" />

                      <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${nivelBadge[curso.nivel] || nivelBadge.avanzado}`}>
                        {curso.nivel_label || curso.nivel}
                      </span>
                      <span className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${estadoBadge[curso.estado] || estadoBadge.disponible}`}>
                        {curso.estado_label || curso.estado}
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="space-y-2">
                        <h3 className="font-extrabold text-slate-900 uppercase leading-tight">{curso.titulo}</h3>
                        <p className="inline-flex items-center rounded-full bg-violet-100 text-violet-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
                          <BookOpen size={11} className="mr-1" /> {curso.ruta_titulo || rutaTitle(curso.ruta)}
                        </p>
                        <p className="text-sm text-gray-500 line-clamp-2 border-t border-slate-100 pt-2">{curso.descripcion || 'Sin descripcion'}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-700">
                          <Presentation size={12} /> {curso.total_lecciones} lecciones
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-700">
                          <Clock3 size={12} /> {curso.duracion_total_min} min
                        </span>
                        {curso.tiene_mediateca && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-700">
                            Mediateca
                          </span>
                        )}
                        {!curso.publicado && isAdmin && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-700">
                            Borrador
                          </span>
                        )}
                      </div>

                      <div className={`flex items-center gap-2 ${isAdmin ? 'justify-between' : 'justify-end'}`}>
                        {isAdmin && (
                          <div className="text-xs text-gray-500">
                            Orden #{curso.orden}
                          </div>
                        )}
                        {isAdmin ? (

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/courses/${curso.id}`)}
                              className="px-2.5 py-1.5 rounded-lg text-xs bg-gray-900 text-white hover:bg-gray-800 transition inline-flex items-center gap-1"
                            >
                              <BookOpen size={12} /> Ver detalle
                            </button>
                            <button
                              onClick={() => openEdit(curso)}
                              className="px-2.5 py-1.5 rounded-lg text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition inline-flex items-center gap-1"
                            >
                              <Edit size={12} /> Editar
                            </button>
                            <button
                              onClick={() => handleDeleteCurso(curso)}
                              className="px-2.5 py-1.5 rounded-lg text-xs bg-red-100 text-red-700 hover:bg-red-200 transition inline-flex items-center gap-1"
                            >
                              <Trash2 size={12} /> Eliminar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (curso.estado !== 'bloqueado') {
                                navigate(`/courses/${curso.id}`)
                              }
                            }}
                            className={`px-3 py-2 rounded-lg text-xs inline-flex items-center gap-1.5 font-semibold ${
                              curso.estado === 'bloqueado'
                                ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                                : 'bg-slate-900 text-white hover:bg-slate-800 transition'
                            }`}
                            disabled={curso.estado === 'bloqueado'}
                          >
                            {curso.estado === 'bloqueado' ? <Lock size={12} /> : <ArrowRight size={12} />}
                            {curso.estado === 'bloqueado' ? 'Bloqueado' : 'Ingresar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}

        {modalOpen && isAdmin && (
          <CursoModal
            key={cursoEdit?.id || 'new-course'}
            cursoEdit={cursoEdit}
            rutas={rutas}
            onSubmit={handleSubmit}
            onClosed={() => {
              setModalOpen(false)
              setCursoEdit(null)
            }}
          />
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
      </div>
    </Layout>
  )
}
