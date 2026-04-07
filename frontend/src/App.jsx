import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Clock3, Lock, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cursosApi } from './api/cursos'
import Layout from './components/Layout'
import { useAuth } from './context/AuthContext'
import { formatCurrencyBs } from './utils/formatters'

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

const formatDuration = (minutes) => {
  if (!minutes) {
    return 'Sin duracion definida'
  }

  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (!remainingMinutes) {
    return `${hours} h`
  }

  return `${hours} h ${remainingMinutes} min`
}

export default function App() {
  const { user } = useAuth()
  const [cursos, setCursos] = useState([])
  const [loadingCursos, setLoadingCursos] = useState(true)
  const [coursesError, setCoursesError] = useState('')

  useEffect(() => {
    const fetchCursos = async () => {
      try {
        setLoadingCursos(true)
        setCoursesError('')
        const data = await cursosApi.getCursos()
        setCursos(Array.isArray(data) ? data : [])
      } catch {
        setCursos([])
        setCoursesError('No se pudieron cargar tus cursos matriculados.')
      } finally {
        setLoadingCursos(false)
      }
    }

    fetchCursos()
  }, [])

  const nombreCompleto = useMemo(() => {
    return [user?.name, user?.paternal_surname, user?.maternal_surname].filter(Boolean).join(' ')
  }, [user?.maternal_surname, user?.name, user?.paternal_surname])

  return (
    <Layout>
      <div className="space-y-8">
        <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-8 items-stretch">
          <div className="rounded-3xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm min-h-80">
            <img src="/1.png" alt="Panel de bienvenida" className="w-full h-full object-cover" />
          </div>
          <div className="bg-white rounded-3xl border border-gray-200 p-8 flex flex-col justify-between shadow-sm">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                <Sparkles size={16} />
                Panel de aprendizaje
              </div>

              <h1 className="mt-4 text-3xl font-bold text-gray-800 leading-tight">
                Bienvenido {nombreCompleto || user?.email}
              </h1>

              <p className="mt-4 text-gray-600 max-w-2xl leading-7">
                Aqui encontraras los cursos que tienes asignados actualmente. Desde este panel puedes retomar tu progreso,
                revisar disponibilidad y acceder rapidamente al catalogo completo de Mis Cursos.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/courses"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
              >
                Ir a Mis Cursos
              </Link>
              <div className="inline-flex items-center px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 bg-gray-50">
                {cursos.length} curso{cursos.length === 1 ? '' : 's'} disponible{cursos.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>

        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Mis Cursos</h2>
              <p className="text-sm text-gray-500">Cursos visibles segun tus matriculas activas.</p>
            </div>

            <Link
              to="/courses"
              className="text-sm font-medium text-blue-700 hover:text-blue-800 transition"
            >
              Ver catalogo completo
            </Link>
          </div>

          {loadingCursos ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-500">
              Cargando tus cursos...
            </div>
          ) : coursesError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-700">
              {coursesError}
            </div>
          ) : cursos.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center">
              <p className="text-gray-700 font-medium">Todavia no tienes cursos matriculados.</p>
              <p className="mt-2 text-sm text-gray-500">
                Cuando un administrador te asigne una ruta o un curso, aparecera aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
              {cursos.map((curso) => {
                const isLocked = curso.estado === 'bloqueado'
                const portada = curso.imagen_portada_url || '/1.png'

                return (
                  <article
                    key={curso.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition"
                  >
                    <div className="relative h-48 bg-gray-100">
                      <img src={portada} alt={curso.titulo} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-linear-to-t from-black/40 via-black/10 to-transparent" />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-2 pr-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase backdrop-blur-sm ${nivelBadge[curso.nivel] || 'bg-gray-100 text-gray-700'}`}>
                          {curso.nivel_label || curso.nivel}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase backdrop-blur-sm ${estadoBadge[curso.estado] || 'bg-gray-100 text-gray-700'}`}>
                          {curso.estado_label || curso.estado}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="space-y-2">
                        <h3 className="text-2xl font-extrabold uppercase text-slate-900 leading-tight tracking-tight">
                          {curso.titulo}
                        </h3>
                        <p className="inline-flex items-center rounded-full bg-violet-100 text-violet-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
                          <BookOpen size={11} className="mr-1" /> {curso.ruta_titulo || 'Ruta academica'}
                        </p>
                        <p className="text-sm text-slate-600 line-clamp-2 border-t border-slate-100 pt-2">
                          {curso.descripcion || 'Este curso aun no tiene una descripcion visible.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <BookOpen size={16} />
                          {curso.total_lecciones || 0} lecciones
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={16} />
                          {formatDuration(curso.duracion_total_min)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                          {formatCurrencyBs(curso.precio)}
                        </span>
                      </div>

                      <div className="pt-1">
                        {isLocked ? (
                          <span className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">
                            <Lock size={16} />
                            Bloqueado
                          </span>
                        ) : (
                          <Link
                            to={`/courses/${curso.id}`}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition"
                          >
                            Ingresar al Curso <ArrowRight size={16} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}