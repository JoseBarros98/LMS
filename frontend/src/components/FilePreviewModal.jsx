import { X } from 'lucide-react'

const isImageFile = (url) => /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(url || '')
const isPdfFile = (url) => /\.pdf(\?.*)?$/i.test(url || '')

export default function FilePreviewModal({ url, title = 'Vista de comprobante', onClose }) {
  if (!url) return null

  const image = isImageFile(url)
  const pdf = isPdfFile(url)

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl border border-gray-200 shadow-2xl max-h-[94vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100"
            >
              Abrir en nueva pestaña
            </a>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="bg-gray-100 p-3 h-[78vh] overflow-auto">
          {image && (
            <img
              src={url}
              alt="Comprobante de pago"
              className="max-w-full max-h-full mx-auto rounded-lg border border-gray-200 bg-white"
            />
          )}

          {pdf && (
            <iframe
              src={url}
              title="Comprobante PDF"
              className="w-full h-full min-h-[72vh] rounded-lg border border-gray-200 bg-white"
            />
          )}

          {!image && !pdf && (
            <div className="h-full min-h-[72vh] flex items-center justify-center text-sm text-gray-600">
              Este tipo de archivo no se puede previsualizar aqui.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
