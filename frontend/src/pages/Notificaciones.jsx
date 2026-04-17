import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, Megaphone, RefreshCw, Search, Send, Users, UserRound, Shield, X } from 'lucide-react'
import Layout from '../components/Layout'
import { notificationsApi } from '../api/notifications'
import { getUsers } from '../api/users'
import { getRoles } from '../api/roles'
import { usePermissions } from '../hooks/usePermissions'
import { showError, showSuccess } from '../utils/toast'

const TARGET_MODE = {
  USER: 'user',
  ROLES: 'roles',
  ALL_STUDENTS: 'all_students',
}

export default function Notificaciones() {
  const { canCreate, isAdmin } = usePermissions()
  const canSend = isAdmin() || canCreate('notifications')

  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])

  const [form, setForm] = useState({
    target_mode: TARGET_MODE.USER,
    user_id: '',
    role_ids: [],
    status_tag: 'system',
    title: '',
    message: '',
  })
  const [userSearch, setUserSearch] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [notificationsData, usersResponse, rolesResponse] = await Promise.all([
        notificationsApi.getNotifications(),
        getUsers(),
        getRoles(),
      ])

      setNotifications(Array.isArray(notificationsData) ? notificationsData : [])
      setUsers(Array.isArray(usersResponse?.data) ? usersResponse.data : [])
      setRoles(Array.isArray(rolesResponse?.data) ? rolesResponse.data : [])
    } catch {
      setNotifications([])
      setUsers([])
      setRoles([])
      showError('No se pudieron cargar las notificaciones.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const students = useMemo(() => {
    return users.filter((user) => (user?.role?.name || '').toLowerCase() === 'estudiante')
  }, [users])

  const selectedStudent = useMemo(() => {
    if (!form.user_id) return null
    return students.find((student) => student.id === Number(form.user_id)) || null
  }, [form.user_id, students])

  const filteredStudents = useMemo(() => {
    const query = userSearch.trim().toLowerCase()
    if (!query) return []

    return students
      .filter((student) => {
        const fullName = `${student.name || ''} ${student.paternal_surname || ''} ${student.maternal_surname || ''}`.toLowerCase()
        return (
          fullName.includes(query)
          || (student.email || '').toLowerCase().includes(query)
          || (student.ci || '').toLowerCase().includes(query)
          || (student.phone_number || '').toLowerCase().includes(query)
        )
      })
      .slice(0, 8)
  }, [students, userSearch])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleRoleToggle = (roleId) => {
    const numericId = Number(roleId)
    setForm((prev) => {
      const current = new Set(prev.role_ids)
      if (current.has(numericId)) {
        current.delete(numericId)
      } else {
        current.add(numericId)
      }
      return { ...prev, role_ids: Array.from(current) }
    })
  }

  const handleSendNotification = async (event) => {
    event.preventDefault()
    if (!canSend) {
      showError('No tienes permisos para enviar notificaciones.')
      return
    }

    if (!form.title.trim() || !form.message.trim()) {
      showError('Debes completar titulo y mensaje.')
      return
    }

    const payload = {
      target_mode: form.target_mode,
      status_tag: form.status_tag,
      title: form.title.trim(),
      message: form.message.trim(),
    }

    if (form.target_mode === TARGET_MODE.USER) {
      if (!form.user_id) {
        showError('Selecciona un estudiante.')
        return
      }
      payload.user_id = Number(form.user_id)
    }

    if (form.target_mode === TARGET_MODE.ROLES) {
      if (form.role_ids.length === 0) {
        showError('Selecciona al menos un rol.')
        return
      }
      payload.role_ids = form.role_ids
    }

    try {
      const response = await notificationsApi.sendNotification(payload)
      showSuccess(`Notificaciones enviadas: ${response?.sent_count || 0}`)
      setForm((prev) => ({ ...prev, title: '', message: '', user_id: '' }))
      setUserSearch('')
      loadData()
    } catch (error) {
      const detail = error?.response?.data?.detail
      showError(detail || 'No se pudo enviar la notificacion.')
    }
  }

  const runAutomaticProcess = async () => {
    if (!canSend) {
      showError('No tienes permisos para ejecutar este proceso.')
      return
    }

    try {
      const response = await notificationsApi.processAutomatic({
        enrollment_days_before: 7,
        installment_days_before: 3,
      })
      showSuccess(
        `Proceso ejecutado. Matriculas: ${response?.enrollment_notifications_created || 0}, cuotas: ${response?.installment_notifications_created || 0}`,
      )
      loadData()
    } catch {
      showError('No se pudo ejecutar el proceso automatico.')
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Modulo de Notificaciones</h1>
            <p className="text-sm text-gray-500">Envia mensajes manuales y ejecuta alertas automaticas de matriculas y cuotas.</p>
          </div>
          <button
            type="button"
            onClick={runAutomaticProcess}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            disabled={loading || !canSend}
          >
            <RefreshCw size={16} />
            Ejecutar alertas automaticas
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Megaphone size={18} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">Enviar Notificacion</h2>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Destino</label>
                <select
                  name="target_mode"
                  value={form.target_mode}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value={TARGET_MODE.USER}>Un estudiante especifico</option>
                  <option value={TARGET_MODE.ALL_STUDENTS}>Todos los estudiantes</option>
                  <option value={TARGET_MODE.ROLES}>Por roles</option>
                </select>
              </div>

              {form.target_mode === TARGET_MODE.USER && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Estudiante</label>
                  {selectedStudent ? (
                    <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">
                          {`${selectedStudent.name || ''} ${selectedStudent.paternal_surname || ''} ${selectedStudent.maternal_surname || ''}`.trim()}
                        </p>
                        <p className="truncate text-xs text-gray-500">{selectedStudent.email || 'Sin email'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, user_id: '' }))
                          setUserSearch('')
                        }}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                      >
                        <X size={12} /> Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search size={14} className="pointer-events-none absolute left-3 top-3 text-gray-400" />
                      <input
                        type="search"
                        value={userSearch}
                        onChange={(event) => setUserSearch(event.target.value)}
                        placeholder="Buscar por nombre, CI, email o telefono"
                        className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
                        autoComplete="off"
                      />

                      {userSearch && (
                        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                          {filteredStudents.length > 0 ? (
                            filteredStudents.map((student) => (
                              <button
                                key={student.id}
                                type="button"
                                onClick={() => {
                                  setForm((prev) => ({ ...prev, user_id: String(student.id) }))
                                  setUserSearch('')
                                }}
                                className="w-full border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-blue-50"
                              >
                                <p className="text-sm font-medium text-gray-800">
                                  {`${student.name || ''} ${student.paternal_surname || ''} ${student.maternal_surname || ''}`.trim()}
                                </p>
                                <p className="text-xs text-gray-500">CI: {student.ci || '-'} | {student.email || '-'}</p>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">No se encontraron estudiantes</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {form.target_mode === TARGET_MODE.ROLES && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Roles</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {roles.map((role) => (
                      <label key={role.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.role_ids.includes(role.id)}
                          onChange={() => handleRoleToggle(role.id)}
                        />
                        <span>{role.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Estado visual</label>
                <select
                  name="status_tag"
                  value={form.status_tag}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="system">Sistema</option>
                  <option value="alert">Alerta</option>
                  <option value="info">Informativa</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Titulo</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Ej: Recordatorio importante"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Mensaje</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleFormChange}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Escribe el contenido de la notificacion"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={loading || !canSend}
              >
                <Send size={16} />
                Enviar notificacion
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Bell size={18} className="text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-800">Resumen</h2>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="inline-flex items-center gap-2"><Bell size={14} /> Total</span>
                <strong>{notifications.length}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="inline-flex items-center gap-2"><UserRound size={14} /> Sin leer</span>
                <strong>{unreadCount}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="inline-flex items-center gap-2"><Users size={14} /> Estudiantes</span>
                <strong>{students.length}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="inline-flex items-center gap-2"><Shield size={14} /> Roles</span>
                <strong>{roles.length}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  )
}
