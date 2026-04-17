import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { updateMyProfile } from '../api/users'
import { notificationsApi } from '../api/notifications'
import Layout from '../components/Layout'
import { User, Save, Key, Shield, Lock, Computer, Bell, Check, CheckCheck, BellOff, Ticket, RefreshCw, Eye, Map, BookOpen, Calendar, BadgeCheck, AlertTriangle, Info, Server, X } from 'lucide-react'
import { cursosApi } from '../api/cursos'
import { showError, showSuccess } from '../utils/toast'

export default function Configuracion() {
  const { user, updateUser: updateAuthUser } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    paternal_surname: '',
    maternal_surname: '',
    email: '',
    phone_number: '',
    university: '',
    country: '',
    ci: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [imagenPreview, setImagenPreview] = useState(null)
  const [imagenArchivo, setImagenArchivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('perfil')
  const fileRef = useRef(null)

  // â€” Notificaciones â€”
  const [notifications, setNotifications] = useState([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifFilter, setNotifFilter] = useState('all') // 'all' | 'unread' | 'read'
  const [markingAll, setMarkingAll] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState(null)

  // â€” MatrÃ­culas â€”
  const [matriculasRuta, setMatriculasRuta] = useState([])
  const [matriculasCurso, setMatriculasCurso] = useState([])
  const [matriculasLoading, setMatriculasLoading] = useState(false)
  const [matriculasSubTab, setMatriculasSubTab] = useState('ruta')

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        paternal_surname: user.paternal_surname || '',
        maternal_surname: user.maternal_surname || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        university: user.university || '',
        country: user.country || '',
        ci: user.ci || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
      setImagenPreview(user.profile_picture || null)
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      numberOrSymbol: /[0-9!@#$%^&*(),.?":{}|<>]/.test(password)
    }
    return requirements
  }

  const passwordRequirements = validatePassword(formData.new_password)
  const passwordsMatch = formData.new_password === formData.confirm_password && formData.new_password !== ''

  const handleImagen = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validar tamaño del archivo (2 MB = 2 * 1024 * 1024 bytes)
      const maxSize = 2 * 1024 * 1024
      if (file.size > maxSize) {
        showError('El archivo es demasiado grande. El tamaño maximo es 2 MB.')
        e.target.value = '' // Limpiar el input
        return
      }
      
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        showError('Formato de archivo no valido. Solo se permiten JPG, PNG y WebP.')
        e.target.value = '' // Limpiar el input
        return
      }
      
      setImagenArchivo(file)
      setImagenPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmitPerfil = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formDataToSend = new FormData()

      const appendIfNotEmpty = (key, value) => {
        if (typeof value === 'string') {
          const trimmed = value.trim()
          if (trimmed !== '') formDataToSend.append(key, trimmed)
          return
        }
        if (value !== undefined && value !== null) {
          formDataToSend.append(key, value)
        }
      }

      appendIfNotEmpty('name', formData.name)
      appendIfNotEmpty('paternal_surname', formData.paternal_surname)
      appendIfNotEmpty('maternal_surname', formData.maternal_surname)
      appendIfNotEmpty('phone_number', formData.phone_number)
      appendIfNotEmpty('university', formData.university)
      appendIfNotEmpty('country', formData.country)
      
      if (imagenArchivo) {
        formDataToSend.append('profile_picture', imagenArchivo)
      }

      await updateMyProfile(formDataToSend)
      
      // Actualizar el contexto de autenticación
      const updatedUser = { ...user, ...formData }
      if (imagenArchivo) {
        updatedUser.profile_picture = URL.createObjectURL(imagenArchivo)
      }
      updateAuthUser(updatedUser)
      
      showSuccess('Perfil actualizado correctamente.')
    } catch (error) {
      const serverError = error?.response?.data
      console.error('Error al actualizar perfil:', serverError || error)

      if (serverError && typeof serverError === 'object') {
        const firstKey = Object.keys(serverError)[0]
        const firstMessage = Array.isArray(serverError[firstKey])
          ? serverError[firstKey][0]
          : serverError[firstKey]
        showError(firstMessage || 'Error al actualizar el perfil.')
      } else {
        showError('Error al actualizar el perfil.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ――― Lógica de notificaciones ―――
  const formatRelativeDate = (value) => {
    if (!value) return ''
    const date = new Date(value)
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60) return 'Hace unos segundos'
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
    return `Hace ${Math.floor(diff / 86400)} d`
  }

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true)
    try {
      const data = await notificationsApi.getNotifications()
      setNotifications(Array.isArray(data) ? data : [])
    } catch {
      setNotifications([])
    } finally {
      setNotifLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'notificaciones') {
      loadNotifications()
    }
  }, [activeTab, loadNotifications])

  const loadMatriculas = useCallback(async () => {
    setMatriculasLoading(true)
    try {
      const [ruta, curso] = await Promise.all([
        cursosApi.getMatriculasRuta(),
        cursosApi.getMatriculasCurso(),
      ])
      setMatriculasRuta(Array.isArray(ruta) ? ruta : [])
      setMatriculasCurso(Array.isArray(curso) ? curso : [])
    } catch {
      setMatriculasRuta([])
      setMatriculasCurso([])
    } finally {
      setMatriculasLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'mis_matriculas') {
      loadMatriculas()
    }
  }, [activeTab, loadMatriculas])

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
    } catch {
      return
    }
  }

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true)
    try {
      await notificationsApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch {
      return
    } finally {
      setMarkingAll(false)
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (notifFilter === 'unread') return !n.is_read
    if (notifFilter === 'read') return n.is_read
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  const notifTypeLabel = (type) => {
    if (type === 'ticket_created') return 'Ticket creado'
    if (type === 'ticket_status_changed') return 'Estado actualizado'
    if (type === 'manual') return 'Comunicado'
    if (type === 'enrollment_expiry') return 'Matricula por vencer'
    if (type === 'installment_due') return 'Cuota por vencer'
    return 'Notificación'
  }

  const notifTypeColor = (type) => {
    if (type === 'ticket_created') return 'bg-blue-100 text-blue-600'
    if (type === 'ticket_status_changed') return 'bg-green-100 text-green-600'
    if (type === 'manual') return 'bg-indigo-100 text-indigo-700'
    if (type === 'enrollment_expiry') return 'bg-amber-100 text-amber-700'
    if (type === 'installment_due') return 'bg-rose-100 text-rose-700'
    return 'bg-gray-100 text-gray-500'
  }

  const visualStatusLabel = (notification) => {
    if (notification.status_tag_label) return notification.status_tag_label

    const fallback = {
      system: 'Sistema',
      alert: 'Alerta',
      info: 'Informativa',
    }

    if (notification.status_tag && fallback[notification.status_tag]) {
      return fallback[notification.status_tag]
    }

    if (['enrollment_expiry', 'installment_due'].includes(notification.notification_type)) {
      return 'Alerta'
    }

    return 'Sistema'
  }

  const visualStatusBadge = (notification) => {
    const key = notification.status_tag || (['enrollment_expiry', 'installment_due'].includes(notification.notification_type) ? 'alert' : 'system')
    const styles = {
      system: 'bg-slate-100 text-slate-700',
      alert: 'bg-rose-100 text-rose-700',
      info: 'bg-blue-100 text-blue-700',
    }
    return styles[key] || styles.system
  }

  const visualStatusIcon = (notification) => {
    const key = notification.status_tag || (['enrollment_expiry', 'installment_due'].includes(notification.notification_type) ? 'alert' : 'system')

    if (key === 'alert') return <AlertTriangle size={13} />
    if (key === 'info') return <Info size={13} />
    return <Server size={13} />
  }

  const priorityBadge = (priority) => {
    const styles = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    }
    return styles[priority] || 'bg-gray-100 text-gray-500'
  }

  const statusBadge = (status) => {
    const styles = {
      open: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      resolved: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-600',
    }
    return styles[status] || 'bg-gray-100 text-gray-500'
  }

  const handleViewTicketDetail = (notification) => {
    if (!notification.ticket_id) return
    navigate(`/tickets?ticketId=${notification.ticket_id}`)
  }

  const handleOpenNotificationDetail = (notification) => {
    setSelectedNotification(notification)
  }

  

  const handleSubmitPassword = async (e) => {
    e.preventDefault()
    
    if (formData.new_password !== formData.confirm_password) {
      showError('Las contrasenas nuevas no coinciden.')
      return
    }

    setLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('password', formData.new_password)

      await updateUser(user.id, formDataToSend)
      
      showSuccess('Contrasena actualizada correctamente.')
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }))
    } catch (error) {
      console.error('Error al actualizar contraseña:', error)
      showError('Error al actualizar la contrasena.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Configuración de Cuenta</h1>
          <p className="text-sm text-gray-400">Gestiona tu perfil y preferencias</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('perfil')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'perfil'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User size={16} />
                  Perfil
                </div>
              </button>
              <button
                onClick={() => setActiveTab('seguridad')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'seguridad'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield size={16} />
                  Seguridad
                </div>
              </button>
              <button
                onClick={() => setActiveTab('mis_matriculas')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'mis_matriculas'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User size={16} />
                  Mis Matrículas
                </div>
              </button>
              <button
                onClick={() => setActiveTab('notificaciones')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'notificaciones'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bell size={16} />
                  Notificaciones
                </div>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'perfil' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Card de Perfil - Izquierda */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                    
                    {/* Sección Superior: Info del perfil */}
                    <div className="p-6 border-b border-gray-200">
                      <div className="text-center">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200 mx-auto mb-4">
                          {imagenPreview ? (
                            <img src={imagenPreview} alt="perfil" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400 text-4xl font-bold flex items-center justify-center h-full">
                              {formData.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        
                        {/* Nombre completo */}
                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                          {formData.name && formData.paternal_surname && formData.maternal_surname
                            ? `${formData.name} ${formData.paternal_surname} ${formData.maternal_surname}`
                            : formData.name && formData.paternal_surname
                            ? `${formData.name} ${formData.paternal_surname}`
                            : formData.name || 'Usuario'}
                        </h3>
                        
                        {/* Email */}
                        <p className="text-gray-500">{formData.email}</p>
                      </div>
                    </div>

                    {/* Sección Inferior: Cambiar foto */}
                    <div className="p-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4">Cambiar foto de perfil</h4>
                      
                      <div className="space-y-4">
                        {/* Input para seleccionar imagen */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar imagen</label>
                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImagen}
                            className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 file:cursor-pointer"
                          />
                        </div>

                        {/* Vista previa de la imagen seleccionada */}
                        {imagenArchivo && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Vista previa</label>
                            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 mx-auto">
                              <img 
                                src={URL.createObjectURL(imagenArchivo)} 
                                alt="vista previa" 
                                className="w-full h-full object-cover" 
                              />
                            </div>
                          </div>
                        )}

                        {/* Botón para subir foto */}
                        <button
                          onClick={handleSubmitPerfil}
                          disabled={loading || !imagenArchivo}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          {loading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Save size={16} />
                              Subir foto
                            </>
                          )}
                        </button>

                        {/* Recomendaciones */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs text-blue-800 font-medium mb-2">Recomendaciones:</p>
                          <ul className="text-xs text-blue-700 space-y-1">
                            <li>• Formatos: JPG, PNG, WebP</li>
                            <li>• Tamaño mínimo: 200x200 píxeles</li>
                            <li>• Peso máximo: 2 MB</li>
                            <li>• Imagen cuadrada para mejor resultado</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card de Información Personal - Derecha */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="border-b border-gray-200 px-6 py-4 bg-white">
                      <h2 className="text-lg font-bold text-gray-800">Información Personal</h2>
                    </div>
                    
                    <form onSubmit={handleSubmitPerfil} className="p-6 space-y-6">
                      
                      {/* Sección 1: Información Básica */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                          <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                          Información Básica
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <input
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido Paterno</label>
                            <input
                              name="paternal_surname"
                              value={formData.paternal_surname}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido Materno</label>
                            <input
                              name="maternal_surname"
                              value={formData.maternal_surname}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Carnet de Identidad</label>
                            <input
                              name="ci"
                              value={formData.ci}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                              placeholder="Ej: 12345678"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sección 2: Información de Contacto */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                          <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                          Información de Contacto
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                            <input
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              type="email"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm"
                              disabled
                            />
                            <p className="text-xs text-gray-400 mt-1">El email no se puede modificar</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                            <input
                              name="phone_number"
                              value={formData.phone_number}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                              placeholder="Ej: +591 12345678"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Universidad</label>
                            <input
                              name="university"
                              value={formData.university}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                              placeholder="Ej: Universidad Mayor de San Andrés"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                            <input
                              name="country"
                              value={formData.country}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                              placeholder="Ej: Bolivia"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                        >
                          <Save size={16} />
                          {loading ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mis_matriculas' && (
              <div className="space-y-4">
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <div>
                                  <h2 className="text-base font-bold text-gray-800">Mis Matrículas</h2>
                                  <p className="text-sm text-gray-400">
                                    Total: {matriculasRuta.length + matriculasCurso.length} matrícula{matriculasRuta.length + matriculasCurso.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <button
                                  onClick={loadMatriculas}
                                  disabled={matriculasLoading}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
                                >
                                  <RefreshCw size={13} className={matriculasLoading ? 'animate-spin' : ''} />
                                  Actualizar
                                </button>
                              </div>

                              {/* Sub-tabs */}
                              <div className="flex border-b border-gray-200">
                                <button
                                  onClick={() => setMatriculasSubTab('ruta')}
                                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                                    matriculasSubTab === 'ruta'
                                      ? 'border-blue-500 text-blue-600'
                                      : 'border-transparent text-gray-500 hover:text-gray-700'
                                  }`}
                                >
                                  <Map size={14} />
                                  Matrículas por Ruta
                                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{matriculasRuta.length}</span>
                                </button>
                                <button
                                  onClick={() => setMatriculasSubTab('curso')}
                                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                                    matriculasSubTab === 'curso'
                                      ? 'border-blue-500 text-blue-600'
                                      : 'border-transparent text-gray-500 hover:text-gray-700'
                                  }`}
                                >
                                  <BookOpen size={14} />
                                  Matrículas por Curso
                                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{matriculasCurso.length}</span>
                                </button>
                              </div>

                              {matriculasLoading ? (
                                <div className="flex items-center justify-center py-12">
                                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                              ) : matriculasSubTab === 'ruta' ? (
                                matriculasRuta.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <Map size={36} className="mb-3 opacity-40" />
                                    <p className="text-sm">No tienes matrículas en ninguna ruta</p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {matriculasRuta.map((m) => (
                                      <div key={m.id} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3 hover:shadow-md transition">
                                        <div className="flex items-start gap-3">
                                          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                                            <Map size={16} className="text-violet-600" />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 leading-snug">{m.ruta_titulo || '—'}</p>
                                            {m.codigo_acceso && (
                                              <p className="text-xs text-gray-400 font-mono mt-0.5">{m.codigo_acceso}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                            <BadgeCheck size={11} />
                                            {m.activa ? 'Activa' : 'Inactiva'}
                                          </span>
                                        </div>
                                        <div className="space-y-1.5 text-xs text-gray-500">
                                          {m.fecha_inicio && (
                                            <div className="flex items-center gap-1.5">
                                              <Calendar size={12} className="text-gray-400" />
                                              <span>Inicio: <span className="font-medium text-gray-700">{new Date(m.fecha_inicio).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
                                            </div>
                                          )}
                                          {m.fecha_fin && (
                                            <div className="flex items-center gap-1.5">
                                              <Calendar size={12} className="text-gray-400" />
                                              <span>Fin: <span className="font-medium text-gray-700">{new Date(m.fecha_fin).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )
                              ) : (
                                matriculasCurso.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <BookOpen size={36} className="mb-3 opacity-40" />
                                    <p className="text-sm">No tienes matrículas en ningún curso</p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {matriculasCurso.map((m) => (
                                      <div key={m.id} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3 hover:shadow-md transition">
                                        <div className="flex items-start gap-3">
                                          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                            <BookOpen size={16} className="text-blue-600" />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 leading-snug">{m.curso_titulo || '—'}</p>
                                            {m.ruta_titulo && (
                                              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                <Map size={10} /> {m.ruta_titulo}
                                              </p>
                                            )}
                                            {m.codigo_acceso && (
                                              <p className="text-xs text-gray-400 font-mono mt-0.5">{m.codigo_acceso}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                            <BadgeCheck size={11} />
                                            {m.activa ? 'Activa' : 'Inactiva'}
                                          </span>
                                        </div>
                                        <div className="space-y-1.5 text-xs text-gray-500">
                                          {m.fecha_inicio && (
                                            <div className="flex items-center gap-1.5">
                                              <Calendar size={12} className="text-gray-400" />
                                              <span>Inicio: <span className="font-medium text-gray-700">{new Date(m.fecha_inicio).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
                                            </div>
                                          )}
                                          {m.fecha_fin && (
                                            <div className="flex items-center gap-1.5">
                                              <Calendar size={12} className="text-gray-400" />
                                              <span>Fin: <span className="font-medium text-gray-700">{new Date(m.fecha_fin).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )
                              )}
              </div>
            )}

            {activeTab === 'notificaciones' && (
              <div className="space-y-4">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-800">Centro de notificaciones</h2>
                    <p className="text-sm text-gray-400">
                      {notifications.length} en total
                      {unreadCount > 0 && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                          {unreadCount} sin leer
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadNotifications}
                      disabled={notifLoading}
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
                      title="Recargar"
                    >
                      <RefreshCw size={15} className={notifLoading ? 'animate-spin' : ''} />
                    </button>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        disabled={markingAll}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                      >
                        <CheckCheck size={15} />
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtros */}
                <div className="flex gap-2">
                  {[
                    { key: 'all',    label: 'Todas',     count: notifications.length },
                    { key: 'unread', label: 'No leídas', count: unreadCount },
                    { key: 'read',   label: 'Leídas',    count: notifications.length - unreadCount },
                  ].map(({ key, label, count }) => (
                    <button
                      key={key}
                      onClick={() => setNotifFilter(key)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition flex items-center gap-1.5 ${
                        notifFilter === key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                        notifFilter === key ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {notifLoading && notifications.length === 0 ? (
                    <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                      <span className="text-sm">Cargando notificaciones...</span>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                      <BellOff size={36} className="text-gray-300" />
                      <p className="text-sm font-medium">
                        {notifFilter === 'unread' ? 'No tienes notificaciones sin leer' :
                         notifFilter === 'read'   ? 'No tienes notificaciones leídas'   :
                         'No tienes notificaciones'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-5 py-3 font-semibold text-gray-600 w-[40%]">Título</th>
                            <th className="text-left px-5 py-3 font-semibold text-gray-600">Prioridad</th>
                            <th className="text-left px-5 py-3 font-semibold text-gray-600">Fecha</th>
                            <th className="text-left px-5 py-3 font-semibold text-gray-600">Estado</th>
                            <th className="text-center px-5 py-3 font-semibold text-gray-600">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredNotifications.map(notification => (
                            <tr
                              key={notification.id}
                              className={`transition hover:bg-gray-50 ${!notification.is_read ? 'bg-blue-50/30' : 'bg-white'}`}
                            >
                              {/* TÃ­tulo */}
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notifTypeColor(notification.notification_type)}`}>
                                    {notification.notification_type === 'ticket_created'
                                      ? <Ticket size={14} />
                                      : <Bell size={14} />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className={`truncate ${notification.is_read ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                                      {notification.title}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate mt-0.5">{notification.message}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Prioridad (tipo de notificaciÃ³n) */}
                              <td className="px-5 py-3.5">
                                {notification.ticket_priority ? (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${priorityBadge(notification.ticket_priority)}`}>
                                    {notification.ticket_priority_label || notification.ticket_priority}
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${notifTypeColor(notification.notification_type)}`}>
                                    {notification.notification_type_label || notifTypeLabel(notification.notification_type)}
                                  </span>
                                )}
                              </td>

                              {/* Fecha */}
                              <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                                <span title={notification.created_at ? new Date(notification.created_at).toLocaleString('es-BO') : ''}>
                                  {formatRelativeDate(notification.created_at)}
                                </span>
                              </td>

                              {/* Estado */}
                              <td className="px-5 py-3.5">
                                {notification.ticket_status ? (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(notification.ticket_status)}`}>
                                    {notification.ticket_status_label || notification.ticket_status}
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${visualStatusBadge(notification)}`}>
                                    {visualStatusIcon(notification)}
                                    {visualStatusLabel(notification)}
                                  </span>
                                )}
                              </td>

                              {/* Acciones */}
                              <td className="px-5 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    disabled={notification.is_read}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Marcar como leída"
                                  >
                                    <Check size={13} />
                                    Marcar como leída
                                  </button>
                                  <button
                                    onClick={() => handleOpenNotificationDetail(notification)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                                    title="Ver detalle de notificacion"
                                  >
                                    <Eye size={13} />
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

                {selectedNotification && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
                      <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
                        <div>
                          <h3 className="text-base font-semibold text-gray-800">Detalle de notificacion</h3>
                          <p className="mt-1 text-xs text-gray-500">
                            {selectedNotification.created_at ? new Date(selectedNotification.created_at).toLocaleString('es-BO') : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedNotification(null)}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="space-y-4 px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{selectedNotification.title}</p>
                          <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{selectedNotification.message}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${notifTypeColor(selectedNotification.notification_type)}`}>
                            {selectedNotification.notification_type_label || notifTypeLabel(selectedNotification.notification_type)}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${visualStatusBadge(selectedNotification)}`}>
                            {visualStatusIcon(selectedNotification)}
                            {visualStatusLabel(selectedNotification)}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${selectedNotification.is_read ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {selectedNotification.is_read ? 'Leida' : 'No leida'}
                          </span>
                        </div>

                        {selectedNotification.ticket_id && (
                          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                            <p className="text-xs font-semibold text-gray-600">Ticket relacionado</p>
                            <p className="text-sm text-gray-700">#{selectedNotification.ticket_id}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedNotification(null)
                                handleViewTicketDetail(selectedNotification)
                              }}
                              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-900"
                            >
                              <Eye size={13} />
                              Ir al ticket
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'seguridad' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Card Izquierda: Formulario de contraseÃ±a */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="border-b border-gray-200 px-6 py-4 bg-white">
                      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Key size={18} />
                        Cambiar Contraseña
                      </h2>
                    </div>
                    
                    <form onSubmit={handleSubmitPassword} className="p-6">
                      <div className="space-y-6">
                        {/* Contraseña Actual */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Actual</label>
                          <input
                            name="current_password"
                            value={formData.current_password}
                            onChange={handleChange}
                            type="password"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                            required
                            placeholder="Ingresa tu contraseña actual"
                          />
                        </div>

                        {/* Nueva Contraseña y Confirmación */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                            <input
                              name="new_password"
                              value={formData.new_password}
                              onChange={handleChange}
                              type="password"
                              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm bg-white ${
                                formData.new_password && !passwordRequirements.length 
                                  ? 'border-red-300 focus:ring-red-400' 
                                  : 'border-gray-200 focus:ring-blue-400'
                              }`}
                              required
                              placeholder="Nueva contraseña"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                            <input
                              name="confirm_password"
                              value={formData.confirm_password}
                              onChange={handleChange}
                              type="password"
                              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm bg-white ${
                                formData.confirm_password && !passwordsMatch 
                                  ? 'border-red-300 focus:ring-red-400' 
                                  : 'border-gray-200 focus:ring-blue-400'
                              }`}
                              required
                              placeholder="Confirma nueva contraseña"
                            />
                          </div>
                        </div>

                        {/* Botón de actualización */}
                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                          <button
                            type="submit"
                            disabled={loading || !passwordsMatch || !passwordRequirements.length || !passwordRequirements.lowercase || !passwordRequirements.numberOrSymbol}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                          >
                            {loading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Actualizando...
                              </>
                            ) : (
                              <>
                                <Key size={16} />
                                Actualizar contraseña
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Card Derecha: Requisitos de contraseña */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="border-b border-gray-200 px-6 py-4 bg-white">
                      <h2 className="text-lg font-bold text-gray-800">Requisitos de Contraseña</h2>
                    </div>
                    
                    <div className="p-6">
                      <div className="space-y-3">
                        {/* Longitud mínima */}
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            passwordRequirements.length ? 'bg-green-100' : 'bg-gray-200'
                          }`}>
                            {passwordRequirements.length ? (
                              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            )}
                          </div>
                          <span className={`text-sm ${passwordRequirements.length ? 'text-gray-700' : 'text-gray-500'}`}>
                            Mínimo 8 caracteres
                          </span>
                        </div>

                        {/* Letra minúscula */}
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            passwordRequirements.lowercase ? 'bg-green-100' : 'bg-gray-200'
                          }`}>
                            {passwordRequirements.lowercase ? (
                              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            )}
                          </div>
                          <span className={`text-sm ${passwordRequirements.lowercase ? 'text-gray-700' : 'text-gray-500'}`}>
                            Al menos una letra minúscula
                          </span>
                        </div>

                        {/* Número o símbolo */}
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            passwordRequirements.numberOrSymbol ? 'bg-green-100' : 'bg-gray-200'
                          }`}>
                            {passwordRequirements.numberOrSymbol ? (
                              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            )}
                          </div>
                          <span className={`text-sm ${passwordRequirements.numberOrSymbol ? 'text-gray-700' : 'text-gray-500'}`}>
                            Al menos un número o símbolo
                          </span>
                        </div>

                        {/* Contraseñas coinciden */}
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            passwordsMatch ? 'bg-green-100' : 'bg-gray-200'
                          }`}>
                            {passwordsMatch ? (
                              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            )}
                          </div>
                          <span className={`text-sm ${passwordsMatch ? 'text-gray-700' : 'text-gray-500'}`}>
                            Las contraseñas coinciden
                          </span>
                        </div>
                      </div>

                      {/* Mensaje de estado */}
                      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                          {formData.new_password === '' 
                            ? 'Comienza a escribir tu nueva contraseña para ver los requisitos.'
                            : passwordsMatch && passwordRequirements.length && passwordRequirements.lowercase && passwordRequirements.numberOrSymbol
                            ? '¡Todos los requisitos cumplidos! Puedes actualizar tu contraseña.'
                            : 'Completa todos los requisitos para poder actualizar tu contraseña.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
