import { X, User, ShieldCheck, ClipboardList, Hash, Globe, Terminal, Calendar, CheckCircle } from 'lucide-react'

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'long',
  timeStyle: 'medium',
})

function formatDateTime(value) {
  if (!value) return '-'
  try {
    return DATE_TIME_FORMATTER.format(new Date(value))
  } catch {
    return value
  }
}

const ACTION_CONFIG = {
  create: { label: 'Creacion', bg: 'bg-green-100', text: 'text-green-700' },
  update: { label: 'Actualizacion', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  delete: { label: 'Eliminacion', bg: 'bg-red-100', text: 'text-red-700' },
  other:  { label: 'Otro cambio', bg: 'bg-gray-100',  text: 'text-gray-600'  },
}

const METHOD_CONFIG = {
  POST:   { bg: 'bg-green-100',  text: 'text-green-700'  },
  PUT:    { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  PATCH:  { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  DELETE: { bg: 'bg-red-100',    text: 'text-red-700'    },
}

function Badge({ label, bg, text }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg} ${text}`}>
      {label}
    </span>
  )
}

function Field({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
        <Icon size={15} className="text-gray-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <div className="text-sm text-gray-700 overflow-anywhere">{children}</div>
      </div>
    </div>
  )
}

export default function AuditoriaDetailModal({ log, onClose }) {
  if (!log) return null

  const actionCfg  = ACTION_CONFIG[log.action]  || ACTION_CONFIG.other
  const methodCfg  = METHOD_CONFIG[log.http_method] || { bg: 'bg-gray-100', text: 'text-gray-600' }

  const statusOk = log.status_code >= 200 && log.status_code < 300
  const statusBg   = statusOk ? 'bg-green-100' : 'bg-red-100'
  const statusText = statusOk ? 'text-green-700' : 'text-red-700'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-600" />
            <h2 className="text-base font-bold text-gray-800">Detalle del registro</h2>
            <span className="text-xs text-gray-400 ml-1">#{log.id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5">

          {/* Fecha */}
          <Field icon={Calendar} label="Fecha y hora">
            {formatDateTime(log.created_at)}
          </Field>

          {/* Actor */}
          <Field icon={User} label="Usuario">
            <span className="font-semibold">{log.actor || 'Sistema'}</span>
          </Field>

          {/* Rol */}
          <Field icon={ShieldCheck} label="Rol">
            {log.actor_role_name ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                {log.actor_role_name}
              </span>
            ) : (
              <span className="text-gray-400">Sin rol</span>
            )}
          </Field>

          {/* Tipo de acción */}
          <Field icon={ClipboardList} label="Tipo de cambio">
            <Badge label={actionCfg.label} bg={actionCfg.bg} text={actionCfg.text} />
          </Field>

          {/* Recurso e ID */}
          <Field icon={Hash} label="Recurso">
            <span>{log.resource || '-'}</span>
            {log.entity_id && (
              <span className="ml-2 px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-500 font-mono">
                ID {log.entity_id}
              </span>
            )}
          </Field>

          {/* Método y ruta */}
          <Field icon={Globe} label="Endpoint">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge label={log.http_method} bg={methodCfg.bg} text={methodCfg.text} />
              <span className="font-mono text-xs text-gray-600 break-all">{log.path}</span>
            </div>
          </Field>

          {/* Estado HTTP */}
          <Field icon={CheckCircle} label="Estado HTTP">
            <Badge label={`HTTP ${log.status_code}`} bg={statusBg} text={statusText} />
          </Field>

          {/* Detalle del cambio */}
          <Field icon={Terminal} label="Descripcion del cambio">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {log.change_summary || '-'}
            </p>
          </Field>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
