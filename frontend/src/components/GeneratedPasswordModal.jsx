import { Check, Copy, KeyRound, X } from 'lucide-react'
import { useState } from 'react'
import { showError, showSuccess } from '../utils/toast'

const copyText = async (text) => {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'absolute'
  textArea.style.left = '-9999px'
  document.body.appendChild(textArea)
  textArea.select()
  document.execCommand('copy')
  document.body.removeChild(textArea)
}

export default function GeneratedPasswordModal({
  open,
  studentName,
  password,
  contextLabel = 'la matricula',
  onClose,
}) {
  const [copied, setCopied] = useState(false)

  if (!open || !password) return null

  const handleCopy = async () => {
    try {
      await copyText(password)
      setCopied(true)
      showSuccess('Contrasena copiada al portapapeles.')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      showError('No se pudo copiar la contrasena.')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white shadow-2xl overflow-hidden">
        <div className="bg-linear-to-r from-sky-600 via-cyan-500 to-emerald-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
                <KeyRound size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Credenciales generadas</h2>
                <p className="text-sm text-white/85">
                  Guarda esta contrasena antes de cerrar. Solo se muestra al completar {contextLabel}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-white/90 hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Estudiante</p>
            <p className="mt-2 text-base font-semibold text-slate-800">{studentName || 'Estudiante nuevo'}</p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Contrasena inicial</p>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 border border-emerald-100">
              <span className="break-all font-mono text-lg text-slate-900">{password}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiada' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Copiar contrasena
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}