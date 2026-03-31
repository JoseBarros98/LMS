import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { ticketsApi } from '../api/tickets'
import TicketModal from '../components/TicketModal'
import { 
  Plus, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Search,
  User,
  Calendar,
  Paperclip
} from 'lucide-react'

export default function Tickets() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [ticketEdit, setTicketEdit] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  const isAdmin = user?.role?.name?.toLowerCase() === 'administrador'

  useEffect(() => {
    loadTickets()
    loadCategories()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const ticketId = params.get('ticketId')

    if (!ticketId || tickets.length === 0) return

    const ticketToOpen = tickets.find(t => String(t.id) === ticketId)
    if (!ticketToOpen) return

    setTicketEdit(ticketToOpen)
    setModalOpen(true)

    params.delete('ticketId')
    const search = params.toString()
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '' },
      { replace: true }
    )
  }, [location.pathname, location.search, tickets, navigate])

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

  const handleCreateTicket = () => {
    setTicketEdit(null)
    setModalOpen(true)
  }

  const handleViewTicket = (ticket) => {
    setTicketEdit(ticket)
    setModalOpen(true)
  }

  const handleSubmit = async (formData) => {
    try {
      if (ticketEdit) {
        await ticketsApi.updateTicket(ticketEdit.id, formData)
      } else {
        await ticketsApi.createTicket(formData)
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
          
          <button
            onClick={handleCreateTicket}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-medium"
          >
            <Plus size={16} />
            Nuevo Ticket
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
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
        </div>

        {/* Lista de Tickets */}
        {loading ? (
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
          <div className="grid grid-cols-1 gap-4">
            {filteredTickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => handleViewTicket(ticket)}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer"
              >
                {/* Header del ticket */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {ticket.category_info && (
                        <div 
                          className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                          style={{ 
                            backgroundColor: `${ticket.category_info.color}20`,
                            color: ticket.category_info.color 
                          }}
                        >
                          {ticket.category_info.name}
                        </div>
                      )}
                      <span className={`text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        {getPriorityText(ticket.priority)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{ticket.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2">{ticket.description}</p>
                  </div>
                  
                  {/* Estado */}
                  <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(ticket.status)}`}>
                    {getStatusIcon(ticket.status)}
                    {getStatusText(ticket.status)}
                  </div>
                </div>

                {/* Información adicional */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      <span>{ticket.user_name}</span>
                    </div>
                    {ticket.responses_count > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageCircle size={14} />
                        <span>{ticket.responses_count}</span>
                      </div>
                    )}
                    {ticket.attachment && (
                      <div className="flex items-center gap-1">
                        <Paperclip size={14} />
                        <span>Adjunto</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{formatDate(ticket.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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
      </div>
    </Layout>
  )
}
