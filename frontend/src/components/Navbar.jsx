import { useState, useRef, useEffect } from 'react'
import { Bell, LogOut, Settings, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { notificationsApi } from '../api/notifications'

export default function Navbar({ collapsed }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const dropdownRef = useRef(null)
  const notificationsRef = useRef(null)
  const fotoUrl = user?.profile_picture
    ? `http://localhost${user.profile_picture}`
    : null
  const unreadCount = notifications.filter((item) => !item.is_read).length

  const formatRelativeDate = (value) => {
    if (!value) return ''

    const date = new Date(value)
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)

    if (diff < 60) return 'Hace unos segundos'
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
    return `Hace ${Math.floor(diff / 86400)} d`
  }

  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.getNotifications()
      setNotifications(Array.isArray(data) ? data : [])
    } catch {
      setNotifications([])
    }
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await notificationsApi.markAsRead(notification.id)
        setNotifications((prev) =>
          prev.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item))
        )
      } catch {
        return
      }
    }

    if (notification.ticket_id) {
      navigate('/tickets')
      setNotificationsOpen(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })))
    } catch {
      return
    }
  }

  // Cierra el dropdown si se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }

      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    loadNotifications()

    const interval = setInterval(() => {
      loadNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <header className={`fixed top-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-6 transition-all duration-300 ${collapsed ? 'left-16' : 'left-64'}`}>

      {/* Título */}
      <h1 className="text-lg font-semibold text-gray-700">Panel de administración</h1>

      <div className="flex items-center gap-4">

        {/* Notificaciones */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-full hover:bg-gray-100 transition text-gray-500"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Notificaciones</p>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Marcar todas leidas
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    No tienes notificaciones
                  </div>
                )}

                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition ${notification.is_read ? 'bg-white' : 'bg-blue-50/40'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-700">{notification.title}</p>
                      {!notification.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
                    <p className="text-[11px] text-gray-400 mt-2">{formatRelativeDate(notification.created_at)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dropdown de usuario */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:bg-gray-100 px-3 py-1.5 rounded-xl transition"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
              {fotoUrl
                ? <img src={fotoUrl} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-sm font-bold text-gray-500">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
              }
            </div>
            {/* Nombre */}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-700 leading-tight">
                {user?.name && user?.paternal_surname && user?.maternal_surname
                  ? `${user.name} ${user.paternal_surname} ${user.maternal_surname}`
                  : user?.name && user?.paternal_surname
                  ? `${user.name} ${user.paternal_surname}`
                  : user?.name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-400 leading-tight">{user?.email || ''}</p>
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
              
              {/* Info del usuario */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                  {fotoUrl
                    ? <img src={fotoUrl} alt="avatar" className="w-full h-full object-cover" />
                    : <span className="text-base font-bold text-gray-500">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                  }
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {user?.name && user?.paternal_surname && user?.maternal_surname
                      ? `${user.name} ${user.paternal_surname} ${user.maternal_surname}`
                      : user?.name && user?.paternal_surname
                      ? `${user.name} ${user.paternal_surname}`
                      : user?.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
                </div>
              </div>


              {/* Ajustes */}
              <button
                onClick={() => { navigate('/configuracion'); setDropdownOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                <Settings size={17} className="text-gray-400" />
                Ajustes
              </button>

              {/* Cerrar sesión */}
              <button
                onClick={() => { logout(); setDropdownOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition"
              >
                <LogOut size={17} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}