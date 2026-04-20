import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { ticketsApi } from '../api/tickets'
import TicketModal from '../components/TicketModal'
import { usePermissions } from '../hooks/usePermissions'
import { getApiErrorMessage, showConfirm, showError, showSuccess } from '../utils/toast'
import { 
  Plus, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Search,
  Eye,
  Pencil,
  Trash2,
  Paperclip,
  X,
  Send,
} from 'lucide-react'

export default function Tickets() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { canCreate, canRead, canReadOwn, canUpdate, canUpdateOwn, canDelete, canDeleteOwn, hasPermission } = usePermissions()
  const [tickets, setTickets] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [ticketEdit, setTicketEdit] = useState(null)
  const [ticketDetail, setTicketDetail] = useState(null)
  const [updatingStatusTicketId, setUpdatingStatusTicketId] = useState(null)
  const [responses, setResponses] = useState([])
  const [loadingResponses, setLoadingResponses] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [responseAttachment, setResponseAttachment] = useState(null)
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [submittingResponse, setSubmittingResponse] = useState(false)
  const responsesEndRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  const isAdmin = user?.role?.name?.toLowerCase() === 'administrador'
  const canReadTicketAny = canRead('tickets')
  const canReadTicketOwn = canReadOwn('tickets')
  const canEditTicketAny = canUpdate('tickets')
  const canEditTicketOwn = canUpdateOwn('tickets')
  const canDeleteTicketAny = canDelete('tickets')
  const canDeleteTicketOwn = canDeleteOwn('tickets')

  const canCreateTicket = canCreate('tickets')
  const canChangeStatus = hasPermission('tickets', 'change_status') || canEditTicketAny
  const canReadTickets = canReadTicketAny || canReadTicketOwn
  const isTicketLocked = (ticket) => ['resolved', 'closed'].includes(ticket?.status)
  const isTicketOwner = (ticket) => Number(ticket?.user) === Number(user?.id)

  const canEditTicketRow = (ticket) => canEditTicketAny || (canEditTicketOwn && isTicketOwner(ticket))
  const canDeleteTicketRow = (ticket) => canDeleteTicketAny || (canDeleteTicketOwn && isTicketOwner(ticket))
  const canRespond = (ticket) => !isTicketLocked(ticket) && (hasPermission('tickets', 'respond') || isTicketOwner(ticket))

  const openAttachmentPreview = (url, title = 'Adjunto') => {
    const type = getAttachmentType(url)
    if (!url || (type !== 'image' && type !== 'pdf')) return

    setPreviewAttachment({ url, type, title })
  }

  const STATUS_OPTIONS = [
    { value: 'open', label: 'Abierto' },
    { value: 'in_progress', label: 'En Progreso' },
    { value: 'resolved', label: 'Resuelto' },
    { value: 'closed', label: 'Cerrado' },
  ]

  useEffect(() => {
    loadTickets()
    loadCategories()
  }, [])

  useEffect(() => {
    if (!ticketDetail) {
      setResponses([])
      setResponseText('')
      setResponseAttachment(null)
      return
    }
    loadResponses(ticketDetail.id)
  }, [ticketDetail?.id])

  useEffect(() => {
    if (responsesEndRef.current) {
      responsesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [responses])

  useEffect(() => {
    if (!previewAttachment) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPreviewAttachment(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [previewAttachment])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const ticketId = params.get('ticketId')

    if (!ticketId || tickets.length === 0) return

    const ticketToOpen = tickets.find(t => String(t.id) === ticketId)
    if (!ticketToOpen) return
    if (['resolved', 'closed'].includes(ticketToOpen.status)) return

    setTicketEdit(ticketToOpen)
    setModalOpen(true)

    params.delete('ticketId')
    const search = params.toString()
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '' },
      { replace: true }
    )
  }, [location.pathname, location.search, tickets, navigate])

  const loadResponses = async (ticketId) => {
    try {
      setLoadingResponses(true)
      const res = await ticketsApi.getTicketResponses(ticketId)
      setResponses(Array.isArray(res.data) ? res.data : [])
    } catch {
      setResponses([])
    } finally {
      setLoadingResponses(false)
    }
  }

  const handleSubmitResponse = async () => {
    if (!responseText.trim() || !ticketDetail) return
    try {
      setSubmittingResponse(true)
      await ticketsApi.respondTicket(ticketDetail.id, responseText.trim(), responseAttachment)
      setResponseText('')
      setResponseAttachment(null)
      await loadResponses(ticketDetail.id)
      await loadTickets()
      showSuccess('Respuesta enviada.')
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo enviar la respuesta.'))
    } finally {
      setSubmittingResponse(false)
    }
  }

  const loadTickets = async () => {
    try {
      setLoading(true)
      const data = await ticketsApi.getTickets()
      setTickets(Array.isArray(data) ? data : [])
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const data = await ticketsApi.getCategories()
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      setCategories([])
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[status] || colors.open
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      urgent: 'text-red-600'
    }
    return colors[priority] || colors.medium
  }

  const getStatusIcon = (status) => {
    const icons = {
      open: <AlertCircle size={16} />,
      in_progress: <Clock size={16} />,
      resolved: <CheckCircle size={16} />,
      closed: <XCircle size={16} />
    }
    return icons[status] || icons.open
  }

  const getStatusText = (status) => {
    const texts = {
      open: 'Abierto',
      in_progress: 'En Progreso',
      resolved: 'Resuelto',
      closed: 'Cerrado'
    }
    return texts[status] || 'Abierto'
  }

  const getPriorityText = (priority) => {
    const texts = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente'
    }
    return texts[priority] || 'Media'
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus
    const matchesCategory = filterCategory === 'all' || String(ticket.category) === filterCategory
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getAttachmentType = (url = '') => {
    const normalized = String(url).toLowerCase().split('?')[0]

    if (/(\.jpg|\.jpeg|\.png|\.gif|\.webp|\.bmp|\.svg)$/.test(normalized)) {
      return 'image'
    }

    if (normalized.endsWith('.pdf')) {
      return 'pdf'
    }

    return 'other'
  }

  const handleCreateTicket = () => {
    if (!canCreateTicket) return
    setTicketEdit(null)
    setModalOpen(true)
  }

  const handleViewTicket = (ticket) => {
    if (!canEditTicketRow(ticket)) return
    if (isTicketLocked(ticket)) return
    setTicketEdit(ticket)
    setModalOpen(true)
  }

  const handleOpenDetail = (ticket) => {
    setTicketDetail(ticket)
  }

  const handleDeleteTicket = async (ticket) => {
    if (!canDeleteTicketRow(ticket)) return

    const confirmed = await showConfirm(`¿Seguro que deseas eliminar el ticket #${ticket.id}?`)
    if (!confirmed) return

    try {
      await ticketsApi.deleteTicket(ticket.id)
      if (ticketDetail?.id === ticket.id) {
        setTicketDetail(null)
      }
      await loadTickets()
      showSuccess('Ticket eliminado correctamente.')
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo eliminar el ticket. Verifica tus permisos e intenta nuevamente.'))
    }
  }

  const handleStatusChange = async (ticket, nextStatus) => {
    if (!canChangeStatus) return
    if (isTicketLocked(ticket)) return
    if (!nextStatus || ticket.status === nextStatus) return

    try {
      setUpdatingStatusTicketId(ticket.id)
      await ticketsApi.updateTicketStatus(ticket.id, nextStatus, ticket.priority)

      setTickets((previous) =>
        previous.map((item) =>
          item.id === ticket.id
            ? { ...item, status: nextStatus, updated_at: new Date().toISOString() }
            : item
        )
      )

      setTicketDetail((previous) =>
        previous && previous.id === ticket.id
          ? { ...previous, status: nextStatus, updated_at: new Date().toISOString() }
          : previous
      )
      showSuccess(`Estado actualizado a ${getStatusText(nextStatus)}.`)
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo actualizar el estado del ticket. Intenta nuevamente.'))
    } finally {
      setUpdatingStatusTicketId(null)
    }
  }

  const handleSubmit = async (formData) => {
    try {
      if (ticketEdit) {
        await ticketsApi.updateTicket(ticketEdit.id, formData)
      } else {
        await ticketsApi.createTicket(formData)
        showSuccess('Ticket creado correctamente.')
      }

      setModalOpen(false)
      setTicketEdit(null)
      loadTickets()
    } catch (error) {
      throw error
    }
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setTicketEdit(null)
  }

  const canShowActions = canReadTickets

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isAdmin ? 'Gestión de Tickets' : 'Mis Tickets'}
            </h1>
            <p className="text-sm text-gray-500">
              {isAdmin ? 'Gestiona todos los tickets de soporte' : 'Visualiza y gestiona tus tickets de soporte'}
            </p>
          </div>
          
          {canCreateTicket && (
            <button
              onClick={handleCreateTicket}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-medium"
            >
              <Plus size={16} />
              Nuevo Ticket
            </button>
          )}
        </div>

        {!canReadTickets && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
            Tu rol no tiene permisos para ver tickets.
          </div>
        )}

        {/* Filtros */}
        {canReadTickets && <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar tickets..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
              </div>
            </div>

            {/* Filtro por estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              >
                <option value="all">Todos los estados</option>
                <option value="open">Abierto</option>
                <option value="in_progress">En Progreso</option>
                <option value="resolved">Resuelto</option>
                <option value="closed">Cerrado</option>
              </select>
            </div>

            {/* Filtro por categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Estadísticas */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-semibold">{filteredTickets.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Abiertos:</span>
                  <span className="font-semibold text-yellow-600">
                    {filteredTickets.filter(t => t.status === 'open').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>}

        {/* Tabla de Tickets */}
        {canReadTickets && (loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No se encontraron tickets</h3>
            <p className="text-gray-500">
              {searchTerm || filterStatus !== 'all' || filterCategory !== 'all' 
                ? 'Intenta ajustar los filtros de búsqueda' 
                : 'Crea tu primer ticket de soporte'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-245">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Prioridad</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Creado</th>
                    <th className="px-4 py-3">Respuestas</th>
                    {canShowActions && <th className="px-4 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => {
                    const locked = isTicketLocked(ticket)

                    return (
                      <tr key={ticket.id} className="border-t border-gray-100 text-sm text-gray-700 hover:bg-gray-50/60">
                        <td className="px-4 py-3 align-top">
                          <div className="font-semibold text-gray-800">#{ticket.id} {ticket.title}</div>
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">{ticket.description}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          {ticket.category_info ? (
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${ticket.category_info.color}20`,
                                color: ticket.category_info.color,
                              }}
                            >
                              {ticket.category_info.name}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 align-top font-medium ${getPriorityColor(ticket.priority)}`}>
                          {getPriorityText(ticket.priority)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {canChangeStatus ? (
                            <select
                              value={ticket.status}
                              onChange={(event) => handleStatusChange(ticket, event.target.value)}
                              disabled={isTicketLocked(ticket) || updatingStatusTicketId === ticket.id}
                              className={`w-full min-w-37.5 px-2 py-1.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 ${getStatusColor(ticket.status)} disabled:opacity-60 disabled:cursor-not-allowed`}
                              title={isTicketLocked(ticket) ? 'No se puede cambiar estado de tickets resueltos o cerrados' : 'Cambiar estado'}
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                              {getStatusIcon(ticket.status)}
                              {getStatusText(ticket.status)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">{ticket.user_name || '-'}</td>
                        <td className="px-4 py-3 align-top text-xs text-gray-500">{formatDate(ticket.created_at)}</td>
                        <td className="px-4 py-3 align-top">
                          <span className="inline-flex items-center gap-1 text-gray-600">
                            <MessageCircle size={14} />
                            {ticket.responses_count || 0}
                          </span>
                        </td>
                        {canShowActions && (
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(ticket)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
                                title="Detalle"
                              >
                                <Eye size={14} />
                                Detalle
                              </button>
                              {canRespond(ticket) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(ticket)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition"
                                  title="Responder"
                                >
                                  <Send size={14} />
                                  Responder
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleViewTicket(ticket)}
                                disabled={!canEditTicketRow(ticket) || locked}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title={locked ? 'No se puede editar tickets resueltos o cerrados' : 'Editar'}
                              >
                                <Pencil size={14} />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTicket(ticket)}
                                disabled={!canDeleteTicketRow(ticket)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                                Eliminar
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Modal para crear/editar ticket */}
        {modalOpen && (
          <TicketModal
            ticketEdit={ticketEdit}
            categories={categories}
            isAdmin={isAdmin}
            onSubmit={handleSubmit}
            onClosed={handleModalClose}
          />
        )}

        {ticketDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">Detalle del Ticket #{ticketDetail.id}</h2>
                <button
                  type="button"
                  onClick={() => setTicketDetail(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4 text-sm text-gray-700">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Titulo</p>
                  <p className="mt-1 text-base font-semibold text-gray-800">{ticketDetail.title}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Estado</p>
                    {canChangeStatus ? (
                      <select
                        value={ticketDetail.status}
                        onChange={(event) => handleStatusChange(ticketDetail, event.target.value)}
                        disabled={isTicketLocked(ticketDetail) || updatingStatusTicketId === ticketDetail.id}
                        className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 ${getStatusColor(ticketDetail.status)} disabled:opacity-60 disabled:cursor-not-allowed`}
                        title={isTicketLocked(ticketDetail) ? 'No se puede cambiar estado de tickets resueltos o cerrados' : 'Cambiar estado'}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticketDetail.status)}`}>
                        {getStatusIcon(ticketDetail.status)}
                        {getStatusText(ticketDetail.status)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Prioridad</p>
                    <p className={`mt-1 font-semibold ${getPriorityColor(ticketDetail.priority)}`}>
                      {getPriorityText(ticketDetail.priority)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Categoria</p>
                    <p className="mt-1">{ticketDetail.category_info?.name || 'Sin categoria'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Usuario</p>
                    <p className="mt-1">{ticketDetail.user_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Creado</p>
                    <p className="mt-1">{formatDate(ticketDetail.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Ultima actualizacion</p>
                    <p className="mt-1">{formatDate(ticketDetail.updated_at)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Descripcion</p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-700">{ticketDetail.description}</p>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                    Respuestas ({responses.length})
                  </p>

                  {loadingResponses ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                    </div>
                  ) : responses.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3">Sin respuestas aún.</p>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {responses.map((resp) => {
                        const isMine = Number(resp.user) === Number(user?.id)
                        return (
                          <div
                            key={resp.id}
                            className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              {resp.is_admin_response && (
                                <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-semibold">Admin</span>
                              )}
                              <span className="font-medium text-gray-500">{resp.user_name}</span>
                              <span>{new Date(resp.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            <div
                              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                                isMine
                                  ? 'bg-blue-500 text-white rounded-br-sm'
                                  : resp.is_admin_response
                                  ? 'bg-indigo-50 border border-indigo-100 text-gray-800 rounded-bl-sm'
                                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                              }`}
                            >
                              {resp.message}
                              {resp.attachment && (
                                <div className="mt-2 space-y-2">
                                  {getAttachmentType(resp.attachment) === 'image' && (
                                    <button
                                      type="button"
                                      onClick={() => openAttachmentPreview(resp.attachment, `Adjunto de ${resp.user_name}`)}
                                      className="block"
                                    >
                                      <img
                                        src={resp.attachment}
                                        alt="Adjunto de respuesta"
                                        className="rounded-lg border border-gray-200 max-h-56 w-auto object-contain bg-white"
                                      />
                                    </button>
                                  )}

                                  {getAttachmentType(resp.attachment) === 'pdf' && (
                                    <button
                                      type="button"
                                      onClick={() => openAttachmentPreview(resp.attachment, `PDF de ${resp.user_name}`)}
                                      className="h-56 w-full max-w-md rounded-lg overflow-hidden border border-gray-200 bg-white"
                                    >
                                      <iframe
                                        src={resp.attachment}
                                        title={`Adjunto PDF respuesta ${resp.id}`}
                                        className="w-full h-full"
                                      />
                                    </button>
                                  )}

                                  <a
                                    href={resp.attachment}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`underline font-medium ${isMine ? 'text-blue-100' : 'text-blue-600'}`}
                                  >
                                    {getAttachmentType(resp.attachment) === 'other'
                                      ? 'Descargar archivo adjunto'
                                      : 'Abrir adjunto en pestaña nueva'}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      <div ref={responsesEndRef} />
                    </div>
                  )}

                  {canRespond(ticketDetail) && (
                    <div className="mt-3 flex gap-2 items-end">
                      <div className="flex-1 space-y-2">
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSubmitResponse()
                            }
                          }}
                          placeholder="Escribe una respuesta… (Enter para enviar, Shift+Enter para nueva línea)"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 cursor-pointer transition">
                            <Paperclip size={13} />
                            Adjuntar archivo
                            <input
                              type="file"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0] || null
                                setResponseAttachment(file)
                              }}
                            />
                          </label>
                          {responseAttachment && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="truncate max-w-52">{responseAttachment.name}</span>
                              <button
                                type="button"
                                onClick={() => setResponseAttachment(null)}
                                className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
                                title="Quitar adjunto"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSubmitResponse}
                        disabled={!responseText.trim() || submittingResponse}
                        className="p-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                        title="Enviar respuesta"
                      >
                        {submittingResponse ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Send size={16} />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Adjunto</p>
                  {ticketDetail.attachment ? (
                    <div className="mt-2 space-y-3">
                      {getAttachmentType(ticketDetail.attachment) === 'image' && (
                        <button
                          type="button"
                          onClick={() => openAttachmentPreview(ticketDetail.attachment, `Adjunto del ticket #${ticketDetail.id}`)}
                          className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50"
                        >
                          <img
                            src={ticketDetail.attachment}
                            alt="Adjunto del ticket"
                            className="w-full h-auto max-h-105 object-contain"
                          />
                        </button>
                      )}

                      {getAttachmentType(ticketDetail.attachment) === 'pdf' && (
                        <button
                          type="button"
                          onClick={() => openAttachmentPreview(ticketDetail.attachment, `PDF del ticket #${ticketDetail.id}`)}
                          className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 h-105 w-full"
                        >
                          <iframe
                            src={ticketDetail.attachment}
                            title="Vista previa del PDF"
                            className="w-full h-full"
                          />
                        </button>
                      )}

                      {getAttachmentType(ticketDetail.attachment) === 'other' && (
                        <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          Este tipo de archivo no se puede previsualizar en el modal.
                        </div>
                      )}

                      <a
                        href={ticketDetail.attachment}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition"
                      >
                        <Paperclip size={14} />
                        Abrir en pestaña nueva
                      </a>
                    </div>
                  ) : (
                    <p className="mt-1 text-gray-400">Sin adjunto</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {previewAttachment && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setPreviewAttachment(null)
              }
            }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 truncate pr-4">{previewAttachment.title}</h3>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 bg-gray-50 max-h-[calc(90vh-64px)] overflow-auto">
                {previewAttachment.type === 'image' ? (
                  <img
                    src={previewAttachment.url}
                    alt={previewAttachment.title}
                    className="mx-auto max-h-[75vh] w-auto object-contain rounded-lg border border-gray-200 bg-white"
                  />
                ) : (
                  <iframe
                    src={previewAttachment.url}
                    title={previewAttachment.title}
                    className="w-full h-[75vh] rounded-lg border border-gray-200 bg-white"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
