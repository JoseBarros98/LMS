import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, DoorClosed, DoorOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { simuladoresApi } from '../api/simuladores'

const weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const monthFormatter = new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric',
})

function toDate(isoString) {
  if (!isoString) return null
  const parsed = new Date(isoString)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function dayKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isWithinWindow(apertura, cierre, now) {
  if (apertura && now < apertura) return false
  if (cierre && now > cierre) return false
  return true
}

function getEstadoSimulador(apertura, cierre, now) {
  if (apertura && now < apertura) return 'proximo'
  if (cierre && now > cierre) return 'cerrado'
  return 'activo'
}

function buildCalendarDays(currentMonth) {
  const firstDayOfMonth = startOfMonth(currentMonth)
  const firstDayWeek = (firstDayOfMonth.getDay() + 6) % 7
  const gridStart = new Date(firstDayOfMonth)
  gridStart.setDate(firstDayOfMonth.getDate() - firstDayWeek)

  return Array.from({ length: 42 }, (_, idx) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + idx)
    return {
      date,
      inCurrentMonth: date.getMonth() === currentMonth.getMonth(),
    }
  })
}

export default function Calendario() {
  const navigate = useNavigate()
  const [simuladores, setSimuladores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [filtroTipoAsociacion, setFiltroTipoAsociacion] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroAsociacion, setFiltroAsociacion] = useState('todos')

  useEffect(() => {
    const fetchSimuladores = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await simuladoresApi.getSimuladores()
        setSimuladores(Array.isArray(data) ? data : [])
      } catch {
        setSimuladores([])
        setError('No se pudieron cargar los simuladores para el calendario.')
      } finally {
        setLoading(false)
      }
    }

    fetchSimuladores()
  }, [])

  const simuladoresConMeta = useMemo(() => {
    const now = new Date()
    return simuladores.map((simulador) => {
      const apertura = toDate(simulador.fecha_apertura_efectiva || simulador.fecha_apertura)
      const cierre = toDate(simulador.fecha_cierre_efectiva || simulador.fecha_cierre)
      const asociacionNombre = simulador.curso_nombre || simulador.ruta_nombre || 'Sin asociacion'

      let tipoAsociacion = 'sin_asociacion'
      if (simulador.curso_nombre) tipoAsociacion = 'curso'
      else if (simulador.ruta_nombre) tipoAsociacion = 'ruta'

      return {
        ...simulador,
        apertura,
        cierre,
        asociacionNombre,
        tipoAsociacion,
        estado: getEstadoSimulador(apertura, cierre, now),
      }
    })
  }, [simuladores])

  const asociacionesDisponibles = useMemo(() => {
    return Array.from(
      new Set(simuladoresConMeta.map((simulador) => simulador.asociacionNombre)),
    ).sort((a, b) => a.localeCompare(b, 'es'))
  }, [simuladoresConMeta])

  const simuladoresFiltrados = useMemo(() => {
    return simuladoresConMeta.filter((simulador) => {
      if (filtroTipoAsociacion !== 'todos' && simulador.tipoAsociacion !== filtroTipoAsociacion) {
        return false
      }
      if (filtroEstado !== 'todos' && simulador.estado !== filtroEstado) {
        return false
      }
      if (filtroAsociacion !== 'todos' && simulador.asociacionNombre !== filtroAsociacion) {
        return false
      }
      return true
    })
  }, [filtroAsociacion, filtroEstado, filtroTipoAsociacion, simuladoresConMeta])

  const eventos = useMemo(() => {
    return simuladoresFiltrados
      .flatMap((simulador) => {
        const base = {
          simuladorId: simulador.id,
          titulo: simulador.titulo,
          asociacion: simulador.asociacionNombre,
          estado: simulador.estado,
        }

        return [
          simulador.apertura
            ? {
                ...base,
                tipo: 'apertura',
                fecha: simulador.apertura,
                eventId: `${simulador.id}-apertura-${simulador.apertura.toISOString()}`,
              }
            : null,
          simulador.cierre
            ? {
                ...base,
                tipo: 'cierre',
                fecha: simulador.cierre,
                eventId: `${simulador.id}-cierre-${simulador.cierre.toISOString()}`,
              }
            : null,
        ].filter(Boolean)
      })
      .sort((a, b) => a.fecha - b.fecha)
  }, [simuladoresFiltrados])

  const eventosPorDia = useMemo(() => {
    return eventos.reduce((acc, evento) => {
      const key = dayKey(evento.fecha)
      if (!acc[key]) acc[key] = []
      acc[key].push(evento)
      return acc
    }, {})
  }, [eventos])

  const diasMes = useMemo(() => buildCalendarDays(currentMonth), [currentMonth])

  const resumen = useMemo(() => {
    const now = new Date()
    const activos = simuladoresFiltrados.filter((simulador) => {
      const apertura = simulador.apertura
      const cierre = simulador.cierre
      return isWithinWindow(apertura, cierre, now)
    }).length

    const proximos = eventos.filter((evento) => evento.fecha >= now).length
    return { activos, proximos, total: simuladoresFiltrados.length }
  }, [eventos, simuladoresFiltrados])

  const eventosMes = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    return eventos.filter((evento) => evento.fecha >= start && evento.fecha < end)
  }, [currentMonth, eventos])

  const prevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const resetFiltros = () => {
    setFiltroTipoAsociacion('todos')
    setFiltroEstado('todos')
    setFiltroAsociacion('todos')
  }

  const goToSimulador = (simuladorId, openHistorial = false) => {
    navigate('/simuladores', {
      state: {
        focusSimuladorId: simuladorId,
        openHistorial,
      },
    })
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50">
              <CalendarDays size={24} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Calendario de Simuladores</h1>
              <p className="text-sm text-gray-500">Fechas de apertura y cierre segun la disponibilidad de cada simulador.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
            <SummaryCard label="Simuladores visibles" value={resumen.total} className="text-slate-700 bg-slate-50" />
            <SummaryCard label="Activos ahora" value={resumen.activos} className="text-emerald-700 bg-emerald-50" />
            <SummaryCard label="Eventos pendientes" value={resumen.proximos} className="text-indigo-700 bg-indigo-50" />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FilterField label="Tipo de asociacion">
              <select
                value={filtroTipoAsociacion}
                onChange={(event) => setFiltroTipoAsociacion(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="todos">Todos</option>
                <option value="curso">Curso</option>
                <option value="ruta">Ruta</option>
                <option value="sin_asociacion">Sin asociacion</option>
              </select>
            </FilterField>

            <FilterField label="Estado">
              <select
                value={filtroEstado}
                onChange={(event) => setFiltroEstado(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="todos">Todos</option>
                <option value="activo">Activo</option>
                <option value="proximo">Proximo</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </FilterField>

            <FilterField label="Curso / Ruta">
              <select
                value={filtroAsociacion}
                onChange={(event) => setFiltroAsociacion(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="todos">Todos</option>
                {asociacionesDisponibles.map((nombre) => (
                  <option key={nombre} value={nombre}>{nombre}</option>
                ))}
              </select>
            </FilterField>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={resetFiltros}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock3 size={16} className="text-gray-600" />
            <h3 className="font-semibold text-gray-900">Eventos del mes</h3>
          </div>

          {loading ? null : eventosMes.length === 0 ? (
            <p className="text-sm text-gray-500">No hay eventos de apertura o cierre en este mes.</p>
          ) : (
            <div className="space-y-2">
              {eventosMes.map((evento) => (
                <div key={evento.eventId} className="rounded-xl border border-gray-200 px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{evento.titulo}</p>
                    <p className="text-xs text-gray-500 truncate">{evento.asociacion}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <EventTypeBadge tipo={evento.tipo} />
                    <span className="text-xs text-gray-600">{dateTimeFormatter.format(evento.fecha)}</span>
                    <button
                      type="button"
                      onClick={() => goToSimulador(evento.simuladorId, false)}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Ver simulador
                    </button>
                    <button
                      type="button"
                      onClick={() => goToSimulador(evento.simuladorId, true)}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      Ver historial
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevMonth}
                className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 capitalize">{monthFormatter.format(currentMonth)}</h2>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <Legend color="bg-emerald-500" label="Apertura" />
              <Legend color="bg-rose-500" label="Cierre" />
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="px-4 py-10 text-center text-red-700 bg-red-50">{error}</div>
          ) : (
            <>
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {weekDays.map((day) => (
                  <div key={day} className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {diasMes.map(({ date, inCurrentMonth }) => {
                  const key = dayKey(date)
                  const eventosDia = eventosPorDia[key] || []

                  return (
                    <div
                      key={key}
                      className={`min-h-28 border-b border-r border-gray-100 p-2 ${inCurrentMonth ? 'bg-white' : 'bg-gray-50/70'}`}
                    >
                      <p className={`text-xs font-semibold ${inCurrentMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                        {date.getDate()}
                      </p>

                      <div className="mt-2 space-y-1">
                        {eventosDia.slice(0, 2).map((evento) => (
                          <DayEvent
                            key={evento.eventId}
                            evento={evento}
                            onOpenSimulador={() => goToSimulador(evento.simuladorId, false)}
                          />
                        ))}
                        {eventosDia.length > 2 && (
                          <p className="text-[11px] text-gray-500">+{eventosDia.length - 2} eventos mas</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

      </div>
    </Layout>
  )
}

function FilterField({ label, children }) {
  return (
    <label className="block">
      <span className="block mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  )
}

function SummaryCard({ label, value, className }) {
  return (
    <div className={`rounded-xl px-3 py-2 text-center ${className}`}>
      <p className="text-[11px] uppercase tracking-wide font-semibold opacity-80">{label}</p>
      <p className="text-xl font-bold leading-tight">{value}</p>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}

function EventTypeBadge({ tipo }) {
  if (tipo === 'apertura') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1">
        <DoorOpen size={12} /> Apertura
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 px-2.5 py-1">
      <DoorClosed size={12} /> Cierre
    </span>
  )
}

function DayEvent({ evento, onOpenSimulador }) {
  const className =
    evento.tipo === 'apertura'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-rose-50 text-rose-700 border-rose-200'

  return (
    <button
      type="button"
      onClick={onOpenSimulador}
      className={`block w-full text-left text-[11px] px-2 py-1 rounded-md border truncate ${className}`}
      title={`${evento.titulo} · ${dateTimeFormatter.format(evento.fecha)}`}
    >
      {evento.tipo === 'apertura' ? 'Abre' : 'Cierra'}: {evento.titulo}
    </button>
  )
}
