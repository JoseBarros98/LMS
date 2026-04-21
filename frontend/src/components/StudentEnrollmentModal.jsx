import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, UserPlus, X } from 'lucide-react'
import { cursosApi } from '../api/cursos'

const initialForm = {
  name: '',
  paternal_surname: '',
  maternal_surname: '',
  ci: '',
  email: '',
  phone_number: '',
  university: '',
  country: '',
  plan_pago: 'contado',
  numero_cuotas: 2,
  fecha_inicio: '',
  fecha_fin: '',
  activa: true,
}

export default function StudentEnrollmentModal({
  title,
  subtitle,
  submitLabel,
  loading = false,
  error = '',
  enrollmentType = 'ruta',
  onSubmit,
  onClose,
}) {
  const [form, setForm] = useState(initialForm)
  const [mode, setMode] = useState('new')
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const [paymentProofFile, setPaymentProofFile] = useState(null)
  const [montoPagado, setMontoPagado] = useState('')
  const [formaPago, setFormaPago] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    setForm((previous) => {
      if (enrollmentType === 'curso') {
        return {
          ...previous,
          plan_pago: 'contado',
          numero_cuotas: 1,
        }
      }

      const nextCuotas = previous.numero_cuotas === 1 ? 1 : 2
      return {
        ...previous,
        numero_cuotas: nextCuotas,
      }
    })
  }, [enrollmentType])

  useEffect(() => {
    if (mode !== 'existing' || users.length > 0) return

    const loadUsers = async () => {
      try {
        setLoadingUsers(true)
        const data = await cursosApi.getUsersForEnrollment()
        setUsers(Array.isArray(data) ? data : [])
      } finally {
        setLoadingUsers(false)
      }
    }

    loadUsers()
  }, [mode, users.length])

  useEffect(() => {
    if (!inputRef.current || mode !== 'existing') return

    const updatePosition = () => {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [mode, userSearch, selectedUserId])

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase()
    if (!query) return users

    return users.filter((user) => {
      const fullName = `${user.name || ''} ${user.paternal_surname || ''} ${user.maternal_surname || ''}`.toLowerCase()
      const ci = (user.ci || '').toLowerCase()
      const email = (user.email || '').toLowerCase()
      const phone = (user.phone_number || '').toLowerCase()
      return [fullName, ci, email, phone].some((value) => value.includes(query))
    })
  }, [userSearch, users])

  const canSubmit = useMemo(() => {
    if (!paymentProofFile) {
      return false
    }

    if (mode === 'existing') {
      return Boolean(selectedUserId)
    }

    return (
      form.name.trim() &&
      form.ci.trim() &&
      form.email.trim() &&
      form.phone_number.trim() &&
      form.university.trim() &&
      form.country.trim()
    )
  }, [form, mode, paymentProofFile, selectedUserId])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    const nextValue = type === 'checkbox' ? checked : value

    setForm((previous) => {
      if (name === 'plan_pago') {
        if (enrollmentType === 'curso') {
          return {
            ...previous,
            plan_pago: 'contado',
            numero_cuotas: 1,
          }
        }

        return {
          ...previous,
          plan_pago: nextValue,
          numero_cuotas: nextValue === 'contado' ? previous.numero_cuotas : previous.numero_cuotas,
        }
      }

      return {
        ...previous,
        [name]: nextValue,
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (mode === 'existing') {
      await onSubmit({
        mode,
        user_id: selectedUserId,
        plan_pago: enrollmentType === 'curso' ? 'contado' : form.plan_pago,
        numero_cuotas: enrollmentType === 'curso' ? 1 : Number(form.numero_cuotas),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        activa: true,
        monto_pagado: montoPagado ? Number(montoPagado) : 0,
        forma_pago: formaPago,
        _comprobante_pago_file: paymentProofFile,
      })
      return
    }

    await onSubmit({
      ...form,
      mode,
      activa: true,
      monto_pagado: montoPagado ? Number(montoPagado) : 0,
      forma_pago: formaPago,
      _comprobante_pago_file: paymentProofFile,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-xl flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto grow">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2">
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${mode === 'new' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-white'}`}
            >
              Crear nuevo estudiante
            </button>
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${mode === 'existing' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-white'}`}
            >
              Usar estudiante existente
            </button>
          </div>

          {mode === 'new' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre completo *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Apellido paterno</label>
                <input
                  name="paternal_surname"
                  value={form.paternal_surname}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Apellido materno</label>
                <input
                  name="maternal_surname"
                  value={form.maternal_surname}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">CI *</label>
                <input
                  name="ci"
                  value={form.ci}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Telefono *</label>
                <input
                  name="phone_number"
                  value={form.phone_number}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Universidad *</label>
                <input
                  name="university"
                  value={form.university}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pais *</label>
                <input
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-blue-800">
                  La contrasena inicial se genera automaticamente con el primer nombre y el CI del estudiante.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Buscar estudiante existente</label>

              {selectedUserId ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-sm flex items-center justify-between">
                  <span className="font-medium text-gray-800">
                    {(() => {
                      const u = filteredUsers.find(u => u.id === Number(selectedUserId))
                      return u ? `${u.name || ''} ${u.paternal_surname || ''}`.trim() : 'Estudiante seleccionado'
                    })()}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setSelectedUserId(''); setUserSearch('') }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-3 whitespace-nowrap"
                  >
                    Cambiar seleccion
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <label className="relative block">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      ref={inputRef}
                      type="search"
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder={loadingUsers ? 'Cargando estudiantes...' : 'Buscar por nombre, CI, email o telefono'}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      disabled={loadingUsers}
                      autoComplete="off"
                    />
                  </label>

                  {userSearch && filteredUsers.length > 0 && createPortal(
                    <div
                      style={{
                        position: 'fixed',
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`,
                        zIndex: 9999,
                      }}
                      className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-44 overflow-y-auto"
                    >
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(String(user.id))
                            setUserSearch('')
                          }}
                          className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition"
                        >
                          <div className="font-medium">{`${user.name || ''} ${user.paternal_surname || ''} ${user.maternal_surname || ''}`.trim()}</div>
                          <div className="text-xs text-gray-500">CI: {user.ci || '-'} • {user.email || '-'}</div>
                        </button>
                      ))}
                    </div>,
                    document.body
                  )}

                  {userSearch && filteredUsers.length === 0 && !loadingUsers && createPortal(
                    <div
                      style={{
                        position: 'fixed',
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`,
                        zIndex: 9999,
                      }}
                      className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm text-gray-500 text-center"
                    >
                      No se encontraron estudiantes
                    </div>,
                    document.body
                  )}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Comprobante de pago (PDF o imagen) *</label>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                onChange={(event) => setPaymentProofFile(event.target.files?.[0] || null)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Formatos permitidos: PDF, PNG, JPG, JPEG y WEBP.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Monto pagado (Bs)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montoPagado}
                  onChange={(event) => setMontoPagado(event.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <p className="mt-1 text-xs text-gray-500">Monto abonado al momento de la matricula. Puedes dejarlo en 0 si aun no se registra el pago.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Forma de pago</label>
                <select
                  value={formaPago}
                  onChange={(event) => setFormaPago(event.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Selecciona una opcion</option>
                  <option value="QR">QR</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Plan de pago</label>
                <select
                  name="plan_pago"
                  value={enrollmentType === 'curso' ? 'contado' : form.plan_pago}
                  onChange={handleChange}
                  disabled={enrollmentType === 'curso'}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                >
                  <option value="contado">Contado</option>
                  {enrollmentType === 'ruta' && <option value="credito">Credito</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Numero de pagos</label>
                {enrollmentType === 'curso' ? (
                  <input
                    value="1"
                    disabled
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-100"
                  />
                ) : form.plan_pago === 'contado' ? (
                  <select
                    name="numero_cuotas"
                    value={form.numero_cuotas}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value={1}>1 pago</option>
                    <option value={2}>2 pagos</option>
                  </select>
                ) : (
                  <input
                    value="Se calcula automaticamente segun duracion"
                    disabled
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-100"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fecha inicio</label>
                <input
                  type="date"
                  name="fecha_inicio"
                  value={form.fecha_inicio}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fecha fin</label>
                <input
                  type="date"
                  name="fecha_fin"
                  value={form.fecha_fin}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !canSubmit}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              {loading ? 'Guardando...' : submitLabel}
            </button>
          </div>
      </div>
    </div>
  )
}
