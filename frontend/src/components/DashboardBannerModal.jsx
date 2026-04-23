import { useState, useRef } from 'react'
import { X, Upload, Loader } from 'lucide-react'
import { showConfirm, showSuccess, showError } from '../utils/toast'
import { updateDashboardBanner } from '../api/users'

export default function DashboardBannerModal({ isOpen, onClose, onUpdated }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Por favor selecciona una imagen válida')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('La imagen no puede superar 5MB')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreview(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      showError('Por favor selecciona una imagen')
      return
    }

    const confirmed = await showConfirm('¿Deseas cambiar la portada del dashboard?')
    if (!confirmed) return

    setLoading(true)
    try {
      const response = await updateDashboardBanner(selectedFile)
      showSuccess('Portada actualizada exitosamente')
      onUpdated?.(response.data?.dashboard_banner)
      
      resetModal()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      showError(error.response?.data?.detail || 'Error al actualizar la portada')
    } finally {
      setLoading(false)
    }
  }

  const resetModal = () => {
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Cambiar Portada</h2>
          <button
            onClick={() => {
              resetModal()
              onClose()
            }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {preview ? (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                <img src={preview} alt="Vista previa" className="w-full h-40 object-cover" />
              </div>
              <p className="text-sm text-gray-600">{selectedFile?.name}</p>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
            >
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">Selecciona una imagen</p>
              <p className="text-xs text-gray-500 mt-1">Máximo 5MB - Formatos: JPG, PNG, WebP</p>
              <p className="text-xs text-gray-500 mt-1">Tamaño óptimo recomendado: 1600 x 700 px (formato horizontal).</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={() => {
              resetModal()
              onClose()
            }}
            className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Cargando...
              </>
            ) : (
              'Cambiar'
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          La nueva portada se mostrará en todo el sistema, sin importar el rol.
        </p>
      </div>
    </div>
  )
}
