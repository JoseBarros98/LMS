import { useCallback, useEffect, useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import Layout from '../components/Layout'
import { cursosApi } from '../api/cursos'
import { getUsers } from '../api/users'
import { useAuth } from '../context/AuthContext'

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

export default function Matriculas() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [rutas, setRutas] = useState([])
  const [cursos, setCursos] = useState([])
  const [matriculasRuta, setMatriculasRuta] = useState([])
  const [matriculasCurso, setMatriculasCurso] = useState([])
  const [matriculaForm, setMatriculaForm] = useState(initialMatriculaForm)
  const [matriculaError, setMatriculaError] = useState('')
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

  const userLabel = (matricula) => {
    if (matricula.user_nombre) return matricula.user_nombre
    if (matricula.user_email) return matricula.user_email
    return `Usuario ${matricula.user}`
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
                      </div>
                      <div className="flex items-center gap-2">
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
                      </div>
                      <div className="flex items-center gap-2">
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
      </div>
    </Layout>
  )
}
