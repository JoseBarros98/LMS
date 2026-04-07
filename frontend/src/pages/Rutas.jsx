import { useCallback, useEffect, useState } from 'react'
import { Edit, Plus, Sparkles, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import RutaModal from '../components/RutaModal'
import { cursosApi } from '../api/cursos'
import { useAuth } from '../context/AuthContext'

export default function Rutas() {
  const { user } = useAuth()
  const [rutas, setRutas] = useState([])
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [rutaModalOpen, setRutaModalOpen] = useState(false)
  const [rutaEdit, setRutaEdit] = useState(null)

  const isAdmin = user?.role?.name?.toLowerCase() === 'administrador'

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [rutasData, cursosData] = await Promise.all([
        cursosApi.getRutas(),
        cursosApi.getCursos(),
      ])

      setRutas(Array.isArray(rutasData) ? rutasData : [])
      setCursos(Array.isArray(cursosData) ? cursosData : [])
    } catch {
      setRutas([])
      setCursos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openCreateRuta = () => {
    setRutaEdit(null)
    setRutaModalOpen(true)
  }

  const openEditRuta = (ruta) => {
    setRutaEdit(ruta)
    setRutaModalOpen(true)
  }

  const handleSubmitRuta = async (formData) => {
    if (rutaEdit) {
      await cursosApi.updateRuta(rutaEdit.id, formData)
    } else {
      await cursosApi.createRuta(formData)
    }

    setRutaModalOpen(false)
    setRutaEdit(null)
    await loadData()
  }

  const handleDeleteRuta = async (ruta) => {
    const hasCourses = cursos.some((curso) => curso.ruta === ruta.id)
    const message = hasCourses
      ? `La ruta "${ruta.titulo}" tiene cursos asociados y tambien se eliminaran. ¿Deseas continuar?`
      : `¿Eliminar la ruta "${ruta.titulo}"?`

    const ok = window.confirm(message)
    if (!ok) return

    await cursosApi.deleteRuta(ruta.id)
    await loadData()
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Rutas</h1>
            <p className="text-sm text-gray-500">Gestiona las rutas academicas visibles en la seccion Academia.</p>
          </div>

          {isAdmin && (
            <button
              onClick={openCreateRuta}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition flex items-center gap-2 text-sm font-medium"
            >
              <Plus size={16} />
              Nueva Ruta
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : rutas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <Sparkles className="mx-auto text-gray-400 mb-4" size={42} />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No hay rutas para mostrar</h3>
            <p className="text-sm text-gray-500">Crea una ruta para comenzar a organizar los cursos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rutas.map((ruta) => (
              <article key={ruta.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-gray-800">{ruta.titulo}</h2>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ruta.descripcion || 'Sin descripcion'}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${ruta.publicado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {ruta.publicado ? 'Publicada' : 'Borrador'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Orden #{ruta.orden}</span>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => openEditRuta(ruta)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition inline-flex items-center gap-1"
                    >
                      <Edit size={12} /> Editar
                    </button>
                    <button
                      onClick={() => handleDeleteRuta(ruta)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-red-100 text-red-700 hover:bg-red-200 transition inline-flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {rutaModalOpen && isAdmin && (
          <RutaModal
            key={rutaEdit?.id || 'new-route'}
            rutaEdit={rutaEdit}
            onSubmit={handleSubmitRuta}
            onClosed={() => {
              setRutaModalOpen(false)
              setRutaEdit(null)
            }}
          />
        )}
      </div>
    </Layout>
  )
}
