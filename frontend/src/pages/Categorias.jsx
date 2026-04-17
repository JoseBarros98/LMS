import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { ticketsApi } from '../api/tickets'
import { showConfirm } from '../utils/toast'
import CategoryModal from '../components/CategoryModal'
import { 
  Plus, 
  Edit, 
  Power,
  Tag,
  Palette,
} from 'lucide-react'

export default function Categorias() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [categoryEdit, setCategoryEdit] = useState(null)

  const isAdmin = user?.role?.name?.toLowerCase() === 'administrador'

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await ticketsApi.getAllCategories()
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setCategoryEdit(null)
    setModalOpen(true)
  }

  const handleEdit = (category) => {
    setCategoryEdit(category)
    setModalOpen(true)
  }

  const handleSubmit = async (formData) => {
    try {
      if (categoryEdit) {
        await ticketsApi.updateCategory(categoryEdit.id, formData)
      } else {
        await ticketsApi.createCategory(formData)
      }

      setModalOpen(false)
      setCategoryEdit(null)
      await loadCategories()
    } catch (error) {
      const errorMessage = error?.response?.data

      const formattedMessage =
        typeof errorMessage === 'string'
          ? errorMessage
          : errorMessage?.name?.[0] || errorMessage?.detail || 'No se pudo guardar la categoría.'

      throw new Error(formattedMessage)
    }
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setCategoryEdit(null)
  }

  const handleDelete = async (categoryId) => {
    const category = categories.find((item) => item.id === categoryId)

    if (!category) {
      return
    }

    const nextStatus = category.status === 'active' ? 'inactive' : 'active'
    const actionLabel = nextStatus === 'active' ? 'reactivar' : 'desactivar'

    if (!await showConfirm(`¿Estás seguro de ${actionLabel} esta categoría?`)) {
      return
    }

    try {
      await ticketsApi.updateCategory(categoryId, { status: nextStatus })
      loadCategories()
    } catch {
    }
  }

  const getCategoryStatusLabel = (category) => {
    return category.status_label || (category.status === 'active' ? 'Activa' : 'Inactiva')
  }

  const getCategoryStatusClasses = (category) => {
    return category.status === 'active'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700'
  }

  const getNextStatusActionLabel = (category) => {
    return category.status === 'active' ? 'Desactivar' : 'Reactivar'
  }

  const nextOrder = categories.reduce((highestOrder, category) => {
    return Math.max(highestOrder, Number(category.order) || 0)
  }, 0) + 1

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Tag className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Acceso Restringido</h3>
            <p className="text-gray-500">
              Solo los administradores pueden gestionar las categorías de tickets.
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Categorías de Tickets</h1>
            <p className="text-sm text-gray-500">
              Gestiona las categorías disponibles para los tickets de soporte
            </p>
          </div>
          
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-medium"
          >
            <Plus size={16} />
            Nueva Categoría
          </button>
        </div>

        {/* Lista de Categorías */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No hay categorías</h3>
            <p className="text-gray-500">
              Crea tu primera categoría para organizar los tickets
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(category => (
              <div key={category.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <span style={{ color: category.color }}>📋</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">#{category.order}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                      title="Editar"
                    >
                      <Edit size={14} />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(category.id)}
                      className={`p-1.5 rounded-lg transition ${
                        category.status === 'active'
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                      title={getNextStatusActionLabel(category)}
                    >
                      <Power size={14} />
                    </button>
                  </div>
                </div>

                {/* Contenido */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">{category.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Palette size={14} className="text-gray-400" />
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: `${category.color}20`, 
                          color: category.color 
                        }}
                      >
                        {category.color}
                      </span>
                    </div>
                    
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getCategoryStatusClasses(category)}`}>
                      {getCategoryStatusLabel(category)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal para crear/editar */}
        {modalOpen && (
          <CategoryModal
            categoryEdit={categoryEdit}
            initialOrder={nextOrder}
            existingNames={categories
              .filter((category) => category.id !== categoryEdit?.id)
              .map((category) => category.name)}
            onSubmit={handleSubmit}
            onClosed={handleModalClose}
          />
        )}
      </div>
    </Layout>
  )
}
