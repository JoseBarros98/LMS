import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock3, Edit, Filter, Lock, Plus, Presentation, Search, Sparkles, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import CursoModal from '../components/CursoModal'
import { cursosApi } from '../api/cursos'
import { useAuth } from '../context/AuthContext'
import { formatCurrencyBs, formatDuration } from '../utils/formatters'
import { getApiErrorMessage, showConfirm, showError, showSuccess } from '../utils/toast'

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

export default function Cursos() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cursos, setCursos] = useState([])
  const [rutas, setRutas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [cursoEdit, setCursoEdit] = useState(null)

  const [filtroRuta, setFiltroRuta] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [filtroPublicado, setFiltroPublicado] = useState('all')
  const [busqueda, setBusqueda] = useState('')

  const isAdmin = user?.role?.name?.toLowerCase() === 'administrador'

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      const query = {}
      if (filtroRuta !== 'all' && filtroRuta !== 'sin-ruta') query.ruta_id = filtroRuta
      if (filtroEstado !== 'all') query.estado = filtroEstado
      if (filtroPublicado !== 'all') query.publicado = filtroPublicado === 'si'

      const [rutasData, cursosData] = await Promise.all([
        cursosApi.getRutas(),
        cursosApi.getCursos(query),
      ])

      setRutas(Array.isArray(rutasData) ? rutasData : [])
      setCursos(Array.isArray(cursosData) ? cursosData : [])
    } catch {
      setRutas([])
      setCursos([])
    } finally {
      setLoading(false)
    }
  }, [filtroEstado, filtroPublicado, filtroRuta, isAdmin])

  useEffect(() => {
    loadData()
  }, [loadData])

  const cursosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase()
    const cursosConFiltroRuta = filtroRuta === 'sin-ruta'
      ? cursos.filter((curso) => !curso.ruta)
      : cursos

    if (!query) return cursosConFiltroRuta

    return cursosConFiltroRuta.filter((curso) => {
      const titulo = (curso.titulo || '').toLowerCase()
      const descripcion = (curso.descripcion || '').toLowerCase()
      const rutaTitulo = (curso.ruta_titulo || rutaTitle(curso.ruta) || '').toLowerCase()
      const nivel = (curso.nivel_label || curso.nivel || '').toLowerCase()
      const estado = (curso.estado_label || curso.estado || '').toLowerCase()
      return [titulo, descripcion, rutaTitulo, nivel, estado].some((value) => value.includes(query))
    })
  }, [busqueda, cursos, filtroRuta])

  const cursosByRuta = useMemo(() => {
    return cursosFiltrados.reduce((acc, curso) => {
      const key = curso.ruta || 'sin-ruta'
      if (!acc[key]) acc[key] = []
      acc[key].push(curso)
      return acc
    }, {})
  }, [cursosFiltrados])

  const openCreate = () => {
    setCursoEdit(null)
    setModalOpen(true)
  }

  const openEdit = (curso) => {
    setCursoEdit(curso)
    setModalOpen(true)
  }

  const handleSubmit = async (formData) => {
    try {
      if (cursoEdit) {
        await cursosApi.updateCurso(cursoEdit.id, formData)
        showSuccess('Curso actualizado correctamente.')
      } else {
        await cursosApi.createCurso(formData)
        showSuccess('Curso creado correctamente.')
      }

      setModalOpen(false)
      setCursoEdit(null)
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo guardar el curso.'))
    }
  }

  const handleDeleteCurso = async (curso) => {
    const ok = await showConfirm(`¿Eliminar el curso "${curso.titulo}"? Esta accion no se puede deshacer.`)
    if (!ok) {
      return
    }

    try {
      await cursosApi.deleteCurso(curso.id)
      showSuccess('Curso eliminado correctamente.')
      await loadData()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo eliminar el curso.'))
    }
  }

  const rutaTitle = (rutaId) => {
    if (!rutaId || rutaId === 'sin-ruta') {
      return 'Sin ruta'
    }
    return rutas.find((ruta) => ruta.id === rutaId)?.titulo || 'Ruta'
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
          <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'xl:grid-cols-6' : 'xl:grid-cols-5'} gap-3`}>
            <div className="flex items-center gap-2 text-gray-600">
              <Filter size={16} />
              <span className="text-sm font-medium">Filtros</span>
            </div>

            <label className="relative xl:col-span-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar curso, ruta, nivel o estado"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </label>

            <select
              value={filtroRuta}
              onChange={(e) => setFiltroRuta(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            >
              <option value="all">Todas las rutas</option>
              <option value="sin-ruta">Sin ruta</option>
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

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : cursosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <BookOpen className="mx-auto text-gray-400 mb-4" size={42} />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {cursos.length === 0 ? 'No hay cursos para mostrar' : 'No se encontraron cursos'}
            </h3>
            <p className="text-sm text-gray-500">
              {cursos.length === 0 ? 'Ajusta los filtros o crea un nuevo curso.' : 'Intenta con otro termino de busqueda.'}
            </p>
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
                          <Clock3 size={12} /> {formatDuration(curso.duracion_total_min)}
                        </span>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-semibold">
                            {formatCurrencyBs(curso.precio)}
                          </span>
                        )}
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

                      <div className="flex items-center gap-2 justify-end">
                        {isAdmin ? (

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/courses/${curso.id}`)}
                              className="px-2.5 py-1.5 rounded-lg text-xs bg-gray-900 text-white hover:bg-gray-800 transition inline-flex items-center gap-1"
                            >
                              <BookOpen size={12} /> Ver detalle
                            </button>
                            <button
                              onClick={() => navigate(`/courses/${curso.id}/inscripciones`)}
                              className="px-2.5 py-1.5 rounded-lg text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition inline-flex items-center gap-1"
                            >
                              Matriculados
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

      </div>
    </Layout>
  )
}
