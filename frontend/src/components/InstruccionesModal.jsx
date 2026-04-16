import { useState } from 'react'
import { X, CheckSquare, Square, Play } from 'lucide-react'

const instrucciones = [
  { icon: '📋', text: 'Lee atentamente las siguientes instrucciones antes de comenzar.' },
  { icon: '❓', text: 'El examen consta de preguntas de opción múltiple y verdadero/falso.' },
  { icon: '⏱️', bold: 'El tiempo comenzará a contar solamente cuando hagas clic en el botón "Comenzar".', sub: 'No podrás pausar el examen una vez iniciado.' },
  { icon: '🔒', text: 'Al finalizar o agotar el tiempo, no podrás modificar tus respuestas.' },
  { icon: '🔄', text: 'Podrás navegar entre preguntas usando los botones de navegación mientras el tiempo esté activo.' },
  { icon: '🌐', text: 'Asegúrate de contar con una buena conexión a internet antes de iniciar el examen.' },
  { icon: '💻', text: 'Te recomendamos realizar el examen desde una computadora para una mejor experiencia visual y de navegación.' },
]

export default function InstruccionesModal({ simulador, onClose, onComenzar }) {
  const [aceptado, setAceptado] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleComenzar = async () => {
    if (!aceptado) return
    setLoading(true)
    await onComenzar()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Instrucciones del Simulador</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <p className="font-semibold text-gray-700 mb-4">¡Bienvenido al {simulador.titulo}!</p>

          <ul className="space-y-3">
            {instrucciones.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <div className="text-sm text-gray-600">
                  {item.bold ? (
                    <>
                      <span className="font-medium text-gray-800 underline">{item.bold}</span>
                      {item.sub && <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>}
                    </>
                  ) : item.text}
                </div>
              </li>
            ))}
          </ul>

          {simulador.tiempo_limite_minutos && (
            <div className="mt-4 bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700">
              ⏰ Tiempo disponible: <strong>{simulador.tiempo_limite_minutos} minutos</strong>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 space-y-3">
          <label
            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
            onClick={() => setAceptado((v) => !v)}
          >
            {aceptado
              ? <CheckSquare size={18} className="text-emerald-600" />
              : <Square size={18} className="text-gray-400" />}
            He leído y acepto las instrucciones del examen.
          </label>

          <div className="flex justify-end">
            <button
              onClick={handleComenzar}
              disabled={!aceptado || loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm"
            >
              <Play size={15} />
              {loading ? 'Iniciando…' : 'Comenzar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
