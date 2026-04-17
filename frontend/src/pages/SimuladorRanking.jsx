import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trophy, Medal, Timer, Sparkles } from 'lucide-react'
import Layout from '../components/Layout'
import { simuladoresApi } from '../api/simuladores'

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds || 0))
  const minutes = Math.floor(safe / 60)
  const remainder = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function PodiumCard({ entry, slot }) {
  if (!entry) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white/80 h-[330px] flex items-center justify-center text-gray-400 text-sm">
        Sin participante
      </div>
    )
  }

  const stylesBySlot = {
    1: {
      border: 'border-amber-400',
      badge: 'bg-amber-500 text-white',
      base: 'bg-gradient-to-b from-amber-400 to-amber-600 text-white',
      order: 'lg:order-2',
      crown: '🥇',
    },
    2: {
      border: 'border-slate-400',
      badge: 'bg-slate-500 text-white',
      base: 'bg-gradient-to-b from-slate-500 to-slate-700 text-white',
      order: 'lg:order-1',
      crown: '🥈',
    },
    3: {
      border: 'border-orange-400',
      badge: 'bg-orange-500 text-white',
      base: 'bg-gradient-to-b from-orange-500 to-orange-600 text-white',
      order: 'lg:order-3',
      crown: '🥉',
    },
  }

  const style = stylesBySlot[slot]

  return (
    <div className={`rounded-3xl overflow-hidden border-2 ${style.border} bg-white shadow-lg ${style.order}`}>
      <div className="px-6 py-5 flex flex-col items-center gap-2">
        <span className="text-2xl">{style.crown}</span>
        <div className="w-20 h-20 rounded-full bg-indigo-600 border-4 border-white shadow flex items-center justify-center text-white text-3xl font-bold">
          {entry.iniciales}
        </div>
        <p className="font-bold text-gray-800 text-base text-center line-clamp-1">{entry.user_nombre}</p>
        <div className="text-center">
          <p className="text-xs text-gray-500">Puntaje</p>
          <p className="font-extrabold text-2xl text-indigo-700">{entry.puntaje}</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold">
          <Timer size={14} />
          {formatTime(entry.tiempo_segundos)}
        </div>
      </div>
      <div className={`px-4 py-4 text-center text-4xl font-extrabold ${style.base}`}>{slot}</div>
    </div>
  )
}

export default function SimuladorRanking() {
  const { simuladorId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const payload = await simuladoresApi.getRanking(simuladorId)
        setData(payload)
      } catch {
        setError('No se pudo cargar el ranking del simulador.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [simuladorId])

  const top3ByPosition = useMemo(() => {
    const map = { 1: null, 2: null, 3: null }
    for (const item of data?.top3 || []) {
      if (item.posicion >= 1 && item.posicion <= 3) {
        map[item.posicion] = item
      }
    }
    return map
  }, [data])

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto space-y-4">
          <button
            onClick={() => navigate('/simuladores')}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft size={16} />
            Volver a simuladores
          </button>
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/simuladores')}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft size={16} />
          Volver a simuladores
        </button>

        <div className="rounded-3xl bg-white border border-gray-200 shadow-lg px-6 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
            <Trophy size={26} />
          </div>
          <div>
            <h1 className="text-4xl md:text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Ranking - {data?.simulador?.titulo}
            </h1>
            <p className="text-gray-500 text-sm">Los mejores estudiantes según su desempeño</p>
          </div>
        </div>

        {data?.total_participantes === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-gray-500">
            Aún no hay intentos completados para este simulador.
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
              <PodiumCard entry={top3ByPosition[2]} slot={2} />
              <PodiumCard entry={top3ByPosition[1]} slot={1} />
              <PodiumCard entry={top3ByPosition[3]} slot={3} />
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white shadow-lg overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold flex items-center gap-2">
                <Sparkles size={16} />
                Tabla de Posiciones
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                      <th className="px-6 py-3 font-semibold">Posición</th>
                      <th className="px-6 py-3 font-semibold">Estudiante</th>
                      <th className="px-6 py-3 font-semibold">Puntaje</th>
                      <th className="px-6 py-3 font-semibold">Tiempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.ranking || []).map((row) => {
                      const isTop3 = row.posicion <= 3
                      return (
                        <tr
                          key={row.user_id}
                          className={`border-b border-gray-100 ${isTop3 ? 'bg-amber-50/40' : 'bg-white'} hover:bg-indigo-50/30`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${
                                row.posicion === 1
                                  ? 'bg-amber-500 text-white'
                                  : row.posicion === 2
                                  ? 'bg-slate-500 text-white'
                                  : row.posicion === 3
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {row.posicion}
                              </span>
                              {isTop3 && <Medal size={15} className="text-indigo-500" />}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                                {row.iniciales}
                              </span>
                              <div>
                                <p className="font-semibold text-gray-800">{row.user_nombre}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 font-bold">
                              {row.puntaje}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-semibold">
                              <Timer size={13} className="text-indigo-500" />
                              {formatTime(row.tiempo_segundos)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-3xl border border-indigo-200 bg-white shadow-lg p-5">
              {data?.mi_posicion ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-2xl flex items-center justify-center">
                        {data.mi_posicion.posicion}
                      </span>
                      <div>
                        <p className="font-bold text-gray-800">{data.mi_posicion.user_nombre}</p>
                        <p className="text-sm text-gray-500">Tu posición actual</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Mejor Puntaje</p>
                        <p className="font-black text-indigo-700 text-3xl">{data.mis_estadisticas.mejor_puntaje}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Mejor Tiempo</p>
                        <p className="font-bold text-gray-800 text-2xl">{formatTime(data.mis_estadisticas.mejor_tiempo_segundos)}</p>
                      </div>
                    </div>
                  </div>

                  {data.mi_posicion.posicion > 20 ? (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-indigo-700 text-sm font-medium">
                      Sigue practicando para entrar al top 20.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm font-medium">
                      Ya estás dentro del top 20. Mantén el ritmo.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50 px-4 py-3 text-indigo-700 text-sm">
                  Aún no tienes un intento completado en este simulador.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  )
}
