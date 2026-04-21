import { useState } from 'react'
import { MessageCircle, RefreshCw, Save } from 'lucide-react'
import Layout from '../components/Layout'
import { getDefaultWhatsappTemplates, getWhatsappTemplates, saveWhatsappTemplates } from '../utils/whatsapp'
import { showSuccess } from '../utils/toast'

export default function MensajesWhatsapp() {
  const [templates, setTemplates] = useState(getWhatsappTemplates())

  const handleTemplateChange = (key, value) => {
    setTemplates((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  const handleSave = () => {
    const saved = saveWhatsappTemplates(templates)
    setTemplates(saved)
    showSuccess('Plantillas de WhatsApp guardadas correctamente.')
  }

  const handleReset = () => {
    const defaults = getDefaultWhatsappTemplates()
    const saved = saveWhatsappTemplates(defaults)
    setTemplates(saved)
    showSuccess('Plantillas de WhatsApp restauradas a valores predeterminados.')
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Plantillas de WhatsApp</h1>
          <p className="text-sm text-gray-500">Configura los mensajes para cursos y rutas.</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Variables disponibles: {'{{student_name}}'}, {'{{source_title}}'}, {'{{platform_url}}'}, {'{{user_email}}'}, {'{{generated_password}}'}.
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <MessageCircle size={16} className="text-gray-600" />
              <h2 className="text-sm font-semibold text-gray-800">Plantilla para cursos</h2>
            </div>
            <div className="p-5">
              <textarea
                value={templates.curso || ''}
                onChange={(e) => handleTemplateChange('curso', e.target.value)}
                rows={10}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <MessageCircle size={16} className="text-gray-600" />
              <h2 className="text-sm font-semibold text-gray-800">Plantilla para rutas</h2>
            </div>
            <div className="p-5">
              <textarea
                value={templates.ruta || ''}
                onChange={(e) => handleTemplateChange('ruta', e.target.value)}
                rows={10}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-medium"
          >
            <Save size={16} />
            Guardar plantillas
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium inline-flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Restaurar predeterminadas
          </button>
        </div>
      </div>
    </Layout>
  )
}