import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock3, MessageCircle, Send, Trash2, BookOpen, Package, Settings, Plus, X, Folder, FolderOpen, FileText, Search, ChevronRight, Link2, Video, Headphones, Pencil, Upload, UserPlus, Monitor, Play, History, CheckCircle2 } from 'lucide-react'
import Layout from '../components/Layout'
import StudentEnrollmentModal from '../components/StudentEnrollmentModal'
import GeneratedPasswordModal from '../components/GeneratedPasswordModal'
import InstruccionesModal from '../components/InstruccionesModal'
import { cursosApi } from '../api/cursos'
import { simuladoresApi } from '../api/simuladores'
import { useAuth } from '../context/AuthContext'
import { formatCurrencyBs, formatDuration } from '../utils/formatters'
import { rememberGeneratedCredential } from '../utils/enrollmentCredentials'
import { getApiErrorMessage, showConfirm, showError, showSuccess } from '../utils/toast'

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

const simuladorEstadoBadge = {
  disponible: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  noDisponible: 'bg-amber-100 text-amber-700 border-amber-200',
}

const initialLeccionForm = {
  titulo: '',
  descripcion: '',
  video_url: '',
  duracion_min: '00:00:00',
  orden: 0,
  publicado: true,
}

const initialMediatecaForm = {
  titulo: '',
  descripcion: '',
  tipo: 'documento',
  url: '',
  orden: 0,
  publicado: true,
}

const sortMediatecaItems = (items) => {
  return [...items].sort((left, right) => {
    const leftIsFolder = left.tipo === 'carpeta'
    const rightIsFolder = right.tipo === 'carpeta'

    if (leftIsFolder && !rightIsFolder) return -1
    if (!leftIsFolder && rightIsFolder) return 1

    if ((left.orden || 0) !== (right.orden || 0)) {
      return (left.orden || 0) - (right.orden || 0)
    }

    return left.titulo.localeCompare(right.titulo)
  })
}

const getMediatecaItemMeta = (item) => {
  switch (item.tipo) {
    case 'carpeta':
      return {
        Icon: FolderOpen,
        badge: 'Carpeta',
        surfaceClassName: 'bg-gradient-to-br from-blue-50 to-sky-100 text-blue-600',
        actionLabel: 'Abrir carpeta',
      }
    case 'video':
      return {
        Icon: Video,
        badge: 'Video',
        surfaceClassName: 'bg-gradient-to-br from-rose-50 to-orange-100 text-rose-600',
        actionLabel: 'Abrir video',
      }
    case 'audio':
      return {
        Icon: Headphones,
        badge: 'Audio',
        surfaceClassName: 'bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-600',
        actionLabel: 'Abrir audio',
      }
    case 'enlace':
      return {
        Icon: Link2,
        badge: 'Enlace',
        surfaceClassName: 'bg-gradient-to-br from-violet-50 to-indigo-100 text-violet-600',
        actionLabel: 'Abrir enlace',
      }
    default:
      return {
        Icon: FileText,
        badge: 'Archivo',
        surfaceClassName: 'bg-gradient-to-br from-amber-50 to-red-100 text-red-600',
        actionLabel: 'Abrir archivo',
      }
  }
}

// Rewrite backend-absolute media URLs to go through Nginx (/media/...),
// avoiding cross-origin issues and X-Frame-Options blocks.
const normalizeMediaUrl = (url) => {
  if (!url) return url
  try {
    const parsed = new URL(url)
    if (parsed.pathname.startsWith('/media/')) {
      return parsed.pathname
    }
  } catch {
    // relative or non-standard URL — return as-is
  }
  return url
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

const formatSimuladorDateRange = (apertura, cierre) => {
  const formatDate = (value) => {
    if (!value) return null
    return new Date(value).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const aperturaLabel = formatDate(apertura)
  const cierreLabel = formatDate(cierre)

  if (!aperturaLabel && !cierreLabel) {
    return 'Se habilita al completar el curso.'
  }

  if (aperturaLabel && cierreLabel) {
    return `${aperturaLabel} - ${cierreLabel}`
  }

  return aperturaLabel || cierreLabel
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
  const [replyDrafts, setReplyDrafts] = useState({})
  const [replyingToId, setReplyingToId] = useState(null)
  const [selectedLeccion, setSelectedLeccion] = useState(null)

  // Admin states
  const [seccionModalOpen, setSeccionModalOpen] = useState(false)
  const [leccionModalOpen, setLeccionModalOpen] = useState(false)
  const [mediatecaModalOpen, setMediatecaModalOpen] = useState(false)
  const [selectedSeccion, setSelectedSeccion] = useState(null)
  const [seccionForm, setSeccionForm] = useState({ titulo: '', descripcion: '', orden: 0 })
  const [leccionForm, setLeccionForm] = useState(initialLeccionForm)
  const [leccionEdit, setLeccionEdit] = useState(null)
  const [mediatecaForm, setMediatecaForm] = useState(initialMediatecaForm)
  const [mediatecaCurrentFolderId, setMediatecaCurrentFolderId] = useState(null)
  const [mediatecaSearch, setMediatecaSearch] = useState('')
  const [mediatecaCreateMode, setMediatecaCreateMode] = useState('archivo')
  const [mediatecaEdit, setMediatecaEdit] = useState(null)
  const [mediatecaUploadMode, setMediatecaUploadMode] = useState('url')
  const [mediatecaFile, setMediatecaFile] = useState(null)
  const [pdfModalItem, setPdfModalItem] = useState(null)
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [studentEnrollmentError, setStudentEnrollmentError] = useState('')
  const [submittingStudent, setSubmittingStudent] = useState(false)
  const [generatedCredentials, setGeneratedCredentials] = useState(null)
  const [simuladorModal, setSimuladorModal] = useState(null)
  const [iniciandoSimuladorId, setIniciandoSimuladorId] = useState(null)

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

  const handleComentario = async (e, parentId = null) => {
    e.preventDefault()

    const content = parentId ? (replyDrafts[parentId] || '').trim() : comentarioText.trim()
    if (!content) return

    try {
      setEnviandoComentario(true)
      const payload = {
        curso: id,
        contenido: content,
      }
      if (parentId) {
        payload.parent = parentId
      }
      await cursosApi.createComentario(payload)

      if (parentId) {
        setReplyDrafts((previous) => ({ ...previous, [parentId]: '' }))
        setReplyingToId(null)
      } else {
        setComentarioText('')
      }
      await loadData()
    } catch {
      showError('No se pudo enviar el comentario o la respuesta.')
    } finally {
      setEnviandoComentario(false)
    }
  }

  const handleCreateStudentAndEnroll = async (form) => {
    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin < form.fecha_inicio) {
      setStudentEnrollmentError('La fecha fin no puede ser menor que la fecha inicio.')
      showError('La fecha fin no puede ser menor que la fecha inicio.')
      return
    }

    try {
      setSubmittingStudent(true)
      setStudentEnrollmentError('')
      const montoAbonado = Number(form.monto_pagado || 0)
      const registrarAbono = async (matriculaData) => {
        if (montoAbonado <= 0) return
        const primerasCuota = matriculaData?.cuotas?.[0]
        if (!primerasCuota) return
        try {
          await cursosApi.registrarPagoCuota(primerasCuota.id, { monto_abonado: montoAbonado })
        } catch {
          showError('Matricula creada, pero no se pudo registrar el abono inicial. Hazlo desde el detalle de la inscripcion.')
        }
      }
      if (form.mode === 'existing') {
        const response = await cursosApi.enrollExistingStudentInCurso(id, form)
        await registrarAbono(response?.data?.matricula)
        showSuccess('Estudiante existente matriculado en el curso.')
      } else {
        const response = await cursosApi.createStudentAndEnrollInCurso(id, form)
        await registrarAbono(response?.data?.matricula)
        const generatedPassword = response?.data?.generated_password
        const userEmail = response?.data?.user?.email
        if (userEmail && generatedPassword) {
          rememberGeneratedCredential({ email: userEmail, password: generatedPassword })
        }
        if (generatedPassword) {
          setGeneratedCredentials({
            studentName: response?.data?.user?.name || form.name,
            password: generatedPassword,
            contextLabel: 'la matricula del curso',
          })
        } else {
          showSuccess('Estudiante creado y matriculado en el curso.')
        }
      }
      setStudentModalOpen(false)
      await loadData()
    } catch (error) {
      const message = getApiErrorMessage(error, 'No se pudo crear y matricular al estudiante en este curso.')
      setStudentEnrollmentError(message)
      showError(message)
    } finally {
      setSubmittingStudent(false)
    }
  }

  const handleEliminarComentario = async (comentarioId) => {
    if (!await showConfirm('¿Eliminar este comentario?')) return

    try {
      await cursosApi.deleteComentario(comentarioId)
      showSuccess('Comentario eliminado correctamente.')
      await loadData()
    } catch {
      showError('No se pudo eliminar el comentario.')
    }
  }

  const handleMarcarLeccion = async (leccionId) => {
    try {
      await cursosApi.updateProgreso(leccionId, { porcentaje: 100, completada: true })
      showSuccess('Progreso actualizado correctamente.')
      await loadData()
    } catch {
      showError('No se pudo actualizar el progreso.')
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

  const mediatecaById = useMemo(() => {
    return mediateca.reduce((accumulator, item) => {
      accumulator[item.id] = item
      return accumulator
    }, {})
  }, [mediateca])

  const mediatecaCurrentFolder = mediatecaCurrentFolderId ? mediatecaById[mediatecaCurrentFolderId] : null

  const mediatecaBreadcrumbs = useMemo(() => {
    const crumbs = []
    let current = mediatecaCurrentFolder

    while (current) {
      crumbs.unshift(current)
      current = current.parent ? mediatecaById[current.parent] : null
    }

    return crumbs
  }, [mediatecaById, mediatecaCurrentFolder])

  const mediatecaVisibleItems = useMemo(() => {
    const normalizedSearch = mediatecaSearch.trim().toLowerCase()
    const currentItems = mediateca.filter((item) => (item.parent || null) === mediatecaCurrentFolderId)
    const filteredItems = normalizedSearch
      ? currentItems.filter((item) => `${item.titulo} ${item.descripcion || ''}`.toLowerCase().includes(normalizedSearch))
      : currentItems

    return sortMediatecaItems(filteredItems)
  }, [mediateca, mediatecaCurrentFolderId, mediatecaSearch])

  const mediatecaStats = useMemo(() => {
    return mediatecaVisibleItems.reduce(
      (accumulator, item) => {
        if (item.tipo === 'carpeta') {
          accumulator.folders += 1
        } else {
          accumulator.files += 1
        }
        return accumulator
      },
      { folders: 0, files: 0 }
    )
  }, [mediatecaVisibleItems])

  useEffect(() => {
    if (!selectedLeccion) return

    const stillExists = leccionesPublicadas.some((leccion) => leccion.id === selectedLeccion.id)
    if (!stillExists) {
      setSelectedLeccion(null)
    }
  }, [leccionesPublicadas, selectedLeccion])

  useEffect(() => {
    if (mediatecaCurrentFolderId && !mediatecaById[mediatecaCurrentFolderId]) {
      setMediatecaCurrentFolderId(null)
    }
  }, [mediatecaById, mediatecaCurrentFolderId])

  // Admin handlers
  const handleCrearSeccion = async (e) => {
    e.preventDefault()
    if (!seccionForm.titulo.trim()) {
      showError('El titulo de la seccion es requerido.')
      return
    }

    try {
      await cursosApi.createSeccion({
        curso: id,
        ...seccionForm,
      })
      showSuccess('Seccion creada correctamente.')
      setSeccionForm({ titulo: '', descripcion: '', orden: 0 })
      setSeccionModalOpen(false)
      await loadData()
    } catch {
      showError('No se pudo crear la seccion.')
    }
  }

  const handleGuardarLeccion = async (e) => {
    e.preventDefault()
    if (!selectedSeccion || !leccionForm.titulo.trim() || !leccionForm.video_url.trim()) {
      showError('Completa todos los campos requeridos.')
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
      showSuccess(leccionEdit ? 'Leccion actualizada correctamente.' : 'Leccion creada correctamente.')
      await loadData()
    } catch {
      showError(leccionEdit ? 'No se pudo actualizar la leccion.' : 'No se pudo crear la leccion.')
    }
  }

  const handleEditarLeccion = (leccion, seccionId) => {
    setSelectedSeccion(seccionId)
    setLeccionEdit(leccion)
    setLeccionForm({
      titulo: leccion.titulo || '',
      descripcion: leccion.descripcion || '',
      video_url: leccion.video_url || '',
      duracion_min: leccion.duracion_min || '00:00:00',
      orden: leccion.orden || 0,
      publicado: Boolean(leccion.publicado),
    })
    setLeccionModalOpen(true)
  }

  const handleEliminarLeccion = async (leccionId) => {
    if (!await showConfirm('¿Eliminar esta lección?')) return

    try {
      await cursosApi.deleteLeccion(leccionId)
      if (selectedLeccion?.id === leccionId) {
        setSelectedLeccion(null)
      }
      showSuccess('Leccion eliminada correctamente.')
      await loadData()
    } catch {
      showError('No se pudo eliminar la leccion.')
    }
  }

  const handleGuardarMediateca = async (e) => {
    e.preventDefault()
    const isFolder = mediatecaCreateMode === 'carpeta'

    if (!mediatecaForm.titulo.trim()) {
      showError('El titulo es requerido.')
      return
    }

    if (!isFolder) {
      if (mediatecaUploadMode === 'file' && !mediatecaFile && !mediatecaEdit?.archivo) {
        showError('Selecciona un archivo para subir.')
        return
      }
      if (mediatecaUploadMode === 'url' && !mediatecaForm.url.trim() && !mediatecaEdit?.url) {
        showError('La URL es requerida.')
        return
      }
    }

    const payload = {
      titulo: mediatecaForm.titulo,
      descripcion: mediatecaForm.descripcion,
      tipo: isFolder ? 'carpeta' : mediatecaForm.tipo,
      orden: mediatecaForm.orden,
      publicado: mediatecaForm.publicado,
    }

    if (!mediatecaEdit) {
      payload.curso = id
      payload.parent = mediatecaCurrentFolderId
    }

    if (!isFolder) {
      if (mediatecaUploadMode === 'file' && mediatecaFile) {
        payload._file = mediatecaFile
      } else {
        payload.url = mediatecaForm.url
      }
    }

    try {
      if (mediatecaEdit) {
        await cursosApi.updateMediatecaItem(mediatecaEdit.id, payload)
      } else {
        await cursosApi.createMediatecaItem(payload)
      }
      setMediatecaForm(initialMediatecaForm)
      setMediatecaEdit(null)
      setMediatecaFile(null)
      setMediatecaUploadMode('url')
      setMediatecaModalOpen(false)
      showSuccess(mediatecaEdit ? 'Recurso actualizado correctamente.' : `${isFolder ? 'Carpeta' : 'Recurso'} creado correctamente.`)
      await loadData()
    } catch {
      showError(`No se pudo ${mediatecaEdit ? 'actualizar' : 'crear'} ${isFolder ? 'la carpeta' : 'el archivo'}.`)
    }
  }

  const openMediatecaModal = (mode, item = null) => {
    setMediatecaCreateMode(mode)
    setMediatecaEdit(item)
    setMediatecaFile(null)
    if (item) {
      setMediatecaForm({
        titulo: item.titulo || '',
        descripcion: item.descripcion || '',
        tipo: item.tipo || 'documento',
        url: item.url || '',
        orden: item.orden || 0,
        publicado: item.publicado !== false,
      })
      setMediatecaUploadMode(item.archivo ? 'file' : 'url')
    } else {
      setMediatecaForm({
        ...initialMediatecaForm,
        tipo: mode === 'carpeta' ? 'carpeta' : 'documento',
      })
      setMediatecaUploadMode('url')
    }
    setMediatecaModalOpen(true)
  }

  const handleEliminarMediateca = async (itemId) => {
    if (!await showConfirm('¿Eliminar este recurso?')) return

    try {
      await cursosApi.deleteMediatecaItem(itemId)
      showSuccess('Recurso eliminado correctamente.')
      await loadData()
    } catch {
      showError('No se pudo eliminar el recurso.')
    }
  }

  const progresoTotal = useMemo(() => {
    if (leccionesPublicadas.length === 0) return 0
    return Math.round((leccionesCompletadas / leccionesPublicadas.length) * 100)
  }, [leccionesCompletadas, leccionesPublicadas.length])

  const simuladoresCurso = useMemo(() => {
    return Array.isArray(curso?.simuladores) ? curso.simuladores : []
  }, [curso])

  const currentVideoUrl = selectedLeccion?.video_url || curso?.video_intro_url || ''
  const currentYoutubeEmbedUrl = useMemo(() => getYoutubeEmbedUrl(currentVideoUrl), [currentVideoUrl])

  const handleIniciarSimulador = async (simulador) => {
    try {
      setIniciandoSimuladorId(simulador.id)
      const intento = await simuladoresApi.iniciarIntento(simulador.id)
      setSimuladorModal(null)
      navigate(`/simuladores/${simulador.id}/resolver/${intento.id}`)
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo iniciar el simulador.'))
    } finally {
      setIniciandoSimuladorId(null)
    }
  }

  const renderComentario = (com, depth = 0) => {
    const replies = Array.isArray(com.respuestas) ? com.respuestas : []
    const canDelete = isAdmin || user?.user_id === com.user
    const isReplyBoxOpen = replyingToId === com.id
    const replyValue = replyDrafts[com.id] || ''

    return (
      <div key={com.id} className={`${depth > 0 ? 'ml-6 mt-3 border-l-2 border-gray-100 pl-3' : ''}`}>
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{com.user_nombre || com.user_email}</p>
              <p className="text-xs text-gray-500 mt-0.5">{new Date(com.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setReplyingToId(isReplyBoxOpen ? null : com.id)
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Responder
              </button>
              {canDelete && (
                <button
                  onClick={() => handleEliminarComentario(com.id)}
                  className="text-red-600 hover:text-red-700 transition"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-700 mt-2">{com.contenido}</p>

          {isReplyBoxOpen && (
            <form onSubmit={(e) => handleComentario(e, com.id)} className="mt-3 space-y-2">
              <textarea
                value={replyValue}
                onChange={(e) => setReplyDrafts((previous) => ({ ...previous, [com.id]: e.target.value }))}
                placeholder="Escribe tu respuesta..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
                rows="2"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={enviandoComentario || !replyValue.trim()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  <Send size={14} />
                  Responder
                </button>
                <button
                  type="button"
                  onClick={() => setReplyingToId(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        {replies.length > 0 && (
          <div className="mt-2">
            {replies.map((reply) => renderComentario(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

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

            <div className="flex flex-col items-end gap-3">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setStudentEnrollmentError('')
                    setStudentModalOpen(true)
                  }}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-sm font-medium inline-flex items-center gap-2"
                >
                  <UserPlus size={15} />
                  Crear estudiante y matricular
                </button>
              )}

              {curso.imagen_portada_url && (
                <img src={curso.imagen_portada_url} alt={curso.titulo} className="w-48 h-32 object-cover rounded-xl" />
              )}
            </div>
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
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              {formatCurrencyBs(curso.precio)}
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
                        <p className="text-xs text-gray-500">{formatDuration(selectedLeccion.duracion_min)}</p>
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
                    comentarios.map((com) => renderComentario(com))
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
                                    <p className="text-gray-500">{formatDuration(leccion.duracion_min)}</p>
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

                {simuladoresCurso.length > 0 && (
                  <div className={`space-y-3 ${secciones.length > 0 ? 'mt-5 pt-5 border-t border-gray-200' : 'mt-4'}`}>
                    <div className="flex items-center gap-2">
                      <Monitor size={18} className="text-blue-600" />
                      <h4 className="text-sm font-semibold text-gray-800">Simuladores del curso</h4>
                    </div>

                    {simuladoresCurso.map((simulador) => {
                      const disponible = Boolean(simulador.esta_disponible)
                      const intentosRealizados = simulador.intentos_realizados ?? 0
                      const maxIntentos = simulador.max_intentos
                      const limiteAlcanzado = !isAdmin && intentosRealizados >= maxIntentos
                      const cursoBloqueado = !isAdmin && leccionesPublicadas.length > 0 && leccionesCompletadas < leccionesPublicadas.length
                      const puedeResolver = disponible && !cursoBloqueado && !limiteAlcanzado
                      const badgeClassName = disponible
                        ? simuladorEstadoBadge.disponible
                        : simuladorEstadoBadge.noDisponible

                      return (
                        <div
                          key={simulador.id}
                          className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{simulador.titulo}</p>
                              {simulador.descripcion && (
                                <p className="mt-1 text-xs text-gray-600 line-clamp-2">{simulador.descripcion}</p>
                              )}
                            </div>
                            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClassName}`}>
                              {disponible ? 'Disponible' : 'Pendiente'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
                            <p>
                              <span className="font-medium text-gray-700">Preguntas:</span> {simulador.total_preguntas}
                            </p>
                            <p>
                              <span className="font-medium text-gray-700">Tiempo:</span> {simulador.tiempo_limite_minutos ? `${simulador.tiempo_limite_minutos} min` : 'Sin límite'}
                            </p>
                            <p>
                              <span className="font-medium text-gray-700">Vigencia:</span> {formatSimuladorDateRange(simulador.fecha_apertura_efectiva, simulador.fecha_cierre_efectiva)}
                            </p>
                          </div>

                          {/* Intentos */}
                          <div className="flex items-center justify-between bg-white border border-blue-100 rounded-lg px-3 py-2 text-xs">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <History size={13} />
                              <span>Realizados</span>
                            </div>
                            <span className="font-semibold text-blue-600">{intentosRealizados} / {maxIntentos}</span>
                          </div>

                          {cursoBloqueado && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                              Debes completar todas las lecciones del curso para acceder al simulador ({leccionesCompletadas}/{leccionesPublicadas.length} completadas).
                            </p>
                          )}

                          {limiteAlcanzado && !cursoBloqueado && (
                            <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
                              Has alcanzado el límite de intentos permitidos.
                            </p>
                          )}

                          {!limiteAlcanzado && (
                            <button
                              type="button"
                              onClick={() => setSimuladorModal(simulador)}
                              disabled={!puedeResolver}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                              <Play size={16} />
                              {disponible ? 'Resolver simulador' : 'Aún no disponible'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mediateca' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <button
                    onClick={() => setMediatecaCurrentFolderId(null)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <Folder size={16} className="text-blue-600" />
                    {curso.titulo}
                  </button>
                  {mediatecaBreadcrumbs.map((crumb) => (
                    <div key={crumb.id} className="inline-flex items-center gap-2">
                      <ChevronRight size={14} className="text-gray-400" />
                      <button
                        onClick={() => setMediatecaCurrentFolderId(crumb.id)}
                        className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition"
                      >
                        {crumb.titulo}
                      </button>
                    </div>
                  ))}
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => openMediatecaModal('carpeta')}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition"
                    >
                      <Folder size={16} />
                      Nueva Carpeta
                    </button>
                    <button
                      onClick={() => openMediatecaModal('archivo')}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                    >
                      <Plus size={16} />
                      Nuevo Archivo
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full max-w-xl">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={mediatecaSearch}
                    onChange={(e) => setMediatecaSearch(e.target.value)}
                    placeholder="Buscar en esta mediateca"
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  {mediatecaCurrentFolder && (
                    <button
                      onClick={() => setMediatecaCurrentFolderId(mediatecaCurrentFolder.parent || null)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-700"
                    >
                      <ArrowLeft size={16} />
                      Volver
                    </button>
                  )}
                  <span>Carpetas {mediatecaStats.folders}</span>
                  <span>Archivos {mediatecaStats.files}</span>
                </div>
              </div>
            </div>

            {mediatecaVisibleItems.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
                <Package size={32} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-700 font-medium">No hay elementos en esta carpeta.</p>
                <p className="mt-2 text-sm text-gray-500">
                  {isAdmin ? 'Crea una carpeta o un archivo para comenzar a organizar la mediateca.' : 'No hay contenido disponible en esta ubicación.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {mediatecaVisibleItems.map((item) => {
                  const { Icon, badge, surfaceClassName, actionLabel } = getMediatecaItemMeta(item)
                  const isFolder = item.tipo === 'carpeta'

                  return (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                      <button
                        type="button"
                        onClick={() => {
                          if (isFolder) {
                            setMediatecaCurrentFolderId(item.id)
                          } else {
                            const rawTarget = item.archivo || item.url
                            if (!rawTarget) return
                            const isPdf = /\.pdf(\?.*)?$/i.test(rawTarget) || item.tipo === 'documento'
                            if (isPdf) {
                              setPdfModalItem(item)
                            } else {
                              window.open(normalizeMediaUrl(rawTarget), '_blank', 'noopener,noreferrer')
                            }
                          }
                        }}
                        className="w-full text-left"
                      >
                        <div className={`h-40 px-5 py-4 flex items-end ${surfaceClassName}`}>
                          <div className="flex items-center justify-between w-full">
                            <Icon size={48} strokeWidth={1.75} />
                            <span className="px-2 py-1 rounded-full bg-white/80 text-[11px] font-semibold text-gray-700">
                              {badge}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 line-clamp-2">{item.titulo}</p>
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.descripcion || (isFolder ? 'Carpeta de contenido' : 'Archivo de apoyo del curso')}</p>
                            </div>
                            {isAdmin && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openMediatecaModal(item.tipo === 'carpeta' ? 'carpeta' : 'archivo', item)
                                  }}
                                  className="text-blue-500 hover:text-blue-700 transition p-1"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEliminarMediateca(item.id)
                                  }}
                                  className="text-red-600 hover:text-red-700 transition p-1"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-500 justify-start">
                            <span>{isFolder ? `${item.children_count || 0} elementos` : badge}</span>
                          </div>

                          <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-700">
                            {isFolder ? <Folder size={16} /> : <Link2 size={16} />}
                            {actionLabel}
                          </div>
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
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
                                <p className="text-xs text-gray-600">{formatDuration(leccion.duracion_min)}</p>
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
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-gray-800">Recursos de Mediateca</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setMediatecaCurrentFolderId(null)
                      openMediatecaModal('carpeta')
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition"
                  >
                    <Folder size={16} />
                    Nueva Carpeta
                  </button>
                  <button
                    onClick={() => {
                      setMediatecaCurrentFolderId(null)
                      openMediatecaModal('archivo')
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                  >
                    <Plus size={16} />
                    Nuevo Recurso
                  </button>
                </div>
              </div>

              {mediateca.length === 0 ? (
                <p className="text-sm text-gray-600">No hay recursos en la mediateca.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sortMediatecaItems(mediateca).map((item) => (
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
                      <p className="text-xs text-gray-600">
                        {item.tipo} • {item.parent_titulo ? `Dentro de ${item.parent_titulo}` : 'Raíz'}
                      </p>
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Duración (HH:MM:SS)</label>
              <input
                type="time"
                step="1"
                value={leccionForm.duracion_min}
                onChange={(e) => setLeccionForm({ ...leccionForm, duracion_min: e.target.value || '00:00:00' })}
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

      {/* Modal: Visor PDF */}
      {pdfModalItem && (() => {
        const pdfSrc = normalizeMediaUrl(pdfModalItem.archivo || pdfModalItem.url)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ height: '90vh' }}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={18} className="text-gray-500 shrink-0" />
                  <span className="font-semibold text-gray-800 truncate">{pdfModalItem.titulo}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={pdfSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 transition"
                  >
                    <Link2 size={14} />
                    Abrir en pestaña
                  </a>
                  <button
                    onClick={() => setPdfModalItem(null)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <iframe
                src={pdfSrc}
                className="flex-1 w-full border-0 rounded-b-2xl"
                title={pdfModalItem.titulo}
              />
            </div>
          </div>
        )
      })()}

      {simuladorModal && (
        <InstruccionesModal
          simulador={simuladorModal}
          onClose={() => setSimuladorModal(null)}
          onComenzar={() => handleIniciarSimulador(simuladorModal)}
        />
      )}

      {/* Modal: Nuevo / Editar Recurso */}
      {mediatecaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">
                {mediatecaEdit
                  ? `Editar ${mediatecaCreateMode === 'carpeta' ? 'Carpeta' : 'Archivo'}`
                  : mediatecaCreateMode === 'carpeta'
                    ? 'Nueva Carpeta de Mediateca'
                    : 'Nuevo Archivo de Mediateca'}
              </h3>
              <button
                onClick={() => {
                  setMediatecaModalOpen(false)
                  setMediatecaEdit(null)
                  setMediatecaFile(null)
                  setMediatecaForm(initialMediatecaForm)
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGuardarMediateca} className="px-6 py-5 space-y-4">
              {!mediatecaEdit && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
                  Se guardará en: {mediatecaBreadcrumbs.length > 0 ? mediatecaBreadcrumbs.map((item) => item.titulo).join(' / ') : 'Raíz de la mediateca'}
                </div>
              )}

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

              {mediatecaCreateMode !== 'carpeta' && (
                <>
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

                  {/* Upload mode toggle */}
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
                    <button
                      type="button"
                      onClick={() => { setMediatecaUploadMode('url'); setMediatecaFile(null) }}
                      className={`flex-1 py-2 font-medium transition ${mediatecaUploadMode === 'url' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      Usar URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediatecaUploadMode('file')}
                      className={`flex-1 py-2 font-medium transition flex items-center justify-center gap-2 ${mediatecaUploadMode === 'file' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Upload size={14} />
                      Subir archivo
                    </button>
                  </div>

                  {mediatecaUploadMode === 'url' ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={mediatecaForm.url}
                        onChange={(e) => setMediatecaForm({ ...mediatecaForm, url: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      {mediatecaEdit?.url && (
                        <p className="mt-1 text-xs text-gray-400 truncate">Actual: {mediatecaEdit.url}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Archivo</label>
                      <label className="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-xl px-4 py-6 text-sm text-gray-500 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                        <Upload size={24} className="text-gray-400" />
                        {mediatecaFile ? (
                          <span className="font-medium text-blue-700">{mediatecaFile.name}</span>
                        ) : mediatecaEdit?.archivo ? (
                          <span>Archivo actual subido · haz clic para reemplazar</span>
                        ) : (
                          <span>Haz clic para seleccionar un archivo</span>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => setMediatecaFile(e.target.files[0] || null)}
                        />
                      </label>
                    </div>
                  )}
                </>
              )}

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
                  onClick={() => {
                    setMediatecaModalOpen(false)
                    setMediatecaEdit(null)
                    setMediatecaFile(null)
                    setMediatecaForm(initialMediatecaForm)
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
                >
                  {mediatecaEdit
                    ? 'Guardar cambios'
                    : mediatecaCreateMode === 'carpeta'
                      ? 'Crear Carpeta'
                      : 'Crear Archivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {studentModalOpen && isAdmin && (
        <StudentEnrollmentModal
          title="Matricular estudiante en este curso"
          subtitle={`Puedes crear uno nuevo o usar uno existente para matricularlo en ${curso.titulo}.`}
          submitLabel="Guardar matricula"
          loading={submittingStudent}
          error={studentEnrollmentError}
          enrollmentType="curso"
          onSubmit={handleCreateStudentAndEnroll}
          onClose={() => {
            if (submittingStudent) return
            setStudentModalOpen(false)
            setStudentEnrollmentError('')
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
    </Layout>
  )
}
