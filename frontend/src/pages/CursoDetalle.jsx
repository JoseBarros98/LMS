import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock3, MessageCircle, Send, Trash2, BookOpen, Package, Settings, Plus, X } from 'lucide-react'
import Layout from '../components/Layout'
import { cursosApi } from '../api/cursos'
import { useAuth } from '../context/AuthContext'

const nivelBadge = {
  basico: 'bg-sky-100 text-sky-700',
  intermedio: 'bg-indigo-100 text-indigo-700',
  avanzado: 'bg-fuchsia-100 text-fuchsia-700',
}

const estadoBadge = {
  disponible: 'bg-emerald-100 text-emerald-700',
  proximo: 'bg-amber-100 text-amber-700',
  bloqueado: 'bg-gray-200 text-gray-700',
}

const formatDuration = (minutes) => {
  if (!minutes) return 'N/A'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`
}

const initialLeccionForm = {
  titulo: '',
  descripcion: '',
  video_url: '',
  duracion_min: 0,
  orden: 0,
  publicado: true,
}

const getYoutubeEmbedUrl = (url) => {
  if (!url) return null

  const buildEmbedUrl = (videoId) => {
    if (!videoId) return null
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
    })
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
  }

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace('www.', '')

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.replace('/', '')
      return buildEmbedUrl(videoId)
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (parsed.pathname === '/watch') {
        const videoId = parsed.searchParams.get('v')
        return buildEmbedUrl(videoId)
      }

      if (parsed.pathname.startsWith('/shorts/')) {
        const videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0]
        return buildEmbedUrl(videoId)
      }

      if (parsed.pathname.startsWith('/embed/')) {
        const videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0]
        return buildEmbedUrl(videoId)
      }
    }
  } catch {
    return null
  }

  return null
}

export default function CursoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [curso, setCurso] = useState(null)
  const [secciones, setSecciones] = useState([])
  const [progreso, setProgreso] = useState([])
  const [comentarios, setComentarios] = useState([])
  const [mediateca, setMediateca] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('curso')
  const [comentarioText, setComentarioText] = useState('')
  const [enviandoComentario, setEnviandoComentario] = useState(false)
  const [selectedLeccion, setSelectedLeccion] = useState(null)

  // Admin states
  const [seccionModalOpen, setSeccionModalOpen] = useState(false)
  const [leccionModalOpen, setLeccionModalOpen] = useState(false)
  const [mediatecaModalOpen, setMediatecaModalOpen] = useState(false)
  const [selectedSeccion, setSelectedSeccion] = useState(null)
  const [seccionForm, setSeccionForm] = useState({ titulo: '', descripcion: '', orden: 0 })
  const [leccionForm, setLeccionForm] = useState(initialLeccionForm)
  const [leccionEdit, setLeccionEdit] = useState(null)
  const [mediatecaForm, setMediatecaForm] = useState({ titulo: '', descripcion: '', tipo: 'documento', url: '', publicado: true })

  const isAdmin = user?.role?.name?.toLowerCase() === 'administrador'

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const [cursoData, seccionesData, progresoData, comentariosData, mediatecaData] = await Promise.all([
        cursosApi.getCursoDetalle(id),
        cursosApi.getSecciones(id),
        cursosApi.getProgreso(id),
        cursosApi.getComentarios(id),
        cursosApi.getMediateca(id),
      ])

      setCurso(cursoData)
      setSecciones(Array.isArray(seccionesData) ? seccionesData : [])
      setProgreso(Array.isArray(progresoData) ? progresoData : [])
      setComentarios(Array.isArray(comentariosData) ? comentariosData : [])
      setMediateca(Array.isArray(mediatecaData) ? mediatecaData : [])
    } catch {
      setError('No se pudo cargar el detalle del curso.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleComentario = async (e) => {
    e.preventDefault()
    if (!comentarioText.trim()) return

    try {
      setEnviandoComentario(true)
      await cursosApi.createComentario({
        curso: id,
        contenido: comentarioText,
      })
      setComentarioText('')
      await loadData()
    } catch {
      alert('No se pudo enviar el comentario.')
    } finally {
      setEnviandoComentario(false)
    }
  }

  const handleEliminarComentario = async (comentarioId) => {
    if (!window.confirm('¿Eliminar este comentario?')) return

    try {
      await cursosApi.deleteComentario(comentarioId)
      await loadData()
    } catch {
      alert('No se pudo eliminar el comentario.')
    }
  }

  const handleMarcarLeccion = async (leccionId) => {
    try {
      await cursosApi.updateProgreso(leccionId, { porcentaje: 100, completada: true })
      await loadData()
    } catch {
      alert('No se pudo actualizar el progreso.')
    }
  }

  const leccionesPublicadas = useMemo(() => {
    return secciones.flatMap((seccion) => seccion.lecciones || [])
  }, [secciones])

  const progresoMap = useMemo(() => {
    return progreso.reduce((accumulator, item) => {
      accumulator[item.leccion] = item
      return accumulator
    }, {})
  }, [progreso])

  const leccionesCompletadas = useMemo(() => {
    return leccionesPublicadas.filter((leccion) => progresoMap[leccion.id]?.completada).length
  }, [leccionesPublicadas, progresoMap])

  useEffect(() => {
    if (leccionesPublicadas.length === 0) {
      setSelectedLeccion(null)
      return
    }

    if (!selectedLeccion) {
      setSelectedLeccion(leccionesPublicadas[0])
      return
    }

    const stillExists = leccionesPublicadas.some((leccion) => leccion.id === selectedLeccion.id)
    if (!stillExists) {
      setSelectedLeccion(leccionesPublicadas[0])
    }
  }, [leccionesPublicadas, selectedLeccion])

  // Admin handlers
  const handleCrearSeccion = async (e) => {
    e.preventDefault()
    if (!seccionForm.titulo.trim()) {
      alert('El título de la sección es requerido.')
      return
    }

    try {
      await cursosApi.createSeccion({
        curso: id,
        ...seccionForm,
      })
      setSeccionForm({ titulo: '', descripcion: '', orden: 0 })
      setSeccionModalOpen(false)
      await loadData()
    } catch {
      alert('No se pudo crear la sección.')
    }
  }

  const handleGuardarLeccion = async (e) => {
    e.preventDefault()
    if (!selectedSeccion || !leccionForm.titulo.trim() || !leccionForm.video_url.trim()) {
      alert('Completa todos los campos requeridos.')
      return
    }

    try {
      const payload = {
        seccion: selectedSeccion,
        ...leccionForm,
      }

      if (leccionEdit) {
        await cursosApi.updateLeccion(leccionEdit.id, payload)
      } else {
        await cursosApi.createLeccion(payload)
      }

      setLeccionForm(initialLeccionForm)
      setLeccionEdit(null)
      setSelectedSeccion(null)
      setLeccionModalOpen(false)
      await loadData()
    } catch {
      alert(leccionEdit ? 'No se pudo actualizar la lección.' : 'No se pudo crear la lección.')
    }
  }

  const handleEditarLeccion = (leccion, seccionId) => {
    setSelectedSeccion(seccionId)
    setLeccionEdit(leccion)
    setLeccionForm({
      titulo: leccion.titulo || '',
      descripcion: leccion.descripcion || '',
      video_url: leccion.video_url || '',
      duracion_min: leccion.duracion_min || 0,
      orden: leccion.orden || 0,
      publicado: Boolean(leccion.publicado),
    })
    setLeccionModalOpen(true)
  }

  const handleEliminarLeccion = async (leccionId) => {
    if (!window.confirm('¿Eliminar esta lección?')) return

    try {
      await cursosApi.deleteLeccion(leccionId)
      if (selectedLeccion?.id === leccionId) {
        setSelectedLeccion(null)
      }
      await loadData()
    } catch {
      alert('No se pudo eliminar la lección.')
    }
  }

  const handleCrearMediateca = async (e) => {
    e.preventDefault()
    if (!mediatecaForm.titulo.trim() || !mediatecaForm.url.trim()) {
      alert('Completa todos los campos requeridos.')
      return
    }

    try {
      await cursosApi.createMediatecaItem({
        curso: id,
        ...mediatecaForm,
      })
      setMediatecaForm({ titulo: '', descripcion: '', tipo: 'documento', url: '', publicado: true })
      setMediatecaModalOpen(false)
      await loadData()
    } catch {
      alert('No se pudo crear el item de mediateca.')
    }
  }

  const handleEliminarMediateca = async (itemId) => {
    if (!window.confirm('¿Eliminar este recurso?')) return

    try {
      await cursosApi.deleteMediatecaItem(itemId)
      await loadData()
    } catch {
      alert('No se pudo eliminar el recurso.')
    }
  }

  const progresoTotal = useMemo(() => {
    if (leccionesPublicadas.length === 0) return 0
    return Math.round((leccionesCompletadas / leccionesPublicadas.length) * 100)
  }, [leccionesCompletadas, leccionesPublicadas.length])

  const currentVideoUrl = selectedLeccion?.video_url || curso?.video_intro_url || ''
  const currentYoutubeEmbedUrl = useMemo(() => getYoutubeEmbedUrl(currentVideoUrl), [currentVideoUrl])

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando detalle del curso...</p>
        </div>
      </Layout>
    )
  }

  if (error || !curso) {
    return (
      <Layout>
        <div className="space-y-4">
          <button onClick={() => navigate('/courses')} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
            <ArrowLeft size={18} />
            Volver a Mis Cursos
          </button>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
            {error || 'No se encontró el curso.'}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <button onClick={() => navigate('/courses')} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
          <ArrowLeft size={18} />
          Volver
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-500 uppercase font-medium">{curso.ruta_titulo}</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-800">{curso.titulo}</h1>
              <p className="mt-2 text-gray-600">{curso.descripcion}</p>

              <div className="mt-4 flex flex-wrap gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${nivelBadge[curso.nivel]}`}>
                  {curso.nivel_label}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${estadoBadge[curso.estado]}`}>
                  {curso.estado_label}
                </span>
              </div>
            </div>

            {curso.imagen_portada_url && (
              <img src={curso.imagen_portada_url} alt={curso.titulo} className="w-48 h-32 object-cover rounded-xl" />
            )}
          </div>

          <div className="flex flex-wrap gap-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <BookOpen size={18} />
              {curso.total_lecciones} lecciones
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock3 size={18} />
              {formatDuration(curso.duracion_total_min)}
            </div>
            <div className="text-sm font-medium text-blue-600">
              Progreso: {progresoTotal}%
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progresoTotal}%` }} />
          </div>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex gap-0 flex-wrap">
            <button
              onClick={() => setActiveTab('curso')}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === 'curso' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Contenido
            </button>
            {curso.tiene_mediateca && (
              <button
                onClick={() => setActiveTab('mediateca')}
                className={`px-4 py-3 font-medium border-b-2 transition ${
                  activeTab === 'mediateca' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                Mediateca
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-3 font-medium border-b-2 transition flex items-center gap-2 ${
                  activeTab === 'admin' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Settings size={16} />
                Administración
              </button>
            )}
          </div>
        </div>

        {activeTab === 'curso' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {currentVideoUrl && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {currentYoutubeEmbedUrl ? (
                    <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                      <iframe
                        key={selectedLeccion?.id || 'intro'}
                        src={currentYoutubeEmbedUrl}
                        title={selectedLeccion?.titulo || curso.titulo}
                        className="absolute top-0 left-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <video
                      key={selectedLeccion?.id || 'intro'}
                      src={currentVideoUrl}
                      controls
                      className="w-full bg-gray-900 max-h-96"
                    />
                  )}
                  {selectedLeccion && (
                    <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{selectedLeccion.titulo}</p>
                        <p className="text-xs text-gray-500">{selectedLeccion.duracion_min || 0} min</p>
                      </div>
                      <button
                        onClick={() => handleMarcarLeccion(selectedLeccion.id)}
                        disabled={Boolean(progresoMap[selectedLeccion.id]?.completada)}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                      >
                        {progresoMap[selectedLeccion.id]?.completada ? 'Completada' : 'Marcar completada'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageCircle size={20} className="text-gray-700" />
                  <h2 className="text-lg font-semibold text-gray-800">Comentarios</h2>
                </div>

                <form onSubmit={handleComentario} className="space-y-3">
                  <textarea
                    value={comentarioText}
                    onChange={(e) => setComentarioText(e.target.value)}
                    placeholder="Escribe tu comentario..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
                    rows="3"
                  />
                  <button
                    type="submit"
                    disabled={enviandoComentario || !comentarioText.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Send size={16} />
                    Enviar
                  </button>
                </form>

                <div className="space-y-3 mt-4 max-h-96 overflow-y-auto">
                  {comentarios.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Sin comentarios aún.</p>
                  ) : (
                    comentarios.map((com) => (
                      <div key={com.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{com.user_nombre || com.user_email}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{new Date(com.created_at).toLocaleDateString()}</p>
                          </div>
                          {user?.user_id === com.user && (
                            <button
                              onClick={() => handleEliminarComentario(com.id)}
                              className="text-red-600 hover:text-red-700 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mt-2">{com.contenido}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Contenido del Curso</h3>

                {secciones.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin secciones cargadas aún.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {secciones.map((seccion) => (
                      <div key={seccion.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                        <p className="text-sm font-semibold text-gray-800">{seccion.titulo}</p>

                        {seccion.lecciones && seccion.lecciones.length > 0 ? (
                          <div className="space-y-2">
                            {seccion.lecciones.map((leccion) => {
                              const leccionProgreso = progresoMap[leccion.id]
                              const completada = leccionProgreso?.completada || false
                              const selected = selectedLeccion?.id === leccion.id

                              return (
                                <div
                                  key={leccion.id}
                                  className={`flex items-start gap-2 p-2 rounded border transition cursor-pointer text-xs ${
                                    selected
                                      ? 'bg-blue-50 border-blue-200'
                                      : 'bg-gray-50 border-gray-100 hover:bg-blue-50'
                                  }`}
                                  onClick={() => setSelectedLeccion(leccion)}
                                >
                                  <div className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center ${completada ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                    {completada && <span className="text-white text-[10px]">✓</span>}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-gray-800 font-medium">{leccion.titulo}</p>
                                    <p className="text-gray-500">{leccion.duracion_min} min</p>
                                  </div>
                                  {!completada && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleMarcarLeccion(leccion.id)
                                      }}
                                      className="px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                                    >
                                      Completar
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-xs">Sin lecciones</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mediateca' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mediateca.length === 0 ? (
              <div className="col-span-full bg-white border border-gray-200 rounded-2xl p-8 text-center">
                <Package size={32} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">Sin recursos en la mediateca.</p>
              </div>
            ) : (
              mediateca.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 line-clamp-2">{item.titulo}</p>
                      <p className="text-sm text-gray-600 mt-1">{item.descripcion}</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleEliminarMediateca(item.id)}
                        className="text-red-600 hover:text-red-700 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                    >
                      {item.tipo === 'enlace' ? 'Abrir' : 'Descargar'}
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Secciones del Curso</h2>
                <button
                  onClick={() => setSeccionModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                >
                  <Plus size={16} />
                  Nueva Sección
                </button>
              </div>

              {secciones.length === 0 ? (
                <p className="text-sm text-gray-600">No hay secciones. Crea una para comenzar.</p>
              ) : (
                <div className="space-y-3">
                  {secciones.map((seccion) => (
                    <div key={seccion.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{seccion.titulo}</p>
                          <p className="text-sm text-gray-600">{seccion.descripcion}</p>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Orden #{seccion.orden}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{seccion.lecciones?.length || 0} lecciones</span>
                        <button
                          onClick={() => {
                            setLeccionEdit(null)
                            setLeccionForm(initialLeccionForm)
                            setSelectedSeccion(seccion.id)
                            setLeccionModalOpen(true)
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-green-100 text-green-700 hover:bg-green-200 transition font-medium"
                        >
                          <Plus size={14} />
                          Agregar Lección
                        </button>
                      </div>

                      {seccion.lecciones && seccion.lecciones.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-gray-200">
                          {seccion.lecciones.map((leccion) => (
                            <div key={leccion.id} className="flex items-start justify-between gap-2 p-2 bg-gray-50 rounded text-sm">
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">{leccion.titulo}</p>
                                <p className="text-xs text-gray-600">{leccion.duracion_min} min • Orden #{leccion.orden}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded ${leccion.publicado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                  {leccion.publicado ? 'Publicada' : 'Borrador'}
                                </span>
                                <button
                                  onClick={() => handleEditarLeccion(leccion, seccion.id)}
                                  className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleEliminarLeccion(leccion.id)}
                                  className="px-2 py-1 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200 transition"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Recursos de Mediateca</h2>
                <button
                  onClick={() => setMediatecaModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                >
                  <Plus size={16} />
                  Nuevo Recurso
                </button>
              </div>

              {mediateca.length === 0 ? (
                <p className="text-sm text-gray-600">No hay recursos en la mediateca.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mediateca.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-gray-800 line-clamp-2">{item.titulo}</p>
                        <button
                          onClick={() => handleEliminarMediateca(item.id)}
                          className="text-red-600 hover:text-red-700 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600">{item.tipo} • Orden #{item.orden}</p>
                      <span className={`text-xs px-2 py-1 rounded inline-block ${item.publicado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {item.publicado ? 'Publicado' : 'Borrador'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Nueva Sección */}
      {seccionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Nueva Sección</h3>
              <button
                onClick={() => setSeccionModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrearSeccion} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
                <input
                  type="text"
                  placeholder="Título de la sección"
                  value={seccionForm.titulo}
                  onChange={(e) => setSeccionForm({ ...seccionForm, titulo: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                <textarea
                  placeholder="Descripción (opcional)"
                  value={seccionForm.descripcion}
                  onChange={(e) => setSeccionForm({ ...seccionForm, descripcion: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Orden</label>
                <input
                  type="number"
                  placeholder="Orden"
                  value={seccionForm.orden}
                  onChange={(e) => setSeccionForm({ ...seccionForm, orden: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSeccionModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
                >
                  Crear Sección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nueva Lección */}
      {leccionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">{leccionEdit ? 'Editar Lección' : 'Nueva Lección'}</h3>
              <button
                onClick={() => {
                  setLeccionModalOpen(false)
                  setLeccionEdit(null)
                  setLeccionForm(initialLeccionForm)
                  setSelectedSeccion(null)
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGuardarLeccion} className="px-6 py-5 space-y-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
              <input
                type="text"
                placeholder="Título de la lección"
                value={leccionForm.titulo}
                onChange={(e) => setLeccionForm({ ...leccionForm, titulo: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
              <textarea
                placeholder="Descripción (opcional)"
                value={leccionForm.descripcion}
                onChange={(e) => setLeccionForm({ ...leccionForm, descripcion: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                rows="2"
              />
              <label className="block text-xs font-medium text-gray-500 mb-1">URL del video</label>
              <input
                type="text"
                placeholder="URL del video"
                value={leccionForm.video_url}
                onChange={(e) => setLeccionForm({ ...leccionForm, video_url: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <label className="block text-xs font-medium text-gray-500 mb-1">Duración (min)</label>
              <input
                type="number"
                placeholder="Duración en minutos"
                value={leccionForm.duracion_min}
                onChange={(e) => setLeccionForm({ ...leccionForm, duracion_min: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <label className="block text-xs font-medium text-gray-500 mb-1">Orden</label>
              <input
                type="number"
                placeholder="Orden"
                value={leccionForm.orden}
                onChange={(e) => setLeccionForm({ ...leccionForm, orden: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={leccionForm.publicado}
                  onChange={(e) => setLeccionForm({ ...leccionForm, publicado: e.target.checked })}
                />
                Publicada
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setLeccionModalOpen(false)
                    setLeccionEdit(null)
                    setLeccionForm(initialLeccionForm)
                    setSelectedSeccion(null)
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
                  {leccionEdit ? 'Guardar cambios' : 'Crear Lección'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Recurso */}
      {mediatecaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Nuevo Recurso de Mediateca</h3>
              <button
                onClick={() => setMediatecaModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrearMediateca} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
                <input
                  type="text"
                  placeholder="Título del recurso"
                  value={mediatecaForm.titulo}
                  onChange={(e) => setMediatecaForm({ ...mediatecaForm, titulo: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                <textarea
                  placeholder="Descripción (opcional)"
                  value={mediatecaForm.descripcion}
                  onChange={(e) => setMediatecaForm({ ...mediatecaForm, descripcion: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows="2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                <select
                  value={mediatecaForm.tipo}
                  onChange={(e) => setMediatecaForm({ ...mediatecaForm, tipo: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="documento">Documento</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="enlace">Enlace</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
                <input
                  type="text"
                  placeholder="URL del archivo o enlace"
                  value={mediatecaForm.url}
                  onChange={(e) => setMediatecaForm({ ...mediatecaForm, url: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={mediatecaForm.publicado}
                  onChange={(e) => setMediatecaForm({ ...mediatecaForm, publicado: e.target.checked })}
                />
                Publicado
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMediatecaModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
                >
                  Crear Recurso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
